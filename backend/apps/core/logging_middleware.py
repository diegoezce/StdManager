import logging
import json
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('django.request')


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log HTTP requests with detailed information"""

    def process_request(self, request):
        request._start_time = __import__('time').time()
        return None

    def process_response(self, request, response):
        if hasattr(request, '_start_time'):
            duration = __import__('time').time() - request._start_time
        else:
            duration = 0

        user = getattr(request, 'user', None)
        user_info = f"user:{user.id}" if user and user.is_authenticated else "anonymous"

        # Log request details
        log_msg = (
            f"{request.method} {request.path} | "
            f"status:{response.status_code} | "
            f"duration:{duration:.2f}s | "
            f"{user_info}"
        )

        if response.status_code >= 400:
            logger.error(log_msg)
        else:
            logger.info(log_msg)

        return response

    def process_exception(self, request, exception):
        user = getattr(request, 'user', None)
        user_info = f"user:{user.id}" if user and user.is_authenticated else "anonymous"
        logger.error(
            f"EXCEPTION: {request.method} {request.path} | {user_info} | {exception.__class__.__name__}: {str(exception)}",
            exc_info=True
        )
        return None
