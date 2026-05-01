from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Organization, License
from .serializers import OrganizationSerializer, OrganizationCreateUpdateSerializer, LicenseSerializer
from apps.core.permissions import IsSuperAdmin, IsOwner


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrganizationCreateUpdateSerializer
        return OrganizationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Organization.objects.all()
        elif user.organization:
            return Organization.objects.filter(id=user.organization_id)
        return Organization.objects.none()

    def get_permissions(self):
        if self.action in ['create']:
            return [IsSuperAdmin()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsSuperAdmin() | IsOwner()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def license(self, request, slug=None):
        organization = self.get_object()
        license_obj = getattr(organization, 'license', None)
        if license_obj:
            return Response(LicenseSerializer(license_obj).data)
        return Response({'detail': 'No license found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def stats(self, request, slug=None):
        organization = self.get_object()
        from django.db.models import Count
        from apps.blast.models import Student, Teacher, Group

        stats = {
            'users': organization.users.filter(is_active=True).count(),
            'students': Student.objects.filter(organization=organization).count(),
            'teachers': Teacher.objects.filter(organization=organization).count(),
            'groups': Group.objects.filter(organization=organization).count(),
        }
        return Response(stats)
