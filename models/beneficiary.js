"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class beneficiary extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  beneficiary.init(
    {
      super_merchant_id: DataTypes.STRING,
      sub_merchant_id: DataTypes.STRING,
      iban: DataTypes.STRING,
      registered_name: DataTypes.STRING,
      country_iso_code: DataTypes.STRING,
      address: DataTypes.STRING,
      city: DataTypes.STRING,
      transaction_types: DataTypes.STRING,
      verification: DataTypes.STRING, // pending, verified, rejected, pending_manual_review
      active: DataTypes.STRING, // 1: Active, 0: Not-Active
      // deleted: DataTypes.STRING, // 1: Active, 0: Not-Active
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "beneficiary",
    }
  );
  return beneficiary;
};
