from django.db import models
from apps.core.models import AuditLog


class OrganizationMixin(models.Model):
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='%(class)s_objects',
    )

    class Meta:
        abstract = True


class AuditMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_created',
    )
    updated_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_updated',
    )

    class Meta:
        abstract = True

    def log_change(self, user, action, changes):
        AuditLog.objects.create(
            organization=self.organization if hasattr(self, 'organization') else None,
            user=user,
            action=action,
            resource_type=self.__class__.__name__,
            resource_id=self.id,
            changes=changes,
        )
