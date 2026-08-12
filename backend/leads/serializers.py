from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Lead, LeadStage, CustomField, LeadCustomFieldValue, 
    Activity, Reminder, Campaign, LeadDocument, LeadAuditLog,
    Workflow, WorkflowLog, CallRecord, InternalTask,
    Quotation, QuotationItem
)
from .models_integrations import IntegrationSetting

class IntegrationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationSetting
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.CharField(source='profile.role', required=False)
    permissions = serializers.JSONField(source='profile.permissions', required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'role', 'permissions']

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        
        from .models import UserProfile
        UserProfile.objects.get_or_create(user=user, defaults=profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        
        if password:
            user.set_password(password)
            user.save()
            
        from .models import UserProfile
        UserProfile.objects.update_or_create(user=user, defaults=profile_data)
        return user

class LeadStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadStage
        fields = '__all__'

class CampaignSerializer(serializers.ModelSerializer):
    assigned_users_details = UserSerializer(source='assigned_users', many=True, read_only=True)
    lead_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = '__all__'

    def get_lead_count(self, obj):
        return obj.leads.count()

class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = '__all__'

class LeadCustomFieldValueSerializer(serializers.ModelSerializer):
    field_slug = serializers.ReadOnlyField(source='field.name')
    field_label = serializers.ReadOnlyField(source='field.label')

    class Meta:
        model = LeadCustomFieldValue
        fields = ['id', 'field', 'field_slug', 'field_label', 'value']

class LeadAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = LeadAuditLog
        fields = '__all__'

class CallRecordSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = CallRecord
        fields = '__all__'

class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.ReadOnlyField(source='stage.name')
    campaign_name = serializers.ReadOnlyField(source='campaign.name')
    is_final = serializers.ReadOnlyField(source='stage.is_final')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    last_contacted_by_name = serializers.ReadOnlyField(source='last_contacted_by.username')
    custom_values = LeadCustomFieldValueSerializer(many=True, read_only=True)
    custom_data = serializers.JSONField(write_only=True, required=False)
    probability = serializers.ReadOnlyField(source='stage.probability', default=0)
    lead_score = serializers.IntegerField(read_only=True)
    ai_status_summary = serializers.CharField(read_only=True)
    call_records = CallRecordSerializer(many=True, read_only=True)
    forecasted_value = serializers.SerializerMethodField()
    has_pending_reminder = serializers.SerializerMethodField()
    is_at_risk = serializers.BooleanField(read_only=True)
    collect_demographics = serializers.ReadOnlyField(source='campaign.collect_demographics', default=True)

    class Meta:
        model = Lead
        fields = '__all__'
        extra_kwargs = {
            'audit_logs': {'read_only': True}
        }

    def get_has_pending_reminder(self, obj):
        from django.utils import timezone
        return obj.reminders.filter(scheduled_at__gt=timezone.now()).exists()

    def get_forecasted_value(self, obj):
        if obj.stage and obj.deal_value:
            return (obj.deal_value * obj.stage.probability) / 100
        return 0.00

    def validate(self, data):
        stage = data.get('stage')
        if not stage and self.instance:
            stage = self.instance.stage
            
        lost_reason = data.get('lost_reason')
        if not lost_reason and self.instance:
            lost_reason = data.get('lost_reason', self.instance.lost_reason)

        if stage and ('lost' in stage.name.lower() or 'next intake' in stage.name.lower() or 'domestic' in stage.name.lower()):
            if not lost_reason or not str(lost_reason).strip():
                raise serializers.ValidationError({"lost_reason": "A reason must be provided when moving to this stage."})
                
        return data

    def create(self, validated_data):
        custom_data = validated_data.pop('custom_data', {})
        lead = super().create(validated_data)
        for field_id, value in custom_data.items():
            LeadCustomFieldValue.objects.create(lead=lead, field_id=field_id, value=str(value))
        return lead

    def update(self, instance, validated_data):
        custom_data = validated_data.pop('custom_data', {})
        lead = super().update(instance, validated_data)
        for field_id, value in custom_data.items():
            LeadCustomFieldValue.objects.update_or_create(
                lead=lead, field_id=field_id, 
                defaults={'value': str(value)}
            )
        return lead

class ActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Activity
        fields = '__all__'
        read_only_fields = ['user']

class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = '__all__'
        read_only_fields = ['user']

class LeadDocumentSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = LeadDocument
        fields = '__all__'
        read_only_fields = ['user']

class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = '__all__'

class WorkflowLogSerializer(serializers.ModelSerializer):
    workflow_name = serializers.ReadOnlyField(source='workflow.name')
    lead_name = serializers.ReadOnlyField(source='lead.name')
    
    class Meta:
        model = WorkflowLog
        fields = '__all__'

class InternalTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = InternalTask
        fields = '__all__'
        read_only_fields = ['created_by', 'rollover_count']
class QuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotationItem
        fields = '__all__'
        read_only_fields = ['total_price']

class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, read_only=True)
    user_name = serializers.ReadOnlyField(source='user.username')
    lead_name = serializers.ReadOnlyField(source='lead.name')

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['user', 'quotation_number', 'subtotal', 'tax_amount', 'total_amount']

