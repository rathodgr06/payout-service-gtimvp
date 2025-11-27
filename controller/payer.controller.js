const helperService = require("../service/helper.service");
const payerService = require("../service/payer.service");
const alpayService = require("../service/alpay.service");
const thunesService = require("../service/thunes_client.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");

/**
 * Get payers from thunes
 */
const get_payers = catchAsync(async (req, res) => {
  let MID = await payerService.get_MID_details();
  if (MID?.status !== httpStatus.OK) {
    return MID;
  }
  let payerResponse = await payerService.get_payers(req.body, MID);
  return res.status(httpStatus.OK).send(payerResponse);
});

/**
 * Get payers by id
 */
const get_payer_by_id = catchAsync(async (req, res) => {
  let payer_id = req.params.payer_id;
  let payerResponse = await payerService.get_payer_by_id(payer_id);
  return res.status(httpStatus.OK).send(payerResponse);
});

/**
 * Get payers by id
 */
const get_countries = catchAsync(async (req, res) => {
  let payerResponse = await payerService.get_countries();
  return res.status(httpStatus.OK).send(payerResponse);
});

/**
 * AL-Pay name verification
 */
const name_verification = catchAsync(async (req, res) => {

      const {account_number, institution_code, funding_source_type} = req.body;
      
      let MID = await payerService.get_AL_Pay_MID_details();
      if (MID?.status !== httpStatus.OK) {
        return MID;
      }

      // fetch mid
      let payout_mid_details = MID?.data;
      
      console.log(payout_mid_details);
      
      if (helperService.isNotValid(payout_mid_details?.api_key)) {
        res.status(httpStatus.OK).send({
          status: 400,
          message: "Invalid 'api_key'",
        });
        return;
      }
  
      if (helperService.isNotValid(payout_mid_details?.password)) {
        res.status(httpStatus.OK).send({
          status: 400,
          message: "Invalid 'password'",
        });
        return;
      }

      let getAccessTokenPayload = {
        username: payout_mid_details?.api_key,
        password: payout_mid_details?.password,
      }
      // get access token
      let token = await alpayService.getAccessToken(getAccessTokenPayload);
      //send response if reference id is fals
      if (!token) {
        res.status(httpStatus.OK).send({
          status: 401,
          message: "Invalid access",
        });
        return;
      }
  
      let externalTransactionId = await helperService.make_unique_id();
  
      let nameEnquiryServicePayload = {
        accountNumber: account_number,
        channel: funding_source_type == 1 ? "MNO" : "INTERBANK",
        institutionCode: institution_code,
        transactionId: externalTransactionId
      }
      console.log("🚀 ~ nameEnquiryServicePayload:", nameEnquiryServicePayload)
      let nameEnquiryServiceResponse = await alpayService.nameEnquiryService(token, nameEnquiryServicePayload);
      console.log("🚀 ~ nameEnquiryServiceResponse:", nameEnquiryServiceResponse)
      if (nameEnquiryServiceResponse?.status != 200) {
        res.status(httpStatus.OK).send({
          status: 400,
          message: nameEnquiryServiceResponse?.message || "Unable to initiate transfer",
        });
        return;
      }

  return res.status(httpStatus.OK).send(nameEnquiryServiceResponse);
});

module.exports = {
  get_payers,
  get_payer_by_id,
  get_countries,
  name_verification
};
