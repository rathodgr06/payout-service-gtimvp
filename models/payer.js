"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class payer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  payer.init(
    {
      payer_id: DataTypes.STRING,
      super_merchant_id: DataTypes.STRING,
      sub_merchant_id: DataTypes.STRING,
      first_name: DataTypes.STRING,
      last_name: DataTypes.STRING,
      service_id: DataTypes.INTEGER,
      service_name: DataTypes.STRING,
      country_iso_code: DataTypes.STRING,
      currency: DataTypes.STRING,
      increment: DataTypes.STRING,
      bank_name: DataTypes.STRING,
      precision: DataTypes.STRING,
      transaction_types: DataTypes.STRING,
      credit_party_identifiers_accepted: DataTypes.STRING,
      credit_party_information: DataTypes.STRING,
      credit_party_verification: DataTypes.STRING,
      maximum_transaction_amount: DataTypes.STRING,
      minimum_transaction_amount: DataTypes.STRING,
      purpose_of_remittance_values_accepted: DataTypes.STRING,
      required_documents: DataTypes.STRING,
      required_receiving_entity_fields: DataTypes.STRING,
      required_sending_entity_fields: DataTypes.STRING,
      active: DataTypes.INTEGER,
      black_listed: DataTypes.INTEGER,
      // created_at: DataTypes.DATE,
      // updated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "payer",
      tableName: "payers",
      timeStamp: false
    }
  );
  return payer;
};
