from collections import defaultdict
from datetime import date

import requests
from django.conf import settings
from django.core import signing
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string

from apps.blast.models import Attendance, CorporateClient, MondlyRecord
from apps.blast.report_charts import attendance_bar_chart, attendance_donut_chart
from apps.organizations.models import Organization


MONTH_NAMES_ES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
}

LEVEL_LABELS = {
    'beginner': 'Beginner',
    'elementary': 'Elementary',
    'pre-intermediate': 'Pre-Intermediate',
    'intermediate': 'Intermediate',
    'upper-intermediate': 'Upper-Intermediate',
    'advanced': 'Advanced',
}


class Command(BaseCommand):
    help = 'Send monthly attendance reports to all corporate client HR contacts.'

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, help='Year (e.g. 2026). Defaults to current year.')
        parser.add_argument('--dry-run', action='store_true', help='Print emails to stdout instead of sending.')
        parser.add_argument('--client-id', type=str, help='Only send for this CorporateClient UUID.')

    def handle(self, *args, **options):
        today = date.today()
        year = options['year'] or today.year
        date_from = date(year, 1, 1)
        date_to = date(year, today.month, today.day) if year == today.year else date(year, 12, 31)

        dry_run = options['dry_run']
        target_client_id = options.get('client_id')

        period_label = f'Enero–{MONTH_NAMES_ES[date_to.month]} {year}'
        self.stdout.write(f'Sending YTD reports for {period_label} (dry_run={dry_run})')

        sent = 0
        skipped = 0

        for org in Organization.objects.filter(is_active=True):
            clients_qs = CorporateClient.objects.filter(
                organization=org,
                is_active=True,
                send_monthly_report=True,
            )
            if target_client_id:
                clients_qs = clients_qs.filter(id=target_client_id)

            for client in clients_qs:
                result = self._send_report(org, client, year, date_from, date_to, period_label, dry_run)
                if result:
                    sent += 1
                else:
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(f'Done. Sent: {sent}  Skipped: {skipped}'))

    def _send_report(self, org, client, year, date_from, date_to, period_label, dry_run):
        # All attendance records for this client's students in the YTD range
        attendances = Attendance.objects.filter(
            organization=org,
            student__corporate_client=client,
            student__is_active=True,
            date__gte=date_from,
            date__lte=date_to,
        ).select_related('student__user', 'group')

        if not attendances.exists():
            self.stdout.write(f'  SKIP {client.company_name} — no attendance data')
            return False

        # Aggregate per student
        student_rows = defaultdict(lambda: {
            'name': '', 'present': 0, 'absent': 0, 'late': 0, 'excused': 0,
        })
        group_dates = defaultdict(set)  # group_id → set of dates with records
        group_meta = {}

        for record in attendances:
            sid = record.student_id
            student_rows[sid]['name'] = (
                record.student.user.get_full_name() or record.student.user.email
            )
            student_rows[sid][record.status] += 1

            gid = record.group_id
            group_dates[gid].add(record.date)
            if gid not in group_meta:
                group_meta[gid] = {
                    'name': record.group.name,
                    'level': LEVEL_LABELS.get(record.group.level, record.group.level),
                }

        students = []
        for sid, row in student_rows.items():
            total = row['present'] + row['absent'] + row['late'] + row['excused']
            attended = row['present'] + row['late']
            rate = round(attended / total * 100, 1) if total > 0 else None
            students.append({
                '_id': sid,
                'name': row['name'],
                'present': row['present'],
                'absent': row['absent'],
                'late': row['late'],
                'excused': row['excused'],
                'total': total,
                'rate': rate,
            })
        students.sort(key=lambda s: s['name'])

        groups = []
        for gid, meta in group_meta.items():
            groups.append({
                'name': meta['name'],
                'level': meta['level'],
                'classes_held': len(group_dates[gid]),
            })
        groups.sort(key=lambda g: g['name'])

        # Latest Mondly snapshot per student (most recent import)
        mondly_qs = (
            MondlyRecord.objects
            .filter(organization=org, student__corporate_client=client, student__isnull=False)
            .order_by('student_id', '-imported_at')
            .distinct('student_id')
            .values(
                'student_id', 'level', 'points', 'best_streak',
                'learning_minutes', 'lessons_completed', 'words_learned',
                'phrases_learned', 'last_active_on',
            )
        )
        mondly_by_student = {r['student_id']: r for r in mondly_qs}

        # Build mondly rows for students that have data, preserving name order
        mondly_students = []
        for s in students:
            m = mondly_by_student.get(s['_id'])
            if m:
                mondly_students.append({
                    'name': s['name'],
                    'level': m['level'],
                    'learning_minutes': m['learning_minutes'],
                    'lessons_completed': m['lessons_completed'],
                    'words_learned': m['words_learned'],
                    'best_streak': m['best_streak'],
                    'points': m['points'],
                })

        chart_bar = attendance_bar_chart(students)
        chart_donut = attendance_donut_chart(students)
        token = signing.dumps({'client_id': str(client.id), 'year': year, 'date_from': date_from.isoformat(), 'date_to': date_to.isoformat()})
        base_url = getattr(settings, 'PUBLIC_BASE_URL', '').rstrip('/')
        online_url = f'{base_url}/api/v1/reports/public/{token}/' if base_url else None

        context = {
            'company_name': client.company_name,
            'period_label': period_label,
            'year': year,
            'students': students,
            'groups': groups,
            'mondly_students': mondly_students,
            'online_url': online_url,
            'chart_bar': chart_bar,
            'chart_donut': chart_donut,
        }

        subject = f'Reporte BLEST — {client.company_name} — {period_label}'
        html_body = render_to_string('emails/monthly_report.html', context)

        if dry_run:
            self.stdout.write(f'\n{"="*60}')
            self.stdout.write(f'TO: {client.contact_email}')
            self.stdout.write(f'SUBJECT: {subject}')
            self.stdout.write(f'Period: {date_from} → {date_to}')
            self.stdout.write(f'Students: {len(students)}  Groups: {len(groups)}')
            for s in students:
                self.stdout.write(
                    f'  {s["name"]}: P={s["present"]} A={s["absent"]} '
                    f'L={s["late"]} E={s["excused"]} rate={s["rate"]}%'
                )
            self.stdout.write(f'{"="*60}\n')
            return True

        import email.utils
        api_key = settings.MAILJET_API_KEY
        api_secret = settings.MAILJET_API_SECRET
        from_name, from_email = email.utils.parseaddr(settings.DEFAULT_FROM_EMAIL)
        from_name = from_name or 'BLEST'

        response = requests.post(
            'https://api.mailjet.com/v3.1/send',
            auth=(api_key, api_secret),
            json={
                'Messages': [{
                    'From': {'Email': from_email, 'Name': from_name},
                    'To': [{'Email': client.contact_email}],
                    'Subject': subject,
                    'HTMLPart': html_body,
                }]
            },
            timeout=30,
        )
        if not response.ok:
            self.stderr.write(f'  Mailjet error {response.status_code}: {response.text}')
            response.raise_for_status()

        self.stdout.write(f'  SENT → {client.contact_email} ({client.company_name})')
        return True
