const quotationService = require("../service/quotation.service");
const quotationValidation = require("../validations/quotation.validation");
const transactionService = require("../service/transactions.service");
const accountDetailsService = require("../service/account_details.service");
const helperService = require("../service/helper.service");
const payerService = require("../service/beneficiary.service");
const receiverService = require("../service/receiver.service");
const pspService = require("../service/psp.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const quotationDbService = require("../service/quotation.db.service");
const attachmentDbService = require("../service/attachment.db.service");
const nodeServerAPIService = require("../service/node_server_api.service");
const createGeneralApiClient = require("../service/api_client.service");
const { payout_mid, transaction } = require("../models");
const {
  getAccessToken,
  initiateTransfer,
  getTransferStatus,
} = require("../service/mtn.service");
const alPayService = require("../service/alpay.service");
const mtnMockService = require("../service/mtn_mock.service");
const orangeMockService = require("../service/orange_mock.service");
const alMockService = require("../service/al.service");
const {
  initiateOrangeMoneyTransfer,
  getOrangeMoneyTransferStatus,
} = require("../service/orange.service");
const moment = require("moment");
const { string } = require("joi");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

/**
 * Create Batch Payout
 */
const batch_payout = catchAsync(async (req, res) => {
  const { transactions } = req.body;

  let batch_id;

  do {
    batch_id = await helperService.make_unique_id(10);
    var batchIsExists = await quotationValidation.validateBatchIdExists(
      batch_id
    );
  } while (batchIsExists);

  var batchResponse = {
    batch_id: batch_id,
    transactions: [],
  };

  // ==============================================================================
  // Promise All
  await Promise.all(
    transactions.map(async (txn) => {
      const {
        order_id,
        amount,
        confirmation_required,
        purpose_of_remittance,
        payout_reference,
        debit_amount,
        debit_currency,
        webhook_url,
      } = txn;

      var transaction_response = {
        order_id: txn?.order_id,
        payout_reference: txn?.payout_reference,

        sub_merchant_id: txn?.sub_merchant_id,
        receiver_id: txn?.receiver_id,
        wallet_id: txn?.wallet_id,
        currency: txn?.currency,

        account_id: txn?.account_id,

        amount: txn?.amount,
        debit_amount: txn?.debit_amount,
        debit_currency: txn?.debit_currency,

        confirmation_required: txn?.confirmation_required,
        purpose_of_remittance: txn?.purpose_of_remittance,
        webhook_url: txn?.webhook_url,

        payout_details: "",
        payout_status: "", // success, failed
        payout_status_message: "",
      };

      let wallet_id = txn?.wallet_id;
      let currency = txn?.currency;
      let sub_merchant_id = txn?.sub_merchant_id;
      let receiver_id = txn?.receiver_id;
      let account_id = txn?.account_id;

      if (wallet_id) {
        let wallet = await nodeServerAPIService.get_wallet_details_by_id(
          wallet_id
        );
        console.log("🚀 ~ wallet:", wallet);
        if (wallet?.status !== httpStatus.OK) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = wallet?.message;
          batchResponse.transactions.push(transaction_response);
          return;
        }
        currency = wallet?.data?.currency;
        receiver_id = wallet?.data?.receiver_id;
        wallet_id = wallet?.data.wallet_id;
      } else if (sub_merchant_id && currency) {
        let payload = {
          sub_merchant_id: String(sub_merchant_id),
          currency: currency,
        };
        let wallet = await nodeServerAPIService.get_wallet_details_by_sub_id(
          payload
        );
        console.log("🚀 ~ wallet1:", wallet);
        if (wallet?.status !== httpStatus.OK) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = wallet?.message;
          batchResponse.transactions.push(transaction_response);
          return;
        }
        currency = wallet?.data?.currency;
        receiver_id = wallet?.data?.receiver_id;
        wallet_id = wallet?.data.wallet_id;
        if (!transaction_response?.wallet_id) {
          transaction_response.wallet_id = wallet?.data.wallet_id;
        }
      } else if (receiver_id && currency) {
        let payload = {
          receiver_id: String(receiver_id),
          currency: currency,
        };
        let wallet = await nodeServerAPIService.get_wallet_details_by_sub_id(
          payload
        );
        console.log("🚀 ~ wallet3:", wallet);
        if (wallet?.status !== httpStatus.OK) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = wallet?.message;
          batchResponse.transactions.push(transaction_response);
          return;
        }
        currency = wallet?.data?.currency;
        receiver_id = wallet?.data?.receiver_id;
        wallet_id = wallet?.data.wallet_id;
        if (!transaction_response?.wallet_id) {
          transaction_response.wallet_id = wallet?.data.wallet_id;
        }
      }

      // ==============================================================================
      // Check Payout Amount

      try {
        parseFloat(amount);
      } catch (error) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message =
          "Invalid value entered in amount field";
        batchResponse.transactions.push(transaction_response);
        return;
      }

      //=============================================================================================
      // Get merchant details by id
      let company_details = null;
      if (helperService.isValid(sub_merchant_id)) {
        company_details = await nodeServerAPIService.get_company_details();
      }

      // ==============================================================================
      // Get Receiver Details

      let receiver = await receiverService.get_receiver_by_id(receiver_id);

      if (undefined != receiver?.status && receiver?.status != httpStatus.OK) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = receiver?.message;
        batchResponse.transactions.push(transaction_response);
        return;
      }

      // Check receiver created
      if (helperService.isNotValid(receiver)) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = "Receiver not found!";
        batchResponse.transactions.push(transaction_response);
        return;
      }
      if (receiver?.verification !== "verified") {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message =
          "Receiver is not verified!";
        batchResponse.transactions.push(transaction_response);
        return;
      }
      if (receiver?.active !== 1) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = "Receiver is not active!";
        batchResponse.transactions.push(transaction_response);
        return;
      }

      // ==============================================================================
      // Get Funding Details

      const get_funding_details_payload = {};
      if (account_id) {
        get_funding_details_payload.account_id = account_id;
      } else if (receiver?.sub_merchant_id && currency) {
        get_funding_details_payload.submerchant_id = String(
          receiver?.sub_merchant_id
        );
        get_funding_details_payload.currency = currency;
      } else if (receiver?.receiver_id && currency) {
        get_funding_details_payload.receiver_id = String(receiver?.receiver_id);
        get_funding_details_payload.currency = currency;
      }
      console.log(
        "🚀 ~ get_funding_details_payload:",
        get_funding_details_payload
      );

      var receiver_account_details =
        await nodeServerAPIService.get_funding_details(
          get_funding_details_payload
        );
      console.log("🚀 ~ account_details:", receiver_account_details);
      if (receiver_account_details?.status != httpStatus.OK) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message =
          receiver_account_details?.message;
        batchResponse.transactions.push(transaction_response);
        return;
      }

      if (receiver_account_details?.data?.is_verified != 1) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = "Account is not verified!";
        batchResponse.transactions.push(transaction_response);
        return;
      }

      receiver_account_details = receiver_account_details?.data;
      if (!transaction_response?.account_id) {
        transaction_response.account_id = receiver_account_details?.account_id;
      }

      // ==============================================================================
      // Check wallet balance

      let get_wallet_balance_payload = {};
      if (wallet_id) {
        get_wallet_balance_payload.wallet_id = wallet_id;
      } else if (receiver?.sub_merchant_id && currency) {
        get_wallet_balance_payload.sub_merchant_id = receiver?.sub_merchant_id;
        get_wallet_balance_payload.currency = currency;
      } else if (receiver_id && currency) {
        get_wallet_balance_payload.receiver_id = receiver_id;
        get_wallet_balance_payload.currency = currency;
      }

      console.log(
        "🚀 ~ get_wallet_balance_payload:",
        get_wallet_balance_payload
      );
      let wallet_balance_response = await quotationService.get_wallet_balance(
        get_wallet_balance_payload
      );
      if (wallet_balance_response?.status != httpStatus.OK) {
        console.log("🚀 ~ wallet_balance_response:", wallet_balance_response);
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = "Account not found!";
        batchResponse.transactions.push(transaction_response);
        return;
      }
      let balance = wallet_balance_response?.data?.data?.balance;
      console.log("🚀 ~ balance:", balance);

      if (
        helperService.parseFormattedNumber(balance) == 0 ||
        helperService.parseFormattedNumber(balance) <
          helperService.parseFormattedNumber(amount)
      ) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = "Insufficient Balance!";
        batchResponse.transactions.push(transaction_response);
        return;
      }

      // ==============================================================================
      // MID Routing

      let MID = await quotationService.payout_psp_routing(
        receiver_account_details
      );
      console.log("🚀 ~ payout ~ MID:", MID);
      if (MID?.status !== httpStatus.OK) {
        transaction_response.payout_status = "failed"; // success, failed
        transaction_response.payout_status_message = MID?.message;
        batchResponse.transactions.push(transaction_response);
        return;
      }

      // ==============================================================================
      // Payer Selection

      if (receiver_account_details?.payer_id == "MTN_MOMO") {
        console.log(`here is reciever id and body`);
        console.log(req.body, receiver_account_details);
        // fetch mid
        let payout_mid_details = MID?.data;
        // let payout_mid_details = await payout_mid.findOne({
        //   where: { sub_merchant_id: receiver?.sub_merchant_id },
        // });
        console.log(payout_mid_details);
        // Check payer currency and request payout currency
        if (receiver_account_details?.currency != currency) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message =
            "Invalid currency selected! The receiver only accepts payouts in " +
            receiver_account_details?.currency;
          batchResponse.transactions.push(transaction_response);
          return;
        }

        if (helperService.isNotValid(payout_mid_details?.primary_key)) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = "Invalid 'primary_key'";
          batchResponse.transactions.push(transaction_response);
          return;
        }

        if (helperService.isNotValid(payout_mid_details?.api_key)) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = "Invalid 'api_key'";
          batchResponse.transactions.push(transaction_response);
          return;
        }

        if (helperService.isNotValid(payout_mid_details?.password)) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = "Invalid 'password'";
          batchResponse.transactions.push(transaction_response);
          return;
        }

        //call mtn service for token
        let token = await getAccessToken(
          payout_mid_details?.primary_key,
          payout_mid_details?.api_key,
          payout_mid_details?.password
        );
        if (!token) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message =
            "Invalid MID credentials";
          batchResponse.transactions.push(transaction_response);
          return;
        }

        // make transfer payload
        let data = {
          amount: amount,
          currency: currency,
          externalId: await helperService.make_unique_id(),
          payee: {
            partyIdType: "MSISDN",
            partyId: receiver_account_details?.account_details?.MSISDN,
          },
          payerMessage: "Payout",
          payeeNote: `Payout to merchant of ${currency} ${amount}`,
        };
        let payoutReferenceId = await initiateTransfer(
          token,
          data,
          payout_mid_details.primary_key
        );
        if (!payoutReferenceId) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message =
            "Unable to initiate transfer";
          batchResponse.transactions.push(transaction_response);
          return;
        }
        let getTransactionStatus = await getTransferStatus(
          token,
          payoutReferenceId,
          payout_mid_details.primary_key
        );
        console.log(
          "🚀 ~ payout ~ getTransactionStatus:",
          getTransactionStatus
        );
        let transactionPayload = {
          transaction_id: getTransactionStatus.financialTransactionId,
          external_id: getTransactionStatus.externalId,
          receiver_id: receiver_id,
          wallet_id: wallet_id,
          account_id: account_id,
          mid_id: MID?.data?.id,
          batch_id: batch_id,
          super_merchant_id: "",
          sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
            ? receiver?.sub_merchant_id
            : null,
          transaction_type: "B2B",
          wholesale_fx_rate: parseFloat(0),
          destination_amount: parseFloat(amount),
          destination_currency: currency,
          sent_amount: parseFloat(amount),
          sent_currency: currency,
          source_amount: parseFloat(amount),
          source_currency: currency,
          source_country_iso_code: receiver_account_details?.country,
          payer_country_iso_code: "LBR",
          fee_amount: parseFloat(0),
          fee_currency: "NA",
          creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
          expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
          payer_id: receiver_account_details.payer_id,
          payer_currency: currency,
          service_id: receiver_account_details?.funding_source_type,
          service_name: "Mobile Wallet",
          status_message:
            getTransactionStatus?.status == "SUCCESSFUL"
              ? "COMPLETED"
              : "FAILED",
          callback_url: payout_mid_details.callback,
          payer_name: "MSISDN",
          payout_reference: payout_reference,
          reason: getTransactionStatus?.reason,
        };
        console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
        await transaction.create(transactionPayload);
        // call to node server to update charges
        const payload = {
          submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
            ? null
            : receiver?.sub_merchant_id,
          receiver_id: helperService.isNotValid(receiver_id)
            ? null
            : String(receiver_id),
          currecny: currency,
          amount: String(amount),
          transaction_id: String(getTransactionStatus.financialTransactionId),
          order_id: transactionPayload?.external_id,
          order_status: transactionPayload?.status_message,
        };
        console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
        var result = await nodeServerAPIService.update_payout_status(
          req,
          payload
        );
        console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);
        // const momoResponsePayload = {
        //   transaction_id: getTransactionStatus.financialTransactionId,
        //   transaction_status:
        //     getTransactionStatus?.status == "SUCCESSFUL"
        //       ? "COMPLETED"
        //       : "FAILED",
        //   status_code: httpStatus.OK,
        //   receiver_id: receiver_id,
        //   wallet_id: wallet_id,
        //   account_id: account_id,
        //   mid_id: MID?.data?.id,
        //   destination: {
        //     amount: parseFloat(amount),
        //     currency: currency,
        //   },
        //   sent_amount: {
        //     amount: parseFloat(amount),
        //     currency: currency,
        //   },
        //   quotation_id: "",
        //   batch_id: batch_id,
        //   super_merchant_id: "",
        //   sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        //     ? receiver?.sub_merchant_id
        //     : null,
        //   payout_reference: helperService.isValid(payout_reference)
        //     ? payout_reference
        //     : null,
        // };

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

        const momoResponsePayload = {
          order_id: order_id,
          external_id: transactionPayload?.external_id,
          transaction_id: getTransactionStatus.financialTransactionId,
          sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
            ? receiver?.sub_merchant_id
            : null,
          receiver_id: helperService.isValid(receiver?.receiver_id)
            ? receiver?.receiver_id
            : null,
          currency: currency,
          wallet_id: wallet_id,
          debit_party: debit_party,
          credit_party: credit_party,
          credit_party_identifier: {
            MSISDN: receiver_account_details?.account_details?.MSISDN,
          },
          debit_details: {
            debit_amount: parseFloat(amount),
            currency: currency,
          },
          credit_details: {
            amount: parseFloat(amount),
            currency: currency,
          },
          payout_reference: helperService.isValid(payout_reference)
            ? payout_reference
            : null,
          webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
          purpose_of_remittance: helperService.isValid(purpose_of_remittance)
            ? purpose_of_remittance
            : null,
          transaction_status:
            getTransactionStatus?.status == "SUCCESSFUL"
              ? "COMPLETED"
              : "FAILED",
          transaction_status_code:
            getTransactionStatus?.status == "SUCCESSFUL" ? 20000 : 40000,
          order_created_date: moment(transactionPayload?.creation_date).format(
            "YYYY-MM-DD hh:mm:ss"
          ),
          order_updated_date: moment(transactionPayload?.creation_date).format(
            "YYYY-MM-DD hh:mm:ss"
          ),
          batch_id: batch_id,
        };

        transaction_response.data = momoResponsePayload;
        transaction_response.payout_status = "success"; // success, failed
        transaction_response.payout_status_message = "success";

        const responsePayload = {
          ...transaction_response?.data,
          payout_status: transaction_response.payout_status,
          payout_status_message: transaction_response.payout_status_message,
        };

        delete responsePayload.batch_id;

        batchResponse.transactions.push(responsePayload);
      } else if (receiver_account_details?.payer_id == "ORANGE_MONEY") {
        console.log(`here is reciever id and body in orange money`);
        console.log(req.body, receiver);
        // fetch mid
        let payout_mid_details = MID?.data;
        // let payout_mid_details = await payout_mid.findOne({
        //   where: { sub_merchant_id: receiver?.sub_merchant_id },
        // });
        console.log(payout_mid_details);
        // Check payer currency and request payout currency
        if (receiver_account_details?.currency != currency) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message =
            "Invalid currency selected! The receiver only accepts payouts in " +
            receiver_account_details?.currency;
          batchResponse.transactions.push(transaction_response);
          return;
        }
        if (helperService.isNotValid(payout_mid_details?.api_key)) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = "Invalid 'api_key'";
          batchResponse.transactions.push(transaction_response);
          return;
        }

        if (helperService.isNotValid(payout_mid_details?.password)) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message = "Invalid 'password'";
          batchResponse.transactions.push(transaction_response);
          return;
        }
        let externalTransactionId = await helperService.make_unique_id();
        // make transfer payload
        let data = {
          auth: {
            user: payout_mid_details?.api_key,
            pwd: payout_mid_details?.password,
          },
          param: {
            MSISDN: receiver_account_details?.account_details?.MSISDN,
            Amount: amount,
            Currency: currency,
            EXTERNALID: externalTransactionId,
          },
        };
        // initiate payout
        let payoutReferenceId = await initiateOrangeMoneyTransfer(data);
        //send response if reference id is fals
        if (!payoutReferenceId) {
          transaction_response.payout_status = "failed"; // success, failed
          transaction_response.payout_status_message =
            "Unable to initiate transfer";
          batchResponse.transactions.push(transaction_response);
          return;
        }
        //get transaction status
        let getTransactionStatus = await getOrangeMoneyTransferStatus(
          payoutReferenceId,
          payout_mid_details?.api_key,
          payout_mid_details?.password,
          currency
        );
        transaction_response.payout_status = "failed"; // success, failed
        let transactionStatus = "FAILED";
        if (getTransactionStatus.resultset.TXNSTATUS == "TS") {
          transactionStatus = "COMPLETED";
          transaction_response.payout_status = "success"; // success, failed
        }
        if (getTransactionStatus.resultset.TXNSTATUS == "TI") {
          transactionStatus = "PENDING";
          transaction_response.payout_status = "pending"; // success, failed, pending
        }
        let transactionPayload = {
          transaction_id: payoutReferenceId,
          external_id: externalTransactionId,
          receiver_id: receiver_id,
          wallet_id: wallet_id,
          account_id: account_id,
          mid_id: MID?.data?.id,
          batch_id: batch_id,
          super_merchant_id: "",
          sub_merchant_id: receiver.sub_merchant_id,
          transaction_type: "B2B",
          wholesale_fx_rate: parseFloat(0),
          destination_amount: parseFloat(amount),
          destination_currency: currency,
          sent_amount: parseFloat(amount),
          sent_currency: currency,
          source_amount: parseFloat(amount),
          source_currency: currency,
          source_country_iso_code: receiver_account_details?.country,
          payer_country_iso_code: "LBR",
          fee_amount: parseFloat(0),
          fee_currency: "NA",
          creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
          expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
          payer_id: receiver_account_details.payer_id,
          payer_currency: currency,
          service_id: receiver_account_details?.funding_source_type,
          service_name: "Mobile Wallet",
          status_message: transactionStatus,
          callback_url: payout_mid_details.callback,
          payer_name: "MSISDN",
          payout_reference: payout_reference,
        };
        console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
        await transaction.create(transactionPayload);
        // call to node server to update charges
        const payload = {
          submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
            ? null
            : receiver?.sub_merchant_id,
          receiver_id: helperService.isNotValid(receiver_id)
            ? null
            : String(receiver_id),
          currecny: currency,
          amount: String(amount),
          transaction_id: String(payoutReferenceId),
          order_id: transactionPayload?.external_id,
          order_status: transactionPayload?.status_message,
        };
        console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
        var result = await nodeServerAPIService.update_payout_status(
          req,
          payload
        );
        console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);
        // const responsePayload = {
        //   transaction_id: payoutReferenceId,
        //   transaction_status: transactionStatus,
        //   status_code: httpStatus.OK,
        //   receiver_id: receiver_id,
        //   wallet_id: wallet_id,
        //   account_id: account_id,
        //   mid_id: MID?.data?.id,
        //   destination: {
        //     amount: parseFloat(amount),
        //     currency: currency,
        //   },
        //   sent_amount: {
        //     amount: parseFloat(amount),
        //     currency: currency,
        //   },
        //   quotation_id: "",
        //   batch_id: batch_id,
        //   super_merchant_id: receiver.super_merchant_id,
        //   sub_merchant_id: receiver.sub_merchant_id,
        //   payout_reference: payout_reference,
        // };

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

        const responsePayload = {
          order_id: order_id,
          external_id: transactionPayload?.external_id,
          transaction_id: getTransactionStatus.financialTransactionId,
          sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
            ? receiver?.sub_merchant_id
            : null,
          receiver_id: helperService.isValid(receiver?.receiver_id)
            ? receiver?.receiver_id
            : null,
          currency: currency,
          wallet_id: wallet_id,
          debit_party: debit_party,
          credit_party: credit_party,
          credit_party_identifier: {
            MSISDN: receiver_account_details?.account_details?.MSISDN,
          },
          debit_details: {
            debit_amount: parseFloat(amount),
            currency: currency,
          },
          credit_details: {
            amount: parseFloat(amount),
            currency: currency,
          },
          payout_reference: helperService.isValid(payout_reference)
            ? payout_reference
            : null,
          webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
          purpose_of_remittance: helperService.isValid(purpose_of_remittance)
            ? purpose_of_remittance
            : null,
          transaction_status:
            getTransactionStatus?.status == "SUCCESSFUL"
              ? "COMPLETED"
              : "FAILED",
          transaction_status_code:
            getTransactionStatus?.status == "SUCCESSFUL" ? 20000 : 40000,
          order_created_date: moment(transactionPayload?.creation_date).format(
            "YYYY-MM-DD hh:mm:ss"
          ),
          order_updated_date: moment(transactionPayload?.creation_date).format(
            "YYYY-MM-DD hh:mm:ss"
          ),
          batch_id: batch_id,
        };

        res.status(httpStatus.OK).send({
          status: httpStatus.OK,
          message: "Transaction confirmed successfully",
          data: responsePayload,
        });

        transaction_response.data = responsePayload;
        transaction_response.payout_status_message = "success";

        const finalResponsePayload = {
          ...transaction_response?.data,
          payout_status: transaction_response.payout_status,
          payout_status_message: transaction_response.payout_status_message,
        };

        delete finalResponsePayload.batch_id;

        batchResponse.transactions.push(finalResponsePayload);
      } else {
        try {
          // Get payer details by id
          const payerResponse = await payerService.getById(
            receiver_account_details?.payer_id,
            MID?.data
          );
          if (payerResponse?.status !== httpStatus.OK) {
            transaction_response.payout_status = "failed"; // success, failed
            (transaction_response.payout_status_message =
              payerResponse?.message),
              batchResponse.transactions.push(transaction_response);
            return;
          }

          // Check payer currency and request payout currency
          if (payerResponse?.data?.currency !== currency) {
            transaction_response.payout_status = "failed"; // success, failed
            (transaction_response.payout_status_message =
              "Invalid currency selected! The receiver only accepts payouts in " +
              payerResponse?.data?.currency),
              batchResponse.transactions.push(transaction_response);
            return;
          }

          // Add Payer Name with account details
          receiver_account_details.payer_name = payerResponse?.data?.name;

          // ==============================================================================
          // Check valid bank details

          let receiver_details = {
            data: receiver_account_details,
            purpose_of_remittance: purpose_of_remittance,
          };

          let isValidBankDetails =
            await receiverService.check_valid_bank_details(
              receiver_details,
              MID?.data
            );
          console.log("🚀 ~ isValidBankDetails:", isValidBankDetails);

          if (isValidBankDetails?.status !== httpStatus.OK) {
            console.log(
              "🚀 ~ payout ~ isValidBankDetails:",
              isValidBankDetails
            );
            transaction_response.payout_status = "failed"; // success, failed
            transaction_response.payout_status_message =
              isValidBankDetails?.message;
            batchResponse.transactions.push(transaction_response);
            return;
          }

          // check payer id
          // 1. Create quotation payload
          var quotationPayload = {
            receiver_id: receiver_id,
            account_details: receiver_account_details,
            destination_amount: amount,
            destination_currency: currency,
            debit_amount: debit_amount,
            debit_currency: debit_currency,
            extra: {
              receiver: receiver,
              payer: payerResponse?.data,
              MID: MID?.data,
            },
          };

          //1. Create quotation
          const quotation = await quotationService.create_quotations(
            quotationPayload
          );
          if (quotation?.status !== httpStatus.OK) {
            transaction_response.payout_status = "failed"; // success, failed
            transaction_response.payout_status_message = quotation?.message;
            batchResponse.transactions.push(transaction_response);
            return;
          }

          // Adding request parameters for DB
          quotation.data.request = {
            order_id: order_id,
            wallet_id: wallet_id,
            account_id: helperService.isNotValid(account_id)
              ? receiver_account_details?.account_id
              : account_id,
            purpose_of_remittance: purpose_of_remittance,
            payout_reference: payout_reference,
            webhook_url: webhook_url,
          };

          transaction_response.receiver_id = receiver_id;
          transaction_response.quotation_id = quotation?.data?.id;

          // 2. Create transaction payload
          const createTransactionResponse =
            await quotationService.post_transaction(
              quotation?.data,
              payerResponse?.data,
              receiver,
              receiver_account_details,
              batch_id,
              MID?.data
            );

          if (createTransactionResponse?.status !== httpStatus.OK) {
            transaction_response.payout_status = "failed"; // success, failed
            transaction_response.payout_status_message =
              createTransactionResponse?.message;
            batchResponse.transactions.push(transaction_response);
            return;
          }

          transaction_response.data = createTransactionResponse?.data;

          // Transaction confirmation required
          if (!confirmation_required) {
            transaction_response.payout_status = "success"; // success, failed
            transaction_response.payout_status_message = "success";

            const responsePayload = {
              ...transaction_response?.data,
              payout_status: transaction_response.payout_status,
              payout_status_message: transaction_response.payout_status_message,
            };

            delete responsePayload.batch_id;

            batchResponse.transactions.push(responsePayload);
            return;
          }

          let txn_id = createTransactionResponse?.data?.transaction_id;
          console.log("🚀 ~ transactions.map ~ txn_id:", txn_id);

          // 3. Confirm transaction payload
          const confirmTransactionResponse =
            await quotationService.confirm_transaction(
              txn_id,
              batch_id,
              MID?.data,
              quotation?.data?.request,
              receiver_account_details
            );
          if (confirmTransactionResponse?.status !== httpStatus.OK) {
            (transaction_response.payout_status = "failed"), // success, failed
              (transaction_response.payout_status_message =
                confirmTransactionResponse?.message);
            batchResponse.transactions.push(transaction_response);
            return;
          }

          transaction_response.data = confirmTransactionResponse?.data;
          transaction_response.payout_status = "success"; // success, failed
          transaction_response.payout_status_message = "success";

          const responsePayload = {
            ...transaction_response?.data,
            payout_status: transaction_response.payout_status,
            payout_status_message: transaction_response.payout_status_message,
          };

          delete responsePayload.batch_id;

          batchResponse.transactions.push(responsePayload);

          // 4. Update Payout status
          let confirmResponse = confirmTransactionResponse?.data;
          const payload = {
            submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
              ? null
              : receiver?.sub_merchant_id,
            receiver_id: helperService.isNotValid(receiver_id)
              ? null
              : String(receiver_id),
            currecny: confirmResponse?.credit_details?.currency,
            amount: String(confirmResponse?.credit_details?.amount),
            transaction_id: String(confirmResponse?.transaction_id),
            order_id: confirmResponse?.external_id,
            order_status: "PENDING",
          };

          console.log("🚀 ~ payout ~ payload:", payload);
          var result = await nodeServerAPIService.update_payout_status(
            req,
            payload
          );
          console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);
        } catch (err) {
          console.error(`Error in transaction ${txn.tx_id}:`, err.message);
          (transaction_response.payout_status = "failed"), // success, failed
            (transaction_response.payout_status_message = err.message);
          batchResponse.transactions.push(transaction_response);
        }
      }
    })
  );

  // Send Final Success Response
  res.status(httpStatus.OK).send({
    status: httpStatus.OK,
    message: "Payout done!",
    data: batchResponse,
  });
});

