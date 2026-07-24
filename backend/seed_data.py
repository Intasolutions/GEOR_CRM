import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.models import LeadStage
from django.contrib.auth.models import User

def seed():
    # Create Superuser if not exists
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        print("Superuser created: admin / admin123")

    # Initial Lead Stages
    stages = [
        ('New Lead', '#3b82f6', 1, False),
        ('Contacted', '#8b5cf6', 2, False),
        ('Qualified', '#10b981', 3, False),
        ('Follow-up', '#f59e0b', 4, False),
        ('Proposal Sent', '#6366f1', 5, False),
        ('Negotiation', '#f43f5e', 6, False),
        ('Closed Won', '#22c55e', 7, True),
        ('Closed Lost', '#ef4444', 8, True),
    ]

    for name, color, order, is_final in stages:
        stage, created = LeadStage.objects.get_or_create(
            name=name,
            defaults={'color': color, 'order': order, 'is_final': is_final}
        )
        if created:
            print(f"Created stage: {name}")

if __name__ == '__main__':
    seed()
