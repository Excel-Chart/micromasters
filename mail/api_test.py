"""
Test cases for email API
"""
import json
import string
from unittest.mock import Mock, patch

from ddt import ddt, data
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.test import override_settings
from factory.django import mute_signals
from requests import Response
from rest_framework.status import HTTP_200_OK

from dashboard.models import ProgramEnrollment
from courses.factories import CourseFactory
from ecommerce.factories import CoursePriceFactory
from financialaid.factories import FinancialAidFactory
from mail.api import MailgunClient
from mail.models import FinancialAidEmailAudit
from mail.views_test import mocked_json
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase

# pylint: disable=no-self-use


@ddt
@patch('requests.post')
class MailAPITests(MockedESTestCase):
    """
    Tests for the Mailgun client class
    """
    batch_recipient_arg = ['a@example.com', 'b@example.com']
    individual_recipient_arg = 'a@example.com'

    @override_settings(EMAIL_SUPPORT='mailgun_from_email@example.com')
    @data(None, 'Tester')
    def test_from_address(self, sender_name, mock_post):
        """
        Test that the 'from' address for our emails is set correctly
        """
        MailgunClient.send_bcc(
            'email subject',
            'email body',
            ['will_be_ignored@example.com'],
            sender_name=sender_name
        )
        _, called_kwargs = mock_post.call_args
        if sender_name is not None:
            self.assertEqual(
                called_kwargs['data']['from'],
                '{sender_name} <mailgun_from_email@example.com>'.format(sender_name=sender_name)
            )
        else:
            assert called_kwargs['data']['from'] == 'mailgun_from_email@example.com'

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE='override@example.com')
    def test_email_override(self, mock_post):
        """
        Test that an email override value will be used over recipients specified
        in MailgunClient.send_bcc
        """
        MailgunClient.send_bcc('email subject', 'email body', ['a@example.com', 'b@example.com'])
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['bcc'] == 'override@example.com'

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_no_email_override(self, mock_post):
        """
        Test that recipients passed to MailgunClient.send_bcc will be used when no email
        override exists
        """
        MailgunClient.send_bcc('email subject', 'email body', ['a@example.com', 'b@example.com'])
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['bcc'] == 'a@example.com,b@example.com'

    @data(None, 'Tester')
    def test_send_bcc(self, sender_name, mock_post):
        """
        Test that MailgunClient.send_bcc sends expected parameters to the Mailgun API
        """
        MailgunClient.send_bcc(
            'email subject',
            'email body',
            ['a@example.com', 'b@example.com'],
            sender_name=sender_name
        )
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == settings.MAILGUN_BCC_TO_EMAIL
        if sender_name is not None:
            self.assertEqual(
                called_kwargs['data']['from'],
                "{sender_name} <{email}>".format(sender_name=sender_name, email=settings.EMAIL_SUPPORT)
            )
        else:
            self.assertEqual(called_kwargs['data']['from'], settings.EMAIL_SUPPORT)

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    @data(None, 'Tester')
    def test_send_batch(self, sender_name, mock_post):
        """
        Test that MailgunClient.send_batch sends expected parameters to the Mailgun API
        Base case with only one batch call to the Mailgun API.
        """
        emails_to = ['a@example.com', 'b@example.com']
        MailgunClient.send_batch('email subject', 'email body', emails_to, sender_name=sender_name)
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == emails_to
        assert called_kwargs['data']['recipient-variables'] == json.dumps(
            {email: {} for email in emails_to}
        )
        if sender_name is not None:
            self.assertEqual(
                called_kwargs['data']['from'],
                "{sender_name} <{email}>".format(sender_name=sender_name, email=settings.EMAIL_SUPPORT)
            )
        else:
            self.assertEqual(called_kwargs['data']['from'], settings.EMAIL_SUPPORT)

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch_chunk(self, mock_post):
        """
        Test that MailgunClient.send_batch chunks recipients
        """
        chunk_size = 10
        emails_to = ["{0}@example.com".format(letter) for letter in string.ascii_letters]
        chuncked_emails_to = [emails_to[i:i + chunk_size] for i in range(0, len(emails_to), chunk_size)]
        assert len(emails_to) == 52
        MailgunClient.send_batch('email subject', 'email body', emails_to, chunk_size=chunk_size)
        assert mock_post.called
        assert mock_post.call_count == 6
        for call_num, args in enumerate(mock_post.call_args_list):
            called_args, called_kwargs = args
            assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
            assert called_kwargs['data']['text'].startswith('email body')
            assert called_kwargs['data']['subject'] == 'email subject'
            assert called_kwargs['data']['to'] == chuncked_emails_to[call_num]
            assert called_kwargs['data']['recipient-variables'] == json.dumps(
                {email: {} for email in chuncked_emails_to[call_num]}
            )

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    @data(None, 'Tester')
    def test_send_individual_email(self, sender_name, mock_post):
        """
        Test that MailgunClient.send_individual_email() sends an individual message
        """
        MailgunClient.send_individual_email(
            subject='email subject',
            body='email body',
            recipient='a@example.com',
            sender_name=sender_name
        )
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == ['a@example.com']
        if sender_name is not None:
            self.assertEqual(
                called_kwargs['data']['from'],
                "{sender_name} <{email}>".format(sender_name=sender_name, email=settings.EMAIL_SUPPORT)
            )
        else:
            self.assertEqual(called_kwargs['data']['from'], settings.EMAIL_SUPPORT)

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_with_sender_address(self, mock_post):
        """
        Test that specifying a sender address in our mail API functions will result in an email
        with the sender address in the 'from' field
        """
        sender_address = 'sender@example.com'
        MailgunClient.send_batch(
            'email subject', 'email body', self.batch_recipient_arg, sender_address=sender_address
        )
        MailgunClient.send_individual_email(
            'email subject', 'email body', self.individual_recipient_arg, sender_address=sender_address
        )
        for args in mock_post.call_args_list:
            _, called_kwargs = args
            assert called_kwargs['data']['from'] == sender_address


