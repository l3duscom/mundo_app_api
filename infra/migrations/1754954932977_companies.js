exports.up = (pgm) => {
  pgm.createTable("companies", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    name: {
      type: "varchar(255)",
      notNull: true,
    },

    slug: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },

    cnpj: {
      type: "varchar(14)",
      notNull: true,
      unique: true,
    },

    subscription_plan: {
      type: "varchar(20)",
      notNull: true,
      default: "free",
    },

    subscription_status: {
      type: "varchar(20)",
      notNull: true,
      default: "active",
    },

    settings: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },

    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
