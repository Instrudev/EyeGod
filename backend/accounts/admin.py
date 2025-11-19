from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "name", "role", "is_active")
    fieldsets = (
        (None, {"fields": ("email", "password", "name", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "name", "password1", "password2", "role", "is_staff", "is_superuser"),
        }),
    )
    search_fields = ("email", "name")

    def get_form(self, request, obj=None, **kwargs):
        self.exclude = ("username",)
        return super().get_form(request, obj, **kwargs)
