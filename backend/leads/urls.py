from django.urls import path
from .views import (
    LeadViewSet, LeadStageViewSet, ActivityViewSet, 
    ReminderViewSet, UserViewSet, CustomFieldViewSet, CampaignViewSet,
    LeadDocumentViewSet, IntegrationViewSet, WorkflowViewSet, WorkflowLogViewSet,
    CallRecordViewSet, InternalTaskViewSet, QuotationViewSet, QuotationItemViewSet,
    LeadAuditLogViewSet
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'stages', LeadStageViewSet)
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'users', UserViewSet)
router.register(r'custom-fields', CustomFieldViewSet)
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'documents', LeadDocumentViewSet, basename='document')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'quotation-items', QuotationItemViewSet, basename='quotation-item')
router.register(r'integrations', IntegrationViewSet, basename='integration')
router.register(r'workflows', WorkflowViewSet, basename='workflow')
router.register(r'workflow-logs', WorkflowLogViewSet, basename='workflow-log')
router.register(r'call-records', CallRecordViewSet, basename='call-record')
router.register(r'internal-tasks', InternalTaskViewSet, basename='internal-task')
router.register(r'audit-logs', LeadAuditLogViewSet, basename='audit-log')

urlpatterns = router.urls
