// @flow
import configureTestStore from 'redux-asserts';
import { assert } from 'chai';
import sinon from 'sinon';
import R from 'ramda';

import {
  START_CALCULATOR_EDIT,
  startCalculatorEdit,
  CLEAR_CALCULATOR_EDIT,
  clearCalculatorEdit,
  UPDATE_CALCULATOR_EDIT,
  updateCalculatorEdit,
  UPDATE_CALCULATOR_VALIDATION,
  updateCalculatorValidation,
  REQUEST_ADD_FINANCIAL_AID,
  requestAddFinancialAid,
  RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
  RECEIVE_ADD_FINANCIAL_AID_FAILURE,
  addFinancialAid,
  REQUEST_SKIP_FINANCIAL_AID,
  RECEIVE_SKIP_FINANCIAL_AID_FAILURE,
  RECEIVE_SKIP_FINANCIAL_AID_SUCCESS,
  skipFinancialAid,
} from '../actions/financial_aid';
import {
  FETCH_FAILURE,
  FETCH_PROCESSING,
  FETCH_SUCCESS,
} from '../actions';
import * as dashboardActions from '../actions/dashboard';
import { setCurrentProgramEnrollment } from '../actions/programs';
import { FINANCIAL_AID_EDIT } from './financial_aid';
import rootReducer from '../reducers';
import * as api from '../lib/api';
import { actions } from '../lib/redux_rest';

describe('financial aid reducers', () => {
  let sandbox, store, dispatchThen;
  let addFinancialAidStub, skipFinancialAidStub;
  let fetchDashboardStub, fetchCoursePricesStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    dispatchThen = store.createDispatchThen(state => state.financialAid);
    store.dispatch(setCurrentProgramEnrollment(1));
    addFinancialAidStub = sandbox.stub(api, 'addFinancialAid');
    skipFinancialAidStub = sandbox.stub(api, 'skipFinancialAid');
    fetchDashboardStub = sandbox.stub(dashboardActions, 'fetchDashboard');
    fetchDashboardStub.returns({type: "fake"});
    fetchCoursePricesStub = sandbox.stub(actions.prices, 'get');
    fetchCoursePricesStub.returns({type: "fake"});
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should let you start editing', () => {
    return dispatchThen(startCalculatorEdit(1), [START_CALCULATOR_EDIT]).then(state => {
      let expectation = {
        ...FINANCIAL_AID_EDIT,
        programId: 1,
        fetchAddStatus: undefined,
        fetchSkipStatus: undefined,
      };
      assert.deepEqual(state, expectation);
    });
  });


  it('should let you clear edits', () => {
    store.dispatch(startCalculatorEdit(1));
    return dispatchThen(clearCalculatorEdit(), [CLEAR_CALCULATOR_EDIT]).then(state => {
      assert.deepEqual(state, {
        ...FINANCIAL_AID_EDIT,
        fetchAddStatus: undefined,
        fetchSkipStatus: undefined,
      });
    });
  });

  it('should let you update an edit in progress', () => {
    store.dispatch(startCalculatorEdit(1));
    let update = R.clone(store.getState().financialAid);
    update.income = '1000000';
    return dispatchThen(updateCalculatorEdit(update), [UPDATE_CALCULATOR_EDIT]).then(state => {
      assert.deepEqual(state, update);
    });
  });

  it('should let you update the validation', () => {
    store.dispatch(startCalculatorEdit(1));
    let validation = { some: 'error' };
    return dispatchThen(updateCalculatorValidation(validation), [
      UPDATE_CALCULATOR_VALIDATION
    ]).then(state => {
      assert.deepEqual(state.validation, validation);
    });
  });

  it('should process adding a financial aid object', () => {
    store.dispatch(startCalculatorEdit(1));
    return dispatchThen(requestAddFinancialAid(100000, 'USD', 1), [
      REQUEST_ADD_FINANCIAL_AID
    ]).then(state => {
      assert.equal(state.fetchAddStatus, FETCH_PROCESSING);
    });
  });

  it('should let you add financial aid', () => {
    addFinancialAidStub.returns(Promise.resolve());
    let income = 100000;
    let currency = 'USD';
    let programId = 1;
    store.dispatch(startCalculatorEdit(programId));
    return dispatchThen(addFinancialAid(income, currency, programId), [
      REQUEST_ADD_FINANCIAL_AID,
      RECEIVE_ADD_FINANCIAL_AID_SUCCESS,
    ]).then(state => {
      let expectation = {
        ...FINANCIAL_AID_EDIT,
        programId: programId,
        fetchAddStatus: FETCH_SUCCESS,
        fetchSkipStatus: undefined,
      };
      assert.deepEqual(state, expectation);
      assert.ok(fetchCoursePricesStub.calledWith());
      assert.ok(fetchDashboardStub.calledWith());
    });
  });

  it('should fail to add a financial aid', () => {
    let err = {'0': 'an error message', errorStatusCode: 500};
    addFinancialAidStub.returns(Promise.reject(err));
    let income = 100000;
    let currency = 'USD';
    let programId = 1;
    store.dispatch(startCalculatorEdit(programId));
    return dispatchThen(addFinancialAid(income, currency, programId), [
      REQUEST_ADD_FINANCIAL_AID,
      RECEIVE_ADD_FINANCIAL_AID_FAILURE,
    ]).then(state => {
      let expectation = {
        ...FINANCIAL_AID_EDIT,
        programId: programId,
        fetchAddStatus: FETCH_FAILURE,
        fetchSkipStatus: undefined,
        fetchError: {
          message: 'an error message',
          code: 500
        }
      };
      assert.deepEqual(state, expectation);
      assert.ok(addFinancialAidStub.calledWith(income, currency, programId));
      assert.notOk(fetchCoursePricesStub.calledWith());
      assert.notOk(fetchDashboardStub.calledWith());
    });
  });

  it('should let you skip financial aid', () => {
    skipFinancialAidStub.returns(Promise.resolve());
    return dispatchThen(skipFinancialAid(2), [
      REQUEST_SKIP_FINANCIAL_AID,
      RECEIVE_SKIP_FINANCIAL_AID_SUCCESS
    ]).then(state => {
      assert.deepEqual(state, {
        fetchSkipStatus: FETCH_SUCCESS
      });
      assert.ok(skipFinancialAidStub.calledWith(2));
      assert.ok(fetchCoursePricesStub.calledWith());
      assert.ok(fetchDashboardStub.calledWith());
    });
  });

  it('should fail to skip financial aid', () => {
    skipFinancialAidStub.returns(Promise.reject());
    return dispatchThen(skipFinancialAid(2), [
      REQUEST_SKIP_FINANCIAL_AID,
      RECEIVE_SKIP_FINANCIAL_AID_FAILURE
    ]).then(state => {
      assert.deepEqual(state, {
        fetchSkipStatus: FETCH_FAILURE
      });
      assert.ok(skipFinancialAidStub.calledWith(2));
      assert.notOk(fetchCoursePricesStub.calledWith());
      assert.notOk(fetchDashboardStub.calledWith());
    });
  });
});
