from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import CustomTokenObtainPairView, UserViewSet, register
from .social_auth import google_login, select_organization, request_org_access

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', register, name='register'),
    path('google/', google_login, name='google_login'),
    path('select-organization/', select_organization, name='select_organization'),
    path('request-org-access/', request_org_access, name='request_org_access'),
    path('', include(router.urls)),
]
