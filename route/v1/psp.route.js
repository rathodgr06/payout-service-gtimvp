const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const validateHeaders = require("../../validations/headers.validation.js");
const pspController = require("../../controller/psp.controller.js");
const pspValidation = require("../../validations/psp.validation.js");

router.post(
  "/add-psp",
  validateHeaders.token,
  validate(pspValidation.add_psp),
  pspController.add_psp
);

router.get(
  "/get-all-psp",
  validateHeaders.token,
  pspController.get_psp
);

router.get(
  "/get-psp-by-key/:psp_key",
  validateHeaders.token,
  pspController.get_psp_by_psp_key
);

router.post(
  "/add-mid",
  validateHeaders.token,
  validate(pspValidation.add_mid),
  pspController.add_mid
);

router.get(
  "/get-mid-by-id/:mid_id",
  validateHeaders.token,
  pspController.get_mid_by_id
);

router.get(
  "/get-mid-list-by-id/:mid_id",
  validateHeaders.token,
  pspController.get_mid_list_by_id
);

router.post(
  "/get-mid",
  validateHeaders.token,
  validate(pspValidation.get_mid_by_id),
  pspController.get_mid
);

router.get(
  "/get-mid-by-psp/:psp_id",
  validateHeaders.token,
  // validate(pspValidation.get_mid_by_psp),
  pspController.get_mid_by_psp
);

router.post(
  "/update-payout-psp",
  validateHeaders.token,
  validate(pspValidation.update_psp),
  pspController.update_psp
);

router.post(
  "/update-payout-psp-mid",
  validateHeaders.token,
  validate(pspValidation.update_payout_psp_mid),
  pspController.update_payout_psp_mid
);

router.post(
  "/manage-payout-psp",
  validateHeaders.token,
  validate(pspValidation.active_disable_psp),
  pspController.manage_psp
);

router.get(
  "/delete-payout-psp/:id",
  validateHeaders.token,
  pspController.delete_psp
);

router.get(
  "/mid-routing",
  validateHeaders.token,
  validate(pspValidation.mid_routing),
  pspController.delete_psp
);


module.exports = router;
