'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'payout_mids';

    const tableExists = await queryInterface.sequelize.query(
      `SHOW TABLES LIKE '${tableName}'`
    );

    if (tableExists[0].length === 0) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        sub_merchant_id: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        receiver_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
         
        },
        psp_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        primary_key: {
          type: Sequelize.STRING(200),
          allowNull: true,
        },
        api_key: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        currency_code: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        country_iso_code: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        min_txn_amount: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        max_txn_amount: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        callback: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        priority: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        status: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        deleted: {
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
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('payout_mids');
  },
};
