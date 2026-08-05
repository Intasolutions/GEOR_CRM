from rest_framework import viewsets, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    Lead, LeadStage, CustomField, Activity, Reminder, Campaign, 
    LeadDocument, LeadAuditLog, Workflow, WorkflowLog, CallRecord, InternalTask,
    Quotation, QuotationItem
)
from .models_integrations import IntegrationSetting
from .serializers import (
    LeadSerializer, LeadStageSerializer, ActivitySerializer, 
    ReminderSerializer, UserSerializer, CustomFieldSerializer, CampaignSerializer,
    LeadDocumentSerializer, IntegrationSettingSerializer, LeadAuditLogSerializer,
    WorkflowSerializer, WorkflowLogSerializer, CallRecordSerializer, InternalTaskSerializer,
    QuotationSerializer, QuotationItemSerializer
)
from .utils_automation import process_workflows, summarize_lead_activities
from django.contrib.auth.models import User
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from datetime import timedelta


class LeadViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from django.db.models import Exists, OuterRef, Q, Value, BooleanField, Case, When, IntegerField
        
        user = self.request.user
        profile = getattr(user, 'profile', None)
        
        is_sales_or_agent = profile and profile.role in ['sales', 'agent']
        is_admin_or_manager = user.is_superuser or (profile and profile.role in ['admin', 'manager'])

        # Base queryset - Role Scoping
        if is_sales_or_agent or not is_admin_or_manager:
            queryset = Lead.objects.filter(Q(assigned_to=user) | Q(campaign__assigned_users=user)).distinct()
            # Hide lost, next intake and domestic leads from sales users
            queryset = queryset.exclude(Q(stage__name__icontains='lost') | Q(stage__name__icontains='next intake') | Q(stage__name__icontains='domestic'))
        else:
            queryset = Lead.objects.all()

        # Annotate with 'is_at_risk' (Contacted or beyond 'New' stage, but no future reminder)
        now = timezone.now()
        future_reminders = Reminder.objects.filter(
            lead=OuterRef('pk'),
            scheduled_at__gt=now
        )
        
        missed_reminders = Reminder.objects.filter(
            lead=OuterRef('pk'),
            status__in=['pending', 'due', 'missed'],
            scheduled_at__lt=now
        )
        scheduled_reminders = Reminder.objects.filter(
            lead=OuterRef('pk'),
            status__in=['pending', 'due'],
            scheduled_at__gte=now
        )
        
        queryset = queryset.annotate(
            has_future_reminder=Exists(future_reminders),
            is_missed=Exists(missed_reminders),
            is_scheduled=Exists(scheduled_reminders)
        )
        queryset = queryset.annotate(
            is_at_risk=Case(
                When(
                    (Q(last_contacted_at__lt=now - timedelta(days=7)) | Q(last_contacted_at__isnull=True)) & ~Exists(future_reminders),
                    then=Value(True)
                ),
                default=Value(False),
                output_field=BooleanField()
            )
        )
        
        # Apply filters if provided
        campaign_id = self.request.query_params.get('campaign')
        stage_id = self.request.query_params.get('stage')
        search_query = self.request.query_params.get('search')
        assigned_to_id = self.request.query_params.get('assigned_to')
        start_date = self.request.query_params.get('start_date') or self.request.query_params.get('date_from')
        end_date = self.request.query_params.get('end_date') or self.request.query_params.get('date_to')
        
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        if stage_id:
            queryset = queryset.filter(stage_id=stage_id)
        if assigned_to_id == 'unassigned':
            queryset = queryset.filter(assigned_to__isnull=True)
        elif assigned_to_id and (user.is_superuser or (profile and profile.role in ['admin', 'manager'])):
            queryset = queryset.filter(assigned_to_id=assigned_to_id)
            

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(company__icontains=search_query) |
                Q(phone__icontains=search_query)
            )
            
        # Support for new "Archive & Reports" module
        exclude_final = self.request.query_params.get('exclude_final')
        is_final = self.request.query_params.get('is_final')
        if is_final == 'true':
            queryset = queryset.filter(stage__is_final=True)
        elif is_final == 'false':
            queryset = queryset.filter(Q(stage__is_final=False) | Q(stage__isnull=True))
            
        if exclude_final == 'true':
            queryset = queryset.filter(Q(stage__is_final=False) | Q(stage__isnull=True))
            
        at_risk = self.request.query_params.get('at_risk')
        if at_risk == 'true':
            queryset = queryset.filter(is_at_risk=True)
            
        missed_followups_only = self.request.query_params.get('missed_followups_only')
        if missed_followups_only == 'true':
            queryset = queryset.filter(is_missed=True)
            
        pending_followups = self.request.query_params.get('pending_followups')
        if pending_followups == 'true':
            queryset = queryset.filter(Q(is_scheduled=True) | Q(is_missed=True))
            
        user_priority_view = self.request.query_params.get('user_priority_view')
        if user_priority_view == 'true':
            queryset = queryset.annotate(
                sort_order=Case(
                    When(is_missed=True, then=Value(1)),
                    When(is_scheduled=True, then=Value(2)),
                    When(last_contacted_at__isnull=True, then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField()
                )
            ).order_by('sort_order', '-created_at')
            return queryset
            
        # Reminder section sorting requirement:
        # First leads without next schedule date, then leads accordingly to schedule date and time
        from django.db.models import Min, F
        queryset = queryset.annotate(
            next_schedule_date=Min('reminders__scheduled_at', filter=Q(reminders__status='pending'))
        ).order_by(F('next_schedule_date').asc(nulls_first=True), '-created_at')
        
        return queryset

    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Local pagination for Leads
    from rest_framework.pagination import PageNumberPagination
    class LeadPagination(PageNumberPagination):
        page_size = 10
    pagination_class = LeadPagination

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if profile and profile.role in ['sales', 'agent']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to create leads.")
            
        lead = serializer.save()
        LeadAuditLog.objects.create(
            lead=lead,
            user=self.request.user if self.request.user.is_authenticated else None,
            action="Lead Created",
            new_value=f"Lead {lead.name} created"
        )
        # Trigger Workflows
        process_workflows(lead, trigger_type='lead_created', user=self.request.user)

    def perform_destroy(self, instance):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        if profile and profile.role in ['sales', 'agent']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to delete leads.")
        super().perform_destroy(instance)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_stage = old_instance.stage
        old_deal_value = old_instance.deal_value

        # ── Sequential Stage Enforcement for Sales/Agent users ─────────────────
        user = self.request.user
        profile = getattr(user, 'profile', None)
        is_sales_or_agent = profile and profile.role in ['sales', 'agent']

        new_stage_id = serializer.validated_data.get('stage', old_stage)
        if hasattr(new_stage_id, 'id'):
            new_stage_obj = new_stage_id
        else:
            new_stage_obj = old_stage  # unchanged

        if is_sales_or_agent and new_stage_obj and old_stage and new_stage_obj != old_stage:
            # Special exit stages are always allowed
            SPECIAL_STAGES = ['lost', 'next intake', 'domestic']
            new_stage_name_lower = new_stage_obj.name.lower()
            is_special = any(s in new_stage_name_lower for s in SPECIAL_STAGES)

            if not is_special:
                # Only allow moving to the immediate next stage (order + 1)
                if new_stage_obj.order != old_stage.order + 1:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError(
                        f"You can only move to the next stage. "
                        f"Current stage is '{old_stage.name}' (Order {old_stage.order}). "
                        f"Next allowed stage is Order {old_stage.order + 1}."
                    )
        # ───────────────────────────────────────────────────────────────────────

        new_instance = serializer.save()
        new_stage = new_instance.stage
        new_deal_value = new_instance.deal_value
        
        # Log Stage Change
        if old_stage != new_stage:
            Activity.objects.create(
                lead=new_instance,
                user=self.request.user if self.request.user.is_authenticated else None,
                activity_type='task',
                note=f"Lead moved from {old_stage.name if old_stage else 'New Lead'} to {new_stage.name if new_stage else 'New Lead'}."
            )
            LeadAuditLog.objects.create(
                lead=new_instance,
                user=self.request.user if self.request.user.is_authenticated else None,
                action="Stage Changed",
                old_value=old_stage.name if old_stage else "None",
                new_value=new_stage.name if new_stage else "None"
            )
            # Trigger Workflows
            process_workflows(new_instance, trigger_type='stage_change', trigger_value=str(new_stage.id) if new_stage else None, user=self.request.user)

        # Log Deal Value Change
        if old_deal_value != new_deal_value:
            LeadAuditLog.objects.create(
                lead=new_instance,
                user=self.request.user if self.request.user.is_authenticated else None,
                action="Deal Value Updated",
                old_value=str(old_deal_value),
                new_value=str(new_deal_value)
            )


    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        try:
            leads_data = request.data.get('leads', [])
            strategy = request.data.get('strategy', 'skip')
            
            # Reset SQLite auto-increment counter to avoid UNIQUE constraint collisions on ID
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT MAX(id) FROM leads_lead")
                max_id = cursor.fetchone()[0] or 0
                cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='leads_lead'")
                cursor.execute(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('leads_lead', {max_id})")
            
            # Simple log without emojis to be safe on Windows consoles
            print(f"BULK IMPORT: Received {len(leads_data)} leads. Strategy: {strategy}")
            
            results = {'created': 0, 'updated': 0, 'skipped': 0, 'error_count': 0, 'errors': []}
            
            # Get default stage if not provided
            default_stage = LeadStage.objects.order_by('order').first()
            
            for data in leads_data:
                # IMPORTANT: Remove any 'id' field to prevent UNIQUE constraint collisions
                data.pop('id', None)
                import_note_1 = data.pop('import_note_1', None)
                import_note_2 = data.pop('import_note_2', None)
                import_note_3 = data.pop('import_note_3', None)
                
                email = data.get('email')
                phone = data.get('phone')
                # Treat common filler values as None to prevent false duplicate matches
                if email and str(email).lower().strip() in ['', 'na', 'n/a', 'none', 'null']:
                    email = None
                    data['email'] = None # Clean the data for saving
                
                # Try to find existing lead by email OR phone
                existing_lead = None
                if email:
                    existing_lead = Lead.objects.filter(email=email).first()
                if not existing_lead and phone:
                    existing_lead = Lead.objects.filter(phone=phone).first()
                    
                # Ensure stage is present or use default
                if not data.get('stage') and default_stage:
                    data['stage'] = default_stage.id
                    
                if existing_lead:
                    if strategy == 'skip':
                        results['skipped'] += 1
                        continue
                    elif strategy == 'overwrite':
                        serializer = self.get_serializer(existing_lead, data=data, partial=True)
                    else:
                        results['skipped'] += 1
                        continue
                else:
                    serializer = self.get_serializer(data=data)
                
                try:
                    if serializer.is_valid():
                        lead_instance = serializer.save()
                        
                        notes_to_add = []
                        if import_note_1: notes_to_add.append(f"Stage 1: {import_note_1}")
                        if import_note_2: notes_to_add.append(f"Stage 2: {import_note_2}")
                        if import_note_3: notes_to_add.append(f"Stage 3: {import_note_3}")

                        for note_text in notes_to_add:
                            Activity.objects.create(
                                lead=lead_instance,
                                user=request.user if request.user.is_authenticated else None,
                                activity_type='follow_up',
                                note=note_text
                            )

                        if existing_lead:
                            results['updated'] += 1
                        else:
                            results['created'] += 1
                    else:
                        results['error_count'] += 1
                        results['errors'].append({'data': data, 'errors': serializer.errors})
                except Exception as save_error:
                    print(f"FAILED TO SAVE LEAD DATA: {data}")
                    # Log the error but CONTINUE to the next lead
                    results['error_count'] += 1
                    results['errors'].append({'data': data, 'error': str(save_error)})
            
            return Response(results)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            # Include the data dict in the response if possible
            last_data = locals().get('data', 'No data available')
            print(f"BULK IMPORT CRASHED: {str(e)}")
            print(f"Last data item: {last_data}")
            print(error_trace)
            return Response({
                'error': str(e),
                'traceback': error_trace,
                'failing_data': last_data,
                'created': results['created'], 'updated': results['updated'], 
                'skipped': results['skipped'], 'error_count': results['error_count'], 
                'errors': [str(e)]
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def pipeline_stats(self, request):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        # Breakdown by Stage
        stages = LeadStage.objects.all()
        stage_breakdown = []
        total_forecasted = 0
        
        # Base filter for stats (Sales users view only assigned leads)
        if user.is_superuser or (profile and profile.role in ['admin', 'manager']):
            base_leads = Lead.objects.all()
        else:
            base_leads = Lead.objects.filter(Q(assigned_to=user) | Q(campaign__assigned_users=user)).distinct()

        start_date = self.request.query_params.get('start_date') or self.request.query_params.get('date_from')
        end_date = self.request.query_params.get('end_date') or self.request.query_params.get('date_to')
        if start_date:
            base_leads = base_leads.filter(created_at__date__gte=start_date)
        if end_date:
            base_leads = base_leads.filter(created_at__date__lte=end_date)
            
        for stage in stages:
            leads = base_leads.filter(stage=stage)
            count = leads.count()
            value = leads.aggregate(total=Sum('deal_value'))['total'] or 0
            forecasted = (value * stage.probability) / 100
            total_forecasted += forecasted
            
            stage_breakdown.append({
                'stage': stage.name,
                'count': count,
                'value': value,
                'forecasted': forecasted,
                'probability': stage.probability,
                'color': stage.color
            })
            
        # Breakdown by Source
        sources = list(base_leads.values('lead_source').annotate(count=Count('id'), value=Sum('deal_value')))
        
        # Ensure 'Closed Won' count is case insensitive or defaults to 0 safely
        won_leads = base_leads.filter(Q(stage__name__iexact='Closed Won') | Q(stage__name__iexact='Won'))
        
        return Response({
            'stage_breakdown': stage_breakdown,
            'source_breakdown': sources,
            'total_forecasted_revenue': float(total_forecasted),
            'won_leads_count': won_leads.count()
        })

    @action(detail=True, methods=['get'])
    def audit_logs(self, request, pk=None):
        lead = self.get_object()
        logs = lead.audit_logs.all()
        serializer = LeadAuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="leads_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Email', 'Phone', 'Company', 'Source', 'Stage', 'Deal Value', 'Created At'])
        
        leads = self.get_queryset()
        for lead in leads:
            writer.writerow([
                lead.name, lead.email, lead.phone, lead.company, 
                lead.lead_source, lead.stage.name if lead.stage else 'N/A',
                lead.deal_value, lead.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
            
        return response

class LeadStageViewSet(viewsets.ModelViewSet):
    queryset = LeadStage.objects.all()
    serializer_class = LeadStageSerializer
    permission_classes = [permissions.IsAuthenticated]

class ActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        if user.is_superuser or role in ['admin', 'manager']:
            queryset = Activity.objects.all()
        else:
            queryset = Activity.objects.filter(Q(lead__assigned_to=user) | Q(lead__campaign__assigned_users=user)).distinct()
            
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        return queryset.order_by('-timestamp')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        lead = serializer.validated_data.get('lead')
        
        if not (user.is_superuser or role in ['admin', 'manager']):
            if lead.assigned_to != user and user not in (lead.campaign.assigned_users.all() if lead.campaign else []):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have access to this lead.")
            
        activity = serializer.save(user=user)
        
        # Auto-update lead contact tracking
        if activity.activity_type in ['call', 'email', 'meeting']:
            lead = activity.lead
            from django.utils import timezone
            lead.last_contacted_at = timezone.now()
            lead.last_contacted_by = user
            lead.save()
        
        # Update AI summary whenever a new activity is added
        summarize_lead_activities(activity.lead)

class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        if role in ['admin', 'manager']:
            queryset = Reminder.objects.all()
        else:
            queryset = Reminder.objects.filter(Q(lead__assigned_to=user) | Q(lead__campaign__assigned_users=user)).distinct()
            
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        return queryset.order_by('scheduled_at')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination'):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        lead = serializer.validated_data.get('lead')
        
        if not (user.is_superuser or role in ['admin', 'manager']):
            if lead.assigned_to != user and user not in (lead.campaign.assigned_users.all() if lead.campaign else []):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have access to this lead.")
            
        serializer.save(user=user)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class CustomFieldViewSet(viewsets.ModelViewSet):
    queryset = CustomField.objects.all()
    serializer_class = CustomFieldSerializer
    permission_classes = [permissions.IsAuthenticated]

class CampaignViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        # Everyone has full access to campaigns per the new permission plan
        return Campaign.objects.all()

    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

class LeadDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = LeadDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        if user.is_superuser or role in ['admin', 'manager']:
            queryset = LeadDocument.objects.all()
        else:
            queryset = LeadDocument.objects.filter(Q(lead__assigned_to=user) | Q(lead__campaign__assigned_users=user)).distinct()
            
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        return queryset.order_by('-uploaded_at')

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        lead = serializer.validated_data.get('lead')
        
        if not (user.is_superuser or role in ['admin', 'manager']):
            if lead.assigned_to != user and user not in (lead.campaign.assigned_users.all() if lead.campaign else []):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have access to this lead.")
            
        serializer.save(user=user)

class IntegrationViewSet(viewsets.ModelViewSet):
    queryset = IntegrationSetting.objects.all()
    serializer_class = IntegrationSettingSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'provider'

    @action(detail=True, methods=['post'])
    def toggle(self, request, provider=None):
        integration, created = IntegrationSetting.objects.get_or_create(provider=provider)
        
        # If config_data is provided, we are "connecting"
        config_data = request.data.get('config_data')
        if config_data:
            integration.config_data = config_data
            integration.is_connected = True
        else:
            # Simple toggle for disconnect or quick toggle
            integration.is_connected = not integration.is_connected
            
        integration.save()
        return Response({'status': 'success', 'connected': integration.is_connected})

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]

class WorkflowLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowLog.objects.all()
    serializer_class = WorkflowLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return WorkflowLog.objects.filter(lead_id=lead_id).order_by('-timestamp')
        return WorkflowLog.objects.all().order_by('-timestamp')

class CallRecordViewSet(viewsets.ModelViewSet):
    serializer_class = CallRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            return CallRecord.objects.filter(lead_id=lead_id).order_by('-timestamp')
        return CallRecord.objects.filter(user=self.request.user).order_by('-timestamp')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class InternalTaskViewSet(viewsets.ModelViewSet):
    serializer_class = InternalTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        # Admins and Managers see everything, Sales and Developers only see assigned tasks
        if role in ['admin', 'manager']:
            queryset = InternalTask.objects.all()
        else:
            queryset = InternalTask.objects.filter(assigned_to=user)
        
        # Filtering
        status = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        category = self.request.query_params.get('category')
        
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category=category)
            
        # Support for new "Archive & Reports" module
        exclude_completed = self.request.query_params.get('exclude_completed')
        if exclude_completed == 'true':
            queryset = queryset.exclude(status='completed')
            
        only_completed = self.request.query_params.get('only_completed')
        if only_completed == 'true':
            queryset = queryset.filter(status='completed')
            
        return queryset.order_by('-due_date')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def daily_briefing(self, request):
        now = timezone.localtime()
        # Basic timezone heuristic for greeting (if profile has no TZ, use server time)
        hour = now.hour
        if 5 <= hour < 12:
            greeting = "Good morning"
        elif 12 <= hour < 17:
            greeting = "Good afternoon"
        elif 17 <= hour < 22:
            greeting = "Good evening"
        else:
            greeting = "Good night"

        # Get pending/ongoing tasks assigned to user
        tasks = InternalTask.objects.filter(
            assigned_to=request.user, 
            status__in=['pending', 'ongoing']
        ).order_by('-priority', 'due_date')
        
        task_count = tasks.count()
        if task_count == 0:
            return Response({
                'briefing': f"{greeting}, {request.user.username}! You have a clear schedule. This is a great opportunity to focus on long-term goals or clear your inbox.",
                'task_count': 0
            })
            
        # Prioritize critical/high tasks
        urgent_tasks = tasks.filter(priority__in=['critical', 'high'])
        main_task = urgent_tasks.first() or tasks.first()
        
        time_diff = main_task.due_date - now
        due_text = "due soon"
        if time_diff.days < 0:
            due_text = "overdue"
        elif time_diff.seconds < 3600 * 3:
            due_text = "due in less than 3 hours"
            
        briefing = f"{greeting}, {request.user.username}. You have {task_count} tasks assigned to you. "
        briefing += f"I recommend starting with **'{main_task.title}'** as it's a {main_task.priority} priority task and is {due_text}. "
        
        # Check for bottlenecks
        overdue_count = tasks.filter(due_date__lt=now).count()
        if overdue_count > 0:
            briefing += f"You have {overdue_count} overdue task(s) that should be addressed immediately to stay on track."
        else:
            briefing += "Your current timeline looks manageable if you tackle the top item first."
            
        return Response({
            'briefing': briefing,
            'task_count': task_count,
            'main_task_id': main_task.id
        })

    @action(detail=False, methods=['post'])
    def auto_rollover(self, request):
        """Rolls over all pending tasks from yesterday to today for the current user or all users if manager."""
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        now = timezone.now()
        yesterday_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        queryset = InternalTask.objects.filter(
            due_date__lt=yesterday_end,
            status__in=['pending', 'ongoing', 'overdue']
        )
        
        if role not in ['admin', 'manager']:
            queryset = queryset.filter(assigned_to=user)
            
        count = queryset.count()
        for task in queryset:
            task.due_date = now.replace(hour=23, minute=59, second=59)
            task.rollover_count += 1
            task.status = 'pending'
            task.save()
            
        return Response({'status': 'success', 'rolled_over': count})

class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        
        if user.is_superuser or role in ['admin', 'manager']:
            queryset = Quotation.objects.all()
        else:
            queryset = Quotation.objects.filter(Q(lead__assigned_to=user) | Q(lead__campaign__assigned_users=user)).distinct()
            
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else 'agent'
        lead = serializer.validated_data.get('lead')
        
        if not (user.is_superuser or role in ['admin', 'manager']):
            if lead.assigned_to != user and user not in (lead.campaign.assigned_users.all() if lead.campaign else []):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have access to this lead.")
            
        # Generate unique quotation number: QTN-YYYYMMDD-XXXX
        from django.utils import timezone
        import random
        import string
        
        now = timezone.now()
        random_suffix = ''.join(random.choices(string.digits, k=4))
        q_number = f"QTN_{now.strftime('%Y%m%d')}_{random_suffix}"
        
        serializer.save(user=user, quotation_number=q_number)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        quotation = self.get_object()
        serializer = QuotationItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(quotation=quotation)
            quotation.calculate_totals()
            return Response(QuotationSerializer(quotation).data)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        quotation = self.get_object()
        
        try:
            from weasyprint import HTML
        except ImportError:
            return Response({'error': 'PDF generation engine (WeasyPrint) not properly installed on server.'}, status=500)
            
            
        try:
            # 1. Render template to HTML string
            html_string = render_to_string('leads/quotation_template.html', {
                'quotation': quotation,
                'lead': quotation.lead
            })
            
            # 2. Generate PDF using WeasyPrint
            pdf_content = HTML(string=html_string).write_pdf()
            
            # 3. Save to model
            filename = f"quotation_{quotation.quotation_number}.pdf"
            from django.core.files.base import ContentFile
            quotation.pdf_file.save(filename, ContentFile(pdf_content))
            
            # 4. Also register it as a Lead Document for easy access
            LeadDocument.objects.create(
                lead=quotation.lead,
                user=request.user,
                file=quotation.pdf_file,
                file_name=f"Quotation {quotation.quotation_number}",
                file_size=len(pdf_content)
            )
            
            return Response({'status': 'Quotation PDF generated successfully', 'url': quotation.pdf_file.url})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class LeadAuditLogViewSet(viewsets.ModelViewSet):
    queryset = LeadAuditLog.objects.all()
    serializer_class = LeadAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

class QuotationItemViewSet(viewsets.ModelViewSet):
    queryset = QuotationItem.objects.all()
    serializer_class = QuotationItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_destroy(self, instance):
        quotation = instance.quotation
        instance.delete()
        quotation.calculate_totals()


# ─── Google Sheets Auto-Import Endpoint ───────────────────────────────────────
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
import secrets

class SheetImportView(APIView):
    """
    Called by Google Apps Script when a new row is added to the linked sheet.
    Authenticated via X-Import-Token header — no JWT needed.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models_integrations import IntegrationSetting
        from .models import CustomField, LeadCustomFieldValue, Activity, LeadStage

        # ── 1. Authenticate via token ──────────────────────────────────────────
        token = request.headers.get('X-Import-Token') or request.data.get('import_token')
        try:
            integration = IntegrationSetting.objects.get(provider='sheets')
        except IntegrationSetting.DoesNotExist:
            return Response({'error': 'Google Sheets integration not configured.'}, status=400)

        saved_token = integration.config_data.get('import_token')
        if not saved_token or token != saved_token:
            return Response({'error': 'Invalid import token.'}, status=401)

        if not integration.is_connected:
            return Response({'error': 'Google Sheets integration is disabled.'}, status=403)

        # ── 2. Parse incoming row data ─────────────────────────────────────────
        data = request.data
        name  = str(data.get('Name', '') or '').strip()
        phone = str(data.get('Phone', '') or data.get('phone', '') or '').strip()
        email = str(data.get('Email', '') or data.get('email', '') or '').strip()

        if not name:
            return Response({'status': 'skipped', 'reason': 'No name provided'}, status=200)

        # ── 3. Duplicate check (phone or email) ────────────────────────────────
        from django.db.models import Q as DQ
        existing = None
        if email and email.lower() not in ['', 'na', 'n/a', 'none']:
            existing = Lead.objects.filter(email=email).first()
        if not existing and phone:
            existing = Lead.objects.filter(phone=phone).first()

        if existing:
            return Response({'status': 'duplicate', 'lead_id': existing.id}, status=200)

        # ── 4. Get default stage (first by order) ──────────────────────────────
        config = integration.config_data
        default_stage_id = config.get('default_stage_id')
        if default_stage_id:
            stage = LeadStage.objects.filter(id=default_stage_id).first()
        else:
            stage = LeadStage.objects.order_by('order').first()

        # ── 5. Create the Lead ─────────────────────────────────────────────────
        lead = Lead.objects.create(
            name=name,
            phone=phone or None,
            email=email or None,
            lead_source='Google Sheets / Meta Ads',
            stage=stage,
            assigned_to=None,  # Left for admin to assign
        )

        # ── 6. Save custom fields: District, Qualification, Age ────────────────
        custom_field_map = {
            'District':      ('district',      'text'),
            'Qualification': ('qualification', 'text'),
            'Age':           ('age',           'text'),
        }
        for sheet_col, (slug, ftype) in custom_field_map.items():
            val = str(data.get(sheet_col, '') or '').strip()
            if not val:
                continue
            cf, _ = CustomField.objects.get_or_create(
                name=slug,
                defaults={'label': sheet_col, 'field_type': ftype}
            )
            LeadCustomFieldValue.objects.create(lead=lead, field=cf, value=val)

        # ── 7. Create Activity notes for Feedback columns ──────────────────────
        feedback_cols = [
            ('Feedback 1(Initial Response)', 'call'),
            ('Feedback 2 (Call Response)',   'follow_up'),
            ('Final Feedback',               'follow_up'),
        ]
        # Also handle alternative spellings from the sheet
        feedback_aliases = [
            (['Feedback 1(Initial Response)', 'Feedback 1', 'Feedback1'], 'call'),
            (['Feedback 2 (Call Response)',   'Feedback 2', 'Feedback2'], 'follow_up'),
            (['Final Feedback',               'FinalFeedback'],           'follow_up'),
        ]
        for aliases, atype in feedback_aliases:
            note = None
            for alias in aliases:
                val = str(data.get(alias, '') or '').strip()
                if val:
                    note = val
                    break
            if note:
                # Use first superuser as fallback activity user
                from django.contrib.auth.models import User as DjangoUser
                system_user = DjangoUser.objects.filter(is_superuser=True).first()
                if system_user:
                    Activity.objects.create(
                        lead=lead,
                        user=system_user,
                        activity_type=atype,
                        note=f"[Sheet Import] {note}"
                    )

        # ── 8. Update last_sync timestamp ──────────────────────────────────────
        from django.utils import timezone as tz
        integration.last_sync = tz.now()
        integration.save(update_fields=['last_sync'])

        return Response({'status': 'created', 'lead_id': lead.id, 'name': lead.name}, status=201)

    def get(self, request):
        """Health check — for testing the endpoint is reachable."""
        return Response({'status': 'ok', 'message': 'Google Sheets import endpoint is active.'})

