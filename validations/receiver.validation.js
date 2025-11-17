const Joi = require("joi");
const helperService = require("../service/helper.service");
const nodeServerAPIService = require("../service/node_server_api.service");
const httpStatus = require("http-status");

/**
 * Validation For Add Payer
 */
const add = {
  body: Joi.object().keys({
    super_merchant_id: Joi.string().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    registered_name: Joi.string().required(),
    registration_number: Joi.string().required(),
    bank_name: Joi.string().required(),
    iban: Joi.string().required(),
    address: Joi.string().required().allow(""),
    city: Joi.string().required().allow(""),
  }),
};

// Define schemas separately
const subMerchantSchema = Joi.object({
  sub_merchant_id: Joi.string().required(),
}).messages({
  "any.required": `"sub_merchant_id" is required.`,
});

const receiverSchema = Joi.object({
  receiver_name: Joi.string().required(),
  country_iso_code: Joi.string().required(),
  email: Joi.string().required(),
  code: Joi.string().required(),
  mobile_no: Joi.string().required(),
}).messages({
  "any.required": `All of the following are required: "receiver_name", "country_iso_code", "email", "code", "mobile_no".`,
});

/**
 * Validation For Add Receiver
 */
const add_receiver = {
  body: Joi.object({
    sub_merchant_id: Joi.string().allow("", null),
    receiver_name: Joi.string().allow("", null),
    registered_business_address: Joi.string().allow("", null),
    email: Joi.string().allow("", null),
    code: Joi.string().allow("", null),
    mobile_no: Joi.string().allow("", null),
    referral_code: Joi.string().allow("", null),
    webhook_url: Joi.string().allow("", null),
  }),
};

/**
 * Validation For Add Receiver
 */
const add_receiver_2 = async (req, res, next) => {
  if (!req.body.sub_merchant_id) {
    if (helperService.isNotValid(req.body.receiver_name)) {
      return res
        .status(httpStatus.OK)
        .send({
          status: 400,
          message: "'receiver_name' is not allowed to be empty",
        });
    }
    if (
      helperService.isNotValid(req.body.registered_business_address) ||
      req.body.registered_business_address.length != 3
    ) {
      return res
        .status(httpStatus.OK)
        .send({
          status: 400,
          message: "registered_business_address required max 3 digit",
        });
    }
    if (
      helperService.isNotValid(req.body.email) ||
      !helperService.isValidEmail(req.body.email)
    ) {
      return res
        .status(httpStatus.OK)
        .send({ status: 400, message: "Invalid email ID!" });
    }
    if (helperService.isNotValid(req.body.code)) {
      return res
        .status(httpStatus.OK)
        .send({ status: 400, message: "'code' is not allowed to be empty" });
    }
    if (helperService.isNotValid(req.body.mobile_no)) {
      return res
        .status(httpStatus.OK)
        .send({
          status: 400,
          message: "'mobile_no' is not allowed to be empty",
        });
    }
  }

  if (helperService.isValid(req.body.sub_merchant_id)) {
    let submerchant_response = await nodeServerAPIService.get_sub_merchant_details(req.body.sub_merchant_id);
    if (submerchant_response?.status != httpStatus.OK) {
      res.status(httpStatus.OK).send(submerchant_response);
      return;
    }
  }

  if (helperService.isValid(req.body.registered_business_address)) {
    let countries = await nodeServerAPIService.get_business_reg_country_list();
    if (countries?.status != httpStatus.OK) {
      return countries;
    }
    const country = countries?.data.find(
      (country) => country.country_code === req.body.registered_business_address
    );
    if (!country) {
      console.log(
        `Country code ${req.body.registered_business_address} not found.`
      );
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Business registered country you passed is not found or not activated or not supported.",
      });
      return;
    }
  }

  if (
    helperService.isValid(req.body.email) &&
    !helperService.isValidEmail(req.body.email)
  ) {
    return res
      .status(httpStatus.OK)
      .send({ status: 400, message: "Invalid email ID!" });
  }

  if (
    helperService.isValid(req.body.code) &&
    helperService.isValid(req.body.mobile_no)
  ) {
    // Check valid mobile number
    let mobile_code_list =
      await nodeServerAPIService.get_mobile_code_country_list();
    if (mobile_code_list?.status != httpStatus.OK) {
      return mobile_code_list;
    }
    const mobile = mobile_code_list?.data.find(
      (mobile_code) => mobile_code.dial === req.body.code
    );
    console.log("🚀 ~ mobile:", mobile);
    if (mobile) {
      if (mobile.mobile_no_length != req.body.mobile_no.length) {
        res.status(httpStatus.OK).send({
          status: 400,
          message:
            "Invalid mobile number, the mobile number must be " +
            mobile.mobile_no_length +
            " digit in length.",
        });
        return;
      }
    } else {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Mobile dial code you passed is not found or not activated or not supported.",
      });
      return;
    }
  }

  next();
};

