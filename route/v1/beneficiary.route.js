const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const validateHeaders = require("../../validations/headers.validation.js");
const beneficiaryController = require("../../controller/beneficiary.controller.js");
const beneficiaryValidation = require("../../validations/beneficiary.validation.js");
const auth = require("../../middleware/auth.js");

// router.post(
//   "/add-receiver",
//   validateHeaders.check_admin_token,
//   validate(beneficiaryValidation.add_receiver),
//   beneficiaryController.add_receiver
// );

router.post(
  "/add-receiver",
  validateHeaders.token,
  validate(beneficiaryValidation.add_receiver),
  beneficiaryController.add_receiver
);
router.post(
  "/update-receiver",
  validateHeaders.token,
  validate(beneficiaryValidation.update_receiver),
  beneficiaryController.update_receiver
);
router.get(
  "/get-receiver-by-id/:receiver_id",
  beneficiaryController.get_receiver_by_id
);
router.get(
  "/verify-receiver/:receiver_id",
  beneficiaryController.verify_receiver
);
router.get(
  "/delete-receiver-by-id/:receiver_id",
  beneficiaryController.delete_receiver
);
router.post(
  "/get-by-id",
  validate(beneficiaryValidation.get),
  beneficiaryController.getById
);
router.post(
  "/list",
  validate(beneficiaryValidation.list),
  beneficiaryController.list
);

module.exports = router;
