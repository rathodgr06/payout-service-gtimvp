const httpStatus = require("http-status");
const helperService = require("./helper.service");
const payoutRoutesService = require("./payout_routes.service");
const receiverService = require("./receiver.service");
const quotationDbService = require("./quotation.db.service");
const transactionDbService = require("./transaction.db.service");
const transactionService = require("./transactions.service");
const accountDetailsService = require("./account_details.service");
const db = require("../models");
const ApiError = require("../utils/ApiError");
const beneficiary = require("../models/beneficiary");
const nodeServerService = require("../service/node_server.service");
const nodeServerAPIService = require("../service/node_server_api.service");
const { ref } = require("joi");
const pspService = require("./psp.service");
const createApiClient = require("./thunes_client.service");
const createGeneralApiClient = require("../service/api_client.service");
const moment = require("moment");
const FormData = require('form-data');
const fs = require('fs');

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_wallet_balance = async (balance_payload) => {
  // const balance_payload = {
  //   sub_merchant_id: sub_merchant_id,
  //   currency: source_currency,
  // };

  // Axios API request
  var receiverResponse = "";
  try {
    let url = "/fetch-wallet-balance";
    receiverResponse = await nodeServerService.post(url, balance_payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(receiverResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Balance is not fetch",
    };
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Balance fetched!",
    data: receiverResponse,
  };
};

/**
 * Create Quotation
 * @param {*} param
 * @returns Created Quotation
 */
const create_quotations = async (request_payload) => {
  const receiver = request_payload?.extra?.receiver;
  const receiver_account_details = request_payload?.account_details;
  const payer = request_payload?.extra?.payer;
  const MID = request_payload?.extra?.MID;

  let super_merchant_id = "";
  let sub_merchant_id = receiver?.sub_merchant_id;
  let external_id = await helperService.make_unique_id();

  //   Axios Payload
  var payload = {
    external_id: external_id,
    payer_id: receiver_account_details?.payer_id,
    mode: "DESTINATION_AMOUNT",
    transaction_type: receiver_account_details?.customer_type?.toLowerCase() === "business" ? "B2B" : "B2C",
    source: {
      amount: null,
      currency: "USD",
      country_iso_code: "USA",
    },
    destination: {
      amount: request_payload?.destination_amount,
      currency: receiver_account_details?.currency,
    },
  };

  // If debit amount and debit currency mentions
  if (request_payload?.debit_amount && request_payload?.debit_currency) {
    payload = {
      external_id: external_id,
      payer_id: receiver_account_details?.payer_id,
      mode: "SOURCE_AMOUNT",
      transaction_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business" ? "B2B" : "B2C",
      source: {
        amount: request_payload?.debit_amount,
        currency: request_payload?.debit_currency,
        country_iso_code: "USA",
      },
      destination: {
        amount: null,
        currency: receiver_account_details?.currency,
      },
    };
  }

  console.log("🚀 ~ constcreate_quotations= ~ payload:", payload)
  // return;

  // Axios API request
  var quotationResponse = "";
  try {
    const api = createApiClient(MID?.api_key, MID?.password);

    let url = "/quotations";
    quotationResponse = await api.post(url, payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: err.message,
    };
  }

  // Check response
  if (helperService.isNotValid(quotationResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Quotation not created!",
    };
  }

  // Save Quotation Payload
  const newQuotationData = {
    id: quotationResponse?.id,
    external_id: quotationResponse?.external_id,
    receiver_id: receiver?.receiver_id,
    super_merchant_id: super_merchant_id,
    sub_merchant_id: sub_merchant_id,
    mode: quotationResponse?.mode,
    transaction_type: quotationResponse?.transaction_type,
    wholesale_fx_rate: quotationResponse?.wholesale_fx_rate, // Can be string or number
    destination_amount: quotationResponse?.destination?.amount,
    destination_currency: quotationResponse?.destination?.currency,
    sent_amount: quotationResponse?.sent_amount?.amount,
    sent_currency: quotationResponse?.sent_amount?.currency,
    source_amount: quotationResponse?.source?.amount,
    source_currency: quotationResponse?.source?.currency,
    source_country_iso_code: quotationResponse?.source?.country_iso_code,
    fee_amount: quotationResponse?.fee?.amount,
    fee_currency: quotationResponse?.fee?.currency,
    creation_date: quotationResponse?.creation_date,
    expiration_date: quotationResponse?.expiration_date,
    payer_country_iso_code: quotationResponse?.payer?.country_iso_code,
    payer_currency: quotationResponse?.payer?.currency,
    payer_id: quotationResponse?.payer?.id,
    payer_name: quotationResponse?.payer?.name,
    service_id: quotationResponse?.payer?.service?.id,
    service_name: quotationResponse?.payer?.service?.name,
  };

  // On Quotation Created
  // Save Quotation
  let saveQuotationResult = await quotationDbService.addNewQuotation(
    newQuotationData
  );

  if (saveQuotationResult?.status !== httpStatus.OK) {
    return saveQuotationResult;
  }

  //Set Callback url for post transaction
  // quotationResponse.callback = process.env.THUNES_WEBHOOK;

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Quotation created successfully",
    data: quotationResponse,
  };
};

