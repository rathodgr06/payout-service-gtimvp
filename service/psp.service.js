const httpStatus = require("http-status");
const helperService = require("./helper.service");
const pspDBService = require("./psp.db.service");
const midDBService = require("./mid.db.service");
const ApiError = require("../utils/ApiError");
const node_serverService = require("./node_server.service");
const nodeServerAPIService = require("./node_server_api.service");

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add_mid = async (payload) => {
  // Save mid
  var MID = await midDBService.addMID(payload);
  if (MID?.status !== httpStatus.OK) {
    return MID;
  }

  var responseData;
  if (MID?.status === httpStatus.OK) {
    MID.data.sub_merchant_id = helperService.isNotValid(MID?.data?.sub_merchant_id) ? null : MID?.data?.sub_merchant_id;
    responseData = {
      MID_id: MID.data.id,
      ...MID.data,
    };
    delete responseData.id;
    MID.data = responseData;
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "MID added!",
    data: responseData,
  };
};

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add_psp = async (payload) => {
  // Save PSP
  var PSP = await pspDBService.addPSP(payload);
  if (PSP?.status !== httpStatus.OK) {
    return PSP;
  }

  var responseData;
  if (PSP?.status === httpStatus.OK) {
    responseData = {
      PSP_id: PSP.data.id,
      ...PSP.data,
    };
    delete responseData.id;
    PSP.data = responseData;
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "PSP added!",
    data: responseData,
  };
};

/**
 * Get MID By Sub Merchant ID
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_mid = async (sub_merchant_id, receiver_id) => {
  // Save mid
  var MID = await midDBService.getMIDById(sub_merchant_id, receiver_id);
  if (MID?.status !== httpStatus.OK) {
    return MID;
  }

  var responseData;
  if (MID?.status === httpStatus.OK) {
    responseData = {
      MID_id: MID.data.id,
      ...MID.data,
    };
    delete responseData.id;
    MID.data = responseData;
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "MID added!",
    data: responseData,
  };
};

/**
 * Get PSP List
 * @returns {Promise<User>}
 */
const get_all_psp = async () => {
  var PSPs = await pspDBService.getAllPSPs();
  if (PSPs?.status !== httpStatus.OK) {
    return PSPs;
  }

  // Send success response
  return PSPs;
};

/**
 * Get PSP BY PSP Key
 * @returns {Promise<User>}
 */
const get_psp_by_psp_key = async (psp_key) => {
  const where = {
    deleted: 0,
    psp_key: psp_key,
  }
  var PSP = await pspDBService.find_one(where);
  if (PSP?.status !== httpStatus.OK) {
    return PSP;
  }

  // Send success response
  return PSP;
};

/**
 * Get MID By ID
 * @returns {Promise<User>}
 */
const get_mid_by_id = async (mid) => {
  var MID = await midDBService.getMIDByMIDId(mid);
  if (helperService.isNotValid(MID)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "MID not found!",
    };
  }
  return {
    status: httpStatus.OK,
    message: "MID found!",
    data: MID,
  };
};

/**
 * Get MID By ID
 * @returns {Promise<User>}
 */
const find_routing_mid = async (payload) => {
  var MID = await midDBService.getSpecificMID(payload);
  if (helperService.isNotValid(MID)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "MID not found!",
    };
  }
  return {
    status: httpStatus.OK,
    message: "MID found!",
    data: MID,
  };
};

/**
 * Get MID By ID
 * @returns {Promise<User>}
 */
const get_mid_list_by_id = async (sub_merchant_id) => {
  var MIDs = await midDBService.getMIDList(sub_merchant_id);
  if (MIDs.status !== httpStatus.OK) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "MID not found!",
    };
  }
  return {
    status: httpStatus.OK,
    message: "MID found!",
    ...MIDs,
  };
};

/**
 * Get MID By ID
 * @returns {Promise<User>}
 */
