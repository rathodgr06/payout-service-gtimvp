const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const validateHeaders = require("../../validations/headers.validation.js");
const payoutscheduleController = require("../../controller/payout_schedule.controller.js");
const payoutscheduleValidation = require("../../validations/payout_schedule.validation.js");
const auth = require("../../middleware/auth.js");

router.post(
  "/create-payout-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.create_payout_schedule_plan),
  payoutscheduleController.create_payout_schedule_plan
);

router.get(
  "/get-payout-schedule-plan/:plan_id",
  validateHeaders.token,
  payoutscheduleController.get_payout_schedule_plan_by_id
);

router.post(
  "/list-payout-schedule-plan",
  validateHeaders.token,
  validate(payoutscheduleValidation.list_payout_schedule_plan),
  payoutscheduleController.list_payout_schedule_plan_by_id
);

router.post(
  "/manage-payout-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.manage_payout_schedule_plan),
  payoutscheduleController.manage_payout_schedule_plan
);

router.post(
  "/check-payout-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.check_payout_schedule),
  payoutscheduleController.check_payout_schedule
);

router.post(
  "/payout-re-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.payout_re_schedule),
  payoutscheduleController.payout_re_schedule
);

router.post(
  "/create-master-payout-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.create_master_payout_schedule),
  payoutscheduleController.create_master_payout_schedule
);

router.get(
  "/get-master-payout-schedule-by-mid/:sub_merchant_id",
  validateHeaders.token,
  validateHeaders.check_access_token,
  payoutscheduleController.get_master_payout_schedule
);

router.post(
  "/remove-master-payout-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.remove_master_payout_schedule),
  payoutscheduleController.remove_master_payout_schedule
);

router.post(
  "/manage-master-payout-schedule",
  validateHeaders.token,
  validate(payoutscheduleValidation.manage_master_payout_schedule),
  payoutscheduleController.manage_master_payout_schedule
);
module.exports = router;
