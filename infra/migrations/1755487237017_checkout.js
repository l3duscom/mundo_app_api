exports.up = (pgm) => {
  pgm.createTable("checkout", {
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

    user_id: {
      type: "uuid",
      notNull: false,
    },

    client_email: {
      type: "varchar(255)",
      notNull: true,
    },

    payment_method: {
      type: "varchar(100)",
      notNull: false,
    },

    coupon_code: {
      type: "varchar(100)",
      notNull: false,
    },

    coupon_discount: {
      type: "numeric(10,2)",
      default: 0,
    },

    total_amount: {
      type: "numeric(10,2)",
      notNull: true,
    },

    shipping_total: {
      type: "numeric(10,2)",
      default: 0,
    },

    discount_total: {
      type: "numeric(10,2)",
      default: 0,
    },

    grand_total: {
      type: "numeric(10,2)",
      notNull: true,
    },

    currency: {
      type: "char(3)",
      notNull: true,
      default: "BRL",
    },

    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pending",
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
