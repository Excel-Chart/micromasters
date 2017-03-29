// @flow
import configureTestStore from 'redux-asserts';
import sinon from 'sinon';

import { setRecentlyAttachedCoupon } from '../actions/coupons';
import rootReducer from '../reducers';
import type { CouponsState } from '../reducers/coupons';
import type { AssertReducerResultState } from '../flow/reduxTypes';
import { createAssertReducerResultState } from '../util/test_utils';

describe('coupon reducers', () => {
  let sandbox, store, assertReducerResultState: AssertReducerResultState<CouponsState>;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
    assertReducerResultState = createAssertReducerResultState(store, state => state.coupons);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should let you set a recently attached coupon', () => {
    assertReducerResultState(
      setRecentlyAttachedCoupon,
      coupons => coupons.recentlyAttachedCoupon,
      undefined,
    );
  });
});
