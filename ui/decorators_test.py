"""
Decorator tests
"""

from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals

from profiles.factories import ProfileFactory
from ui.urls import (
    DASHBOARD_URL,
    TERMS_OF_SERVICE_URL,
)


class DecoratorTests(TestCase):
    """
    Decorator tests for UI views
    """

    def test_redirect_to_terms_of_service(self):
        """
        If user has not filled out terms of service and they access the dashboard,
        they should be redirected to /terms_of_service
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(agreed_to_terms_of_service=False)
        self.client.force_login(profile.user)

        resp = self.client.get(DASHBOARD_URL)
        self.assertRedirects(resp, TERMS_OF_SERVICE_URL)

    def test_no_redirect_to_terms_of_service(self):
        """
        If user is going to /terms_of_service anyway, don't redirect them
        """

        with mute_signals(post_save):
            profile = ProfileFactory.create(agreed_to_terms_of_service=False)
        self.client.force_login(profile.user)

        resp = self.client.get(TERMS_OF_SERVICE_URL)
        assert resp.status_code == 200

    def test_no_redirect(self):
        """
        If user has agreed to terms of service, don't redirect them
        """

        with mute_signals(post_save):
            profile = ProfileFactory.create(agreed_to_terms_of_service=True)
        self.client.force_login(profile.user)

        resp = self.client.get(DASHBOARD_URL)
        assert resp.status_code == 200