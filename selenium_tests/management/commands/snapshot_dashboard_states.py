"""Management command to take screenshots and save API results for dashboard states"""
# pylint: disable=redefined-outer-name,unused-argument
import itertools
import os
import sys
from urllib.parse import quote_plus
from selenium.webdriver.common.by import By
from faker.generator import random
import pytest

from django.core.management import (
    BaseCommand,
    call_command,
)
from django.db import connection
from django.test import override_settings
from django.contrib.auth.models import User

from courses.factories import CourseRunFactory
from courses.models import (
    Course,
    CourseRun,
    Program,
)
from dashboard.models import ProgramEnrollment
from ecommerce.models import (
    Coupon,
    UserCoupon,
)
from exams.factories import ExamRunFactory
from financialaid.factories import FinancialAidFactory
from financialaid.models import FinancialAidStatus
from grades.factories import ProctoredExamGradeFactory
from profiles.api import get_social_username
from roles.models import Role, Staff
from seed_data.management.commands.alter_data import EXAMPLE_COMMANDS
from selenium_tests.data_util import create_user_for_login
from selenium_tests.util import (
    DEFAULT_PASSWORD,
    DatabaseLoader,
    terminate_db_connections,
    should_load_from_existing_db,
)
from selenium_tests.page import LoginPage


# We need to have pytest skip DashboardStates when collecting tests to run, but we also want to run it as a test
# when invoked by this command so we can take advantage of Selenium and the test database infrastructure. This
# defaults the test to being skipped. When the management command runs it changes this flag to True to
# invoke the test.
RUNNING_DASHBOARD_STATES = False

# We are passing options via global variable because of the bizarre way this management command is structured. Since
# pytest is used to invoke the tests, we don't have a good way to pass options to it directly.
DASHBOARD_STATES_OPTIONS = None

DUMP_DIRECTORY = "output/dashboard_states"
SEEDED_BACKUP_DB_NAME = "backup_selenium_seeded_db"


def generate_alter_data_call(command):
    """Generates a function that will execute an alter_data command with certain arguments"""
    return lambda: call_command("alter_data", command.command, *command.args)


def bind_args(func, *args, **kwargs):
    """Helper function to bind the args to the closure"""
    return lambda: func(*args, **kwargs)


