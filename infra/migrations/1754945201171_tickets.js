const { unique } = require("next/dist/build/utils");

exports.up = (pgm) => {
  pgm.createTable("tickets", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      notNull: true,
    },

    event_id: {
      type: "integer",
      notNull: true,
    },

    parent_ticket_id: {
      type: "integer",
      notNull: false,
    },

    code: {
      type: "varchar(128)",
      notNull: true,
      unique: true,
    },

    name: {
      type: "varchar(128)",
      notNull: true,
    },

    unit_value: {
      type: "numeric(10,2)",
      notNull: false,
    },

    unit_value: {
      type: "numeric(10,2)",
      notNull: true,
      default: 0,
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

    stock_total: {
      type: "integer",
      notNull: true,
    },

    stock_sold: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    type: {
      type: "varchar(128)",
      notNull: true,
    },

    day: {
      type: "varchar(128)",
      notNull: false,
    },

    category: {
      type: "varchar(128)",
      notNull: true,
    },

    cupom: {
      type: "varchar(128)",
      notNull: false,
    },

    sales_start_at: {
      type: "timestamptz",
      notNull: true,
    },

    sales_end_at: {
      type: "timestamptz",
    },

    batch_no: {
      type: "integer",
      notNull: true,
      default: 1,
    },

    batch_date: {
      type: "timestamptz",
    },

    description: {
      type: "varchar(500)",
      notNull: false,
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
