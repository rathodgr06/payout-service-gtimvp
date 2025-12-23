const pspService = require("../service/psp.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");

/**
 * Add Receiver
 */
const add_mid = catchAsync(async (req, res) => {
  const {
    sub_merchant_id,
    receiver_id,
    psp_id,
    primary_key,
    api_key,
    password,
    callback,
  } = req.body;

  const payload = {
    sub_merchant_id: sub_merchant_id,
    receiver_id: receiver_id,
    psp_id: psp_id,
    primary_key: primary_key,
    api_key: api_key,
    password: password,
    currency_code: "",
    country_iso_code: "",
    min_txn_amount: 0,
    max_txn_amount: 0,
    callback: callback,
  };
  console.log(`payload`);
  console.log(payload);
  const MID = await pspService.add_mid(payload);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(MID);
    return;
  }
  res.status(httpStatus.OK).send(MID);
});

/**
 * Add Receiver
 */
const add_psp = catchAsync(async (req, res) => {
  const { psp_key, psp_name, remark } = req.body;
  const payload = {
    psp_key: psp_key,
    psp_name: psp_name,
    remark: remark,
  };
  const PSP = await pspService.add_psp(payload);
  if (PSP?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(PSP);
    return;
  }

  // Now add default MID for psp

  let mid_payload = {
    sub_merchant_id: '',
    receiver_id: '',
    psp_id: PSP?.data?.PSP_id,
    currency_code: "",
    country_iso_code: "",
    min_txn_amount: 0,
    max_txn_amount: 0,
    callback: '',
  };
  if (PSP?.data?.psp_name === 'Thunes') {

    mid_payload.primary_key = '';
    mid_payload.api_key = 'a0895b2a-b05c-45cc-b218-6c103d3d67e9';
    mid_payload.password = 'fcc52714-1d66-4f63-8aec-aeaae62299f3';
    
  }else if (PSP?.data?.psp_name === 'MTN-MOMO') {
    
    mid_payload.primary_key = 'ec31d4b6e7d843e6b554be7c1df8d0cf';
    mid_payload.api_key = 'f68b43c3-b0f3-4375-bb67-9c5df9f1342d';
    mid_payload.password = 'e054b09ea1794e3c8765099cca568700';
    
  }else if (PSP?.data?.psp_name === 'ORANGE-MONEY') {
    
    mid_payload.primary_key = '';
    mid_payload.api_key = 'GTISwitch';
    mid_payload.password = 'Jr7javyC0GCatAaNT8FRipcs';

  }else if (PSP?.data?.psp_name === 'AlPay') {
    
    mid_payload.primary_key = '';
    mid_payload.api_key = 'GTIPay';
    mid_payload.password = '95c7386b6ec04bd68f6f';

  }else if (PSP?.data?.psp_name === 'MTN') {
    
    mid_payload.primary_key = 'ec31d4b6e7d843e6b554be7c1df8d0cf';
    mid_payload.api_key = 'f68b43c3-b0f3-4375-bb67-9c5df9f1342d';
    mid_payload.password = 'e054b09ea1794e3c8765099cca568700';

  }else if (PSP?.data?.psp_name === 'ORANGE') {
    
    mid_payload.primary_key = '';
    mid_payload.api_key = 'GTISwitch';
    mid_payload.password = 'e054Jr7javyC0GCatAaNT8FRipcs';

  }else if (PSP?.data?.psp_name === 'MOCK-AL-PAY') {
    
    mid_payload.primary_key = '';
    mid_payload.api_key = 'demo';
    mid_payload.password = 'demo123';

  }

  console.log(`mid_payload`);
  console.log(mid_payload);
  const MID = await pspService.add_mid(mid_payload);
  if (MID?.status !== httpStatus.OK) {
    console.log("MID: ", MID);
  }


  res.status(httpStatus.OK).send(PSP);
});

/**
 * Get PSP
 */
const get_psp = catchAsync(async (req, res) => {
  const PSP = await pspService.get_all_psp();
  if (PSP?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(PSP);
    return;
  }
  res.status(httpStatus.OK).send(PSP);
});

/**
 * Get PSP By PSP Key
 */
const get_psp_by_psp_key = catchAsync(async (req, res) => {
  const PSP = await pspService.get_psp_by_psp_key(req.params.psp_key);
  if (PSP?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(PSP);
    return;
  }
  res.status(httpStatus.OK).send(PSP);
});

/**
 * Get MID By ID
 */
const get_mid_by_id = catchAsync(async (req, res) => {
  const { mid_id } = req.params;
  const MID = await pspService.get_mid_by_id(mid_id);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(MID);
    return;
  }
  res.status(httpStatus.OK).send(MID);
});

/**
 * Get MID By ID
 */
const get_mid_list_by_id = catchAsync(async (req, res) => {
  const { mid_id } = req.params;
  const MID = await pspService.get_mid_list_by_id(mid_id);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(MID);
    return;
  }
  res.status(httpStatus.OK).send(MID);
});

/**
 * Get MID By Sub merchant ID And Receiver ID
 */
const get_mid = catchAsync(async (req, res) => {
  const { sub_merchant_id, receiver_id } = req.body;
  const MID = await pspService.get_mid_by_sub_receiver_id(
    sub_merchant_id,
    receiver_id
  );
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(MID);
    return;
  }
  res.status(httpStatus.OK).send(MID);
});

/**
 * Get MID By Sub merchant ID And Receiver ID
 */
const get_mid_by_psp = catchAsync(async (req, res) => {
  const { psp_id } = req.params;
  const MID = await pspService.get_mid_by_psp_id(psp_id);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(MID);
    return;
  }
  res.status(httpStatus.OK).send(MID);
});

/**
 * Update PSP By ID
 */
const update_psp = catchAsync(async (req, res) => {
  const { id, psp_name, country_id, country_name, remark } = req.body;
  const payload = {
    psp_name: psp_name,
    country_id: country_id,
    country_name: country_name,
    remark: remark,
  };
  const PSP = await pspService.update_psp(id, payload);
  if (PSP?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(PSP);
    return;
  }
  res.status(httpStatus.OK).send(PSP);
});

/**
 * Update PSP By ID
 */
const update_payout_psp_mid = catchAsync(async (req, res) => {
  const { mid_id, primary_key, api_key, password, callback } = req.body;
  const payload = {
    primary_key: primary_key,
    api_key: api_key,
    password: password,
    callback: callback,
  };
  const MID = await pspService.update_payout_psp_mid(mid_id, payload);
  if (MID?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(MID);
    return;
  }
  res.status(httpStatus.OK).send(MID);
});

/**
 * Disable PSP By ID
 */
const manage_psp = catchAsync(async (req, res) => {
  const { id, action } = req.body;
  const PSP = await pspService.manage_psp(id, action);
  if (PSP?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(PSP);
    return;
  }
  res.status(httpStatus.OK).send(PSP);
});

/**
 * Delete PSP By ID
 */
const delete_psp = catchAsync(async (req, res) => {
  const { id } = req.params;
  console.log("🚀 ~ constdelete_psp=catchAsync ~ id:", id);
  const PSP = await pspService.delete_psp(id);
  if (PSP?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(PSP);
    return;
  }
  res.status(httpStatus.OK).send(PSP);
});

module.exports = {
  add_mid,
  add_psp,
  get_psp,
  get_mid_by_id,
  get_mid_list_by_id,
  get_mid,
  update_psp,
  manage_psp,
  delete_psp,
  get_mid_by_psp,
  update_payout_psp_mid,
  get_psp_by_psp_key
};
