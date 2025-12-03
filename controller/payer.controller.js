const helperService = require("../service/helper.service");
const payerService = require("../service/payer.service");
const alpayService = require("../service/alpay.service");
const mockAlpayService = require("../service/al.service");
const thunesService = require("../service/thunes_client.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const nodeServerAPIService = require("../service/node_server_api.service");

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

      // const {account_number, institution_code, funding_source_type} = req.body;
      const { payer_id, account_number } = req.body;
      console.log("🚀 ~ req.body:", req.body)

      let funding_source_type = "";
      let institution_code = "";
      // If Payer ID is AlPay get institutionCode from payer id
      if (payer_id.includes("MAP_")) {
        institution_code = payer_id?.replace("MAP_", "");
      } else if (payer_id.includes("AP_")) {
        institution_code = payer_id?.replace("AP_", "");
      } else {
        res.status(httpStatus.OK).send({
          status: 400,
          message: "Invalid Payer ID",
        });
        return;
      }

      let payerDetails = await nodeServerAPIService.fetch_payer_details(
        payer_id
      );
      console.log("🚀 ~ payerDetails:", payerDetails)
      if (payerDetails?.status != httpStatus.OK) {
        return payerDetails;
      }

      // Get funding_source_type from payer
      funding_source_type = payerDetails?.data?.funding_source_type;
      
      let MID = '';
      if (process.env.PAYOUT_MODE === 'live') {
        MID = await payerService.get_AL_Pay_MID_details();
      }else{
        MID = await payerService.get_MOCK_AL_Pay_MID_details();
      }

      // let MID = await payerService.get_AL_Pay_MID_details();
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

      let nameEnquiryServiceResponse = "";
      if (process.env.PAYOUT_MODE === "live") {
        /**
         * *************
         * LIVE
         * *************
         */
        let getAccessTokenPayload = {
          username: payout_mid_details?.api_key,
          password: payout_mid_details?.password,
        };
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
          transactionId: externalTransactionId,
        };
        console.log(
          "🚀 ~ nameEnquiryServicePayload:",
          nameEnquiryServicePayload
        );
        nameEnquiryServiceResponse = await alpayService.nameEnquiryService(
          token,
          nameEnquiryServicePayload
        );
        console.log(
          "🚀 ~ nameEnquiryServiceResponse:",
          nameEnquiryServiceResponse
        );
        if (nameEnquiryServiceResponse?.status != 200) {
          res.status(httpStatus.OK).send({
            status: 400,
            message:
              nameEnquiryServiceResponse?.message ||
              "Unable to initiate transfer",
          });
          return;
        }
      } else {
        /**
         * *************
         * TEST
         * *************
         */
        let getAccessTokenPayload = {
          username: payout_mid_details?.api_key,
          password: payout_mid_details?.password,
        };
        // get access token
        let token = await mockAlpayService.getAccessToken(getAccessTokenPayload);
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
          transactionId: externalTransactionId,
        };
        console.log(
          "🚀 ~ nameEnquiryServicePayload:",
          nameEnquiryServicePayload
        );
        nameEnquiryServiceResponse = await mockAlpayService.nameEnquiryService(
          token,
          nameEnquiryServicePayload
        );
        console.log(
          "🚀 ~ nameEnquiryServiceResponse:",
          nameEnquiryServiceResponse
        );
        if (nameEnquiryServiceResponse?.status != 200) {
          res.status(httpStatus.OK).send({
            status: 400,
            message:
              nameEnquiryServiceResponse?.message ||
              "Unable to initiate transfer",
          });
          return;
        }
      }

      
  if (nameEnquiryServiceResponse) {
    nameEnquiryServiceResponse.data.payer_id = payer_id;
    nameEnquiryServiceResponse.data.funding_source_type = funding_source_type;
  }

  return res.status(httpStatus.OK).send(nameEnquiryServiceResponse);
});

module.exports = {
  get_payers,
  get_payer_by_id,
  get_countries,
  name_verification
};
