import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function findOneById(id) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        companies
      WHERE
        id = $1
      LIMIT
        1
      ;`,
    values: [id],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "A empresa informada não foi encontrada no sistema.",
      action: "Verifique se o ID está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneBySlug(slug) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        companies
      WHERE
        LOWER(slug) = LOWER($1)
      LIMIT
        1
      ;`,
    values: [slug],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "A empresa informada não foi encontrada no sistema.",
      action: "Verifique se o slug está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneByCnpj(cnpj) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        companies
      WHERE
        cnpj = $1
      LIMIT
        1
      ;`,
    values: [cnpj],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "A empresa informada não foi encontrada no sistema.",
      action: "Verifique se o CNPJ está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function create(companyInputValues) {
  await validateUniqueSlug(companyInputValues.slug);
  await validateUniqueCnpj(companyInputValues.cnpj);

  const results = await database.query({
    text: `
      INSERT INTO
        companies (name, slug, cnpj, subscription_plan, subscription_status, settings)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        *
      ;`,
    values: [
      companyInputValues.name,
      companyInputValues.slug,
      companyInputValues.cnpj,
      companyInputValues.subscription_plan || "free",
      companyInputValues.subscription_status || "active",
      companyInputValues.settings || {},
    ],
  });

  return results.rows[0];
}

async function update(id, companyInputValues) {
  const currentCompany = await findOneById(id);

  if (
    "slug" in companyInputValues &&
    companyInputValues.slug !== currentCompany.slug
  ) {
    await validateUniqueSlug(companyInputValues.slug);
  }

  if (
    "cnpj" in companyInputValues &&
    companyInputValues.cnpj !== currentCompany.cnpj
  ) {
    await validateUniqueCnpj(companyInputValues.cnpj);
  }

  const companyWithNewValues = { ...currentCompany, ...companyInputValues };

  const results = await database.query({
    text: `
      UPDATE
        companies
      SET
        name = $2,
        slug = $3,
        cnpj = $4,
        subscription_plan = $5,
        subscription_status = $6,
        settings = $7,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        *
      ;`,
    values: [
      companyWithNewValues.id,
      companyWithNewValues.name,
      companyWithNewValues.slug,
      companyWithNewValues.cnpj,
      companyWithNewValues.subscription_plan,
      companyWithNewValues.subscription_status,
      companyWithNewValues.settings,
    ],
  });

  return results.rows[0];
}

async function findAllActive() {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        companies
      WHERE
        is_active = true
      ORDER BY
        name ASC
      ;`,
  });

  return results.rows;
}

async function validateUniqueSlug(slug) {
  const results = await database.query({
    text: `
      SELECT
        slug
      FROM
        companies
      WHERE
        LOWER(slug) = LOWER($1)
      ;`,
    values: [slug],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O slug informado já está sendo utilizado.",
      action: "Utilize outro slug para realizar esta operação.",
    });
  }
}

async function validateUniqueCnpj(cnpj) {
  const results = await database.query({
    text: `
      SELECT
        cnpj
      FROM
        companies
      WHERE
        cnpj = $1
      ;`,
    values: [cnpj],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O CNPJ informado já está sendo utilizado.",
      action: "Utilize outro CNPJ para realizar esta operação.",
    });
  }
}

const company = {
  create,
  findOneById,
  findOneBySlug,
  findOneByCnpj,
  update,
  findAllActive,
};

export default company;
