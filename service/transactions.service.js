const httpStatus = require("http-status");
const helperService = require("./helper.service");
const receiverService = require("./receiver.service");
const nodeServerAPIService = require("./node_server_api.service");
const transactionDbService = require("./transaction.db.service");
const attachmentDbService = require("./attachment.db.service");
const payerService = require("./payer.service");
const db = require("../models");
const moment = require("moment");
const moment_TZ = require("moment-timezone");

/**
 * Add Transaction
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const addNewTransaction = async (payload) => {
  var transactionResponse = payload?.transaction;
  let super_merchant_id = payload?.super_merchant_id;
  let sub_merchant_id = payload?.sub_merchant_id;
  let quotation_id = payload?.quotation_id;
  let receiver_id = payload?.receiver_id;
  let account_id = payload?.account_id;
  let wallet_id = payload?.wallet_id;
  let order_id = payload?.order_id;
  let batch_id = payload?.batch_id;
  let mid_id = payload?.mid_id;
  let payout_reference = payload?.payout_reference;
  let webhook_url = payload?.webhook_url;

  // Save Transaction
  let transactionData = {
    transaction_id: transactionResponse?.id,
    external_id: transactionResponse?.external_id,
    receiver_id: receiver_id,
    order_id: order_id,
    wallet_id: wallet_id,
    account_id: account_id,
    batch_id: batch_id,
    mid_id: mid_id,
    super_merchant_id: super_merchant_id,
    sub_merchant_id: sub_merchant_id,
    // mode: transactionResponse?.mode,
    transaction_type: transactionResponse?.transaction_type,
    wholesale_fx_rate: transactionResponse?.wholesale_fx_rate,
    destination_amount: transactionResponse?.destination?.amount,
    destination_currency: transactionResponse?.destination?.currency,
    sent_amount: transactionResponse?.sent_amount?.amount,
    sent_currency: transactionResponse?.sent_amount?.currency,
    source_amount: transactionResponse?.source?.amount,
    source_currency: transactionResponse?.source?.currency,
    source_country_iso_code: transactionResponse?.source?.country_iso_code,
    fee_amount: transactionResponse?.fee?.amount,
    fee_currency: transactionResponse?.fee?.currency,
    creation_date: transactionResponse?.creation_date,
    expiration_date: transactionResponse?.expiration_date, // 2 hours later
    payer_country_iso_code: transactionResponse?.payer?.country_iso_code,
    payer_currency: transactionResponse?.payer?.currency,
    payer_id: transactionResponse?.payer?.id,
    payer_name: transactionResponse?.payer?.name,
    service_id: transactionResponse?.payer?.service?.id,
    service_name: transactionResponse?.payer?.service?.name,

    iban: transactionResponse?.credit_party_identifier?.iban,
    bank_account_number:
      transactionResponse?.credit_party_identifier?.bank_account_number,
    quotation_id: quotation_id,
    purpose_of_remittance: transactionResponse?.purpose_of_remittance,
    status_message: transactionResponse?.status_message,
    sb_registered_name: transactionResponse?.sending_business?.registered_name,
    sb_country_iso_code:
      transactionResponse?.sending_business?.country_iso_code,
    sb_address: transactionResponse?.sending_business?.address,
    sb_city: transactionResponse?.sending_business?.city,
    sb_postal_code: transactionResponse?.sending_business?.postal_code,
    payer_transaction_code: transactionResponse?.payer_transaction_code,
    payer_transaction_reference:
      transactionResponse?.payer_transaction_reference,
    callback_url: helperService.isNotValid(webhook_url) ? null : webhook_url,
    document_reference_number: transactionResponse?.document_reference_number,
    payout_reference: payout_reference,
  };

  if (transactionResponse?.transaction_type === "B2B") {
    console.log("transaction_type....B2B");

    transactionData.rb_registered_name =
      transactionResponse?.receiving_business?.registered_name;
    transactionData.rb_country_iso_code =
      transactionResponse?.receiving_business?.country_iso_code;
    transactionData.rb_address =
      transactionResponse?.receiving_business?.address;
    transactionData.rb_city = transactionResponse?.receiving_business?.city;
    transactionData.rb_postal_code =
      transactionResponse?.receiving_business?.postal_code;
  } else if (transactionResponse?.transaction_type === "B2C") {
    console.log("transaction_type....B2C");

    transactionData.rb_registered_name =
      transactionResponse?.beneficiary?.registered_name;
    transactionData.rb_country_iso_code =
      transactionResponse?.beneficiary?.country_iso_code;
    transactionData.rb_address = transactionResponse?.beneficiary?.address;
    transactionData.rb_city = transactionResponse?.beneficiary?.city;
    transactionData.rb_postal_code =
      transactionResponse?.beneficiary?.postal_code;
    transactionData.rb_province_state =
      transactionResponse?.beneficiary?.province_state;
    transactionData.rb_firstname = transactionResponse?.beneficiary?.firstname;
    transactionData.rb_lastname = transactionResponse?.beneficiary?.lastname;
  }

  // DB Add
  return await transactionDbService.addNewTransaction(transactionData);
};

/**
 * Get Transaction By ID
 * @param {string} id
 * @returns {Promise<User>}
 */
