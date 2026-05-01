from django.contrib import admin
from .models import (
    CorporateClient, Teacher, Student, Group, Enrollment,
    Attendance, Evaluation, Certificate
)


@admin.register(CorporateClient)
class CorporateClientAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'contact_name', 'contact_email', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('company_name', 'contact_email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'created_at')
    list_filter = ('organization', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('id', 'created_at')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'english_level', 'corporate_client', 'is_active', 'created_at')
    list_filter = ('organization', 'english_level', 'is_active', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'corporate_client__company_name')
    readonly_fields = ('id', 'enrollment_date', 'created_at')


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'level', 'teacher', 'status', 'start_date', 'created_at')
    list_filter = ('organization', 'level', 'status', 'created_at')
    search_fields = ('name', 'teacher__user__email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'group', 'status', 'enrolled_at', 'drop_date', 'created_at')
    list_filter = ('organization', 'status', 'enrolled_at')
    search_fields = ('student__user__email', 'group__name')
    readonly_fields = ('id', 'enrolled_at', 'created_at')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'group', 'date', 'status', 'created_at')
    list_filter = ('organization', 'status', 'date')
    search_fields = ('student__user__email', 'group__name')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ('student', 'group', 'type', 'score', 'max_score', 'date', 'created_at')
    list_filter = ('organization', 'type', 'date')
    search_fields = ('student__user__email', 'group__name')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_number', 'student', 'group', 'level_achieved', 'issue_date', 'created_at')
    list_filter = ('organization', 'issue_date')
    search_fields = ('certificate_number', 'student__user__email')
    readonly_fields = ('id', 'issue_date', 'created_at')
