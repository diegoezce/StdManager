from rest_framework import serializers
from .models import (
    CorporateClient, Teacher, Student, Group, Enrollment,
    Attendance, Evaluation, Certificate
)


class CorporateClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorporateClient
        fields = ('id', 'company_name', 'contact_name', 'contact_email', 'contact_phone', 'address', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class TeacherSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Teacher
        fields = ('id', 'user', 'user_email', 'user_name', 'specializations', 'bio', 'certifications', 'created_at')
        read_only_fields = ('id', 'created_at')


class StudentSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    corporate_client_name = serializers.CharField(source='corporate_client.company_name', read_only=True)

    class Meta:
        model = Student
        fields = ('id', 'user', 'user_email', 'user_name', 'corporate_client', 'corporate_client_name', 'english_level', 'enrollment_date', 'is_active', 'created_at')
        read_only_fields = ('id', 'enrollment_date', 'created_at')


class GroupSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)
    enrollment_count = serializers.ReadOnlyField()
    available_spots = serializers.ReadOnlyField()
    enrollments = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ('id', 'name', 'level', 'teacher', 'teacher_name', 'schedule', 'start_date', 'end_date', 'max_students', 'enrollment_count', 'available_spots', 'status', 'description', 'enrollments', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_enrollments(self, obj):
        enrollments = obj.enrollments.filter(status='active')
        return EnrollmentSerializer(enrollments, many=True).data


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = ('id', 'group', 'group_name', 'student', 'student_name', 'enrolled_at', 'status', 'drop_reason', 'drop_date', 'created_at')
        read_only_fields = ('id', 'enrolled_at', 'created_at')


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Attendance
        fields = ('id', 'group', 'group_name', 'student', 'student_name', 'date', 'status', 'comments', 'created_at')
        read_only_fields = ('id', 'created_at')


class AttendanceBulkSerializer(serializers.Serializer):
    """Serializer for bulk attendance marking"""
    group_id = serializers.UUIDField()
    date = serializers.DateField()
    attendance = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(allow_blank=True),
            help_text='{"student_id": "...", "status": "present|absent|late|excused", "comments": "..."}'
        )
    )


class EvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    percentage = serializers.ReadOnlyField()

    class Meta:
        model = Evaluation
        fields = ('id', 'group', 'student', 'student_name', 'type', 'score', 'max_score', 'percentage', 'date', 'notes', 'created_at')
        read_only_fields = ('id', 'date', 'created_at')


class CertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.get_full_name', read_only=True)

    class Meta:
        model = Certificate
        fields = ('id', 'student', 'student_name', 'group', 'group_name', 'level_achieved', 'issue_date', 'certificate_number', 'pdf_url', 'issued_by', 'issued_by_name', 'notes', 'created_at')
        read_only_fields = ('id', 'issue_date', 'created_at')
