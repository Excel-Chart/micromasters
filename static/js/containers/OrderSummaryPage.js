// @flow
/* global SETTINGS: false */
import React from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';

import Loader from '../components/Loader';
import type { Profiles } from '../flow/profileTypes';
import type { CoursePricesState, DashboardState } from '../flow/dashboardTypes';
import type { AvailableProgram } from '../flow/enrollmentTypes';
import OrderSummary from '../components/OrderSummary';
import { FETCH_PROCESSING, checkout } from '../actions';
import {
  fetchCoursePrices,
  clearCoursePrices,
} from '../actions/course_prices';
import {
  clearDashboard,
  fetchDashboard,
} from '../actions/dashboard';
import type { CheckoutState } from '../reducers';
import type { Coupon } from '../flow/couponTypes';
import type { RestState } from '../flow/restTypes';
import { createForm, findCourseRun } from '../util/util';
import { calculatePrice } from '../lib/coupon';
import { getOwnDashboard, getOwnCoursePrices } from '../reducers/util';
import { actions } from '../lib/redux_rest';

class OrderSummaryPage extends React.Component {
  static contextTypes = {
    router:   React.PropTypes.object.isRequired
  };

  props: {
    profiles:                 Profiles,
    currentProgramEnrollment: AvailableProgram,
    checkout:                 CheckoutState,
    dashboard:                DashboardState,
    dispatch:                 Dispatch,
    prices:                   CoursePricesState,
    coupons:                  RestState<Array<Coupon>>,
    location:                 Object,
  };

  componentDidMount() {
    this.updateRequirements();
  }

  componentDidUpdate() {
    this.updateRequirements();
  }

  componentWillUnmount() {
    const { dispatch } = this.props;
    dispatch(clearDashboard());
    dispatch(clearCoursePrices());
    dispatch(actions.coupons.clear());
  }

  fetchDashboard() {
    const { dashboard, dispatch } = this.props;
    if (dashboard.fetchStatus === undefined) {
      dispatch(fetchDashboard(SETTINGS.user.username));
    }
  }
  fetchCoursePrices() {
    const { prices, dispatch } = this.props;
    if (prices.fetchStatus === undefined) {
      dispatch(fetchCoursePrices(SETTINGS.user.username));
    }
  }

  fetchCoupons() {
    const { coupons, dispatch } = this.props;
    if (coupons.getStatus === undefined) {
      dispatch(actions.coupons.get());
    }
  }

  updateRequirements = () => {
    this.fetchDashboard();
    this.fetchCoursePrices();
    this.fetchCoupons();
  };
  dispatchCheckout = (courseId: string) => {
    const { dispatch } = this.props;

    return dispatch(checkout(courseId)).then(result => {
      const { payload, url, method } = result;

      if (method === 'POST') {
        const form = createForm(url, payload);
        const body: HTMLElement = (document.querySelector("body"): any);
        body.appendChild(form);
        form.submit();
      } else {
        window.location = url;
      }
    });
  };

  render() {
    const {
      checkout,
      currentProgramEnrollment,
      prices,
      dashboard,
      coupons,
      location: { query }
    }  = this.props;
    let courseRun, course, orderSummaryContent, coursePrice;
    let courseKey = query.course_key;
    [courseRun, course] = findCourseRun(dashboard.programs, run => run !== null && run.course_id === courseKey);
    coursePrice = prices.coursePrices.find(coursePrice => coursePrice.program_id === currentProgramEnrollment.id);

    if (course && courseRun && coursePrice) {
      const [coupon, calculatedPrice] = calculatePrice(courseRun.id, course.id, coursePrice, coupons.data);
      let discount = null;
      if (calculatedPrice !== null && calculatedPrice !== undefined) {
        discount = coursePrice.price - calculatedPrice;
      }
      orderSummaryContent = <OrderSummary
        course={course}
        courseRun={courseRun}
        coursePrice={coursePrice}
        finalPrice={calculatedPrice}
        couponCode={coupon ? coupon.coupon_code : null}
        discount={discount}
        checkout={this.dispatchCheckout}
        checkoutStatus={checkout.fetchStatus}
      />;
    }

    const loaded = dashboard.fetchStatus !== FETCH_PROCESSING;
    return (
      <Loader loaded={loaded}>
        <div className="single-column order-summary">
          <h4 className="heading">Order Summary</h4>
          { orderSummaryContent }
        </div>
      </Loader>
    );
  }
}
const mapStateToProps = (state) => {
  let profile = {
    profile: {}
  };
  if (SETTINGS.user && state.profiles[SETTINGS.user.username] !== undefined) {
    profile = state.profiles[SETTINGS.user.username];
  }
  return {
    profile: profile,
    dashboard: getOwnDashboard(state),
    prices: getOwnCoursePrices(state),
    currentProgramEnrollment: state.currentProgramEnrollment,
    orderReceipt: state.orderReceipt,
    checkout: state.checkout,
    coupons: state.coupons,
  };
};



export default connect(mapStateToProps)(OrderSummaryPage);
