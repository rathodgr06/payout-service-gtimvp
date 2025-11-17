"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class payout_routes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  payout_routes.init(
    {
      country_name: DataTypes.STRING,
      country_iso: DataTypes.STRING,
      account_type: DataTypes.INTEGER,
      account_type_name: DataTypes.STRING,
      currency: DataTypes.STRING,
      payer_id: DataTypes.STRING,
      psp_name: DataTypes.STRING,
      psp_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "payout_routes",
      tableName: "payout_routes",
      timestamps: false,
    }
  );
  return payout_routes;
};
