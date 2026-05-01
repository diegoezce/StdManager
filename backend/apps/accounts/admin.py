from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'organization', 'is_active')
    list_filter = ('role', 'is_active', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Organization & Role', {'fields': ('organization', 'role')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
