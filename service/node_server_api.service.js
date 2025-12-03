const httpStatus = require("http-status");
const helperService = require("./helper.service");
const nodeServerService = require("./node_server.service");
const pspDBService = require("./psp.db.service");
const midDBService = require("./mid.db.service");
const ApiError = require("../utils/ApiError");
const createApiClient = require("./node_server_client.service");


/**
 * API Call Get Sub Merchant Profile Details
 * @param {*} sub_merchant_id
 * @param {*} token
 * @returns Profile Details
 */
const get_sub_merchants = async (token) => {
  const payload = {
    status: "Active"
  };

  // Axios API request
  var profileResponse = "";
  try {
    let url = "submerchant/list";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const api = createApiClient(username, password, token);
    profileResponse = await api.post(url, payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(profileResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return profileResponse;
};

/**
 * API Call Get Sub Merchant Profile Details
 * @param {*} sub_merchant_id
 * @param {*} token
 * @returns Profile Details
 */
const get_sub_merchant_profile = async (sub_merchant_id, token) => {
  const payload = {
    submerchant_id: sub_merchant_id,
    entity_id: "",
    document_for: "",
  };

  // Axios API request
  var profileResponse = "";
  try {
    let url = "merchant-ekyc/get-submerchant-profile";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const api = createApiClient(username, password, token);
    profileResponse = await api.post(url, payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(profileResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return profileResponse;
};

/**
 * API Call Get Sub Merchant Profile Details
 * @param {*} sub_merchant_id
 * @param {*} token
 * @returns Profile Details
 */
const get_sub_merchant_details = async (sub_merchant_id) => {
  const payload = {
    submerchant_id: sub_merchant_id,
  };

  // Axios API request
  var token = "";
  var profileResponse = "";
  try {
    let url = "get-submerchant-details";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const api = createApiClient(username, password, token);
    profileResponse = await api.post(url, payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(profileResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Submerchant details not found!",
    };
  }

  // Send success response
  if (profileResponse?.status === 'success') {
    return {
      status: httpStatus.OK,
      message: "Submerchant details found!",
      data: profileResponse?.data
    };
  }else{
    return {
      status: httpStatus.NOT_FOUND,
      message: "Submerchant details not found!",
    };
  }
};

/**
 * API Call Get Sub Merchant Profile Details
 * @param {*} sub_merchant_id
 * @param {*} token
 * @returns Profile Details
 */
const get_company_details = async () => {
  // Axios API request
  var token = "";
  var profileResponse = "";
  try {
    let url = "get-company-details";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const api = createApiClient(username, password, token);
    profileResponse = await api.get(url);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(profileResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return profileResponse;
};

/**
 * API Call Get Sub Merchant Profile Details
 * @param {*} sub_merchant_id
 * @param {*} token
 * @returns Profile Details
 */
const get_funding_details = async (payload, token) => {
  
  // Axios API request
  var accountResponse = "";
  try {
    let url = "funding-details";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const api = createApiClient(username, password, token);
    accountResponse = await api.post(url, payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check account data
  if (helperService.isNotValid(accountResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Funding details not found!",
    };
  }

  if (accountResponse?.status === "success") {
    return {
      status: httpStatus.OK,
      message: accountResponse?.message,
      data: accountResponse?.data,
    };
  } else {
    return {
      status: httpStatus.BAD_REQUEST,
      message: accountResponse?.message,
    };
  }
};

/**
 * API Call Update Fun Details From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const update_payout_status = async (req, payload) => {
  
  // Axios API request
  var profileResponse = "";
  try {
    let url = "update-payout-status";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const token = "";
    const api = createApiClient(username, password, token);
    profileResponse = await api.post(url, payload);
  } catch (err) {
    // console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(profileResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return profileResponse;
};

/**
 * API Call Update Fun Details From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_payout_countries = async () => {
  
  // Axios API request
  var countriesResponse = "";
  try {
    let url = "fetch-payout-countries";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const token = "";
    const api = createApiClient(username, password, token);
    countriesResponse = await api.get(url);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(countriesResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return countriesResponse;
};

/**
 * API Call Update Fun Details From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_curencies = async (payload) => {
  
  // Axios API request
  var curenciesResponse = "";
  try {
    let url = "fetch-currency-by-country";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const token = "";
    const api = createApiClient(username, password, token);
    curenciesResponse = await api.post(url, payload);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(curenciesResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return curenciesResponse;
};

/**
 * API Call Get Wallet Details From Node Server
 * @param {string} wallet_id
 * @returns {Promise<User>}
 */
const get_wallet_details_by_id = async (wallet_id) => {
  
  // Axios API request
  var walletResponse = "";
  try {
    let url = "get-wallet-by-id/" + wallet_id;
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const token = "";
    const api = createApiClient(username, password, token);
    walletResponse = await api.get(url);
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(walletResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Wallet not found!",
    };
  }

  // Send success response
  if (walletResponse?.status === "success") {
    return {
      status: httpStatus.OK,
      message: walletResponse?.message,
      data: walletResponse?.data,
    };
  } else {
    return {
      status: httpStatus.BAD_REQUEST,
      message: walletResponse?.message,
    };
  }
};

/**
 * API Call Get Wallet Details From Node Server
 * @param {string} sub_merchant_id
 * @param {string} currency
 * @returns {Promise<User>}
 */
const get_wallet_details_by_sub_id = async (payload) => {
  
  // Axios API request
  var walletResponse = "";
  try {
    let url = "get-wallet";
    const username = process.env.A_X_USERNAME;
    const password = process.env.A_X_PASSWORD;
    const token = "";
    const api = createApiClient(username, password, token);
    walletResponse = await api.post(url, payload);
    console.log("🚀 ~ get_wallet_details_by_sub_id ~ walletResponse:", walletResponse)
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(walletResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Wallet not found!",
    };
  }

  // Send success response
  if (walletResponse?.status === "success") {
    return {
      status: httpStatus.OK,
      message: walletResponse?.message,
      data: walletResponse?.data,
    };
  } else {
    return {
      status: httpStatus.BAD_REQUEST,
      message: walletResponse?.message,
    };
  }
};

/**
 * API Call Countries From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_business_reg_country_list = async () => {
  
  // Axios API request
  var countriesResponse = "";
  try {
    let url = "bus-reg-country/list";
    countriesResponse = await nodeServerService.post(url, {status: 'Active'});
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(countriesResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Countries not found!",
    };
  }

  if (countriesResponse?.status === 'success') {
    // Send success response
  return {status: 200, message: countriesResponse?.message, data: countriesResponse?.data};
  }else{
    // Send success response
  return {status: 400, message: countriesResponse?.message, data: countriesResponse?.data};
  }
};

/**
 * API Call Mobile Code Countries From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_mobile_code_country_list = async () => {
  
  // Axios API request
  var countriesResponse = "";
  try {
    let url = "ph-num-country/list";
    countriesResponse = await nodeServerService.post(url, {});
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(countriesResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Countries not found!",
    };
  }

  if (countriesResponse?.status === 'success') {
    // Send success response
  return {status: 200, message: countriesResponse?.message, data: countriesResponse?.data};
  }else{
    // Send success response
  return {status: 400, message: countriesResponse?.message, data: countriesResponse?.data};
  }
};

/**
 * API Call Mobile Code Countries From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_merchant_webhook_settings = async (sub_merchant_id) => {
  
  // Axios API request
  var merchantSettingsResponse = "";
  try {
    let url = "merchant-webhook-details";
    merchantSettingsResponse = await nodeServerService.post(url, {merchant_id: sub_merchant_id});
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(merchantSettingsResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Countries not found!",
    };
  }

  if (merchantSettingsResponse?.status === "success") {
    // Send success response
    return {
      status: 200,
      message: merchantSettingsResponse?.message,
      data: merchantSettingsResponse?.data,
    };
  } else {
    // Send failed response
    return {
      status: 400,
      message: merchantSettingsResponse?.message,
      data: merchantSettingsResponse?.data,
    };
  }
};


/**
 * API Call Mobile Code Countries From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const check_merchant_key = async (key, secret) => {
  
  // Axios API request
  var merchantKeyResponse = "";
  try {
    let url = "check-merchant-keys";
    merchantKeyResponse = await nodeServerService.post(url, {merchant_key: key, merchant_secret: secret});
    console.log("🚀 ~ check_merchant_key ~ merchantKeyResponse:", merchantKeyResponse)
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(merchantKeyResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Key not found!",
    };
  }

  if (merchantKeyResponse?.status === 'success') {
    // Send success response
  return {status: 200, message: merchantKeyResponse?.message, data: merchantKeyResponse?.data};
  }else{
    // Send success response
  return {status: 400, message: merchantKeyResponse?.message};
  }
};


/**
 * API Call Mobile Code Countries From Node Server
 * @param {string} password
 * @returns {Promise<User>}
 */
const update_wallet = async (sub_merchant_id, receiver_id) => {
  
  // Axios API request
  var walletResponse = "";
  try {
    let url = "update-wallet";
    walletResponse = await nodeServerService.post(url, {sub_merchant_id: sub_merchant_id, receiver_id: receiver_id});
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(walletResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Key not found!",
    };
  }

  if (walletResponse?.status === 'success') {
    // Send success response
  return {status: 200, message: walletResponse?.message, data: walletResponse?.data};
  }else{
    // Send success response
  return {status: 400, message: walletResponse?.message, data: walletResponse?.data};
  }
};

/**
 * API Call Update Transaction Charges
 * @param {string} 
 * @returns {Promise<User>}
 */
const update_charges = async (sub_merchant_id, receiver_id) => {
  
  // Axios API request
  var chargesResponse = "";
  try {
    let url = "update_charges";
    chargesResponse = await nodeServerService.post(url, {sub_merchant_id: sub_merchant_id, receiver_id: receiver_id});
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(chargesResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Key not found!",
    };
  }

  if (chargesResponse?.status === 'success') {
    // Send success response
  return {status: 200, message: chargesResponse?.message, data: chargesResponse?.data};
  }else{
    // Send success response
  return {status: 400, message: chargesResponse?.message, data: chargesResponse?.data};
  }
};

/**
 * API Call To Fetch Payer Details
 * @param {string} 
 * @returns {Promise<User>}
 */
const fetch_payer_details = async (payer_id) => {
  
  // Axios API request
  var payerDetailsResponse = "";
  try {
    let url = "fetch-payer-details";
    payerDetailsResponse = await nodeServerService.post(url, {payer_id: payer_id});
  } catch (err) {
    console.error("Error fetching data:", err.message);
    return {
      status: err.status,
      message: err.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(payerDetailsResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Payer not found!",
    };
  }

  if (payerDetailsResponse?.status === 'success') {
    // Send success response
  return {status: 200, message: payerDetailsResponse?.message, data: payerDetailsResponse};
  }else{
    // Send success response
  return {status: 400, message: payerDetailsResponse?.message, data: payerDetailsResponse};
  }
};

module.exports = {
  get_sub_merchant_profile,
  update_payout_status,
  get_funding_details,
  get_payout_countries,
  get_curencies,
  get_wallet_details_by_id,
  get_business_reg_country_list,
  get_mobile_code_country_list,
  get_merchant_webhook_settings,
  get_wallet_details_by_sub_id,
  get_sub_merchant_details,
  get_company_details,
  check_merchant_key,
  update_wallet,
  update_charges,
  get_sub_merchants,
  fetch_payer_details
};
