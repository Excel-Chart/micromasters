import { assert } from 'chai';
import _ from 'lodash';
import sinon from 'sinon';
import moment from 'moment';

import {
  isNilOrEmptyString,
  personalValidation,
  educationValidation,
  employmentValidation,
  privacyValidation,
  validateProfileComplete,
  combineValidators,
  emailValidation,
  validateFinancialAid,
  profileImageValidation,
  checkProp,
  checkLatin,
} from './profile';
import {
  HIGH_SCHOOL,
  PERSONAL_STEP,
  EMPLOYMENT_STEP,
  ISO_8601_FORMAT,
} from '../../constants';
import { USER_PROFILE_RESPONSE } from '../../test_constants';

describe('Profile validation functions', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('isNilOrEmptyString', () => {
    it('should match nil values and empty strings, nothing else', () => {
      [
        [null, true],
        [undefined, true],
        ["", true],
        [" ", true],
        ["   ", true],
        [" \n  ", true],
        ["\t ", true],
        ["TEST", false],
        [" TEST", false],
        [" TEST ", false],
      ].forEach(([val, expectation]) => {
        assert.equal(isNilOrEmptyString(val), expectation);
      });
    });
  });

  describe('checkProp', () => {
    const check = checkProp(
      'name',
      'invalid name',
      (name) => name !== 'invalid'
    );

    it('should validate a valid property', () => {
      assert.deepEqual(check({
        name: 'valid'
      }), {});
    });

    it('should validate an invalid property', () => {
      assert.deepEqual(check({
        name: 'invalid'
      }), {
        name: 'invalid name'
      });
    });
  });

  describe('checkLatin', () => {
    const check = checkLatin('name', 'invalid name');
    it('should validate a latin-only prop', () => {
      assert.deepEqual(check({
        name: 'valid'
      }), {});
    });

    it('should invalidate a non-latin name', () => {
      assert.deepEqual(check({
        name: 'عامر'
      }), {
        name: 'invalid name must be in Latin characters'
      });
    });
  });

  describe('Personal validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual(personalValidation(USER_PROFILE_RESPONSE), {});
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.first_name = '';
      assert.deepEqual(personalValidation(clone), {first_name: "Given name is required"});
    });

    it('validates required fields', () => {
      let requiredFields = [
        ['first_name'],
        ['last_name'],
        ['preferred_name'],
        ['gender'],
        ['preferred_language'],
        ['city'],
        ['country'],
        ['birth_country'],
        ['nationality'],
      ];

      let profile = {};
      for (let key of requiredFields) {
        profile[key[0]] = '';
      }

      let errors = personalValidation(profile);
      for (let key of requiredFields) {
        let error = errors[key];
        assert.ok(error.indexOf("is required") !== -1);
      }
    });

    it('correctly validates fields with 0', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.first_name = 0;
      let errors = personalValidation(profile);
      assert.deepEqual(errors, {});
    });

    it('should error if date of birth is in the future', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        date_of_birth: "2077-01-01"
      };
      let errors = {
        date_of_birth: "Please enter a valid date of birth"
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when first_name is non cp-1252 and romanized fields are missing', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        first_name: 'عامر',
        romanized_first_name: undefined,
        romanized_last_name: undefined,
      };
      let errors = {
        romanized_first_name: "Latin given name is required",
        romanized_last_name: "Latin family name is required"
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when last_name is non cp-1252 and romanized fields are missing', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        last_name: 'عامر',
        romanized_first_name: undefined,
        romanized_last_name: undefined,
      };
      let errors = {
        romanized_first_name: "Latin given name is required",
        romanized_last_name: "Latin family name is required"
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when romanized_first_name is non cp-1252', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        first_name: 'عامر',
        romanized_first_name: 'عامر',
        romanized_last_name: 'test'
      };
      let errors = {
        romanized_first_name: "Latin given name must be in Latin characters",
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when romanized_last_name is non cp-1252', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        first_name: 'عامر',
        romanized_first_name: 'test',
        romanized_last_name: 'عامر'
      };
      let errors = {
        romanized_last_name: "Latin family name must be in Latin characters",
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    const invalidCharErrorSuffix = 'must not contain comma, double quote, or greater than characters';

    for (const invalidChar of ['"', '>', ',']) {
      it(`should error when first_name contains ${invalidChar}`, () => {
        let profile = {
          ...USER_PROFILE_RESPONSE,
          first_name: invalidChar,
        };
        let errors = {
          first_name: `Given name ${invalidCharErrorSuffix}`,
        };
        assert.deepEqual(personalValidation(profile), errors);
      });

      it(`should error when last_name contains ${invalidChar}`, () => {
        let profile = {
          ...USER_PROFILE_RESPONSE,
          last_name: invalidChar,
        };
        let errors = {
          last_name: `Family name ${invalidCharErrorSuffix}`,
        };
        assert.deepEqual(personalValidation(profile), errors);
      });

      it(`should error when romanized_first_name contains ${invalidChar}`, () => {
        let profile = {
          ...USER_PROFILE_RESPONSE,
          first_name: 'ر',
          romanized_first_name: invalidChar,
          romanized_last_name: 'name',
        };
        let errors = {
          romanized_first_name: `Latin given name ${invalidCharErrorSuffix}`,
        };
        assert.deepEqual(personalValidation(profile), errors);
      });

      it(`should error when romanized_last_name contains ${invalidChar}`, () => {
        let profile = {
          ...USER_PROFILE_RESPONSE,
          first_name: 'ر',
          romanized_first_name: 'name',
          romanized_last_name: invalidChar,
        };
        let errors = {
          romanized_last_name: `Latin family name ${invalidCharErrorSuffix}`,
        };
        assert.deepEqual(personalValidation(profile), errors);
      });
    }

    it('should error when any name is too long', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        first_name: 'ر'.repeat(31),
        last_name: 'ر'.repeat(51),
        romanized_first_name: 'b'.repeat(31),
        romanized_last_name: 'b'.repeat(51)
      };
      let errors = {
        first_name: "Given name must be no more than 30 characters",
        last_name: "Family name must be no more than 50 characters",
        romanized_first_name: "Latin given name must be no more than 30 characters",
        romanized_last_name: "Latin family name must be no more than 50 characters",
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when address is non cp-1252', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        address: 'عامر',
      };
      let errors = {
        address: "Street address must be in Latin characters",
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when postal_code is non cp-1252', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        postal_code: 'عامر',
      };
      let errors = {
        postal_code: "Postal code must be in Latin characters",
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    it('should error when city is non cp-1252', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        city: 'عامر',
      };
      let errors = {
        city: "City must be in Latin characters",
      };
      assert.deepEqual(personalValidation(profile), errors);
    });

    let validPostalCodes = {
      'US': ['12345', '12345-6789'],
      'CA': ['123456', '123ABC', '123abc'],
    };
    let inValidPostalCodes = {
      US: ['a', 'asdfb', '12345a', '%$#$%#$%', '12345-asdf', '12345-', 'a12345', '12345-1234a'],
      CA: ['a', 'asdfb', '12345-asdf', '12345-1', '12345%', '1234512'],
    };
    let messages = {
      US: "Postal code must be a valid US postal code",
      CA: "Postal code must be a valid Canadian postal code",
    };
    for (const country of ["US", "CA"]) {
      it(`should error when country is ${country} and no postal code`, () => {
        let profile = {
          ...USER_PROFILE_RESPONSE,
          country: country,
          postal_code: '',
        };
        let errors = {
          postal_code: "Postal code is required",
        };
        assert.deepEqual(personalValidation(profile), errors);
      });

      it(`should reject invalid postal codes for ${country}`, () => {
        inValidPostalCodes[country].forEach(badCode => {
          let profile = {
            ...USER_PROFILE_RESPONSE,
            country: country,
            postal_code: badCode,
          };
          assert.deepEqual(
            personalValidation(profile),
            { postal_code: messages[country] }
          );
        });
      });

      it(`should accept valid postal codes for ${country}`, () => {
        validPostalCodes[country].forEach(goodCode => {
          let profile = {
            ...USER_PROFILE_RESPONSE,
            country: country,
            postal_code: goodCode,
          };
          assert.deepEqual(personalValidation(profile), {});
        });
      });
    }

    it(`should not error when country does not require postal code`, () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        country: 'DE',
        postal_code: '',
      };
      assert.deepEqual(personalValidation(profile), {});
    });

    it('should complain if you enter an invalid phone number', () => {
      let profile = {
        ...USER_PROFILE_RESPONSE,
        phone_number: "+1 222"
      };
      let errors = {
        phone_number: "Please enter a valid phone number"
      };
      assert.deepEqual(personalValidation(profile), errors);
    });
  });

  describe('profileImageValidation', () => {
    it('should return no errors if no image is present', () => {
      assert.deepEqual(profileImageValidation({}), {});
    });

    it('should return no errors if image is present', () => {
      assert.deepEqual(profileImageValidation({
        image: 'some-image.png'
      }), {});
    });
  });

  describe('Education validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual(educationValidation(USER_PROFILE_RESPONSE), {});
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education[0].school_name = '';
      let expectation = {education: [{school_name: 'School name is required'}, {}]};
      assert.deepEqual(educationValidation(clone), expectation);
    });

    it('should return an empty object if no education present', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education = undefined;
      assert.deepEqual(educationValidation(clone), {});
    });

    it('should not validate field_of_study for high school students', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education[0].degree_name = HIGH_SCHOOL;
      clone.education[0].field_of_study = "";
      assert.deepEqual(educationValidation(clone), {});
    });

    it('should show all fields which are required', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.education[0].school_name = '';
      clone.education[0].school_city = '';
      assert.deepEqual(educationValidation(clone), {
        education: [{
          school_name: 'School name is required',
          location: 'City, state/territory, and country are required.',
          school_city: 'City is required'
        }, {}]
      });
    });
  });

  describe('Employment validation', () => {
    it('should return an empty object when all fields are present', () => {
      assert.deepEqual(employmentValidation(USER_PROFILE_RESPONSE), {});
    });

    it('should return an appropriate error if a field is missing', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.work_history[0].company_name = '';
      let expectation = {work_history: [{company_name: 'Name of Employer is required'}, {}]};
      assert.deepEqual(employmentValidation(clone), expectation);
    });

    it('should return an empty object if no employment present', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.work_history = undefined;
      assert.deepEqual(employmentValidation(clone), {});
    });

    it('should show all fields which are required', () => {
      let clone = _.cloneDeep(USER_PROFILE_RESPONSE);
      clone.work_history[0].company_name = '';
      clone.work_history[0].city = '';
      assert.deepEqual(employmentValidation(clone), {
        work_history: [{
          location: 'City, state/territory, and country are required.',
          city: 'City is required',
          company_name: 'Name of Employer is required'
        },{}]
      });
    });

    it('should reject end date before start date', () => {
      let errors = {
        work_history: [{},
          {
            end_date: "End date cannot be before start date"
          }
        ]
      };
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = moment(profile.work_history[1].start_date).subtract(1, 'months').
        format(ISO_8601_FORMAT);
      assert.deepEqual(employmentValidation(profile), errors);
    });

    it('should reject an end date in the future', () => {
      sandbox.useFakeTimers(moment('2016-10-01').valueOf());
      let expectation = {
        work_history: [{},
          { end_date: 'End date cannot be in the future' }
        ]
      };
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = moment().add(1, 'month').format(ISO_8601_FORMAT);
      assert.deepEqual(employmentValidation(profile), expectation);
    });

    it('should not reject an end date in the current month', () => {
      sandbox.useFakeTimers(moment('2016-10-01').valueOf());
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = moment().format(ISO_8601_FORMAT);
      assert.deepEqual(employmentValidation(profile), {});
    });

    it('should not error if end_date is blank', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = null;
      assert.deepEqual(employmentValidation(profile), {});
    });


    for (let field of ['year', 'month']) {
      let errors = {
        work_history: [{},
          {
            end_date: "Please enter a valid end date or leave it blank"
          }
        ]
      };

      it(`should error if end_date has an edit value in ${field}`, () => {
        let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
        profile.work_history[1].end_date = null;
        profile.work_history[1].end_date_edit = Object.assign({
          year: "",
          month: ""
        }, {
          [field]: "field"
        });
        assert.deepEqual(employmentValidation(profile), errors);
      });
    }

    it(`should error if end_date has a number in year`, () => {
      let errors = {
        work_history: [{},
          {
            end_date: "Please enter a valid end date or leave it blank"
          }
        ]
      };
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = null;
      profile.work_history[1].end_date_edit = {
        year: 1943,
        month: ""
      };
      assert.deepEqual(employmentValidation(profile), errors);
    });

    it('should not error if end_date has an edit value which is blank', () => {
      let profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile.work_history[1].end_date = null;
      profile.work_history[1].end_date_edit = {
        year: "",
        month: ""
      };
      assert.deepEqual(employmentValidation(profile), {});
    });
  });

  describe('validateProfileComplete', () => {
    let profile;
    beforeEach(() => {
      profile = {};
    });

    it('should return fields for an empty profile', () => {
      let errors = Object.assign({}, ...Object.entries({
        'first_name': "Given name",
        'last_name': "Family name",
        'preferred_name': "Nickname / Preferred name",
        'gender': "Gender",
        'preferred_language': "Preferred language",
        'address': 'Street address',
        'city': "City",
        'state_or_territory': 'State or Territory',
        'country': "Country",
        'nationality': "Nationality",
        'birth_country': "Country",
        'phone_number': 'A phone number'
      }).map(([k,v]) => ({[k]: `${v} is required`})));
      errors.date_of_birth = "Please enter a valid date of birth";
      const expectation = [false, PERSONAL_STEP, errors];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });

    it('should return appropriate fields when a field is missing', () => {
      profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      profile['first_name'] = '';
      let expectation = [false, PERSONAL_STEP, {
        first_name: 'Given name is required'
      }];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });

    it('should return true when all fields are filled in', () => {
      assert.deepEqual(validateProfileComplete(USER_PROFILE_RESPONSE), [true, null, {}]);
    });

    it('should return fields for dialog when a nested field is missing', () => {
      profile = _.cloneDeep(USER_PROFILE_RESPONSE);
      _.set(profile, ['work_history', 0, 'country'], '');
      let expectation = [false, EMPLOYMENT_STEP, {
        work_history: [{
          location: "City, state/territory, and country are required.",
          country: "Country is required"
        }, {}]
      }];
      assert.deepEqual(validateProfileComplete(profile), expectation);
    });
  });

  describe('combineValidators', () => {
    it('uses _.merge on the output of a series of functions', () => {
      let mergeStub = sandbox.stub(_, 'merge');
      const mergeResult = "mergeResult";
      mergeStub.returns(mergeResult);
      const args = ["some", "args"];

      let func1 = sandbox.stub().returns("ret1");
      let func2 = sandbox.stub().returns("ret2");

      let result = combineValidators(func1, func2)(args);
      assert(func1.calledWith(args));
      assert(func2.calledWith(args));
      assert(mergeStub.calledWith({}, "ret1", "ret2"));
      assert.equal(result, mergeResult);
    });
  });
});

