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
            return Response(
                {'error': 'Invalid role'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.role = role
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = User.objects.make_random_password(length=12)
        user.set_password(new_password)
        user.save()
        return Response({
            'id': user.id,
            'email': user.email,
            'temporary_password': new_password,
            'message': 'Password has been reset. Share this temporary password with the user.'
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register(request):
    """Create a new student account (manager/owner only)"""
    user = request.user
    if user.role not in ['owner', 'manager']:
        return Response(
            {'error': 'Only owners and managers can create users'},
            status=status.HTTP_403_FORBIDDEN
        )

    data = request.data.copy()
    email = data.get('email', '')

    # Auto-generate username from email if not provided
    if not data.get('username'):
        data['username'] = email.split('@')[0]

    data['organization'] = user.organization.id
    data['role'] = data.get('role', 'student')
    data['is_active'] = True

    serializer = UserCreateUpdateSerializer(data=data)
    if serializer.is_valid():
        try:
            user_obj = serializer.save()

            # If creating a student role, create the Student profile
            if data.get('role') == 'student':
                from apps.blast.models import Student
                Student.objects.create(
                    user=user_obj,
                    organization=user.organization,
                    english_level=data.get('english_level', 'beginner')
                )

            return Response(
                UserSerializer(user_obj).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
