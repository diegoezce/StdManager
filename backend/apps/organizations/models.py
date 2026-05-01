import uuid
from django.db import models
from django.utils.text import slugify
from apps.core.models import BaseModel


class Organization(BaseModel):
    STATUS_CHOICES = (
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('inactive', 'Inactive'),
    )

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(unique=True, max_length=255)
    license_number = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    max_users = models.IntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class License(BaseModel):
    TYPE_CHOICES = (
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    )

    STATUS_CHOICES = (
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('suspended', 'Suspended'),
    )

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='license'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='free')
    max_students = models.IntegerField(default=50)
    max_teachers = models.IntegerField(default=5)
    max_groups = models.IntegerField(default=10)
    valid_from = models.DateField()
    valid_to = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization.name} - {self.type}"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now().date() > self.valid_to
