"""Keep role-specific profile rows in sync with a user's role.

A user with role 'teacher' needs a blast_teacher row (and 'student' a
blast_student row) or they won't show up in the teacher/student lists — e.g.
the teacher dropdown in the group form reads blast_teacher, not the user's role.

register() creates the profile on initial creation, but changing a user's role
later (edit user / assign_role) would otherwise leave the profile missing. This
post_save signal covers every path that saves a user.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_role_profile(sender, instance, **kwargs):
    # Can't scope a profile without an organization (e.g. pending/invited users).
    if not instance.organization_id:
        return

    if instance.role == 'teacher':
        from apps.blast.models import Teacher
        Teacher.objects.get_or_create(
            user=instance,
            defaults={'organization': instance.organization},
        )
    elif instance.role == 'student':
        from apps.blast.models import Student
        Student.objects.get_or_create(
            user=instance,
            defaults={'organization': instance.organization},
        )
