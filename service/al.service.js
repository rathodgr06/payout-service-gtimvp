const axios = require('axios');
const urls = require('../config/urls');

async function getAccessToken(payload) {
  console.log("🚀 ~ getAccessToken ~ payload:", payload)
  try {
    const res = await axios.post(
      process.env.PAYOUT_MODE === "test"
        ? `${urls.alpay_mock.test_url}/api/Authentication/Login`
        : `${urls.alpay_mock.live_url}/api/Authentication/Login`,
      payload,
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${payload.username}:${payload.password}`).toString("base64"),
        },
      }
    );
    console.log("🚀 ~ getAccessToken ~ res.data:", res.data)
    return res.data.token;
  } catch (err) {
    console.error('Token Error:', err.response?.data || err.message);
    return false
  }
}

async function nameEnquiryService(token, data) {
  const transaction_id = uuidv4(); // Generate UUID
  const end_url = "api/NameEnquiry/NameEnquiryService";
  try {
    console.log('Initiating NameEnquiry with transaction ID:', transaction_id);
    console.log('NameEnquiry Data:', JSON.stringify(data));
    console.log('Using Token:', token);
    console.log('Using Base URL:', process.env.PAYOUT_MODE=="test"?`${urls.alpay_mock.test_url}/${end_url}`:`${urls.alpay_mock.live_url}/${end_url}`,
 );
    let headers =  {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
    console.log('Headers:', headers);    

  
    const res = await axios.post(
      process.env.PAYOUT_MODE=="test"?`${urls.alpay_mock.test_url}/${end_url}`:`${urls.alpay_mock.live_url}/${end_url}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('NameEnquiry initiated, Transaction ID:', transaction_id);
    console.log('NameEnquiry Response:', res.data);

    // {"statusCode":"200","statusDesc":"SUCCESSFUL","data":{"message":"Request proccessed successfully","transactionId":"NE1759324415","accountName":"Mark Otu Quartey","accountNumber":"233558287508"}}
    if (res?.data.statusCode != 200) {
      return {status: 400, message: res?.data?.statusDesc};
    }else{
      return {status: 200, message: res?.data?.statusDesc, data: res.data?.data} ;
    }
  } catch (err) {
    console.log(err)
    console.error('NameEnquiry Error:', err?.response?.data || err?.message);
    let message = err?.message;
    if (err?.response?.data) {
      message = err?.response?.data?.statusDesc;
    }
    return {status: 400, message: message, data: null} ;
  }
}

const { v4: uuidv4 } = require('uuid');

async function initiateLocalTransfer(token, data) {
  const end_url = "api/SendMoney/SendMoneyService";
  try {
    console.log('Transfer Data:', JSON.stringify(data));
    console.log('Using Token:', token);
    console.log('Using Base URL:', process.env.PAYOUT_MODE=="test"?`${urls.alpay_mock.test_url}/${end_url}`:`${urls.alpay_mock.live_url}/${end_url}`,
 );
    let headers =  {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
    console.log('Headers:', headers);    

  
    const res = await axios.post(
      process.env.PAYOUT_MODE=="test"?`${urls.alpay_mock.test_url}/${end_url}`:`${urls.alpay_mock.live_url}/${end_url}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Transfer Response:', res.data);
    if (res?.data.statusCode == 202 || res?.data.statusCode == 200) {
      return {status: 200, message: res?.data?.statusDesc, data: res.data?.data} ;
    }else{
      return {status: 400, message: res?.data?.statusDesc};
    }
  } catch (err) {
    console.log(err)
    console.error('Transfer Error:', err?.response?.data || err?.message);
    let message = err?.message;
    if (err?.response?.data) {
      message = err?.response?.data?.statusDesc;
    }
    return {status: 400, message: message, data: null} ;
  }
}

async function initiateInternationalTransfer(token, data) {
  const end_url = "api/Remittance/RemittanceService";
  try {
    console.log('Transfer Data:', JSON.stringify(data));
    console.log('Using Token:', token);
    console.log('Using Base URL:', process.env.PAYOUT_MODE=="test"?`${urls.alpay_mock.test_url}/${end_url}`:`${urls.alpay_mock.live_url}/${end_url}`,
 );
    let headers =  {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
    console.log('Headers:', headers);    

  
    const res = await axios.post(
      process.env.PAYOUT_MODE=="test"?`${urls.alpay_mock.test_url}/${end_url}`:`${urls.alpay_mock.live_url}/${end_url}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Transfer Response:', res.data);
    if (res?.data.statusCode == 202 || res?.data.statusCode == 200) {
      return {status: 200, message: res?.data?.statusDesc, data: res.data?.data} ;
    }else{
      return {status: 400, message: res?.data?.statusDesc};
    }
  } catch (err) {
    console.log(err)
    console.error('Transfer Error:', err?.response?.data || err?.message);
    let message = err?.message;
    if (err?.response?.data) {
      message = err?.response?.data?.statusDesc;
    }
    return {status: 400, message: message, data: null} ;
  }
}

async function getTransferStatus(token, transactionId, transactionType) {
  console.log("🚀 ~ getTransferStatus ~ transactionId:", transactionId)
  try {
    const end_url = "api/TransactionStatus/TransactionStatusService";
    const res = await axios.post(
      process.env.PAYOUT_MODE == "test"
        ? `${urls.alpay_mock.test_url}/${end_url}`
        : `${urls.alpay_mock.live_url}/${end_url}`,
      {
        transactionId: transactionId,
        transactionType: transactionType, //CREDIT or DEBIT
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Transfer Status:', res.data);
    if (res?.data.statusCode != 200) {
      return {status: 400, message: res?.data?.statusDesc};
    }else{
      return {status: 200, message: res?.data?.statusDesc, data: res.data?.data} ;
    }
  } catch (err) {
    console.error('Status Error:', err.response?.data || err.message);
    let message = err?.message;
    if (err?.response?.data) {
      message = err?.response?.data?.statusDesc;
    }
    return {status: 400, message: message, data: null} ;
  }
}


module.exports = {
  getAccessToken,
  nameEnquiryService,
  initiateLocalTransfer,
  initiateInternationalTransfer,
  getTransferStatus
};