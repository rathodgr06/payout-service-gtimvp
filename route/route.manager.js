const beneficiaryRoute = require("./v1/beneficiary.route");
const receiverRoute = require("./v1/receiver.route");
const payoutRoute = require("./v1/payout.route");
const transactionsRoute = require("./v1/transactions.route");
const pspRoute = require("./v1/psp.route");
const payoutRoutesRoute = require("./v1/payout_routes.route");
const payoutScheduleRoute = require("./v1/payout_schedule.route");
const payerRoute = require("./v1/payer.route");
const mockAPIRoute = require("./v1/alpay_mock_api.route");
const mtnMockAPIRoute = require("./v1/mtn_momo_mock_api.route");
const orangeMockAPIRoute = require("./v1/orange_money_mock_api.route");

const routeManager = (app) => {
  // API V1 Routes
  app.use("/v1/payout", payoutRoute);
  app.use("/v1/payout/receiver", receiverRoute);
  app.use("/v1/payout/beneficiary", beneficiaryRoute);
  app.use("/v1/payout/transactions", transactionsRoute);
  app.use("/v1/payout/psp", pspRoute);
  app.use("/v1/payout/routes", payoutRoutesRoute);
  app.use("/v1/payout/schedule", payoutScheduleRoute);
  app.use("/v1/payout/payers", payerRoute);
  //
  app.use("/alpay-mock", mockAPIRoute);
  app.use("/mtn-mock", mtnMockAPIRoute);
  app.use("/orange-mock", orangeMockAPIRoute);
};

module.exports = routeManager;
