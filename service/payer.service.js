const httpStatus = require("http-status");
const helperService = require("./helper.service");
const pspService = require("./psp.service");
const thunesService = require("../service/thunes_client.service");

/**
 * Get Payers From Thunes
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_payers = async (queryParams) => {
  let payerResponse;
  try {
    const searchParams = new URLSearchParams(queryParams);
    const encodedQueryString = searchParams.toString();
    let url = "payers?" + encodedQueryString;

    let MID = await get_MID_details();
    if (MID?.status !== httpStatus.OK) {
      return MID;
    }
    const api = thunesService(MID?.data?.api_key, MID?.data?.password);
    payerResponse = await api.get(url);
  } catch (error) {
    console.log("🚀 ~ constadd_receiver=catchAsync ~ error:", error);
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

/**
 * Get Payer By ID From Thunes
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_payer_by_id = async (id) => {
  let payerResponse;
  try {
    let MID = await get_MID_details();
    if (MID?.status !== httpStatus.OK) {
      return MID;
    }
    let url = "/payers/" + id;
    let api = thunesService(MID?.data?.api_key, MID?.data?.password);
    payerResponse = await api.get(url);
  } catch (error) {
    console.log("🚀 ~ constadd_receiver=catchAsync ~ error:", error);
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

/**
 * Get countries
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const get_countries = async (id) => {
  let countriesResponse;
  try {
    let MID = await get_MID_details();
    if (MID?.status !== httpStatus.OK) {
      return MID;
    }
    let url = "/countries";
    let api = thunesService(MID?.data?.api_key, MID?.data?.password);
    countriesResponse = await api.get(url);
  } catch (error) {
    console.log("🚀 ~ constadd_receiver=catchAsync ~ error:", error);
    return {
      status: err?.status,
      message: err?.message,
    };
  }

  // Check transaction created
  if (helperService.isNotValid(countriesResponse)) {
    return {
      status: httpStatus.NOT_FOUND,
      message: "Countries not found!",
    };
  }

  // Send success response
  return {
    status: httpStatus.OK,
    message: "Countries found!",
    data: countriesResponse,
  };
};

async function get_MID_details() {
  try {
    let PSP_THUNES = await pspService.get_psp_by_psp_key("thunes");
    if (PSP_THUNES?.status != httpStatus.OK) {
      return PSP_THUNES;
    }
    return await pspService.get_mid_by_psp_id(PSP_THUNES?.data.id);
  } catch (error) {
    console.log("🚀 ~ get_MID_details ~ error:", error);
    return { status: 400, message: error.message };
  }
}

async function get_AL_Pay_MID_details() {
  try {
    let PSP_AL_PAY = await pspService.get_psp_by_psp_key("al_pay");
    if (PSP_AL_PAY?.status != httpStatus.OK) {
      return PSP_AL_PAY;
    }
    return await pspService.get_mid_by_psp_id(PSP_AL_PAY?.data.id);
  } catch (error) {
    console.log("🚀 ~ get_MID_details ~ error:", error);
    return { status: 400, message: error.message };
  }
}

module.exports = {
  get_payers,
  get_payer_by_id,
  get_countries,
  get_MID_details,
  get_AL_Pay_MID_details
};
