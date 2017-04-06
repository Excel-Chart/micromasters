// @flow
import {
  SET_RECENTLY_ATTACHED_COUPON,
  setRecentlyAttachedCoupon,
} from './coupons';
import { assertCreatedActionHelper } from './test_util';

describe('coupons actions', () => {
  it('should create all action creators', () => {
    [
      [setRecentlyAttachedCoupon, SET_RECENTLY_ATTACHED_COUPON],
    ].forEach(assertCreatedActionHelper);
  });
});