/**
 * Manage Batch Payout
 */
const manage_batch_payout = catchAsync(async (req, res) => {
  const { action, batch_id } = req.body;
  if (action === "CANCEL") {
    cancel_batch(batch_id, res);
  } else if (action === "CONFIRM") {
    confirm_batch(batch_id, res);
  }
});

/**
 * Cancel Batch Payout
 */
const cancel_batch_payout = catchAsync(async (req, res) => {
  const batch_id = req.params.batch_id;
  cancel_batch(batch_id, res);
});

/**
 * Cancel Batch Payout
 */
const cancel_batch = catchAsync(async (batch_id, res) => {
  const transactions = await transactionService.getByBatchId(batch_id);

  if (Array.isArray(transactions?.data) && transactions?.data?.length > 0) {
  } else {
    res.status(httpStatus.OK).send({
      status: httpStatus.NOT_FOUND,
      message: "Transactions not found.",
    });
    return;
  }

  var confirm_transaction = [];

  await Promise.all(
    transactions?.data.map(async (transaction) => {
      if (transaction.status_message === "CREATED") {
        const transactions = await transactionService.checkConfirmTransaction(
          transaction?.transaction_id,
          "CONFIRMED"
        );
        if (
          Array.isArray(transactions?.data) &&
          transactions?.data?.length > 0
        ) {
          return;
        }

        // Get Transaction MID
        const MID = await pspService.get_mid_by_id(transaction?.mid_id);
        if (MID?.status !== httpStatus.OK) {
          return MID;
        }

        const transactionResponse = await quotationService.transaction_cancel(
          transaction?.transaction_id,
          MID?.data
        );

        const finalResponse = {
          batch_id: batch_id,
          transaction_id: transaction.transaction_id,
          data: transactionResponse,
        };
        confirm_transaction.push(finalResponse);
      }
    })
  );

  // Send Final Success Response
  res.status(httpStatus.OK).send({
    status: httpStatus.OK,
    message:
      confirm_transaction?.length > 0 ? "Done" : "Transaction not found!",
    data: confirm_transaction,
  });
});

