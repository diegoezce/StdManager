from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CorporateClientViewSet, TeacherViewSet, StudentViewSet,
    GroupViewSet, EnrollmentViewSet, AttendanceViewSet,
    EvaluationViewSet, CertificateViewSet,
    attendance_report, students_report, groups_report
)

router = DefaultRouter()
router.register(r'corporate-clients', CorporateClientViewSet, basename='corporate-client')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'evaluations', EvaluationViewSet, basename='evaluation')
router.register(r'certificates', CertificateViewSet, basename='certificate')

urlpatterns = [
    path('', include(router.urls)),
    path('reports/attendance/', attendance_report, name='attendance-report'),
    path('reports/students/', students_report, name='students-report'),
    path('reports/groups/', groups_report, name='groups-report'),
]
