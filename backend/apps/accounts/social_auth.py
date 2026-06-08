import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    token = request.data.get('credential') or request.data.get('id_token')
    if not token:
        return Response({'error': 'Token es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        id_info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        email = id_info.get('email')
        if not email:
            return Response({'error': 'Google no proporcionó un email.'}, status=status.HTTP_400_BAD_REQUEST)

        if not id_info.get('email_verified', False):
            return Response({'error': 'El email de Google no está verificado.'}, status=status.HTTP_403_FORBIDDEN)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': id_info.get('given_name', ''),
                'last_name': id_info.get('family_name', ''),
                'role': 'student',
                'is_active': True,
            }
        )

        from django.utils import timezone
        now = timezone.now()

        if created:
            logger.info('New user created via Google OAuth: %s', email)
            user.last_login = now
            user.save(update_fields=['last_login'])
        else:
            # Fill in name from Google if the user was pre-created without it
            update_fields = ['last_login']
            user.last_login = now
            if not user.first_name and id_info.get('given_name'):
                user.first_name = id_info['given_name']
                update_fields.append('first_name')
            if not user.last_name and id_info.get('family_name'):
                user.last_name = id_info['family_name']
                update_fields.append('last_name')
            user.save(update_fields=update_fields)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.warning('Invalid Google token: %s', e)
        return Response({'error': 'Token de Google inválido o expirado.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_org_access(request):
    """Return the owner email of the selected organization so the frontend can open a mailto link."""
    from apps.organizations.models import Organization

    slug = request.data.get('slug', '').strip()
    if not slug:
        return Response({'error': 'Slug de organización es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(slug=slug, is_active=True)
    except Organization.DoesNotExist:
        return Response({'error': 'Organización no encontrada o inactiva.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user.organization_id:
        return Response({'error': 'Ya perteneces a una organización.'}, status=status.HTTP_400_BAD_REQUEST)

    owner = org.users.filter(role='owner', is_active=True).first()
    owner_email = owner.email if owner else None

    request.user.requested_organization = org
    request.user.save(update_fields=['requested_organization'])
    logger.info('Access request for org %s by %s', org.slug, request.user.email)

    return Response({
        'org_name': org.brand_name or org.name,
        'owner_email': owner_email,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def select_organization(request):
    """Assign an organization to the authenticated user (post-login selection)."""
    from apps.organizations.models import Organization

    slug = request.data.get('slug', '').strip()
    if not slug:
        return Response({'error': 'Slug de organización es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        org = Organization.objects.get(slug=slug, is_active=True)
    except Organization.DoesNotExist:
        return Response({'error': 'Organización no encontrada o inactiva.'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    user.organization = org
    user.save(update_fields=['organization'])

    logger.info('User %s selected organization %s', user.email, org.slug)

    # Return updated user with JWT
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)
