// @flow
/* global SETTINGS: false */
import { assert } from 'chai';

import IntegrationTestHelper from '../util/integration_test_helper';
import { actions } from '../lib/redux_rest.js';
import * as api from '../lib/api';
import { GET_AUTOMATIC_EMAILS_RESPONSE } from '../test_constants';
import { DASHBOARD_SUCCESS_ACTIONS } from './test_util';
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
} from '../actions/profile';
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
} from '../actions/programs';
import Spinner from 'react-mdl/lib/Spinner';

describe('AutomaticEmailPage', () => {
  let renderComponent, helper, fetchStub;

  beforeEach(() => {
    helper = new IntegrationTestHelper();
    renderComponent = helper.renderComponent.bind(helper);
    fetchStub = helper.fetchJSONWithCSRFStub.withArgs("/api/v0/mail/automatic_email/");
    fetchStub.returns(Promise.resolve(GET_AUTOMATIC_EMAILS_RESPONSE));

    SETTINGS.roles = [{
      "role": "staff",
      "program": 1,
      "permissions": [],
    }];
  });

  afterEach(() => {
    helper.cleanup();
  }); 

  const baseActions = [
    REQUEST_GET_USER_PROFILE,
    RECEIVE_GET_USER_PROFILE_SUCCESS,
    REQUEST_GET_PROGRAM_ENROLLMENTS,
    RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  ];

  const successActions = baseActions.concat(
    actions.automaticEmails.get.requestType,
    actions.automaticEmails.get.successType,
  );

  it('redirects you to /dashboard if you are not staff', () => {
    SETTINGS.roles = [];
    let expectedActions = DASHBOARD_SUCCESS_ACTIONS.concat(
      actions.automaticEmails.get.requestType,
      actions.automaticEmails.get.successType,
    );
    return renderComponent("/automaticemails", expectedActions).then(() => {
      assert.equal(helper.currentLocation.pathname, '/dashboard');
    });
  });

  it('has all the cards it should', () => {
    return renderComponent('/automaticemails', successActions).then(([wrapper]) => {
      assert.lengthOf(wrapper.find(".email-campaigns-card"), 1);
    });
  });

  it('shows a spinner while the email info request is in-flight', () => {
    helper.store.dispatch({ type: actions.automaticEmails.get.requestType });

    return renderComponent('/automaticemails', baseActions).then(([wrapper]) => {
      assert.lengthOf(wrapper.find(Spinner), 1);
    });
  });

  it('shows the automatic emails for the logged-in user', () => {
    return renderComponent('/automaticemails', successActions).then(([wrapper]) => {
      let cardText = wrapper.find(".email-campaigns-card").text();
      GET_AUTOMATIC_EMAILS_RESPONSE.forEach(email => {
        assert.include(cardText, email.email_subject);
      });
    });
  });

  it('shows a placeholder if there is no data', () => {
    fetchStub.returns(Promise.resolve([]));

    return renderComponent('/automaticemails', successActions).then(([wrapper]) => {
      let cardText = wrapper.find(".empty-message").text();
      assert.equal(cardText, "You haven't created any Email Campaigns yet.");
    });
  });
});
