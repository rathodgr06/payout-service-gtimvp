const beneficiaryService = require("../service/beneficiary.service");
const helperService = require("../service/helper.service");
const { verifyAccessToken } = require("../service/token.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");

/**
 * Add Receiver
 */
const add_receiver = catchAsync(async (req, res) => {
  const { sub_merchant_id } = req.body;
  const payload = {
    sub_merchant_id: sub_merchant_id,
    account_types: "BUSINESS",
    verification: "pending",
    active: 1,
    deleted: 0,
  };
  const sender_receiver = await beneficiaryService.add_receiver(payload);
  if (sender_receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(sender_receiver);
    return;
  }
  res.status(httpStatus.OK).send(sender_receiver);

  // const {
  //   super_merchant_id,
  //   sub_merchant_id,
  //   registered_name,
  //   iban,
  //   address,
  //   city,
  //   country_iso_code,
  // } = req.body;
  // const payload = {
  //   super_merchant_id: super_merchant_id,
  //   sub_merchant_id: sub_merchant_id,
  //   registered_name: registered_name,
  //   country_iso_code: country_iso_code,
  //   address: address,
  //   city: city,
  //   iban: iban,
  //   transaction_types: "B2B",
  //   verification: "pending",
  //   active: 1,
  // };
  // const sender_receiver = await beneficiaryService.add_sender_receiver(payload);
  // if (sender_receiver?.status !== httpStatus.OK) {
  //   res.status(httpStatus.BAD_REQUEST).send(sender_receiver);
  //   return;
  // }
  // res.status(httpStatus.OK).send(sender_receiver);
});

/**
 * Verify Receiver
 */
const verify_receiver = catchAsync(async (req, res) => {
  const receiver_id = req.params.receiver_id;
  const receiver = await beneficiaryService.verify_sender(receiver_id);
  if (receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(receiver);
    return;
  }
  res.status(httpStatus.OK).send(receiver);
});

/**
 * Delete Receiver
 */
const delete_receiver = catchAsync(async (req, res) => {
  const receiver_id = req.params.receiver_id;
  const receiver = await beneficiaryService.delete_receiver(receiver_id);
  if (receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(receiver);
    return;
  }
  res.status(httpStatus.OK).send(receiver);
});

/**
 * Get Receiver By ID
 */
const get_receiver_by_id = catchAsync(async (req, res) => {
  const receiver_id = req.params.receiver_id;
  const receiver = await beneficiaryService.getBeneficiaryById(receiver_id);
  if (helperService.isNotValid(receiver)) {
    res
      .status(httpStatus.OK)
      .send({ status: httpStatus.BAD_REQUEST, message: "Receiver not found!" });
    return;
  }
  res
    .status(httpStatus.OK)
    .send({ status: 200, message: "Receiver found!", receiver: receiver });
});

/**
 * Update Receiver
 */
const update_receiver = catchAsync(async (req, res) => {
  const {
    receiver_id,
    registered_name,
    iban,
    address,
    city,
    country_iso_code,
  } = req.body;
  const payload = {
    receiver_id: receiver_id,
    registered_name: registered_name,
    country_iso_code: country_iso_code,
    address: address,
    city: city,
    iban: iban,
    verification: "pending"
  };
  const sender_receiver = await beneficiaryService.update_receiver(payload);
  if (sender_receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(sender_receiver);
    return;
  }
  res.status(httpStatus.OK).send(sender_receiver);
});

const getById = catchAsync(async (req, res) => {
  const { payer_id } = req.body;
  const payer = await payerService.getById(payer_id);
  if (payer?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payer);
    return;
  }
  res.status(httpStatus.OK).send(payer);
});

const list = catchAsync(async (req, res) => {
  const payers = await payerService.list(req);
  if (payers?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payers);
    return;
  }
  res.status(httpStatus.OK).send(payers);
});

module.exports = {
  add_receiver,
  update_receiver,
  get_receiver_by_id,
  verify_receiver,
  delete_receiver,
  getById,
  list,
};
