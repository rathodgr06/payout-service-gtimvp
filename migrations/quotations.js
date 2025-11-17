'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('quotations', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      quotation_id: {
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
    await queryInterface.dropTable('quotations');
  },
};
