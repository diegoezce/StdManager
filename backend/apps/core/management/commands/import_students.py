import unicodedata
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization
from apps.blast.models import CorporateClient, Student

User = get_user_model()

LEVEL_MAP = {
    'A1': 'beginner',
    'A2': 'elementary',
    'B1': 'pre-intermediate',
    'B2': 'upper-intermediate',
    'C1': 'advanced',
}

STUDENTS = [
    # (first_name, last_name, email, company, level_code, is_active)
    ('Juan Carlos', 'Acuña',           'juan.acuna@bekaertdeslee.com',         'Bekaert Deslee', 'B1', True),
    ('Federico',   'Benay',            'federico.benay@finlays.net',            'Finlays',        'A1', False),
    ('Cristian',   'Berent',           'cristian.berent@casafuentes.com.ar',    'Finlays',        'A2', True),
    ('Enzo',       'Da Rosa',          'enzo.darosa@finlays.net',               'Finlays',        'A1', True),
    ('Gustavo',    'De Benito',        None,                                    'Finlays',        'A2', False),
    ('Emmanuel',   'Decima',           'emmanuel.decima@bekaertdeslee.com',     'Bekaert Deslee', 'A2', True),
    ('Juan',       'Garbarino',        'juan.garbarino@bekaertdeslee.com',      'Bekaert Deslee', 'B2', False),
    ('Martin',     'Garbarino',        'martin.garbarino@bekaertdeslee.com',    'Bekaert Deslee', 'B2', True),
    ('Javier',     'Kotylo',           'javier.kotylo@bekaertdeslee.com',       'Bekaert Deslee', 'B2', True),
    ('Santiago',   'Laranga',          'santiago.laranga@bekaertdeslee.com',    'Bekaert Deslee', 'C1', True),
    ('Fernanda',   'Massaini',         'fernanda.massaini@bekaertdeslee.com',   'Bekaert Deslee', 'B2', True),
    ('Ernesto',    'Medica',           'ernesto.medico@bekaertdeslee.com',      'Bekaert Deslee', 'A1', True),
    ('Patricio',   'Mohnen',           None,                                    'Bekaert Deslee', 'C1', True),
    ('Gustavo',    'Nuñez',            None,                                    'Bekaert Deslee', 'B2', True),
    ('Romina',     'Olavarriaga',      'romina.olavarriaga@bekaertdeslee.com',  'Bekaert Deslee', 'C1', True),
    ('Nicole',     'Ortiz',            'nicole.ortiz@bekaertdeslee.com',        'Bekaert Deslee', 'A1', True),
    ('Claudia',    'Paolone',          'claudia.paolone@bekaertdeslee.com',     'Bekaert Deslee', 'A1', True),
    ('Javier',     'Pifarre',          'javier.pifarre@bekaertdeslee.com',      'Bekaert Deslee', 'B2', True),
    ('Dario',      'Plez',             'dario.plez@bekaertdeslee.com',          'Bekaert Deslee', 'A2', True),
    ('Fernanda',   'Rafart',           'fernanda.rafart@bekaertdeslee.com',     'Bekaert Deslee', 'A2', True),
    ('Dante',      'Rodriguez',        None,                                    'Bekaert Deslee', 'C1', True),
    ('Sebastian',  'Ruffini',          'sebastian.ruffini@finlays.net',         'Finlays',        'A2', True),
    ('Andrea Milagros', 'Ruiz Diaz',   'andrea.ruizdiaz@finlays.net',           'Finlays',        'A2', True),
    ('Luis',       'Sanchez',          'luis.sanchez@bekaertdeslee.com',        'Bekaert Deslee', 'B1', True),
    ('Julian',     'Sperk',            'julian.sperk@bekaertdeslee.com',        'Bekaert Deslee', 'A2', True),
    ('Christian',  'Suarez',           'christian.suarez@bekaertdeslee.com',    'Bekaert Deslee', 'A1', True),
    ('Soledad',    'Tanda',            'soledad.tanda@bekaertdeslee.com',       'Bekaert Deslee', 'A1', True),
    ('Eugenio',    'Wenzel',           'eugenio.wenzel@bekaertdeslee.com',      'Bekaert Deslee', 'B1', True),
]

