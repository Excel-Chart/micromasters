// @flow
import { assert } from 'chai';
import moment from 'moment';

import { makeCourse, makeRun } from '../../../factories/dashboard';
import {
  courseStartDateMessage,
  hasPearsonExam,
  userIsEnrolled,
  courseCurrentlyInProgress,
  hasPaidForAnyCourseRun,
  isPassedOrMissedDeadline,
  courseUpcomingOrCurrent,
  hasFailedCourseRun,
  futureEnrollableRun,
  hasEnrolledInAnyRun,
  hasPassedCourseRun,
} from './util';
import {
  STATUS_PASSED,
  STATUS_NOT_PASSED,
  STATUS_OFFERED,
  STATUS_CAN_UPGRADE,
  STATUS_CURRENTLY_ENROLLED,
  STATUS_WILL_ATTEND,
  STATUS_PENDING_ENROLLMENT,
  STATUS_MISSED_DEADLINE,
  STATUS_PAID_BUT_NOT_ENROLLED,
  COURSE_CARD_FORMAT,
} from '../../../constants';
import { assertIsNothing, assertIsJust } from '../../../lib/test_utils';

describe('dashboard course utilities', () => {
  describe('courseStartDateMessage', () => {
    let run;

    beforeEach(() => {
      run = makeRun(0);
    });

    it('should show start date, if >10 days away', () => {
      [10, 11, 15].forEach(days => {
        let inTheFuture = moment()
          .add(days, 'days')
          .add(10, 'minutes');
        run.course_start_date = inTheFuture.format();
        assert.equal(
          courseStartDateMessage(run),
          `Course starts ${inTheFuture.format(COURSE_CARD_FORMAT)}`
        );
      });
    });

    it('should count down the days, if <10 days away', () => {
      let aBitInTheFuture = moment().add(8, 'days');
      run.course_start_date = aBitInTheFuture.format();
      assert.equal(
        courseStartDateMessage(run),
        'Course starts in 7 days'
      );
    });

    it('should say "today", if the course starts today', () => {
      run.course_start_date = moment().format();
      assert.equal(
        courseStartDateMessage(run),
        "Course starts today"
      );
    });

    it('should say "started" if the course already started', () => {
      run.course_start_date = moment()
        .subtract(2, 'days')
        .format();
      assert(
        courseStartDateMessage(run).startsWith("Course started")
      );
    });

    it('should return an empty string if there is no course start date', () => {
      [null, undefined].forEach(nilVal => {
        run.course_start_date = nilVal;
        assert.equal(courseStartDateMessage(run), "");
      });
    });
  });

  describe('hasPearsonExam', () => {
    it('should check the has_exam property', () => {
      let course = makeCourse(0);
      [true, false].forEach(bool => {
        course.has_exam = bool;
        assert.equal(bool, hasPearsonExam(course));
      });
    });
  });

  describe('userIsEnrolled', () => {
    it('should check if the course run is currently in progress', () => {
      let run = makeRun(0);
      [
        STATUS_OFFERED,
        STATUS_PENDING_ENROLLMENT,
        STATUS_PAID_BUT_NOT_ENROLLED,
      ].forEach(unenrolledStatus => {
        run.status = unenrolledStatus;
        assert.isFalse(userIsEnrolled(run));
      });
      [
        STATUS_PASSED,
        STATUS_NOT_PASSED,
        STATUS_WILL_ATTEND,
        STATUS_CAN_UPGRADE,
        STATUS_CURRENTLY_ENROLLED,
        STATUS_MISSED_DEADLINE,
      ].forEach(enrolledStatus => {
        run.status = enrolledStatus;
        assert.isTrue(userIsEnrolled(run));
      });
    });
  });

  describe('courseCurrentlyInProgress', () => {
    let run;

    beforeEach(() => {
      run = makeRun(0);
    });

    it('should return true if the start date passed and the end date is in the future', () => {
      run.course_start_date = moment().subtract(5, 'days').format();
      run.course_end_date = moment().add(5, 'days').format();
      assert.isTrue(courseCurrentlyInProgress(run));
    });

    it('should return true for a future course run', () => {
      run.course_start_date = moment().add(5, 'days').format();
      run.course_end_date = moment().add(25, 'days').format();
      assert.isFalse(courseCurrentlyInProgress(run));
    });

    it('should return false for a past course run', () => {
      run.course_start_date = moment().add(5, 'days').format();
      run.course_end_date = moment().add(25, 'days').format();
      assert.isFalse(courseCurrentlyInProgress(run));      
    });
  });

  describe('courseUpcomingOrCurrent', () => {
    let run;

    beforeEach(() => {
      run = makeRun(0);
    });

    it('should return true if the end date is after the current time', () => {
      run.course_end_date = moment().add(5, 'days').format();
      assert.isTrue(courseUpcomingOrCurrent(run));
    });

    it('should return false otherwise', () => {
      run.course_end_date = moment().subtract(5, 'days').format();
      assert.isFalse(courseUpcomingOrCurrent(run));
    });
  });

  describe('hasPaidForAnyCourseRun', () => {
    let course;

    beforeEach(() => {
      course = makeCourse(0);
    });

    it('should return false if the user has not paid for any runs', () => {
      course.runs.forEach(run => run.has_paid = false);
      assert.isFalse(hasPaidForAnyCourseRun(course));
    });

    it('should return true if the user has paid for at least one run', () => {
      course.runs[0].has_paid = true;
      assert.isTrue(hasPaidForAnyCourseRun(course));
    });
  });

  describe('isPassedOrMissedDeadline', () => {
    let run;

    beforeEach(() => {
      run = makeRun(0);
    });

    it('should return true if status is PASSED or MISSED_DEADLINE', () => {
      [STATUS_PASSED, STATUS_MISSED_DEADLINE].forEach(status => {
        run.status = status;
        assert.isTrue(isPassedOrMissedDeadline(run));
      });
    });

    it('should return false otherwise', () => {
      [
        STATUS_NOT_PASSED,
        STATUS_OFFERED,
        STATUS_CAN_UPGRADE,
        STATUS_CURRENTLY_ENROLLED,
        STATUS_WILL_ATTEND,
        STATUS_PENDING_ENROLLMENT,
        STATUS_PAID_BUT_NOT_ENROLLED,
      ].forEach(status => {
        run.status = status;
        assert.isFalse(isPassedOrMissedDeadline(run));
      });
    });
  });

  describe('hasFailedCourseRun', () => {
    let course;

    beforeEach(() => {
      course = makeCourse(0);
    });

    it('should return true if there is a failed course run', () => {
      course.runs[0].status = STATUS_NOT_PASSED;
      assert.isTrue(hasFailedCourseRun(course));
    });

    it('should return false otherwise', () => {
      assert.isFalse(hasFailedCourseRun(course));
    });
  });

  describe('hasPassedCourseRun', () => {
    let course;

    beforeEach(() => {
      course = makeCourse(0);
    });

    it('should return true if there is a passed course run', () => {
      course.runs[0].status = STATUS_PASSED;
      assert.isTrue(hasPassedCourseRun(course));
    });

    it('should return false otherwise', () => {
      assert.isFalse(hasPassedCourseRun(course));
    });
  });

  describe('futureEnrollableRun', () => {
    let course;
    beforeEach(() => {
      course = makeCourse(0);
    });

    it('returns Nothing if there are no future runs', () => {
      course.runs = [];
      assertIsNothing(futureEnrollableRun(course));
    });

    it('returns Nothing if future runs are not OFFERRED', () => {
      course.runs[1].status = STATUS_CURRENTLY_ENROLLED;
      assertIsNothing(futureEnrollableRun(course));
    });

    it('returns Just(run) if the future run is offerred', () => {
      assertIsJust(futureEnrollableRun(course), course.runs[1]);
    });
  });

  describe('hasEnrolledInAnyRun', () => {
    let course;

    beforeEach(() => {
      course = makeCourse(0);
    });

    it('should return true if the user has enrolled in any course run', () => {
      [
        STATUS_PASSED,
        STATUS_NOT_PASSED,
        STATUS_CAN_UPGRADE,
        STATUS_CURRENTLY_ENROLLED,
        STATUS_WILL_ATTEND,
        STATUS_MISSED_DEADLINE,
      ].forEach(status => {
        course.runs[1].status = status;
        assert.isTrue(hasEnrolledInAnyRun(course));
      });
    });

    it('should return false if there are no course run', () => {
      course.runs = [];
      assert.isFalse(hasEnrolledInAnyRun(course));
    });

    it('should return false if the user has never enrolled', () => {
      assert.isFalse(hasEnrolledInAnyRun(course));
    });
  });
});
