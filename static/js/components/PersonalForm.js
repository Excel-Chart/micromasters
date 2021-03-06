// @flow
import React from 'react';
import Grid, { Cell } from 'react-mdl/lib/Grid';
import ReactTooltip from 'react-tooltip';
import _ from 'lodash';

import LANGUAGE_CODES from '../data/language_codes';
import SelectField from './inputs/SelectField';
import CountrySelectField from './inputs/CountrySelectField';
import StateSelectField from './inputs/StateSelectField';
import ProfileFormFields from '../util/ProfileFormFields';
import { shouldRenderRomanizedFields } from '../util/profile_edit';
import type {
  Profile,
  SaveProfileFunc,
  ValidationErrors,
  UpdateProfileFunc,
} from '../flow/profileTypes';
import type { Validator, UIValidator } from '../lib/validation/profile';
import type { UIState } from '../reducers/ui';
import type { Option } from '../flow/generalTypes';

export default class PersonalForm extends ProfileFormFields {
  genderOptions: Array<Option> = [
    { value: 'm', label: 'Male' },
    { value: 'f', label: 'Female' },
    { value: 'o', label: 'Other/Prefer not to say' }
  ];
  languageOptions: Array<Option> = _.sortBy(LANGUAGE_CODES.map(language => ({
    value: language.alpha2,
    label: language.English
  })), 'label');

  props: {
    profile:                Profile,
    errors:                 ValidationErrors,
    saveProfile:            SaveProfileFunc,
    updateProfile:          UpdateProfileFunc,
    validator:              Validator|UIValidator,
    ui:                     UIState,
  };

  renderRomanizedFields = (): React$Element<*> => (
    <Cell col={12}>
      <section className="romanized-name">
        <h3>Please enter your name in Latin characters</h3>
        <Grid className="profile-form-grid">
          <Cell col={6}>
            {this.boundTextField(["romanized_first_name"], "Given name")}
          </Cell>
          <Cell col={6}>
            {this.boundTextField(["romanized_last_name"], "Family name")}
          </Cell>
        </Grid>
      </section>
    </Cell>
  );

  showRomanizedFields = (): React$Element<*>|null => (
    shouldRenderRomanizedFields(this.props.profile) ? this.renderRomanizedFields() : null
  );

  render() {
    const { profile } = this.props;

    const whyWeAskThis = 'Some program sponsors and employers offer benefits or scholarships ' +
      'to learners with specific backgrounds.';

    // only show postal code for US and Canada
    let postalCodeField = null;
    if (profile && ["US", "CA"].includes(profile.country)) {
      postalCodeField = (
        <Cell col={4} key='postal_code'>
          {this.boundTextField(['postal_code'], 'Postal code')}
        </Cell>
      );
    }

    return (
      <section>
        <h2 className="sr-only">Personal Information</h2>
        <p className="alert-info" role="alert">
          Please provide your legal name, and truthful information.
        </p>
        <Grid className="profile-form-grid">
          <Cell col={6}>
            {this.boundTextField(["first_name"], "Given name")}
          </Cell>
          <Cell col={6}>
            {this.boundTextField(["last_name"], "Family name")}
          </Cell>
          {this.showRomanizedFields()}
          <p className="alert-info" role="alert">
            Do you prefer to use a name different that your legal name entered above? If so enter it below.
          </p>
          <Cell col={12}>
            {this.boundTextField(["preferred_name"], "Nickname / Preferred name")}
          </Cell>
          <Cell col={12}>
            {this.boundDateField(['date_of_birth'], 'Date of birth')}
          </Cell>
          <Cell col={12} className="profile-gender-group">
            {this.boundRadioGroupField(['gender'], 'Gender', this.genderOptions)}
          </Cell>
          <Cell col={12}>
            <SelectField
              keySet={['preferred_language']}
              label='Preferred language'
              options={this.languageOptions}
              {...this.defaultInputComponentProps()}
            />
          </Cell>
        </Grid>
        <section>
          <h3>Where are you currently living?</h3>
          <Grid className="profile-form-grid">
            <Cell col={12}>
              <CountrySelectField
                stateKeySet={['state_or_territory']}
                countryKeySet={['country']}
                topMenu={true}
                label='Country'
                {...this.defaultInputComponentProps()}
              />
            </Cell>
            <Cell col={12} key='address'>
              {this.boundTextField(['address'], 'Street address', {maxLength: 100})}
            </Cell>
            <Cell col={4} key='city'>
              {this.boundTextField(['city'], 'City')}
            </Cell>
            <Cell col={4} key='state_or_territory'>
              <StateSelectField
                stateKeySet={['state_or_territory']}
                countryKeySet={['country']}
                topMenu={true}
                label='State or Territory'
                {...this.defaultInputComponentProps()}
              />
            </Cell>
            {postalCodeField}
          </Grid>
        </section>
        <section>
          <h3>Where are you from?</h3>
          <span className="tooltip-link"
            data-tip
            data-for='why-we-ask-this'
            style={{"display": "inline-block"}}
          >(Why we ask this)</span>
          <ReactTooltip id="why-we-ask-this" effect="solid" event="click" globalEventOff="click">
            {whyWeAskThis}
          </ReactTooltip>
          <Grid className="profile-form-grid">
            <Cell col={4}>
              <CountrySelectField
                countryKeySet={['birth_country']}
                label='Country of birth'
                topMenu={true}
                {...this.defaultInputComponentProps()}
              />
            </Cell>
            <Cell col={4}>
              <CountrySelectField
                countryKeySet={['nationality']}
                label='Nationality'
                topMenu={true}
                {...this.defaultInputComponentProps()}
              />
            </Cell>
          </Grid>
        </section>
        <section>
          <h3>Telephone</h3>
          { this.boundTelephoneInput(['phone_number']) }
        </section>
      </section>
    );
  }
}
