import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function findOneById(id, companyId) {
  const results = await database.query({
    text: `
      SELECT
        e.*,
        u.username as created_by_username
      FROM
        events e
      JOIN
        users u ON e.user_id = u.id
      WHERE
        e.id = $1
        AND e.company_id = $2
      LIMIT
        1
      ;`,
    values: [id, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O evento informado não foi encontrado no sistema.",
      action: "Verifique se o ID está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneBySlug(slug, companyId) {
  const results = await database.query({
    text: `
      SELECT
        e.*,
        u.username as created_by_username
      FROM
        events e
      JOIN
        users u ON e.user_id = u.id
      WHERE
        LOWER(e.slug) = LOWER($1)
        AND e.company_id = $2
      LIMIT
        1
      ;`,
    values: [slug, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O evento informado não foi encontrado no sistema.",
      action: "Verifique se o slug está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findAllByCompany(companyId, filters = {}) {
  let whereClause = "WHERE e.company_id = $1";
  const values = [companyId];
  let paramCount = 1;

  if (filters.active !== undefined) {
    paramCount++;
    whereClause += ` AND e.active = $${paramCount}`;
    values.push(filters.active);
  }

  if (filters.startDate) {
    paramCount++;
    whereClause += ` AND e.start_date >= $${paramCount}`;
    values.push(filters.startDate);
  }

  if (filters.category) {
    paramCount++;
    whereClause += ` AND LOWER(e.category) = LOWER($${paramCount})`;
    values.push(filters.category);
  }

  const results = await database.query({
    text: `
      SELECT
        e.*,
        u.username as created_by_username,
        (
          SELECT COUNT(*)::int 
          FROM tickets t 
          WHERE t.event_id = e.id AND t.is_active = true
        ) as ticket_types_count
      FROM
        events e
      JOIN
        users u ON e.user_id = u.id
      ${whereClause}
      ORDER BY
        e.start_date DESC, e.event_name ASC
      ;`,
    values: values,
  });

  return results.rows;
}

async function create(eventInputValues, userId, companyId) {
  // Generate slug automatically if not provided
  let slug;
  if (!eventInputValues.slug) {
    slug = await generateUniqueSlug(eventInputValues.event_name, companyId);
  } else {
    await validateUniqueSlug(eventInputValues.slug, companyId);
    slug = eventInputValues.slug;
  }

  // Convert visibility string to integer
  let visibilityValue = null;
  if (eventInputValues.visibility) {
    const visibilityMap = {
      'public': 1,
      'private': 2,
      'draft': 3,
      'hidden': 4
    };
    visibilityValue = visibilityMap[eventInputValues.visibility] || null;
  }

  // Convert integration string to integer if needed
  let integrationValue = null;
  if (eventInputValues.integration) {
    if (typeof eventInputValues.integration === 'string') {
      integrationValue = parseInt(eventInputValues.integration) || null;
    } else {
      integrationValue = eventInputValues.integration;
    }
  }

  const results = await database.query({
    text: `
      INSERT INTO
        events (
          user_id, company_id, event_name, slug, free, start_date, start_time,
          end_date, end_time, integration, description, code, nomenclature,
          producer, own, visibility, avatar, cover, active, fee, subject,
          category, zip_code, place, address, number, neighborhood, city, state,
          meta_pixel_id, meta_pixel_view_content, meta_pixel_add_to_cart,
          meta_pixel_initiate_checkout, meta_pixel_purchase, meta_pixel_lead,
          created_at, updated_at
        )
      VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, timezone('utc', now()), timezone('utc', now())
        )
      RETURNING
        *
      ;`,
    values: [
      userId,
      companyId,
      eventInputValues.event_name,
      slug,
      eventInputValues.free || false,
      eventInputValues.start_date,
      eventInputValues.start_time,
      eventInputValues.end_date,
      eventInputValues.end_time,
      integrationValue,
      eventInputValues.description,
      eventInputValues.code,
      eventInputValues.nomenclature,
      eventInputValues.producer,
      eventInputValues.own,
      visibilityValue,
      eventInputValues.avatar,
      eventInputValues.cover,
      eventInputValues.active !== undefined ? eventInputValues.active : true,
      eventInputValues.fee,
      eventInputValues.subject,
      eventInputValues.category,
      eventInputValues.zip_code,
      eventInputValues.place,
      eventInputValues.address,
      eventInputValues.number,
      eventInputValues.neighborhood,
      eventInputValues.city,
      eventInputValues.state,
      eventInputValues.meta_pixel_id,
      eventInputValues.meta_pixel_view_content,
      eventInputValues.meta_pixel_add_to_cart,
      eventInputValues.meta_pixel_initiate_checkout,
      eventInputValues.meta_pixel_purchase,
      eventInputValues.meta_pixel_lead,
    ],
  });

  return results.rows[0];
}

async function update(id, eventInputValues, companyId) {
  const currentEvent = await findOneById(id, companyId);

  if (
    "slug" in eventInputValues &&
    eventInputValues.slug !== currentEvent.slug
  ) {
    await validateUniqueSlug(eventInputValues.slug, companyId);
  }

  const eventWithNewValues = { ...currentEvent, ...eventInputValues };

  const results = await database.query({
    text: `
      UPDATE
        events
      SET
        event_name = $2,
        slug = $3,
        free = $4,
        start_date = $5,
        start_time = $6,
        end_date = $7,
        end_time = $8,
        description = $9,
        category = $10,
        place = $11,
        address = $12,
        city = $13,
        state = $14,
        active = $15,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND company_id = $16
      RETURNING
        *
      ;`,
    values: [
      eventWithNewValues.id,
      eventWithNewValues.event_name,
      eventWithNewValues.slug,
      eventWithNewValues.free,
      eventWithNewValues.start_date,
      eventWithNewValues.start_time,
      eventWithNewValues.end_date,
      eventWithNewValues.end_time,
      eventWithNewValues.description,
      eventWithNewValues.category,
      eventWithNewValues.place,
      eventWithNewValues.address,
      eventWithNewValues.city,
      eventWithNewValues.state,
      eventWithNewValues.active,
      companyId,
    ],
  });

  return results.rows[0];
}

async function deleteById(id, companyId) {
  // First check if event has tickets
  const ticketsResults = await database.query({
    text: `
      SELECT COUNT(*) as ticket_count
      FROM tickets
      WHERE event_id = $1 AND is_active = true
      ;`,
    values: [id],
  });

  if (parseInt(ticketsResults.rows[0].ticket_count) > 0) {
    throw new ValidationError({
      message: "Não é possível excluir um evento que possui ingressos ativos.",
      action: "Desative ou exclua todos os ingressos deste evento antes de excluí-lo.",
    });
  }

  // Verify event exists and belongs to company
  await findOneById(id, companyId);

  const results = await database.query({
    text: `
      DELETE FROM events
      WHERE id = $1 AND company_id = $2
      RETURNING *
      ;`,
    values: [id, companyId],
  });

  return results.rows[0];
}

function generateSlugFromText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens múltiplos
    .substring(0, 128); // Limita a 128 caracteres
}

async function generateUniqueSlug(eventName, companyId) {
  let baseSlug = generateSlugFromText(eventName);
  let slug = baseSlug;
  let counter = 1;

  // Verifica se o slug já existe e gera variações até encontrar um único
  while (await slugExists(slug, companyId)) {
    counter++;
    // Garante que o slug + sufixo não passe de 128 caracteres
    const suffix = `-${counter}`;
    const maxBaseLength = 128 - suffix.length;
    slug = baseSlug.substring(0, maxBaseLength) + suffix;
  }

  return slug;
}

async function slugExists(slug, companyId) {
  const results = await database.query({
    text: `
      SELECT 1
      FROM events
      WHERE LOWER(slug) = LOWER($1)
        AND company_id = $2
      LIMIT 1
      ;`,
    values: [slug, companyId],
  });

  return results.rowCount > 0;
}

async function validateUniqueSlug(slug, companyId) {
  if (await slugExists(slug, companyId)) {
    throw new ValidationError({
      message: "O slug informado já está sendo utilizado nesta empresa.",
      action: "Utilize outro slug para realizar esta operação.",
    });
  }
}

const event = {
  create,
  findOneById,
  findOneBySlug,
  findAllByCompany,
  update,
  deleteById,
};

export default event;
