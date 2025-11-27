const payoutRoutesService = require("../service/payout_routes.service");
const pspService = require("../service/psp.service");
const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");

/**
 * Add Payout Route
 */
const add_payout_route = catchAsync(async (req, res) => {
  const {
    country_iso,
    country_name,
    account_type,
    // account_type_name,
    currency,
    payer_id,
    psp_name,
    psp_id,
  } = req.body;


  const payload = {
    country_name: country_name,
    country_iso: country_iso,
    account_type: account_type,
    account_type_name: getNameById(account_type),
    currency: currency,
    payer_id: payer_id,
    psp_name: psp_name,
    // psp_name: getPSPNameById(psp_id),
    psp_id: psp_id,
  };

  const payout_route = await payoutRoutesService.add_payout_route(payload);
  if (payout_route?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payout_route);
    return;
  }
  res.status(httpStatus.OK).send(payout_route);
});

/**
 * Add Payout Route
 */
const get_all_payout_routes = catchAsync(async (req, res) => {
  const payout_routes = await payoutRoutesService.get_all_payout_routes();
  if (payout_routes?.status !== httpStatus.OK) {
    res.status(httpStatus.BAD_REQUEST).send(payout_routes);
    return;
  }
  res.status(httpStatus.OK).send(payout_routes);
});

const getNameById = (id) => {
  const account_type_array = [
    {
      id: "1",
      name: "MobileWallet",
    },
    {
      id: "2",
      name: "BankAccount",
    },
    {
      id: "3",
      name: "CashPickup",
    },
  ];
  const found = account_type_array.find(item => item.id === id);
  return found ? found.name : null;
};

const getPSPNameById = (id) => {
  const PSPs = pspService.get_all_psp();
  if (PSPs.status == httpStatus.OK) {
    const found = PSPs.data.find(item => item.id === id);
    return found ? found.psp_name : "";
  }
  return "";
};


module.exports = {
  add_payout_route,
  get_all_payout_routes
};