/**
 * Confirm Batch Payout
 */
const confirm_batch_payout = catchAsync(async (req, res) => {
  const batch_id = req.params.batch_id;
  confirm_batch(batch_id, res);
});

/**
 * Confirm Batch Payout
 */
const confirm_batch = catchAsync(async (batch_id, res) => {
  const transactions = await transactionService.getByBatchId(batch_id);

  if (Array.isArray(transactions?.data) && transactions?.data?.length > 0) {
  } else {
    res.status(httpStatus.OK).send({
      status: httpStatus.NOT_FOUND,
      message: "Transactions not found.",
    });
    return;
  }

  var confirm_transaction = [];

  await Promise.all(
    transactions?.data.map(async (transaction) => {
      if (transaction?.status_message === "CREATED") {
        const transactions = await transactionService.checkConfirmTransaction(
          transaction?.transaction_id,
          "CONFIRMED"
        );
        if (
          Array.isArray(transactions?.data) &&
          transactions?.data?.length > 0
        ) {
          return;
        }

        // ==============================================================================
        // Get Last Transaction By ID
        const stored_transaction = await transactionService.getById(
          transaction?.transaction_id
        );
        console.log("🚀 ~ stored_transaction:", stored_transaction);
        if (stored_transaction.status !== httpStatus.OK) {
          return stored_transaction;
        }

        // ==============================================================================
        // Get Funding Details

        const get_funding_details_payload = {};
        if (stored_transaction?.data?.account_id) {
          get_funding_details_payload.account_id =
            stored_transaction?.data?.account_id;
        } else if (
          stored_transaction?.data?.sub_merchant_id &&
          stored_transaction?.data?.payer_currency
        ) {
          get_funding_details_payload.submerchant_id = String(
            stored_transaction?.data?.sub_merchant_id
          );
          get_funding_details_payload.currency =
            stored_transaction?.data?.payer_currency;
        } else if (
          stored_transaction?.data?.receiver_id &&
          stored_transaction?.data?.payer_currency
        ) {
          get_funding_details_payload.receiver_id = String(
            stored_transaction?.data?.receiver_id
          );
          get_funding_details_payload.currency =
            stored_transaction?.data?.payer_currency;
        }
        console.log(
          "🚀 ~ get_funding_details_payload:",
          get_funding_details_payload
        );

        var receiver_account_details =
          await nodeServerAPIService.get_funding_details(
            get_funding_details_payload
          );
        console.log("🚀 ~ account_details:", receiver_account_details);
        if (receiver_account_details?.status != httpStatus.OK) {
          console.log(
            "🚀 ~ receiver_account_details:",
            receiver_account_details
          );
          return;
        }

        if (receiver_account_details?.data?.is_verified != 1) {
          console.log("🚀 ~ receiver_account_details:", {
            status: 400,
            message: "Account is not verified!",
          });
          return;
        }

        receiver_account_details = receiver_account_details?.data;
        // Added payer name with account details
        receiver_account_details.payer_name =
          stored_transaction?.data?.payer_name;

        // ==============================================================================
        // Get Transaction MID
        const MID = await pspService.get_mid_by_id(transaction?.mid_id);
        if (MID?.status !== httpStatus.OK) {
          return MID;
        }

        let quotation_data_request = {
          order_id: stored_transaction?.data?.order_id,
          wallet_id: stored_transaction?.data?.wallet_id,
          account_id: helperService.isNotValid(
            stored_transaction?.data?.account_id
          )
            ? receiver_account_details?.account_id
            : stored_transaction?.data?.account_id,
          purpose_of_remittance:
            stored_transaction?.data?.purpose_of_remittance,
          payout_reference: stored_transaction?.data?.payout_reference,
          webhook_url: stored_transaction?.data?.callback_url,
        };
        console.log("🚀 ~ quotation_data_request:", quotation_data_request);

        const confirmTransactionResponse =
          await quotationService.confirm_transaction(
            transaction.transaction_id,
            batch_id,
            MID?.data,
            quotation_data_request,
            receiver_account_details
          );

        confirm_transaction.push(confirmTransactionResponse?.data);

        try {
          //Update status
          let confirmResponse = confirmTransactionResponse?.data;
          const payload = {
            submerchant_id: helperService.isNotValid(
              confirmResponse?.sub_merchant_id
            )
              ? null
              : receiver?.sub_merchant_id,
            receiver_id: helperService.isNotValid(confirmResponse?.receiver_id)
              ? null
              : String(confirmResponse?.receiver_id),
            currecny: confirmResponse?.destination?.currency,
            amount: String(confirmResponse?.destination?.amount),
            transaction_id: String(confirmResponse?.transaction_id),
            order_id: confirmResponse?.external_id,
            order_status: "PENDING",
          };

          console.log("🚀 ~ payout ~ payload:", payload);
          var result = await nodeServerAPIService.update_payout_status(
            req,
            payload
          );
          console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);
        } catch (error) {
          console.log("🚀 ~ error:", error);
        }
      }
    })
  );

  // Send Final Success Response
  res.status(httpStatus.OK).send({
    status: httpStatus.OK,
    message: "Done",
    batch_id: batch_id,
    data: confirm_transaction,
  });
});

/**
 * Get Batch Transaction Status
 */
const get_batch_transaction_status = catchAsync(async (req, res) => {
  const batch_id = req.params.batch_id;

  const transactions = await transactionService.getByBatchId(batch_id);

  if (Array.isArray(transactions?.data) && transactions?.data?.length > 0) {
  } else {
    res.status(httpStatus.OK).send({
      status: httpStatus.NOT_FOUND,
      message: "Transactions not found.",
    });
    return;
  }

  var transaction_status = [];

  await Promise.all(
    transactions?.data.map(async (transaction) => {
      const MID = await pspService.get_mid_by_id(transaction?.mid_id);
      if (MID?.status !== httpStatus.OK) {
        res.status(httpStatus.BAD_REQUEST).send(MID);
        return;
      }

      const transactionResponse = await quotationService.transaction_status(
        transaction?.transaction_id,
        MID?.data
      );

      const finalResponse = {
        ...transactionResponse?.data,
        status: transactionResponse?.status,
        message: transactionResponse?.message,
      };
      transaction_status.push(finalResponse);
    })
  );

  // Send Final Success Response
  res.status(httpStatus.OK).send({
    status: httpStatus.OK,
    message: transaction_status?.length > 0 ? "Done" : "Transaction not found!",
    batch_id: batch_id,
    data: transaction_status,
  });
});

/**
 * Create Payout
 */
