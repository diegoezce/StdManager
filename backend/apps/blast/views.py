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
    Attendance, Evaluation, Certificate
)
from .serializers import (
    CorporateClientSerializer, TeacherSerializer, StudentSerializer,
    GroupSerializer, EnrollmentSerializer, AttendanceSerializer,
    AttendanceBulkSerializer, EvaluationSerializer, CertificateSerializer
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
        if user.role in ['owner', 'manager', 'admin']:
            return Student.objects.filter(organization=user.organization)
        elif user.role == 'student':
            return Student.objects.filter(user=user)
        elif user.role == 'corporate_client':
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
        return Attendance.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)

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

    # Corporate clients only see their own students
    if request.user.role == 'corporate_client':
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
        organization=organization
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