/**
 * Post | Create Transaction
 * @param {*} req post request data
 * @param {*} quotationResponse quotation response
 * @returns
 */
const post_transaction = async (quotation, payer, receiver, receiver_account_details, batch_id, MID) => {
 

  let sending_business = {
    registered_name: "GTI",
    registration_number: "123456",
    country_iso_code: "USA",
    address: "USA",
    city: "New York",
    code: "94111"
  };

  const account_details = receiver_account_details?.account_details;
  console.log(`account details`);
  console.log(account_details);
  if (account_details.payer_id == "MTN_MOMO") {
    console.log(`here goes mtn momo `);
  } else {
    console.log(`here goes thunes `);

    
    let customer_type = receiver_account_details?.customer_type;
    const transaction_type = customer_type?.toLowerCase() === "business" ? payer?.transaction_types?.B2B : payer?.transaction_types?.B2C;

    const credit_party_identifiers = transaction_type?.credit_party_identifiers_accepted[0];
    const required_receiving_entity_fields =
      transaction_type?.required_receiving_entity_fields[0];
    const required_sending_entity_fields =
      transaction_type?.required_sending_entity_fields[0];

    const credit_party_identifiers_data = Object.fromEntries(
      credit_party_identifiers
        .map((key) => [key, account_details[key]])
        .filter(([_, value]) => value !== undefined)
    );

    const required_receiving_entity_fields_data = Object.fromEntries(
      required_receiving_entity_fields
        .map((key) => [key, account_details[key]])
        .filter(([_, value]) => value !== undefined)
    );

    const required_sending_entity_fields_data = Object.fromEntries(
      required_sending_entity_fields
        .map((key) => [key, sending_business[key]])
        .filter(([_, value]) => value !== undefined)
    );

    let doc_reference_number = helperService.make_unique_id();
    var payload = {
      credit_party_identifier: credit_party_identifiers_data,
      callback_url: process.env.THUNES_WEBHOOK,
      sending_business: required_sending_entity_fields_data,
      external_id: quotation?.external_id,
      purpose_of_remittance: helperService.isNotValid(quotation?.request?.purpose_of_remittance) ? "OTHER_FEES" : quotation?.request?.purpose_of_remittance,
      document_reference_number: doc_reference_number,
    };

    if (customer_type?.toLowerCase() === "business") {
      payload.receiving_business = required_receiving_entity_fields_data;
    }else{
      payload.beneficiary = required_receiving_entity_fields_data;
    }


    console.log("🚀 ~ constpost_transaction= ~ payload:", payload)

    return await create_transaction_API_Call(
      payload,
      quotation,
      receiver,
      receiver_account_details,
      batch_id,
      MID,
      payer
    );
  }
};

/**
 * API Call Post Transaction
 * @param {*} payload
 * @returns
 */
