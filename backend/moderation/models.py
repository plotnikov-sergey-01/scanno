from django.conf import settings
from django.db import models


class Report(models.Model):
    class TargetType(models.TextChoices):
        REVIEW = "review", "Review"
        COMMENT = "comment", "Comment"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports"
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveIntegerField()
    reason = models.CharField(max_length=255)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report {self.pk} ({self.target_type}:{self.target_id})"