/**
 * Validation For Manage Receiver
 */
const manage_receiver = {
  body: Joi.object().keys({
    action: Joi.string().required(),
    receiver_id: Joi.string().required(),
  }),
};

/**
 * Validation For Update Receiver
 */
const update_receiver = {
  body: Joi.object().keys({
    receiver_id: Joi.string().required(),
    registered_name: Joi.string().required(),
    country_iso_code: Joi.string().required(),
    iban: Joi.string().required(),
    address: Joi.string().required().allow(""),
    city: Joi.string().required().allow(""),
  }),
};

/**
 * Validation For Update Receiver
 */
const update_receiver_verification_status = {
  body: Joi.object().keys({
    sub_merchant_id: Joi.string().required(),
    status: Joi.string().required(),
  }),
};

/**
 * Validation For Get Receiver By ID
 */
const get_receiver_by_id = {
  body: Joi.object().keys({
    receiver_id: Joi.string().required(),
  }),
};

/**
 * Validation For Add Payer
 */
const verify_receiver = {
  body: Joi.object().keys({
    receiver_id: Joi.string().required(),
  }),
};

/**
 * Validation For Delete Receiver
 */
const delete_receiver = {
  body: Joi.object().keys({
    receiver_id: Joi.string().required(),
  }),
};

/**
 * Validation For Get Payer By ID
 */
const get = {
  body: Joi.object().keys({
    payer_id: Joi.string().required(),
  }),
};

// Custom date range regex: expects "YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss"
const dateRangeRegex =
  /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?\/\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;

/**
 * Validation For Payer List
 */
const get_receiver_list = {
  body: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    per_page: Joi.number().integer().min(1).max(100).optional(),

    sub_merchant_id: Joi.string().allow("", null),
    receiver_id: Joi.string().allow("", null),
    email: Joi.string().allow("", null),
    mobile_no: Joi.string().allow("", null),

    country: Joi.string().allow("", null),

    create_date: Joi.string().pattern(dateRangeRegex).allow("", null).messages({
      "string.pattern.base":
        "create_date must be in format YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss",
    }),

    update_date: Joi.string().pattern(dateRangeRegex).allow("", null).messages({
      "string.pattern.base":
        "update_date must be in format YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss",
    }),
  }),
};

/**
 * Validation For Payer List
 */
const add_receiver_key_secret = {
  body: Joi.object({
    receiver_id: Joi.string().required(),
    type: Joi.string().valid("test", "live").required(),
  }),
};

/**
 * Validation For Update Webhook Keys
 */
const update_receiver_key_secret = {
  body: Joi.object({
    receiver_id: Joi.string().required(),
    type: Joi.string().valid("test", "live").required(),
    webhook_url: Joi.string().required(),
    webhook_secret: Joi.string().required(),
  }),
};

/**
 * Validation For Payer List
 */
const get_receiver_by_key_secret = {
  body: Joi.object({
    receiver_key: Joi.string().required(),
    receiver_secret: Joi.string().required(),
  }),
};

/**
 * Validation For Receiver Keys
 * */
const get_receiver_key_secret = {
  body: Joi.object({
    receiver_id: Joi.string().required(),
  }),
};

/**
 * Validation For 
 * */
const delete_key_secret = {
  body: Joi.object({
    id: Joi.string().required(),
  }),
};

module.exports = {
  add,
  add_receiver,
  manage_receiver,
  update_receiver,
  verify_receiver,
  delete_receiver,
  get_receiver_by_id,
  get,
  get_receiver_list,
  update_receiver_verification_status,
  add_receiver_key_secret,
  get_receiver_by_key_secret,
  add_receiver_2,
  update_receiver_key_secret,
  get_receiver_key_secret,
  delete_key_secret
};
