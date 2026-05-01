from django.contrib import admin
from .models import Organization, License


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'status', 'license_number', 'is_active', 'created_at')
    list_filter = ('status', 'is_active', 'created_at')
    search_fields = ('name', 'license_number')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ('organization', 'type', 'status', 'valid_from', 'valid_to', 'is_expired')
    list_filter = ('type', 'status', 'created_at')
    search_fields = ('organization__name',)
    readonly_fields = ('id', 'created_at', 'updated_at')