const payout = catchAsync(async (req, res) => {
  const {
    order_id,
    amount,
    confirmation_required,
    purpose_of_remittance,
    payout_reference,
    debit_amount,
    debit_currency,
    webhook_url,
  } = req.body;

  let wallet_id = req.body.wallet_id;
  let currency = req.body.currency;
  let sub_merchant_id = req.body.sub_merchant_id;
  let receiver_id = req.body.receiver_id;
  let account_id = req.body.account_id;

  if (wallet_id) {
    let wallet = await nodeServerAPIService.get_wallet_details_by_id(wallet_id);
    console.log("🚀 ~ wallet2:", wallet);
    if (wallet?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(wallet);
      return;
    }
    currency = wallet?.data?.currency;
    receiver_id = wallet?.data?.receiver_id;
    wallet_id = wallet?.data.wallet_id;
  } else if (sub_merchant_id && currency) {
    let payload = {
      sub_merchant_id: String(sub_merchant_id),
      currency: currency,
    };
    let wallet = await nodeServerAPIService.get_wallet_details_by_sub_id(
      payload
    );
    console.log("🚀 ~ wallet1:", wallet);
    if (wallet?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(wallet);
      return;
    }
    currency = wallet?.data?.currency;
    receiver_id = wallet?.data?.receiver_id;
    wallet_id = wallet?.data.wallet_id;
  } else if (receiver_id && currency) {
    let payload = {
      receiver_id: String(receiver_id),
      currency: currency,
    };
    let wallet = await nodeServerAPIService.get_wallet_details_by_sub_id(
      payload
    );
    console.log("🚀 ~ wallet3:", wallet);
    if (wallet?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(wallet);
      return;
    }
    currency = wallet?.data?.currency;
    receiver_id = wallet?.data?.receiver_id;
    wallet_id = wallet?.data.wallet_id;
  }

  //=============================================================================================
  // Get merchant details by id
  let company_details = null;
  // if (helperService.isValid(sub_merchant_id)) {
  company_details = await nodeServerAPIService.get_company_details();
  console.log("🚀 ~ company_details:", company_details);
  // }

  // ==============================================================================
  // Get Receiver Details
  let receiver = await receiverService.get_receiver_by_id(receiver_id);
  console.log("🚀 ~ payout ~ receiver:", receiver);

  if (undefined != receiver?.status && receiver?.status != httpStatus.OK) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: receiver?.message,
    });
    return;
  }

  // Check receiver created
  if (helperService.isNotValid(receiver)) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Receiver not found!",
    });
    return;
  }

  if (receiver?.verification !== "verified") {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Receiver is not verified!",
    });
    return;
  }

  if (receiver?.active !== 1) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Receiver is not active!",
    });
    return;
  }

  // if (helperService.isNotValid(receiver?.sub_merchant_id) && helperService.isNotValid(account_id)) {
  //   res.status(httpStatus.OK).send({
  //     status: 400,
  //     message: "Account ID required!",
  //   });
  //   return;
  // }

  // ==============================================================================
  // Get Funding Details

  const get_funding_details_payload = {};
  if (account_id) {
    get_funding_details_payload.account_id = account_id;
  } else if (receiver?.sub_merchant_id && currency) {
    get_funding_details_payload.submerchant_id = String(
      receiver?.sub_merchant_id
    );
    get_funding_details_payload.currency = currency;
  } else if (receiver?.receiver_id && currency) {
    get_funding_details_payload.receiver_id = String(receiver?.receiver_id);
    get_funding_details_payload.currency = currency;
  }
  console.log("🚀 ~ get_funding_details_payload:", get_funding_details_payload);

  var receiver_account_details = await nodeServerAPIService.get_funding_details(
    get_funding_details_payload
  );
  console.log("🚀 ~ account_details:", receiver_account_details);
  if (receiver_account_details?.status != httpStatus.OK) {
    res.status(httpStatus.OK).send(receiver_account_details);
    return;
  }

  if (receiver_account_details?.data?.is_verified != 1) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Account is not verified!",
    });
    return;
  }

  if (receiver_account_details?.data?.is_active != 1) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Account is not active!",
    });
    return;
  }

  receiver_account_details = receiver_account_details?.data;

  // ==============================================================================
  // Check Payout Amount

  try {
    parseFloat(amount);
  } catch (error) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Invalid value entered in amount field",
    });
    return;
  }

  // ==============================================================================
  // Check wallet balance

  let get_wallet_balance_payload = {};
  if (wallet_id) {
    get_wallet_balance_payload.wallet_id = wallet_id;
  } else if (receiver?.sub_merchant_id && currency) {
    get_wallet_balance_payload.sub_merchant_id = receiver?.sub_merchant_id;
    get_wallet_balance_payload.currency = currency;
  } else if (receiver_id && currency) {
    get_wallet_balance_payload.receiver_id = receiver_id;
    get_wallet_balance_payload.currency = currency;
  }

  console.log("🚀 ~ get_wallet_balance_payload:", get_wallet_balance_payload);
  let wallet_balance_response = await quotationService.get_wallet_balance(
    get_wallet_balance_payload
  );
  if (wallet_balance_response?.status != httpStatus.OK) {
    console.log("🚀 ~ wallet_balance_response:", wallet_balance_response);
    res.status(httpStatus.OK).send({
      status: 400,
      message: wallet_balance_response?.message,
    });
    return;
  }
  let balance = wallet_balance_response?.data?.data?.balance;
  console.log("🚀 ~ balance:", balance);

  if (
    helperService.parseFormattedNumber(balance) == 0 ||
    helperService.parseFormattedNumber(balance) <
      helperService.parseFormattedNumber(amount)
  ) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Insufficient Balance!",
    });
    return;
  }

  // ==============================================================================
  // MID Routing

  let MID = await quotationService.payout_psp_routing(receiver_account_details);
  console.log("🚀 ~ payout ~ MID:", MID);
  console.log("🚀 ~ receiver_account_details?.payer_id ~ MID:", receiver_account_details?.payer_id);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(MID);
    return;
  }

  // ==============================================================================
  // ******************************************************************************
  // ==============================================================================
  // Payer Selection, PSP

  if (receiver_account_details?.payer_id == "MTN_MOMO") {
    console.log(`here is reciever id and body`);
    console.log(req.body, receiver_account_details);
    // fetch mid
    let payout_mid_details = MID?.data;
    // let payout_mid_details = await payout_mid.findOne({
    //   where: { sub_merchant_id: receiver?.sub_merchant_id },
    // });
    console.log(payout_mid_details);
    // Check payer currency and request payout currency
    if (receiver_account_details?.currency != currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          receiver_account_details?.currency,
      });
      return;
    }

    if (helperService.isNotValid(payout_mid_details?.primary_key)) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Invalid 'primary_key'",
      });
      return;
    }

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

    //call mtn service for token
    let token = await getAccessToken(
      payout_mid_details?.primary_key,
      payout_mid_details?.api_key,
      payout_mid_details?.password
    );
    if (!token) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Invalid MID credentials",
      });
      return;
    }

    //=============================================================================================
    // make transfer payload

    let externalId = await helperService.make_unique_id();

    let data = {
      amount: amount,
      currency: currency,
      externalId: externalId,
      payee: {
        partyIdType: "MSISDN",
        partyId: receiver_account_details?.account_details?.MSISDN,
      },
      payerMessage: "Payout",
      payeeNote: `Payout to merchant of ${currency} ${amount}`,
    };
    let payoutReferenceId = await initiateTransfer(
      token,
      data,
      payout_mid_details.primary_key
    );
    if (!payoutReferenceId) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Unable to initiate transfer",
      });
      return;
    }
    let getTransactionStatus = await getTransferStatus(
      token,
      payoutReferenceId,
      payout_mid_details.primary_key
    );
    console.log("🚀 ~ payout ~ getTransactionStatus:", getTransactionStatus);

    let txnStatus = "PENDING";
    if (getTransactionStatus?.status === "SUCCESSFUL") {
      txnStatus = "COMPLETED";
    } else if (getTransactionStatus?.status === "FAILED") {
      txnStatus = "FAILED";
    }

    let transactionPayload = {
      transaction_id: payoutReferenceId,
      external_id: externalId,
      receiver_id: receiver_id,
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: receiver_account_details?.account_id,
      mid_id: MID?.data?.id,
      batch_id: "",
      super_merchant_id: "",
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      transaction_type: "B2B",
      wholesale_fx_rate: parseFloat(0),
      destination_amount: parseFloat(amount),
      destination_currency: currency,
      sent_amount: parseFloat(amount),
      sent_currency: currency,
      source_amount: parseFloat(amount),
      source_currency: currency,
      source_country_iso_code: receiver_account_details?.country,
      payer_country_iso_code: "LBR",
      fee_amount: parseFloat(0),
      fee_currency: "NA",
      creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      payer_id: receiver_account_details?.payer_id,
      payer_currency: currency,
      service_id: receiver_account_details?.funding_source_type,
      service_name: "Mobile Wallet",
      status_message: txnStatus,
      callback_url: payout_mid_details.callback,
      payer_name: "MSISDN",
      payout_reference: helperService.isNotValid(payout_reference)
        ? null
        : payout_reference,
      reason: helperService.isNotValid(getTransactionStatus?.reason)
        ? null
        : getTransactionStatus?.reason,
    };
    console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
    await transaction.create(transactionPayload);

    //=============================================================================================
    // DB Save account and payers data

    let account_for = "";
    if (
      helperService.isNotValid(receiver_account_details?.sub_merchant_id) &&
      helperService.isValid(receiver_account_details?.receiver_id)
    ) {
      account_for = "payout";
    } else {
      account_for = "settlement";
    }

    let account_data = {
      transaction_id: helperService.isNotValid(
        transactionPayload?.transaction_id
      )
        ? ""
        : transactionPayload?.transaction_id,
      order_id: transactionPayload?.order_id,
      external_id: transactionPayload?.external_id,
      receiver_id: transactionPayload?.receiver_id,
      sub_merchant_id: helperService.isNotValid( transactionPayload?.sub_merchant_id
      )
        ? 0
        : transactionPayload?.sub_merchant_id,
      transaction_date: transactionPayload?.creation_date,
      account_id: transactionPayload?.account_id,
      account_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business"
          ? 2
          : 1,
      account_for: account_for,
      account_data: JSON.stringify(receiver_account_details),
      payer_id: transactionPayload?.payer_id,
      payer_name: transactionPayload?.payer_name,
      payer_currency: transactionPayload?.payer_currency,
      payer_data: JSON.stringify({
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "MTN-MOMO",
      }),
    };
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_data:",
      account_data
    );

    let account_result = await accountDetailsService.add(account_data);
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_result:",
      account_result
    );

    //=============================================================================================
    // call to node server to update charges
    const payload = {
      submerchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver_id)
        ? String(receiver_id)
        : null,
      currecny: currency,
      amount: String(amount),
      transaction_id: String(getTransactionStatus?.financialTransactionId),
      order_id: transactionPayload?.external_id,
      order_status: transactionPayload?.status_message,
    };
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    //=============================================================================================
    // Return Response

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

    const responsePayload = {
      order_id: order_id,
      external_id: transactionPayload?.external_id,
      transaction_id: getTransactionStatus?.financialTransactionId,
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver?.receiver_id)
        ? receiver?.receiver_id
        : null,
      currency: currency,
      wallet_id: wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "MTN-MOMO",
      },
      debit_details: {
        debit_amount: parseFloat(amount),
        currency: currency,
      },
      credit_details: {
        amount: parseFloat(amount),
        currency: currency,
      },
      payout_reference: helperService.isValid(payout_reference)
        ? payout_reference
        : null,
      webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
      purpose_of_remittance: helperService.isValid(purpose_of_remittance)
        ? purpose_of_remittance
        : null,
      document_reference_number: null,
      transaction_status: txnStatus,
      transaction_status_code:
        txnStatus == "SUCCESSFUL"
          ? 20000
          : txnStatus == "PENDING"
          ? 30000
          : 40000,
      order_created_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };

    // ==============================================================================
    // Send Webhook
    // await quotationService.send_webhook(responsePayload);

    // ==============================================================================
    // Send final response
    res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Transaction confirmed successfully",
      data: responsePayload,
    });
  } else if (receiver_account_details?.payer_id == "MTN") {
    console.log(`here is reciever id and body`);
    console.log(req.body, receiver_account_details);
    // fetch mid
    let payout_mid_details = MID?.data;
    // let payout_mid_details = await payout_mid.findOne({
    //   where: { sub_merchant_id: receiver?.sub_merchant_id },
    // });
    console.log(payout_mid_details);
    // Check payer currency and request payout currency
    if (receiver_account_details?.currency != currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          receiver_account_details?.currency,
      });
      return;
    }

    if (helperService.isNotValid(payout_mid_details?.primary_key)) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Invalid 'primary_key'",
      });
      return;
    }

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

    //call mtn service for token
    let token = await mtnMockService.getAccessToken(
      payout_mid_details?.primary_key,
      payout_mid_details?.api_key,
      payout_mid_details?.password
    );
    if (!token) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Invalid MID credentials",
      });
      return;
    }

    //=============================================================================================
    // make transfer payload

    let externalId = await helperService.make_unique_id();

    let data = {
      amount: amount,
      currency: currency,
      externalId: externalId,
      payee: {
        partyIdType: "MSISDN",
        partyId: receiver_account_details?.account_details?.MSISDN,
      },
      payerMessage: "Payout",
      payeeNote: `Payout to merchant of ${currency} ${amount}`,
    };

    let payoutReferenceId = await mtnMockService.initiateTransfer(
      token,
      data,
      payout_mid_details.primary_key
    );

    if (!payoutReferenceId) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Unable to initiate transfer",
      });
      return;
    }

    let getTransactionStatus = await mtnMockService.getTransferStatus(
      token,
      payoutReferenceId,
      payout_mid_details.primary_key
    );

    console.log("🚀 ~ payout ~ getTransactionStatus:", getTransactionStatus);

    let txnStatus = "PENDING";
    if (getTransactionStatus?.status === "SUCCESSFUL") {
      txnStatus = "COMPLETED";
    } else if (getTransactionStatus?.status === "FAILED") {
      txnStatus = "FAILED";
    }

    let transactionPayload = {
      transaction_id: payoutReferenceId,
      external_id: externalId,
      receiver_id: receiver_id,
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: receiver_account_details?.account_id,
      mid_id: MID?.data?.id,
      batch_id: "",
      super_merchant_id: "",
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      transaction_type: "B2B",
      wholesale_fx_rate: parseFloat(0),
      destination_amount: parseFloat(amount),
      destination_currency: currency,
      sent_amount: parseFloat(amount),
      sent_currency: currency,
      source_amount: parseFloat(amount),
      source_currency: currency,
      source_country_iso_code: receiver_account_details?.country,
      payer_country_iso_code: "LBR",
      fee_amount: parseFloat(0),
      fee_currency: "NA",
      creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      payer_id: receiver_account_details?.payer_id,
      payer_currency: currency,
      service_id: receiver_account_details?.funding_source_type,
      service_name: "Mobile Wallet",
      status_message: txnStatus,
      callback_url: payout_mid_details.callback,
      payer_name: "MSISDN",
      payout_reference: payout_reference,
    };

    console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
    await transaction.create(transactionPayload);

    //=============================================================================================
    // DB Save account and payers data

    let account_for = "";
    if (
      helperService.isNotValid(receiver_account_details?.sub_merchant_id) &&
      helperService.isValid(receiver_account_details?.receiver_id)
    ) {
      account_for = "payout";
    } else {
      account_for = "settlement";
    }

    let account_data = {
      transaction_id: transactionPayload?.transaction_id,
      order_id: transactionPayload?.order_id,
      external_id: transactionPayload?.external_id,
      receiver_id: transactionPayload?.receiver_id,
      sub_merchant_id: helperService.isNotValid(
        transactionPayload?.sub_merchant_id
      )
        ? 0
        : transactionPayload?.sub_merchant_id,
      transaction_date: transactionPayload?.creation_date,
      account_id: transactionPayload?.account_id,
      account_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business"
          ? 2
          : 1,
      account_for: account_for,
      account_data: JSON.stringify(receiver_account_details),
      payer_id: transactionPayload?.payer_id,
      payer_name: transactionPayload?.payer_name,
      payer_currency: transactionPayload?.payer_currency,
      payer_data: JSON.stringify({
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "MTN",
      }),
    };
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_data:",
      account_data
    );

    let account_result = await accountDetailsService.add(account_data);
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_result:",
      account_result
    );

    //=============================================================================================
    // call to node server to update charges
    const payload = {
      submerchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver_id)
        ? String(receiver_id)
        : null,
      currecny: currency,
      amount: String(amount),
      transaction_id: String(getTransactionStatus.financialTransactionId),
      order_id: transactionPayload?.external_id,
      order_status: transactionPayload?.status_message,
    };
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    //=============================================================================================
    // Return Response

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

    const responsePayload = {
      order_id: order_id,
      external_id: transactionPayload?.external_id,
      transaction_id: getTransactionStatus.financialTransactionId,
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver?.receiver_id)
        ? receiver?.receiver_id
        : null,
      currency: currency,
      wallet_id: wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "MTN",
      },
      debit_details: {
        debit_amount: parseFloat(amount),
        currency: currency,
      },
      credit_details: {
        amount: parseFloat(amount),
        currency: currency,
      },
      payout_reference: helperService.isValid(payout_reference)
        ? payout_reference
        : null,
      webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
      purpose_of_remittance: helperService.isValid(purpose_of_remittance)
        ? purpose_of_remittance
        : null,
      document_reference_number: null,
      transaction_status:
        getTransactionStatus?.status == "SUCCESSFUL" ? "COMPLETED" : "FAILED",
      transaction_status_code:
        getTransactionStatus?.status == "SUCCESSFUL" ? 20000 : 40000,
      order_created_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };

    // ==============================================================================
    // Send Webhook
    // await quotationService.send_webhook(responsePayload);

    // ==============================================================================
    // Send final response
    res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Transaction confirmed successfully",
      data: responsePayload,
    });
  } else if (receiver_account_details?.payer_id == "ORANGE_MONEY") {
    console.log(`here is reciever id and body in orange money`);
    console.log(req.body, receiver);
    // fetch mid
    let payout_mid_details = MID?.data;
    // let payout_mid_details = await payout_mid.findOne({
    //   where: { sub_merchant_id: receiver?.sub_merchant_id },
    // });
    console.log(payout_mid_details);
    // Check payer currency and request payout currency
    if (receiver_account_details?.currency != currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          receiver_account_details?.currency,
      });
      return;
    }
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
    let externalTransactionId = await helperService.make_unique_id();
    // make transfer payload
    let data = {
      auth: {
        user: payout_mid_details?.api_key,
        pwd: payout_mid_details?.password,
      },
      param: {
        msisdn: receiver_account_details?.account_details?.MSISDN,
        Amount: amount,
        Currency: currency,
        ExternalID: externalTransactionId,
      },
    };
    console.log("🚀 ~ data:", data)
    // initiate payout
    // let payoutReferenceId = await initiateOrangeMoneyTransfer(data);
    let payoutResponse = await initiateOrangeMoneyTransfer(data);
    console.log("🚀 ~ payoutResponse:", payoutResponse)

    let transactionStatus = "FAILED";
    let financialTransactionId = "";
    //send response if reference id is fals
    if (payoutResponse?.status != 200) {
      financialTransactionId = payoutResponse?.resultset?.TXNID;
    } else {
      //=============================================================================================
      //get transaction status
      let payoutReferenceId = payoutResponse?.resultset?.TXNID;
      let getTransactionStatus = await getOrangeMoneyTransferStatus(
        payoutReferenceId,
        payout_mid_details?.api_key,
        payout_mid_details?.password,
        currency
      );
      console.log("🚀 ~ getTransactionStatus:", getTransactionStatus);
      if (getTransactionStatus.resultset.TXNSTATUS == "TS") {
        transactionStatus = "COMPLETED";
      } else if (getTransactionStatus.resultset.TXNSTATUS == "TI") {
        transactionStatus = "PENDING";
      }
    }
  
    let transactionPayload = {
      transaction_id: financialTransactionId,
      external_id: externalTransactionId,
      receiver_id: receiver_id,
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: account_id,
      mid_id: MID?.data?.id,
      batch_id: "",
      super_merchant_id: "",
      sub_merchant_id: receiver?.sub_merchant_id,
      transaction_type: "B2B",
      wholesale_fx_rate: parseFloat(0),
      destination_amount: parseFloat(amount),
      destination_currency: currency,
      sent_amount: parseFloat(amount),
      sent_currency: currency,
      source_amount: parseFloat(amount),
      source_currency: currency,
      source_country_iso_code: receiver_account_details?.country,
      payer_country_iso_code: "LBR",
      fee_amount: parseFloat(0),
      fee_currency: "NA",
      creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      payer_id: receiver_account_details?.payer_id,
      payer_currency: currency,
      service_id: receiver_account_details?.funding_source_type,
      service_name: "Mobile Wallet",
      status_message: transactionStatus,
      callback_url: payout_mid_details.callback,
      payer_name: "MSISDN",
      payout_reference: payout_reference,
    };
    console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
    await transaction.create(transactionPayload);

    //=============================================================================================
    // DB Save account and payers data

    let account_for = "";
    if (
      helperService.isNotValid(receiver_account_details?.sub_merchant_id) &&
      helperService.isValid(receiver_account_details?.receiver_id)
    ) {
      account_for = "payout";
    } else {
      account_for = "settlement";
    }

    let account_data = {
      transaction_id: transactionPayload?.transaction_id,
      order_id: transactionPayload?.order_id,
      external_id: transactionPayload?.external_id,
      receiver_id: transactionPayload?.receiver_id,
      sub_merchant_id: helperService.isNotValid(
        transactionPayload?.sub_merchant_id
      )
        ? 0
        : transactionPayload?.sub_merchant_id,
      transaction_date: transactionPayload?.creation_date,
      account_id: transactionPayload?.account_id,
      account_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business"
          ? 2
          : 1,
      account_for: account_for,
      account_data: JSON.stringify(receiver_account_details),
      payer_id: transactionPayload?.payer_id,
      payer_name: transactionPayload?.payer_name,
      payer_currency: transactionPayload?.payer_currency,
      payer_data: JSON.stringify({
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "ORANGE-MONEY",
      }),
    };
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_data:",
      account_data
    );

    let account_result = await accountDetailsService.add(account_data);
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_result:",
      account_result
    );

    //=============================================================================================
    // call to node server to update charges
    const payload = {
      submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
        ? null
        : receiver?.sub_merchant_id,
      receiver_id: helperService.isNotValid(receiver_id)
        ? null
        : String(receiver_id),
      currecny: currency,
      amount: String(amount),
      transaction_id: String(financialTransactionId),
      order_id: externalTransactionId,
      order_status: transactionStatus,
    };
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    //=============================================================================================
    // Resturn Response

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

    const responsePayload = {
      order_id: order_id,
      external_id: transactionPayload?.external_id,
      transaction_id: financialTransactionId,
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver?.receiver_id)
        ? receiver?.receiver_id
        : null,
      currency: currency,
      wallet_id: wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "ORANGE-MONEY",
      },
      debit_details: {
        debit_amount: parseFloat(amount),
        currency: currency,
      },
      credit_details: {
        amount: parseFloat(amount),
        currency: currency,
      },
      payout_reference: helperService.isValid(payout_reference)
        ? payout_reference
        : null,
      webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
      purpose_of_remittance: helperService.isValid(purpose_of_remittance)
        ? purpose_of_remittance
        : null,
      document_reference_number: null,
      transaction_status: transactionStatus,
      transaction_status_code:
        transactionStatus == "SUCCESSFUL"
          ? 20000
          : transactionStatus == "PENDING"
          ? 30000
          : 40000,
      order_created_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };

    // ==============================================================================
    // Send Webhook
    // await quotationService.send_webhook(responsePayload);

    // ==============================================================================
    // Send final response
    res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Transaction confirmed successfully",
      data: responsePayload,
    });
  } else if (receiver_account_details?.payer_id == "ORANGE") {
    console.log(`here is reciever id and body in orange money`);
    console.log(req.body, receiver);
    // fetch mid
    let payout_mid_details = MID?.data;
    // let payout_mid_details = await payout_mid.findOne({
    //   where: { sub_merchant_id: receiver?.sub_merchant_id },
    // });
    console.log(payout_mid_details);
    // Check payer currency and request payout currency
    if (receiver_account_details?.currency != currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          receiver_account_details?.currency,
      });
      return;
    }
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
    let externalTransactionId = await helperService.make_unique_id();
    // make transfer payload
    let data = {
      auth: {
        user: payout_mid_details?.api_key,
        pwd: payout_mid_details?.password,
      },
      param: {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        Amount: amount,
        Currency: currency,
        EXTERNALID: externalTransactionId,
      },
    };
    // initiate payout
    let payoutReferenceId = await orangeMockService.initiateOrangeMoneyTransfer(
      data
    );
    //send response if reference id is fals
    if (!payoutReferenceId) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Unable to initiate transfer",
      });
      return;
    }

    //=============================================================================================
    //get transaction status
    let getTransactionStatus =
      await orangeMockService.getOrangeMoneyTransferStatus(
        payoutReferenceId,
        payout_mid_details?.api_key,
        payout_mid_details?.password,
        currency
      );
    console.log("🚀 ~ getTransactionStatus:", getTransactionStatus);
    let transactionStatus = "FAILED";
    if (getTransactionStatus.resultset.TXNSTATUS == "TS") {
      transactionStatus = "COMPLETED";
    }
    if (getTransactionStatus.resultset.TXNSTATUS == "TI") {
      transactionStatus = "PENDING";
    }
    let transactionPayload = {
      transaction_id: helperService.isNotValid(payoutReferenceId)
        ? ""
        : payoutReferenceId,
      external_id: externalTransactionId,
      receiver_id: receiver_id,
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: account_id,
      mid_id: MID?.data?.id,
      batch_id: "",
      super_merchant_id: "",
      sub_merchant_id: receiver?.sub_merchant_id,
      transaction_type: "B2B",
      wholesale_fx_rate: parseFloat(0),
      destination_amount: parseFloat(amount),
      destination_currency: currency,
      sent_amount: parseFloat(amount),
      sent_currency: currency,
      source_amount: parseFloat(amount),
      source_currency: currency,
      source_country_iso_code: receiver_account_details?.country,
      payer_country_iso_code: "LBR",
      fee_amount: parseFloat(0),
      fee_currency: "NA",
      creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      payer_id: receiver_account_details?.payer_id,
      payer_currency: currency,
      service_id: receiver_account_details?.funding_source_type,
      service_name: "Mobile Wallet",
      status_message: transactionStatus,
      callback_url: payout_mid_details.callback,
      payer_name: "MSISDN",
      payout_reference: payout_reference,
    };
    console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
    await transaction.create(transactionPayload);

    //=============================================================================================
    // DB Save account and payers data

    let account_for = "";
    if (
      helperService.isNotValid(receiver_account_details?.sub_merchant_id) &&
      helperService.isValid(receiver_account_details?.receiver_id)
    ) {
      account_for = "payout";
    } else {
      account_for = "settlement";
    }

    let account_data = {
      transaction_id: transactionPayload?.transaction_id,
      order_id: transactionPayload?.order_id,
      external_id: transactionPayload?.external_id,
      receiver_id: transactionPayload?.receiver_id,
      sub_merchant_id: helperService.isNotValid(
        transactionPayload?.sub_merchant_id
      )
        ? 0
        : transactionPayload?.sub_merchant_id,
      transaction_date: transactionPayload?.creation_date,
      account_id: transactionPayload?.account_id,
      account_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business"
          ? 2
          : 1,
      account_for: account_for,
      account_data: JSON.stringify(receiver_account_details),
      payer_id: transactionPayload?.payer_id,
      payer_name: transactionPayload?.payer_name,
      payer_currency: transactionPayload?.payer_currency,
      payer_data: JSON.stringify({
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "ORANGE",
      }),
    };
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_data:",
      account_data
    );

    let account_result = await accountDetailsService.add(account_data);
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_result:",
      account_result
    );

    //=============================================================================================
    // call to node server to update charges
    const payload = {
      submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
        ? null
        : receiver?.sub_merchant_id,
      receiver_id: helperService.isNotValid(receiver_id)
        ? null
        : String(receiver_id),
      currecny: currency,
      amount: String(amount),
      transaction_id: String(payoutReferenceId),
      order_id: externalTransactionId,
      order_status: transactionStatus,
    };
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    //=============================================================================================
    // Resturn Response

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

    const responsePayload = {
      order_id: order_id,
      external_id: transactionPayload?.external_id,
      transaction_id: getTransactionStatus.financialTransactionId,
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver?.receiver_id)
        ? receiver?.receiver_id
        : null,
      currency: currency,
      wallet_id: wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: {
        MSISDN: receiver_account_details?.account_details?.MSISDN,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "ORANGE",
      },
      debit_details: {
        debit_amount: parseFloat(amount),
        currency: currency,
      },
      credit_details: {
        amount: parseFloat(amount),
        currency: currency,
      },
      payout_reference: helperService.isValid(payout_reference)
        ? payout_reference
        : null,
      webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
      purpose_of_remittance: helperService.isValid(purpose_of_remittance)
        ? purpose_of_remittance
        : null,
      document_reference_number: null,
      transaction_status: transactionStatus,
      transaction_status_code:
        transactionStatus == "SUCCESSFUL"
          ? 20000
          : transactionStatus == "PENDING"
          ? 30000
          : 40000,
      order_created_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };

    // ==============================================================================
    // Send Webhook
    // await quotationService.send_webhook(responsePayload);

    // ==============================================================================
    // Send final response
    res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Transaction confirmed successfully",
      data: responsePayload,
    });
  } else if (receiver_account_details?.payer_id.includes('AP_')) {
    console.log(`initiateInternationalTransfer...`, receiver_account_details);
    console.log(`here is reciever id and body in AlPay`);
    console.log(req.body, receiver);
    // fetch mid
    let payout_mid_details = MID?.data;
    // let payout_mid_details = await payout_mid.findOne({
    //   where: { sub_merchant_id: receiver?.sub_merchant_id },
    // });
    console.log(payout_mid_details);
    // Check payer currency and request payout currency
    if (receiver_account_details?.currency != currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          receiver_account_details?.currency,
      });
      return;
    }
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
    };
    // get access token
    let token = await alPayService.getAccessToken(getAccessTokenPayload);
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
      accountNumber: receiver_account_details?.account_details?.accountNumber,
      channel:
        receiver_account_details?.funding_source_type == 1
          ? "MNO"
          : "INTERBANK",
      institutionCode:
        receiver_account_details?.account_details?.institutionCode,
      transactionId: externalTransactionId,
    };
    console.log("🚀 ~ nameEnquiryServicePayload:", nameEnquiryServicePayload);
    let nameEnquiryServiceResponse = await alPayService.nameEnquiryService(
      token,
      nameEnquiryServicePayload
    );
    console.log("🚀 ~ nameEnquiryServiceResponse:", nameEnquiryServiceResponse);
    if (nameEnquiryServiceResponse?.status != 200) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          nameEnquiryServiceResponse?.message || "Unable to initiate transfer",
      });
      return;
    }

    // Initiate Transfer
    externalTransactionId = await helperService.make_unique_id();
    const payoutReferenceId = uuidv4(); // Generate UUID
    console.log("Transfer initiated, Reference ID:", payoutReferenceId);
    let initiateTransferResponse = null;
    if (receiver_account_details?.currency === "GHS") {
      // make transfer payload
      let data = {
        accountName: receiver_account_details?.account_details?.accountName,
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        amount: amount,
        channel: "MNO",
        institutionCode:
          receiver_account_details?.account_details?.institutionCode,
        transactionId: externalTransactionId,
        CreditNaration: payout_reference || "Payout transaction",
        currency: currency,
      };
      console.log("🚀 ~ initiateLocalTransfer data:", data);

      // initiate payout
      initiateTransferResponse = await alPayService.initiateLocalTransfer(
        token,
        data
      );
      console.log("🚀 ~ initiateTransferResponse:", initiateTransferResponse);
    } else {
      // make transfer payload
      let data = {
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        amount: amount,
        channel: "INTERBANK",
        transactionId: externalTransactionId,
        creditNarration: payout_reference,
        currency: currency,
        currencyAmount: amount,
        originCountryCode: "GH",
        senderName: company_details?.data?.company_name,
      };
      console.log("🚀 ~ initiateInternationalTransfer data:", data);

      // initiate payout
      initiateTransferResponse =
        await alPayService.initiateInternationalTransfer(token, data);
      console.log("🚀 ~ initiateTransferResponse:", initiateTransferResponse);
    }

    //send response if reference id is fals
    if (initiateTransferResponse?.status != 200) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          initiateTransferResponse?.message || "Unable to initiate transfer",
      });
      return;
    }

    //=============================================================================================
    //get transaction status
    let transactionStatusResponse = await alPayService.getTransferStatus(
      token,
      initiateTransferResponse?.data?.transactionId,
      "CREDIT"
    );
    console.log("🚀 ~ transactionStatusResponse:", transactionStatusResponse);
    if (transactionStatusResponse?.status != 200) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          transactionStatusResponse?.message ||
          "Unable to get a transaction status",
      });
      return;
    }

    let transactionStatus = "PENDING";
    if (transactionStatusResponse?.message === "SUCCESSFUL") {
      transactionStatus = "COMPLETED";
    } else if (transactionStatusResponse?.message === "FAILED") {
      transactionStatus = "FAILED";
    }
    let transactionPayload = {
      transaction_id: helperService.isNotValid(
        transactionStatusResponse?.data?.transactionId
      )
        ? ""
        : transactionStatusResponse?.data?.transactionId,
      external_id: externalTransactionId,
      receiver_id: receiver_id,
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: account_id,
      mid_id: MID?.data?.id,
      batch_id: "",
      super_merchant_id: "",
      sub_merchant_id: receiver?.sub_merchant_id,
      transaction_type: "B2B",
      wholesale_fx_rate: parseFloat(0),
      destination_amount: parseFloat(amount),
      destination_currency: currency,
      sent_amount: parseFloat(amount),
      sent_currency: currency,
      source_amount: parseFloat(amount),
      source_currency: currency,
      source_country_iso_code: receiver_account_details?.country,
      payer_country_iso_code: "GHA",
      fee_amount: parseFloat(0),
      fee_currency: "NA",
      creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      payer_id: receiver_account_details?.payer_id,
      payer_currency: currency,
      service_id: receiver_account_details?.funding_source_type,
      service_name: "Mobile Wallet",
      status_message: transactionStatus,
      callback_url: payout_mid_details.callback,
      payer_name: transactionStatusResponse?.data?.accountName,
      payout_reference: payout_reference,
    };
    console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
    await transaction.create(transactionPayload);

    //=============================================================================================
    // DB Save account and payers data

    let account_for = "";
    if (
      helperService.isNotValid(receiver_account_details?.sub_merchant_id) &&
      helperService.isValid(receiver_account_details?.receiver_id)
    ) {
      account_for = "payout";
    } else {
      account_for = "settlement";
    }

    let account_data = {
      transaction_id: transactionPayload?.transaction_id,
      order_id: transactionPayload?.order_id,
      external_id: transactionPayload?.external_id,
      receiver_id: transactionPayload?.receiver_id,
      sub_merchant_id: helperService.isNotValid(
        transactionPayload?.sub_merchant_id
      )
        ? 0
        : transactionPayload?.sub_merchant_id,
      transaction_date: transactionPayload?.creation_date,
      account_id: transactionPayload?.account_id,
      account_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business"
          ? 2
          : 1,
      account_for: account_for,
      account_data: JSON.stringify(receiver_account_details),
      payer_id: transactionPayload?.payer_id,
      payer_name: transactionPayload?.payer_name,
      payer_currency: transactionPayload?.payer_currency,
      payer_data: JSON.stringify({
        accountName: receiver_account_details?.account_details?.accountName,
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "AL PAY",
      }),
    };
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_data:",
      account_data
    );

    let account_result = await accountDetailsService.add(account_data);
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_result:",
      account_result
    );

    //=============================================================================================
    // call to node server to update charges
    const payload = {
      submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
        ? null
        : receiver?.sub_merchant_id,
      receiver_id: helperService.isNotValid(receiver_id)
        ? null
        : String(receiver_id),
      currecny: currency,
      amount: String(amount),
      transaction_id: String(transactionPayload?.transaction_id),
      order_id: externalTransactionId,
      order_status: transactionStatus,
    };
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    //=============================================================================================
    // Resturn Response

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

    const responsePayload = {
      order_id: order_id,
      external_id: transactionPayload?.external_id,
      transaction_id: transactionStatusResponse?.data?.transactionId,
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver?.receiver_id)
        ? receiver?.receiver_id
        : null,
      currency: currency,
      wallet_id: wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: {
        accountName: receiver_account_details?.account_details?.accountName,
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "AlPay",
      },
      debit_details: {
        debit_amount: parseFloat(amount),
        currency: currency,
      },
      credit_details: {
        amount: parseFloat(amount),
        currency: currency,
      },
      payout_reference: helperService.isValid(payout_reference)
        ? payout_reference
        : null,
      webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
      purpose_of_remittance: helperService.isValid(purpose_of_remittance)
        ? purpose_of_remittance
        : null,
      document_reference_number: null,
      transaction_status: transactionStatus,
      transaction_status_code:
        transactionStatus == "SUCCESSFUL"
          ? 20000
          : transactionStatus == "PENDING"
          ? 30000
          : 40000,
      order_created_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };

    // ==============================================================================
    // Send Webhook
    // await quotationService.send_webhook(responsePayload);

    // ==============================================================================
    // Send final response
    res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Transaction confirmed successfully",
      data: responsePayload,
    });
  } else if (receiver_account_details?.payer_id == "AL") {
    console.log(`initiateInternationalTransfer...`, receiver_account_details);
    console.log(`here is reciever id and body in AlPay`);
    console.log(req.body, receiver);
    // fetch mid
    let payout_mid_details = MID?.data;
    // let payout_mid_details = await payout_mid.findOne({
    //   where: { sub_merchant_id: receiver?.sub_merchant_id },
    // });
    console.log(payout_mid_details);
    // Check payer currency and request payout currency
    if (receiver_account_details?.currency != currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          receiver_account_details?.currency,
      });
      return;
    }
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
    };
    // get access token
    let token = await alMockService.getAccessToken(getAccessTokenPayload);
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
      accountNumber: receiver_account_details?.account_details?.accountNumber,
      channel:
        receiver_account_details?.funding_source_type == 1
          ? "MNO"
          : "INTERBANK",
      institutionCode:
        receiver_account_details?.account_details?.institutionCode,
      transactionId: externalTransactionId,
    };
    console.log("🚀 ~ nameEnquiryServicePayload:", nameEnquiryServicePayload);
    let nameEnquiryServiceResponse = await alMockService.nameEnquiryService(
      token,
      nameEnquiryServicePayload
    );
    console.log("🚀 ~ nameEnquiryServiceResponse:", nameEnquiryServiceResponse);
    if (nameEnquiryServiceResponse?.status != 200) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          nameEnquiryServiceResponse?.message || "Unable to initiate transfer",
      });
      return;
    }

    // Initiate Transfer
    externalTransactionId = await helperService.make_unique_id();
    const payoutReferenceId = uuidv4(); // Generate UUID
    console.log("Transfer initiated, Reference ID:", payoutReferenceId);
    let initiateTransferResponse = null;
    if (receiver_account_details?.currency === "GHS") {
      // make transfer payload
      let data = {
        accountName: nameEnquiryServiceResponse?.data?.accountName,
        accountNumber: nameEnquiryServiceResponse?.data?.accountNumber,
        amount: amount,
        channel: "MNO",
        institutionCode:
          receiver_account_details?.account_details?.institutionCode,
        transactionId: externalTransactionId,
        CreditNaration: payout_reference || "Payout transaction",
        currency: currency,
      };
      console.log("🚀 ~ initiateLocalTransfer data:", data);

      // initiate payout
      initiateTransferResponse = await alMockService.initiateLocalTransfer(
        token,
        data
      );
      console.log("🚀 ~ initiateTransferResponse:", initiateTransferResponse);
    } else {
      // make transfer payload
      let data = {
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        amount: amount,
        channel: "INTERBANK",
        transactionId: externalTransactionId,
        creditNarration: payout_reference,
        currency: currency,
        currencyAmount: amount,
        originCountryCode: "GH",
        senderName: company_details?.data?.company_name,
      };
      console.log("🚀 ~ initiateInternationalTransfer data:", data);

      // initiate payout
      initiateTransferResponse =
        await alMockService.initiateInternationalTransfer(token, data);
      console.log("🚀 ~ initiateTransferResponse:", initiateTransferResponse);
    }

    //send response if reference id is fals
    if (initiateTransferResponse?.status != 200) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          initiateTransferResponse?.message || "Unable to initiate transfer",
      });
      return;
    }

    //=============================================================================================
    //get transaction status
    let transactionStatusResponse = await alMockService.getTransferStatus(
      token,
      initiateTransferResponse?.data?.transactionId,
      "CREDIT"
    );
    console.log("🚀 ~ transactionStatusResponse:", transactionStatusResponse);
    if (transactionStatusResponse?.status != 200) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          transactionStatusResponse?.message ||
          "Unable to get a transaction status",
      });
      return;
    }

    let transactionStatus = "PENDING";
    if (transactionStatusResponse?.message === "SUCCESSFUL") {
      transactionStatus = "COMPLETED";
    } else if (transactionStatusResponse?.message === "FAILED") {
      transactionStatus = "FAILED";
    }

    let transaction_id = helperService.isNotValid(transactionStatusResponse?.data?.transactionId) ? "" : transactionStatusResponse?.data?.transactionId;
    let transactionPayload = {
      transaction_id: transaction_id,
      external_id: externalTransactionId,
      receiver_id: receiver_id,
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: account_id,
      mid_id: MID?.data?.id,
      batch_id: "",
      super_merchant_id: "",
      sub_merchant_id: receiver?.sub_merchant_id,
      transaction_type: "B2B",
      wholesale_fx_rate: parseFloat(0),
      destination_amount: parseFloat(amount),
      destination_currency: currency,
      sent_amount: parseFloat(amount),
      sent_currency: currency,
      source_amount: parseFloat(amount),
      source_currency: currency,
      source_country_iso_code: receiver_account_details?.country,
      payer_country_iso_code: "GHA",
      fee_amount: parseFloat(0),
      fee_currency: "NA",
      creation_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      expiration_date: moment().format("YYYY-MM-DD hh:mm:ss"),
      payer_id: receiver_account_details?.payer_id,
      payer_currency: currency,
      service_id: receiver_account_details?.funding_source_type,
      service_name: "Mobile Wallet",
      status_message: transactionStatus,
      callback_url: payout_mid_details.callback,
      payer_name: transactionStatusResponse?.data?.accountName,
      payout_reference: payout_reference,
    };
    console.log("🚀 ~ payout ~ transactionPayload:", transactionPayload);
    await transaction.create(transactionPayload);

    //=============================================================================================
    // DB Save account and payers data

    let account_for = "";
    if (
      helperService.isNotValid(receiver_account_details?.sub_merchant_id) &&
      helperService.isValid(receiver_account_details?.receiver_id)
    ) {
      account_for = "payout";
    } else {
      account_for = "settlement";
    }

    let account_data = {
      transaction_id: transaction_id,
      order_id: transactionPayload?.order_id,
      external_id: transactionPayload?.external_id,
      receiver_id: transactionPayload?.receiver_id,
      sub_merchant_id: helperService.isNotValid(
        transactionPayload?.sub_merchant_id
      )
        ? 0
        : transactionPayload?.sub_merchant_id,
      transaction_date: transactionPayload?.creation_date,
      account_id: transactionPayload?.account_id,
      account_type:
        receiver_account_details?.customer_type?.toLowerCase() === "business"
          ? 2
          : 1,
      account_for: account_for,
      account_data: JSON.stringify(receiver_account_details),
      payer_id: transactionPayload?.payer_id,
      payer_name: transactionPayload?.payer_name,
      payer_currency: transactionPayload?.payer_currency,
      payer_data: JSON.stringify({
        accountName: receiver_account_details?.account_details?.accountName,
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "AL",
      }),
    };
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_data:",
      account_data
    );

    let account_result = await accountDetailsService.add(account_data);
    console.log(
      "🚀 ~ create_transaction_API_Call ~ account_result:",
      account_result
    );

    //=============================================================================================
    // call to node server to update charges
    const payload = {
      submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
        ? null
        : receiver?.sub_merchant_id,
      receiver_id: helperService.isNotValid(receiver_id)
        ? null
        : String(receiver_id),
      currecny: currency,
      amount: String(amount),
      transaction_id: String(transaction_id),
      order_id: externalTransactionId,
      order_status: transactionStatus,
    };
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    //=============================================================================================
    // Resturn Response

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

    const responsePayload = {
      order_id: order_id,
      external_id: transactionPayload?.external_id,
      transaction_id: transactionStatusResponse?.data?.transactionId,
      sub_merchant_id: helperService.isValid(receiver?.sub_merchant_id)
        ? receiver?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(receiver?.receiver_id)
        ? receiver?.receiver_id
        : null,
      currency: currency,
      wallet_id: wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: {
        accountName: receiver_account_details?.account_details?.accountName,
        accountNumber: receiver_account_details?.account_details?.accountNumber,
        payer_id: receiver_account_details?.payer_id,
        payer_name: "AlPay",
      },
      debit_details: {
        debit_amount: parseFloat(amount),
        currency: currency,
      },
      credit_details: {
        amount: parseFloat(amount),
        currency: currency,
      },
      payout_reference: helperService.isValid(payout_reference)
        ? payout_reference
        : null,
      webhook_url: helperService.isValid(webhook_url) ? webhook_url : null,
      purpose_of_remittance: helperService.isValid(purpose_of_remittance)
        ? purpose_of_remittance
        : null,
      document_reference_number: null,
      transaction_status: transactionStatus,
      transaction_status_code:
        transactionStatus == "SUCCESSFUL"
          ? 20000
          : transactionStatus == "PENDING"
          ? 10000
          : 40000,
      order_created_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transactionPayload?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };

    // ==============================================================================
    // Send Webhook
    // await quotationService.send_webhook(responsePayload);

    // ==============================================================================
    // Send final response
    res.status(httpStatus.OK).send({
      status: httpStatus.OK,
      message: "Transaction confirmed successfully",
      data: responsePayload,
    });
  } else {
    // Get payer details by id
    const payerResponse = await payerService.getById(
      receiver_account_details?.payer_id,
      MID?.data
    );
    if (payerResponse?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(payerResponse);
      return;
    }
    // Check payer currency and request payout currency
    if (payerResponse?.data?.currency !== currency) {
      res.status(httpStatus.OK).send({
        status: 400,
        message:
          "Invalid currency selected! The receiver only accepts payouts in " +
          payerResponse?.data?.currency,
      });
      return;
    }

    // Add Payer Name with account details
    receiver_account_details.payer_name = payerResponse?.data?.name;

    // ==============================================================================
    // Check valid bank details

    let receiver_details = {
      data: receiver_account_details,
      purpose_of_remittance: purpose_of_remittance,
    };

    let isValidBankDetails = await receiverService.check_valid_bank_details(
      receiver_details,
      MID?.data
    );
    console.log("🚀 ~ isValidBankDetails:", isValidBankDetails);

    if (isValidBankDetails?.status !== httpStatus.OK) {
      console.log("🚀 ~ payout ~ isValidBankDetails:", isValidBankDetails);
      res.status(httpStatus.OK).send(isValidBankDetails);
      return;
    }

    // check payer id
    // 1. Create quotation payload
    var quotationPayload = {
      receiver_id: receiver_id,
      account_details: receiver_account_details,
      destination_amount: amount,
      destination_currency: currency,
      debit_amount: debit_amount,
      debit_currency: debit_currency,
      extra: {
        receiver: receiver,
        payer: payerResponse?.data,
        MID: MID?.data,
      },
    };

    //1. Create quotation
    const quotation = await quotationService.create_quotations(
      quotationPayload
    );
    if (quotation?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(quotation);
      return;
    }

    // Adding request parameters for DB
    quotation.data.request = {
      order_id: order_id,
      wallet_id: wallet_id,
      account_id: helperService.isNotValid(account_id)
        ? receiver_account_details?.account_id
        : account_id,
      purpose_of_remittance: purpose_of_remittance,
      payout_reference: payout_reference,
      webhook_url: webhook_url,
    };

    // 2. Create transaction payload
    const createTransactionResponse = await quotationService.post_transaction(
      quotation?.data,
      payerResponse?.data,
      receiver,
      receiver_account_details,
      "",
      MID?.data
    );

    if (createTransactionResponse?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(createTransactionResponse);
      return;
    }

    //If confirmation is not required then break the flow and return the transactions response
    if (!confirmation_required) {
      // Send Success Response
      res.status(httpStatus.OK).send(createTransactionResponse);
      return;
    }

    console.log(
      "🚀 ~ payout ~ createTransactionResponse:",
      createTransactionResponse
    );

    // 3. Confirm transaction payload
    const confirmTransactionResponse =
      await quotationService.confirm_transaction(
        createTransactionResponse?.data?.transaction_id,
        null,
        MID?.data,
        quotation?.data?.request,
        receiver_account_details
      );

    if (confirmTransactionResponse?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(confirmTransactionResponse);
      return;
    }

    // 4. Update status
    let confirmResponse = confirmTransactionResponse?.data;
    const payload = {
      submerchant_id: helperService.isNotValid(receiver?.sub_merchant_id)
        ? null
        : receiver?.sub_merchant_id,
      receiver_id: helperService.isNotValid(receiver_id)
        ? null
        : String(receiver_id),
      currecny: confirmResponse?.credit_details?.currency,
      amount: String(confirmResponse?.credit_details?.amount),
      transaction_id: String(confirmResponse?.transaction_id),
      order_id: confirmResponse?.external_id,
      order_status: "PENDING",
    };

    console.log("🚀 ~ payout ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    res.status(httpStatus.OK).send(confirmTransactionResponse);
  }

  // Send Final Success Response
});

