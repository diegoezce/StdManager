from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Fix users missing organization or Student/Teacher profiles'

    def handle(self, *args, **options):
        from apps.organizations.models import Organization
        from apps.blast.models import Student, Teacher

        # 1. Fix users with no organization — assign to the first (and likely only) org
        orgs = Organization.objects.all()
        if not orgs.exists():
            self.stderr.write('No organizations found. Aborting.')
            return

        default_org = orgs.first()
        self.stdout.write(f'Default org: {default_org}')

        no_org = User.objects.filter(organization__isnull=True).exclude(role='super_admin')
        for u in no_org:
            u.organization = default_org
            u.save(update_fields=['organization'])
            self.stdout.write(f'  Fixed org for {u.email} (role={u.role})')

        self.stdout.write(self.style.SUCCESS(f'Fixed {no_org.count()} users with no organization'))

        # 2. Create missing Student profiles
        student_users = User.objects.filter(role='student')
        created_students = 0
        for u in student_users:
            if not hasattr(u, 'student_profile') or not Student.objects.filter(user=u).exists():
                Student.objects.create(
                    user=u,
                    organization=u.organization or default_org,
                    english_level='beginner',
                )
                created_students += 1
                self.stdout.write(f'  Created Student profile for {u.email}')

        self.stdout.write(self.style.SUCCESS(f'Created {created_students} missing Student profiles'))

        # 3. Create missing Teacher profiles
        teacher_users = User.objects.filter(role='teacher')
        created_teachers = 0
        for u in teacher_users:
            if not Teacher.objects.filter(user=u).exists():
                Teacher.objects.create(
                    user=u,
                    organization=u.organization or default_org,
                    specializations=[],
                )
                created_teachers += 1
                self.stdout.write(f'  Created Teacher profile for {u.email}')

        self.stdout.write(self.style.SUCCESS(f'Created {created_teachers} missing Teacher profiles'))
