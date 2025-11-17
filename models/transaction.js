"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      transaction.hasOne(models.account_details, {
        foreignKey: 'external_id',
        sourceKey: 'external_id',
        as: 'account_data',
      });
    }
  }
  transaction.init(
    {
      transaction_id: DataTypes.STRING,
      external_id: DataTypes.STRING,
      receiver_id: DataTypes.STRING,
      order_id: DataTypes.STRING,
      wallet_id: DataTypes.STRING, 
      account_id: DataTypes.STRING,
      batch_id: DataTypes.STRING,
      mid_id: DataTypes.INTEGER,
      super_merchant_id: DataTypes.STRING,
      sub_merchant_id: DataTypes.STRING,
      mode: DataTypes.STRING,
      transaction_type: DataTypes.STRING,
      wholesale_fx_rate: DataTypes.DECIMAL,
      destination_amount: DataTypes.DECIMAL,
      destination_currency: DataTypes.STRING,
      sent_amount: DataTypes.DECIMAL,
      sent_currency: DataTypes.STRING,
      source_amount: DataTypes.DECIMAL,
      source_currency: DataTypes.STRING,
      source_country_iso_code: DataTypes.STRING,
      fee_amount: DataTypes.DECIMAL,
      fee_currency: DataTypes.STRING,
      creation_date: DataTypes.DATE,
      expiration_date: DataTypes.DATE,
      payer_country_iso_code: DataTypes.STRING,
      payer_currency: DataTypes.STRING,
      payer_id: DataTypes.STRING,
      payer_name: DataTypes.STRING,
      service_id: DataTypes.STRING,
      service_name: DataTypes.STRING,

      iban: DataTypes.STRING,
      bank_account_number: DataTypes.STRING,
      quotation_id: DataTypes.STRING,
      purpose_of_remittance: DataTypes.STRING,
      status_message: DataTypes.STRING,
      rb_registered_name: DataTypes.STRING,
      rb_country_iso_code: DataTypes.STRING,
      rb_address: DataTypes.STRING,
      rb_city: DataTypes.STRING,
      rb_postal_code: DataTypes.STRING,
      sb_registered_name: DataTypes.STRING,
      sb_country_iso_code: DataTypes.STRING,
      sb_address: DataTypes.STRING,
      sb_city: DataTypes.STRING,
      sb_postal_code: DataTypes.STRING,
      payer_transaction_code: DataTypes.STRING,
      payer_transaction_reference: DataTypes.STRING,
      callback_url: DataTypes.STRING,
      document_reference_number: DataTypes.STRING,
      payout_reference: DataTypes.STRING,
      reason: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "transaction",
      tableName:"transactions",
      timestamps:false
    }
  );
  return transaction;
};
