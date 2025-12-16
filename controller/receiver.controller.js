const receiverService = require("../service/receiver.service");
const helperService = require("../service/helper.service");
const payerService = require("../service/beneficiary.service");
const { verifyAccessToken } = require("../service/token.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const nodeServerAPIService = require("../service/node_server_api.service");
const { decrypt } = require("../service/encrypt_decrypt.service");
const receiverDBService = require("../service/receiver.db.service");

/**
 * Add Receiver
 */
const add_receiver = catchAsync(async (req, res) => {
  try {
    const sender_receiver =
      await receiverService.add_receiver_with_fund_details(req);
    if (sender_receiver?.status !== httpStatus.OK) {
      res.status(httpStatus.OK).send(sender_receiver);
      return;
    }
    res.status(httpStatus.OK).send(sender_receiver);
  } catch (error) {
    console.log("🚀 ~ constadd_receiver=catchAsync ~ error:", error);
  }
});

/**
 * Manage Receiver ( Verify, active, disable)
 */
const manage_receiver = catchAsync(async (req, res) => {
  const { action, receiver_id } = req.body;

  if (action === "verify") {
    const receiver = await receiverService.verify_receiver(receiver_id);
    if (helperService.isValid(receiver?.data)) {
      receiver.data = {
        action: action,
        ...receiver.data,
      };

      delete receiver.data.access;
    }
    if (receiver?.status !== httpStatus.OK) {
      return res.status(httpStatus.OK).send(receiver);
    }
    res.status(httpStatus.OK).send(receiver);
  } else if (action === "activate" || action === "deactivate") {
    activate_deactivate_receiver(req, res);
  } else {
    res.status(httpStatus.OK).send({
      status: httpStatus.BAD_REQUEST,
      message: "Bad request, invalid action!",
    });
  }
});

/**
 * Verify Receiver
 */
const verify_receiver = catchAsync(async (req, res) => {
  const receiver_id = req.params.receiver_id;
  const receiver = await receiverService.verify_receiver(receiver_id);
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
  const receiver = await receiverService.delete_receiver(receiver_id);
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

  const receiver = await receiverService.get_receiver_by_id(receiver_id);
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
 * Get Receiver By Sub Merchant ID
 */
const get_receiver_by_sub_id = catchAsync(async (req, res) => {
  const sub_merchant_id = req.params.sub_merchant_id;

  const receiver = await receiverService.get_receiver_by_sub_merchant_id(
    sub_merchant_id
  );
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
    verification: "pending",
  };
  const sender_receiver = await receiverService.update_receiver(payload);
  if (sender_receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(sender_receiver);
    return;
  }
  res.status(httpStatus.OK).send(sender_receiver);
});

/**
 * Update Receiver
 */
const update_receiver_verification_status = catchAsync(async (req, res) => {
  const { sub_merchant_id, status } = req.body;

  const receiver = await receiverService.get_receiver_by_sub_merchant_id(
    sub_merchant_id
  );
  if (helperService.isNotValid(receiver)) {
    res
      .status(httpStatus.OK)
      .send({ status: httpStatus.NOT_FOUND, message: "Receiver not found!" });
    return;
  }

  const payload = {
    receiver_id: receiver?.receiver_id,
    verification: status,
  };
  const sender_receiver = await receiverService.update_receiver(payload);
  if (sender_receiver?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(sender_receiver);
    return;
  }
  res.status(httpStatus.OK).send(sender_receiver);
});

/**
 * Update Receiver
 */
const activate_deactivate_receiver = catchAsync(async (req, res) => {
  const { receiver_id, action } = req.body;
  let success_message = "";
  let failed_message = "";
  let payload = {
    receiver_id: receiver_id,
  };
  if (action === "activate") {
    payload.active = 1;
    success_message = "Receiver activated successfully!";
    failed_message = "Receiver already activated!";
  } else if (action === "deactivate") {
    payload.active = 0;
    success_message = "Receiver de-activated successfully!";
    failed_message = "Receiver already de-activated!";
  }

  const sender_receiver = await receiverService.update_receiver(payload);
  if (sender_receiver?.status != httpStatus.OK) {
    if (sender_receiver?.status == 400) {
      sender_receiver.message = failed_message;
      let data = {
        action: action,
        ...sender_receiver.data,
      };
      delete data.access;
      sender_receiver.data = data;
    }

    res.status(httpStatus.OK).send(sender_receiver);
  } else {
    sender_receiver.message = success_message;
    let data = {
      action: action,
      ...sender_receiver.data,
    };
    delete data.access;
    sender_receiver.data = data;
    res.status(httpStatus.OK).send(sender_receiver);
  }
});

const getById = catchAsync(async (req, res) => {
  const { payer_id } = req.body;
  const payer = await payerService.getById(payer_id);
  if (payer?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(payer);
    return;
  }
  res.status(httpStatus.OK).send(payer);
});

const get_receiver_list = catchAsync(async (req, res) => {
  const receiverListResponse = await receiverService.get_receiver_list(
    req,
    res
  );
  if (receiverListResponse?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(receiverListResponse);
    return;
  }
  res.status(httpStatus.OK).send(receiverListResponse);
});

/**
 * Get Receiver By ID
 */
const get_payer_by_id = catchAsync(async (req, res) => {
  const payer_id = req.params.receiver_id;

  // Get payer details by id
  const payerResponse = await payerService.getById(payer_id);
  if (payerResponse?.status !== httpStatus.OK) {
    return res
      .status(httpStatus.OK)
      .send({ status: httpStatus.BAD_REQUEST, message: "Payer not found!" });
  }  

  res
    .status(httpStatus.OK)
    .send({ status: 200, message: "Receiver found!", payer: payerResponse });
});

/**
 * Add Receiver Key & Secret
 */
const add_receiver_key_secret = catchAsync(async (req, res) => {
  const { receiver_id, type } = req.body;
  const payload = {
    receiver_id: receiver_id,
    type: type,
    receiver_key: await helperService.make_order_number("test-"),
    receiver_secret: await helperService.make_order_number("sec-"),
  };
  // Get payer details by id
  const keySecretResponse = await receiverService.add_receiver_key_secret(
    payload
  );
  if (keySecretResponse?.status !== httpStatus.OK) {
    return res
      .status(httpStatus.OK)
      .send({
        status: httpStatus.BAD_REQUEST,
        message: keySecretResponse?.message,
      });
  }
  res.status(httpStatus.OK).send(keySecretResponse);
});

/**
 * Update Receiver Key & Secret
 */
const update_receiver_key_secret = catchAsync(async (req, res) => {
  const { receiver_id, webhook_url, webhook_secret } = req.body;
  console.log("🚀 ~ req.body:", req.body);
  const payload = {
    id: receiver_id,
    webhook_url: webhook_url,
    webhook_secret: webhook_secret,
  };
  // Get payer details by id
  const keySecretResponse = await receiverService.update_receiver_key_secret(
    payload
  );
  if (keySecretResponse?.status !== httpStatus.OK) {
    return res
      .status(httpStatus.OK)
      .send({
        status: httpStatus.BAD_REQUEST,
        message: keySecretResponse?.message,
      });
  }
  res.status(httpStatus.OK).send(keySecretResponse);
});

/**
 * Get Receiver By Key & Secret
 */
const get_receiver_by_key_secret = catchAsync(async (req, res) => {
  const { receiver_key, receiver_secret } = req.body;
  const payload = {
    receiver_key: receiver_key,
    receiver_secret: receiver_secret,
  };
  // Get receivers details by key & secret
  const keySecretResponse = await receiverService.get_receiver_id_by_key_secret(
    receiver_key,
    receiver_secret
  );
  if (keySecretResponse?.status !== httpStatus.OK) {
    return res
      .status(httpStatus.OK)
      .send({
        status: httpStatus.BAD_REQUEST,
        message: keySecretResponse?.message,
      });
  }
  res.status(httpStatus.OK).send(keySecretResponse);
});

/**
 * Get Receiver By Key & Secret
 */
const get_receiver_key_secret = catchAsync(async (req, res) => {
  const { receiver_id } = req.body;
  // Get receivers details by key & secret
  const keySecretResponse = await receiverService.get_receiver_key_secret(
    receiver_id
  );
  if (keySecretResponse?.status !== httpStatus.OK) {
    return res
      .status(httpStatus.OK)
      .send({
        status: httpStatus.BAD_REQUEST,
        message: keySecretResponse?.message,
      });
  }
  res.status(httpStatus.OK).send(keySecretResponse);
});

/**
 * Get Receiver Count
 */
const get_receiver_count = catchAsync(async (req, res) => {
  const condition = {
    active: 1,
    deleted: 0,
  };
  // Get receivers details by key & secret
  const countResponse = await receiverService.get_receiver_count(condition);
  if (countResponse?.status !== httpStatus.OK) {
    return res.status(httpStatus.OK).send({
      status: httpStatus.BAD_REQUEST,
      message: countResponse?.message,
    });
  }
  res.status(httpStatus.OK).send(countResponse);
});

/**
 * Get Receiver Count
 */
const delete_key_secret = catchAsync(async (req, res) => {
  const { id } = req.body;
  // Get receivers details by key & secret
  const deletedResponse = await receiverService.delete_key_secret(id);
  if (deletedResponse?.status !== httpStatus.OK) {
    return res.status(httpStatus.OK).send({
      status: httpStatus.BAD_REQUEST,
      message: deletedResponse?.message,
    });
  }
  res.status(httpStatus.OK).send(deletedResponse);
});


/**
 * Get Receiver By Key & Secret List
 */
const get_receiver_key_secret_list = catchAsync(async (req, res) => {
  const { page, per_page, sub_merchant_id } = req.body;
  let payload = {
    page: page,
    per_page: per_page,
    sub_merchant_id: sub_merchant_id?.length > 10 ? await decrypt(sub_merchant_id) : sub_merchant_id
  }
  // Get receivers details by key & secret
  const keySecretResponse = await receiverService.get_receiver_key_secret_list(
    payload
  );
  if (keySecretResponse?.status !== httpStatus.OK) {
    return res
      .status(httpStatus.OK)
      .send({
        status: httpStatus.BAD_REQUEST,
        message: keySecretResponse?.message,
      });
  }
  res.status(httpStatus.OK).send(keySecretResponse);
});


/**
 * Get Receiver Name By ID
 */
const get_receiver_name_by_id = catchAsync(async (req, res) => {
  const receiver_id = req.params.receiver_id;

  var receiver = await receiverDBService.getReceiverNameById(receiver_id);
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

module.exports = {
  add_receiver,
  get_receiver_by_sub_id,
  manage_receiver,
  update_receiver,
  get_receiver_by_id,
  verify_receiver,
  delete_receiver,
  getById,
  get_receiver_list,
  get_payer_by_id,
  update_receiver_verification_status,
  add_receiver_key_secret,
  get_receiver_by_key_secret,
  get_receiver_count,
  update_receiver_key_secret,
  get_receiver_key_secret,
  delete_key_secret,
  get_receiver_key_secret_list,
  get_receiver_name_by_id
};