@patch('requests.post')
class FinancialAidMailAPITests(MockedESTestCase):
    """
    Tests for the Mailgun client class for financial aid
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.staff_user_profile = ProfileFactory.create()
        cls.course_price = CoursePriceFactory.create(
            is_valid=True
        )
        cls.financial_aid = FinancialAidFactory.create()
        cls.tier_program = cls.financial_aid.tier_program
        cls.tier_program.program = cls.course_price.course_run.course.program
        cls.tier_program.save()
        cls.program_enrollment = ProgramEnrollment.objects.create(
            user=cls.financial_aid.user,
            program=cls.tier_program.program
        )

    def setUp(self):
        self.financial_aid.refresh_from_db()

    @override_settings(
        EMAIL_SUPPORT='mailgun_from_email@example.com',
        MAILGUN_RECIPIENT_OVERRIDE=None
    )
    def test_financial_aid_email(self, mock_post):
        """
        Test that MailgunClient.send_financial_aid_email() sends an individual message
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_200_OK,
            json=mocked_json()
        )
        assert FinancialAidEmailAudit.objects.count() == 0
        MailgunClient.send_financial_aid_email(
            self.staff_user_profile.user,
            self.financial_aid,
            'email subject',
            'email body'
        )
        # Check method call
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'] == 'email body'
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == [self.financial_aid.user.email]
        assert called_kwargs['data']['from'] == settings.EMAIL_SUPPORT
        # Check audit creation
        assert FinancialAidEmailAudit.objects.count() == 1
        audit = FinancialAidEmailAudit.objects.first()
        assert audit.acting_user == self.staff_user_profile.user
        assert audit.financial_aid == self.financial_aid
        assert audit.to_email == self.financial_aid.user.email
        assert audit.from_email == settings.EMAIL_SUPPORT
        assert audit.email_subject == 'email subject'
        assert audit.email_body == 'email body'

    @override_settings(
        EMAIL_SUPPORT='mailgun_from_email@example.com',
        MAILGUN_RECIPIENT_OVERRIDE=None
    )
    def test_financial_aid_email_with_blank_subject_and_body(self, mock_post):
        """
        Test that MailgunClient.send_financial_aid_email() sends an individual message
        with blank subject and blank email, and that the audit record saves correctly
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_200_OK,
            json=mocked_json()
        )
        assert FinancialAidEmailAudit.objects.count() == 0
        MailgunClient.send_financial_aid_email(
            self.staff_user_profile.user,
            self.financial_aid,
            '',
            ''
        )
        # Check method call
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'] == ''
        assert called_kwargs['data']['subject'] == ''
        assert called_kwargs['data']['to'] == [self.financial_aid.user.email]
        assert called_kwargs['data']['from'] == settings.EMAIL_SUPPORT
        # Check audit creation
        assert FinancialAidEmailAudit.objects.count() == 1
        audit = FinancialAidEmailAudit.objects.first()
        assert audit.acting_user == self.staff_user_profile.user
        assert audit.financial_aid == self.financial_aid
        assert audit.to_email == self.financial_aid.user.email
        assert audit.from_email == settings.EMAIL_SUPPORT
        assert audit.email_subject == ''
        assert audit.email_body == ''


@patch('requests.post')
class CourseTeamMailAPITests(MockedESTestCase):
    """
    Tests for course team contact functionality in the Mailgun client class
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.user_profile = ProfileFactory.create()
        cls.user = cls.user_profile.user

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_course_team_email(self, mock_post):
        """
        Tests that a course team contact email is sent correctly
        """
        course_with_email = CourseFactory.create(title='course with email', contact_email='course@example.com')
        MailgunClient.send_course_team_email(
            self.user,
            course_with_email,
            'email subject',
            'email body'
        )
        assert mock_post.called
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['text'] == 'email body'
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == [course_with_email.contact_email]
        self.assertEqual(
            called_kwargs['data']['from'],
            '{} <{}>'.format(self.user_profile.display_name, self.user.email)
        )

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_to_course_team_without_email(self, mock_post):
        """
        Tests that an attempt to send an email to a course with no contact email will fail
        """
        course_no_email = CourseFactory.create(title='course no email', contact_email=None)
        with self.assertRaises(ImproperlyConfigured) as ex:
            MailgunClient.send_course_team_email(
                self.user,
                course_no_email,
                'email subject',
                'email body'
            )
        assert ex.exception.args[0].startswith('Course team contact email attempted')
        assert not mock_post.called
