// @flow
import {
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  RECEIVE_DASHBOARD_FAILURE,
} from '../actions/dashboard';
import {
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
} from '../actions/course_prices';
import {
  REQUEST_FETCH_COUPONS,
  RECEIVE_FETCH_COUPONS_SUCCESS,
} from '../actions/coupons';
import {
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
} from '../actions/programs';
import {
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
} from '../actions/profile';
import type { ActionType } from '../flow/reduxTypes';
import { actions } from '../lib/redux_rest';

export const SUCCESS_ACTIONS: Array<ActionType> = [
  REQUEST_GET_PROGRAM_ENROLLMENTS,
  RECEIVE_GET_PROGRAM_ENROLLMENTS_SUCCESS,
  REQUEST_GET_USER_PROFILE,
  RECEIVE_GET_USER_PROFILE_SUCCESS,
];

export const DASHBOARD_SUCCESS_ACTIONS = SUCCESS_ACTIONS.concat([
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_SUCCESS,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
  actions.coupons.get.requestType,
  actions.coupons.get.successType,
]);

export const DASHBOARD_ERROR_ACTIONS = SUCCESS_ACTIONS.concat([
  REQUEST_DASHBOARD,
  RECEIVE_DASHBOARD_FAILURE,
  REQUEST_COURSE_PRICES,
  RECEIVE_COURSE_PRICES_SUCCESS,
  actions.coupons.get.requestType,
  actions.coupons.get.successType,
]);
