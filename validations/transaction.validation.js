const Joi = require("joi");


// Custom date range regex: expects "YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss"
const dateRangeRegex =
  /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?\/\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;

/**
 * Validation For Transactions List
 */
const list = {
  body: Joi.object().keys({
    page: Joi.number().required(),
    per_page: Joi.number().required(),
    sub_merchant_id: Joi.string().allow("", null),
    super_merchant_id: Joi.string().allow("", null),
    transaction_id: Joi.string().allow("", null),
    external_id: Joi.string().allow("", null),
    batch_id: Joi.string().allow("", null),
    receiver_id: Joi.string().allow("", null),
    receiver_currency: Joi.string().max(10).allow("", null),
    receiver_country: Joi.string().length(3).allow("", null), // ISO 3-letter code
    create_date: Joi.string().pattern(dateRangeRegex).allow("", null).messages({
          "string.pattern.base":
            "create_date must be in format YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss",
        }),
  }),
};

/**
 * Validation For Transactions List
 */
const details = {
  params: Joi.object().keys({
    transaction_id: Joi.number().required(),
  }),
};

module.exports = {
  list,
  details
};
