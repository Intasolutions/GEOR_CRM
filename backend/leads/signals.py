from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Lead, LeadAuditLog, Activity
from django.utils import timezone

@receiver(pre_save, sender=Lead)
def track_lead_changes(sender, instance, **kwargs):
    if instance.id:
        try:
            old_instance = Lead.objects.get(id=instance.id)
            
            # Check for stage change
            if old_instance.stage != instance.stage:
                LeadAuditLog.objects.create(
                    lead=instance,
                    action="Stage Changed",
                    old_value=str(old_instance.stage) if old_instance.stage else "None",
                    new_value=str(instance.stage) if instance.stage else "None"
                )
            
            # Check for deal value change
            if old_instance.deal_value != instance.deal_value:
                LeadAuditLog.objects.create(
                    lead=instance,
                    action="Deal Value Updated",
                    old_value=str(old_instance.deal_value),
                    new_value=str(instance.deal_value)
                )

            # Check for assignment change
            if old_instance.assigned_to != instance.assigned_to:
                LeadAuditLog.objects.create(
                    lead=instance,
                    action="Assignment Updated",
                    old_value=str(old_instance.assigned_to) if old_instance.assigned_to else "None",
                    new_value=str(instance.assigned_to) if instance.assigned_to else "None"
                )
        except Lead.DoesNotExist:
            pass

@receiver(post_save, sender=Lead)
def calculate_lead_score(sender, instance, created, **kwargs):
    # Avoid recursion using update()
    score = 0
    if instance.email: score += 10
    if instance.phone: score += 10
    if instance.company: score += 5
    if instance.deal_value > 50000: score += 30
    elif instance.deal_value > 10000: score += 15
    
    if instance.stage:
        if instance.stage.probability >= 80: score += 40
        elif instance.stage.probability >= 50: score += 20
        elif instance.stage.probability >= 20: score += 10

    # Only one update call to avoid triggers
    Lead.objects.filter(id=instance.id).update(lead_score=score)