const create_transaction_API_Call = async (
  payload,
  quotation,
  receiver,
  receiver_account_details,
  batch_id,
  MID,
  payer
) => {
  // Axios API request
  var postTransactionResponse = "";
  var quotationID =
    quotation.quotation_id == undefined ? quotation.id : quotation.quotation_id;
  try {
    let url = "/quotations/" + quotationID + "/transactions";
    const api = createApiClient(MID?.api_key, MID?.password);
    postTransactionResponse = await api.post(url, payload);

  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(postTransactionResponse)) {
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Transaction not created!",
    };
  }

  // Save Transaction
  const transactionData = {
    transaction: postTransactionResponse,
    super_merchant_id: null,
    sub_merchant_id: receiver?.sub_merchant_id,
    quotation_id: quotation?.quotation_id,
    receiver_id: receiver?.receiver_id,
    batch_id: batch_id,
    mid_id: MID?.id,
    order_id: quotation?.request?.order_id,
    wallet_id: quotation?.request?.wallet_id,
    account_id: quotation?.request?.account_id,
    payout_reference: quotation?.request?.payout_reference,
    webhook_url: quotation?.request?.webhook_url,
  };
  console.log("🚀 ~ create_transaction_API_Call ~ transactionData:", transactionData)

  // DB Add
  var result = await transactionService.addNewTransaction(transactionData);
  if (result.status !== httpStatus.OK) {
    console.log("🚀 ~ create_transaction_API_Call ~ result:", result)
  }

  //=============================================================================================
  // DB Save account and payers data
  let account_for = "";
  if (helperService.isNotValid(receiver_account_details?.sub_merchant_id) && helperService.isValid(receiver_account_details?.receiver_id)) {
    account_for = "payout";
  } else {
    account_for = "settlement";
  }
  
  let account_data = {
    transaction_id: transactionData?.transaction?.id,
    order_id: transactionData?.order_id,
    external_id: transactionData?.transaction?.external_id,
    receiver_id: transactionData?.receiver_id,
    sub_merchant_id: helperService.isNotValid(transactionData?.sub_merchant_id) ? 0 : transactionData?.sub_merchant_id,
    transaction_date: transactionData?.transaction?.creation_date,
    account_id: transactionData?.account_id,
    account_type: receiver_account_details?.customer_type?.toLowerCase() === 'business' ? 2 : 1,
    account_for: account_for,
    account_data: JSON.stringify(receiver_account_details),
    payer_id: transactionData?.transaction?.payer?.id,
    payer_name: transactionData?.transaction?.payer?.name,
    payer_currency: transactionData?.transaction?.payer?.currency,
    payer_data: JSON.stringify(payer),
  }
  console.log("🚀 ~ create_transaction_API_Call ~ account_data:", account_data)

  let account_result = await accountDetailsService.add(account_data);
  console.log("🚀 ~ create_transaction_API_Call ~ account_result:", account_result)

  //=============================================================================================
  // Build And Return Response
  
  let debit_party = {};
  // Check Type Of Transation (Settelment OR Payout)
  if (helperService.isNotValid(receiver?.sub_merchant_id)) {
    // This is payout
    debit_party = {
      id: receiver?.receiver_id,
      name: receiver?.receiver_name,
      country: receiver?.registered_business_address,
      webhook_url: receiver?.webhook_url,
    }
  }else if (helperService.isValid(receiver?.sub_merchant_id) && helperService.isValid(receiver?.receiver_id)) {
    // This is settelment
    debit_party = {
      id: null,
      name: 'Paydart',
      country: 'UAE',
      webhook_url: null,
    }
  }

  let credit_party = {
    account_id: receiver_account_details?.account_id,
    ...receiver_account_details?.account_details,
  }

  let credit_party_identifier = {
    ...postTransactionResponse?.credit_party_identifier,
    payer_id: receiver_account_details?.payer_id,
    payer_name: receiver_account_details?.payer_name,
  }
  
  const responsePayload = {
    order_id: quotation?.request?.order_id,
    external_id: postTransactionResponse?.external_id,
    transaction_id: postTransactionResponse?.id,
    sub_merchant_id: receiver?.sub_merchant_id,
    receiver_id: receiver?.receiver_id,
    currency: postTransactionResponse?.destination?.currency,
    wallet_id: quotation?.request?.wallet_id,
    debit_party: debit_party,
    credit_party: credit_party,
    credit_party_identifier: credit_party_identifier,
    debit_details: {
      debit_amount: postTransactionResponse?.sent_amount?.amount,
      currency: postTransactionResponse?.sent_amount?.currency,
    },
    credit_details: {
      amount: postTransactionResponse?.destination?.amount,
      currency: postTransactionResponse?.destination?.currency,
    },
    payout_reference: helperService.isValid(quotation?.request?.payout_reference)
      ? quotation?.request?.payout_reference
      : null,
    webhook_url: helperService.isValid(quotation?.request?.webhook_url) ? quotation?.request?.webhook_url : null,
    document_reference_number: postTransactionResponse?.document_reference_number,
    purpose_of_remittance: helperService.isValid(quotation?.request?.purpose_of_remittance)
      ? quotation?.request?.purpose_of_remittance
      : null,
    transaction_status: postTransactionResponse?.status_message,
    transaction_status_code: postTransactionResponse?.status,
    order_created_date: moment(postTransactionResponse?.creation_date).format("YYYY-MM-DD hh:mm:ss"),
    order_updated_date: moment(postTransactionResponse?.creation_date).format("YYYY-MM-DD hh:mm:ss"),
    batch_id: batch_id,
  };
  
  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction created successfully",
    data: responsePayload,
  };
};

