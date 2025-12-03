const httpStatus = require("http-status");
const bcrypt = require("bcrypt");
const helperService = require("./helper.service");
const nodeServerService = require("./node_server.service");
const beneficiaryDBService = require("./beneficiary.db.service");
const receiverDBService = require("./receiver.db.service");
const payerService = require("../service/beneficiary.service");
const nodeServerApiService = require("./node_server_api.service");
const db = require("../models");
const ApiError = require("../utils/ApiError");
const encryptDecryptService = require("../service/encrypt_decrypt.service");
const createApiClient = require("./thunes_client.service");

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add_receiver_with_fund_details = async (req) => {
  const {
    sub_merchant_id,
    receiver_name,
    registered_business_address,
    email,
    code,
    mobile_no,
    referral_code,
    webhook_url,
  } = req.body;

  let addReceiverPayload = {
    sub_merchant_id: sub_merchant_id,
    receiver_name: receiver_name,
    registered_business_address: registered_business_address, // Address
    email: email,
    code: code,
    mobile_no: mobile_no,
    referral_code: referral_code,
    webhook_url: webhook_url,
    webhook_secret: helperService.generateKey(),
    verification: "verified",
    active: 1,
  };

  if (helperService.isValid(sub_merchant_id)) {
    let submerchant_response = await nodeServerApiService.get_sub_merchant_details(sub_merchant_id);
    console.log("🚀 ~ add_receiver_with_fund_details ~ submerchant_response:", submerchant_response)
    if (submerchant_response?.status != httpStatus.OK) {
      return submerchant_response;
    }

    if (helperService.isValid(submerchant_response?.data)) {
      addReceiverPayload.super_merchant_id = submerchant_response?.data?.super_merchant_id;
      addReceiverPayload.receiver_name = submerchant_response?.data?.company_name;
      addReceiverPayload.registered_business_address = submerchant_response?.data?.register_business_country;
      addReceiverPayload.email = submerchant_response?.data?.email;
      addReceiverPayload.code = submerchant_response?.data?.code;
      addReceiverPayload.mobile_no = submerchant_response?.data?.mobile_no;
      addReceiverPayload.referral_code = submerchant_response?.data?.referral_code;
    }

    /**
     * If webhook_url is passed through request and if it is settelment account
     * then get the webhook details from merchant webhook settings
     */
    if (helperService.isNotValid(addReceiverPayload?.webhook_url)) {
      let submerchant_webhook_response =
        await nodeServerApiService.get_merchant_webhook_settings(
          sub_merchant_id
        );
      if (submerchant_webhook_response?.status != httpStatus.OK) {
        return submerchant_webhook_response;
      }

      if (helperService.isValid(submerchant_webhook_response?.data)) {
        addReceiverPayload.webhook_url =
          submerchant_webhook_response?.data?.notification_url;
        addReceiverPayload.webhook_secret =
          submerchant_webhook_response?.data?.notification_secret;
      }
    }
    
  }

  
  console.log("🚀 ~ add_receiver_with_fund_details ~ addReceiverPayload:", addReceiverPayload)

  // Save receiver
  var receiver = await receiverDBService.addNewReceiver(addReceiverPayload);
  
  if (receiver?.status !== httpStatus.OK) {
    return receiver;
  }

  let receivers_keys = [];
  // Add Test Key
  let key_secret_payload = {
    receiver_id: receiver?.data?.id,
    type: "test",
    receiver_key:  await helperService.make_order_number("test-"),
    receiver_secret: await helperService.make_order_number("sec-"),
  };
  let keySecretResponse = await add_receiver_key_secret(key_secret_payload);
  if (keySecretResponse?.status == httpStatus.OK) {
    receivers_keys.push({
      type: keySecretResponse?.data?.type,
      receiver_key: keySecretResponse?.data?.receiver_key,
      receiver_secret: keySecretResponse?.data?.receiver_secret,
    })
  }

  // Add Live Key
   key_secret_payload = {
    receiver_id: receiver?.data?.id,
    type: "live",
    receiver_key:  await helperService.make_order_number("live-"),
    receiver_secret: await helperService.make_order_number("sec-"),
  };
  keySecretResponse = await add_receiver_key_secret(key_secret_payload);
  if (keySecretResponse?.status == httpStatus.OK) {
    receivers_keys.push({
      type: keySecretResponse?.data?.type,
      receiver_key: keySecretResponse?.data?.receiver_key,
      receiver_secret: keySecretResponse?.data?.receiver_secret,
    })
  }

  var responseData;
  if (
    receiver?.status === httpStatus.OK &&
    !helperService.isNotValid(receiver?.data)
  ) {
    responseData = {
      receiver_id: receiver?.data?.id,
      sub_merchant_id: helperService.isNotValid(receiver?.data?.sub_merchant_id)
        ? null
        : receiver?.data?.sub_merchant_id,
      super_merchant_id: helperService.isNotValid(receiver?.data?.super_merchant_id)
        ? null
        : receiver?.data?.super_merchant_id,
      receiver_name: helperService.isNotValid(receiver?.data?.receiver_name)
        ? null
        : receiver?.data?.receiver_name,
      registered_business_address: helperService.isNotValid(
        receiver?.data?.registered_business_address
      )
        ? null
        : receiver?.data?.registered_business_address,
      email: helperService.isNotValid(receiver?.data?.email)
        ? null
        : receiver?.data?.email,
      code: helperService.isNotValid(receiver?.data?.code)
        ? null
        : receiver?.data?.code,
      mobile_no: helperService.isNotValid(receiver?.data?.mobile_no)
        ? null
        : receiver?.data?.mobile_no,
      referral_code: helperService.isNotValid(receiver?.data?.referral_code)
        ? null
        : receiver?.data?.referral_code,
      webhook_url: helperService.isNotValid(receiver?.data?.webhook_url)
        ? null
        : receiver?.data?.webhook_url,
      webhook_secret: helperService.isNotValid(receiver?.data?.webhook_secret)
        ? null
        : receiver?.data?.webhook_secret,
      verification: helperService.isNotValid(receiver?.data?.verification)
        ? null
        : receiver?.data?.verification,
      active: helperService.isNotValid(receiver?.data?.active)
        ? null
        : receiver?.data?.active,
      deleted: helperService.isNotValid(receiver?.data?.deleted)
        ? null
        : receiver?.data?.deleted,
      created_at: helperService.isNotValid(receiver?.data?.created_at)
        ? null
        : receiver?.data?.created_at,
      updated_at: helperService.isNotValid(receiver?.data?.updated_at)
        ? null
        : receiver?.data?.updated_at,
      access: receivers_keys,
    };

    if (sub_merchant_id && receiver?.data?.id) {
      let update_response = await nodeServerApiService.update_wallet(sub_merchant_id, receiver?.data?.id);
      console.log("🚀 ~ add_receiver_with_fund_details ~ update_response:", update_response)
      let update_charges_response = await nodeServerApiService.update_charges(sub_merchant_id, receiver?.data?.id);
      console.log("🚀 ~ add_receiver_with_fund_details ~ update_charges_response:", update_charges_response)
    }

    receiver.data = responseData;
  }

  // Send success response
  return receiver;
};

