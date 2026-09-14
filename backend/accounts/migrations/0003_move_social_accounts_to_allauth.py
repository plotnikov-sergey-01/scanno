from django.db import migrations


PROVIDERS = {
    "google": "google",
    "facebook": "facebook",
    "linkedin": "linkedin_oauth2",
}


def move_social_accounts(apps, schema_editor):
    LegacyAccount = apps.get_model("accounts", "SocialAccount")
    SocialAccount = apps.get_model("socialaccount", "SocialAccount")
    database = schema_editor.connection.alias
    max_uid_length = SocialAccount._meta.get_field("uid").max_length

    for legacy in LegacyAccount.objects.using(database).iterator():
        if len(legacy.provider_user_id) > max_uid_length:
            raise RuntimeError("Legacy social account ID exceeds allauth's UID limit.")
        account, created = SocialAccount.objects.using(database).get_or_create(
            provider=PROVIDERS[legacy.provider],
            uid=legacy.provider_user_id,
            defaults={
                "user_id": legacy.user_id,
                "extra_data": {"email": legacy.email},
            },
        )
        # Never reassign a provider identity already owned by another user.
        if account.user_id != legacy.user_id:
            raise RuntimeError("Social account migration found conflicting owners.")
        if created:
            SocialAccount.objects.using(database).filter(pk=account.pk).update(
                date_joined=legacy.created_at,
                last_login=legacy.updated_at,
            )


def restore_social_accounts(apps, schema_editor):
    LegacyAccount = apps.get_model("accounts", "SocialAccount")
    SocialAccount = apps.get_model("socialaccount", "SocialAccount")
    database = schema_editor.connection.alias
    providers = {value: key for key, value in PROVIDERS.items()}

    for account in (
        SocialAccount.objects.using(database)
        .filter(provider__in=providers)
        .select_related("user")
        .iterator()
    ):
        legacy = LegacyAccount.objects.using(database).create(
            provider=providers[account.provider],
            provider_user_id=account.uid,
            user_id=account.user_id,
            email=account.extra_data.get("email") or account.user.email,
        )
        LegacyAccount.objects.using(database).filter(pk=legacy.pk).update(
            created_at=account.date_joined,
            updated_at=account.last_login,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_socialaccount"),
        ("socialaccount", "0006_alter_socialaccount_extra_data"),
    ]

    operations = [
        migrations.RunPython(move_social_accounts, restore_social_accounts),
        migrations.DeleteModel(name="SocialAccount"),
    ]
