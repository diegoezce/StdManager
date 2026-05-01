from rest_framework import serializers
from .models import Organization, License


class LicenseSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = License
        fields = ('id', 'type', 'max_students', 'max_teachers', 'max_groups', 'valid_from', 'valid_to', 'status', 'is_expired', 'created_at')
        read_only_fields = ('id', 'created_at')


class OrganizationSerializer(serializers.ModelSerializer):
    license = LicenseSerializer(read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ('id', 'name', 'slug', 'license_number', 'status', 'max_users', 'is_active', 'license', 'user_count', 'created_at')
        read_only_fields = ('id', 'slug', 'created_at')

    def get_user_count(self, obj):
        return obj.users.filter(is_active=True).count()


class OrganizationCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('name', 'license_number', 'status', 'max_users', 'is_active')
