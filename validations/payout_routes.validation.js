const Joi = require("joi");

/**
 * Validation For Add Payer
 */
const add_payout_route = {
  body: Joi.object().keys({
    country_iso: Joi.string().required(),
    country_name: Joi.string().required(),
    account_type: Joi.string().required(),
    // account_type_name: Joi.string().required(),
    currency: Joi.string().required(),
    payer_id: Joi.string().required(),
    psp_name: Joi.string().required(),
    psp_id: Joi.string().required(),
  }),
};

module.exports = {
  add_payout_route,
};