/**
 * Add Receiver
 */
const check_valid_bank_details = async (receiver_details, MID) => {
  console.log("🚀 ~ check_valid_bank_details ~ receiver_details:", receiver_details)

  let PAYER_ID = null;

  try {
    if (
      helperService.isNotValid(receiver_details?.data) ||
      helperService.isNotValid(receiver_details?.data?.account_details)
    ) {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Merchant bank details are currently unavailable or missing some fields.",
      };
    }
    
    if (helperService.isNotValid(receiver_details?.data?.account_id)) {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Invalid account ID",
      };
    }

    //
    PAYER_ID = receiver_details?.data?.payer_id;
    
    let account_details = receiver_details?.data?.account_details;
    console.log("🚀 ~ constcheck_valid_bank_details= ~ account_details:", account_details)

    if (helperService.isNotValid(PAYER_ID)) {
      return {
        status: httpStatus.BAD_REQUEST,
        message: "Invalid Payer ID",
      };
    }

    let customer_type = receiver_details?.data?.customer_type;

    if (PAYER_ID == "MTN_MOMO" || PAYER_ID=="ORANGE_MONEY") {
      console.log(`here goes mtn momo or orange money`);

      if (
        helperService.isNotValid(
          account_details?.MSISDN
        )
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          message: "Invalid MSISDN Number",
        };
      }

      return {
        status: httpStatus.OK,
        message: "Valid payer",
      };

    } else {
      // Get payer details by id
      const payerResponse = await payerService.getById(PAYER_ID, MID);
       if (payerResponse?.status !== httpStatus.OK) {
        return payerResponse;
      }
      
      let payer = payerResponse?.data;
      console.log("🚀 ~ check_valid_bank_details ~ payer:", payer)
      
      console.log(`here goes thunes `);
      
      let sending_business = {
        registered_name: "GTI",
        registration_number: "123456",
        country_iso_code: "USA",
        address: "USA",
        city: "New York",
        code: "94111"
      };
      
      const transaction_type = customer_type === "Business" ? payer?.transaction_types?.B2B : payer?.transaction_types?.B2C;
      if (helperService.isNotValid(transaction_type)) {
        console.log("🚀 ~ check_valid_bank_details ~ transaction_type:", transaction_type)
      }
      
      const credit_party_identifiers = transaction_type?.credit_party_identifiers_accepted[0];
      const required_receiving_entity_fields = transaction_type?.required_receiving_entity_fields[0];
      const required_sending_entity_fields = transaction_type?.required_sending_entity_fields[0];
      const purpose_of_remittance_values_accepted = transaction_type?.purpose_of_remittance_values_accepted;

      console.log("purpose_of_remittance_values_accepted: ", purpose_of_remittance_values_accepted);
      if (helperService.isValid(receiver_details?.purpose_of_remittance)) {
        if (helperService.isValid(purpose_of_remittance_values_accepted)) {
          if (!purpose_of_remittance_values_accepted.includes(receiver_details?.purpose_of_remittance)) {
            return {
              status: httpStatus.BAD_REQUEST,
              message: "Invalid 'purpose_of_remittance'",
            };
          }
        }else{
          console.log("No valid purpose_of_remittance_values_accepted list found for this payer... ");
        }
      }
      

      // Check request payload fields
      const isCreditPartyIdentifiersValid = credit_party_identifiers.every(
        (key) => {
          const value = account_details[key];
          return (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(value)
          );
        }
      );

      if (!isCreditPartyIdentifiersValid) {
        return {
          status: httpStatus.BAD_REQUEST,
          message: "Invalid 'credit_party_identifiers'",
        };
      }

      // Check required receiving fields
      const is_required_receiving_entity_fields_data_Valid = required_receiving_entity_fields.every(
        (key) => {
          const value = account_details[key];
          return (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(value)
          );
        }
      );

      if (!is_required_receiving_entity_fields_data_Valid) {
        return {
          status: httpStatus.BAD_REQUEST,
          message: "Invalid 'required_receiving_entity_fields'",
        };
      }

      // Check required sending fields
      const is_required_sending_entity_fields_data_Valid = required_sending_entity_fields.every(
        (key) => {
          console.log("🚀 ~ constcheck_valid_bank_details= ~ key:", key)
          const value = sending_business[key];
          console.log("🚀 ~ constcheck_valid_bank_details= ~ value:", value)
          return (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(value)
          );
        }
      );

      if (!is_required_sending_entity_fields_data_Valid) {
        return {
          status: httpStatus.BAD_REQUEST,
          message: "Invalid 'required_sending_entity_fields'",
        };
      }

      return {
        status: httpStatus.OK,
        message: "Valid payer",
      };
    }
  } catch (error) {
    console.log("🚀 ~ constadd_receiver=catchAsync ~ error:", error);
    return {
      status: httpStatus.BAD_REQUEST,
      message: error?.message,
    };
  }
};

