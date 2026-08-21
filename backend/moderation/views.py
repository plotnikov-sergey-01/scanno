from rest_framework import generics, permissions

from .models import Report
from .serializers import ReportSerializer


class ReportCreateView(generics.CreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Report.objects.all()

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
