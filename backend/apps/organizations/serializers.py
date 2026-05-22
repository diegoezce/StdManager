from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Organization, License

User = get_user_model()


class LicenseSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = License
        fields = ('id', 'type', 'max_students', 'max_teachers', 'max_groups', 'valid_from', 'valid_to', 'status', 'is_expired', 'created_at')
        read_only_fields = ('id', 'created_at')


class LicenseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = ('type', 'max_students', 'max_teachers', 'max_groups', 'valid_from', 'valid_to', 'status')


class OrganizationSerializer(serializers.ModelSerializer):
    license = LicenseSerializer(read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ('id', 'name', 'brand_name', 'slug', 'license_number', 'status', 'max_users', 'is_active', 'license', 'user_count', 'created_at')
        read_only_fields = ('id', 'slug', 'created_at')

    def get_user_count(self, obj):
        return obj.users.filter(is_active=True).count()


class OrganizationSummarySerializer(serializers.ModelSerializer):
    """For super admin list view — includes aggregated counts."""
    license = LicenseSerializer(read_only=True)
    user_count = serializers.IntegerField(read_only=True, default=0)
    student_count = serializers.IntegerField(read_only=True, default=0)
    teacher_count = serializers.IntegerField(read_only=True, default=0)
    group_count = serializers.IntegerField(read_only=True, default=0)
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = (
            'id', 'name', 'brand_name', 'slug', 'license_number', 'status',
            'max_users', 'is_active', 'license', 'user_count', 'student_count',
            'teacher_count', 'group_count', 'owner_email', 'created_at',
        )
        read_only_fields = ('id', 'slug', 'created_at')

    def get_owner_email(self, obj):
        owner = obj.users.filter(role='owner', is_active=True).first()
        return owner.email if owner else None


class OrganizationCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('name', 'brand_name', 'license_number', 'status', 'max_users', 'is_active')


class TransferOwnershipSerializer(serializers.Serializer):
    new_owner_id = serializers.UUIDField()

    def validate_new_owner_id(self, value):
        organization = self.context.get('organization')
        try:
            user = User.objects.get(id=value, organization=organization, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError('Usuario no encontrado en esta organización.')
        if user.role == 'super_admin':
            raise serializers.ValidationError('No se puede transferir a un super admin.')
        self._new_owner = user
        return value

    def save(self, current_owner):
        new_owner = self._new_owner
        # Demote current owner to manager, promote new owner
        current_owner.role = 'manager'
        current_owner.save(update_fields=['role'])
        new_owner.role = 'owner'
        new_owner.save(update_fields=['role'])
        return new_owner
