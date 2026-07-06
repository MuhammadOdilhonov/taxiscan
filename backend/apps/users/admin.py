from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("phone", "username", "first_name", "role", "city", "has_card", "is_active", "date_joined")
    list_filter = ("role", "city", "has_card", "is_active", "is_staff")
    search_fields = ("phone", "username", "first_name", "last_name")
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("phone", "username", "password")}),
        ("Shaxsiy", {"fields": ("first_name", "last_name", "avatar", "city")}),
        ("Rol", {"fields": ("role", "home_lat", "home_lng")}),
        ("To'lov", {"fields": ("has_card", "card_last4")}),
        ("Huquqlar", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Sanalar", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("phone", "username", "password1", "password2", "role"),
        }),
    )
