exports.up = (pgm) => {
  pgm.createTable("clients", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      notNull: true,
    },

    address_id: {
      type: "uuid",
    },

    name: {
      type: "varchar(30)",
      notNull: true,
    },

    cpfcnpj: {
      type: "varchar(14)",
      notNull: true,
      unique: true,
    },

    premium: {
      type: "boolean",
      notNull: true,
      default: true,
    },

    // Why timestamp with timezone? https://justatheory.com/2012/04/postgres-use-timestamptz/
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
