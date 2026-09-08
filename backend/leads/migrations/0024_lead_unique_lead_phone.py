import re
from django.conf import settings
from django.db import migrations, models


def clean_and_normalize_phones(apps, schema_editor):
    Lead = apps.get_model('leads', 'Lead')

    def norm(phone):
        if not phone:
            return None
        s = str(phone).strip()
        if not s or s.lower() in ['', 'none', 'null', 'na', 'n/a', 'nil', '-', '--', 'undefined']:
            return None
        digits = re.sub(r'\D', '', s)
        if not digits:
            return None
        if len(digits) == 10:
            return digits
        elif len(digits) == 11 and digits.startswith('0'):
            return digits[1:]
        elif len(digits) == 12 and digits.startswith('91'):
            return digits[2:]
        elif len(digits) == 13 and digits.startswith('091'):
            return digits[3:]
        return digits

    seen = set()
    for lead in Lead.objects.all().order_by('id'):
        cleaned = norm(lead.phone)
        if not cleaned:
            lead.phone = None
            lead.save(update_fields=['phone'])
        else:
            if cleaned in seen:
                # Resolve existing duplicates so UniqueConstraint doesn't fail
                lead.phone = f"{cleaned}_dup{lead.id}"
                lead.save(update_fields=['phone'])
            else:
                seen.add(cleaned)
                if lead.phone != cleaned:
                    lead.phone = cleaned
                    lead.save(update_fields=['phone'])


class Migration(migrations.Migration):

    dependencies = [
        ('leads', '0023_lead_created_by'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(clean_and_normalize_phones, reverse_code=migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='lead',
            constraint=models.UniqueConstraint(condition=models.Q(('phone__isnull', False), models.Q(('phone', ''), _negated=True)), fields=('phone',), name='unique_lead_phone'),
        ),
    ]
