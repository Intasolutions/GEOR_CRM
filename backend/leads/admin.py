from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import (
    LeadStage, Campaign, Lead, CustomField, 
    LeadCustomFieldValue, Activity, Reminder, 
    UserProfile, LeadDocument
)

# --- Inlines ---

class LeadCustomFieldValueInline(admin.TabularInline):
    model = LeadCustomFieldValue
    extra = 0
    fields = ('field', 'value')

class ActivityInline(admin.TabularInline):
    model = Activity
    extra = 0
    readonly_fields = ('timestamp',)
    classes = ('collapse',)

class LeadDocumentInline(admin.TabularInline):
    model = LeadDocument
    extra = 0
    readonly_fields = ('uploaded_at', 'file_size')
    classes = ('collapse',)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'CRM Profile'
    fk_name = 'user'

# --- Custom Admins ---

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'company_display', 'get_stage_badge', 'deal_value_display', 'assigned_to', 'created_at')
    list_filter = ('stage', 'campaign', 'assigned_to', 'lead_source', 'created_at')
    search_fields = ('name', 'email', 'phone', 'company', 'external_id')
    inlines = [LeadCustomFieldValueInline, ActivityInline, LeadDocumentInline]
    date_hierarchy = 'created_at'
    list_per_page = 20
    
    fieldsets = (
        ('Basic Information', {
            'fields': (('name', 'email'), ('phone', 'company'), 'lead_source')
        }),
        ('Sales Tracking', {
            'fields': (('stage', 'campaign'), ('assigned_to', 'deal_value'), 'external_id')
        }),
        ('Timestamps', {
            'fields': (('created_at', 'updated_at'), ('last_contacted_at', 'last_contacted_by')),
            'classes': ('collapse',),
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_contacted_at', 'last_contacted_by')

    def company_display(self, obj):
        return obj.company or "-"
    company_display.short_description = 'Company'

    def deal_value_display(self, obj):
        return format_html('<b>₹{}</b>', obj.deal_value)
    deal_value_display.short_description = 'Value'

    def get_stage_badge(self, obj):
        if obj.stage:
            return format_html(
                '<span style="background-color: {}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{}</span>',
                obj.stage.color,
                obj.stage.name
            )
        return format_html('<span style="color: #999;">No Stage</span>')
    get_stage_badge.short_description = 'Status'

@admin.register(LeadStage)
class LeadStageAdmin(admin.ModelAdmin):
    list_display = ('name', 'order', 'probability_display', 'color_preview', 'is_final')
    list_editable = ('order', 'is_final')
    list_display_links = ('name',)
    
    def probability_display(self, obj):
        return f"{obj.probability}%"
    probability_display.short_description = 'Win Prob.'

    def color_preview(self, obj):
        return format_html(
            '<div style="width: 30px; height: 15px; background-color: {}; border-radius: 3px; border: 1px solid #ddd;"></div>',
            obj.color
        )
    color_preview.short_description = 'Color'

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'status_badge', 'budget_display', 'start_date', 'end_date', 'lead_count')
    list_filter = ('status', 'start_date', 'end_date')
    search_fields = ('name', 'description')
    filter_horizontal = ('assigned_users',)
    
    def status_badge(self, obj):
        colors = {
            'active': '#10b981',
            'paused': '#f59e0b',
            'completed': '#3b82f6',
            'planned': '#64748b'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#000'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def budget_display(self, obj):
        return f"₹{obj.budget}"
    budget_display.short_description = 'Budget'

    def lead_count(self, obj):
        return obj.leads.count()
    lead_count.short_description = 'Leads'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__email')

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_role')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups', 'profile__role')
    
    # Explicitly bring in BaseUserAdmin creation fields
    add_fieldsets = BaseUserAdmin.add_fieldsets
    add_form = BaseUserAdmin.add_form
    
    def get_role(self, obj):
        try:
            return obj.profile.role.upper()
        except:
            return "-"
    get_role.short_description = 'CRM Role'

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return []
        return super().get_inline_instances(request, obj)

# Re-register User with customized admin
try:
    admin.site.unregister(User)
except:
    pass
admin.site.register(User, UserAdmin)

@admin.register(CustomField)
class CustomFieldAdmin(admin.ModelAdmin):
    list_display = ('label', 'name', 'field_type', 'required', 'unique')
    list_filter = ('field_type', 'required', 'unique')
    prepopulated_fields = {'name': ('label',)}

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('lead', 'user', 'activity_type', 'timestamp_display')
    list_filter = ('activity_type', 'timestamp', 'user')
    search_fields = ('note', 'lead__name', 'user__username')
    
    def timestamp_display(self, obj):
        return obj.timestamp.strftime("%b %d, %Y %H:%M")
    timestamp_display.short_description = 'Time'

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('lead', 'user', 'scheduled_at', 'status_label')
    list_filter = ('status', 'scheduled_at', 'user')
    
    def status_label(self, obj):
        colors = {
            'pending': '#f59e0b',
            'completed': '#10b981',
            'missed': '#ef4444',
            'due': '#3b82f6'
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px;">{}</span>',
            colors.get(obj.status, '#666'),
            obj.status.upper()
        )
    status_label.short_description = 'Status'

@admin.register(LeadDocument)
class LeadDocumentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'lead', 'user', 'size_display', 'uploaded_at')
    readonly_fields = ('file_size', 'uploaded_at')
    
    def size_display(self, obj):
        return f"{round(obj.file_size / 1024, 2)} KB"
    size_display.short_description = 'Size'

from .models_integrations import IntegrationSetting

@admin.register(IntegrationSetting)
class IntegrationSettingAdmin(admin.ModelAdmin):
    list_display = ('provider', 'is_connected', 'updated_at')
    list_filter = ('is_connected',)
    search_fields = ('provider',)
