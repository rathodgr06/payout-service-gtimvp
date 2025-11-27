const db = require("../models");
const bcrypt = require("bcrypt");
const httpStatus = require("http-status");
const Quotation = db.quotation;

const addNewQuotation = async (newQuotationData) => {
  const result = await addQuotation(newQuotationData);

  if (result !== undefined) {
    console.log("Quotation added:", result);
    return {
      status: httpStatus.OK,
      message: "Quotation added!",
    };
  }

  console.error("Failed to add quotation:", err);
  return {
    status: httpStatus.INTERNAL_SERVER_ERROR,
    message: "Failed to add quotation:" + err.message,
  };
};

/**
 * Add a new quotation to the database.
 * @param {Object} data - The quotation data to insert.
 * @returns {Promise<Object>} - The created quotation record.
 */
async function addQuotation(data) {
  let newQuotation = "";
  try {
    newQuotation = await Quotation.create({
      quotation_id: data.id,
      external_id: data.external_id,
      receiver_id: data.receiver_id,
      super_merchant_id: data.super_merchant_id,
      sub_merchant_id: data.sub_merchant_id,
      mode: data.mode,
      transaction_type: data.transaction_type,
      wholesale_fx_rate: data.wholesale_fx_rate, // Should be a number or string that matches DECIMAL
      destination_amount: data.destination_amount,
      destination_currency: data.destination_currency,
      sent_amount: data.sent_amount,
      sent_currency: data.sent_currency,
      source_amount: data.source_amount,
      source_currency: data.source_currency,
      source_country_iso_code: data.source_country_iso_code,
      fee_amount: data.fee_amount,
      fee_currency: data.fee_currency,
      creation_date: data.creation_date,
      expiration_date: data.expiration_date,
      payer_country_iso_code: data.payer_country_iso_code,
      payer_currency: data.payer_currency,
      payer_id: data.payer_id,
      payer_name: data.payer_name,
      service_id: data.service_id,
      service_name: data.service_name,
    });
  } catch (error) {
    console.error("Error adding quotation:", error);
    throw error;
  } finally {
    return newQuotation;
  }
}

const getAllQuotation = async (filter, options) => {
  const quotations = await Quotation.findAll();
  return quotations;
};

const getQuotationById = async (quotation_id) => {
  const quotation = await Quotation.findOne({ where: { quotation_id } });
  return quotation ? quotation.toJSON() : null;
};

const getQuotationByExternalId = async (external_id) => {
  const quotation = await Quotation.findOne({ where: { external_id } });
  return quotation ? quotation.toJSON() : null;
};

const updateQuotationById = async (id, req) => {
  const {} = req.body;
  const quotation = {};

  const row = await Quotation.update(quotation, {
    where: { quotation_id: id },
  });
  return row;
};

const deleteQuotationById = async (quotation_id) => {
  const quotation = await getQuotationById(quotation_id);
  if (!quotation) return null;
  await quotation.destroy();
  return quotation;
};

module.exports = {
  addNewQuotation,
  getAllQuotation,
  getQuotationById,
  getQuotationByExternalId,
  updateQuotationById,
  deleteQuotationById,
};
