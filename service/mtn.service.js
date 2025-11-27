const axios = require('axios');
const urls = require('../config/urls');

async function getAccessToken(subscriptionKey,mid,password) {
  try {
    const res = await axios.post(
      process.env.PAYOUT_MODE=="test"?`${urls.mtn_momo.test_url}/disbursement/token/`:`${urls.mtn_momo.live_url}/disbursement/token/`,
      {},
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${mid}:${password}`).toString('base64'),
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      }
    );
        console.log("🚀 ~ getAccessToken ~ res.headers:", res.headers)
    return res.data.access_token;
  } catch (err) {
    console.error('Token Error:', err.response?.data || err.message);
    return false
  }
}
const { v4: uuidv4 } = require('uuid');

async function initiateTransfer(token,data,subscriptionKey) {
  const referenceId = uuidv4(); // Generate UUID
  try {
    console.log('Initiating Transfer with Reference ID:', referenceId);
    console.log('Transfer Data:', JSON.stringify(data));
    console.log('Using Subscription Key:', subscriptionKey);
    console.log('Using Token:', token);
    console.log('Using Base URL:', process.env.PAYOUT_MODE=="test"?`${urls.mtn_momo.test_url}/disbursement/v1_0/transfer`:`${urls.mtn_momo.live_url}/disbursement/v1_0/transfer`,
 );
    let headers =  {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment':  process.env.PAYOUT_MODE=="test"?'sandbox':'mtnliberia',
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        };
    console.log('Headers:', headers);    

  
    const res = await axios.post(
      process.env.PAYOUT_MODE=="test"?`${urls.mtn_momo.test_url}/disbursement/v1_0/transfer`:`${urls.mtn_momo.live_url}/disbursement/v1_0/transfer`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.PAYOUT_MODE=="test"?'sandbox':'mtnliberia', 
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      }
    );
    console.log('Transfer initiated, Reference ID:', referenceId);
    console.log('Transfer Response:', res.data);
    return referenceId;
  } catch (err) {
    console.log(err)
    console.error('Transfer Error:', err?.response?.data || err?.message);
    return false;
  }
}

async function getTransferStatus(token, referenceId, subscriptionKey) {
  try {
    const res = await axios.get(
       process.env.PAYOUT_MODE=="test"?`${urls.mtn_momo.test_url}/disbursement/v1_0/transfer/${referenceId}`:`${urls.mtn_momo.live_url}/disbursement/v1_0/transfer/${referenceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': process.env.PAYOUT_MODE=="test"?'sandbox':'mtnliberia',
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      }
    );
    console.log('Transfer Status:', res.data);
    return res.data;
  } catch (err) {
    console.error('Status Error:', err.response?.data || err.message);
    return false;
  }
}


module.exports = {
  getAccessToken,
  initiateTransfer,
  getTransferStatus
};