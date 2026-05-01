from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'super_admin'


class IsOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'owner'


class IsOwnerOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['owner', 'manager']


class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'teacher'


class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'student'


class IsCorporateClient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'corporate_client'


class SameOrganization(permissions.BasePermission):
    """Check if user belongs to the same organization"""
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'organization_id'):
            return obj.organization_id == request.user.organization_id
        elif hasattr(obj, 'organization'):
            return obj.organization.id == request.user.organization_id
        return False
