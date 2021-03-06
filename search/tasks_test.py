"""Tests for search tasks"""
from dashboard.factories import ProgramEnrollmentFactory
from django.test import override_settings
from search.base import MockedESTestCase
from search.indexing_api import get_default_alias
from search.tasks import (
    index_users,
    index_program_enrolled_users,
)


FAKE_INDEX = 'fake'


@override_settings(ELASTICSEARCH_INDEX=FAKE_INDEX)
class SearchTasksTests(MockedESTestCase):
    """
    Tests for search tasks
    """

    def setUp(self):
        super().setUp()

        for mock in self.patcher_mocks:
            if mock.name == "_index_users":
                self.index_users_mock = mock
            elif mock.name == "_index_program_enrolled_users":
                self.index_program_enrolled_users_mock = mock
            elif mock.name == "_send_automatic_emails":
                self.send_automatic_emails_mock = mock
            elif mock.name == "_refresh_index":
                self.refresh_index_mock = mock

    def test_index_users(self):
        """
        When we run the index_users task we should index user's program enrollments and send them automatic emails
        """
        enrollment1 = ProgramEnrollmentFactory.create()
        enrollment2 = ProgramEnrollmentFactory.create(user=enrollment1.user)
        index_users([enrollment1.user.id])
        self.index_users_mock.assert_called_with([enrollment1.user.id])
        for enrollment in [enrollment1, enrollment2]:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
        self.refresh_index_mock.assert_called_with(get_default_alias())

    def test_index_program_enrolled_users(self):
        """
        When we run the index_program_enrolled_users task we should index them and send them automatic emails
        """
        enrollments = [ProgramEnrollmentFactory.create() for _ in range(2)]
        enrollment_ids = [enrollment.id for enrollment in enrollments]
        index_program_enrolled_users(enrollment_ids)
        assert list(
            self.index_program_enrolled_users_mock.call_args[0][0].values_list('id', flat=True)
        ) == enrollment_ids
        for enrollment in enrollments:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
        self.refresh_index_mock.assert_called_with(get_default_alias())