/**
 * Confirm Transaction
 * @param {*} req
 * @returns
 */
const confirm_transaction = async (transaction_id, batch_id = null, MID, request, receiver_account_details) => {
  // Axios API request
  var confirmTransactionResponse = "";
  try {
    let url = "/transactions/" + transaction_id + "/confirm";
    const api = createApiClient(MID?.api_key, MID?.password);
    confirmTransactionResponse = await api.post(url, {});

  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: err.message,
    };
  }

  // Check is transaction created
  if (helperService.isNotValid(confirmTransactionResponse)) {
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Transaction not created!",
    };
  }

  let external_id = confirmTransactionResponse?.external_id;

  var quotation = await quotationDbService.getQuotationByExternalId(
    external_id
  );
  // Check quotation created
  if (helperService.isNotValid(quotation)) {
    return {
      status: 400,
      message: "Quotation not found!",
    };
  }

  var receiver = await receiverService.get_receiver_by_id(
    quotation?.receiver_id,
    quotation?.destination_currency
  );
  // Check receiver created
  if (helperService.isNotValid(receiver)) {
    return {
      status: 400,
      message: "Receiver not found!",
    };
  }

  // Save Transaction
  const transactionData = {
    transaction: confirmTransactionResponse,
    super_merchant_id: null,
    sub_merchant_id: receiver?.sub_merchant_id,
    quotation_id: quotation?.quotation_id,
    receiver_id: receiver?.receiver_id,
    order_id: request?.order_id,
    wallet_id: request?.wallet_id,
    account_id: request?.account_id,
    batch_id: batch_id,
    mid_id: MID?.id,
    payout_reference: request?.payout_reference,
    webhook_url: request?.webhook_url,
  };

  // DB Add
  var result = await transactionService.addNewTransaction(transactionData);
  if (result.status !== httpStatus.OK) {
    new ApiError(httpStatus.INTERNAL_SERVER_ERROR, result.message);
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
    }
  }else if (helperService.isValid(receiver?.sub_merchant_id) && helperService.isValid(receiver?.receiver_id)) {
    // THis is settelment 
    debit_party = {
      id: null,
      name: 'Paydart',
      country: 'UAE',
      webhook_url: null,
    }
  }

  let credit_party = {
    account_id: receiver_account_details?.account_id,
    ...receiver_account_details?.account_details,
  }

  let credit_party_identifier = {
    ...confirmTransactionResponse?.credit_party_identifier,
    payer_id: receiver_account_details?.payer_id,
    payer_name: receiver_account_details?.payer_name,
  }
  
  const responsePayload = {
    order_id: request?.order_id,
    external_id: confirmTransactionResponse?.external_id,
    transaction_id: confirmTransactionResponse?.id,
    sub_merchant_id: receiver?.sub_merchant_id,
    receiver_id: receiver?.receiver_id,
    currency: confirmTransactionResponse?.destination?.currency,
    wallet_id: request?.wallet_id,
    debit_party: debit_party,
    credit_party: credit_party,
    credit_party_identifier: credit_party_identifier,
    debit_details: {
      debit_amount: confirmTransactionResponse?.sent_amount?.amount,
      currency: confirmTransactionResponse?.sent_amount?.currency,
    },
    credit_details: {
      amount: confirmTransactionResponse?.destination?.amount,
      currency: confirmTransactionResponse?.destination?.currency,
    },
    payout_reference: helperService.isValid(quotation?.request?.payout_reference)
      ? quotation?.request?.payout_reference
      : null,
    webhook_url: helperService.isValid(quotation?.request?.webhook_url) ? quotation?.request?.webhook_url : null,
    document_reference_number: confirmTransactionResponse?.document_reference_number,
    purpose_of_remittance: helperService.isValid(quotation?.request?.purpose_of_remittance)
      ? quotation?.request?.purpose_of_remittance
      : null,
    transaction_status: confirmTransactionResponse?.status_message,
    transaction_status_code: confirmTransactionResponse?.status,
    order_created_date: moment(confirmTransactionResponse?.creation_date).format("YYYY-MM-DD hh:mm:ss"),
    order_updated_date: moment(confirmTransactionResponse?.creation_date).format("YYYY-MM-DD hh:mm:ss"),
    payout_reference: quotation?.request?.payout_reference,
    batch_id: batch_id,
  };

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction confirmed successfully",
    data: responsePayload,
  };
};

