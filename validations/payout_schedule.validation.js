const Joi = require("joi");

const isoCountryCodes = ['US', 'IN', 'FR', 'DE', 'GB', 'CN', 'JP', 'BR', 'CA', 'AU', /* add more */];
/**
 * Validation For Create Payout Schedule Plan
 */
const create_payout_schedule_plan = {
  body: Joi.object().keys({
    plan_name: Joi.string().required(),
    country_iso_code: Joi.string()
      .length(3)
      .uppercase()
      // .valid(...isoCountryCodes)
      .required(),
    is_default: Joi.number().required(),
    items: Joi.array()
      .items(
        Joi.object().keys({
          currency: Joi.string().required(),
          frequency: Joi.string()
            .valid("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY")
            .required()
            .messages({
              "any.only":
                "Frequency must be one of DAILY, WEEKLY, MONTHLY, QUARTERLY, or ANNUALLY",
              "any.required": "Frequency is required",
            }),
          occurrence: Joi.number().required(),
          start: Joi.alternatives().conditional("frequency", {
            switch: [
              {
                is: "WEEKLY",
                then: Joi.string()
                  .valid(
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday"
                  )
                  .required(),
              },
              {
                is: "MONTHLY",
                then: Joi.number().integer().min(1).max(31).required(),
              },
              {
                is: "QUARTERLY",
                then: Joi.string()
                  .pattern(/^\d{4}-\d{2}-\d{2}$/)
                  .required()
                  .messages({
                    "string.pattern.base":
                      "Start date must be in YYYY-MM-DD format",
                    "any.required": "Start date is required",
                  }),
              },
            ],
            otherwise: Joi.any(),
          }),
          min_amount: Joi.number().min(0.01).precision(2).required(),
          // payout_time: Joi.string()
          //   .pattern(/^((0[1-9])|(1[0-2])):[0-5][0-9]\s?(AM|PM)$/i)
          //   .required(),
        })
      )
      .required()
      .messages({
        "any.required": "Items are required and must be an array",
      }),
  }),
};

/**
 * Validation For Manage Payout Schedule Plan
 */
const manage_payout_schedule_plan = {
  body: Joi.object().keys({
    plan_action: Joi.string().required(),
    plan_id: Joi.number().required(),
    plan_name: Joi.string().allow(null),
    country_iso_code: Joi.string().length(3).uppercase().allow(null),
    is_default: Joi.number().allow(null),
    schedules: Joi.array()
      .items(
        Joi.object().keys({
          plan_item_action: Joi.string().required(),
          plan_item_id: Joi.number().allow("", null),
          plan_id: Joi.number().allow("", null),
          currency: Joi.string().required(),
          frequency: Joi.string()
            .valid("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY")
            .required()
            .messages({
              "any.only":
                "Frequency must be one of DAILY, WEEKLY, MONTHLY, QUARTERLY, or ANNUALLY",
              "any.required": "Frequency is required",
            }),
          occurrence: Joi.number().required(),
          start: Joi.alternatives().conditional("frequency", {
            switch: [
              {
                is: "WEEKLY",
                then: Joi.string()
                  .valid(
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday"
                  )
                  .required(),
              },
              {
                is: "MONTHLY",
                then: Joi.number().integer().min(1).max(31).required(),
              },
              {
                is: "QUARTERLY",
                then: Joi.string()
                  .pattern(/^\d{4}-\d{2}-\d{2}$/)
                  .required()
                  .messages({
                    "string.pattern.base":
                      "Start date must be in YYYY-MM-DD format",
                    "any.required": "Start date is required",
                  }),
              },
            ],
            otherwise: Joi.any(),
          }),
          min_amount: Joi.number().min(0.00).precision(2).required(),
          // payout_time: Joi.string()
          //   .pattern(/^((0[1-9])|(1[0-2])):[0-5][0-9]\s?(AM|PM)$/i)
          //   .required(),
        })
      )
      .allow(null),
  }),
};

/**
 * Validation For Create Payout Schedule Plan Items
 */
const create_payout_schedule_items = {
  body: Joi.object().keys({
    plan_id: Joi.number().required(),
    currency: Joi.string().required(),
    frequency: Joi.string()
      .valid("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY") // exact match required
      .required()
      .messages({
        "any.only":
          "Frequency must be one of DAILY, WEEKLY, MONTHLY, Or QUARTERLY",
        "any.required": "Frequency is required",
      }),
    occurrence: Joi.number().required(),
    start: Joi.alternatives().conditional("frequency", {
      switch: [
        {
          is: "WEEKLY",
          then: Joi.string()
            .valid(
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday"
            )
            .required()
            .messages({
              "any.only": "For WEEKLY frequency, start must be a valid weekday",
            }),
        },
        {
          is: "MONTHLY",
          then: Joi.number().integer().min(1).max(31).required().messages({
            "number.base": "For MONTHLY frequency, start must be a number",
            "number.min":
              "Start must be between 1 and 31 for MONTHLY frequency",
            "number.max":
              "Start must be between 1 and 31 for MONTHLY frequency",
          }),
        },
        {
          is: "QUARTERLY",
          then: Joi.string()
            .valid(
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December"
            )
            .required()
            .messages({
              "any.only":
                "For QUARTERLY frequency, start must be a valid month name",
            }),
        },
      ],
      otherwise: Joi.any(), // You can apply generic validation or leave it open
    }),
    min_amount: Joi.number()
      .min(0.01) // minimum value
      .precision(2) // optional: limits to 2 decimal places
      .required()
      .messages({
        "number.base": "Amount must be a number",
        "number.min": "Amount must be at least 0.01",
        "number.precision": "Amount must have at most 2 decimal places",
        "any.required": "Amount is required",
      }),
    payout_time: Joi.string()
      .pattern(/^((0[1-9])|(1[0-2])):[0-5][0-9]\s?(AM|PM)$/i)
      .required()
      .messages({
        "string.pattern.base":
          "Payout time must be in the format hh:mm AM/PM (e.g., 04:00 PM)",
        "any.required": "Payout time is required",
      }),
  }),
};