/**
 * Manage Payout Transaction
 */
const manage_payout = catchAsync(async (req, res) => {
  const { action, transaction_id } = req.body;
  if (action === "confirm") {
    // ==============================================================================
    // Get Last Transaction By ID
    const stored_transaction = await transactionService.getById(transaction_id);
    console.log("🚀 ~ stored_transaction:", stored_transaction);
    if (stored_transaction.status !== httpStatus.OK) {
      return stored_transaction;
    }

    // ==============================================================================
    // Get Funding Details

    const get_funding_details_payload = {};
    if (stored_transaction?.data?.account_id) {
      get_funding_details_payload.account_id =
        stored_transaction?.data?.account_id;
    } else if (
      stored_transaction?.data?.sub_merchant_id &&
      stored_transaction?.data?.payer_currency
    ) {
      get_funding_details_payload.submerchant_id = String(
        stored_transaction?.data?.sub_merchant_id
      );
      get_funding_details_payload.currency =
        stored_transaction?.data?.payer_currency;
    } else if (
      stored_transaction?.data?.receiver_id &&
      stored_transaction?.data?.payer_currency
    ) {
      get_funding_details_payload.receiver_id = String(
        stored_transaction?.data?.receiver_id
      );
      get_funding_details_payload.currency =
        stored_transaction?.data?.payer_currency;
    }
    console.log(
      "🚀 ~ get_funding_details_payload:",
      get_funding_details_payload
    );

    var receiver_account_details =
      await nodeServerAPIService.get_funding_details(
        get_funding_details_payload
      );
    console.log("🚀 ~ account_details:", receiver_account_details);
    if (receiver_account_details?.status != httpStatus.OK) {
      res.status(httpStatus.OK).send(receiver_account_details);
      return;
    }

    if (receiver_account_details?.data?.is_verified != 1) {
      res.status(httpStatus.OK).send({
        status: 400,
        message: "Account is not verified!",
      });
      return;
    }

    receiver_account_details = receiver_account_details?.data;
    // Added payer name with account details
    receiver_account_details.payer_name = stored_transaction?.data?.payer_name;

    // ==============================================================================
    // Get Transaction MID
    const MID = await pspService.get_mid_by_id(
      stored_transaction?.data?.mid_id
    );

    if (MID?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(MID);
      return;
    }

    let quotation_data_request = {
      order_id: stored_transaction?.data?.order_id,
      wallet_id: stored_transaction?.data?.wallet_id,
      account_id: helperService.isNotValid(stored_transaction?.data?.account_id)
        ? receiver_account_details?.account_id
        : stored_transaction?.data?.account_id,
      purpose_of_remittance: stored_transaction?.data?.purpose_of_remittance,
      payout_reference: stored_transaction?.data?.payout_reference,
      webhook_url: stored_transaction?.data?.callback_url,
    };
    console.log("🚀 ~ quotation_data_request:", quotation_data_request);

    const confirmTransactionResponse =
      await quotationService.confirm_transaction(
        transaction_id,
        null,
        MID?.data,
        quotation_data_request,
        receiver_account_details
      );
    if (confirmTransactionResponse.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(confirmTransactionResponse);
      return;
    }

    //Update status
    let confirmResponse = confirmTransactionResponse?.data;
    const payload = {
      submerchant_id: helperService.isNotValid(confirmResponse?.sub_merchant_id)
        ? null
        : confirmResponse?.sub_merchant_id,
      receiver_id: helperService.isNotValid(confirmResponse?.receiver_id)
        ? null
        : String(confirmResponse?.receiver_id),
      currecny: confirmResponse?.destination?.currency,
      amount: String(confirmResponse?.destination?.amount),
      transaction_id: String(confirmResponse?.transaction_id),
      order_id: confirmResponse?.external_id,
      order_status: "PENDING",
    };

    console.log("🚀 ~ payout ~ payload:", payload);
    var result = await nodeServerAPIService.update_payout_status(req, payload);
    console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

    // Send Success Response
    res.status(httpStatus.OK).send(confirmTransactionResponse);
  } else if (action === "cancel") {
    // Get Last Transaction By ID
    const stored_transaction = await transactionService.getById(transaction_id);
    if (stored_transaction.status !== httpStatus.OK) {
      return stored_transaction;
    }

    // Get Transaction MID
    const MID = await pspService.get_mid_by_id(
      stored_transaction?.data?.mid_id
    );
    if (MID?.status !== httpStatus.OK) {
      return MID;
    }

    const transactionResponse = await quotationService.transaction_cancel(
      transaction_id,
      MID?.data
    );

    // Check transaction
    if (transactionResponse?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(transactionResponse);
      return;
    }

    // Send Success Response
    res.status(httpStatus.OK).send(transactionResponse);
  } else {
    // Send Error Response
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Invalid value entered in action field",
    });
  }
});

