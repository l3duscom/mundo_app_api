exports.up = (pgm) => {
  pgm.createTable("events", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      notNull: true,
    },

    company_id: {
      type: "uuid",
      notNull: true,
    },

    event_name: {
      type: "varchar(128)",
      notNull: true,
    },

    slug: {
      type: "varchar(128)",
      notNull: true,
    },

    free: {
      type: "boolean",
      notNull: false,
    },

    start_date: {
      type: "date",
      notNull: false,
    },

    start_time: {
      type: "time",
      notNull: false,
    },

    end_date: {
      type: "date",
      notNull: false,
    },

    end_time: {
      type: "time",
      notNull: false,
    },

    integration: {
      type: "integer",
      notNull: false,
    },

    description: {
      type: "text",
      notNull: false,
    },

    code: {
      type: "varchar(30)",
      notNull: false,
    },

    nomenclature: {
      type: "varchar(30)",
      notNull: false,
    },

    producer: {
      type: "varchar(255)",
      notNull: false,
    },

    own: {
      type: "boolean",
      notNull: false,
    },

    visibility: {
      type: "integer",
      notNull: false,
    },

    avatar: {
      type: "varchar(240)",
      notNull: false,
    },

    cover: {
      type: "varchar(240)",
      notNull: false,
    },

    active: {
      type: "boolean",
      notNull: true,
      default: true,
    },

    fee: {
      type: "boolean",
      notNull: false,
    },

    subject: {
      type: "varchar(255)",
      notNull: false,
    },

    category: {
      type: "varchar(255)",
      notNull: false,
    },

    zip_code: {
      type: "varchar(20)",
      notNull: false,
    },

    place: {
      type: "varchar(255)",
      notNull: false,
    },

    address: {
      type: "varchar(128)",
      notNull: false,
    },

    number: {
      type: "varchar(50)",
      notNull: false,
    },

    neighborhood: {
      type: "varchar(50)",
      notNull: false,
    },

    city: {
      type: "varchar(50)",
      notNull: false,
    },

    state: {
      type: "varchar(5)",
      notNull: false,
    },

    meta_pixel_id: {
      type: "varchar(255)",
      notNull: false,
    },

    meta_pixel_view_content: {
      type: "text",
      notNull: false,
    },

    meta_pixel_add_to_cart: {
      type: "text",
      notNull: false,
    },

    meta_pixel_initiate_checkout: {
      type: "text",
      notNull: false,
    },

    meta_pixel_purchase: {
      type: "text",
      notNull: false,
    },

    meta_pixel_lead: {
      type: "text",
      notNull: false,
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
