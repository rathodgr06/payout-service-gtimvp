"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class payout_mid extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // Define the association to Receiver
      payout_mid.belongsTo(models.receiver, { foreignKey: 'receiver_id', as: 'receiver' });
      payout_mid.belongsTo(models.payout_psp, { foreignKey: 'psp_id', as: 'psp' });
    }
  }
  payout_mid.init(
    {
      sub_merchant_id: DataTypes.STRING,
      receiver_id: DataTypes.STRING,
      psp_id: DataTypes.STRING,
      primary_key: DataTypes.STRING,
      api_key: DataTypes.STRING,
      password: DataTypes.STRING,
      currency_code: DataTypes.STRING,
      country_iso_code: DataTypes.STRING,
      min_txn_amount: DataTypes.INTEGER,
      max_txn_amount: DataTypes.INTEGER,
      callback: DataTypes.STRING,
      priority: DataTypes.INTEGER,
      status: DataTypes.INTEGER, // 1: Active, 0: Not-Active
      deleted: DataTypes.INTEGER, // 1: Deleted, 0: Not-Deleted
      // created_at: DataTypes.DATE,
      // updated_at: DataTypes.DATE,

    },
    {
      sequelize,
      modelName: "payout_mid",
      tableName: "payout_mids",
      timestamps: false,
    }
  );
  return payout_mid;
};