const getById = async (id) => {
  try {
    var tx = await transactionDbService.getTransactionById(id);

    if (tx) {
      return {
        status: httpStatus.OK,
        message: "Transaction found.",
        data: tx,
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Transaction not found.",
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: error.message,
    };
  }
};

/**
 * Get Transaction By ID
 * @param {string} id
 * @returns {Promise<User>}
 */
const getByExternalId = async (id) => {
  try {
    var tx = await transactionDbService.getTransactionByExternalId(id);

    if (tx) {
      return {
        status: httpStatus.OK,
        message: "Transaction found.",
        data: tx,
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Transaction not found.",
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: error.message,
    };
  }
};

/**
 * Get Transaction By Batch ID
 * @param {string} batch_id
 * @returns {Promise<User>}
 */
const getByBatchId = async (batch_id) => {
  try {
    const transactions = await transactionDbService.getTransactionByBatchId(
      batch_id
    );

    if (Array.isArray(transactions) && transactions?.length > 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Transactions found.",
        data: transactions,
      };
    } else {
      console.log("Transaction not found.");
      return {
        status: httpStatus.NOT_FOUND,
        message: "Transactions not found.",
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: error.message,
    };
  }
};

/**
 * Check Confirm Transaction
 * @param {string} transaction_id
 * @returns {Promise<User>}
 */
const checkConfirmTransaction = async (transaction_id, status) => {
  try {
    const transactions = await transactionDbService.getTransactionByStatus(
      transaction_id,
      status
    );

    if (Array.isArray(transactions) && transactions?.length > 0) {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Transactions found.",
        data: transactions,
      };
    } else {
      return {
        status: httpStatus.NOT_FOUND,
        message: "Transactions not found.",
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: error.message,
    };
  }
};

/**
 * Get Transaction List
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const list = async (req) => {
  var transactionsResponse = await transactionDbService.getTransactions(req);

  // Check transaction created
  if (helperService.isNotValid(transactionsResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Payer list not found!",
    };
  }

  //=============================================================================================
  // Get company details
  let company_details  = await nodeServerAPIService.get_company_details();

  let txnArray = [];
  for (let transaction of transactionsResponse.data) {

    console.log("🚀 ~ list ~ transaction:", transaction);

    // Account Data
    let receiver_account_details = null;
    if (helperService.isValid(transaction?.account_data?.account_data)) {
      receiver_account_details = JSON.parse(transaction?.account_data?.account_data);
    }

    // Payer Data
    let payer_details = null;
    if (helperService.isValid(transaction?.account_data?.payer_data)) {
      payer_details = JSON.parse(transaction?.account_data?.payer_data);
    }

    let payer;
    if (helperService.isValid(transaction?.account_data?.payer_data)) {
      payer = JSON.parse(transaction?.account_data?.payer_data);
    }
    

    //=============================================================================================
    // Get receiver details by id
    let receiver = await receiverService.get_receiver_by_id(
      transaction?.receiver_id
    );

    if (helperService.isNotValid(receiver_account_details)) {
      
      //=============================================================================================
      // Get merchant details by id
      let account_details = null;
      const get_funding_details_payload = {};
      if (transaction?.account_id) {
        get_funding_details_payload.account_id = transaction?.account_id;
      } else if (transaction?.sub_merchant_id && transaction?.payer_currency) {
        get_funding_details_payload.submerchant_id = String(
          transaction?.sub_merchant_id
        );
        get_funding_details_payload.currency = transaction?.payer_currency;
      } else if (transaction?.receiver_id && transaction?.payer_currency) {
        get_funding_details_payload.receiver_id = String(
          transaction?.receiver_id
        );
        get_funding_details_payload.currency = transaction?.payer_currency;
      }
      // console.log("🚀 ~ list ~ get_funding_details_payload:", get_funding_details_payload)
      account_details = await nodeServerAPIService.get_funding_details(
        get_funding_details_payload,
        ""
      );
      console.log("🚀 ~ list ~ account_details:", account_details)

      receiver_account_details = account_details?.data;

    }
      
    let credit_party_identifiers_data;
    // if (transaction?.payer_id !== "MTN_MOMO" && transaction?.payer_id !== "ORANGE_MONEY") {
    if (!["MTN_MOMO", "ORANGE_MONEY", "MTN", "ORANGE", "AL_PAY"].includes(transaction?.payer_id) && !transaction?.payer_id?.includes('AP_') && !transaction?.payer_id?.includes('MAP_')) {

      if (helperService.isNotValid(payer)) {
      // ==============================================================================
        // Get payer details by id
        const payerResponse = await payerService.get_payer_by_id(transaction?.payer_id);
        if (payerResponse?.status !== httpStatus.OK) {
          console.log("🚀 ~ transaction_details ~ payerResponse:", payerResponse);
        }
        
        payer = payerResponse?.data;

      }
      
        // ==============================================================================
        // Check payer details and get credit party info
        let customer_type = receiver_account_details?.customer_type;
        const transaction_type = customer_type?.toLowerCase() === "business" ? payer?.transaction_types?.B2B : payer?.transaction_types?.B2C;

        const credit_party_identifiers = transaction_type?.credit_party_identifiers_accepted[0];

        if (credit_party_identifiers) {
          credit_party_identifiers_data = Object.fromEntries(
            credit_party_identifiers
              .map((key) => [
                key,
                receiver_account_details?.account_details[key],
              ])
              .filter(([_, value]) => value !== undefined)
          );
        }
        
    }

    let debit_party = {};
    // Check Type Of Transation (Settelment OR Payout)
    if (helperService.isNotValid(receiver?.sub_merchant_id)) {
      // THis is payout
      debit_party = {
        id: receiver?.receiver_id,
        name: receiver?.receiver_name,
        country: receiver?.registered_business_address,
        webhook_url: receiver?.webhook_url,
      };
    } else if (helperService.isValid(receiver?.sub_merchant_id) && helperService.isValid(receiver?.receiver_id)) {
      // THis is settelment
      debit_party = {
        id: null,
        name: company_details?.data?.company_name,
        country: company_details?.data?.company_country,
        webhook_url: null,
      };
    }

    let credit_party = {
      account_id: receiver_account_details?.account_id,
      ...receiver_account_details?.account_details,
    };

    let credit_party_identifier = receiver_account_details?.account_details;
    console.log("🚀 ~ list ~ credit_party_identifier:", credit_party_identifier)
    console.log(
      "🚀 ~ transaction_details ~ transaction?.payer_id:",
      transaction?.payer_id
    );
    if (transaction?.payer_id === "MTN_MOMO") {
      credit_party_identifier = {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: "MTN_MOMO",
        payer_name: "MTN-MOMO",
      };
    } else if (transaction?.payer_id === "ORANGE_MONEY") {
      credit_party_identifier = {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: "ORANGE_MONEY",
        payer_name: "ORANGE-MONEY",
      };
    } else if (transaction?.payer_id === "AL_PAY" || transaction?.payer_id?.includes('AP_')) {
      credit_party_identifier = {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: payer_details?.payer_id || payer?.id,
        payer_name: payer_details?.payer_name || payer?.name,
      };
    }else if (transaction?.payer_id === "MOCK_AL_PAY" || transaction?.payer_id?.includes('MAP_')) {
      credit_party_identifier = {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: payer_details?.payer_id || payer?.id,
        payer_name: payer_details?.payer_name || payer?.name,
      };
    } else if (transaction?.payer_id === "MTN") {
      credit_party_identifier = {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: "MTN",
        payer_name: "MTN",
      };
    } else if (transaction?.payer_id === "ORANGE") {
      credit_party_identifier = {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: "ORANGE",
        payer_name: "ORANGE",
      };
    } else {
      credit_party_identifier = {
        ...credit_party_identifiers_data,
        payer_id: payer?.id,
        payer_name: payer?.name,
      };
    }

    console.log("🚀 ~ list ~ credit_party_identifier2:", credit_party_identifier)


    let txnPayload = {
      order_id: transaction?.order_id,
      external_id: transaction?.external_id,
      transaction_id: transaction?.transaction_id,
      sub_merchant_id: helperService.isValid(transaction?.sub_merchant_id)
        ? transaction?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(transaction?.receiver_id)
        ? transaction?.receiver_id
        : null,
      currency: transaction?.payer?.currency,
      wallet_id: transaction?.wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: credit_party_identifier,
      debit_details: {
        debit_amount: parseFloat(transaction?.source_amount),
        currency: transaction?.source_currency,
      },
      credit_details: {
        amount: parseFloat(transaction?.destination_amount),
        currency: transaction?.destination_currency,
      },
      payout_reference: helperService.isValid(transaction?.payout_reference)
        ? transaction?.payout_reference
        : null,
      purpose_of_remittance: helperService.isValid(
        transaction?.purpose_of_remittance
      )
        ? transaction?.purpose_of_remittance
        : null,
      webhook_url: helperService.isValid(transaction?.callback_url)
        ? transaction?.callback_url
        : null,
      transaction_status: transaction?.status_message,
      transaction_status_code: "",
      order_created_date: moment(transaction?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transaction?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };
    txnArray.push(txnPayload);
  }

  transactionsResponse.data = txnArray;

  // Send success response
  return transactionsResponse;
};

/**
 * Get Transaction Details
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const transaction_details = async (transaction_id) => {
  let transactionsResponse = await transactionDbService.getTransactionById(
    transaction_id
  );
  console.log(
    "🚀 ~ transaction_details ~ transactionsResponse:",
    transactionsResponse
  );

  // Check transaction created
  if (helperService.isNotValid(transactionsResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Transaction not found!",
    };
  }

  let creation_date = moment_TZ
    .utc(transactionsResponse.creation_date)
    .tz("GMT")
    .format("DD-MM-YYYY hh:mm:ss");

  transactionsResponse.creation_date = creation_date;

  let expiration_date = moment_TZ
    .utc(transactionsResponse.expiration_date)
    .tz("GMT")
    .format("DD-MM-YYYY hh:mm:ss");

  transactionsResponse.expiration_date = expiration_date;

  // Account Data
  let receiver_account_details = null;
  if (helperService.isValid(transactionsResponse?.account_data?.account_data)) {
    receiver_account_details = JSON.parse(
      transactionsResponse?.account_data?.account_data
    );
  }

  // Payer Data
  let payer_details = null;
  if (helperService.isValid(transactionsResponse?.account_data?.payer_data)) {
    payer_details = JSON.parse(transactionsResponse?.account_data?.payer_data);
  }

  let payer;
  if (helperService.isValid(transactionsResponse?.account_data?.payer_data)) {
    payer = JSON.parse(transactionsResponse?.account_data?.payer_data);
  }

  //=============================================================================================
  // Get receiver details by id
  let receiver = await receiverService.get_receiver_by_id(
    transactionsResponse?.receiver_id
  );

  //=============================================================================================
  // Get company details
  let company_details = null;
  if (helperService.isValid(transactionsResponse?.sub_merchant_id)) {
    company_details = await nodeServerAPIService.get_company_details();
  }

  if (helperService.isNotValid(receiver_account_details)) {
    //=============================================================================================
    // Get merchant details by id
    let account_details = null;
    const get_funding_details_payload = {};
    if (transactionsResponse?.account_id) {
      get_funding_details_payload.account_id = transactionsResponse?.account_id;
    } else if (
      transactionsResponse?.sub_merchant_id &&
      transactionsResponse?.payer_currency
    ) {
      get_funding_details_payload.submerchant_id = String(
        transactionsResponse?.sub_merchant_id
      );
      get_funding_details_payload.currency =
        transactionsResponse?.payer_currency;
    } else if (
      transactionsResponse?.receiver_id &&
      transactionsResponse?.payer_currency
    ) {
      get_funding_details_payload.receiver_id = String(
        transactionsResponse?.receiver_id
      );
      get_funding_details_payload.currency =
        transactionsResponse?.payer_currency;
    }
    console.log(
      "🚀 ~ list ~ get_funding_details_payload:",
      get_funding_details_payload
    );
    account_details = await nodeServerAPIService.get_funding_details(
      get_funding_details_payload,
      ""
    );

    receiver_account_details = account_details?.data;
  }

  let credit_party_identifiers_data;
  if (
    !["MTN_MOMO", "ORANGE_MONEY", "MTN", "ORANGE", "AL_PAY"].includes(
      transactionsResponse?.payer_id
    )
  ) {
    if (helperService.isNotValid(payer)) {
      // ==============================================================================
      // Get payer details by id
      const payerResponse = await payerService.get_payer_by_id(
        transactionsResponse?.payer_id
      );
      if (payerResponse?.status !== httpStatus.OK) {
        console.log("🚀 ~ transaction_details ~ payerResponse:", payerResponse);
        return;
      }

      payer = payerResponse?.data;
    }

    // ==============================================================================
    // Check payer details and get credit party info
    let customer_type = receiver_account_details?.customer_type;
    const transaction_type =
      customer_type?.toLowerCase() === "business"
        ? payer?.transaction_types?.B2B
        : payer?.transaction_types?.B2C;

    const credit_party_identifiers =
      transaction_type?.credit_party_identifiers_accepted[0];

    if (credit_party_identifiers) {
      credit_party_identifiers_data = Object.fromEntries(
        credit_party_identifiers
          .map((key) => [key, receiver_account_details?.account_details[key]])
          .filter(([_, value]) => value !== undefined)
      );
    }
  }

  // ==============================================================================

  let debit_party = {};
  // Check Type Of Transation (Settelment OR Payout)
  if (helperService.isNotValid(receiver?.sub_merchant_id)) {
    // THis is payout
    debit_party = {
      id: receiver?.receiver_id,
      name: receiver?.receiver_name,
      country: receiver?.registered_business_address,
      webhook_url: receiver?.webhook_url,
    };
  } else if (
    helperService.isValid(receiver?.sub_merchant_id) &&
    helperService.isValid(receiver?.receiver_id)
  ) {
    // THis is settelment
    debit_party = {
      id: null,
      name: company_details?.data?.company_name,
      country: company_details?.data?.company_country,
      webhook_url: null,
    };
  }

  let credit_party = {
    account_id: receiver_account_details?.account_id,
    ...receiver_account_details?.account_details,
  };
  // console.log("🚀 ~ transaction_details ~ receiver_account_details?.account_details:", receiver_account_details?.account_details)

  let credit_party_identifier = receiver_account_details?.account_details;
  console.log(
    "🚀 ~ transaction_details ~ transactionsResponse?.payer_id:",
    transactionsResponse?.payer_id
  );
  if (transactionsResponse?.payer_id === "MTN_MOMO") {
    credit_party_identifier = {
      MSISDN: receiver_account_details?.account_details.MSISDN,
      payer_id: "MTN_MOMO",
      payer_name: "MTN-MOMO",
    };
  } else if (transactionsResponse?.payer_id === "ORANGE_MONEY") {
    credit_party_identifier = {
      MSISDN: receiver_account_details?.account_details.MSISDN,
      payer_id: "ORANGE_MONEY",
      payer_name: "ORANGE-MONEY",
    };
  } else if (
    transactionsResponse?.payer_id === "AL_PAY" ||
    transactionsResponse?.payer_id?.includes("AP_")
  ) {
    credit_party_identifier = {
      MSISDN: receiver_account_details?.account_details.MSISDN,
      payer_id: payer_details?.payer_id || payer?.id,
      payer_name: payer_details?.payer_name || payer?.name,
    };
  } else if (transactionsResponse?.payer_id === "MTN") {
    credit_party_identifier = {
      MSISDN: receiver_account_details?.account_details.MSISDN,
      payer_id: "MTN",
      payer_name: "MTN",
    };
  } else if (transactionsResponse?.payer_id === "ORANGE") {
    credit_party_identifier = {
      MSISDN: receiver_account_details?.account_details.MSISDN,
      payer_id: "ORANGE",
      payer_name: "ORANGE",
    };
  } else if (
    transactionsResponse?.payer_id === "MOCK_AL_PAY" ||
    transactionsResponse?.payer_id?.includes("MAP_")
  ) {
    credit_party_identifier = {
      MSISDN: receiver_account_details?.account_details.MSISDN,
      payer_id: payer_details?.payer_id || payer?.id,
      payer_name: payer_details?.payer_name || payer?.name,
    };
  } else {
    credit_party_identifier = {
      ...credit_party_identifiers_data,
      payer_id: payer?.id,
      payer_name: payer?.name,
    };
  }

  let txnPayload = {
    order_id: transactionsResponse?.order_id,
    external_id: transactionsResponse?.external_id,
    transaction_id: transactionsResponse?.transaction_id,
    sub_merchant_id: helperService.isValid(
      transactionsResponse?.sub_merchant_id
    )
      ? transactionsResponse?.sub_merchant_id
      : null,
    receiver_id: helperService.isValid(transactionsResponse?.receiver_id)
      ? transactionsResponse?.receiver_id
      : null,
    currency: transactionsResponse?.payer?.currency,
    wallet_id: transactionsResponse?.wallet_id,
    debit_party: debit_party,
    credit_party: credit_party,
    credit_party_identifier: credit_party_identifier,
    debit_details: {
      debit_amount: parseFloat(transactionsResponse?.source_amount),
      currency: transactionsResponse?.source_currency,
    },
    credit_details: {
      amount: parseFloat(transactionsResponse?.destination_amount),
      currency: transactionsResponse?.destination_currency,
    },
    payout_reference: helperService.isValid(
      transactionsResponse?.payout_reference
    )
      ? transactionsResponse?.payout_reference
      : null,
    purpose_of_remittance: helperService.isValid(
      transactionsResponse?.purpose_of_remittance
    )
      ? transactionsResponse?.purpose_of_remittance
      : null,
    webhook_url: helperService.isValid(transactionsResponse?.callback_url)
      ? transactionsResponse?.callback_url
      : null,
    transactions_status: transactionsResponse?.status_message,
    transactions_status_code: "",
    order_created_date: transactionsResponse?.creation_date,
    order_updated_date: transactionsResponse?.creation_date,
    batch_id: null,
  };

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction found!",
    data: txnPayload,
  };
};

const check_order_id_exists = async (order_id) => {
  let transactionsResponse = await transactionDbService.getTransactionByOrderId(
    order_id
  );

  // Check transaction created
  if (helperService.isNotValid(transactionsResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Transaction not found!",
    };
  }

  let creation_date = moment_TZ
    .utc(transactionsResponse.creation_date)
    .tz("GMT")
    .format("DD-MM-YYYY hh:mm:ss");

  transactionsResponse.creation_date = creation_date;

  let expiration_date = moment_TZ
    .utc(transactionsResponse.expiration_date)
    .tz("GMT")
    .format("DD-MM-YYYY hh:mm:ss");

  transactionsResponse.expiration_date = expiration_date;

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction found!",
    data: transactionsResponse,
  };
};

const transaction_attachment = async (external_id) => {
  // let transactionsResponse = await transactionDbService.getTransactionById(
  //   external_id
  // );

  // // Check transaction created
  // if (helperService.isNotValid(transactionsResponse)) {
  //   return {
  //     status: httpStatus.NOT_FOUND,
  //     message: "Transaction not found!",
  //   };
  // }

  let attachmentResponse = await attachmentDbService.findOne(
    {external_id: external_id}
  );

  // Send success response
  return attachmentResponse;
};

const transaction_attachment_by_name = async (file_name) => {

  let attachmentResponse = await attachmentDbService.findOne(
    {file_name: file_name}
  );

  // Send success response
  return attachmentResponse;
};

module.exports = {
  checkConfirmTransaction,
  addNewTransaction,
  getById,
  getByBatchId,
  list,
  transaction_details,
  check_order_id_exists,
  transaction_attachment,
  getByExternalId,
  transaction_attachment_by_name
};
