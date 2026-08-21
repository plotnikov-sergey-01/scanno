from django.urls import include, path

from accounts.urls import auth_urlpatterns

urlpatterns = [
    path("auth/", include(auth_urlpatterns)),
    path("", include("accounts.urls")),
    path("", include("catalog.urls")),
    path("", include("reviews.urls")),
    path("", include("moderation.urls")),
]
