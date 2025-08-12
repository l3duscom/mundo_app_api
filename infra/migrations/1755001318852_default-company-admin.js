/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Insert default company
  pgm.sql(`
    INSERT INTO companies (id, name, slug, cnpj, subscription_plan, subscription_status)
    VALUES (
      'a0000000-0000-0000-0000-000000000001',
      'Empresa Padrão',
      'empresa-padrao',
      '00000000000100',
      'enterprise',
      'active'
    )
    ON CONFLICT (slug) DO NOTHING;
  `);

  // Insert admin user for the default company
  // Password hash for "mudar123" using bcrypt with 14 rounds
  pgm.sql(`
    INSERT INTO users (id, company_id, username, email, password, role)
    VALUES (
      'b0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000001',
      'admin',
      'admin@empresapadrao.com',
      '$2b$14$a2.13er0WG5iK76YeH12SOs1e50fo6QyCyVzz3mbTQv526T.6n55m',
      'admin'
    )
    ON CONFLICT (email) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
