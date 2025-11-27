const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const helperService = require("./helper.service");
const nodeServerService = require("./node_server.service");
const beneficiaryDBService = require("./beneficiary.db.service");
const receiverDBService = require("./receiver.db.service");
const db = require("../models");
const ApiError = require("../utils/ApiError");
const createApiClient = require("./thunes_client.service");

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add_receiver = async (payload) => {

  let receiver_details = await get_receiver_details(payload.sub_merchant_id);

  if (receiver_details?.status == "success") {
  if (
    Array.isArray(receiver_details?.data) &&
    receiver_details?.data.length < 1
  ) {
    return {
      status: 400,
      message: "Receiver details not found!",
      data: responseData,
    };
  }
  }else{
    return {
      status: 400,
      message: "Receiver details not found!",
      data: responseData,
    };
  }
  
  var receiver = await receiverDBService.addNewReceiver(payload);
  if (receiver?.status !== httpStatus.OK) {
    return receiver;
  }
  
  var responseData;
  if (receiver?.status === httpStatus.OK) {
     responseData = {
       receiver_id: receiver.data.id, // put first
       super_merchant_id: receiver_details?.data[0]?.super_merchant_id,
       iban: receiver_details?.data[0]?.iban,
       registered_name: receiver_details?.data[0]?.company_name,
       country_iso_code: receiver_details?.data[0]?.country_code,
       address: receiver_details?.data[0]?.address,
       city: receiver_details?.data[0]?.city_name,
       ...receiver.data, // spread remaining keys
     };
    delete responseData.id;
    receiver.data = responseData;
  }
  
  // Send success response
  return {
    status: httpStatus.OK,
    message: "Receiver added!",
    data: responseData,
  };
};

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_receiver_details = async (sub_merchant_id) => {

  let payload = {
    sub_merchant_id: sub_merchant_id
  }

  // Axios API request
  var receiverResponse = "";
  try {
    let url = "get-receiver-details";
    receiverResponse = await nodeServerService.post(url, payload);
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
      message: "Receiver details not found!",
    };
  }

  // Send success response
  return receiverResponse;
};

/**
 * Add New Sender Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add_sender_receiver = async (param) => {
  var receiver = await beneficiaryDBService.addNewSenderReceiver(param);
  if (receiver?.status === httpStatus.OK) {
    const responseData = {
      receiver_id: receiver.data.id, // put first
      ...receiver.data,              // spread remaining keys
    };
    delete responseData.id;
    receiver.data = responseData;
  }
  return receiver;
};

/**
 * Sender verification
 */
const verify_sender = async (receiver_id) => {
  
  // Send success response
  var receiverResponse =  await receiverDBService.verifyReceiver(receiver_id);
  // var receiverResponse =  await beneficiaryDBService.verifyBeneficiary(receiver_id);
  if (receiverResponse?.status == httpStatus.OK) {
    var receiver = receiverResponse.data.toJSON();
    const responseData = {
      receiver_id: receiver.id, // put first
      ...receiver,              // spread remaining keys
    };
    delete responseData.id;
    receiverResponse.data = responseData;
  }
  return receiverResponse;
};

/**
 * Delete Receiver
 */
const delete_receiver = async (receiver_id) => {
  
  // Send success response
  return await beneficiaryDBService.deleteReceiverById(receiver_id);
};


/**
 *  Update Receiver
 * @param {*} param 
 * @returns 
 */
const update_receiver = async (param) => {
  var receiver = await beneficiaryDBService.update_receiver(param);
  if (receiver?.data !== null) {
    const responseData = {
      receiver_id: receiver.id, // put first
      ...receiver,              // spread remaining keys
    };
    delete responseData.id;
    receiver.data = responseData;
  }
  return receiver;
};


/**
 * Add Payee
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add = async (param) => {
  const user = await beneficiaryDBService.addNewPayer(param);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return null;
  }
  return user;
};


/**
 * Get Beneficiary By Id
 */
const getBeneficiaryById = async (id) => {
  var beneficiary = await receiverDBService.getReceiverById(id);
  // var beneficiary = await beneficiaryDBService.getBeneficiaryById(id);
  if (!helperService.isNotValid(beneficiary)) {
    const responseData = {
      receiver_id: beneficiary.id, // put first
      ...beneficiary,              // spread remaining keys
    };
    delete responseData.id;
    beneficiary = responseData;
  }

  let receiver_details = await get_receiver_details(beneficiary.sub_merchant_id);
  console.log("🚀 ~ constadd_receiver= ~ receiver_details:", receiver_details)

  let data = receiver_details?.data[0];

  beneficiary.super_merchant_id = data?.super_merchant_id;
  beneficiary.iban = data?.iban;
  beneficiary.country_iso_code = data?.country_code;
  beneficiary.address = data?.address;
  beneficiary.city = data?.city_name;
  beneficiary.registered_name = data?.company_name;

  return beneficiary;
};

/**
 * Get Payee By ID
 * @param {string} id
 * @returns {Promise<User>}
 */
const getById = async (id, MID) => {
  // Axios API request
  var payerResponse = "";
  try {
    
    let url = "/payers/" + id;
    const api = createApiClient(MID?.api_key, MID?.password);
    payerResponse = await api.get(url);

  } catch (err) {
    console.error("Error fetching data:", err?.message);
    return {
      status: err?.status,
      message: err?.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(payerResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Payer not found!",
    };
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Payer found!",
    data: payerResponse,
  };
};

module.exports = {
  add_sender_receiver,
  add_receiver,
  update_receiver,
  verify_sender,
  getBeneficiaryById,
  delete_receiver,
  add,
  getById,
};
