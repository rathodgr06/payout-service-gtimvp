const Joi = require("joi");
const db = require("../models");
const Transaction = db.transaction;

/**
 * Validation For Payout
 * receiver_id, amount, currency, confirmation_required
 */
const payout = {
  body: Joi.object().keys({
    order_id: Joi.string().allow("", null).label("Order ID"),
    sub_merchant_id: Joi.string().allow("", null).label("Submerchant ID"),
    receiver_id: Joi.string().allow("", null).label("Receiver ID"),
    wallet_id: Joi.string().allow("", null).label("Wallet ID"),
    account_id: Joi.string().allow("", null).label("Account ID"),
    amount: Joi.number().positive().allow("", null).label("Payout Amount"),
    currency: Joi.string().length(3).allow("", null).label("Currency"),
    debit_amount: Joi.number().positive().allow("", null).label("Debit Amount"),
    debit_currency: Joi.string().length(3).allow("", null).label("Debit Currency"),
    confirmation_required: Joi.boolean().required().label("Create and confirm TXN"),
    purpose_of_remittance: Joi.string().allow("", null).label("Perpose of remittance"),
    payout_reference: Joi.string().max(100).allow("", null).label("Payout Reference"),
    webhook_url: Joi.string().allow("", null).label("Webhook url"),
  }),
};

/**
 * Validation For Manage Payout
 */
const manage_payout = {
  body: Joi.object().keys({
    action: Joi.string().required(),
    transaction_id: Joi.string().required(),
  }),
};

/**
 * Wallet Balance
 */
const wallet_balance = {
  body: Joi.object().keys({
    sub_merchant_id: Joi.string().required(),
    currency: Joi.string().required(),
  }),
};

/**
 * Validation For Batch Payout
 * receiver_id, amount, currency, confirmation_required
 */
const batch_payout = {
  body: Joi.object().keys({
    transactions: Joi.array()
      .items(
        Joi.object({
          order_id: Joi.string().allow("", null).label("Order ID"),
          sub_merchant_id: Joi.string().allow("", null).label("Submerchant ID"),
          receiver_id: Joi.string().allow("", null).label("Receiver ID"),
          wallet_id: Joi.string().allow("", null).label("Wallet ID"),
          account_id: Joi.string().allow("", null).label("Account ID"),
          amount: Joi.number().positive().allow("", null).label("Payout Amount"),
          currency: Joi.string().length(3).allow("", null).label("Currency"),
          debit_amount: Joi.number().positive().allow("", null).label("Debit Amount"),
          debit_currency: Joi.string().length(3).allow("", null).label("Debit Currency"),
          confirmation_required: Joi.boolean().required().label("Create and confirm TXN"),
          purpose_of_remittance: Joi.string().allow("", null).label("Perpose of remittance"),
          payout_reference: Joi.string().max(100).allow("", null).label("Payout Reference"),
          webhook_url: Joi.string().allow("", null).label("Webhook url"),
        })
      )
      .min(1)
      .required(),
  }),
};

/**
 * Validation For Batch Payout
 * receiver_id, amount, currency, confirmation_required
 */
const manage_batch_payout = {
  body: Joi.object().keys({
    action: Joi.string().valid("CONFIRM", "CANCEL").required(),
    batch_id: Joi.string().required(),
  }),
};

async function validateBatchIdExists(batch_id) {
  const batch = await Transaction.findOne({ where: { batch_id: batch_id } });
  if (!batch) {
    return false;
  }

  return true;
}

/**
 * Validation For Add Payer
 */
const create_quotations = {
  body: Joi.object().keys({
    receiver_id: Joi.string().required(),
    payer_id: Joi.string().required(),
    source_amount: Joi.string().required(),
    source_currency: Joi.string().required(),
    source_country_iso_code: Joi.string().required(),
  }),
};

/**
 * Validation For Create Transaction
 */
const create_transaction = {
  body: Joi.object().keys({
    quotation_id: Joi.string().required(),
  }),
};

// Custom date range regex: expects "YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss"
const dateRangeRegex =
  /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?\/\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;

/**
 * Validation For Create Transaction
 */
const payout_list = {
  body: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(10),

    super_merchant_id: Joi.string().allow("", null), // Allow empty or null
    sub_merchant_id: Joi.string().allow("", null),
    transaction_id: Joi.string().allow("", null),
    batch_id: Joi.string().allow("", null),
    status: Joi.string().allow("", null),
    receiver_id: Joi.string().allow("", null),
    receiver_currency: Joi.string().max(10).allow("", null),
    receiver_country: Joi.string().length(3).allow("", null), // ISO 3-letter code
    create_date: Joi.string().pattern(dateRangeRegex).allow("", null).messages({
      "string.pattern.base":
      "create_date must be in format YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss",
    }),
    
    update_date: Joi.string().pattern(dateRangeRegex).allow("", null).messages({
      "string.pattern.base":
      "update_date must be in format YYYY-MM-DD HH:mm:ss/YYYY-MM-DD HH:mm:ss",
    }),
    from_date: Joi.string().allow("", null),
    to_date: Joi.string().allow("", null),
  }),
};

/**
 * Validation For Create Transaction
 */
const confirm_batch_payout = {
  body: Joi.object().keys({
    batch_id: Joi.string().required(),
  }),
};

/**
 * Validation For Payer List
 */
const confirm_transaction = {
  body: Joi.object().keys({
    transaction_id: Joi.string().required(),
  }),
};

/**
 * Validation For Payer List
 */
const transaction_status = {
  body: Joi.object().keys({
    transaction_id: Joi.string().required(),
  }),
};

/**
 * Validation For Transaction Cancel API
 */
const transaction_cancel = {
  body: Joi.object().keys({
    transaction_id: Joi.string().required(),
  }),
};

/**
 * Validation For Transaction Cancel API
 */
const add_transaction_attachment = {
  body: Joi.object().keys({
    order_id: Joi.string().required(),
    type: Joi.string().allow("invoice","purchase_order","delivery_slip","contract","customs_declaration","bill_of_lading","others","identification_documents","proof_of_address","proof_of_source_of_funds","registration_documents").required(),
  }),
};

module.exports = {
  payout,
  manage_payout,
  batch_payout,
  validateBatchIdExists,
  confirm_batch_payout,
  create_quotations,
  create_transaction,
  confirm_transaction,
  transaction_status,
  transaction_cancel,
  payout_list,
  manage_batch_payout,
  add_transaction_attachment
};