const get_mid_by_sub_receiver_id = async (sub_merchant_id, receiver_id) => {

  if (helperService.isNotValid(receiver_id) && helperService.isNotValid(sub_merchant_id)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "Invalid request!",
    };
  }

  var MID = await midDBService.getMIDBySubReceiverId(
    sub_merchant_id,
    receiver_id
  );
  if (helperService.isNotValid(MID)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "MID not found!",
    };
  }

  MID.sub_merchant_id = helperService.isNotValid(MID?.sub_merchant_id) ? null : MID?.sub_merchant_id; 

  return {
    status: httpStatus.OK,
    message: "MID found!",
    data: MID,
  };
};

/**
 * Get MID By PSP ID
 * @returns {Promise<User>}
 */
const get_mid_by_psp_id = async (psp_id) => {
  var MID = await midDBService.getMIDByPSPId(psp_id);
  if (helperService.isNotValid(MID)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "MID not found!",
    };
  }
  return {
    status: httpStatus.OK,
    message: "MID found!",
    data: MID,
  };
};

/**
 * Update PSP
 * @returns {Promise<User>}
 */
const update_psp = async (id, payload) => {
  var PSP = await pspDBService.updatePSP(id, payload);
  if (helperService.isNotValid(PSP)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "PSP not found!",
    };
  }
  return PSP;
};

/**
 * Update Payout PSP MID
 * @returns {Promise<User>}
 */
const update_payout_psp_mid = async (id, payload) => {
  var MID = await midDBService.updatePayoutPspMid(id, payload);
  if (helperService.isNotValid(MID)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "MID not found!",
    };
  }
  return MID;
};

/**
 * Activate/Disable PSP By ID
 * @returns {Promise<User>}
 */
const manage_psp = async (id, action) => {
  let status;
  let payload = '';
  if (action === 'activate') {
    status = 1;
    payload = { status: 1};
  }else if(action === 'disable'){
    payload = { status: 0};
  }else if(action === 'delete'){
    payload = { deleted: 1};
  }else{
    return {
      status: httpStatus.BAD_REQUEST,
      message: "Invalid action!",
    };
  }
  var PSP = await pspDBService.managePsp(id, payload);
  if (helperService.isNotValid(PSP)) {
    return {
      status: httpStatus.BAD_REQUEST,
      message: "PSP not found!",
    };
  }
  return PSP;
};

/**
 * Delete PSP By ID
 * @returns {Promise<User>}
 */
const delete_psp = async (id) => {
  return await pspDBService.deletePsp(id);
};

/**
 * Delete PSP By ID
 * @returns {Promise<User>}
 */
const get_supported_countries = async (psp_name) => {

  let countries = await nodeServerAPIService.get_payout_countries();
  console.log("🚀 ~ constget_supported_countries= ~ countries:", countries)
  

  return countries;
};

/**
 * Delete PSP By ID
 * @returns {Promise<User>}
 */
const get_supported_currencies = async (countryIso) => {
  let supportedCurrency = ['USD'];
  if (countryIso === 'LBR') {
    supportedCurrency = ['USD', 'EUR'];
  }

  if (countryIso !== '') {
    const responseCountries = await nodeServerAPIService.get_curencies({ country: countryIso });
    if (responseCountries?.data) {
      supportedCurrency.push(responseCountries?.data);
    }
    // Reverse and remove duplicates
    supportedCurrency = Array.from(new Set(supportedCurrency.reverse()));
  }

  return supportedCurrency;
};

module.exports = {
  add_mid,
  add_psp,
  get_mid,
  get_all_psp,
  get_mid_by_id,
  get_mid_list_by_id,
  get_mid_by_sub_receiver_id,
  update_psp,
  manage_psp,
  delete_psp,
  get_supported_countries,
  get_supported_currencies,
  find_routing_mid,
  get_mid_by_psp_id,
  update_payout_psp_mid,
  get_psp_by_psp_key
};