COMPANIES = {
    'Finlays': {
        'contact_name': 'Finlays HR',
        'contact_email': 'hr@finlays.net',
    },
    'Bekaert Deslee': {
        'contact_name': 'Bekaert Deslee HR',
        'contact_email': 'hr@bekaertdeslee.com',
    },
}


def slugify_name(text):
    """Convert accented name to ASCII slug: 'Acuña' → 'acuna'"""
    normalized = unicodedata.normalize('NFKD', text)
    ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
    return ascii_text.lower().replace(' ', '').replace('-', '')


def build_username(first_name, last_name):
    first = slugify_name(first_name.split()[0])  # take only first given name
    last = slugify_name(last_name.replace(' ', ''))
    return f"{first}.{last}"


def build_placeholder_email(first_name, last_name):
    return f"{build_username(first_name, last_name)}@noemail.local"


class Command(BaseCommand):
    help = 'Import 28 real students into the production database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-slug',
            default='test-org',
            help='Slug of the organization to import students into (default: test-org)',
        )
        parser.add_argument(
            '--password',
            default='ChangeMe2026!',
            help='Default password for new user accounts',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be created without saving to database',
        )

    def handle(self, *args, **options):
        org_slug = options['org_slug']
        password = options['password']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be saved\n'))

        try:
            org = Organization.objects.get(slug=org_slug)
        except Organization.DoesNotExist:
            # Try to find any organization
            org = Organization.objects.first()
            if not org:
                raise CommandError('No organization found. Run the seed command first.')
            self.stdout.write(self.style.WARNING(
                f'Org "{org_slug}" not found — using "{org.slug}" instead'
            ))

        self.stdout.write(f'Importing into organization: {org.name}\n')

        # Create corporate clients
        clients = {}
        for company_name, details in COMPANIES.items():
            if dry_run:
                self.stdout.write(f'  [DRY RUN] Would create/get CorporateClient: {company_name}')
                clients[company_name] = None
                continue
            client, created = CorporateClient.objects.get_or_create(
                organization=org,
                company_name=company_name,
                defaults={
                    'contact_name': details['contact_name'],
                    'contact_email': details['contact_email'],
                    'is_active': True,
                }
            )
            clients[company_name] = client
            status = 'created' if created else 'already exists'
            self.stdout.write(f'  CorporateClient {company_name}: {status}')

        created_count = 0
        skipped_count = 0

        for first_name, last_name, email, company, level_code, is_active in STUDENTS:
            username = build_username(first_name, last_name)
            user_email = email if email else build_placeholder_email(first_name, last_name)
            english_level = LEVEL_MAP[level_code]
            full_name = f'{first_name} {last_name}'

            if dry_run:
                self.stdout.write(
                    f'  [DRY RUN] {full_name} | {user_email} | {company} | {level_code} → {english_level} | active={is_active}'
                )
                created_count += 1
                continue

            try:
                user, user_created = User.objects.get_or_create(
                    email=user_email,
                    defaults={
                        'username': username,
                        'first_name': first_name,
                        'last_name': last_name,
                        'role': 'student',
                        'organization': org,
                        'is_active': is_active,
                    }
                )
                if user_created:
                    user.set_password(password)
                    user.save()

                corporate_client = clients.get(company)
                student, student_created = Student.objects.get_or_create(
                    user=user,
                    defaults={
                        'organization': org,
                        'corporate_client': corporate_client,
                        'english_level': english_level,
                        'is_active': is_active,
                    }
                )

                if user_created or student_created:
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ {full_name} ({user_email}) [{level_code}]')
                    )
                    created_count += 1
                else:
                    self.stdout.write(f'  - {full_name} ({user_email}) already exists')
                    skipped_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {full_name}: {e}')
                )

        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN complete — would import {created_count} students'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Done: {created_count} imported, {skipped_count} already existed'
            ))
            self.stdout.write(f'Default password: {password}')