class DashboardStates:
    """Runs through each dashboard state taking a snapshot"""
    def __init__(self, user=None):
        """
        Args:
            user (User): A User
        """
        self.user = user

    def create_exams(self, edx_passed, exam_passed, new_offering):
        """Create an exam and mark it and the related course as passed or not passed"""
        if edx_passed:
            call_command(
                "alter_data", 'set_to_passed', '--username', 'staff',
                '--course-title', 'Analog Learning 200', '--grade', '75',
            )
        else:
            call_command(
                "alter_data", 'set_to_failed', '--username', 'staff',
                '--course-title', 'Analog Learning 200', '--grade', '45',
            )
        course = Course.objects.get(title='Analog Learning 200')
        exam_run = ExamRunFactory.create(course=course, eligibility_past=True, scheduling_past=True)
        for _ in range(2):
            ProctoredExamGradeFactory.create(
                user=self.user,
                course=course,
                exam_run=exam_run,
                passed=False,
            )
        ProctoredExamGradeFactory.create(
            user=self.user,
            course=course,
            exam_run=exam_run,
            passed=exam_passed,
        )
        if new_offering:
            CourseRunFactory.create(course=course)

    def with_prev_passed_run(self):
        """Add a passed run to a failed course. The course should then be passed"""
        call_command(
            "alter_data", 'set_to_failed', '--username', 'staff',
            '--course-title', 'Analog Learning 200', '--grade', '45',
        )
        call_command(
            "alter_data", 'set_past_run_to_passed', '--username', 'staff',
            '--course-title', 'Analog Learning 200',
        )

    def pending_enrollment(self):
        """
        Mark a course run as offered, then use the CyberSource redirect URL to view the pending enrollment status
        """
        run = CourseRun.objects.get(title='Analog Learning 100 - August 2015')
        call_command(
            'alter_data', 'set_to_offered', '--username', 'staff',
            '--course-run-title', 'Analog Learning 100 - August 2015',
        )
        run.refresh_from_db()
        return "/dashboard?status=receipt&course_key={}".format(quote_plus(run.edx_course_key))

    def contact_course(self):
        """Show a contact course team link"""
        call_command(
            "alter_data", 'set_to_passed', '--username', 'staff',
            '--course-title', 'Analog Learning 200', '--grade', '75',
        )
        course = Course.objects.get(title='Analog Learning 200')
        course.contact_email = 'example@example.com'
        course.save()

    def missed_payment_can_reenroll(self):
        """User has missed payment but they can re-enroll"""
        call_command(
            "alter_data", 'set_to_needs_upgrade', '--username', 'staff',
            '--course-title', 'Analog Learning 200', '--missed-deadline',
        )
        course = Course.objects.get(title='Analog Learning 200')
        CourseRunFactory.create(course=course)

    def with_coupon(self, amount_type, is_program, is_free):
        """Add a course-level coupon"""
        # Set up financial aid and use Digital Learning since coupons are only allowed for financial aid programs
        self.with_financial_aid(FinancialAidStatus.AUTO_APPROVED, True)

        course = Course.objects.get(title='Digital Learning 200')
        if is_program:
            content_object = course.program
        else:
            content_object = course

        if amount_type == Coupon.FIXED_DISCOUNT or amount_type == Coupon.FIXED_PRICE:
            amount = 50
        else:
            if is_free:
                amount = 1
            else:
                amount = 0.25

        coupon = Coupon.objects.create(
            content_object=content_object, coupon_type=Coupon.STANDARD, amount_type=amount_type, amount=amount,
        )
        UserCoupon.objects.create(user=self.user, coupon=coupon)

    def with_coupon_no_financial_aid_application(self):
        """Coupon without a financial aid application"""
        self.with_coupon(Coupon.PERCENT_DISCOUNT, True, False)
        self.user.financialaid_set.update(status=FinancialAidStatus.RESET)

    def with_coupon_pending_financial_aid(self):
        """Coupon with a non-terminal financial aid application"""
        self.with_coupon(Coupon.PERCENT_DISCOUNT, True, False)
        self.user.financialaid_set.update(status=FinancialAidStatus.PENDING_MANUAL_APPROVAL)

    def with_financial_aid(self, status, is_enrolled):
        """Set the status of user's financial aid"""
        if is_enrolled:
            call_command(
                "alter_data", 'set_to_needs_upgrade', '--username', 'staff', '--course-title', 'Digital Learning 200'
            )
        else:
            call_command(
                "alter_data", 'set_to_offered', '--username', 'staff', '--course-title', 'Digital Learning 200'
            )
        Program.objects.get(title='Analog Learning').delete()
        # We need to use Digital Learning here since it has financial aid enabled. Deleting Analog Learning
        # because it's simpler than adjusting the UI to show the right one
        program = Program.objects.get(title='Digital Learning')
        ProgramEnrollment.objects.create(user=self.user, program=program)
        FinancialAidFactory.create(
            user=self.user,
            status=status,
            tier_program__program=program,
            tier_program__discount_amount=50,
        )

    def __iter__(self):
        """
        Iterator over all dashboard states supported by this command.

        Yields:
            tuple of scenario_func, name:
                scenario_func is a function to make modifications to the database to produce a scenario
                name is the name of this scenario, to use with the filename
        """
        # Generate scenarios from all alter_data example commands
        yield from (
            (generate_alter_data_call(command), command.command) for command in EXAMPLE_COMMANDS
            # Complicated to handle, and this is the same as the previous command anyway
            if "--course-run-key" not in command.args and
            command.command not in ['course_info', 'clear_user_dashboard_data']
        )

        # Add scenarios for every combination of passed/failed course and exam
        for tup in itertools.product([True, False], repeat=3):
            edx_passed, exam_passed, is_offered = tup

            yield (
                bind_args(self.create_exams, edx_passed, exam_passed, is_offered),
                'create_exams_{edx_passed}_{exam_passed}{new_offering}'.format(
                    edx_passed='edx_✔' if edx_passed else 'edx_✖',
                    exam_passed='exam_✔' if exam_passed else 'exam_✖',
                    new_offering='_with_new_offering' if is_offered else '',
                ),
            )

        # Also test for two different passing and failed runs on the same course
        yield (self.with_prev_passed_run, 'failed_with_prev_passed_run')

        # Add scenarios for coupons
        coupon_scenarios = [
            (Coupon.FIXED_PRICE, True, False),
            (Coupon.FIXED_PRICE, False, False),
            (Coupon.FIXED_DISCOUNT, True, False),
            (Coupon.FIXED_DISCOUNT, False, False),
            (Coupon.PERCENT_DISCOUNT, True, False),
            (Coupon.PERCENT_DISCOUNT, False, False),
            (Coupon.PERCENT_DISCOUNT, True, True),
            (Coupon.PERCENT_DISCOUNT, False, True),
        ]
        yield from (
            (bind_args(self.with_coupon, *args), "coupon_{amount_type}_{program}_{free}".format(
                amount_type=args[0],
                program='program' if args[1] else 'course',
                free='free' if args[2] else 'not-free',
            ))
            for args in coupon_scenarios
        )

        # Other misc scenarios
        yield (self.with_coupon_no_financial_aid_application, 'with_coupon_no_financial_aid_application')
        yield (self.with_coupon_pending_financial_aid, 'with_coupon_pending_financial_aid')
        yield (self.pending_enrollment, 'pending_enrollment')
        yield (self.contact_course, 'contact_course')
        yield (self.missed_payment_can_reenroll, 'missed_payment_can_reenroll')

        # Financial aid statuses
        for status in FinancialAidStatus.ALL_STATUSES:
            for is_enrolled in (True, False):
                yield (
                    bind_args(self.with_financial_aid, status, is_enrolled),
                    'finaid_{status}{enrolled}'.format(
                        status=status,
                        enrolled="_needs_upgrade" if is_enrolled else "_offered",
                    )
                )