/**
 * Create Quotation
 */
const create_quotations = catchAsync(async (req, res) => {
  const {
    receiver_id,
    payer_id,
    source_amount,
    source_currency,
    source_country_iso_code,
  } = req.body;

  let destination_currency = "AED";
  let mode = "SOURCE_AMOUNT";
  if (source_currency === "USD") {
    mode = "SOURCE_AMOUNT";
  } else if (destination_currency === "AED") {
    mode = "DESTINATION_AMOUNT";
  }

  // Create quotation payload
  var quotationPayload = {
    payer_id: payer_id,
    receiver_id: receiver_id,
    mode: mode,
    source_amount: mode == "SOURCE_AMOUNT" ? source_amount : null,
    source_currency: source_currency,
    source_country_iso_code: source_country_iso_code,
    destination_amount: mode == "DESTINATION_AMOUNT" ? source_amount : null,
    destination_currency: destination_currency,
  };
  const quotation = await quotationService.create_quotations(quotationPayload);
  if (quotation?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(quotation);
    return;
  }
  res.status(httpStatus.OK).send(quotation);
});

/**
 * Create Transaction
 */
const create_transaction = catchAsync(async (req, res) => {
  const { quotation_id } = req.body;

  var quotation = await quotationDbService.getQuotationById(quotation_id);
  // Check quotation created
  if (helperService.isNotValid(quotation)) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Quotation not found!",
    });
    return;
  }

  // Get Receiver Details
  let receiver = await receiverService.get_receiver_by_id(
    quotation?.receiver_id
  );

  // Check receiver created
  if (helperService.isNotValid(receiver)) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Receiver not found!",
    });
    return;
  }
  if (receiver?.verification !== "verified") {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Receiver is not verified!",
    });
    return;
  }
  if (receiver?.active !== 1) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "Receiver is not active!",
    });
    return;
  }

  // ==============================================================================
  // MID Routing

  let MID = await quotationService.payout_psp_routing(receiver);
  console.log("🚀 ~ payout ~ MID:", MID);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send({
      status: 400,
      message: "MID is not found!",
    });
    return;
  }

  // ==============================================================================

  // Get payer details by id
  const payerResponse = await payerService.getById(
    receiver?.payer_id,
    MID?.data
  );
  if (payerResponse?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payerResponse);
    return;
  }

  // Check payer currency and request payout currency
  if (payerResponse?.data?.currency !== quotation?.destination_currency) {
    res.status(httpStatus.OK).send({
      status: 400,
      message:
        "Invalid currency selected! The receiver only accepts payouts in " +
        payerResponse?.data?.currency,
    });
    return;
  }

  const createTransactionResponse = await quotationService.post_transaction(
    quotation,
    payerResponse?.data,
    receiver,
    "", // TODO: receiver_account_details
    "",
    MID?.data
  );

  if (createTransactionResponse.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(createTransactionResponse);
    return;
  }

  // Send Success Response
  res.status(httpStatus.OK).send(createTransactionResponse);
});

