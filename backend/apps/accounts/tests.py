from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from apps.organizations.models import Organization, License

User = get_user_model()


def make_org(name='Test Org', org_status='active'):
    org = Organization.objects.create(
        name=name,
        license_number=f'LIC-{name[:6].upper().replace(" ", "")}',
        status=org_status,
        is_active=(org_status != 'inactive'),
    )
    return org


def make_license(org, days=90):
    return License.objects.create(
        organization=org,
        type='free',
        valid_from=date.today(),
        valid_to=date.today() + timedelta(days=days),
        status='active',
    )


def make_user(email='user@test.com', role='student', org=None, first_name='', last_name=''):
    return User.objects.create_user(
        email=email,
        username=email.split('@')[0],
        password='testpass123',
        role=role,
        organization=org,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
    )


MOCK_GOOGLE_INFO = {
    'email': 'newuser@gmail.com',
    'email_verified': True,
    'given_name': 'Ana',
    'family_name': 'García',
}


class GoogleLoginTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_new_user_created_with_student_role(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_INFO
        response = self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user = User.objects.get(email='newuser@gmail.com')
        self.assertEqual(user.role, 'student')
        self.assertEqual(user.first_name, 'Ana')
        self.assertIsNone(user.organization)

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_returns_jwt_tokens(self, mock_verify):
        mock_verify.return_value = MOCK_GOOGLE_INFO
        response = self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_existing_user_returned_with_org_intact(self, mock_verify):
        """Pre-invited user logs in with Google → keeps their org and role."""
        org = make_org('My School')
        make_license(org)
        existing = make_user(email='newuser@gmail.com', role='teacher', org=org)

        mock_verify.return_value = MOCK_GOOGLE_INFO
        response = self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], 'teacher')
        self.assertIsNotNone(response.data['user']['organization_id'])

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_google_login_fills_name_for_pre_invited_user(self, mock_verify):
        """If user was pre-created without name, Google login fills it in."""
        make_user(email='newuser@gmail.com', role='teacher', first_name='', last_name='')
        mock_verify.return_value = MOCK_GOOGLE_INFO

        self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})

        user = User.objects.get(email='newuser@gmail.com')
        self.assertEqual(user.first_name, 'Ana')
        self.assertEqual(user.last_name, 'García')

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_google_login_sets_last_login(self, mock_verify):
        """last_login is updated on Google login so pending badge disappears."""
        make_user(email='newuser@gmail.com', role='student')
        mock_verify.return_value = MOCK_GOOGLE_INFO

        self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})

        user = User.objects.get(email='newuser@gmail.com')
        self.assertIsNotNone(user.last_login)

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_unverified_email_rejected(self, mock_verify):
        mock_verify.return_value = {**MOCK_GOOGLE_INFO, 'email_verified': False}
        response = self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_invalid_token_rejected(self, mock_verify):
        mock_verify.side_effect = ValueError('bad token')
        response = self.client.post('/api/v1/auth/google/', {'credential': 'bad-token'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_token_rejected(self):
        response = self.client.post('/api/v1/auth/google/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.accounts.social_auth.id_token.verify_oauth2_token')
    def test_user_with_org_gets_trial_fields_in_response(self, mock_verify):
        org = make_org('Trial School', org_status='trial')
        make_license(org, days=90)
        make_user(email='newuser@gmail.com', role='owner', org=org)

        mock_verify.return_value = MOCK_GOOGLE_INFO
        response = self.client.post('/api/v1/auth/google/', {'credential': 'fake-token'})
        self.assertEqual(response.data['user']['organization_status'], 'trial')
        self.assertEqual(response.data['user']['trial_days_remaining'], 90)


class SelectOrganizationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = make_org('School B', org_status='active')
        self.user = make_user(email='user@test.com', role='student', org=None)
        self.client.force_authenticate(user=self.user)

    def test_assigns_org_and_returns_jwt(self):
        response = self.client.post('/api/v1/auth/select-organization/', {'slug': self.org.slug})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.organization, self.org)
        self.assertIn('access', response.data)

    def test_inactive_org_rejected(self):
        inactive = make_org('Inactive Org', org_status='inactive')
        response = self.client.post('/api/v1/auth/select-organization/', {'slug': inactive.slug})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_slug_rejected(self):
        response = self.client.post('/api/v1/auth/select-organization/', {'slug': 'does-not-exist'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requires_auth(self):
        self.client.logout()
        response = self.client.post('/api/v1/auth/select-organization/', {'slug': self.org.slug})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
