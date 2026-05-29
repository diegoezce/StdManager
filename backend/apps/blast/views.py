import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, F, Avg, Prefetch
from django.utils import timezone

logger = logging.getLogger(__name__)

from .models import (
    CorporateClient, Teacher, Student, Group, Enrollment,
    Attendance, Evaluation, Certificate, MondlyRecord, EmptyClassSession
)
from .serializers import (
    CorporateClientSerializer, TeacherSerializer, StudentSerializer,
    GroupSerializer, EnrollmentSerializer, AttendanceSerializer,
    AttendanceBulkSerializer, EvaluationSerializer, CertificateSerializer,
    EmptyClassSessionSerializer
)
from apps.core.permissions import IsOwnerOrManager, IsAdmin, IsTeacher


class CorporateClientViewSet(viewsets.ModelViewSet):
    serializer_class = CorporateClientSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get_queryset(self):
        return CorporateClient.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Teacher.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=['get'])
    def groups(self, request, pk=None):
        teacher = self.get_object()
        groups = teacher.groups.all()
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data)


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Student.objects.all()
        if user.role in ['owner', 'manager', 'admin']:
            return Student.objects.filter(organization=user.organization)
        elif user.role == 'student':
            return Student.objects.filter(user=user)
        elif user.role == 'teacher':
            return Student.objects.filter(
                enrollments__group__teacher__user=user,
                enrollments__status='active',
                organization=user.organization,
            ).distinct()
        elif user.role == 'corporate_client':
            if user.corporate_client_id:
                return Student.objects.filter(corporate_client_id=user.corporate_client_id)
            return Student.objects.filter(corporate_client__contact_email=user.email)
        return Student.objects.none()

    def get_permissions(self):
        """Allow admins/managers/owners to create, update, delete students"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        student = self.get_object()
        enrollments = student.enrollments.filter(status='active')
        attendance = student.attendances.count()
        present_count = student.attendances.filter(status='present').count()
        attendance_rate = (present_count / attendance * 100) if attendance > 0 else 0

        evaluations = student.evaluations.all()
        avg_score = evaluations.aggregate(avg=models.Avg('score'))['avg'] or 0

        return Response({
            'enrollments': EnrollmentSerializer(enrollments, many=True).data,
            'attendance_rate': attendance_rate,
            'average_score': avg_score,
            'certificates': CertificateSerializer(student.certificates.all(), many=True).data,
        })


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Group.objects.all()
        if user.role in ['owner', 'manager', 'admin']:
            return Group.objects.filter(organization=user.organization)
        elif user.role == 'teacher':
            return Group.objects.filter(teacher__user=user)
        return Group.objects.filter(organization=user.organization)

    def get_permissions(self):
        """Allow admins/managers/owners to create/destroy, and teachers to update their own groups"""
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsTeacher()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')

        if group.available_spots <= 0:
            logger.warning('Enroll rejected: group %s is full', group.id)
            return Response({'error': 'No hay lugares disponibles'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enrollment, created = Enrollment.objects.get_or_create(
                group=group,
                student_id=student_id,
                organization=self.request.user.organization,
                defaults={'status': 'active'},
            )
            if not created and enrollment.status != 'active':
                enrollment.status = 'active'
                enrollment.drop_date = None
                enrollment.drop_reason = ''
                enrollment.save()
                created = True
            logger.info('Enrollment %s: student %s → group %s', 'created' if created else 'existing', student_id, group.id)
        except Exception as e:
            logger.error('Enroll failed student %s → group %s: %s', student_id, group.id, e, exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['delete'])
    def unenroll(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')

        try:
            enrollment = Enrollment.objects.get(group=group, student_id=student_id)
            enrollment.status = 'dropped'
            enrollment.drop_date = timezone.now().date()
            enrollment.drop_reason = request.data.get('drop_reason', '')
            enrollment.save()
            return Response(EnrollmentSerializer(enrollment).data)
        except Enrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def attendance(self, request, pk=None):
        group = self.get_object()
        date = request.query_params.get('date')
        if date:
            attendance = Attendance.objects.filter(group=group, date=date)
        else:
            attendance = Attendance.objects.filter(group=group)
        serializer = AttendanceSerializer(attendance, many=True)
        return Response(serializer.data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Enrollment.objects.all()
        if user.role in ['owner', 'manager']:
            return Enrollment.objects.filter(organization=user.organization)
        elif user.role == 'student':
            return Enrollment.objects.filter(student__user=user, organization=user.organization)
        return Enrollment.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        qs = Attendance.objects.filter(organization=self.request.user.organization)
        group = self.request.query_params.get('group')
        date = self.request.query_params.get('date')
        student = self.request.query_params.get('student')
        if group:
            qs = qs.filter(group_id=group)
        if date:
            qs = qs.filter(date=date)
        if student:
            qs = qs.filter(student_id=student)
        return qs.select_related('group').order_by('date')

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)

    @action(detail=False, methods=['delete'], url_path='delete-day')
    def delete_day(self, request):
        """Delete all attendance records for a group on a specific date."""
        group_id = request.query_params.get('group_id')
        date = request.query_params.get('date')
        if not group_id or not date:
            return Response({'error': 'group_id and date are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            group = Group.objects.get(id=group_id, organization=request.user.organization)
        except Group.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        deleted, _ = Attendance.objects.filter(
            group=group, date=date, organization=request.user.organization
        ).delete()
        logger.info('Deleted %d attendance records for group %s on %s by %s', deleted, group_id, date, request.user.email)
        return Response({'deleted': deleted}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='days')
    def days(self, request):
        """Return distinct dates that have attendance records for a group in a given month."""
        group_id = request.query_params.get('group_id')
        month = request.query_params.get('month')  # YYYY-MM
        if not group_id or not month:
            return Response({'error': 'group_id and month are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            year, mon = month.split('-')
            year, mon = int(year), int(mon)
        except (ValueError, AttributeError):
            return Response({'error': 'month must be YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)
        dates = (
            Attendance.objects
            .filter(organization=request.user.organization, group_id=group_id, date__year=year, date__month=mon)
            .values_list('date', flat=True)
            .distinct()
            .order_by('date')
        )
        return Response({'dates': [str(d) for d in dates]})

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        serializer = AttendanceBulkSerializer(data=request.data)
        if serializer.is_valid():
            group_id = serializer.validated_data['group_id']
            date = serializer.validated_data['date']
            attendance_data = serializer.validated_data['attendance']

            try:
                group = Group.objects.get(id=group_id, organization=request.user.organization)
            except Group.DoesNotExist:
                return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

            created_records = []
            for record in attendance_data:
                attendance, _ = Attendance.objects.update_or_create(
                    group=group,
                    student_id=record['student_id'],
                    date=date,
                    organization=request.user.organization,
                    defaults={
                        'status': record['status'],
                        'comments': record.get('comments', ''),
                        'created_by': request.user,
                    }
                )
                created_records.append(attendance)

            return Response(
                AttendanceSerializer(created_records, many=True).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        return Evaluation.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)


class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Certificate.objects.all()
        if user.role in ['owner', 'manager']:
            return Certificate.objects.filter(organization=user.organization)
        elif user.role == 'student':
            return Certificate.objects.filter(student__user=user)
        return Certificate.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, issued_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        certificate = self.get_object()
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from io import BytesIO

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=30,
            alignment=1,
        )

        story.append(Paragraph("Certificate of Completion", title_style))
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            f"This certifies that <b>{certificate.student.user.get_full_name()}</b>",
            styles['Normal']
        ))
        story.append(Paragraph(
            f"has successfully completed the {certificate.level_achieved} English course",
            styles['Normal']
        ))
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"<b>Certificate Number: {certificate.certificate_number}</b>", styles['Normal']))

        doc.build(story)
        return Response({'message': 'Certificate generated'})


class EmptyClassSessionViewSet(viewsets.ModelViewSet):
    serializer_class = EmptyClassSessionSerializer
    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        qs = EmptyClassSession.objects.filter(organization=self.request.user.organization)
        group = self.request.query_params.get('group')
        date = self.request.query_params.get('date')
        if group:
            qs = qs.filter(group_id=group)
        if date:
            qs = qs.filter(date=date)
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_report(request):
    """Attendance report aggregated by student, filtered by period."""
    from datetime import date
    from dateutil.relativedelta import relativedelta

    organization = request.user.organization
    period = request.query_params.get('period', 'month')  # month | semester | year

    today = date.today()
    if period == 'semester':
        since = today - relativedelta(months=6)
    elif period == 'year':
        since = today - relativedelta(years=1)
    else:
        since = today - relativedelta(months=1)

    qs = Attendance.objects.filter(
        organization=organization,
        date__gte=since,
    ).select_related('student__user', 'student__corporate_client', 'group')

    # Teachers only see students from their own groups
    if request.user.role == 'teacher':
        qs = qs.filter(group__teacher__user=request.user)

    # Corporate clients only see their own students
    elif request.user.role == 'corporate_client':
        if request.user.corporate_client_id:
            qs = qs.filter(student__corporate_client_id=request.user.corporate_client_id)
        else:
            qs = qs.filter(student__corporate_client__contact_email=request.user.email)

    # Aggregate per student
    from collections import defaultdict
    rows = defaultdict(lambda: {
        'present': 0, 'absent': 0, 'late': 0, 'excused': 0,
        'groups': set(),
    })

    for record in qs:
        key = record.student_id
        rows[key]['student_id'] = str(record.student.id)
        rows[key]['student_name'] = record.student.user.get_full_name() or record.student.user.email
        rows[key]['company'] = record.student.corporate_client.company_name if record.student.corporate_client else None
        rows[key][record.status] += 1
        rows[key]['groups'].add(record.group.name)

    result = []
    for row in rows.values():
        total = row['present'] + row['absent'] + row['late'] + row['excused']
        attended = row['present'] + row['late']
        result.append({
            'student_id': row['student_id'],
            'student_name': row['student_name'],
            'company': row['company'],
            'groups': sorted(row['groups']),
            'present': row['present'],
            'absent': row['absent'],
            'late': row['late'],
            'excused': row['excused'],
            'total': total,
            'rate': round(attended / total * 100, 1) if total > 0 else None,
        })

    result.sort(key=lambda r: r['student_name'])
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def students_report(request):
    """Get enriched students report with attendance rate and current groups."""
    organization = request.user.organization
    company_id = request.query_params.get('company_id')

    active_enrollments_qs = Enrollment.objects.filter(
        status='active'
    ).select_related('group')

    qs = Student.objects.filter(
        organization=organization,
    ).select_related(
        'user', 'corporate_client'
    ).prefetch_related(
        Prefetch('enrollments', queryset=active_enrollments_qs, to_attr='active_enrollments'),
    ).annotate(
        total_att=Count('attendances'),
        present_att=Count('attendances', filter=Q(attendances__status='present')),
    ).order_by('user__last_name', 'user__first_name')

    if company_id:
        qs = qs.filter(corporate_client_id=company_id)

    # Corporate clients only see their own students
    if request.user.role == 'corporate_client':
        if request.user.corporate_client_id:
            qs = qs.filter(corporate_client_id=request.user.corporate_client_id)
        else:
            qs = qs.filter(corporate_client__contact_email=request.user.email)

    result = []
    for student in qs:
        total = student.total_att
        present = student.present_att
        attendance_rate = round(present / total * 100, 1) if total > 0 else None
        result.append({
            'id': str(student.id),
            'full_name': f"{student.user.first_name} {student.user.last_name}",
            'email': student.user.email,
            'company': student.corporate_client.company_name if student.corporate_client else None,
            'company_id': str(student.corporate_client.id) if student.corporate_client else None,
            'english_level': student.english_level,
            'is_active': student.is_active,
            'attendance_rate': attendance_rate,
            'total_sessions': total,
            'current_groups': [e.group.name for e in student.active_enrollments],
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def groups_report(request):
    """Get groups report"""
    organization = request.user.organization

    groups = Group.objects.filter(
        organization=organization
    ).select_related('teacher').annotate(
        student_count=Count('enrollments', filter=Q(enrollments__status='active'))
    ).values(
        'id', 'name', 'level', 'teacher__user__first_name',
        'teacher__user__last_name', 'status', 'student_count', 'max_students'
    ).order_by('name')

    return Response(list(groups))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teachers_report(request):
    """Hours per teacher for a calendar month.
    Full class day = 1h. Empty class session = org.empty_class_rate hours."""
    if request.user.role not in ('owner', 'manager', 'super_admin', 'teacher'):
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied()

    import calendar
    from collections import defaultdict

    is_teacher = request.user.role == 'teacher'
    organization = request.user.organization
    empty_class_rate = float(organization.empty_class_rate)
    today = timezone.now().date()

    try:
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
    except (ValueError, TypeError):
        year, month = today.year, today.month

    month = max(1, min(12, month))
    first_day = today.replace(year=year, month=month, day=1)
    last_day = today.replace(year=year, month=month, day=calendar.monthrange(year, month)[1])

    # Fetch all attendance records for the month with student names
    records_qs = Attendance.objects.filter(organization=organization, date__range=(first_day, last_day))
    empty_qs = EmptyClassSession.objects.filter(organization=organization, date__range=(first_day, last_day))

    # Teachers only see their own data
    if is_teacher:
        try:
            teacher_profile = request.user.teacher_profile
            records_qs = records_qs.filter(group__teacher=teacher_profile)
            empty_qs = empty_qs.filter(group__teacher=teacher_profile)
        except Exception:
            return Response([])

    records = records_qs.select_related('student__user', 'group__teacher__user').order_by('date', 'group_id')
    empty_sessions = empty_qs.select_related('group__teacher__user')

    # Build per-teacher data: teacher_id → { meta, days: {(group_id, date): {group_name, students, is_empty}} }
    # students is a list of {name, status} dicts
    teacher_data = defaultdict(lambda: {
        'first_name': '', 'last_name': '', 'email': '',
        'days': defaultdict(lambda: {'group_name': '', 'students': [], 'is_empty': False}),
    })

    for rec in records:
        group = rec.group
        if not group or not group.teacher_id:
            continue
        tid = group.teacher_id
        td = teacher_data[tid]
        td['first_name'] = group.teacher.user.first_name or ''
        td['last_name'] = group.teacher.user.last_name or ''
        td['email'] = group.teacher.user.email or ''
        key = (str(group.id), str(rec.date))
        td['days'][key]['group_name'] = group.name
        student_name = rec.student.user.get_full_name() or rec.student.user.email
        if not any(s['name'] == student_name for s in td['days'][key]['students']):
            td['days'][key]['students'].append({'name': student_name, 'status': rec.status})

    for es in empty_sessions:
        group = es.group
        if not group or not group.teacher_id:
            continue
        tid = group.teacher_id
        td = teacher_data[tid]
        td['first_name'] = group.teacher.user.first_name or ''
        td['last_name'] = group.teacher.user.last_name or ''
        td['email'] = group.teacher.user.email or ''
        key = (str(group.id), str(es.date))
        # Only add as empty if no regular attendance exists for this slot
        if key not in td['days']:
            td['days'][key]['group_name'] = group.name
            td['days'][key]['is_empty'] = True

    result = []
    for tid, data in teacher_data.items():
        days_list = sorted([
            {
                'date': k[1],
                'group_id': k[0],
                'group_name': v['group_name'],
                'students': sorted(v['students'], key=lambda s: s['name']),
                'is_empty': v['is_empty'],
            }
            for k, v in data['days'].items()
        ], key=lambda d: (d['date'], d['group_name']))

        full_days = sum(1 for d in days_list if not d['is_empty'])
        empty_days = sum(1 for d in days_list if d['is_empty'])
        hours = round(full_days + empty_days * empty_class_rate, 2)

        result.append({
            'teacher_id': str(tid),
            'full_name': f"{data['first_name']} {data['last_name']}".strip() or data['email'],
            'email': data['email'],
            'hours': hours,
            'full_days': full_days,
            'empty_days': empty_days,
            'empty_class_rate': empty_class_rate,
            'groups_count': len({d['group_id'] for d in days_list}),
            'year': year,
            'month': month,
            'days': days_list,
        })

    result.sort(key=lambda r: r['full_name'])
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mondly_import(request):
    """Parse a Mondly Excel or CSV export and upsert records. File is not stored."""
    if request.user.role not in ('owner', 'manager', 'admin', 'super_admin'):
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied()

    uploaded = request.FILES.get('file')
    if not uploaded:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    filename = uploaded.name.lower()
    rows = []

    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                import openpyxl
            except ImportError:
                return Response({'error': 'Excel support not available on this server. Please export the Mondly report as CSV and upload that instead.'}, status=status.HTTP_400_BAD_REQUEST)
            wb = openpyxl.load_workbook(uploaded, read_only=True, data_only=True)
            ws = wb.active
            headers = None
            for row in ws.iter_rows(values_only=True):
                if headers is None:
                    # Skip empty leading rows
                    if any(row):
                        headers = [str(c).strip() if c else '' for c in row]
                    continue
                rows.append(dict(zip(headers, row)))
        elif filename.endswith('.csv'):
            import csv, io
            content = uploaded.read().decode('utf-8-sig', errors='replace')
            # Auto-detect delimiter
            sample = content[:2048]
            dialect = csv.Sniffer().sniff(sample, delimiters=';,\t')
            reader = csv.DictReader(io.StringIO(content), dialect=dialect)
            rows = list(reader)
        else:
            return Response({'error': 'Unsupported format. Use .xlsx or .csv'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error('Mondly file parse error: %s', e, exc_info=True)
        return Response({'error': f'Could not parse file: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    organization = request.user.organization

    # Build email → student map for this org
    student_by_email = {
        s.user.email.lower(): s
        for s in Student.objects.filter(organization=organization).select_related('user')
    }

    COL = {
        'user_id': ['UserID', 'User ID'],
        'name': ['Name'],
        'email': ['Email'],
        'language': ['Language'],
        'level': ['Level'],
        'points': ['Points'],
        'best_streak': ['Best Streak'],
        'learning_minutes': ['Learning Time (minutes)', 'Learning Time'],
        'lessons_completed': ['Lessons completed', 'Lessons Completed'],
        'words_learned': ['Words learned', 'Words Learned'],
        'phrases_learned': ['Phrases learned', 'Phrases Learned'],
        'last_active_on': ['Last active on', 'Last Active On'],
        'team': ['Team'],
    }

    def get_col(row, candidates):
        for c in candidates:
            if c in row and row[c] not in (None, ''):
                return row[c]
        return None

    def safe_int(v, default=0):
        try:
            return int(float(str(v))) if v not in (None, '') else default
        except (ValueError, TypeError):
            return default

    def parse_dt(v):
        if not v:
            return None
        if hasattr(v, 'isoformat'):
            return timezone.make_aware(v) if timezone.is_naive(v) else v
        try:
            from dateutil.parser import parse as dateparse
            return dateparse(str(v))
        except Exception:
            return None

    imported = skipped = matched = 0

    for row in rows:
        email_raw = get_col(row, COL['email'])
        if not email_raw:
            skipped += 1
            continue
        email = str(email_raw).strip().lower()
        if not email or '@' not in email:
            skipped += 1
            continue

        language = str(get_col(row, COL['language']) or 'English').strip()

        student = student_by_email.get(email)

        defaults = {
            'student': student,
            'mondly_user_id': str(get_col(row, COL['user_id']) or ''),
            'name': str(get_col(row, COL['name']) or '').strip(),
            'level': safe_int(get_col(row, COL['level']), 1),
            'points': safe_int(get_col(row, COL['points'])),
            'best_streak': safe_int(get_col(row, COL['best_streak'])),
            'learning_minutes': safe_int(get_col(row, COL['learning_minutes'])),
            'lessons_completed': safe_int(get_col(row, COL['lessons_completed'])),
            'words_learned': safe_int(get_col(row, COL['words_learned'])),
            'phrases_learned': safe_int(get_col(row, COL['phrases_learned'])),
            'last_active_on': parse_dt(get_col(row, COL['last_active_on'])),
            'mondly_team': str(get_col(row, COL['team']) or '').strip(),
            'imported_by': request.user,
        }

        MondlyRecord.objects.update_or_create(
            organization=organization,
            email=email,
            language=language,
            defaults=defaults,
        )
        imported += 1
        if student:
            matched += 1

    logger.info('Mondly import: %d rows, %d imported, %d matched, %d skipped by %s',
                len(rows), imported, matched, skipped, request.user.email)

    return Response({
        'imported': imported,
        'matched': matched,
        'unmatched': imported - matched,
        'skipped': skipped,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mondly_data(request):
    """Return latest Mondly records for the org, keyed by email.
    Corporate clients only see records matching their students."""
    organization = request.user.organization
    records = MondlyRecord.objects.filter(organization=organization).order_by('email', 'language')

    # Students only see their own record
    if request.user.role == 'student':
        records = records.filter(email=request.user.email.lower())

    # Corporate clients: filter to their students only
    elif request.user.role == 'corporate_client':
        if request.user.corporate_client_id:
            cc_emails = set(
                Student.objects.filter(
                    organization=organization,
                    corporate_client_id=request.user.corporate_client_id,
                ).values_list('user__email', flat=True)
            )
        else:
            cc_emails = set(
                Student.objects.filter(
                    organization=organization,
                    corporate_client__contact_email=request.user.email,
                ).values_list('user__email', flat=True)
            )
        records = records.filter(email__in=[e.lower() for e in cc_emails])

    result = {}
    for r in records:
        if r.email not in result:
            result[r.email] = []
        result[r.email].append({
            'name': r.name,
            'language': r.language,
            'level': r.level,
            'points': r.points,
            'best_streak': r.best_streak,
            'learning_minutes': r.learning_minutes,
            'lessons_completed': r.lessons_completed,
            'words_learned': r.words_learned,
            'phrases_learned': r.phrases_learned,
            'last_active_on': r.last_active_on.isoformat() if r.last_active_on else None,
            'mondly_team': r.mondly_team,
            'imported_at': r.imported_at.isoformat(),
        })

    return Response(result)
