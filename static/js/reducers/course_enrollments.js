// @flow
import { POST } from '../constants';

export const courseEnrollmentsEndpoint = {
  name: 'courseEnrollments',
  checkNoSpinner: false,
  namespaceOnUsername: false,
  verbs: [POST],
  postUrl: '/api/v0/course_enrollments/',
  postOptions: (courseId: number) => ({
    method: POST,
    body: JSON.stringify({ course_id: courseId }),
  }),
};
