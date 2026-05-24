"""
Sandbox demo seeder for BLEST.

Usage (Railway):
    python manage.py seed_sandbox --org-slug <slug>

The command is fully idempotent — safe to run multiple times.
It only creates records that don't already exist, so re-running it
on a partially-seeded org fills in the gaps without duplicating data.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.blast.models import (
    Attendance,
    Certificate,
    CorporateClient,
    Enrollment,
    Evaluation,
    Group,
    MondlyRecord,
    Student,
    Teacher,
)
from apps.organizations.models import Organization

User = get_user_model()

# ---------------------------------------------------------------------------
# Realistic demo data
# ---------------------------------------------------------------------------

TEACHERS = [
    {
        "email": "sarah.miller@blest.app",
        "username": "sarah.miller",
        "first_name": "Sarah",
        "last_name": "Miller",
        "specializations": ["Business English", "IELTS Preparation"],
        "bio": "CELTA-certified with 8 years of corporate English training experience.",
        "certifications": ["CELTA", "IELTS Examiner"],
    },
    {
        "email": "james.cooper@blest.app",
        "username": "james.cooper",
        "first_name": "James",
        "last_name": "Cooper",
        "specializations": ["General English", "Conversation"],
        "bio": "Native speaker from London. Passionate about bringing real-life English to the classroom.",
        "certifications": ["DELTA", "TEFL"],
    },
]

CORPORATE_CLIENTS = [
    {
        "company_name": "Horizon Tech Solutions",
        "contact_name": "Ana Martínez",
        "contact_email": "ana.martinez@horizontech.com",
        "contact_phone": "+34 912 345 678",
        "address": "Calle Gran Vía 28, Madrid, Spain",
    },
    {
        "company_name": "Global Imports & Exports S.A.",
        "contact_name": "Roberto Navarro",
        "contact_email": "r.navarro@globalimports.es",
        "contact_phone": "+34 934 567 890",
        "address": "Paseo de Gracia 55, Barcelona, Spain",
    },
]

# 12 students — mix of corporate-sponsored and individual
# Corporate students use their company domain; individuals use personal providers.
STUDENTS_DATA = [
    # Horizon Tech — 4 students
    {
        "email": "l.kovacevic@horizontech.com",
        "username": "lena.kova",
        "first_name": "Lena",
        "last_name": "Kovačević",
        "level": "intermediate",
        "corporate": "Horizon Tech Solutions",
    },
    {
        "email": "marco.ricci@horizontech.com",
        "username": "marco.ricci",
        "first_name": "Marco",
        "last_name": "Ricci",
        "level": "upper-intermediate",
        "corporate": "Horizon Tech Solutions",
    },
    {
        "email": "y.tanaka@horizontech.com",
        "username": "yuki.tanaka",
        "first_name": "Yuki",
        "last_name": "Tanaka",
        "level": "pre-intermediate",
        "corporate": "Horizon Tech Solutions",
    },
    {
        "email": "sofia.herrera@horizontech.com",
        "username": "sofia.herrera",
        "first_name": "Sofía",
        "last_name": "Herrera",
        "level": "intermediate",
        "corporate": "Horizon Tech Solutions",
    },
    # Global Imports — 3 students
    {
        "email": "c.vega@globalimports.es",
        "username": "carlos.vega",
        "first_name": "Carlos",
        "last_name": "Vega",
        "level": "elementary",
        "corporate": "Global Imports & Exports S.A.",
    },
    {
        "email": "nadia.osei@globalimports.es",
        "username": "nadia.osei",
        "first_name": "Nadia",
        "last_name": "Osei",
        "level": "pre-intermediate",
        "corporate": "Global Imports & Exports S.A.",
    },
    {
        "email": "p.dubois@globalimports.es",
        "username": "pierre.dubois",
        "first_name": "Pierre",
        "last_name": "Dubois",
        "level": "advanced",
        "corporate": "Global Imports & Exports S.A.",
    },
    # Individual students — 5
    {
        "email": "ana.ruiz91@gmail.com",
        "username": "ana.ruiz",
        "first_name": "Ana",
        "last_name": "Ruiz",
        "level": "beginner",
        "corporate": None,
    },
    {
        "email": "tombaker.work@outlook.com",
        "username": "tom.baker",
        "first_name": "Tom",
        "last_name": "Baker",
        "level": "intermediate",
        "corporate": None,
    },
    {
        "email": "meichen88@gmail.com",
        "username": "mei.chen",
        "first_name": "Mei",
        "last_name": "Chen",
        "level": "upper-intermediate",
        "corporate": None,
    },
    {
        "email": "ivan.petrov.spb@gmail.com",
        "username": "ivan.petrov",
        "first_name": "Ivan",
        "last_name": "Petrov",
        "level": "elementary",
        "corporate": None,
    },
    {
        "email": "fatima.alrashid@hotmail.com",
        "username": "fatima.alrashid",
        "first_name": "Fatima",
        "last_name": "Al-Rashid",
        "level": "pre-intermediate",
        "corporate": None,
    },
]

# Groups: teacher index (0/1), list of student usernames enrolled
GROUPS_DATA = [
    {
        "name": "Business English — Intermediate",
        "level": "intermediate",
        "teacher_idx": 0,
        "schedule": {"days": ["MON", "WED", "FRI"], "time": "09:00", "duration": 60},
        "start_offset": -90,  # days from today
        "end_offset": 90,
        "status": "active",
        "max_students": 12,
        "description": "Focused on professional communication, presentations and business writing.",
        "students": ["lena.kova", "marco.ricci", "sofia.herrera", "tom.baker"],
    },
    {
        "name": "General English — Pre-Intermediate",
        "level": "pre-intermediate",
        "teacher_idx": 1,
        "schedule": {"days": ["TUE", "THU"], "time": "18:30", "duration": 90},
        "start_offset": -60,
        "end_offset": 120,
        "status": "active",
        "max_students": 10,
        "description": "Covers all four skills with emphasis on everyday conversation.",
        "students": ["yuki.tanaka", "nadia.osei", "fatima.alrashid", "ana.ruiz"],
    },
    {
        "name": "IELTS Preparation — Upper-Intermediate",
        "level": "upper-intermediate",
        "teacher_idx": 0,
        "schedule": {"days": ["MON", "WED"], "time": "19:00", "duration": 120},
        "start_offset": -45,
        "end_offset": 75,
        "status": "active",
        "max_students": 8,
        "description": "Intensive preparation for IELTS Academic, targeting Band 6.5+.",
        "students": ["marco.ricci", "mei.chen", "pierre.dubois"],
    },
    {
        "name": "Elementary English — Beginners",
        "level": "elementary",
        "teacher_idx": 1,
        "schedule": {"days": ["MON", "TUE", "WED", "THU", "FRI"], "time": "10:00", "duration": 50},
        "start_offset": -120,
        "end_offset": -10,
        "status": "completed",
        "max_students": 15,
        "description": "Intensive foundation course covering A1–A2 level.",
        "students": ["carlos.vega", "ivan.petrov", "ana.ruiz"],
    },
]

# Realistic attendance distribution: weights for (present, late, absent, excused)
ATTENDANCE_WEIGHTS = [0.72, 0.10, 0.12, 0.06]
ATTENDANCE_STATUSES = ["present", "late", "absent", "excused"]


def weighted_attendance():
    return random.choices(ATTENDANCE_STATUSES, weights=ATTENDANCE_WEIGHTS, k=1)[0]


# Evaluation score ranges per level (realistic progression)
SCORE_RANGES = {
    "beginner": (45, 75),
    "elementary": (50, 78),
    "pre-intermediate": (55, 82),
    "intermediate": (60, 88),
    "upper-intermediate": (65, 92),
    "advanced": (72, 97),
}

EVAL_TYPES = ["test", "oral", "writing", "listening", "participation"]


def realistic_score(level):
    lo, hi = SCORE_RANGES.get(level, (55, 85))
    return round(random.uniform(lo, hi), 1)


class Command(BaseCommand):
    help = "Seed a sandbox organization with realistic demo data for BLEST."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-slug",
            required=True,
            help="Slug of the organization to seed (e.g. 'sandbox' or 'my-school')",
        )

    def log(self, msg):
        self.stdout.write(msg)

    def ok(self, msg):
        self.stdout.write(self.style.SUCCESS(f"  ✓ {msg}"))

    def skip(self, msg):
        self.stdout.write(f"  · {msg}")

    def handle(self, *args, **options):
        slug = options["org_slug"]
        random.seed(42)  # reproducible data across runs

        try:
            org = Organization.objects.get(slug=slug)
        except Organization.DoesNotExist:
            raise CommandError(
                f"Organization with slug '{slug}' not found. "
                "Check available slugs with: python manage.py shell -c \"from apps.organizations.models import Organization; print(list(Organization.objects.values_list('slug', flat=True)))\""
            )

        self.log(f"\n🌱 Seeding sandbox data for: {org.name} (slug={slug})\n")

        # 1. Manager user
        self._seed_manager(org)

        # 2. Corporate clients
        clients = self._seed_corporate_clients(org)

        # 3. Teachers
        teachers = self._seed_teachers(org)

        # 4. Students
        students_by_username = self._seed_students(org, clients)

        # 5. Groups + enrollments + attendance + evaluations
        self._seed_groups(org, teachers, students_by_username)

        self.log("\n" + self.style.SUCCESS("✨ Sandbox seed complete!"))
        self.log("\n📋 Staff accounts (password: Demo2024!):")
        self.log("   laura.campos@blest.app   — Manager")
        self.log("   sarah.miller@blest.app   — Teacher")
        self.log("   james.cooper@blest.app   — Teacher")
        self.log("   (students log in with their own email addresses)\n")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_or_create_user(self, org, email, username, first_name, last_name, role, password="Demo2024!"):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "role": role,
                "organization": org,
                "is_active": True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.ok(f"Created {role}: {email}")
        else:
            if user.organization_id != org.pk:
                user.organization = org
                user.save(update_fields=["organization"])
            self.skip(f"Exists: {email}")
        return user

    def _seed_manager(self, org):
        self.log("👤 Manager")
        self._get_or_create_user(
            org,
            email="laura.campos@blest.app",
            username="laura.campos",
            first_name="Laura",
            last_name="Campos",
            role="manager",
        )

    def _seed_corporate_clients(self, org):
        self.log("\n🏢 Corporate clients")
        clients = {}
        for c in CORPORATE_CLIENTS:
            obj, created = CorporateClient.objects.get_or_create(
                organization=org,
                company_name=c["company_name"],
                defaults={
                    "contact_name": c["contact_name"],
                    "contact_email": c["contact_email"],
                    "contact_phone": c["contact_phone"],
                    "address": c["address"],
                    "is_active": True,
                },
            )
            if created:
                self.ok(f"Created client: {c['company_name']}")
            else:
                self.skip(f"Exists: {c['company_name']}")
            clients[c["company_name"]] = obj
        return clients

    def _seed_teachers(self, org):
        self.log("\n🎓 Teachers")
        teachers = []
        for t in TEACHERS:
            user = self._get_or_create_user(
                org,
                email=t["email"],
                username=t["username"],
                first_name=t["first_name"],
                last_name=t["last_name"],
                role="teacher",
            )
            teacher, created = Teacher.objects.get_or_create(
                user=user,
                defaults={
                    "organization": org,
                    "specializations": t["specializations"],
                    "bio": t["bio"],
                    "certifications": t["certifications"],
                },
            )
            if created:
                self.ok(f"Teacher profile: {user.get_full_name()}")
            else:
                if teacher.organization_id != org.pk:
                    teacher.organization = org
                    teacher.save(update_fields=["organization"])
            teachers.append(teacher)
        return teachers

    def _seed_students(self, org, clients):
        self.log("\n🎒 Students")
        students_by_username = {}
        for s in STUDENTS_DATA:
            client_obj = clients.get(s["corporate"]) if s["corporate"] else None

            user = self._get_or_create_user(
                org,
                email=s["email"],
                username=s["username"],
                first_name=s["first_name"],
                last_name=s["last_name"],
                role="student",
            )
            if client_obj:
                user.corporate_client = client_obj
                user.save(update_fields=["corporate_client"])

            student, created = Student.objects.get_or_create(
                user=user,
                defaults={
                    "organization": org,
                    "english_level": s["level"],
                    "corporate_client": client_obj,
                    "is_active": True,
                },
            )
            if created:
                self.ok(f"Student: {user.get_full_name()} ({s['level']})")
            else:
                if student.organization_id != org.pk:
                    student.organization = org
                    student.save(update_fields=["organization"])
                self.skip(f"Exists: {user.get_full_name()}")
            students_by_username[s["username"]] = student

            # Mondly record for all students
            self._seed_mondly(org, student, s["level"])

        return students_by_username

    def _seed_mondly(self, org, student, level):
        level_order = ["beginner", "elementary", "pre-intermediate", "intermediate", "upper-intermediate", "advanced"]
        level_num = level_order.index(level) + 1 if level in level_order else 1

        _, created = MondlyRecord.objects.get_or_create(
            organization=org,
            email=student.user.email,
            language="English",
            defaults={
                "student": student,
                "name": student.user.get_full_name(),
                "level": level_num,
                "points": random.randint(level_num * 800, level_num * 2500),
                "best_streak": random.randint(3, 30),
                "learning_minutes": random.randint(level_num * 60, level_num * 300),
                "lessons_completed": random.randint(level_num * 5, level_num * 20),
                "words_learned": random.randint(level_num * 50, level_num * 200),
                "phrases_learned": random.randint(level_num * 20, level_num * 80),
                "last_active_on": timezone.now() - timedelta(days=random.randint(0, 14)),
                "mondly_team": org.name,
                "imported_by": None,
            },
        )
        if created:
            self.ok(f"  Mondly record: {student.user.get_full_name()}")

    def _seed_groups(self, org, teachers, students_by_username):
        self.log("\n📚 Groups, enrollments, attendance & evaluations")
        today = timezone.now().date()

        for g in GROUPS_DATA:
            teacher = teachers[g["teacher_idx"]] if g["teacher_idx"] < len(teachers) else None
            start = today + timedelta(days=g["start_offset"])
            end = today + timedelta(days=g["end_offset"])

            group, created = Group.objects.get_or_create(
                organization=org,
                name=g["name"],
                defaults={
                    "level": g["level"],
                    "teacher": teacher,
                    "schedule": g["schedule"],
                    "start_date": start,
                    "end_date": end,
                    "max_students": g["max_students"],
                    "status": g["status"],
                    "description": g["description"],
                },
            )
            if created:
                self.ok(f"Group: {g['name']} ({g['status']})")
            else:
                self.skip(f"Group exists: {g['name']}")

            enrolled_students = []
            for uname in g["students"]:
                student = students_by_username.get(uname)
                if not student:
                    continue
                enrollment, e_created = Enrollment.objects.get_or_create(
                    group=group,
                    student=student,
                    defaults={"organization": org, "status": "active"},
                )
                if e_created:
                    self.ok(f"  Enrolled: {student.user.get_full_name()} → {group.name}")
                enrolled_students.append(student)

            # Attendance: one record per class day between start and today
            self._seed_attendance(org, group, enrolled_students, start, end, g["schedule"]["days"])

            # Evaluations: 3-5 per student
            self._seed_evaluations(org, group, enrolled_students, g["level"], start)

            # Certificates for completed groups
            if g["status"] == "completed":
                self._seed_certificates(org, group, enrolled_students)

    def _seed_attendance(self, org, group, students, start, end, class_days):
        day_map = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}
        class_weekdays = {day_map[d] for d in class_days if d in day_map}
        today = timezone.now().date()
        cursor = start
        count = 0
        while cursor <= min(end, today):
            if cursor.weekday() in class_weekdays:
                for student in students:
                    _, created = Attendance.objects.get_or_create(
                        group=group,
                        student=student,
                        date=cursor,
                        defaults={
                            "organization": org,
                            "status": weighted_attendance(),
                            "comments": "",
                        },
                    )
                    if created:
                        count += 1
            cursor += timedelta(days=1)
        if count:
            self.ok(f"  {count} attendance records for {group.name}")

    def _seed_evaluations(self, org, group, students, level, start):
        count = 0
        for student in students:
            existing = Evaluation.objects.filter(group=group, student=student).count()
            if existing >= 3:
                continue
            num_evals = random.randint(3, 5)
            for i in range(num_evals):
                eval_type = EVAL_TYPES[i % len(EVAL_TYPES)]
                score = Decimal(str(realistic_score(level)))
                # Spread evaluations across the group duration so far
                days_in = (timezone.now().date() - start).days
                eval_day = start + timedelta(days=max(1, int(days_in * (i + 1) / (num_evals + 1))))
                Evaluation.objects.get_or_create(
                    group=group,
                    student=student,
                    type=eval_type,
                    defaults={
                        "organization": org,
                        "score": score,
                        "max_score": Decimal("100"),
                        "notes": "",
                    },
                )
                count += 1
        if count:
            self.ok(f"  {count} evaluations for {group.name}")

    _CERT_NOTES = [
        "Completed all modules with consistent attendance and strong oral performance.",
        "Demonstrated notable progress across all four skills throughout the course.",
        "Passed final assessment with distinction. Excellent written and listening skills.",
        "Met all course requirements. Showed particular strength in conversation tasks.",
        "Completed the programme successfully. Ready to progress to the next level.",
    ]

    def _seed_certificates(self, org, group, students):
        count = 0
        for i, student in enumerate(students):
            cert_num = f"CERT-{group.level[:3].upper()}-{student.user.username[:6].upper()}-2025"
            _, created = Certificate.objects.get_or_create(
                certificate_number=cert_num,
                defaults={
                    "organization": org,
                    "student": student,
                    "group": group,
                    "level_achieved": group.level.replace("-", " ").title(),
                    "notes": self._CERT_NOTES[i % len(self._CERT_NOTES)],
                },
            )
            if created:
                self.ok(f"  Certificate: {student.user.get_full_name()}")
                count += 1
        if count:
            self.ok(f"  {count} certificates issued for {group.name}")
