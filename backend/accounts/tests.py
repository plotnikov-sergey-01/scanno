from importlib import import_module

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TransactionTestCase, override_settings
from django.urls import Resolver404, resolve
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from .serializers import SocialAuthorizationCodeSerializer


class SocialLoginRoutesTests(SimpleTestCase):
    def test_provider_routes_use_allauth(self):
        for provider in ("google", "facebook", "linkedin"):
            with self.subTest(provider=provider):
                view = resolve(f"/api/v1/auth/social/{provider}/").func.view_class
                self.assertTrue(issubclass(view, SocialLoginView))
                self.assertIs(view.client_class, OAuth2Client)
                self.assertIs(view.serializer_class, SocialAuthorizationCodeSerializer)
                self.assertEqual(view.social_provider, provider)

    def test_legacy_endpoint_is_removed(self):
        with self.assertRaises(Resolver404):
            resolve("/api/v1/auth/social/")

    @override_settings(SOCIAL_AUTH_ALLOWED_REDIRECT_ORIGINS=["https://example.com"])
    def test_social_serializer_allows_matching_redirect_origin_and_provider(self):
        class View:
            social_provider = "google"
            callback_url = None

        serializer = SocialAuthorizationCodeSerializer()
        serializer._validate_redirect_uri(
            "https://example.com/auth/social/callback?provider=google",
            View(),
        )

    @override_settings(SOCIAL_AUTH_ALLOWED_REDIRECT_ORIGINS=["https://example.com"])
    def test_social_serializer_rejects_untrusted_redirect_origin(self):
        class View:
            social_provider = "google"

        serializer = SocialAuthorizationCodeSerializer()
        with self.assertRaisesMessage(Exception, "This origin is not allowed"):
            serializer._validate_redirect_uri(
                "https://evil.example/auth/social/callback?provider=google",
                View(),
            )


class SocialAccountMigrationTests(TransactionTestCase):
    old_targets = [
        ("accounts", "0002_socialaccount"),
        ("socialaccount", "0006_alter_socialaccount_extra_data"),
    ]
    new_target = [("accounts", "0003_move_social_accounts_to_allauth")]

    def setUp(self):
        executor = MigrationExecutor(connection)
        self.final_targets = executor.loader.graph.leaf_nodes()
        executor.migrate(self.old_targets)
        self.apps = executor.loader.project_state(self.old_targets).apps
        self.LegacyAccount = self.apps.get_model("accounts", "SocialAccount")
        self.SocialAccount = self.apps.get_model("socialaccount", "SocialAccount")
        self.user = get_user_model().objects.create_user(
            username="social-user", email="social@example.com"
        )
        self.migration = import_module(
            "accounts.migrations.0003_move_social_accounts_to_allauth"
        )

    def tearDown(self):
        MigrationExecutor(connection).migrate(self.final_targets)
        super().tearDown()

    def add_legacy_account(self, provider="google"):
        return self.LegacyAccount.objects.create(
            provider=provider,
            provider_user_id=f"{provider}-uid",
            email=self.user.email,
            user_id=self.user.pk,
        )

    def test_migration_preserves_links_and_removes_legacy_table(self):
        legacy_accounts = [
            self.add_legacy_account(provider)
            for provider in ("google", "facebook", "linkedin")
        ]
        MigrationExecutor(connection).migrate(self.new_target)

        self.assertNotIn("accounts_socialaccount", connection.introspection.table_names())
        for legacy in legacy_accounts:
            account = self.SocialAccount.objects.get(uid=legacy.provider_user_id)
            self.assertEqual(account.user_id, self.user.pk)
            self.assertEqual(account.extra_data["email"], self.user.email)
            self.assertEqual(account.date_joined, legacy.created_at)
            self.assertEqual(account.last_login, legacy.updated_at)
        self.assertTrue(self.SocialAccount.objects.filter(provider="linkedin_oauth2").exists())

        MigrationExecutor(connection).migrate(self.old_targets)
        self.assertEqual(self.LegacyAccount.objects.count(), 3)

    def test_existing_allauth_link_is_not_overwritten(self):
        self.add_legacy_account()
        account = self.SocialAccount.objects.create(
            provider="google", uid="google-uid", user_id=self.user.pk,
            extra_data={"name": "Existing profile"},
        )
        MigrationExecutor(connection).migrate(self.new_target)
        account.refresh_from_db()
        self.assertEqual(self.SocialAccount.objects.count(), 1)
        self.assertEqual(account.extra_data, {"name": "Existing profile"})

    def test_conflicting_owner_stops_transfer(self):
        self.add_legacy_account()
        other = get_user_model().objects.create_user(
            username="other-user", email="other@example.com"
        )
        account = self.SocialAccount.objects.create(
            provider="google", uid="google-uid", user_id=other.pk,
        )
        try:
            with connection.schema_editor() as editor:
                with self.assertRaisesMessage(RuntimeError, "conflicting owners"):
                    self.migration.move_social_accounts(self.apps, editor)
            account.refresh_from_db()
            self.assertEqual(account.user_id, other.pk)
            self.assertEqual(self.LegacyAccount.objects.count(), 1)
        finally:
            account.delete()