/**
 * Confirm Transaction
 */
const confirm_transaction = catchAsync(async (req, res) => {
  const { transaction_id } = req.body;

  // Get Last Transaction By ID
  const stored_transaction = await transactionService.getById(transaction_id);
  if (stored_transaction.status !== httpStatus.OK) {
    return stored_transaction;
  }

  // Get Transaction MID
  const MID = await pspService.get_mid_by_id(stored_transaction?.data?.mid_id);
  if (MID?.status !== httpStatus.OK) {
    return MID;
  }

  const confirmTransactionResponse = await quotationService.confirm_transaction(
    transaction_id,
    null,
    MID?.data
  );
  if (confirmTransactionResponse.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(confirmTransactionResponse);
    return;
  }

  // 4. Update status
  let confirmResponse = confirmTransactionResponse?.data;
  const payload = {
    submerchant_id: helperService.isNotValid(confirmResponse?.sub_merchant_id)
      ? null
      : confirmResponse?.sub_merchant_id,
    receiver_id: helperService.isNotValid(confirmResponse?.receiver_id)
      ? null
      : String(confirmResponse?.receiver_id),
    currecny: confirmResponse?.destination?.currency,
    amount: String(confirmResponse?.destination?.amount),
    transaction_id: String(confirmResponse?.transaction_id),
    order_id: confirmResponse?.external_id,
    order_status: "PENDING",
  };

  console.log("🚀 ~ payout ~ payload:", payload);
  var result = await nodeServerAPIService.update_payout_status(req, payload);
  console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

  // Send Success Response
  res.status(httpStatus.OK).send(confirmTransactionResponse);
});

