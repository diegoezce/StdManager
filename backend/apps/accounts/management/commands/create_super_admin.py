from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a new super_admin user, or promote an existing user to super_admin.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--password', help='Required when creating a new user.')
        parser.add_argument('--first-name', default='Super')
        parser.add_argument('--last-name', default='Admin')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options.get('password')

        user = User.objects.filter(email__iexact=email).first()

        if user:
            user.role = 'super_admin'
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.organization = None
            if password:
                user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Promoted {user.email} to super_admin.'))
            return

        if not password:
            raise CommandError('--password is required when creating a new user.')

        base_username = email.split('@')[0] or 'superadmin'
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{counter}'
            counter += 1

        user = User.objects.create(
            email=email,
            username=username,
            first_name=options['first_name'],
            last_name=options['last_name'],
            role='super_admin',
            is_active=True,
            is_staff=True,
            is_superuser=True,
            organization=None,
        )
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Created super_admin {user.email}.'))
