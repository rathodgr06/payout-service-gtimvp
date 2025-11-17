'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      external_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      receiver_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      batch_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      super_merchant_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sub_merchant_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      transaction_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      wholesale_fx_rate: {
        type: Sequelize.DECIMAL(17, 14),
        allowNull: true,
      },
      destination_amount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      destination_currency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sent_amount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sent_currency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      source_amount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      source_currency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      source_country_iso_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fee_amount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fee_currency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      creation_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiration_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      payer_country_iso_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payer_currency: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payer_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      service_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      service_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      iban: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      bank_account_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      quotation_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      purpose_of_remittance: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status_message: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rb_registered_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rb_country_iso_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rb_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rb_city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rb_postal_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sb_registered_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sb_country_iso_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sb_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sb_city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sb_postal_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payer_transaction_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payer_transaction_reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      callback_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      document_reference_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transactions');
  },
};
