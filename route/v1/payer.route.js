const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const validateHeaders = require("../../validations/headers.validation.js");
const payerController = require("../../controller/payer.controller.js");
const payerValidation = require("../../validations/payer.validation.js");

router.post(
  "/get-payers",
  validateHeaders.token,
  validate(payerValidation.get_payers),
  payerController.get_payers
);

router.get(
  "/get-payer-by-id/:payer_id",
  payerController.get_payer_by_id
);

router.get(
  "/get-country-list",
  payerController.get_countries
);

router.post(
  "/name-verification",
  validate(payerValidation.name_verification),
  payerController.name_verification
);

module.exports = router;