/**
 * Add New Receiver
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const add_receiver_with_account_no = async (req) => {
  const { sub_merchant_id } = req.body;

  const encrypted_sub_merchant_id = await encryptDecryptService.encrypt(
    sub_merchant_id
  );
  // console.log("🚀 ~ constadd_receiver_with_account_no= ~ encrypted_sub_merchant_id:", encrypted_sub_merchant_id)
  var receiver_details = await nodeServerApiService.get_sub_merchant_profile(
    encrypted_sub_merchant_id,
    req?.user?.token
  );
  // console.log("🚀 ~ constadd_receiver_with_account_no= ~ receiver_details:", receiver_details)

  const register_business_country = await encryptDecryptService.decrypt(
    receiver_details?.data?.register_business_country
  );

  let addReceiverPayload;
  if (receiver_details?.data) {
    addReceiverPayload = {
      sub_merchant_id: sub_merchant_id,
      super_merchant_id:
        receiver_details?.data?.super_merchant_id == undefined
          ? ""
          : receiver_details?.data?.super_merchant_id,
      account_id: receiver_details?.data?.account_id,
      account_types: "BUSINESS",
      iban: receiver_details?.data?.iban,
      registered_name: receiver_details?.data?.company_name,
      country_iso_code: register_business_country,
      address: receiver_details?.data?.address_line1,
      city: receiver_details?.data?.province_name,
    };
  }
  //   console.log("🚀 ~ constadd_receiver_with_account_no= ~ addReceiverPayload:", addReceiverPayload)
  // return;
  // Save receiver
  var receiver = await receiverDBService.addNewReceiver(addReceiverPayload);
  if (receiver?.status !== httpStatus.OK) {
    return receiver;
  }

  var responseData;
  if (
    receiver?.status === httpStatus.OK &&
    !helperService.isNotValid(receiver?.data)
  ) {
    responseData = {
      receiver_id: receiver.data.id,
      ...receiver.data,
    };
    delete responseData.id;
    receiver.data = responseData;
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: receiver?.message,
    data: responseData,
  };
};

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
  } else {
    return {
      status: 400,
      message: "Receiver details not found!",
      data: responseData,
    };
  }

  let addReceiverPayload;
  if (receiver_details?.data[0]) {
    addReceiverPayload = {
      super_merchant_id: receiver_details?.data[0]?.super_merchant_id,
      iban: receiver_details?.data[0]?.iban,
      registered_name: receiver_details?.data[0]?.company_name,
      country_iso_code: receiver_details?.data[0]?.country_code,
      address: receiver_details?.data[0]?.address,
      city: receiver_details?.data[0]?.city_name,
      ...payload,
    };
  }

  // Save receiver
  var receiver = await receiverDBService.addNewReceiver(addReceiverPayload);
  if (receiver?.status !== httpStatus.OK) {
    return receiver;
  }

  var responseData;
  if (receiver?.status === httpStatus.OK) {
    responseData = {
      receiver_id: receiver.data.id,
      ...receiver.data,
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
 * Get Beneficiary By Id
 */
