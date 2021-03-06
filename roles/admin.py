"""
Admin views for Roles
"""

from django.contrib import admin

from roles.models import Role


class RoleAdmin(admin.ModelAdmin):
    """ModelAdmin for Roles"""
    list_display = ('user', 'program', 'role', )

admin.site.register(Role, RoleAdmin)
