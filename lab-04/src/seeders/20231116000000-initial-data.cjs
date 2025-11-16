const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [adminPassword, userPassword] = await Promise.all([
      bcrypt.hash('Admin123!', 10),
      bcrypt.hash('User123!', 10)
    ]);

    await queryInterface.bulkInsert(
      'users',
      [
        {
          username: 'admin',
          email: 'admin@example.com',
          password: adminPassword,
          role: 'admin',
          created_at: now,
          updated_at: now
        },
        {
          username: 'johndoe',
          email: 'john.doe@example.com',
          password: userPassword,
          role: 'user',
          created_at: now,
          updated_at: now
        }
      ],
      {}
    );

    await queryInterface.bulkInsert(
      'categories',
      [
        { name: 'Work', created_at: now, updated_at: now },
        { name: 'Home', created_at: now, updated_at: now },
        { name: 'Hobby', created_at: now, updated_at: now }
      ],
      {}
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('todos', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