def make_filename(num, name, output_directory='', use_mobile=False):
    """Format the filename without extension for dashboard states"""
    return os.path.join(
        output_directory,
        "dashboard_state_{num:03d}_{command}{mobile}".format(
            num=num,
            command=name,
            mobile="_mobile" if use_mobile else "",
        )
    )


@pytest.fixture(scope="session")
def seeded_database_loader():
    """
    Fixture for a DatabaseLoader object. Using a different object than the fixture defined
    in selenium_tests/conftest.py because we don't want to overwrite the backup database used
    in the actual Selenium test suite.
    """
    return DatabaseLoader(db_backup_name=SEEDED_BACKUP_DB_NAME)


@pytest.fixture(scope="session")
def test_data(django_db_blocker, seeded_database_loader):
    """
    Fixture that creates a login-enabled test user and backs up a seeded database to be
    loaded in between dashboard states and cleaned up at the end of the test run.
    """
    user = None
    with django_db_blocker.unblock():
        with connection.cursor() as cur:
            load_from_existing_db = should_load_from_existing_db(seeded_database_loader, cur)
            if not load_from_existing_db:
                user = create_user_for_login(is_staff=True, username='staff')
                call_command("seed_db")
                # Analog Learning program enrollment is being created here because
                # no programs are enrolled in the initial data snapshot. Setting this enrollment
                # ensures that the user will see the Analog Learning program in the dashboard.
                # Right now we manually delete this enrollment in scenarios where we want the user
                # to see the Digital Learning dashboard.
                ProgramEnrollment.objects.create(
                    user=user,
                    program=Program.objects.get(title='Analog Learning')
                )
                seeded_database_loader.create_backup(db_cursor=cur)
    if load_from_existing_db:
        with django_db_blocker.unblock():
            terminate_db_connections()
        seeded_database_loader.load_backup()
        user = User.objects.get(username='staff')
    yield dict(user=user)


