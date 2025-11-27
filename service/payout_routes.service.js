const httpStatus = require("http-status");
const payoutRouteDBService = require("./payout_routes.db.service");

/**
 * Add New Payout Route
 * @param {*} payload 
 * @returns 
 */
const add_payout_route = async (payload) => {
  let payout_route = await payoutRouteDBService.addRoute(payload);

  if (payout_route?.status !== httpStatus.OK) {
    return payout_route;
  }

  return payout_route;
};

/**
 * Get All Payout Routes
 * @param {*} payload 
 * @returns 
 */
const get_all_payout_routes = async () => {
  let payout_routes = await payoutRouteDBService.getAllRoutes();

  if (payout_routes?.status !== httpStatus.OK) {
    return {
      status: 400,
      message: "Payout route not found!",
    };
  }

  return payout_routes;
};

/**
 * Find Payout Routes
 * @param {*} payload 
 * @returns 
 */
const find_payout_routes = async (payload) => {
  console.log("🚀 ~ find_payout_routes ~ payload:", payload)
  let payout_routes = await payoutRouteDBService.findRoutesByCriteria(payload);
  if (payout_routes?.status !== httpStatus.OK) {
    return {
      status: 400,
      message: "Payout route not found!",
    };
  }

  return payout_routes;
};

module.exports = {
  add_payout_route,
  get_all_payout_routes,
  find_payout_routes
};
