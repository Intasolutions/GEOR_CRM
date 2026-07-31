import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from leads.views import LeadViewSet
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import User
factory = APIRequestFactory()
request = factory.get('/api/leads/?exclude_final=true&no_pagination=true')
user = User.objects.first()
if user:
    from rest_framework.request import Request
    request.user = user
    view = LeadViewSet()
    view.request = Request(request)
    view.format_kwarg = None
    try:
        qs = view.get_queryset()
        print('Queryset count:', qs.count())
    except Exception as e:
        import traceback
        traceback.print_exc()
