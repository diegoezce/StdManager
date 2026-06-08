import logging
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import serializers as drf_serializers

from .models import Organization, License
from .serializers import (
    OrganizationSerializer,
    OrganizationSummarySerializer,
    OrganizationCreateUpdateSerializer,
    LicenseSerializer,
    LicenseUpdateSerializer,
    TransferOwnershipSerializer,
)
from apps.core.permissions import IsSuperAdmin, IsOwner, IsAdmin

logger = logging.getLogger(__name__)


class PublicOrganizationSerializer(drf_serializers.ModelSerializer):
    """Minimal org info for the post-login selection screen."""
    class Meta:
        model = Organization
        fields = ('id', 'name', 'brand_name', 'slug')


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrganizationCreateUpdateSerializer
        if self.action == 'list' and self.request.user.role == 'super_admin':
            return OrganizationSummarySerializer
        if self.action == 'public_list':
            return PublicOrganizationSerializer
        return OrganizationSerializer

    def get_permissions(self):
        if self.action == 'public_list':
            return [AllowAny()]
        if self.action in ['create', 'update_status', 'update_license']:
            return [IsSuperAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [(IsAdmin | IsSuperAdmin)()]
        elif self.action in ['destroy', 'create_owner', 'assign_owner']:
            return [IsSuperAdmin()]
        elif self.action == 'transfer_ownership':
            return [(IsOwner | IsSuperAdmin)()]
        elif self.action in ['approve_user', 'pending_users']:
            return [(IsAdmin | IsSuperAdmin)()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='public')
    def public_list(self, request):
        """Public endpoint listing active organizations (for org selection screen)."""
        orgs = Organization.objects.filter(is_active=True)
        serializer = self.get_serializer(orgs, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Organization.objects.annotate(
                user_count=Count('users', filter=Q(users__is_active=True), distinct=True),
                student_count=Count('student_objects', distinct=True),
                teacher_count=Count('teacher_objects', distinct=True),
                group_count=Count('group_objects', distinct=True),
            ).select_related('license').all()
        elif user.organization:
            return Organization.objects.filter(id=user.organization_id).select_related('license')
        return Organization.objects.none()

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
        from apps.blast.models import Student, Teacher, Group

        return Response({
            'users': organization.users.filter(is_active=True).count(),
            'students': Student.objects.filter(organization=organization, is_active=True).count(),
            'teachers': Teacher.objects.filter(organization=organization).count(),
            'groups': Group.objects.filter(organization=organization, status='active').count(),
        })

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, slug=None):
        """Super admin only: change org status."""
        organization = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Organization.STATUS_CHOICES]
        if not new_status or new_status not in valid_statuses:
            return Response(
                {'error': f'Estado inválido. Opciones: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = organization.status
        organization.status = new_status
        organization.is_active = new_status == 'active'
        organization.save(update_fields=['status', 'is_active'])
        logger.info('Org %s status changed %s → %s by %s', organization.slug, old_status, new_status, request.user.email)
        return Response(OrganizationSerializer(organization).data)

    @action(detail=True, methods=['patch'], url_path='update-license')
    def update_license(self, request, slug=None):
        """Super admin only: update license plan and limits."""
        organization = self.get_object()
        license_obj = getattr(organization, 'license', None)
        if license_obj:
            serializer = LicenseUpdateSerializer(license_obj, data=request.data, partial=True)
        else:
            serializer = LicenseUpdateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if license_obj:
            license_obj = serializer.save()
        else:
            license_obj = serializer.save(organization=organization)

        logger.info('License updated for org %s by %s', organization.slug, request.user.email)
        return Response(LicenseSerializer(license_obj).data)

    @action(detail=True, methods=['post'], url_path='create-owner')
    def create_owner(self, request, slug=None):
        """Super admin only: create the first owner user for an organization."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        organization = self.get_object()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()

        if not email or not password:
            return Response({'error': 'email y password son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_owner = organization.users.filter(role='owner', is_active=True).first()
        if existing_owner:
            return Response(
                {'error': f'La organización ya tiene owner ({existing_owner.email}). Usa transferencia de ownership.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'Ya existe un usuario con ese email.'}, status=status.HTTP_400_BAD_REQUEST)

        base_username = email.split('@')[0] or 'owner'
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{counter}'
            counter += 1

        user = User.objects.create(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            role='owner',
            is_active=True,
            organization=organization,
        )
        user.set_password(password)
        user.save()
        logger.info('Owner %s created for org %s by %s', user.email, organization.slug, request.user.email)
        return Response({
            'id': str(user.id),
            'email': user.email,
            'role': user.role,
            'organization': organization.slug,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='assign-owner')
    def assign_owner(self, request, slug=None):
        """Super admin only: assign an existing user as owner of this org.

        Moves the user to this organization if needed, demotes the current
        owner to manager (if any), and promotes the target user to owner.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()

        organization = self.get_object()
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'error': 'No existe un usuario con ese email.'}, status=status.HTTP_404_NOT_FOUND)

        if target.role == 'super_admin':
            return Response({'error': 'No se puede asignar a un super admin como owner.'}, status=status.HTTP_400_BAD_REQUEST)
        if not target.is_active:
            return Response({'error': 'El usuario está inactivo.'}, status=status.HTTP_400_BAD_REQUEST)

        current_owner = organization.users.filter(role='owner', is_active=True).first()
        if current_owner and current_owner.id == target.id:
            return Response({'error': 'Ese usuario ya es owner de la organización.'}, status=status.HTTP_400_BAD_REQUEST)

        old_org_id = target.organization_id
        if current_owner:
            current_owner.role = 'manager'
            current_owner.save(update_fields=['role'])

        target.organization = organization
        target.role = 'owner'
        target.save(update_fields=['organization', 'role'])
        logger.info(
            'Owner of org %s assigned to %s (moved from org_id=%s) by %s',
            organization.slug, target.email, old_org_id, request.user.email,
        )
        return Response({
            'id': str(target.id),
            'email': target.email,
            'role': target.role,
            'organization': organization.slug,
            'previous_organization_id': str(old_org_id) if old_org_id else None,
            'demoted_previous_owner': current_owner.email if current_owner else None,
        })

    @action(detail=True, methods=['get'], url_path='pending-users')
    def pending_users(self, request, slug=None):
        """List users who requested access to this org and are still waiting."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        from apps.accounts.serializers import UserSerializer

        organization = self.get_object()

        if request.user.role != 'super_admin' and request.user.organization_id != organization.id:
            return Response({'error': 'No tienes acceso a esta organización.'}, status=status.HTTP_403_FORBIDDEN)

        pending = User.objects.filter(
            requested_organization=organization,
            organization__isnull=True,
            is_active=True,
        )
        return Response(UserSerializer(pending, many=True).data)

    @action(detail=True, methods=['post'], url_path='approve-user')
    def approve_user(self, request, slug=None):
        """Owner/manager/admin: assign an existing Google user (no org yet) to this org."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        from apps.accounts.serializers import UserSerializer

        organization = self.get_object()

        # Non-super-admins can only approve into their own org
        if request.user.role != 'super_admin' and request.user.organization_id != organization.id:
            return Response({'error': 'No tienes acceso a esta organización.'}, status=status.HTTP_403_FORBIDDEN)

        email = (request.data.get('email') or '').strip().lower()
        role = (request.data.get('role') or 'student').strip()

        if not email:
            return Response({'error': 'El email es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_roles = [r[0] for r in User.ROLE_CHOICES if r[0] not in ('super_admin', 'owner')]
        if role not in valid_roles:
            return Response({'error': f'Rol inválido. Opciones: {valid_roles}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'error': 'No existe ningún usuario con ese email. Usá "Invitar con Google" para usuarios nuevos.'}, status=status.HTTP_404_NOT_FOUND)

        if user.organization_id:
            return Response({'error': f'Este usuario ya pertenece a una organización ({user.organization}).'}, status=status.HTTP_400_BAD_REQUEST)

        user.organization = organization
        user.role = role
        user.requested_organization = None
        user.save(update_fields=['organization', 'role', 'requested_organization'])

        logger.info('User %s approved into org %s with role %s by %s', user.email, organization.slug, role, request.user.email)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='create-my-org')
    def create_my_org(self, request):
        """Any authenticated user without an org can self-create one (90-day free trial)."""
        import uuid
        from datetime import timedelta
        from django.utils import timezone
        from rest_framework_simplejwt.tokens import RefreshToken
        from apps.accounts.serializers import UserSerializer

        user = request.user
        if user.organization_id:
            return Response({'error': 'Ya perteneces a una organización.'}, status=status.HTTP_400_BAD_REQUEST)

        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'El nombre de la organización es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        license_number = f'TRIAL-{uuid.uuid4().hex[:10].upper()}'
        try:
            org = Organization.objects.create(
                name=name,
                license_number=license_number,
                status='trial',
                is_active=True,
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        License.objects.create(
            organization=org,
            type='free',
            max_students=50,
            max_teachers=5,
            max_groups=10,
            valid_from=today,
            valid_to=today + timedelta(days=90),
            status='active',
        )

        user.organization = org
        user.role = 'owner'
        user.save(update_fields=['organization', 'role'])

        logger.info('Self-service org "%s" created by %s', org.slug, user.email)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='transfer-ownership')
    def transfer_ownership(self, request, slug=None):
        """Owner or super admin: transfer ownership to another user in the same org."""
        organization = self.get_object()
        # Super admin can transfer any org; owner must belong to this org
        if request.user.role == 'owner' and request.user.organization_id != organization.id:
            return Response({'error': 'No tienes acceso a esta organización.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TransferOwnershipSerializer(data=request.data, context={'organization': organization})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        current_owner = organization.users.filter(role='owner', is_active=True).first()
        new_owner = serializer.save(current_owner=current_owner)
        logger.info('Ownership of %s transferred to %s by %s', organization.slug, new_owner.email, request.user.email)
        return Response({'detail': f'Ownership transferido a {new_owner.email}.'})
