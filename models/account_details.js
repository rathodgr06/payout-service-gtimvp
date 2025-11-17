"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class account_details extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      account_details.belongsTo(models.transaction, {
        foreignKey: "external_id",
        as: 'account_details',
      });
    }
  }
  account_details.init(
    {
      transaction_id: DataTypes.STRING,
      order_id: DataTypes.STRING,
      external_id: DataTypes.STRING,
      receiver_id: DataTypes.STRING,
      sub_merchant_id: DataTypes.STRING,
      transaction_date: DataTypes.STRING,

      account_id: DataTypes.STRING,
      account_type: DataTypes.STRING,
      account_for: DataTypes.STRING,
      payer_id: DataTypes.STRING,
      payer_name: DataTypes.STRING,
      payer_currency: DataTypes.STRING,
      account_data: DataTypes.STRING,
      payer_data: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "account_details",
      tableName:"account_details",
      timestamps:false
    }
  );
  return account_details;
};