describe('Privacy validation', () => {
  it('should return an empty object when all fields are present', () => {
    assert.deepEqual(privacyValidation(USER_PROFILE_RESPONSE), {});
  });

  it('should return an appropriate error if a field is missing', () => {
    let clone = {
      ...USER_PROFILE_RESPONSE,
      account_privacy: '',
    };
    let expectation = {account_privacy: 'Privacy level is required'};
    assert.deepEqual(privacyValidation(clone), expectation);
  });
});

describe('Email validation', () => {
  let email = {
    subject: 'a great email',
    body: 'hi, how are you?'
  };

  let blank = field => {
    let emailClone = _.cloneDeep(email);
    emailClone[field] = null;
    return emailClone;
  };

  it('should require a subject', () => {
    assert.deepEqual(
      emailValidation(blank('subject')),
      { 'subject': 'Please fill in a subject' }
    );
  });

  it('should require a body', () => {
    assert.deepEqual(
      emailValidation(blank('body')),
      { 'body': 'Please fill in a body' }
    );
  });

  it('should require any links in the body to begin with (http|https)', () => {
    [
      ['<a href="foo.bar">my bad link :(</a>', true],
      ['<a href="http://foo.bar">my good link :)</a>', false],
      ['<a href="https://foo.bar">my better link :D</a>', false],
      ['<a href="mailto:me@example.com">EMAIL ME!!!!</a>', false],
    ].forEach(([bodyText, shouldFail]) => {
      let inputs = _.clone(email);
      inputs.body = bodyText;
      assert.deepEqual(
        emailValidation(inputs),
        shouldFail ? { body: "All link URLs must start with 'http', 'https', or 'mailto:'" } : {}
      );
    });
  });

  it('should return no errors if all fields are filled out', () => {
    let errors = emailValidation(email);
    assert.deepEqual(errors, {});
  });
});

describe('Financial aid validation', () => {
  let financialAid;

  beforeEach(() => {
    financialAid = {
      income: '1000000',
      currency: 'JPY',
      checkBox: true
    };
  });

  it('should complain if income is empty', () => {
    financialAid.income = undefined;
    let errors = validateFinancialAid(financialAid);
    assert.deepEqual(errors, {
      income: 'Income is required'
    });
  });

  for (let income of ["2000.00", "2000.50", "2Adb", "two thousand"]) {
    it(`should complain if income='${income}' is invalid`, () => {
      financialAid.income = income;
      let errors = validateFinancialAid(financialAid);
      assert.deepEqual(errors, {
        income: 'Please only use whole numbers.'
      });
    });
  }

  it('should complain if currency is empty', () => {
    financialAid.currency = undefined;
    let errors = validateFinancialAid(financialAid);
    assert.deepEqual(errors, {
      currency: 'Please select a currency'
    });
  });

  it('should complain if the checkBox is false', () => {
    financialAid.checkBox = false;
    let errors = validateFinancialAid(financialAid);
    assert.deepEqual(errors, {
      checkBox: 'You must agree to these terms'
    });
  });
});
