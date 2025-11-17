'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'beneficiaries';

    const tableExists = await queryInterface.sequelize.query(
      `SHOW TABLES LIKE '${tableName}'`
    );

    if (tableExists[0].length === 0) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        super_merchant_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sub_merchant_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        iban: {
          type: Sequelize.STRING,
          allowNull: true
        },
        registered_name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        country_iso_code: {
          type: Sequelize.STRING,
          allowNull: true
        },
        address: {
          type: Sequelize.STRING,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING,
          allowNull: true
        },
        transaction_types: {
          type: Sequelize.STRING,
          allowNull: true
        },
        verification: {
          type: Sequelize.STRING,
          allowNull: true
        },
        active: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('beneficiaries');
  }
};
