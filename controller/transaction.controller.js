const transactionsService = require("../service/transactions.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");

/**
 * Get Transactions list
 */
const list = catchAsync(async (req, res) => {
  const transactions = await transactionsService.list(req);
  if (transactions?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(transactions);
    return;
  }
  res.status(httpStatus.OK).send(transactions);
});

/**
 * Get Transactions Details By ID
 */
const transaction_details = catchAsync(async (req, res) => {
  console.log("🚀 ~ req.params:", req.params)
  const {transaction_id} = req.params;
  const transactions = await transactionsService.transaction_details(transaction_id);
  if (transactions?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(transactions);
    return;
  }
  res.status(httpStatus.OK).send(transactions);
});

/**
 * Get Transactions Attachment By ID
 */
const transaction_attachment = catchAsync(async (req, res) => {
  const {external_id} = req.params;
  console.log("🚀 ~ external_id:", external_id)
  const transactions = await transactionsService.transaction_attachment(external_id);
  console.log("🚀 ~ transactions:", transactions)
  if (transactions?.status !== httpStatus.OK) {
    res.status(httpStatus.OK).send(transactions);
    return;
  }
  res.status(httpStatus.OK).send(transactions);
});

module.exports = {
  list,
  transaction_details,
  transaction_attachment
};
