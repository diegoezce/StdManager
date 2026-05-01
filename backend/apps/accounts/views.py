from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateUpdateSerializer
)
from apps.core.permissions import IsSuperAdmin, IsOwner

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
            return [IsSuperAdmin() | IsOwner()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsSuperAdmin() | IsOwner()]
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
