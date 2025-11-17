"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class quotation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  quotation.init(
    {
      quotation_id: DataTypes.STRING,
      external_id: DataTypes.STRING,
      receiver_id: DataTypes.STRING,
      super_merchant_id: DataTypes.STRING,
      sub_merchant_id: DataTypes.STRING,
      mode: DataTypes.STRING,
      transaction_type: DataTypes.STRING,
      wholesale_fx_rate: DataTypes.DECIMAL(10, 2),
      destination_amount: DataTypes.STRING,
      destination_currency: DataTypes.STRING,
      sent_amount: DataTypes.STRING,
      sent_currency: DataTypes.STRING,
      source_amount: DataTypes.STRING,
      source_currency: DataTypes.STRING,
      source_country_iso_code: DataTypes.STRING,
      fee_amount: DataTypes.STRING,
      fee_currency: DataTypes.STRING,
      creation_date: DataTypes.DATE,
      expiration_date: DataTypes.DATE,
      payer_country_iso_code: DataTypes.STRING,
      payer_currency: DataTypes.STRING,
      payer_id: DataTypes.STRING,
      payer_name: DataTypes.STRING,
      service_id: DataTypes.STRING,
      service_name: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "quotation",
      tableName:"quotations",
     timestamps: false,
    }
  );
  return quotation;
};
