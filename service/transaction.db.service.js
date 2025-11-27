const db = require("../models");
const bcrypt = require("bcrypt");
const httpStatus = require("http-status");
const Transaction = db.transaction;
const AccountDetails = db.account_details;
const { Op, Sequelize } = require("sequelize");
const moment_TZ = require('moment-timezone');
const encryptDecryptService = require('./encrypt_decrypt.service');
const { get_sub_merchants } = require("./node_server_api.service");

const addNewTransaction = async (transactionData) => {
  try {
    var result = await addTransaction(transactionData);
    console.log("Transaction added:.......");
    return {
      status: httpStatus.OK,
      message: "Transaction added!",
      data: result,
    };
  } catch (error) {
    console.error("Failed to add Transaction:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Failed to add Transaction:" + error.message,
    };
  }
};

/**
 * Add a new transaction to the database.
 * @param {Object} data - The transaction data to insert.
 * @returns {Promise<Object>} - The created transaction record.
 */
async function addTransaction(data) {
  console.log("🚀 ~ addTransaction ~ data:", data)
  try {
    const newTransaction = await Transaction.create({
      transaction_id: data?.transaction_id,
      external_id: data?.external_id,
      receiver_id: data?.receiver_id,
      order_id: data?.order_id,
      wallet_id: data?.wallet_id,
      account_id: data?.account_id,
      batch_id: data?.batch_id,
      mid_id: data?.mid_id,
      super_merchant_id: data?.super_merchant_id,
      sub_merchant_id: data?.sub_merchant_id,
      mode: data?.mode,
      transaction_type: data?.transaction_type,
      wholesale_fx_rate: data?.wholesale_fx_rate,
      destination_amount: data?.destination_amount,
      destination_currency: data?.destination_currency,
      sent_amount: data?.sent_amount,
      sent_currency: data?.sent_currency,
      source_amount: data?.source_amount,
      source_currency: data?.source_currency,
      source_country_iso_code: data?.source_country_iso_code,
      fee_amount: data?.fee_amount,
      fee_currency: data?.fee_currency,
      creation_date: data?.creation_date,
      expiration_date: data?.expiration_date,
      payer_country_iso_code: data?.payer_country_iso_code,
      payer_currency: data?.payer_currency,
      payer_id: data?.payer_id,
      payer_name: data?.payer_name,
      service_id: data?.service_id,
      service_name: data?.service_name,

      iban: data?.iban,
      bank_account_number: data?.bank_account_number,
      quotation_id: data?.quotation_id,
      purpose_of_remittance: data?.purpose_of_remittance,
      status_message: data?.status_message,
      rb_registered_name: data?.rb_registered_name,
      rb_country_iso_code: data?.rb_country_iso_code,
      rb_address: data?.rb_address,
      rb_city: data?.rb_city,
      rb_postal_code: data?.rb_postal_code,
      rb_province_state: data?.rb_province_state,
      rb_firstname: data?.rb_firstname,
      rb_lastname: data?.rb_lastname,
      sb_registered_name: data?.sb_registered_name,
      sb_country_iso_code: data?.sb_country_iso_code,
      sb_address: data?.sb_address,
      sb_city: data?.sb_city,
      sb_postal_code: data?.sb_postal_code,
      payer_transaction_code: data?.payer_transaction_code,
      payer_transaction_reference: data?.payer_transaction_reference,
      callback_url: data?.callback_url,
      document_reference_number: data?.document_reference_number,
      payout_reference: data?.payout_reference,
    });

    return newTransaction;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
}

/**
 * Fetch a transaction by its ID.
 * @param {string} transactionId - The transaction_id to search for.
 * @returns {Promise<Object|null>} - The found transaction or null if not found.
 */
async function getTransactionById(transactionId) {
  try {
    const transaction = await Transaction.findOne({
      where: { transaction_id: transactionId },
      order: [["created_at", "DESC"]],
      include: [
          {
            model: AccountDetails,
            as: "account_data", // alias used in association
            required: false,
          },
        ],
    });

    if (transaction) {
      return transaction.toJSON();
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }
}

/**
 * Fetch a transaction by its ID.
 * @param {string} transactionId - The transaction_id to search for.
 * @returns {Promise<Object|null>} - The found transaction or null if not found.
 */
async function getTransactionByExternalId(external_id) {
  try {
    const transaction = await Transaction.findOne({
      where: { external_id: external_id  },
      order: [["created_at", "DESC"]],
      include: [
          {
            model: AccountDetails,
            as: "account_data", // alias used in association
            required: false,
          },
        ],
    });

    if (transaction) {
      return transaction.toJSON();
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }
}

/**
 * Fetch a transaction by its ID.
 * @param {string} batch_id - The transaction_id to search for.
 * @returns {Promise<Object|null>} - The found transaction or null if not found.
 */
async function getTransactionByBatchId(batch_id) {
  try {
    const transactions = await Transaction.findAll({
      where: { batch_id: batch_id, status_message: "CREATED" },
      attributes: ["id", "transaction_id", "status_message"],
    });
    // Convert each Sequelize model instance to a plain object
    const jsonTransactions = transactions.map((transaction) =>
      transaction.toJSON()
    );
    return jsonTransactions;
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }
}

/**
 * Fetch a transaction by its status.
 * @param {string} batch_id - The transaction_id to search for.
 * @returns {Promise<Object|null>} - The found transaction or null if not found.
 */
async function getTransactionByStatus(transaction_id, status) {
  try {
    const transactions = await Transaction.findAll({
      where: { transaction_id: transaction_id, status_message: status },
      attributes: ["id", "transaction_id", "status_message"],
    });
    // Convert each Sequelize model instance to a plain object
    const jsonTransactions = transactions.map((transaction) =>
      transaction.toJSON()
    );
    return jsonTransactions;
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }
}

/**
 * Fetch a filtered, paginated, and sorted list of transactions.
 * @param {Object} options - Filter, pagination, and sorting options.
 * @returns {Promise<Object>} - Paginated result with count and rows.
 */
async function getTransactions(req) {
  try {
    const {
      page,
      per_page,
      sub_merchant_id,
      super_merchant_id,
      transaction_id,
      external_id,
      batch_id,
      receiver_id,
      receiver_currency,
      receiver_country,
      create_date,
    } = req.body;

    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;

    let where = {};

    if (super_merchant_id) where.super_merchant_id = super_merchant_id;
    if (sub_merchant_id) where.sub_merchant_id = sub_merchant_id;
    if (transaction_id) where.transaction_id = transaction_id;
    if (external_id) where.external_id = external_id;
    if (batch_id) where.batch_id = batch_id;
    if (receiver_id) where.receiver_id = receiver_id;
    // if (receiver_currency) where.payer_currency = receiver_currency;
    if (receiver_country) where.payer_country_iso_code = receiver_country;

    // If receiver_currency is provided, search for it in both payer_currency and destination_currency
    if (receiver_currency) {
      where[Op.or] = [
        { payer_currency: receiver_currency },
        { destination_currency: receiver_currency }
      ];
    }

    // Helper function to parse date ranges
    const parseDateRange = (rangeStr) => {
      const [start, end] = rangeStr.split("/");
      return {
        [Op.between]: [new Date(start), new Date(end)],
      };
    };

    if (create_date) where.created_at = parseDateRange(create_date);

    console.log("🚀 ~ getTransactions ~ where:", where)

    try {
      const result = await Transaction.findAndCountAll({
        where,
        limit,
        offset,
        order: [["id", "DESC"]],
        include: [
          {
            model: AccountDetails,
            as: "account_data", // alias used in association
            required: false,
          },
        ],
      });

      // const updatedTransactionsRows = result?.rows.map(transaction => ({
      //   ...transaction.toJSON(),
      //   receiver_currency : transaction.toJSON()?.destination_currency,
      //   creation_date : convert_utc_to_gmt(transaction.toJSON()?.creation_date),
      //   expiration_date : convert_utc_to_gmt(transaction.toJSON()?.expiration_date)
      // }));

      // Convert Sequelize instances to plain JSON
      const transactions = result.rows.map(row => row.toJSON());

      return {
        status: 200,
        message: result?.count < 1 ? "No transactions found" : "Transactions found",
        // data: updatedTransactionsRows,
        data: transactions,
        total: result?.count,
        page: parseInt(page),
        per_page: limit,
      };
    } catch (error) {
      console.error("Sequelize query failed:", error);
      return {
        status: 400,
        message: error.message,
      };
    }
  } catch (error) {
    console.error("Error fetching transactions list:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
}

function convert_utc_to_gmt(convert_date) {
  return moment_TZ
    .utc(convert_date)
    .tz("GMT")
    .format("DD-MM-YYYY hh:mm:ss");
}

const getQuotationById = async (id) => {
  return Quotation.findOne({ where: { id } });
};

const updateQuotationById = async (id, req) => {
  const {} = req.body;
  const quotation = {};

  const row = await Quotation.update(quotation, {
    where: { id: id },
  });
  return row;
};

const deleteQuotationById = async (id) => {
  const quotation = await getQuotationById(id);
  if (!quotation) return null;
  await quotation.destroy();
  return quotation;
};

const get_transaction_list = async (req, res) => {
  const {
    page = 1,
    per_page = 10,
    transaction_id,
    super_merchant_id,
    sub_merchant_id,
    receiver_id,
    batch_id,
    receiver_currency,
    receiver_country,
    create_date,
    update_date,
  } = req.body;

  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  let where = {};

  if (transaction_id) where.transaction_id = transaction_id;
  if (super_merchant_id) where.super_merchant_id = super_merchant_id;
  if (sub_merchant_id) where.sub_merchant_id = sub_merchant_id;
  if (receiver_id) where.receiver_id = receiver_id;
  if (batch_id) where.batch_id = batch_id;
  if (receiver_currency) where.destination_currency = receiver_currency;
  if (receiver_country) where.payer_country_iso_code = receiver_country;

  // Helper function to parse date ranges
  const parseDateRange = (rangeStr) => {
    const [start, end] = rangeStr.split("/");
    return {
      [Op.between]: [new Date(start), new Date(end)],
    };
  };

  if (create_date) where.created_at = parseDateRange(create_date);
  if (update_date) where.updated_at = parseDateRange(update_date);
  // if (active_date) where.active_date = parseDateRange(active_date);

  try {
    // const result = await Transaction.findAndCountAll({
    //   where,
    //   limit,
    //   offset,
    //   order: [["id", "DESC"]],
    // });

    const conditions = [];
    const replacements = { limit, offset };

    // dynamic filters
    if (transaction_id) {
      conditions.push('t.transaction_id = :transaction_id');
      replacements.transaction_id = transaction_id;
    }

      
    if (req?.user?.type === "merchant") {
      const sub_merchants = await get_sub_merchants(req.user.token);

      // Collect decrypted IDs into an array
      const decryptedIds = [];
      for (const element of sub_merchants?.data || []) {
        const decryptedId = await encryptDecryptService.decrypt(
          element.submerchant_id
        );
        decryptedIds.push(decryptedId);
      }

      // Add a single "IN (:sub_merchant_ids)" condition if we have any
      if (decryptedIds.length > 0) {
        conditions.push(`t.sub_merchant_id IN (:sub_merchant_ids)`);
        replacements.sub_merchant_ids = decryptedIds;
      }
      
    } else {
      if (sub_merchant_id) {
        conditions.push("t.sub_merchant_id = :sub_merchant_id");
        replacements.sub_merchant_id = await encryptDecryptService.decrypt(
          sub_merchant_id
        );
      }
    }


    // Combine conditions if any
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.sequelize.query(
      `SELECT COUNT(*) AS total FROM (
     SELECT t.id
     FROM transactions t
     INNER JOIN (
       SELECT 
         MAX(id) AS id,
         COALESCE(NULLIF(transaction_id, ''), external_id) AS group_id,
         MAX(created_at) AS latestcreated_at
       FROM transactions
       GROUP BY COALESCE(NULLIF(transaction_id, ''), external_id)
     ) latest
     ON COALESCE(NULLIF(t.transaction_id, ''), t.external_id) = latest.group_id
     AND t.created_at = latest.latestcreated_at
     ${whereClause} 
  ) AS subquery`,
      {
        replacements: replacements,
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    const totalCount = countResult[0].total;

   const result = await db.sequelize.query(
     `SELECT t.id AS transaction_ref_id, t.* 
   FROM transactions t 
   INNER JOIN (
     /* Group by fallback key: use transaction_id if available, else external_id */
     SELECT 
       MAX(id) AS id, 
       COALESCE(NULLIF(transaction_id, ''), external_id) AS group_id, 
       MAX(created_at) AS latestcreated_at 
     FROM transactions 
     GROUP BY COALESCE(NULLIF(transaction_id, ''), external_id)
   ) latest 
   ON COALESCE(NULLIF(t.transaction_id, ''), t.external_id) = latest.group_id 
   AND t.created_at = latest.latestcreated_at 
   ${whereClause}
   ORDER BY t.created_at DESC
   LIMIT :limit OFFSET :offset`,
     {
       replacements: replacements,
       type: db.sequelize.QueryTypes.SELECT,
     }
   );

    // console.log("last query:", db.last_query());
    // console.log("🚀 ~ constget_transaction_list= ~ result:", result)
    try {
      if (Array.isArray(result)) {
        for (let i = 0; i < result.length; i++) {
          if (result[i]?.sub_merchant_id) {
            const sub_merchant_id_enc = await encryptDecryptService.encrypt(
              result[i].sub_merchant_id
            );
            result[i].sub_merchant_id_enc = sub_merchant_id_enc;
          } else {
            result[i].sub_merchant_id_enc = "";
          }
        }
      }
    } catch (error) {
      console.log("🚀 ~ constget_transaction_list= ~ error:", error);
    }
    

    return {
      status: 200,
      message: "",
      data: result,
      total: totalCount,
      page: parseInt(page),
      per_page: limit,
    };
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};


/**
 * Fetch a transaction by its order ID.
 * @param {string} orderId - The transaction_id to search for.
 * @returns {Promise<Object|null>} - The found transaction or null if not found.
 */
async function getTransactionByOrderId(orderId) {
  try {
    const transaction = await Transaction.findOne({
      where: { order_id: orderId },
      order: [["created_at", "DESC"]],
    });

    if (transaction) {
      return transaction.toJSON();
    } else {
      return null;
    }

  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    // throw error;
    return null;
  }
}


module.exports = {
  getTransactionByStatus,
  addNewTransaction,
  getTransactionById,
  getTransactionByBatchId,
  getTransactions,
  getQuotationById,
  updateQuotationById,
  deleteQuotationById,
  get_transaction_list,
  getTransactionByOrderId,
  getTransactionByExternalId
};