/**
 * Transaction Status
 * @param {*} req
 * @returns
 */
const transaction_status = async (transaction_id, MID) => {
  // Axios API request
  var transactionResponse = "";
  try {
    let url = "/transactions/" + transaction_id;
    const api = createApiClient(MID?.api_key, MID?.password);
    transactionResponse = await api.get(url);

  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: err.message,
    };
  }

  // Check is transaction created
  if (helperService.isNotValid(transactionResponse)) {
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Transaction not found!",
    };
  }

  const responsePayload = {
    transaction_id: transactionResponse?.id,
    transaction_status: transactionResponse?.status_message,
    status_code: transactionResponse?.status,
    ...transactionResponse,
  };

  delete responsePayload.id;
  delete responsePayload.status;
  delete responsePayload.status_message;

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction found",
    data: responsePayload,
  };
};

/**
 * Transaction cancel
 * @param {*} req
 * @returns
 */
const transaction_cancel = async (transaction_id, MID) => {
  // Axios API request
  var transactionCancelResponse = "";
  try {
    let url = "/transactions/" + transaction_id + "/cancel";
    const api = createApiClient(MID?.api_key, MID?.password);
    transactionCancelResponse = await api.get(url);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: err.message,
    };
  }

  // Check is transaction created
  if (helperService.isNotValid(transactionCancelResponse)) {
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Transaction not cancelled!",
    };
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction cancelled",
    data: transactionCancelResponse,
  };
};

