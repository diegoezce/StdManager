from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta

from apps.organizations.models import Organization, License
from apps.blast.models import (
    Teacher, Student, Group, CorporateClient,
    Enrollment, Attendance, Evaluation, Certificate
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting seed data...'))

        # Create Organization
        org, created = Organization.objects.get_or_create(
            name='BLAST Demo',
            defaults={
                'license_number': 'BLAST-DEMO-001',
                'status': 'active',
                'max_users': 100,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created organization: {org.name}'))

        # Create License
        license_obj, created = License.objects.get_or_create(
            organization=org,
            defaults={
                'type': 'professional',
                'max_students': 500,
                'max_teachers': 20,
                'max_groups': 50,
                'valid_from': date.today(),
                'valid_to': date.today() + timedelta(days=365),
                'status': 'active',
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created license for {org.name}'))

        # Create Admin User
        admin_user, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'username': 'admin',
                'first_name': 'Admin',
                'last_name': 'User',
                'organization': org,
                'role': 'owner',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('password123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {admin_user.email}'))

        # Create Teachers
        teachers_data = [
            {'first_name': 'John', 'last_name': 'Smith'},
            {'first_name': 'Sarah', 'last_name': 'Johnson'},
            {'first_name': 'Mike', 'last_name': 'Williams'},
        ]

        teachers = []
        for data in teachers_data:
            user, created = User.objects.get_or_create(
                email=f"{data['first_name'].lower()}@example.com",
                defaults={
                    'username': data['first_name'].lower(),
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'organization': org,
                    'role': 'teacher',
                }
            )
            if created:
                user.set_password('password123')
                user.save()

            teacher, created = Teacher.objects.get_or_create(
                user=user,
                organization=org,
                defaults={
                    'specializations': ['Grammar', 'Conversation'],
                    'bio': f'Experienced English teacher - {data["first_name"]} {data["last_name"]}',
                    'certifications': ['TOEFL', 'IELTS'],
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created teacher: {user.email}'))
            teachers.append(teacher)

        # Create Corporate Client
        corp_client, created = CorporateClient.objects.get_or_create(
            organization=org,
            company_name='Tech Corp Inc',
            defaults={
                'contact_name': 'Jane Doe',
                'contact_email': 'jane@techcorp.com',
                'contact_phone': '+1 555-0100',
                'address': '123 Business St, Tech City, TC 12345',
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created corporate client: {corp_client.company_name}'))

        # Create Students
        students_data = [
            {'first_name': 'Alice', 'last_name': 'Brown'},
            {'first_name': 'Bob', 'last_name': 'Davis'},
            {'first_name': 'Carol', 'last_name': 'Evans'},
            {'first_name': 'David', 'last_name': 'Frank'},
            {'first_name': 'Eve', 'last_name': 'Garcia'},
            {'first_name': 'Frank', 'last_name': 'Harris'},
        ]

        students = []
        for data in students_data:
            user, created = User.objects.get_or_create(
                email=f"{data['first_name'].lower()}@example.com",
                defaults={
                    'username': data['first_name'].lower(),
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'organization': org,
                    'role': 'student',
                }
            )
            if created:
                user.set_password('password123')
                user.save()

            student, created = Student.objects.get_or_create(
                user=user,
                organization=org,
                defaults={
                    'corporate_client': corp_client,
                    'english_level': 'intermediate',
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created student: {user.email}'))
            students.append(student)

        # Create Groups
        groups_data = [
            {
                'name': 'Intermediate English A',
                'level': 'intermediate',
                'teacher': teachers[0],
                'start_date': date.today() - timedelta(days=30),
                'max_students': 15,
            },
            {
                'name': 'Advanced English B',
                'level': 'advanced',
                'teacher': teachers[1],
                'start_date': date.today() - timedelta(days=60),
                'max_students': 15,
            },
        ]

        groups = []
        for data in groups_data:
            group, created = Group.objects.get_or_create(
                organization=org,
                name=data['name'],
                defaults={
                    'level': data['level'],
                    'teacher': data['teacher'],
                    'schedule': {
                        'days': ['MON', 'WED', 'FRI'],
                        'time': '18:00',
                        'duration': 60,
                    },
                    'start_date': data['start_date'],
                    'max_students': data['max_students'],
                    'status': 'active',
                    'created_by': admin_user,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created group: {group.name}'))
            groups.append(group)

        # Create Enrollments
        for idx, student in enumerate(students):
            group = groups[idx % len(groups)]
            enrollment, created = Enrollment.objects.get_or_create(
                organization=org,
                group=group,
                student=student,
                defaults={
                    'status': 'active',
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Enrolled {student.user.get_full_name()} to {group.name}'))

        # Create Attendance Records
        for group in groups:
            for enrollment in group.enrollments.filter(status='active'):
                for i in range(10):
                    date_record = date.today() - timedelta(days=10-i)
                    Attendance.objects.get_or_create(
                        organization=org,
                        group=group,
                        student=enrollment.student,
                        date=date_record,
                        defaults={
                            'status': 'present' if i % 9 != 0 else 'absent',
                            'comments': '',
                            'created_by': group.teacher.user,
                        }
                    )

        # Create Evaluations
        for group in groups:
            for enrollment in group.enrollments.filter(status='active'):
                for eval_type in ['test', 'oral', 'writing']:
                    Evaluation.objects.get_or_create(
                        organization=org,
                        group=group,
                        student=enrollment.student,
                        type=eval_type,
                        defaults={
                            'score': 75 + (hash(str(enrollment.student.id) + eval_type) % 25),
                            'max_score': 100,
                            'notes': f'{eval_type.capitalize()} evaluation',
                            'created_by': group.teacher.user,
                        }
                    )

        self.stdout.write(self.style.SUCCESS('✅ Seed data completed successfully!'))
        self.stdout.write(self.style.WARNING('\nDemo credentials:'))
        self.stdout.write(self.style.WARNING('Email: admin@example.com'))
        self.stdout.write(self.style.WARNING('Password: password123'))
