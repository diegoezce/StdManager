from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.organizations.models import Organization, License
from apps.blast.models import Teacher, Student, Group, Enrollment, Attendance
from uuid import uuid4
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def log(self, msg, level='info'):
        """Log messages consistently"""
        getattr(logger, level)(msg)
        self.stdout.write(msg)

    def handle(self, *args, **options):
        self.log('🌱 Starting seed...', 'info')

        try:
            # Create organization
            org, created = Organization.objects.get_or_create(
                slug='test-org',
                defaults={
                    'name': 'Test Organization',
                    'license_number': 'TEST-2026'
                }
            )
            if created:
                self.log(f'✅ Organization created: {org.name}', 'info')
            else:
                self.log(f'ℹ️  Organization already exists: {org.name}', 'info')
        except Exception as e:
            self.log(f'❌ Error creating organization: {str(e)}', 'error')
            return

        try:
            # Create license
            License.objects.get_or_create(
                organization=org,
                defaults={
                    'type': 'basic',
                    'max_students': 100,
                    'max_teachers': 10,
                    'valid_from': timezone.now(),
                    'valid_to': timezone.now() + timedelta(days=365),
                    'status': 'active'
                }
            )
            self.log(f'✅ License created for {org.name}', 'info')
        except Exception as e:
            self.log(f'❌ Error creating license: {str(e)}', 'error')
            return

        # Create users
        users_data = [
            {'email': 'owner@test.com', 'username': 'owner', 'first_name': 'Owner', 'last_name': 'User', 'role': 'owner', 'password': 'owner123'},
            {'email': 'manager@test.com', 'username': 'manager', 'first_name': 'Manager', 'last_name': 'User', 'role': 'manager', 'password': 'manager123'},
            {'email': 'teacher@test.com', 'username': 'teacher', 'first_name': 'Teacher', 'last_name': 'User', 'role': 'teacher', 'password': 'teacher123'},
            {'email': 'student1@test.com', 'username': 'student1', 'first_name': 'Student', 'last_name': 'One', 'role': 'student', 'password': 'student123'},
            {'email': 'student2@test.com', 'username': 'student2', 'first_name': 'Student', 'last_name': 'Two', 'role': 'student', 'password': 'student123'},
        ]

        users = {}
        try:
            for user_data in users_data:
                try:
                    user, created = User.objects.get_or_create(
                        email=user_data['email'],
                        defaults={
                            'username': user_data['username'],
                            'first_name': user_data['first_name'],
                            'last_name': user_data['last_name'],
                            'role': user_data['role'],
                            'organization': org,
                            'is_active': True
                        }
                    )
                    if created:
                        user.set_password(user_data['password'])
                        user.save()
                        self.log(f'✅ User created: {user.email} ({user.role})', 'info')
                    else:
                        self.log(f'ℹ️  User already exists: {user.email}', 'info')
                    users[user_data['username']] = user
                except Exception as e:
                    self.log(f'❌ Error creating user {user_data["email"]}: {str(e)}', 'error')
                    continue
        except Exception as e:
            self.log(f'❌ Error in user creation loop: {str(e)}', 'error')
            return

        # Create teacher
        teacher = None
        try:
            if 'teacher' in users:
                teacher, created = Teacher.objects.get_or_create(
                    user=users['teacher'],
                    defaults={
                        'organization': org,
                        'specializations': ['English', 'TOEFL']
                    }
                )
                if created:
                    self.log(f'✅ Teacher created: {teacher.user.first_name}', 'info')
                else:
                    self.log(f'ℹ️  Teacher already exists: {teacher.user.first_name}', 'info')
        except Exception as e:
            self.log(f'❌ Error creating teacher: {str(e)}', 'error')

        # Create students
        students = []
        student_usernames = ['student1', 'student2']
        try:
            for i, student_username in enumerate(student_usernames):
                if student_username not in users:
                    self.log(f'⚠️  User {student_username} not found, skipping student creation', 'warning')
                    continue
                try:
                    student, created = Student.objects.get_or_create(
                        user=users[student_username],
                        defaults={
                            'organization': org,
                            'english_level': 'A1' if i == 0 else 'B1',
                            'is_active': True
                        }
                    )
                    if created:
                        self.log(f'✅ Student created: {student.user.first_name}', 'info')
                    else:
                        self.log(f'ℹ️  Student already exists: {student.user.first_name}', 'info')
                    students.append(student)
                except Exception as e:
                    self.log(f'❌ Error creating student {student_username}: {str(e)}', 'error')
                    continue
        except Exception as e:
            self.log(f'❌ Error in student creation loop: {str(e)}', 'error')

        # Create groups
        today = timezone.now().date()
        group = None
        try:
            if not teacher:
                self.log('⚠️  No teacher found, skipping group creation', 'warning')
            else:
                group, created = Group.objects.get_or_create(
                    organization=org,
                    name='English Basics A1',
                    defaults={
                        'level': 'A1',
                        'teacher': teacher,
                        'max_students': 20,
                        'start_date': today,
                        'end_date': today + timedelta(days=60),
                        'status': 'active'
                    }
                )
                if created:
                    self.log(f'✅ Group created: {group.name}', 'info')
                else:
                    self.log(f'ℹ️  Group already exists: {group.name}', 'info')
        except Exception as e:
            self.log(f'❌ Error creating group: {str(e)}', 'error')

        # Create enrollments
        try:
            if not group or not students:
                self.log('⚠️  Group or students not found, skipping enrollments', 'warning')
            else:
                for student in students:
                    try:
                        enrollment, created = Enrollment.objects.get_or_create(
                            group=group,
                            student=student,
                            defaults={
                                'organization': org,
                                'status': 'active'
                            }
                        )
                        if created:
                            self.log(f'✅ Enrollment created: {student.user.first_name} → {group.name}', 'info')
                        else:
                            self.log(f'ℹ️  Enrollment already exists: {student.user.first_name} → {group.name}', 'info')
                    except Exception as e:
                        self.log(f'❌ Error creating enrollment for {student.user.first_name}: {str(e)}', 'error')
                        continue
        except Exception as e:
            self.log(f'❌ Error in enrollment creation loop: {str(e)}', 'error')

        # Create attendance records
        attendance_count = 0
        try:
            if not group or not students:
                self.log('⚠️  Group or students not found, skipping attendance creation', 'warning')
            else:
                for i in range(5):
                    date = today - timedelta(days=i)
                    for student in students:
                        try:
                            attendance, created = Attendance.objects.get_or_create(
                                group=group,
                                student=student,
                                date=date,
                                defaults={
                                    'organization': org,
                                    'status': 'present' if i % 2 == 0 else 'absent',
                                    'comments': ''
                                }
                            )
                            if created:
                                attendance_count += 1
                        except Exception as e:
                            self.log(f'❌ Error creating attendance for {student.user.first_name} on {date}: {str(e)}', 'error')
                            continue
        except Exception as e:
            self.log(f'❌ Error in attendance creation loop: {str(e)}', 'error')

        self.log(f'✅ Created {attendance_count} attendance records', 'info')
        self.log(self.style.SUCCESS('✨ Seed completed!'), 'info')
        self.log('\n📝 Test accounts:', 'info')
        self.log('  Owner: owner@test.com / owner123', 'info')
        self.log('  Manager: manager@test.com / manager123', 'info')
        self.log('  Teacher: teacher@test.com / teacher123', 'info')
        self.log('  Student: student1@test.com / student123', 'info')
        self.log('  Student: student2@test.com / student123', 'info')
