const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const validateHeaders = require("../../validations/headers.validation.js");
const receiverController = require("../../controller/receiver.controller.js");
const receiverValidation = require("../../validations/receiver.validation.js");

router.post(
  "/add-receiver",
  validateHeaders.add_receiver,
  validate(receiverValidation.add_receiver),
  receiverValidation.add_receiver_2,
  receiverController.add_receiver
);

router.post(
  "/manage-receiver",
  validateHeaders.manage_receiver,
  validate(receiverValidation.manage_receiver),
  receiverController.manage_receiver
);

router.post(
  "/update-receiver",
  validateHeaders.token,
  validate(receiverValidation.update_receiver),
  receiverController.update_receiver
);

router.post(
  "/update-receiver-verification-status",
  validateHeaders.token,
  validate(receiverValidation.update_receiver_verification_status),
  receiverController.update_receiver_verification_status
);

router.get(
  "/get-receiver-by-id/:receiver_id",
  validateHeaders.get_receiver_by_id,
  receiverController.get_receiver_by_id
);

router.get(
  "/get-receiver-by-sub-id/:sub_merchant_id",
  validateHeaders.token,
  receiverController.get_receiver_by_sub_id
);

router.get(
  "/verify-receiver/:receiver_id",
  validateHeaders.token,
  receiverController.verify_receiver
);

router.get(
  "/delete-receiver-by-id/:receiver_id",
  validateHeaders.delete_receiver,
  receiverController.delete_receiver
);

router.post(
  "/get-by-id",
  validateHeaders.token,
  validate(receiverValidation.get),
  receiverController.getById
);

router.post(
  "/get-receiver-list",
  validateHeaders.list_receiver,
  validateHeaders.check_access_token,
  validate(receiverValidation.get_receiver_list),
  receiverController.get_receiver_list
);

router.get(
  "/get-payer-by-id/:payer_id",
  validateHeaders.token,
  receiverController.get_payer_by_id
);

router.post(
  "/add-receiver-key-secret",
  validateHeaders.token,
  validate(receiverValidation.add_receiver_key_secret),
  receiverController.add_receiver_key_secret
);

router.post(
  "/update-webhook-key-secret",
  validateHeaders.token,
  validate(receiverValidation.update_receiver_key_secret),
  receiverController.update_receiver_key_secret
);

router.post(
  "/get-receiver-by-key-secret",
  validate(receiverValidation.get_receiver_by_key_secret),
  receiverController.get_receiver_by_key_secret
);

router.post(
  "/delete-key-secret",
  validate(receiverValidation.delete_key_secret),
  receiverController.delete_key_secret
);

router.post(
  "/get-receiver-key-secret",
  validate(receiverValidation.get_receiver_key_secret),
  receiverController.get_receiver_key_secret
);

router.post(
  "/get-count-receivers",
  receiverController.get_receiver_count
);

module.exports = router;
