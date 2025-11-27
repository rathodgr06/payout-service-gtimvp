const axios = require("axios");
const urls = require("../config/urls");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false, // disables cert check for this request only
});

async function initiateOrangeMoneyTransfer(data) {
  let referenceId = false;
  try {
    const res = await axios.post(
      process.env.PAYOUT_MODE == "test"
        ? `${urls.orange_money.test_url}Merchant/Balance/OM/Transfer`
        : `${urls.orange_money.live_url}Merchant/Balance/OM/Transfer`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    let response = res.data;
    console.log(response);
    if (response.exec_msg == "Success") {
      referenceId = response?.resultset?.TXNID;
      console.log("Transfer initiated, Reference ID:", referenceId);
      return {status: 200, message: "success", data: response};
    }else{
      return {status: 400, message: "failed", data: response};
    }
  } catch (err) {
    console.error("Transfer Error:", err.response?.data || err.message);
    return false;
  }
}

async function getOrangeMoneyTransferStatus(
  referenceId,
  key,
  password,
  currecny
) {
  try {
    let payload = {
      auth: {
        user: key,
        pwd: password,
      },
      param: {
        TXNID: referenceId,
        Currency: currecny,
      },
    };
    let config = {
      method: "get",
      url:
        process.env.PAYOUT_MODE == "test"
          ? `${urls.orange_money.test_url}OM/Transaction/Status`
          : `${urls.orange_money.live_url}OM/Transaction/Status`,
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
      data: payload,
    };
    let res = await axios.request(config);
    console.log("Transfer Status:", res.data);
    console.log(res);
    return res.data;
  } catch (err) {
    console.error("Status Error:", err.response?.data || err.message);
    return false;
  }
}

module.exports = {
  initiateOrangeMoneyTransfer,
  getOrangeMoneyTransferStatus,
};