const get_receiver_by_id = async (id) => {
  var receiver = await receiverDBService.getReceiverById(id);

  if (helperService.isNotValid(receiver)) {
    return receiver;
  }

  let receiver_keys_secrets = await get_receiver_key_secret_by_receiver_id(receiver?.receiver_id);


  let responseData = {
    receiver_id: receiver?.receiver_id,
    sub_merchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
      ? null
      : receiver?.sub_merchant_id,
    receiver_name: helperService.isNotValid(receiver?.receiver_name)
      ? null
      : receiver?.receiver_name,
    registered_business_address: helperService.isNotValid(receiver?.registered_business_address)
      ? null
      : receiver?.registered_business_address,
    email: helperService.isNotValid(receiver?.email)
      ? null
      : receiver?.email,
    code: helperService.isNotValid(receiver?.code)
      ? null
      : receiver?.code,
    mobile_no: helperService.isNotValid(receiver?.mobile_no)
      ? null
      : receiver?.mobile_no,
    referral_code: helperService.isNotValid(receiver?.referral_code)
      ? null
      : receiver?.referral_code,
    webhook_url: helperService.isNotValid(receiver?.webhook_url)
      ? null
      : receiver?.webhook_url,
    webhook_secret: helperService.isNotValid(receiver?.webhook_secret)
      ? null
      : receiver?.webhook_secret,
    verification: helperService.isNotValid(receiver?.verification)
      ? null
      : receiver?.verification,
    active: helperService.isNotValid(receiver?.active)
      ? 1 
      : receiver?.active,
    deleted: helperService.isNotValid(receiver?.deleted)
      ? 0
      : receiver?.deleted,
    created_at: helperService.isNotValid(receiver?.created_at)
      ? null
      : receiver?.created_at,
    updated_at: helperService.isNotValid(receiver?.updated_at)
      ? null
      : receiver?.updated_at,
  };

  if (receiver_keys_secrets?.status == httpStatus.OK) {
    let access = [];
    for (let index = 0; index < receiver_keys_secrets?.data.length; index++) {
      const element = receiver_keys_secrets?.data[index];
      access.push({
        "type": element?.type,
        "receiver_key": element?.receiver_key,
        "receiver_secret": element?.receiver_secret,
      })
    }
    responseData.access = access;
  }

  return responseData;
};

