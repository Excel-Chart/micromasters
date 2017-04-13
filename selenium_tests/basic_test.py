"""Basic selenium tests for MicroMasters"""
from django.conf import settings
from django.db.models.signals import post_save
from factory.django import mute_signals
from selenium.webdriver.common.keys import Keys

from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from roles.models import (
    Staff,
    Role,
)
from search.indexing_api import index_program_enrolled_users
from selenium_tests.base import SeleniumTestsBase


class BasicTests(SeleniumTestsBase):
    """Basic selenium tests for MicroMasters"""

    def test_zero_price_purchase(self):
        """
        Do a $0 purchase using a 100% off program-level coupon
        """
        self.login_via_admin(self.user)
        self.get(self.live_server_url)

        # Click the dashboard link on the upper right of the homepage
        self.selenium.find_element_by_class_name("header-dashboard-link").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("enroll-button"))
        self.assert_console_logs()
        # Click the Enroll Now button on dashboard
        self.selenium.find_element_by_class_name("enroll-button").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("continue-payment"))

        # Click back then click the enroll now button again to assert back button behavior
        self.selenium.back()
        self.wait().until(lambda driver: driver.find_element_by_class_name("enroll-button"))
        self.selenium.find_element_by_class_name("enroll-button").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("continue-payment"))
        self.assert_console_logs()

        # Click 'Continue' on the order summary page
        self.selenium.find_element_by_class_name("continue-payment").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("description"))
        # Assert that the purchase went through fine but enrolling in edX failed
        # Which makes sense since there is no edX for these tests
        assert self.selenium.find_element_by_css_selector(".course-action .description").text == (
            "Something went wrong. You paid for this course but are not enrolled. Contact us for help."
        )
        self.assert_console_logs()

    def learner_setup(self):
        """
        Do setup common to learner tests.
        Ideally this should be moved to a setUp of its own test class or into a pytest fixture
        but that requires some refactoring.
        """
        # Create a second program that we aren't viewing users from other programs
        other_program = ProgramFactory.create(live=True)

        for program in [self.program, other_program]:
            Role.objects.create(
                user=self.user,
                program=program,
                role=Staff.ROLE_ID,
            )

        page_size = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        with mute_signals(post_save):
            # Create enough profiles for two pages, but make the second page slightly smaller than the first
            # So we can assert that we're on the second page by counting the results
            for i in range((page_size * 2) - 5):
                user = self.create_user()
                ProgramEnrollment.objects.create(program=self.program, user=user)

                if i % 2 == 0:
                    # Half the users are also enrolled in the other program
                    ProgramEnrollment.objects.create(program=other_program, user=user)
                else:
                    # The other half don't overlap
                    ProgramEnrollment.objects.create(
                        program=other_program,
                        user=self.create_user(),
                    )

        other_program = ProgramFactory.create(live=True)
        ProgramEnrollment.objects.create(
            user=self.user,
            program=other_program,
        )

        # Update for new users and new role
        index_program_enrolled_users(ProgramEnrollment.objects.iterator())
        self.login_via_admin(self.user)

    def test_learners(self):
        """
        Learners page should contain the appropriate number of items on each page
        """
        self.learner_setup()
        self.get(self.live_server_url)

        self.get("{}/learners".format(self.live_server_url))
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))
        page_size = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        assert self.num_elements_on_page('.learner-result') == page_size
        self.selenium.find_elements_by_class_name('sk-pagination-option')[1].click()

        def verify_num_elements(driver):
            """Verify that second page has 5 less elements"""
            actual_size = self.num_elements_on_page('.learner-result', driver=driver)
            return actual_size == page_size - 5
        self.wait().until(verify_num_elements)

    def test_react_router(self):
        """Go to profile and back to learners to verify that nothing breaks"""
        self.learner_setup()
        self.get("{}/learners".format(self.live_server_url))
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))

        self.selenium.find_element_by_class_name("menu-icon").click()
        self.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name("nav-drawer").get_attribute("class")
        )
        profile_link_selector = ".nav-drawer a[href='/learner/{username}']".format(
            username=self.edx_username,
        )
        self.selenium.find_element_by_css_selector(profile_link_selector).click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("user-page"))

        # Go back to learners
        self.selenium.find_element_by_class_name("menu-icon").click()
        self.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name("nav-drawer").get_attribute("class")
        )
        self.selenium.find_element_by_css_selector("a[href='/learners']").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))

    def test_query_string_preserved(self):
        """The querystring should not be affected"""
        self.learner_setup()
        self.get("{}/learners/?q=xyz".format(self.live_server_url))
        self.wait().until(lambda driver: driver.find_element_by_class_name('search-grid'))

        assert self.num_elements_on_page('.learner-result') == 0
        assert self.selenium.current_url.endswith('/learners/?q=xyz')

    def test_switch_program(self):
        """Switching programs should clear facets and show a different set of users"""
        self.learner_setup()
        self.get("{}/learners".format(self.live_server_url))
        self.wait().until(lambda driver: driver.find_element_by_class_name('search-grid'))

        assert self.num_elements_on_page('.learner-result') == settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE

        switcher = self.selenium.find_element_by_css_selector('.micromasters-header .Select-input')
        switcher.send_keys(Keys.DOWN)
        switcher.send_keys(Keys.ENTER)
        self.wait().until(lambda driver: driver.find_element_by_class_name('.result-info span').text == '0 Results')
