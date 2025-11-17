const Joi = require("joi");

/**
 * Validation For Get Payers
 */
const get_payers = {
  body: Joi.object().keys({
    page: Joi.number().optional(),
    per_page: Joi.number().optional(),
    service_id: Joi.number().optional(),
    country_iso_code: Joi.string().max(3).optional(),
    currency: Joi.string().max(3).optional(),
  }),
};

/**
 * Validation For Get Payers
 */
const name_verification = {
  body: Joi.object().keys({
    account_number: Joi.string().required(),
    institution_code: Joi.string().required(),
    funding_source_type: Joi.number().required()
  }),
};

module.exports = {
  get_payers,
  name_verification
};
