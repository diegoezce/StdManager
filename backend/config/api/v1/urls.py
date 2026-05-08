from django.urls import path, include
from apps.core.views import seed_database

urlpatterns = [
    path('auth/', include('apps.accounts.urls')),
    path('organizations/', include('apps.organizations.urls')),
    path('seed/', seed_database, name='seed-database'),
    path('', include('apps.blast.urls')),
]