/**
 * Get Receiver By Sub Merchant Id
 */
const get_receiver_by_sub_merchant_id = async (sub_merchant_id) => {
  var receiver = await receiverDBService.getReceiverBySubMerchantId(
    sub_merchant_id
  );
  return receiver;
};

/**
 * API Call Get Receiver Details From Node Server
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_receiver_details = async (sub_merchant_id) => {
  let payload = {
    sub_merchant_id: sub_merchant_id,
  };

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
      receiver_id: receiver.data.id,
      ...receiver.data,
    };
    delete responseData.id;
    receiver.data = responseData;
  }
  return receiver;
};

/**
 * Sender verification
 */
const verify_receiver = async (receiver_id, action) => {
  
  // Send success response
  var receiverResponse = await receiverDBService.verifyReceiver(receiver_id);
  receiverResponse.data = await get_receiver_by_id(receiver_id);
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
  var receiver = await receiverDBService.update_receiver(param);
  let data = await get_receiver_by_id(param?.receiver_id);
  if (helperService.isNotValid(receiver)) {
    return { status: 400, message: "Receiver not found" };
  }
  receiver.data = data;
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
 * Get Receiver List
 * @returns {Promise<User>}
 */
const get_receiver_list = async (req, res) => {
  try {
    return await receiverDBService.get_receiver_list(req, res);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Add Receiver Key & Secret
 * @returns {Promise<User>}
 */
const add_receiver_key_secret = async (payload) => {
  try {
    return await receiverDBService.addReceiverKeyAndSecret(payload);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Update Receiver Key & Secret
 * @returns {Promise<User>}
 */
const update_receiver_key_secret = async (payload) => {
  try {
    return await receiverDBService.addOrUpdateReceiverKeyAndSecret(payload);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Get Receiver Key & Secret By Receiver Id
 * @returns {Promise<User>}
 */
const get_receiver_key_secret_by_receiver_id = async (receiver_id) => {
  try {
    return await receiverDBService.find_receiver_keys_by_receiver_id(receiver_id);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Get Receiver Key & Secret By Receiver Id
 * @returns {Promise<User>}
 */
const get_receiver_id_by_key_secret = async (receiver_key, receiver_secret) => {
  try {
    return await receiverDBService.find_receiver_key(receiver_key, receiver_secret);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Get Receiver Key & Secret By Receiver Id
 * @returns {Promise<User>}
 */
const get_receiver_key_secret = async (receiver_id) => {
  try {
    return await receiverDBService.find_receiver_keys_by_receiver_id(receiver_id);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Get Receiver Count
 * @returns {Promise<User>}
 */
const get_receiver_count = async (condition) => {
  try {
    return await receiverDBService.get_receiver_count(condition);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Get Receiver Count
 * @returns {Promise<User>}
 */
const delete_key_secret = async (id) => {
  try {
    let update_data = {deleted: 1}
    return await receiverDBService.update_receiver_key(id, update_data);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

/**
 * Get Receiver Key & Secret List By Receiver Id
 * @returns {Promise<User>}
 */
const get_receiver_key_secret_list = async (payload) => {
  try {
    return await receiverDBService.find_receiver_keys_list(payload);
  } catch (error) {
    console.error("Sequelize query failed:", error);
    return {
      status: 400,
      message: error.message,
    };
  }
};

module.exports = {
  add_receiver_with_account_no,
  get_receiver_list,
  add_sender_receiver,
  add_receiver,
  update_receiver,
  verify_receiver,
  get_receiver_by_id,
  delete_receiver,
  add,
  get_receiver_by_sub_merchant_id,
  add_receiver_with_fund_details,
  check_valid_bank_details,
  add_receiver_key_secret,
  get_receiver_id_by_key_secret,
  get_receiver_key_secret_by_receiver_id,
  get_receiver_count,
  update_receiver_key_secret,
  get_receiver_key_secret,
  delete_key_secret,
  get_receiver_key_secret_list
};
