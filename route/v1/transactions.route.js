const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const transactionController = require("../../controller/transaction.controller.js");
const transactionValidation = require("../../validations/transaction.validation.js");
const validateHeaders = require("../../validations/headers.validation.js");

router.post(
  "/all-list",
  validate(transactionValidation.list),
  validateHeaders.transaction_list,
  transactionController.list
);

router.get(
  "/details/:transaction_id",
  validateHeaders.transaction_details,
  transactionController.transaction_details
);


router.get(
  "/attachment/:external_id",
  validateHeaders.transaction_attachment,
  transactionController.transaction_attachment
);

module.exports = router;
