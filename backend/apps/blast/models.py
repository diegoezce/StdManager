import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from apps.core.models import BaseModel
from apps.core.mixins import OrganizationMixin, AuditMixin


class CorporateClient(OrganizationMixin, BaseModel):
    company_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('organization', 'company_name')
        ordering = ['-created_at']

    def __str__(self):
        return self.company_name


class Teacher(OrganizationMixin, BaseModel):
    user = models.OneToOneField(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='teacher_profile'
    )
    specializations = models.JSONField(default=list, blank=True)
    bio = models.TextField(blank=True)
    certifications = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.user.get_full_name() or self.user.email


class Student(OrganizationMixin, BaseModel):
    LEVEL_CHOICES = (
        ('beginner', 'Beginner'),
        ('elementary', 'Elementary'),
        ('pre-intermediate', 'Pre-Intermediate'),
        ('intermediate', 'Intermediate'),
        ('upper-intermediate', 'Upper-Intermediate'),
        ('advanced', 'Advanced'),
    )

    user = models.OneToOneField(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='student_profile'
    )
    corporate_client = models.ForeignKey(
        CorporateClient,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    english_level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default='beginner'
    )
    enrollment_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.user.get_full_name() or self.user.email


class Group(OrganizationMixin, AuditMixin, BaseModel):
    LEVEL_CHOICES = (
        ('beginner', 'Beginner'),
        ('elementary', 'Elementary'),
        ('pre-intermediate', 'Pre-Intermediate'),
        ('intermediate', 'Intermediate'),
        ('upper-intermediate', 'Upper-Intermediate'),
        ('advanced', 'Advanced'),
    )

    STATUS_CHOICES = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    name = models.CharField(max_length=255)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='groups'
    )
    schedule = models.JSONField(
        default=dict,
        help_text='{"days": ["MON", "WED"], "time": "18:00", "duration": 60}'
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    max_students = models.IntegerField(default=20)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planning'
    )
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ('organization', 'name')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['teacher', '-created_at']),
        ]

    def __str__(self):
        return self.name

    @property
    def enrollment_count(self):
        return self.enrollments.filter(status='active').count()

    @property
    def available_spots(self):
        return self.max_students - self.enrollment_count


class Enrollment(OrganizationMixin, BaseModel):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
        ('suspended', 'Suspended'),
    )

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    drop_reason = models.CharField(max_length=255, blank=True)
    drop_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ('group', 'student')
        ordering = ['-enrolled_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['group', 'status']),
        ]

    def __str__(self):
        return f"{self.student} in {self.group}"


class Attendance(OrganizationMixin, AuditMixin, BaseModel):
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    )

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='present'
    )
    comments = models.TextField(blank=True)

    class Meta:
        unique_together = ('group', 'student', 'date')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['student', 'date']),
            models.Index(fields=['group', 'date']),
        ]

    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"


class Evaluation(OrganizationMixin, AuditMixin, BaseModel):
    TYPE_CHOICES = (
        ('test', 'Test'),
        ('oral', 'Oral'),
        ('writing', 'Writing'),
        ('listening', 'Listening'),
        ('participation', 'Participation'),
    )

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='evaluations'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='evaluations'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    score = models.DecimalField(max_digits=5, decimal_places=2)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['student', 'date']),
            models.Index(fields=['group', 'date']),
        ]

    def __str__(self):
        return f"{self.student} - {self.type} - {self.score}/{self.max_score}"

    @property
    def percentage(self):
        if self.max_score > 0:
            return (self.score / self.max_score) * 100
        return 0


class Certificate(OrganizationMixin, BaseModel):
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    level_achieved = models.CharField(max_length=50)
    issue_date = models.DateField(auto_now_add=True)
    certificate_number = models.CharField(max_length=100, unique=True)
    pdf_url = models.URLField(blank=True)
    issued_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificates_issued'
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['student', 'issue_date']),
            models.Index(fields=['certificate_number']),
        ]

    def __str__(self):
        return f"Certificate {self.certificate_number} - {self.student}"