/**
 * Transaction Status
 */
const transaction_status = catchAsync(async (req, res) => {
  const transaction_id = req.params.transaction_id;

  var stored_transaction = await transactionService.getById(transaction_id);
  // Check transaction
  if (stored_transaction?.status !== httpStatus.OK) {
    console.log("stored_transaction:", stored_transaction);
    res.status(httpStatus.OK).send(stored_transaction);
    return;
  }

  const MID = await pspService.get_mid_by_id(stored_transaction?.data?.mid_id);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(MID);
    return;
  }
  const transactionResponse = await quotationService.transaction_status(
    transaction_id,
    MID?.data
  );

  // Check transaction
  if (transactionResponse?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(transactionResponse);
    return;
  }

  // Send Success Response
  res.status(httpStatus.OK).send(transactionResponse);
});

/**
 * Transaction Cancel
 */
const transaction_cancel = catchAsync(async (req, res) => {
  const { transaction_id } = req.body;

  // Get Last Transaction By ID
  const stored_transaction = await transactionService.getById(transaction_id);
  if (stored_transaction.status !== httpStatus.OK) {
    return stored_transaction;
  }

  // Get Transaction MID
  const MID = await pspService.get_mid_by_id(stored_transaction?.data?.mid_id);
  if (MID?.status !== httpStatus.OK) {
    return MID;
  }

  const transactionResponse = await quotationService.transaction_cancel(
    transaction_id,
    MID?.data
  );

  // Check transaction
  if (transactionResponse?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(transactionResponse);
    return;
  }

  // Send Success Response
  res.status(httpStatus.OK).send(transactionResponse);
});

/**
 * Payout List
 */
const payout_list = catchAsync(async (req, res) => {
  const payoutListResponse = await quotationService.get_payout_list(req, res);
  if (payoutListResponse?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payoutListResponse);
    return;
  }
  res.status(httpStatus.OK).send(payoutListResponse);
});

/**
 * Payout Webhook
 */
const payout_webhook = catchAsync(async (req, res) => {
  const transaction = req.body;
  console.log("🚀 ~ transaction:", transaction);

  if (helperService.isNotValid(transaction)) {
    console.log("Received webhook....isNotValid:", transaction);
    res.status(httpStatus.BAD_REQUEST).send({
      status: 400,
      message: "Invalid request",
    });
    return;
  }

  //=============================================================================================
  // Get last stored transaction for this payout
  var stored_transaction = await transactionService.getById(transaction?.id);
  console.log("🚀 ~ stored_transaction:", stored_transaction);
  // Check transaction
  if (stored_transaction?.status !== httpStatus.OK) {
    console.log("stored_transaction:", stored_transaction);
  }

  //=============================================================================================
  // Get receivers details by id
  let receiver = await receiverService.get_receiver_by_id(
    stored_transaction?.data?.receiver_id
  );
  console.log("🚀 ~ receiver:", receiver);

  //=============================================================================================
  // Get merchant details by id
  let company_details = null;
  if (helperService.isValid(stored_transaction?.data?.sub_merchant_id)) {
    company_details = await nodeServerAPIService.get_company_details();
    console.log("🚀 ~ company_details:", company_details);
  }

  //=============================================================================================
  // Get merchant details by id
  let account_details = null;
  const get_funding_details_payload = {};
  if (stored_transaction?.data?.account_id) {
    get_funding_details_payload.account_id =
      stored_transaction?.data?.account_id;
  } else if (
    stored_transaction?.data?.sub_merchant_id &&
    transaction?.payer?.currency
  ) {
    get_funding_details_payload.submerchant_id = String(
      stored_transaction?.data?.sub_merchant_id
    );
    get_funding_details_payload.currency = transaction?.payer?.currency;
  } else if (
    stored_transaction?.data?.receiver_id &&
    transaction?.payer?.currency
  ) {
    get_funding_details_payload.receiver_id = String(
      stored_transaction?.data?.receiver_id
    );
    get_funding_details_payload.currency = transaction?.payer?.currency;
  }
  account_details = await nodeServerAPIService.get_funding_details(
    get_funding_details_payload,
    ""
  );
  console.log("🚀 ~ account_details:", account_details);

  // Post Merchant Webhook
  //=============================================================================================
  // Post received webhook from PSPs to merchant webhook
  let webhookPayload;
  try {
    let debit_party = {};
    // Check Type Of Transation (Settelment OR Payout)
    if (helperService.isNotValid(stored_transaction?.data?.sub_merchant_id)) {
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

    let receiver_account_details = account_details?.data;
    let credit_party = {
      account_id: receiver_account_details?.account_id,
      ...receiver_account_details?.account_details,
    };

    let credit_party_identifier = {
      ...transaction?.credit_party_identifier,
      payer_id: transaction?.payer?.id,
      payer_name: transaction?.payer?.name,
    };

    webhookPayload = {
      order_id: stored_transaction?.data?.order_id,
      external_id: stored_transaction?.data?.external_id,
      transaction_id: stored_transaction?.data?.transaction_id,
      sub_merchant_id: helperService.isValid(
        stored_transaction?.data?.sub_merchant_id
      )
        ? stored_transaction?.data?.sub_merchant_id
        : null,
      receiver_id: helperService.isValid(stored_transaction?.data?.receiver_id)
        ? stored_transaction?.data?.receiver_id
        : null,
      currency: transaction?.payer?.currency,
      wallet_id: stored_transaction?.data?.wallet_id,
      debit_party: debit_party,
      credit_party: credit_party,
      credit_party_identifier: credit_party_identifier,
      debit_details: {
        debit_amount: parseFloat(transaction?.source.amount),
        currency: transaction?.source.currency,
      },
      credit_details: {
        amount: parseFloat(transaction?.destination?.amount),
        currency: transaction?.destination?.currency,
      },
      payout_reference: helperService.isValid(
        stored_transaction?.data?.payout_reference
      )
        ? stored_transaction?.data?.payout_reference
        : null,
      purpose_of_remittance: helperService.isValid(
        transaction?.purpose_of_remittance
      )
        ? transaction?.purpose_of_remittance
        : null,
      webhook_url: helperService.isValid(stored_transaction?.data?.callback_url)
        ? stored_transaction?.data?.callback_url
        : null,
      document_reference_number:
        stored_transaction?.data?.document_reference_number,
      transaction_status: transaction?.status_class_message,
      transaction_status_code: "",
      order_created_date: moment(transaction?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      order_updated_date: moment(transaction?.creation_date).format(
        "YYYY-MM-DD hh:mm:ss"
      ),
      batch_id: null,
    };
    console.log("🚀 ~ webhookPayload:", webhookPayload);

    let webhook_url = null;
    let webhook_secret = null;
    if (helperService.isNotValid(stored_transaction?.data?.callback_url)) {
      if (helperService.isValid(stored_transaction?.data?.sub_merchant_id)) {
        //****************
        // Merchant
        //****************
        const MERCHANT =
          await nodeServerAPIService.get_merchant_webhook_settings(
            stored_transaction?.data?.sub_merchant_id
          );
        console.log("🚀 ~ MERCHANT:", MERCHANT);
        webhook_url = MERCHANT?.data.notification_url;
        webhook_secret = MERCHANT?.data.notification_secret;
      } else if (helperService.isValid(stored_transaction?.data?.receiver_id)) {
        //****************
        // Receiver
        //****************
        const RECEIVER = await receiverService.get_receiver_by_id(
          stored_transaction?.data?.receiver_id
        );
        webhook_url = RECEIVER?.webhook_url;
        webhook_secret = RECEIVER?.webhook_secret;
      }
    } else {
      webhook_url = stored_transaction?.data?.callback_url;
    }

    console.log("🚀 ~ Merchant webhook_url:", webhook_url);

    // POST data on webhook url
    if (helperService.isValid(webhook_url)) {
      var client = createGeneralApiClient();
      let webhook_result = await client.post(webhook_url, webhookPayload, {
        headers: {
          "notification-secret": webhook_secret,
        },
      });
      console.log("🚀 ~ Merchant webhook_result:", webhook_result);
    }
  } catch (error) {
    console.log("🚀 ~ Merchant constpayout_webhook=catchAsync ~ error:", error);
  }

  // update_payout_status
  //=============================================================================================
  // Post received webhook response to update_payout_status (Nodeserver)
  let txn_status =
    transaction?.status_class_message ||
    stored_transaction?.data?.status_message;
  if (transaction?.status_class_message === "DECLINED") {
    txn_status = "FAILED";
  } else if (transaction?.status_class_message === "REJECTED") {
    txn_status = "FAILED";
  } else if (transaction?.status_class_message === "CANCELLED") {
    txn_status = "FAILED";
  } else if (transaction?.status_class_message === "SUBMITTED") {
    txn_status = "PENDING";
  } else if (transaction?.status_class_message === "CONFIRMED") {
    txn_status = "PENDING";
  }

  const payload = {
    submerchant_id: stored_transaction?.data?.sub_merchant_id,
    receiver_id: String(stored_transaction?.data?.receiver_id),
    currecny: stored_transaction?.data?.destination_currency,
    amount: String(stored_transaction?.data?.destination_amount),
    transaction_id: String(stored_transaction?.data?.transaction_id),
    order_id: stored_transaction?.data?.external_id,
    order_status: txn_status,
  };

  console.log("🚀 ~ constpayout_webhook=catchAsync ~ payload:", payload);
  var result = await nodeServerAPIService.update_payout_status(req, payload);
  console.log("🚀 ~ constpayout_webhook=catchAsync ~ result:", result);

  //=============================================================================================
  // Save Transaction
  const transactionData = {
    transaction: transaction,
    super_merchant_id: stored_transaction?.data?.super_merchant_id,
    sub_merchant_id: stored_transaction?.data?.sub_merchant_id,
    quotation_id: stored_transaction?.data?.quotation_id,
    receiver_id: stored_transaction?.data?.receiver_id,
    order_id: stored_transaction?.data?.order_id,
    wallet_id: stored_transaction?.data?.wallet_id,
    account_id: stored_transaction?.data?.account_id,
    batch_id: stored_transaction?.data?.batch_id,
    mid_id: stored_transaction?.data?.mid_id,
    payout_reference: stored_transaction?.data?.payout_reference,
    webhook_url: stored_transaction?.data?.callback_url,
  };
  // DB Add
  var result = await transactionService.addNewTransaction(transactionData);
  if (result.status !== httpStatus.OK) {
    new ApiError(httpStatus.INTERNAL_SERVER_ERROR, result.message);
  }

  // Add DB TXN Record ID IN Response
  webhookPayload.transaction_ref_id = result?.data?.id;

  res.status(httpStatus.OK).send(webhookPayload);
});

/**
 * Payout List
 */
const add_transaction_attachment = catchAsync(async (req, res) => {
  const { type, order_id } = req.body;
  const file = req.file;
  console.log("🚀 ~ req.file:", file);

  if (!file) {
    return res
      .status(httpStatus.OK)
      .send({ status: 400, message: "File is required" });
  }

  // Get Last Transaction By ID
  const stored_transaction = await transactionService.getByExternalId(order_id);
  console.log("🚀 ~ stored_transaction:", stored_transaction);
  if (stored_transaction.status !== httpStatus.OK) {
    // return res.status(httpStatus.OK).send(stored_transaction);

    let save_payload = {
      transaction_id: "",
      external_id: order_id,
      receiver_id: "",
      file_name: path.basename(file.path),
      original_name: file.originalname,
      file_path: file.path,
      mimetype: file.mimetype,
      type: type,
    };
    console.log("🚀 ~ save_payload:", save_payload);

    let transaction_attachment_saved = await attachmentDbService.add(
      save_payload
    );

    res.status(httpStatus.OK).send(transaction_attachment_saved);

  } else {
    // Get Transaction MID
    const MID = await pspService.get_mid_by_id(
      stored_transaction?.data?.mid_id
    );
    if (MID?.status !== httpStatus.OK) {
      return res.status(httpStatus.OK).send(MID);
    }

    let save_payload = {
      transaction_id: stored_transaction?.data?.transaction_id,
      external_id: order_id,
      receiver_id: stored_transaction?.data?.receiver_id,
      file_name: path.basename(file.path),
      original_name: file.originalname,
      file_path: file.path,
      mimetype: file.mimetype,
      type: type,
    };

    let transaction_attachment_saved = await attachmentDbService.add(
      save_payload
    );

    const allowedPayers = [
      "MTN_MOMO",
      "ORANGE_MONEY",
      "AL_PAY",
      "MTN",
      "ORANGE",
    ];

    if (!allowedPayers.includes(stored_transaction?.data?.payer_id)) {
      // Add attachment
      const attachmentResponse =
        await quotationService.add_transaction_attachment(
          MID?.data,
          file,
          type,
          stored_transaction?.data?.transaction_id
        );

      if (attachmentResponse?.status !== httpStatus.OK) {
        res.status(httpStatus.BAD_REQUEST).send(attachmentResponse);
        return;
      }
    }

    res.status(httpStatus.OK).send(transaction_attachment_saved);
  }
});

module.exports = {
  payout_webhook,
  cancel_batch_payout,
  get_batch_transaction_status,
  payout,
  manage_payout,
  batch_payout,
  confirm_batch_payout,
  create_quotations,
  create_transaction,
  confirm_transaction,
  transaction_status,
  transaction_cancel,
  payout_list,
  manage_batch_payout,
  add_transaction_attachment,
};
