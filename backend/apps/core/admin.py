from django.contrib import admin
from apps.core.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'resource_type', 'user', 'organization', 'created_at')
    list_filter = ('action', 'resource_type', 'created_at')
    search_fields = ('user__email', 'resource_type')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-created_at',)
