const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate.js");
const quotationController = require("../../controller/quotation.controller.js");
const quotationValidation = require("../../validations/quotation.validation.js");
const validateHeaders = require("../../validations/headers.validation.js");
const multer = require('multer');
const upload = multer({ dest: 'uploads/attachments' });
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { transaction_attachment, transaction_attachment_by_name } = require("../../service/transactions.service.js");
const httpStatus = require("http-status");

// router.post(
//   "/get-wallet-balance",
//   validate(quotationValidation.wallet_balance),
//   quotationController.get_wallet_balance
// );

router.post(
  "/webhook",
  quotationController.payout_webhook
);

router.post(
  "/transaction",
  validateHeaders.API_USER,
  validate(quotationValidation.payout),
  // validateHeaders.check_post_receiver_id,
  validateHeaders.check_order_id,
  quotationController.payout
);

// Batch Payout APIs
router.post(
  "/batch-payout",
  validateHeaders.token,
  validate(quotationValidation.batch_payout),
  quotationController.batch_payout
);

router.post(
  "/manage-batch-payout",
  validateHeaders.token,
  validate(quotationValidation.manage_batch_payout),
  quotationController.manage_batch_payout
);

router.get(
  "/confirm-batch-payout/:batch_id",
  validateHeaders.token,
  quotationController.confirm_batch_payout
);

router.get(
  "/cancel-batch-payout/:batch_id",
  validateHeaders.token,
  quotationController.cancel_batch_payout
);

router.get(
  "/get-batch-payout-status/:batch_id",
  validateHeaders.token,
  quotationController.get_batch_transaction_status
);


router.post(
  "/manage-payout",
  validateHeaders.manage_payout,
  validate(quotationValidation.manage_payout),
  quotationController.manage_payout
);

router.post(
  "/quotations",
  validateHeaders.token,
  validate(quotationValidation.create_quotations),
  quotationController.create_quotations
);

router.post(
  "/create-transaction",
  validateHeaders.token,
  validate(quotationValidation.create_transaction),
  quotationController.create_transaction
);

router.post(
  "/transactions-confirm",
  validateHeaders.token,
  validate(quotationValidation.confirm_transaction),
  quotationController.confirm_transaction
);

router.get(
  "/transaction-status/:transaction_id",
  validateHeaders.token,
  quotationController.transaction_status
);

router.get(
  "/transaction-cancel/:transaction_id",
  validateHeaders.token,
  validate(quotationValidation.transaction_cancel),
  quotationController.transaction_cancel
);

router.post(
  "/transactions/list",
  validateHeaders.token,
  validateHeaders.check_access_token,
  validate(quotationValidation.payout_list),
  quotationController.payout_list
);

router.post(
  "/transaction/attachment",
  validateHeaders.token,
  upload.single('file'),
  validate(quotationValidation.add_transaction_attachment),
  quotationController.add_transaction_attachment
);

router.get('/viewfile/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join("/Users/mac/paydart/v2/payout/uploads/attachments", filename);

  let attachment = await transaction_attachment_by_name(filename);
  console.log("🚀 ~ attachment:", attachment)
  if (attachment?.status != 200) {
    return res.status(httpStatus.NOT_FOUND).send("Not fond");
  }

   if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const mimeType = attachment?.data?.mimetype || 'application/octet-stream';
  console.log("🚀 ~ mimeType:", mimeType)
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  
  res.sendFile(filePath);
});

module.exports = router;
