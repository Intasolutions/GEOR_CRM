from .models import Workflow, WorkflowLog, Activity, Lead, Reminder, LeadStage
from django.contrib.auth.models import User
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def process_workflows(lead, trigger_type, trigger_value=None, user=None):
    """
    Check and execute workflows based on a trigger.
    """
    workflows = Workflow.objects.filter(trigger_type=trigger_type, is_active=True)
    
    # If trigger_value is provided, it must match or be None in the workflow
    if trigger_value:
        from django.db.models import Q
        workflows = workflows.filter(Q(trigger_value=trigger_value) | Q(trigger_value__isnull=True) | Q(trigger_value=''))
    
    for workflow in workflows:
        try:
            execute_workflow_action(lead, workflow, user=user)
        except Exception as e:
            logger.error(f"Error executing workflow {workflow.name}: {str(e)}")
            WorkflowLog.objects.create(
                workflow=workflow,
                lead=lead,
                action_taken=f"Error: {str(e)}"
            )

def execute_workflow_action(lead, workflow, user=None):
    action_type = workflow.action_type
    data = workflow.action_data or {}
    
    if action_type == 'update_stage':
        stage_id = data.get('stage_id')
        if stage_id:
            try:
                stage = LeadStage.objects.get(id=stage_id)
                lead.stage = stage
                lead.save(update_fields=['stage']) # Optimized save
                WorkflowLog.objects.create(
                    workflow=workflow,
                    lead=lead,
                    action_taken=f"Auto-transitioned to stage: {stage.name}"
                )
            except LeadStage.DoesNotExist:
                logger.warning(f"Workflow {workflow.name} referenced non-existent stage {stage_id}")

    elif action_type == 'create_task':
        note = data.get('note', 'Auto-generated follow-up')
        try:
            delay_hours = int(data.get('delay_hours', 24))
        except (ValueError, TypeError):
            delay_hours = 24
        
        # Priority for task assignment: 
        # 1. Assigned agent, 2. Triggering user, 3. First admin
        target_user = lead.assigned_to or user
        if not target_user:
            target_user = User.objects.filter(is_superuser=True).first()
            
        if target_user:
            Reminder.objects.create(
                lead=lead,
                user=target_user,
                note=note,
                scheduled_at=timezone.now() + timezone.timedelta(hours=delay_hours)
            )
            WorkflowLog.objects.create(
                workflow=workflow,
                lead=lead,
                action_taken=f"Reminder created for {target_user.username}: {note}"
            )
        else:
            logger.error(f"Cannot create task for workflow {workflow.name}: no target user found.")
            WorkflowLog.objects.create(
                workflow=workflow,
                lead=lead,
                action_taken="Error: No user found to assign the task."
            )

    elif action_type == 'send_notification':
        # Placeholder for Slack/Email alerts
        message = data.get('message', f"Lead {lead.name} needs attention!")
        # Here we would integrate with a messaging service
        WorkflowLog.objects.create(
            workflow=workflow,
            lead=lead,
            action_taken=f"Alert triggered: {message}"
        )

def summarize_lead_activities(lead):
    """
    Uses AI (or a smart simulation) to summarize the last 10 activities of a lead
    into a single status paragraph.
    """
    activities = lead.activities.all().order_by('-timestamp')[:10]
    
    if not activities.exists():
        lead.ai_status_summary = "No activity recorded yet for this lead."
        lead.save(update_fields=['ai_status_summary'])
        return

    # In a real enterprise app, we'd send these notes to an LLM (OpenAI/Anthropic)
    # For now, we simulate a smart summary by synthesizing the notes
    notes = [f"[{act.activity_type}] {act.note}" for act in activities]
    
    # Simple synthesization logic
    summary = f"Summary of last {len(notes)} interactions: "
    latest = activities[0]
    
    if len(notes) == 1:
        summary = f"The most recent interaction was a {latest.activity_type} on {latest.timestamp.strftime('%Y-%m-%d')}: '{latest.note}'."
    else:
        summary = f"Currently, the lead is in the '{lead.stage.name if lead.stage else 'New'}' stage. "
        summary += f"The latest activity was a {latest.activity_type} saying: '{latest.note}'. "
        
        # Look for patterns in the last 10 activities
        call_count = len([a for a in activities if a.activity_type == 'call'])
        email_count = len([a for a in activities if a.activity_type == 'email'])
        
        if call_count > 3:
            summary += f"We've had frequent telephone contact recently ({call_count} calls). "
        elif email_count > 3:
            summary += f"Communication has been mostly via email ({email_count} emails). "
            
        if len(notes) > 5:
            summary += "Relationship seems well-established with consistent touchpoints."
        else:
            summary += "Initial outreach is underway."

    lead.ai_status_summary = summary
    lead.save(update_fields=['ai_status_summary'])
