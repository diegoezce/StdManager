from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.management import call_command
from io import StringIO

@api_view(['POST'])
@permission_classes([AllowAny])
def seed_database(request):
    """Endpoint to seed database (dev only)"""
    try:
        output = StringIO()
        call_command('seed', stdout=output)
        return Response({
            'status': 'success',
            'message': 'Database seeded successfully',
            'output': output.getvalue()
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=400)
