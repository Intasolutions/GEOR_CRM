import os
import django
import sys

# Setup Django
sys.path.append(r'c:\Users\91811\Downloads\INTA ERP\INTA_CRM\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from leads.models import Lead, LeadStage

print("Available Stages:")
for stage in LeadStage.objects.all().order_by('order'):
    print(f"[{stage.id}] {stage.name}")

print("\nRecent Leads:")
for lead in Lead.objects.all().order_by('-updated_at')[:10]:
    try:
        stage_name = lead.stage.name if lead.stage else 'None'
        print(f"Lead ID {lead.id:2} | Status: {stage_name:15} | Name: {lead.name:20} | Updated: {lead.updated_at}")
    except Exception as e:
        print(f"Error reading lead {lead.id}: {str(e)}")
