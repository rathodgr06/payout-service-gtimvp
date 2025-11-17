'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('receivers', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      sub_merchant_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      super_merchant_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      account_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payer_id: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      iban: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      country_iso_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      registered_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      account_types: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      verification: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      active: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('receivers');
  },
};
