import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateUpdateSerializer
)
from apps.core.permissions import IsSuperAdmin, IsOwner, IsOwnerOrManager

User = get_user_model()
logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return User.objects.all()
        elif user.organization:
            return User.objects.filter(organization=user.organization)
        return User.objects.none()

    def get_permissions(self):
        if self.action in ['create']:
            return [IsAuthenticated(), IsOwnerOrManager()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrManager()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        user = self.get_object()
        role = request.data.get('role')

        if not role or role not in dict(User.ROLE_CHOICES):
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        user.role = role
        user.save()
        logger.info('Role updated for user %s → %s by %s', user.email, role, request.user.email)
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password') or User.objects.make_random_password(length=12)
        user.set_password(new_password)
        user.save()
        return Response({
            'id': user.id,
            'email': user.email,
            'temporary_password': new_password,
            'message': 'Password updated.',
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register(request):
    """Create a new user account (manager/owner only)."""
    requester = request.user
    if requester.role not in ['owner', 'manager', 'admin']:
        logger.warning('Forbidden register attempt by %s (role=%s)', requester.email, requester.role)
        return Response(
            {'error': 'Solo owners y managers pueden crear usuarios'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data.copy()
    email = data.get('email', '').strip()
    data['role'] = data.get('role', 'student')
    data['is_active'] = True

    # Generate unique username from email prefix
    base_username = email.split('@')[0] if email else 'user'
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f'{base_username}{counter}'
        counter += 1
    data['username'] = username

    serializer = UserCreateUpdateSerializer(data=data)
    if not serializer.is_valid():
        logger.warning('Register validation failed for %s: %s', email, serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Pass organization directly so the read_only field in serializer doesn't drop it
        user_obj = serializer.save(organization=requester.organization)

        if data.get('role') == 'teacher':
            from apps.blast.models import Teacher
            Teacher.objects.get_or_create(
                user=user_obj,
                defaults={
                    'organization': requester.organization,
                    'specializations': [],
                },
            )

        if data.get('role') == 'student':
            from apps.blast.models import Student, CorporateClient
            corporate_client = None
            if data.get('corporate_client'):
                try:
                    corporate_client = CorporateClient.objects.get(
                        id=data['corporate_client'],
                        organization=requester.organization,
                    )
                except CorporateClient.DoesNotExist:
                    logger.warning('CorporateClient %s not found for org %s', data['corporate_client'], requester.organization)
            Student.objects.create(
                user=user_obj,
                organization=requester.organization,
                english_level=data.get('english_level', 'beginner'),
                corporate_client=corporate_client,
            )

        logger.info('User created: %s (role=%s) by %s', user_obj.email, user_obj.role, requester.email)
        return Response(UserSerializer(user_obj).data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error('Register failed for %s: %s', email, e, exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
