// @flow
import { SET_RECENTLY_ATTACHED_COUPON } from '../actions/coupons';
import type { Action } from '../flow/reduxTypes';
import type { Coupon, Coupons } from '../flow/couponTypes';
import { getCoupons, attachCoupon } from '../lib/api';
import { GET, POST } from '../constants';
import type { Endpoint } from '../flow/restTypes';

export const couponEndpoint: Endpoint = {
  name: 'coupons',
  url: "",
  makeOptions: () => ({}),
  getPrefix: 'FETCH',
  postPrefix: 'ATTACH',
  getFunc: getCoupons,
  postFunc: attachCoupon,
  verbs: [GET, POST],
  extraActions: {
    [SET_RECENTLY_ATTACHED_COUPON]: (state: Object, action: Action<any, any>) => ({
      ...state,
      recentlyAttachedCoupon: action.payload,
    }),
  }
};

export type CouponsState = {
  fetchPostStatus?:        string,
  fetchGetStatus?:         string,
  coupons:                 Coupons,
  recentlyAttachedCoupon:  ?Coupon,
};

export const INITIAL_COUPONS_STATE: CouponsState = {
  coupons: [],
  recentlyAttachedCoupon: null,
};
