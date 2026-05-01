from django.urls import path, include

urlpatterns = [
    path('auth/', include('apps.accounts.urls')),
    path('organizations/', include('apps.organizations.urls')),
    path('', include('apps.blast.urls')),
]
