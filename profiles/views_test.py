"""
Tests for profile view
"""
import json
from mock import patch

from dateutil.parser import parse
from django.core.urlresolvers import resolve, reverse
from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals
from rest_framework.status import (
    HTTP_405_METHOD_NOT_ALLOWED,
)

from profiles.factories import ProfileFactory, UserFactory
from profiles.models import Profile
from profiles.permissions import CanEditIfOwner
from profiles.serializers import (
    ProfileLimitedSerializer,
    ProfilePrivateSerializer,
    ProfileSerializer,
)
from profiles.views import ProfileViewSet


class ProfileTests(TestCase):
    """
    Tests for GET on profile view
    """

    def setUp(self):
        """
        Create a user and profile
        """
        super(ProfileTests, self).setUp()

        with mute_signals(post_save):
            self.user1 = UserFactory.create()
        self.url1 = reverse('profile-detail', kwargs={'user': self.user1.username})

        with mute_signals(post_save):
            self.user2 = UserFactory.create()
        self.url2 = reverse('profile-detail', kwargs={'user': self.user2.username})

    def test_viewset(self):
        """
        Assert that the URL links up with the viewset
        """
        view = resolve(self.url1)
        assert view.func.cls is ProfileViewSet

    def test_permissions(self):  # pylint: disable=no-self-use
        """
        Assert that we set permissions correctly
        """
        # Users can only edit their own profile
        assert CanEditIfOwner in ProfileViewSet.permission_classes

    def test_check_object_permissions(self):
        """
        Make sure check_object_permissions is called at some point so the permissions work correctly
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user1)
        self.client.force_login(self.user1)

        with patch.object(ProfileViewSet, 'check_object_permissions', autospec=True) as check_object_permissions:
            self.client.get(self.url1)
        assert check_object_permissions.called

    def test_get_own_profile(self):
        """
        Get a user's own profile. This should work no matter what setting is in
        account_privacy.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user1)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url1)
        assert resp.json() == ProfileSerializer().to_representation(profile)

    def test_anonym_user_get_public_profile(self):
        """
        An anonymous user gets another user's public profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC)
        self.client.logout()
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_mm_user_get_public_profile(self):
        """
        An unverified mm user gets another user's public profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_vermm_user_get_public_profile(self):
        """
        A verified mm user gets another user's public profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_anonym_user_get_public_to_mm_profile(self):
        """
        An anonymous user gets user's public_to_mm profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC_TO_MM)
        self.client.logout()
        resp = self.client.get(self.url2)
        assert resp.json() == ProfilePrivateSerializer().to_representation(profile)

    def test_mm_user_get_public_to_mm_profile(self):
        """
        An unverified mm user gets user's public_to_mm profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC_TO_MM)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfilePrivateSerializer().to_representation(profile)

    def test_vermm_user_get_public_to_mm_profile(self):
        """
        A verified mm user gets  user's public_to_mm profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC_TO_MM)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_anonym_user_get_private_profile(self):
        """
        An anonymous user gets user's private profile
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
        self.client.logout()
        resp = self.client.get(self.url2)
        assert resp.json() == ProfilePrivateSerializer().to_representation(profile)

    def test_mm_user_get_private_profile(self):
        """
        An unverified mm user gets user's private profile
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfilePrivateSerializer().to_representation(profile)

    def test_vermm_user_get_private_profile(self):
        """
        A verified mm user gets user's private profile
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfilePrivateSerializer().to_representation(profile)

    def test_weird_privacy_get_private_profile(self):
        """
        If a user profile has a weird profile setting, it defaults to private
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy='weird_setting')
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfilePrivateSerializer().to_representation(profile)

    def test_patch_own_profile(self):
        """
        A user PATCHes their own profile
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user1)
        self.client.force_login(self.user1)

        new_profile = ProfileFactory.build()
        patch_data = ProfileSerializer().to_representation(new_profile)

        resp = self.client.patch(self.url1, content_type="application/json", data=json.dumps(patch_data))
        assert resp.status_code == 200

        old_profile = Profile.objects.get(user__username=self.user1.username)
        for key, value in patch_data.items():
            if key in ("username", "filled_out", "pretty_printed_student_id",
                       "work_history", "education", ):
                # these fields are readonly
                continue
            elif key == "date_of_birth":
                assert getattr(old_profile, key) == parse(value).date()
            else:
                assert getattr(old_profile, key) == value

    def test_forbidden_methods(self):
        """
        POST is not implemented.
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user1)
        self.client.force_login(self.user1)
        assert self.client.post(self.url1).status_code == HTTP_405_METHOD_NOT_ALLOWED