/**
 * Validation For Create Master Payout Schedule
 */
const create_master_payout_schedule = {
  body: Joi.object().keys({
    super_merchant_id: Joi.string().allow(""),
    sub_merchant_id: Joi.string().required(),
    plan_id: Joi.string().required(),
  }),
};

/**
 * Validation For Create Master Payout Schedule
 */
const manage_master_payout_schedule = {
  body: Joi.object().keys({
    super_merchant_id: Joi.string().allow(""),
    sub_merchant_id: Joi.string().required(),
    plan_id: Joi.string().required(),
  }),
};

/**
 * Validation For Create Master Payout Schedule
 */
const remove_master_payout_schedule = {
  body: Joi.object().keys({
    sub_merchant_id: Joi.string().required(),
  }),
};

/**
 * Validation For Create Payout Schedule Plan
 */
const update_payout_schedule_plan = {
  body: Joi.object().keys({
    plan_id: Joi.number().required(),
    plan_name: Joi.string().required(),
    country_id: Joi.number().required(),
    country_name: Joi.string().required(),
    is_default: Joi.number().required(),
  }),
};

/**
 * Validation For Create Payout Schedule Plan Items
 */
const update_payout_schedule_items = {
  body: Joi.object().keys({
    plan_item_id: Joi.number().required(),
    // plan_id: Joi.number().required(),
    currency: Joi.string().required(),
    frequency: Joi.string()
      .valid("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY") // exact match required
      .required()
      .messages({
        "any.only":
          "Frequency must be one of DAILY, WEEKLY, MONTHLY, Or QUARTERLY",
        "any.required": "Frequency is required",
      }),
    occurrence: Joi.number().required(),
    start: Joi.alternatives().conditional("frequency", {
      switch: [
        {
          is: "WEEKLY",
          then: Joi.string()
            .valid(
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday"
            )
            .required()
            .messages({
              "any.only": "For WEEKLY frequency, start must be a valid weekday",
            }),
        },
        {
          is: "MONTHLY",
          then: Joi.number().integer().min(1).max(31).required().messages({
            "number.base": "For MONTHLY frequency, start must be a number",
            "number.min":
              "Start must be between 1 and 31 for MONTHLY frequency",
            "number.max":
              "Start must be between 1 and 31 for MONTHLY frequency",
          }),
        },
        {
          is: "QUARTERLY",
          then: Joi.string()
            .valid(
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December"
            )
            .required()
            .messages({
              "any.only":
                "For QUARTERLY frequency, start must be a valid month name",
            }),
        },
      ],
      otherwise: Joi.any(), // You can apply generic validation or leave it open
    }),
    min_amount: Joi.number()
      .min(0.01) // minimum value
      .precision(2) // optional: limits to 2 decimal places
      .required()
      .messages({
        "number.base": "Amount must be a number",
        "number.min": "Amount must be at least 0.01",
        "number.precision": "Amount must have at most 2 decimal places",
        "any.required": "Amount is required",
      }),
    payout_time: Joi.string()
      .pattern(/^((0[1-9])|(1[0-2])):[0-5][0-9]\s?(AM|PM)$/i)
      .required()
      .messages({
        "string.pattern.base":
          "Payout time must be in the format hh:mm AM/PM (e.g., 04:00 PM)",
        "any.required": "Payout time is required",
      }),
  }),
};

/**
 * List For Create Payout Schedule Plan
 */
const list_payout_schedule_plan = {
  body: Joi.object().keys({
    page: Joi.number().required(),
    per_page: Joi.number().required(),
    
    is_default: Joi.number().allow("", null),
    deleted: Joi.number().allow("", null),
    status: Joi.number().allow("", null),
    
    country_iso_code: Joi.string()
      .length(3)
      .uppercase()
      .allow("", null),
  }),
};

/**
 * Validation For Check Payout Schedule
 */
const check_payout_schedule = {
  body: Joi.object().keys({
    schedule_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
  }),
};


/**
 * Validation For Check Payout Schedule
 */
const payout_re_schedule = {
  body: Joi.object().keys({
    plan_item_id: Joi.number().required(),
    plan_id: Joi.number().required(),
    currency: Joi.string().required(),
    frequency: Joi.string().required(),
    occurrence: Joi.number().required(),
    start: Joi.string().required(),
    min_amount: Joi.number().precision(2).min(0.01).required(),
  }),
};

module.exports = {
  create_payout_schedule_plan,
  create_payout_schedule_items,
  create_master_payout_schedule,
  list_payout_schedule_plan,
  manage_payout_schedule_plan,
  check_payout_schedule,
  payout_re_schedule,
  manage_master_payout_schedule,
  remove_master_payout_schedule
};
