exports.up = (pgm) => {
  pgm.createTable("carts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    session_token: {
      type: "varchar(255)",
      notNull: true,
    },

    company_id: {
      type: "uuid",
      notNull: true,
    },

    event_id: {
      type: "uuid",
      notNull: true,
    },

    ticket_id: {
      type: "uuid",
      notNull: true,
    },

    price: {
      type: "numeric(10,2)",
      notNull: true,
    },

    currency: {
      type: "char(3)",
      notNull: true,
      default: "BRL",
    },

    quantity: {
      type: "integer",
      notNull: true,
    },

    status: {
      type: "varchar(20)",
      notNull: true,
      default: "draft",
    },

    payment_method: {
      type: "varchar(100)",
    },

    shipping: {
      type: "varchar(100)",
    },

    coupon: {
      type: "varchar(100)",
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