const get_payout_list = async (req, res) => {
  try {
    return await transactionDbService.get_transaction_list(req, res);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

const makeMTNMomoRequest = async (req, res) => {};

const find_mid_by_psp = async (psp_id) => {
  let MID = await pspService.find_routing_mid({ psp_id: psp_id });
  return MID;
};

const find_mid_by_psp_and_receiver = async (psp_id, receiver_id) => {
  let MID = await pspService.find_routing_mid({ psp_id: psp_id , receiver_id: receiver_id});
  return MID;
};

/**
 * Payout routing
 * @param {*} receiver_account_details 
 * @returns 
 */
const payout_psp_routing = async (receiver_account_details) => {
  console.log("🚀 ~ payout_psp_routing ~ receiver_account_details:", receiver_account_details)
  let funding_source_type = receiver_account_details?.funding_source_type;
  let funding_souce_country = receiver_account_details?.country;
  let currency = receiver_account_details?.currency;
  let payerID = receiver_account_details?.payer_id;

  const conditionPayload = {
    country_iso: funding_souce_country,
    account_type: funding_source_type,
    currency: currency,
    payer_id: payerID,
  };
  console.log(conditionPayload);
  
  if (conditionPayload?.payer_id?.includes("MAP_")) {
    conditionPayload.payer_id = "MOCK_AL_PAY";
  } else if (conditionPayload?.payer_id?.includes("AP_")) {
    conditionPayload.payer_id = "AL_PAY";
  } else if (
    conditionPayload.payer_id !== "MTN_MOMO" &&
    conditionPayload.payer_id !== "MTN" &&
    conditionPayload.payer_id != "ORANGE_MONEY" &&
    conditionPayload.payer_id != "ORANGE"
  ) {
    conditionPayload.payer_id = "NA";
  }
  
  console.log("🚀 ~  conditionPayload:", conditionPayload);

  // Find PSP
  let route = await payoutRoutesService.find_payout_routes(conditionPayload);
  console.log("🚀 ~ constpayout_psp_routing= ~ route:", route)
  
  if (route?.status == httpStatus.OK) {
    let RouteList = route?.data;
    RouteList = Array.isArray(RouteList) ? RouteList : [];

     if (RouteList?.length < 1) {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Route not found!",
      };
     }

    
    let psp_id = RouteList[0]?.psp_id;
    
    // Find MID By Receiver ID (Override MID)
    let MID = await find_mid_by_psp_and_receiver(psp_id, receiver_account_details?.receiver_id);

    if (MID?.status == httpStatus.OK) {
      console.log("...... Override MID found .......");
    }

    if (MID?.status !== httpStatus.OK) {
      // Check account details
      // if (helperService.isNotValid(receiver_account_details?.submerchant_id) && helperService.isValid(receiver_account_details?.receiver_id)) {
      //   // This is a payout account, and payout transactions are only allowed through the default MID.
      //   return {
      //     status: httpStatus.BAD_REQUEST,
      //     message: "Payout MID not found!",
      //   };
      // }

      // Find Default MID By PSP ID (Default MID)
      MID = await find_mid_by_psp(psp_id);
      if (MID?.status == httpStatus.OK) {
        console.log("...... Default MID found .......");
      }
    }

    if (
      (MID?.status !== httpStatus.OK && payerID === "MTN_MOMO") ||
      (MID?.status !== httpStatus.OK && payerID === "MTN") ||
      (MID?.status !== httpStatus.OK && payerID === "ORANGE_MONEY") ||
      (MID?.status !== httpStatus.OK && payerID === "ORANGE") ||
      (MID?.status !== httpStatus.OK && payerID?.includes("AP_")) ||
      (MID?.status !== httpStatus.OK && payerID === "MAP_")
    ) {
      console.log("Retry...........");

      if (RouteList.length > 1) {
        psp_id = RouteList[1]?.psp_id;
        MID = await find_mid_by_psp(psp_id);
        if (MID?.status == httpStatus.OK) {
          return MID;
        }
      }

      receiver_account_details.payer_id = "NA";
      payout_psp_routing(receiver_account_details);
    }

    // Here return a found MID
    return MID;
  }


  return {
    status: httpStatus.BAD_REQUEST,
    message: "MID not found!",
  };
};


/**
 * Send Webhook
 * @param {*} payload 
 * @returns 
 */
const send_webhook = async (webhookPayload) => {
  let webhook_result;
  try {
    let webhook_url = null;
    let webhook_secret = null;
    if (helperService.isNotValid(webhookPayload?.webhook_url)) {
      if (helperService.isValid(webhookPayload?.sub_merchant_id)) {
        const MERCHANT = await nodeServerAPIService.get_merchant_webhook_settings(webhookPayload?.sub_merchant_id);
        console.log("🚀 ~ MERCHANT:", MERCHANT);
        webhook_url = MERCHANT?.data.notification_url;
        webhook_secret = MERCHANT?.data.notification_secret;
      } else if (helperService.isValid(webhookPayload?.receiver_id)) {
        const RECEIVER = await receiverService.get_receiver_by_id(webhookPayload?.receiver_id);
        webhook_url = RECEIVER?.webhook_url;
        webhook_secret = RECEIVER?.webhook_secret;
      }
    }else{
      webhook_url = webhookPayload?.webhook_url;
    }

    console.log("🚀 ~ webhook_url:", webhook_url);

    // POST data on webhook url
    if (helperService.isValid(webhook_url)) {
      var client = createGeneralApiClient();
      webhook_result = await client.post(
        webhook_url,
        webhookPayload,
        {
          headers: {
            "notification-secret": webhook_secret,
          },
        }
      );
      console.log("🚀 ~ webhook_result:", webhook_result);
    }
  } catch (error) {
    console.log("🚀 ~ send_webhook ~ error:", error)
  }
  return webhook_result;
};

const add_transaction_attachment = async (MID, file, type, transaction_id) => {
  console.log("🚀 ~ add_transaction_attachment ~ file:", file)
  // Axios API request
  var transactionAttachmentResponse = "";
  try {
    let url = "/transactions/" + transaction_id + "/attachments";
    const api = createApiClient(MID?.api_key, MID?.password);

    if (!fs.existsSync(file.path)) {
      console.error("❌ File does not exist:", file.path);
      return {
        status: httpStatus.BAD_REQUEST,
        message: "file not found",
      };
    }
    
    const form = new FormData();
    // form.append('file', fs.createReadStream(file.path));
    form.append("file", fs.createReadStream(file.path), {
      filename: file.originalname, // optional but helpful
      contentType: file.mimetype, // optional
    });
    form.append("name", file.originalname);
    form.append("type", type);
    
    transactionAttachmentResponse = await api.postMultipart(url, form);
    console.log("🚀 ~ add_transaction_attachment ~ transactionAttachmentResponse:", transactionAttachmentResponse)
    
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: err.message,
    };
  }

  // Check is transaction created
  if (helperService.isNotValid(transactionAttachmentResponse)) {
    return {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Transaction not attached!",
    };
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Transaction attachement is successful",
    data: transactionAttachmentResponse,
  };
};

module.exports = {
  get_payout_list,
  create_quotations,
  post_transaction,
  confirm_transaction,
  transaction_status,
  transaction_cancel,
  get_wallet_balance,
  payout_psp_routing,
  send_webhook,
  add_transaction_attachment
};
