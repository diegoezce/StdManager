import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('owner', 'Owner'),
        ('manager', 'Manager'),
        ('admin', 'Admin'),
        ('teacher', 'Teacher'),
        ('corporate_client', 'Corporate Client'),
        ('student', 'Student'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        default=None
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    requested_organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        related_name='access_requests',
        null=True,
        blank=True,
        default=None,
    )
    corporate_client = models.ForeignKey(
        'blast.CorporateClient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_accounts',
        default=None,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'role']),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
