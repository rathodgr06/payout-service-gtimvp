const Joi = require("joi");

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

/**
 * Validation For Add Receiver
 */
const add_receiver = {
  body: Joi.object().keys({
    sub_merchant_id: Joi.string().required(),
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

/**
 * Validation For Payer List
 */
const list = {
  body: Joi.object().keys({
    page: Joi.string().required().allow(""),
    per_page: Joi.string().required().allow(""),
    service_id: Joi.string().required().allow(""),
    country_iso_code: Joi.string().required().allow(""),
    currency: Joi.string().required().allow(""),
  }),
};

module.exports = {
  add,
  add_receiver,
  update_receiver,
  verify_receiver,
  delete_receiver,
  get_receiver_by_id,
  get,
  list,
};