# pylint: disable=too-many-locals
@pytest.mark.skipif(
    'not RUNNING_DASHBOARD_STATES',
    reason='DashboardStates test suite is only meant to be run via management command',
)
def test_dashboard_states(browser, seeded_database_loader, django_db_blocker, test_data):
    """Iterate through all possible dashboard states and save screenshots/API results of each one"""
    output_directory = DASHBOARD_STATES_OPTIONS.get('output_directory')
    use_learner_page = DASHBOARD_STATES_OPTIONS.get('learner')
    os.makedirs(output_directory, exist_ok=True)
    use_mobile = DASHBOARD_STATES_OPTIONS.get('mobile')
    if use_mobile:
        browser.driver.set_window_size(480, 854)

    dashboard_states = DashboardStates(test_data['user'])
    dashboard_state_iter = enumerate(dashboard_states)
    match = DASHBOARD_STATES_OPTIONS.get('match')
    if match is not None:
        dashboard_state_iter = filter(
            lambda scenario: match in make_filename(scenario[0], scenario[1][1]),
            dashboard_state_iter
        )

    LoginPage(browser).log_in_via_admin(dashboard_states.user, DEFAULT_PASSWORD)
    for num, (run_scenario, name) in dashboard_state_iter:
        skip_screenshot = False
        with django_db_blocker.unblock():
            dashboard_states.user.refresh_from_db()
            if use_learner_page:
                for program in Program.objects.all():
                    Role.objects.create(role=Staff.ROLE_ID, user=dashboard_states.user, program=program)
            filename = make_filename(num, name, output_directory=output_directory, use_mobile=use_mobile)
            new_url = run_scenario()
            if new_url is None:
                if use_learner_page:
                    new_url = '/learner'
                else:
                    new_url = '/dashboard'
            elif use_learner_page:
                # the new_url is only for the dashboard page, skip
                skip_screenshot = True
            if not skip_screenshot:
                browser.get(new_url)
                browser.store_api_results(
                    get_social_username(dashboard_states.user),
                    filename=filename
                )
                if use_learner_page:
                    browser.wait_until_loaded(By.CLASS_NAME, 'user-page')
                else:
                    browser.wait_until_loaded(By.CLASS_NAME, 'course-list')
                browser.take_screenshot(filename=filename)
        with django_db_blocker.unblock():
            terminate_db_connections()
        seeded_database_loader.load_backup()


class Command(BaseCommand):
    """
    Take screenshots and save API results for dashboard states
    """
    help = "Take screenshots and save API results for dashboard states"

    def add_arguments(self, parser):
        parser.add_argument(
            "--match",
            dest="match",
            help="Runs only scenarios matching the given string",
            required=False,
        )
        parser.add_argument(
            "--create-db",
            dest="create_db",
            action='store_true',
            help="Passes the --create-db flag to py.test, guaranteeing a fresh database",
            required=False,
        )
        parser.add_argument(
            "--list-scenarios",
            dest="list_scenarios",
            action='store_true',
            help="List scenario names and exit",
            required=False
        )
        parser.add_argument(
            "--mobile",
            dest="mobile",
            action='store_true',
            help="Take screenshots with a smaller width as if viewed with a mobile device",
            required=False,
        )
        parser.add_argument(
            "--learner",
            dest="learner",
            action="store_true",
            help="Take screenshots of /learner instead",
            required=False,
        )
        parser.add_argument(
            "--output",
            dest="output_directory",
            default=DUMP_DIRECTORY,
            help="The output directory to put the files in",
            required=False,
        )

    def handle(self, *args, **options):
        random.seed(12345)
        if options.get('list_scenarios'):
            self.stdout.write('Scenarios:\n')
            for num, (_, name) in enumerate(DashboardStates()):
                self.stdout.write("  {:03}_{}\n".format(num, name))
            return

        os.environ['DJANGO_LIVE_TEST_SERVER_ADDRESS'] = '0.0.0.0:7000-8000'
        if not os.environ.get('WEBPACK_DEV_SERVER_HOST'):
            # This should only happen if the user is running in an environment without Docker, which isn't allowed
            # for this command.
            raise Exception('Missing environment variable WEBPACK_DEV_SERVER_HOST.')

        if os.environ.get('RUNNING_SELENIUM') != 'true':
            raise Exception(
                "This management command must be run with ./scripts/test/run_snapshot_dashboard_states.sh"
            )

        # We need to use pytest here instead of invoking the tests directly so that the test database
        # is used. Using override_settings(DATABASE...) causes a warning message and is not reliable.
        global RUNNING_DASHBOARD_STATES  # pylint: disable=global-statement
        RUNNING_DASHBOARD_STATES = True
        global DASHBOARD_STATES_OPTIONS  # pylint: disable=global-statement
        DASHBOARD_STATES_OPTIONS = options

        with override_settings(
            ELASTICSEARCH_INDEX='testindex',
        ):
            pytest_args = ["{}::test_dashboard_states".format(__file__), "-s"]
            if options.get('create_db'):
                pytest_args.append('--create-db')
            sys.exit(pytest.main(args=pytest_args))
