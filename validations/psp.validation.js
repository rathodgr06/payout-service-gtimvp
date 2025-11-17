const Joi = require("joi");
const passport = require("passport");

/**
 * Validation For Add Payer
 */
const add_mid = {
  body: Joi.object().keys({
    sub_merchant_id: Joi.string().allow(""),
    receiver_id: Joi.string().allow(""),
    psp_id: Joi.string().required(),
    primary_key: Joi.string().allow(""),
    api_key: Joi.string().required(),
    password: Joi.string().required(),
    callback: Joi.string().allow(""),
  }),
};

/**
 * Validation For Add Receiver
 */
const add_psp = {
  body: Joi.object().keys({
    psp_key: Joi.string().required(),
    psp_name: Joi.string().required(),
    remark: Joi.string().required(),
  }),
};

/**
 * Validation For Add Receiver
 */
const get_mid_by_id = {
  body: Joi.object().keys({
    sub_merchant_id: Joi.string().allow("", null),
    receiver_id: Joi.string().allow("", null),
  }),
};

/**
 * Validation For Add Receiver
 */
const get_mid_by_psp = {
  query: Joi.object().keys({
    psp_id: Joi.string().required(),
  }),
};

/**
 * Validation For Update PSP
 */
const update_psp = {
  body: Joi.object().keys({
    id: Joi.string().required(),
    psp_name: Joi.string().required(),
    country_id: Joi.string().required(),
    country_name: Joi.string().required(),
    remark: Joi.string().required().allow("", null),
  }),
};

/**
 * Validation For Update Payout PSP MID
 */
const update_payout_psp_mid = {
  body: Joi.object().keys({
    mid_id: Joi.string().required(),
    primary_key: Joi.string().allow("", null),
    api_key: Joi.string().required(),
    password: Joi.string().required(),
    callback: Joi.string().allow("", null),
  }),
};

/**
 * Validation For Activate/Disable PSP
 */
const active_disable_psp = {
  body: Joi.object().keys({
    id: Joi.string().required(),
    action: Joi.string().required(),
  }),
};

/**
 * MID Routing
 */
const mid_routing = {
  body: Joi.object().keys({
    id: Joi.string().required(),
    action: Joi.string().required(),
  }),
};

module.exports = {
  add_psp,
  add_mid,
  get_mid_by_id,
  update_psp,
  active_disable_psp,
  get_mid_by_psp,
  update_payout_psp_mid
};
