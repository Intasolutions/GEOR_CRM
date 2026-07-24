from django.db import models

class IntegrationSetting(models.Model):
    provider = models.CharField(max_length=50, unique=True) # e.g., 'gmail', 'whatsapp', 'sms'
    is_connected = models.BooleanField(default=False)
    config_data = models.JSONField(default=dict, blank=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.provider.capitalize()} - {'Connected' if self.is_connected else 'Disconnected'}"
