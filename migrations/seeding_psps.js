'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM payout_psps WHERE id IN (1, 2);`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const existingIds = existing.map(e => e.id);

    const recordsToInsert = [];

    if (!existingIds.includes(1)) {
      recordsToInsert.push({
        id: 1,
        country_id: '231',
        country_name: 'United Arab Emirates',
        psp_name: 'Thunes',
        remark: 'Thunes Payout',
        status: 1,
        deleted: 0,
        created_at: new Date('2025-05-13T14:03:09'),
        updated_at: new Date('2025-05-13T14:03:09'),
      });
    }

    if (!existingIds.includes(2)) {
      recordsToInsert.push({
        id: 2,
        country_id: '123',
        country_name: 'Liberia',
        psp_name: 'MTN-MOMO',
        remark: 'MTN Mobile Payout',
        status: 1,
        deleted: 0,
        created_at: new Date('2025-05-26T14:59:27'),
        updated_at: new Date('2025-05-26T14:59:27'),
      });
    }

    if (recordsToInsert.length > 0) {
      await queryInterface.bulkInsert('payout_psps', recordsToInsert);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('payout_psps', {
      id: [1, 2],
    });
  },
};
