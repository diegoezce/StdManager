from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import Organization, License

User = get_user_model()


def make_org(name='Test Org', org_status='active'):
    org = Organization.objects.create(
        name=name,
        license_number=f'LIC-{name[:5].upper()}',
        status=org_status,
        is_active=(org_status != 'inactive'),
    )
    return org


def make_license(org, days=90, license_type='free', license_status='active'):
    return License.objects.create(
        organization=org,
        type=license_type,
        valid_from=date.today(),
        valid_to=date.today() + timedelta(days=days),
        status=license_status,
    )


def make_user(email='owner@test.com', role='owner', org=None):
    u = User.objects.create_user(
        email=email,
        username=email.split('@')[0],
        password='testpass123',
        role=role,
        organization=org,
        is_active=True,
    )
    return u


class LicenseDaysRemainingTest(TestCase):
    def setUp(self):
        self.org = make_org()

    def test_days_remaining_positive(self):
        lic = make_license(self.org, days=90)
        self.assertEqual(lic.days_remaining, 90)

    def test_days_remaining_zero_when_expired(self):
        lic = License.objects.create(
            organization=self.org,
            type='free',
            valid_from=date.today() - timedelta(days=10),
            valid_to=date.today() - timedelta(days=1),
            status='expired',
        )
        self.assertEqual(lic.days_remaining, 0)

    def test_days_remaining_today_is_zero(self):
        lic = License.objects.create(
            organization=self.org,
            type='free',
            valid_from=date.today(),
            valid_to=date.today(),
            status='active',
        )
        self.assertEqual(lic.days_remaining, 0)

    def test_is_expired_false_when_future(self):
        lic = make_license(self.org, days=30)
        self.assertFalse(lic.is_expired)

    def test_is_expired_true_when_past(self):
        lic = License.objects.create(
            organization=self.org,
            type='free',
            valid_from=date.today() - timedelta(days=5),
            valid_to=date.today() - timedelta(days=1),
            status='expired',
        )
        self.assertTrue(lic.is_expired)


class CreateMyOrgTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(email='newuser@test.com', role='student', org=None)
        self.client.force_authenticate(user=self.user)

    def test_creates_org_and_license(self):
        response = self.client.post('/api/v1/organizations/create-my-org/', {'name': 'My School'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.organization)
        self.assertEqual(self.user.organization.name, 'My School')
        self.assertEqual(self.user.organization.status, 'trial')
        self.assertEqual(self.user.role, 'owner')

        lic = self.user.organization.license
        self.assertEqual(lic.type, 'free')
        self.assertEqual(lic.status, 'active')
        self.assertEqual(lic.valid_to, date.today() + timedelta(days=90))

    def test_returns_jwt_and_user(self):
        response = self.client.post('/api/v1/organizations/create-my-org/', {'name': 'My School'})
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'owner')
        self.assertEqual(response.data['user']['organization_status'], 'trial')
        self.assertEqual(response.data['user']['trial_days_remaining'], 90)

    def test_requires_name(self):
        response = self.client.post('/api/v1/organizations/create-my-org/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_rejects_if_already_has_org(self):
        org = make_org('Existing Org')
        self.user.organization = org
        self.user.save()

        response = self.client.post('/api/v1/organizations/create-my-org/', {'name': 'Another Org'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.post('/api/v1/organizations/create-my-org/', {'name': 'My School'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_name_returns_400(self):
        make_org('Taken Name')
        response = self.client.post('/api/v1/organizations/create-my-org/', {'name': 'Taken Name'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_license_number_starts_with_trial(self):
        self.client.post('/api/v1/organizations/create-my-org/', {'name': 'Trial School'})
        self.user.refresh_from_db()
        self.assertTrue(self.user.organization.license_number.startswith('TRIAL-'))


class UserSerializerTrialFieldsTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_me_returns_trial_fields_when_in_trial(self):
        org = make_org('Trial Org', org_status='trial')
        make_license(org, days=45)
        user = make_user(email='owner@trial.com', role='owner', org=org)
        self.client.force_authenticate(user=user)

        response = self.client.get('/api/v1/auth/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['organization_status'], 'trial')
        self.assertEqual(response.data['trial_days_remaining'], 45)

    def test_me_returns_none_when_no_org(self):
        user = make_user(email='noorg@test.com', role='student', org=None)
        self.client.force_authenticate(user=user)

        response = self.client.get('/api/v1/auth/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['organization_status'])
        self.assertIsNone(response.data['trial_days_remaining'])

    def test_me_returns_active_status_for_active_org(self):
        org = make_org('Active Org', org_status='active')
        make_license(org, days=365)
        user = make_user(email='owner@active.com', role='owner', org=org)
        self.client.force_authenticate(user=user)

        response = self.client.get('/api/v1/auth/users/me/')
        self.assertEqual(response.data['organization_status'], 'active')

    def test_license_serializer_includes_days_remaining(self):
        org = make_org('Org With License', org_status='trial')
        make_license(org, days=60)
        user = make_user(email='owner@lic.com', role='owner', org=org)
        self.client.force_authenticate(user=user)

        response = self.client.get(f'/api/v1/organizations/{org.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['license']['days_remaining'], 60)


class RequestOrgAccessTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = make_org('School A', org_status='active')
        self.owner = make_user(email='owner@school.com', role='owner', org=self.org)
        self.requester = make_user(email='new@gmail.com', role='student', org=None)
        self.client.force_authenticate(user=self.requester)

    def test_returns_owner_email_and_org_name(self):
        response = self.client.post('/api/v1/auth/request-org-access/', {'slug': self.org.slug})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['owner_email'], 'owner@school.com')
        self.assertEqual(response.data['org_name'], 'School A')

    def test_does_not_assign_org_to_requester(self):
        self.client.post('/api/v1/auth/request-org-access/', {'slug': self.org.slug})
        self.requester.refresh_from_db()
        self.assertIsNone(self.requester.organization)

    def test_rejects_if_user_already_has_org(self):
        other_org = make_org('Other Org')
        self.requester.organization = other_org
        self.requester.save()

        response = self.client.post('/api/v1/auth/request-org-access/', {'slug': self.org.slug})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_returns_none_owner_email_when_no_owner(self):
        org_no_owner = make_org('Orphan Org')
        response = self.client.post('/api/v1/auth/request-org-access/', {'slug': org_no_owner.slug})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['owner_email'])

    def test_404_for_unknown_slug(self):
        response = self.client.post('/api/v1/auth/request-org-access/', {'slug': 'no-such-org'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.post('/api/v1/auth/request-org-access/', {'slug': self.org.slug})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ApproveUserTest(TestCase):
    """Manager/owner assigns an existing Google user (no org) to their org."""

    def setUp(self):
        self.client = APIClient()
        self.org = make_org('My School')
        make_license(self.org)
        self.manager = make_user(email='manager@myschool.com', role='manager', org=self.org)
        self.waiting_user = make_user(email='waiting@gmail.com', role='student', org=None)
        self.client.force_authenticate(user=self.manager)

    def test_assigns_org_and_role(self):
        response = self.client.post(
            f'/api/v1/organizations/{self.org.slug}/approve-user/',
            {'email': 'waiting@gmail.com', 'role': 'teacher'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.waiting_user.refresh_from_db()
        self.assertEqual(self.waiting_user.organization, self.org)
        self.assertEqual(self.waiting_user.role, 'teacher')

    def test_user_appears_in_org_user_list_after_approval(self):
        self.client.post(
            f'/api/v1/organizations/{self.org.slug}/approve-user/',
            {'email': 'waiting@gmail.com', 'role': 'student'},
        )
        response = self.client.get('/api/v1/auth/users/')
        emails = [u['email'] for u in (response.data.get('results') or response.data)]
        self.assertIn('waiting@gmail.com', emails)

    def test_rejects_if_user_already_has_org(self):
        other_org = make_org('Other Org')
        self.waiting_user.organization = other_org
        self.waiting_user.save()
        response = self.client.post(
            f'/api/v1/organizations/{self.org.slug}/approve-user/',
            {'email': 'waiting@gmail.com', 'role': 'student'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_404_for_unknown_email(self):
        response = self.client.post(
            f'/api/v1/organizations/{self.org.slug}/approve-user/',
            {'email': 'nobody@gmail.com', 'role': 'student'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_cannot_approve(self):
        teacher = make_user(email='teacher@test.com', role='teacher', org=self.org)
        self.client.force_authenticate(user=teacher)
        response = self.client.post(
            f'/api/v1/organizations/{self.org.slug}/approve-user/',
            {'email': 'waiting@gmail.com', 'role': 'student'},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_approve_into_different_org(self):
        other_org = make_org('Other School')
        response = self.client.post(
            f'/api/v1/organizations/{other_org.slug}/approve-user/',
            {'email': 'waiting@gmail.com', 'role': 'student'},
        )
        # 404 because get_queryset scopes to own org (doesn't leak org existence)
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])


class InviteUserTest(TestCase):
    """Owner pre-creates a user by email so they can log in with Google."""

    def setUp(self):
        self.client = APIClient()
        self.org = make_org('My School')
        make_license(self.org)
        self.owner = make_user(email='owner@myschool.com', role='owner', org=self.org)
        self.client.force_authenticate(user=self.owner)

    def test_invite_creates_user_with_correct_org_and_role(self):
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'invited@gmail.com',
            'role': 'teacher',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        invited = User.objects.get(email='invited@gmail.com')
        self.assertEqual(invited.organization, self.org)
        self.assertEqual(invited.role, 'teacher')
        self.assertTrue(invited.is_active)

    def test_invited_user_has_no_last_login(self):
        self.client.post('/api/v1/auth/register/', {'email': 'pending@gmail.com', 'role': 'student'})
        pending = User.objects.get(email='pending@gmail.com')
        self.assertIsNone(pending.last_login)

    def test_invite_without_password_succeeds(self):
        """Password should be optional — system generates one so the user can later login via Google."""
        response = self.client.post('/api/v1/auth/register/', {
            'email': 'nopw@gmail.com',
            'role': 'admin',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_manager_can_invite(self):
        manager = make_user(email='manager@test.com', role='manager', org=self.org)
        self.client.force_authenticate(user=manager)
        response = self.client.post('/api/v1/auth/register/', {'email': 'invited_by_manager@gmail.com', 'role': 'student'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invited = User.objects.get(email='invited_by_manager@gmail.com')
        self.assertEqual(invited.organization, self.org)

    def test_non_admin_cannot_invite(self):
        student = make_user(email='student@test.com', role='student', org=self.org)
        self.client.force_authenticate(user=student)
        response = self.client.post('/api/v1/auth/register/', {'email': 'someone@gmail.com', 'role': 'student'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_email_rejected(self):
        make_user(email='existing@gmail.com', org=self.org)
        response = self.client.post('/api/v1/auth/register/', {'email': 'existing@gmail.com', 'role': 'student'})
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)
