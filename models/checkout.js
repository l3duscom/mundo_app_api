import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function createCheckout(checkoutData) {
  const results = await database.query({
    text: `
      INSERT INTO
        checkout (
          session_token, company_id, event_id, user_id, client_email,
          payment_method, coupon_code, coupon_discount, total_amount,
          shipping_total, discount_total, grand_total, currency, status
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING
        *
      ;`,
    values: [
      checkoutData.session_token,
      checkoutData.company_id,
      checkoutData.event_id,
      checkoutData.user_id,
      checkoutData.client_email,
      checkoutData.payment_method,
      checkoutData.coupon_code,
      checkoutData.coupon_discount || 0,
      checkoutData.total_amount,
      checkoutData.shipping_total || 0,
      checkoutData.discount_total || 0,
      checkoutData.grand_total,
      checkoutData.currency || "BRL",
      checkoutData.status || "pending",
    ],
  });

  return results.rows[0];
}

async function findBySessionToken(sessionToken) {
  const results = await database.query({
    text: `
      SELECT
        c.*,
        u.username,
        u.email as user_email,
        u.role as user_role,
        comp.name as company_name,
        e.event_name,
        e.slug as event_slug
      FROM
        checkout c
      LEFT JOIN
        users u ON c.user_id = u.id
      JOIN
        companies comp ON c.company_id = comp.id
      JOIN
        events e ON c.event_id = e.id
      WHERE
        c.session_token = $1
      ORDER BY
        c.created_at DESC
      LIMIT 1
      ;`,
    values: [sessionToken],
  });

  return results.rows[0] || null;
}

async function findUserByEmail(email, companyId) {
  const results = await database.query({
    text: `
      SELECT
        id, username, email, role, status
      FROM
        users
      WHERE
        email = $1
        AND company_id = $2
        AND status = true
      LIMIT 1
      ;`,
    values: [email, companyId],
  });

  return results.rows[0] || null;
}

async function updateCheckout(id, updateData) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Build dynamic update query
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    throw new ValidationError({
      message: "Nenhum campo para atualizar foi fornecido.",
      action: "Forneça pelo menos um campo para atualização.",
    });
  }

  // Add updated_at
  fields.push(`updated_at = timezone('utc', now())`);
  values.push(id);

  const results = await database.query({
    text: `
      UPDATE
        checkout
      SET
        ${fields.join(", ")}
      WHERE
        id = $${paramIndex}
      RETURNING
        *
      ;`,
    values: values,
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Checkout não encontrado.",
      action: "Verifique se o checkout existe.",
    });
  }

  return results.rows[0];
}

const checkout = {
  createCheckout,
  findBySessionToken,
  findUserByEmail,
  updateCheckout,
};

export default checkout;