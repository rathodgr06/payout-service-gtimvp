const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const validateHeaders = require("../../validations/headers.validation.js");
const pspayoutRoutesController = require("../../controller/payout_routes.controller.js");
const pspayoutRoutesValidation = require("../../validations/payout_routes.validation.js");

router.post(
  "/add-payout-route",
  validateHeaders.token,
  validate(pspayoutRoutesValidation.add_payout_route),
  pspayoutRoutesController.add_payout_route
);

router.get(
  "/get-all-payout-routes",
  validateHeaders.token,
  pspayoutRoutesController.get_all_payout_routes
);


module.exports = router;
