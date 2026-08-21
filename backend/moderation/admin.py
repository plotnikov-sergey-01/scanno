from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "target_type", "target_id", "reason", "status", "reporter", "created_at")
    list_filter = ("status", "target_type")
    search_fields = ("reason", "details", "reporter__email")
    actions = ["mark_resolved", "mark_dismissed"]

    @admin.action(description="Mark resolved")
    def mark_resolved(self, request, queryset):
        from django.utils import timezone

        queryset.update(status=Report.Status.RESOLVED, resolved_at=timezone.now())

    @admin.action(description="Mark dismissed")
    def mark_dismissed(self, request, queryset):
        from django.utils import timezone

        queryset.update(status=Report.Status.DISMISSED, resolved_at=timezone.now())
