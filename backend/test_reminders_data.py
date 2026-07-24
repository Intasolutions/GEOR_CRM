import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.models import Lead, LeadStage, Reminder, User

def test_data():
    # 1. Get or create a superuser
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        print("Created superuser for testing.")

    # 2. Get stages
    new_stage = LeadStage.objects.filter(name='New Lead').first()
    contacted_stage = LeadStage.objects.filter(name='Contacted').first()
    won_stage = LeadStage.objects.filter(name='Closed Won').first()

    if not new_stage or not contacted_stage or not won_stage:
        print("Required stages not found. Run seed_data.py first.")
        return

    now = timezone.now()

    # Case 1: AT-RISK - Not final, contacted, NO pending reminder
    # Should show AMBER/WARNING
    l1 = Lead.objects.create(
        name="Test At-Risk Lead (Should be Amber)",
        email="atrisk@example.com",
        phone="1234567890",
        stage=contacted_stage,
        last_contacted_at=now - timedelta(days=1),
        last_contacted_by=user,
        assigned_to=user
    )
    print(f"Created At-Risk Lead: {l1.id}")

    # Case 2: HEALTHY - Not final, contacted, HAS pending reminder
    # Should NOT show amber/warning
    l2 = Lead.objects.create(
        name="Test Healthy Lead (Not Amber)",
        email="healthy@example.com",
        phone="1234567891",
        stage=contacted_stage,
        last_contacted_at=now - timedelta(days=1),
        last_contacted_by=user,
        assigned_to=user
    )
    # Add pending reminder
    Reminder.objects.create(
        lead=l2,
        user=user,
        note="Future follow-up",
        scheduled_at=now + timedelta(days=2),
        status='pending'
    )
    print(f"Created Healthy Lead: {l2.id}")

    # Case 3: NEW - Not final, NO last contact
    # Should NOT show amber/warning
    l3 = Lead.objects.create(
        name="Test New Lead (Not Amber)",
        email="new@example.com",
        phone="1234567892",
        stage=new_stage,
        assigned_to=user
    )
    print(f"Created New Lead: {l3.id}")

    # Case 4: WON - Final stage, has last contact, NO pending reminder
    # Should NOT show amber/warning
    l4 = Lead.objects.create(
        name="Test Won Lead (Not Amber)",
        email="won@example.com",
        phone="1234567893",
        stage=won_stage,
        last_contacted_at=now - timedelta(days=1),
        last_contacted_by=user,
        assigned_to=user
    )
    print(f"Created Won Lead: {l4.id}")

if __name__ == '__main__':
    test_data()
