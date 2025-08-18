import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function findOneById(id, sessionToken) {
  const results = await database.query({
    text: `
      SELECT
        c.*,
        t.name as ticket_name,
        t.code as ticket_code,
        t.stock_total,
        t.stock_sold,
        (t.stock_total - t.stock_sold) as stock_available,
        e.event_name,
        e.slug as event_slug,
        e.start_date as event_start_date,
        comp.name as company_name
      FROM
        carts c
      JOIN
        tickets t ON c.ticket_id = t.id
      JOIN
        events e ON c.event_id = e.id
      JOIN
        companies comp ON c.company_id = comp.id
      WHERE
        c.id = $1
        AND c.session_token = $2
      LIMIT
        1
      ;`,
    values: [id, sessionToken],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O carrinho informado não foi encontrado no sistema.",
      action: "Verifique se o ID está correto.",
    });
  }

  return results.rows[0];
}

async function findBySessionToken(sessionToken) {
  const results = await database.query({
    text: `
      SELECT
        c.*,
        t.name as ticket_name,
        t.code as ticket_code,
        t.stock_total,
        t.stock_sold,
        (t.stock_total - t.stock_sold) as stock_available,
        e.event_name,
        e.slug as event_slug,
        e.start_date as event_start_date,
        comp.name as company_name
      FROM
        carts c
      JOIN
        tickets t ON c.ticket_id = t.id
      JOIN
        events e ON c.event_id = e.id
      JOIN
        companies comp ON c.company_id = comp.id
      WHERE
        c.session_token = $1
        AND c.status = 'draft'
      ORDER BY
        c.created_at DESC
      ;`,
    values: [sessionToken],
  });

  return results.rows;
}

async function createBySessionToken(cartInputValues, sessionToken) {
  // Validate ticket availability
  await validateTicketAvailability(
    cartInputValues.ticket_id,
    cartInputValues.quantity,
    cartInputValues.company_id
  );

  const results = await database.query({
    text: `
      INSERT INTO
        carts (
          session_token, company_id, event_id, ticket_id, price, currency,
          quantity, status
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        *
      ;`,
    values: [
      sessionToken,
      cartInputValues.company_id,
      cartInputValues.event_id,
      cartInputValues.ticket_id,
      cartInputValues.price,
      cartInputValues.currency || "BRL",
      cartInputValues.quantity,
      cartInputValues.status || "draft",
    ],
  });

  return results.rows[0];
}

async function updateQuantity(id, newQuantity, sessionToken) {
  const cart = await findOneById(id, sessionToken);
  
  // Validate ticket availability for new quantity
  await validateTicketAvailability(cart.ticket_id, newQuantity, cart.company_id);

  const results = await database.query({
    text: `
      UPDATE
        carts
      SET
        quantity = $2,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND session_token = $3
        AND status = 'draft'
      RETURNING
        *
      ;`,
    values: [id, newQuantity, sessionToken],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Carrinho não encontrado ou não pode ser atualizado.",
      action: "Verifique se o carrinho existe e está em rascunho.",
    });
  }

  return results.rows[0];
}

async function updateStatus(id, newStatus, sessionToken) {
  const results = await database.query({
    text: `
      UPDATE
        carts
      SET
        status = $2,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND session_token = $3
      RETURNING
        *
      ;`,
    values: [id, newStatus, sessionToken],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Carrinho não encontrado.",
      action: "Verifique se o carrinho existe.",
    });
  }

  return results.rows[0];
}

async function deleteById(id, sessionToken) {
  const results = await database.query({
    text: `
      DELETE FROM carts
      WHERE id = $1 AND session_token = $2
      RETURNING *
      ;`,
    values: [id, sessionToken],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Carrinho não encontrado.",
      action: "Verifique se o carrinho existe.",
    });
  }

  return results.rows[0];
}

async function clearDraftsBySessionToken(sessionToken) {
  const results = await database.query({
    text: `
      DELETE FROM carts
      WHERE session_token = $1 AND status = 'draft'
      RETURNING *
      ;`,
    values: [sessionToken],
  });

  return results.rows;
}

async function calculateTotalsBySessionToken(sessionToken) {
  const results = await database.query({
    text: `
      SELECT
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(price * quantity) as total_amount,
        currency
      FROM
        carts
      WHERE
        session_token = $1
        AND status = 'draft'
      GROUP BY
        currency
      ;`,
    values: [sessionToken],
  });

  return results.rows;
}

async function validateTicketAvailability(ticketId, quantity, companyId) {
  const results = await database.query({
    text: `
      SELECT
        stock_total,
        stock_sold,
        (stock_total - stock_sold) as stock_available,
        name,
        is_active
      FROM
        tickets
      WHERE
        id = $1
        AND company_id = $2
      ;`,
    values: [ticketId, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O ingresso informado não foi encontrado.",
      action: "Verifique se o ingresso existe.",
    });
  }

  const ticket = results.rows[0];

  if (!ticket.is_active) {
    throw new ValidationError({
      message: "Este ingresso não está mais disponível para venda.",
      action: "Escolha outro ingresso disponível.",
    });
  }

  if (ticket.stock_available < quantity) {
    throw new ValidationError({
      message: `Estoque insuficiente. Disponível: ${ticket.stock_available}, Solicitado: ${quantity}.`,
      action: `Reduza a quantidade para no máximo ${ticket.stock_available} ingressos.`,
    });
  }
}

const cart = {
  createBySessionToken,
  findOneById,
  findBySessionToken,
  updateQuantity,
  updateStatus,
  deleteById,
  clearDraftsBySessionToken,
  calculateTotalsBySessionToken,
};

export default cart;