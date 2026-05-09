from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    organization_id = serializers.StringRelatedField(source='organization.id', read_only=True)
    organization_name = serializers.SerializerMethodField()
    organization_slug = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'organization_id', 'organization_name', 'organization_slug', 'brand_name', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization else ''

    def get_organization_slug(self, obj):
        return obj.organization.slug if obj.organization else ''

    def get_brand_name(self, obj):
        return obj.organization.brand_name if obj.organization else ''


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'password', 'role', 'organization', 'is_active', 'username')
        read_only_fields = ('id', 'organization', 'username')

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        email = validated_data.get('email', '')

        # Ensure username exists (required by CustomUser)
        if 'username' not in validated_data or not validated_data.get('username'):
            validated_data['username'] = email.split('@')[0]

        # Use create_user which handles password properly
        if password:
            user = User.objects.create_user(password=password, **validated_data)
        else:
            # Create with random password
            random_pass = User.objects.make_random_password()
            user = User.objects.create_user(password=random_pass, **validated_data)

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
