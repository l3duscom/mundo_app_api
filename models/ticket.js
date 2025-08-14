import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function findOneById(id, companyId) {
  const results = await database.query({
    text: `
      SELECT
        t.*,
        e.event_name,
        e.slug as event_slug,
        u.username as created_by_username
      FROM
        tickets t
      JOIN
        events e ON t.event_id = e.id
      JOIN
        users u ON t.user_id = u.id
      WHERE
        t.id = $1
        AND t.company_id = $2
      LIMIT
        1
      ;`,
    values: [id, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O ingresso informado não foi encontrado no sistema.",
      action: "Verifique se o ID está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneByCode(code, companyId) {
  const results = await database.query({
    text: `
      SELECT
        t.*,
        e.event_name,
        e.slug as event_slug,
        u.username as created_by_username
      FROM
        tickets t
      JOIN
        events e ON t.event_id = e.id
      JOIN
        users u ON t.user_id = u.id
      WHERE
        t.code = $1
        AND t.company_id = $2
      LIMIT
        1
      ;`,
    values: [code, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O ingresso informado não foi encontrado no sistema.",
      action: "Verifique se o código está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findAllByEvent(eventId, companyId, filters = {}) {
  let whereClause = "WHERE t.event_id = $1 AND t.company_id = $2";
  const values = [eventId, companyId];
  let paramCount = 2;

  if (filters.batchNo !== undefined) {
    paramCount++;
    whereClause += ` AND t.batch_no = $${paramCount}`;
    values.push(filters.batchNo);
  }

  const results = await database.query({
    text: `
      SELECT
        t.*,
        e.event_name,
        e.slug as event_slug,
        u.username as created_by_username,
        (t.stock_total - t.stock_sold) as stock_available
      FROM
        tickets t
      JOIN
        events e ON t.event_id = e.id
      JOIN
        users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY
        t.batch_no ASC, t.name ASC
      ;`,
    values: values,
  });

  return results.rows;
}

async function findAllByCompany(companyId, filters = {}) {
  let whereClause = "WHERE t.company_id = $1";
  const values = [companyId];
  let paramCount = 1;

  if (filters.eventId) {
    paramCount++;
    whereClause += ` AND t.event_id = $${paramCount}`;
    values.push(filters.eventId);
  }

  if (filters.isActive !== undefined) {
    paramCount++;
    whereClause += ` AND t.is_active = $${paramCount}`;
    values.push(filters.isActive);
  }

  if (filters.category) {
    paramCount++;
    whereClause += ` AND LOWER(t.category) = LOWER($${paramCount})`;
    values.push(filters.category);
  }

  const results = await database.query({
    text: `
      SELECT
        t.*,
        e.event_name,
        e.slug as event_slug,
        u.username as created_by_username,
        (t.stock_total - t.stock_sold) as stock_available
      FROM
        tickets t
      JOIN
        events e ON t.event_id = e.id
      JOIN
        users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY
        e.start_date DESC, t.name ASC
      ;`,
    values: values,
  });

  return results.rows;
}

async function create(ticketInputValues, userId, companyId) {
  await validateUniqueCode(ticketInputValues.code, companyId);

  const results = await database.query({
    text: `
      INSERT INTO
        tickets (
          user_id, company_id, event_id, parent_ticket_id, code, name,
          unit_value, price, currency, quantity, stock_total, stock_sold,
          type, day, category, cupom, sales_start_at, sales_end_at,
          batch_no, batch_date, description, is_active
        )
      VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22
        )
      RETURNING
        *
      ;`,
    values: [
      userId,
      companyId,
      ticketInputValues.event_id,
      ticketInputValues.parent_ticket_id,
      ticketInputValues.code,
      ticketInputValues.name,
      ticketInputValues.unit_value || 0,
      ticketInputValues.price,
      ticketInputValues.currency || "BRL",
      ticketInputValues.quantity || 1,
      ticketInputValues.stock_total,
      ticketInputValues.stock_sold || 0,
      ticketInputValues.type || "individual",
      ticketInputValues.day,
      ticketInputValues.category,
      ticketInputValues.cupom,
      ticketInputValues.sales_start_at,
      ticketInputValues.sales_end_at,
      ticketInputValues.batch_no || 1,
      ticketInputValues.batch_date,
      ticketInputValues.description,
      ticketInputValues.is_active !== undefined
        ? ticketInputValues.is_active
        : true,
    ],
  });

  return results.rows[0];
}

async function update(id, ticketInputValues, companyId) {
  const currentTicket = await findOneById(id, companyId);

  if (
    "code" in ticketInputValues &&
    ticketInputValues.code !== currentTicket.code
  ) {
    await validateUniqueCode(ticketInputValues.code, companyId);
  }

  const ticketWithNewValues = { ...currentTicket, ...ticketInputValues };

  const results = await database.query({
    text: `
      UPDATE
        tickets
      SET
        name = $2,
        code = $3,
        price = $4,
        stock_total = $5,
        category = $6,
        sales_start_at = $7,
        sales_end_at = $8,
        description = $9,
        is_active = $10,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND company_id = $11
      RETURNING
        *
      ;`,
    values: [
      ticketWithNewValues.id,
      ticketWithNewValues.name,
      ticketWithNewValues.code,
      ticketWithNewValues.price,
      ticketWithNewValues.stock_total,
      ticketWithNewValues.category,
      ticketWithNewValues.sales_start_at,
      ticketWithNewValues.sales_end_at,
      ticketWithNewValues.description,
      ticketWithNewValues.is_active,
      companyId,
    ],
  });

  return results.rows[0];
}

async function updateStock(id, soldQuantity, companyId) {
  const results = await database.query({
    text: `
      UPDATE
        tickets
      SET
        stock_sold = stock_sold + $2,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND company_id = $3
        AND (stock_total - stock_sold) >= $2
      RETURNING
        *
      ;`,
    values: [id, soldQuantity, companyId],
  });

  if (results.rowCount === 0) {
    throw new ValidationError({
      message: "Estoque insuficiente para realizar esta operação.",
      action: "Verifique a disponibilidade do ingresso.",
    });
  }

  return results.rows[0];
}

async function deleteById(id, companyId) {
  // First check if ticket has any sales (stock_sold > 0)
  const currentTicket = await findOneById(id, companyId);

  if (currentTicket.stock_sold > 0) {
    throw new ValidationError({
      message:
        "Não é possível excluir um ingresso que já possui vendas realizadas.",
      action:
        "Desative o ingresso ao invés de excluí-lo para manter o histórico de vendas.",
    });
  }

  const results = await database.query({
    text: `
      DELETE FROM tickets
      WHERE id = $1 AND company_id = $2
      RETURNING *
      ;`,
    values: [id, companyId],
  });

  return results.rows[0];
}

async function cloneTicket(ticketId, cloneOptions, userId, companyId) {
  // Get original ticket
  const originalTicket = await findOneById(ticketId, companyId);

  // Calculate new price with percentage increase
  const priceIncrease = cloneOptions.priceIncreasePercentage || 0;
  const newPrice = originalTicket.price * (1 + priceIncrease / 100);
  const newUnitValue = originalTicket.unit_value * (1 + priceIncrease / 100);

  // Generate new unique code
  let newCode = `${originalTicket.code}-L${cloneOptions.batchNo || originalTicket.batch_no + 1}`;
  let counter = 1;
  while (await codeExists(newCode, companyId)) {
    counter++;
    newCode = `${originalTicket.code}-L${cloneOptions.batchNo || originalTicket.batch_no + 1}-${counter}`;
  }

  // Create cloned ticket
  const clonedTicketData = {
    ...originalTicket,
    event_id: cloneOptions.newEventId || originalTicket.event_id,
    code: newCode,
    unit_value: newUnitValue,
    price: newPrice,
    stock_total: cloneOptions.newStock || originalTicket.stock_total,
    stock_sold: 0, // Reset stock sold
    batch_no: cloneOptions.batchNo || originalTicket.batch_no + 1,
    batch_date: cloneOptions.batchDate || null,
    sales_start_at: cloneOptions.salesStartAt || originalTicket.sales_start_at,
    sales_end_at: cloneOptions.salesEndAt || originalTicket.sales_end_at,
  };

  // Remove fields that shouldn't be cloned
  delete clonedTicketData.id;
  delete clonedTicketData.created_at;
  delete clonedTicketData.updated_at;
  delete clonedTicketData.event_name;
  delete clonedTicketData.event_slug;
  delete clonedTicketData.created_by_username;

  return await create(clonedTicketData, userId, companyId);
}

async function cloneBatchTickets(eventId, cloneOptions, userId, companyId) {
  // Get tickets from the original event, filtering by batch number if provided
  const filters = {};
  if (cloneOptions.fromBatchNo !== undefined) {
    filters.batchNo = cloneOptions.fromBatchNo;
  }
  const originalTickets = await findAllByEvent(eventId, companyId, filters);

  if (originalTickets.length === 0) {
    throw new NotFoundError({
      message: "Nenhum ingresso encontrado para o evento especificado.",
      action: "Verifique se o evento possui ingressos cadastrados.",
    });
  }

  const clonedTickets = [];
  const priceIncrease = cloneOptions.priceIncreasePercentage || 0;

  for (const originalTicket of originalTickets) {
    // Calculate new price with percentage increase
    const newPrice = originalTicket.price * (1 + priceIncrease / 100);
    const newUnitValue = originalTicket.unit_value * (1 + priceIncrease / 100);

    // Generate new unique code
    let newCode = `${originalTicket.code}-L${cloneOptions.batchNo || originalTicket.batch_no + 1}`;
    let counter = 1;
    while (await codeExists(newCode, companyId)) {
      counter++;
      newCode = `${originalTicket.code}-L${cloneOptions.batchNo || originalTicket.batch_no + 1}-${counter}`;
    }

    // Create cloned ticket data
    const clonedTicketData = {
      ...originalTicket,
      event_id: cloneOptions.newEventId || originalTicket.event_id,
      code: newCode,
      unit_value: newUnitValue,
      price: newPrice,
      stock_total: cloneOptions.newStock || originalTicket.stock_total,
      stock_sold: 0, // Reset stock sold
      batch_no: cloneOptions.batchNo || originalTicket.batch_no + 1,
      batch_date: cloneOptions.batchDate || null,
      sales_start_at:
        cloneOptions.salesStartAt || originalTicket.sales_start_at,
      sales_end_at: cloneOptions.salesEndAt || originalTicket.sales_end_at,
    };

    // Remove fields that shouldn't be cloned
    delete clonedTicketData.id;
    delete clonedTicketData.created_at;
    delete clonedTicketData.updated_at;
    delete clonedTicketData.event_name;
    delete clonedTicketData.event_slug;
    delete clonedTicketData.created_by_username;
    delete clonedTicketData.stock_available;

    const clonedTicket = await create(clonedTicketData, userId, companyId);
    clonedTickets.push(clonedTicket);
  }

  return clonedTickets;
}

async function codeExists(code, companyId) {
  const results = await database.query({
    text: `
      SELECT 1
      FROM tickets
      WHERE code = $1 AND company_id = $2
      LIMIT 1
      ;`,
    values: [code, companyId],
  });

  return results.rowCount > 0;
}

async function validateUniqueCode(code, companyId) {
  const results = await database.query({
    text: `
      SELECT
        code
      FROM
        tickets
      WHERE
        code = $1
        AND company_id = $2
      ;`,
    values: [code, companyId],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O código informado já está sendo utilizado nesta empresa.",
      action: "Utilize outro código para realizar esta operação.",
    });
  }
}

const ticket = {
  create,
  findOneById,
  findOneByCode,
  findAllByEvent,
  findAllByCompany,
  update,
  updateStock,
  deleteById,
  cloneTicket,
  cloneBatchTickets,
};

export default ticket;
