from django.core.management.base import BaseCommand
from django.utils import timezone
from leads.models import InternalTask
import datetime

class Command(BaseCommand):
    help = 'Automatically rolls over uncompleted tasks from yesterday to today.'

    def handle(self, *args, **options):
        now = timezone.now()
        yesterday_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Find all tasks that are due before today and are not completed
        overdue_tasks = InternalTask.objects.filter(
            due_date__lt=yesterday_end,
            status__in=['pending', 'ongoing', 'overdue']
        )
        
        count = overdue_tasks.count()
        
        for task in overdue_tasks:
            # Shift due date to end of today
            original_due = task.due_date
            task.due_date = now.replace(hour=23, minute=59, second=59)
            task.rollover_count += 1
            task.status = 'pending' # Reset status to pending for the new day
            task.notes = (task.notes or "") + f"\n[ROLLOVER] Auto-shunted from {original_due.strftime('%Y-%m-%d')} to today."
            task.save()
            
        self.stdout.write(self.style.SUCCESS(f'Successfully rolled over {count} tasks to today.'))
