from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q

class LeadStage(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#3b82f6")  # Hex color
    order = models.PositiveIntegerField(default=0)
    is_final = models.BooleanField(default=False)  # Mark as Won/Lost
    probability = models.PositiveIntegerField(default=50) # Probability of closing in this stage (0-100)
    
    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name

class Campaign(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('planned', 'Planned')
    ]
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    assigned_users = models.ManyToManyField(User, related_name='campaigns')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Lead(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    company = models.CharField(max_length=255, null=True, blank=True)
    lead_source = models.CharField(max_length=100, null=True, blank=True)
    campaign = models.ForeignKey(Campaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_leads')
    stage = models.ForeignKey(LeadStage, on_delete=models.SET_NULL, null=True, related_name='leads')
    deal_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    lead_score = models.IntegerField(default=0) # Calculated score
    ai_status_summary = models.TextField(null=True, blank=True) # AI generated status digest
    last_contacted_at = models.DateTimeField(null=True, blank=True)
    last_contacted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recent_contacts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    external_id = models.CharField(max_length=100, unique=True, null=True, blank=True)

    def __str__(self):
        return self.name

    def calculate_score(self):
        """Rule-based scoring (0-100)"""
        score = 0
        
        # 1. Deal Value (Max 30 points)
        if self.deal_value > 100000: score += 30
        elif self.deal_value > 50000: score += 20
        elif self.deal_value > 10000: score += 10
        
        # 2. Lead Source (Max 20 points)
        trusted_sources = ['Website', 'Referral', 'Direct']
        if self.lead_source in trusted_sources:
            score += 20
        elif self.lead_source == 'LinkedIn':
            score += 10
            
        # 3. Activity Level (Max 30 points)
        activity_count = self.activities.count() if self.pk else 0
        if activity_count > 10: score += 30
        elif activity_count > 5: score += 20
        elif activity_count > 2: score += 10
        
        # 4. Recency (Max 20 points)
        from django.utils import timezone
        if self.last_contacted_at:
            days_since = (timezone.now() - self.last_contacted_at).days
            if days_since < 3: score += 20
            elif days_since < 10: score += 10
            
        return min(score, 100)

    def save(self, *args, **kwargs):
        # Auto-calculate score on save
        self.lead_score = self.calculate_score()
        super().save(*args, **kwargs)

class LeadAuditLog(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255) # e.g. "Stage Changed", "Deal Value Updated"
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

class CustomField(models.Model):
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('dropdown', 'Dropdown'),
        ('checkbox', 'Checkbox'),
        ('currency', 'Currency'),
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('textarea', 'Textarea'),
    ]
    label = models.CharField(max_length=255)
    name = models.SlugField(max_length=255, unique=True)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
    required = models.BooleanField(default=False)
    unique = models.BooleanField(default=False)
    default_value = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.label

class LeadCustomFieldValue(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='custom_values')
    field = models.ForeignKey(CustomField, on_delete=models.CASCADE)
    value = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ('lead', 'field')

class Activity(models.Model):
    ACTIVITY_TYPES = [
        ('call', 'Call'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('task', 'Task'),
        ('follow_up', 'Follow-up'),
    ]
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    note = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

class Reminder(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('due', 'Due'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
        ('snoozed', 'Snoozed'),
        ('rescheduled', 'Rescheduled'),
    ]
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='reminders')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField(null=True, blank=True)
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('agent', 'Agent'),
        ('sales', 'Sales'),
        ('developer', 'Developer'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='agent')
    permissions = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"

class LeadDocument(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='documents')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='lead_documents/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField() # in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name

class Workflow(models.Model):
    TRIGGER_CHOICES = [
        ('stage_change', 'On Stage Change'),
        ('lead_created', 'On Lead Created'),
        ('no_activity', 'Inactivity (Days)'),
    ]
    ACTION_CHOICES = [
        ('update_stage', 'Update Stage'),
        ('create_task', 'Create Task/Reminder'),
        ('send_notification', 'Send Alert'),
    ]
    name = models.CharField(max_length=255)
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    trigger_value = models.CharField(max_length=255, null=True, blank=True) # e.g., Stage ID or Days
    condition_logic = models.JSONField(default=dict, blank=True) # Additional rules
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    action_data = models.JSONField(default=dict, blank=True) # e.g., { "stage_id": 5, "note": "Follow up" }
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class WorkflowLog(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='logs')
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE)
    action_taken = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

class CallRecord(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='call_records')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    sid = models.CharField(max_length=100, unique=True, null=True, blank=True) # Twilio SID
    duration = models.IntegerField(help_text="Duration in seconds", default=0)
    recording_url = models.URLField(null=True, blank=True)
    summary = models.TextField(null=True, blank=True) # AI Generated Summary
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

class InternalTask(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ]
    CATEGORY_CHOICES = [
        ('finance', 'Finance'),
        ('hr', 'HR'),
        ('ops', 'Operations'),
        ('it', 'IT'),
        ('marketing', 'Marketing'),
        ('legal', 'Legal'),
        ('admin', 'General Admin'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_internal_tasks')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_internal_tasks')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='admin')
    due_date = models.DateTimeField()
    rollover_count = models.PositiveIntegerField(default=0) # Track how many times this was moved to next day 
    notes = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-mark as overdue if pending and past due date
        if self.status != 'completed' and self.due_date and self.due_date < timezone.now():
            self.status = 'overdue'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class Quotation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='quotations')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    quotation_number = models.CharField(max_length=50, unique=True)
    subject = models.CharField(max_length=255, null=True, blank=True)
    executive_summary = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    terms_conditions = models.TextField(blank=True, null=True)
    pdf_file = models.FileField(upload_to='quotations/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_totals(self):
        subtotal = sum(item.total_price for item in self.items.all())
        self.subtotal = subtotal
        self.tax_amount = (subtotal - self.discount_amount) * (self.tax_percent / 100)
        self.total_amount = subtotal - self.discount_amount + self.tax_amount
        self.save()

    def __str__(self):
        return self.quotation_number

class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

from .models_integrations import IntegrationSetting
