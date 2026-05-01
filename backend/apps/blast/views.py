from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, F, Avg
from django.utils import timezone

from .models import (
    CorporateClient, Teacher, Student, Group, Enrollment,
    Attendance, Evaluation, Certificate
)
from .serializers import (
    CorporateClientSerializer, TeacherSerializer, StudentSerializer,
    GroupSerializer, EnrollmentSerializer, AttendanceSerializer,
    AttendanceBulkSerializer, EvaluationSerializer, CertificateSerializer
)
from apps.core.permissions import IsOwnerOrManager, IsTeacher


class CorporateClientViewSet(viewsets.ModelViewSet):
    serializer_class = CorporateClientSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

    def get_queryset(self):
        return CorporateClient.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrManager]

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
        if user.role in ['owner', 'manager']:
            return Student.objects.filter(organization=user.organization)
        elif user.role == 'student':
            return Student.objects.filter(user=user)
        elif user.role == 'corporate_client':
            return Student.objects.filter(corporate_client__contact_email=user.email)
        return Student.objects.none()

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
        if user.role in ['owner', 'manager']:
            return Group.objects.filter(organization=user.organization)
        elif user.role == 'teacher':
            return Group.objects.filter(teacher__user=user)
        return Group.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        group = self.get_object()
        student_id = request.data.get('student_id')

        if group.available_spots <= 0:
            return Response(
                {'error': 'No available spots'},
                status=status.HTTP_400_BAD_REQUEST
            )

        enrollment, created = Enrollment.objects.get_or_create(
            group=group,
            student_id=student_id,
            organization=self.request.user.organization,
            defaults={'status': 'active'}
        )

        return Response(
            EnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
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
    """Get attendance report for all groups"""
    organization = request.user.organization

    attendance_records = Attendance.objects.filter(
        organization=organization
    ).select_related('student', 'group').values(
        'date', 'student__user__first_name', 'student__user__last_name',
        'group__name', 'status'
    ).order_by('-date')

    return Response(list(attendance_records))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def students_report(request):
    """Get students report"""
    organization = request.user.organization

    students = Student.objects.filter(
        organization=organization
    ).select_related('user').values(
        'id', 'user__first_name', 'user__last_name', 'user__email',
        'english_level', 'is_active'
    ).order_by('user__first_name')

    return Response(list(students))


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
