import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function findOneById(id, companyId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        clients
      WHERE
        id = $1
        AND company_id = $2
      LIMIT
        1
      ;`,
    values: [id, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O cliente informado não foi encontrado no sistema.",
      action: "Verifique se o ID está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneByCpfCnpj(cpfcnpj, companyId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        clients
      WHERE
        cpfcnpj = $1
        AND company_id = $2
      LIMIT
        1
      ;`,
    values: [cpfcnpj, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O cliente informado não foi encontrado no sistema.",
      action: "Verifique se o CPF/CNPJ está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findAllByCompany(companyId, limit = 50, offset = 0) {
  const results = await database.query({
    text: `
      SELECT
        c.*,
        u.username as created_by_username
      FROM
        clients c
      JOIN
        users u ON c.user_id = u.id
      WHERE
        c.company_id = $1
      ORDER BY
        c.name ASC
      LIMIT $2 OFFSET $3
      ;`,
    values: [companyId, limit, offset],
  });

  return results.rows;
}

async function create(clientInputValues, userId, companyId) {
  await validateUniqueCpfCnpj(clientInputValues.cpfcnpj, companyId);

  const results = await database.query({
    text: `
      INSERT INTO
        clients (user_id, company_id, name, cpfcnpj, premium, address_id)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        *
      ;`,
    values: [
      userId,
      companyId,
      clientInputValues.name,
      clientInputValues.cpfcnpj,
      clientInputValues.premium || true,
      clientInputValues.address_id || null,
    ],
  });

  return results.rows[0];
}

async function update(id, clientInputValues, companyId) {
  const currentClient = await findOneById(id, companyId);

  if ("cpfcnpj" in clientInputValues && clientInputValues.cpfcnpj !== currentClient.cpfcnpj) {
    await validateUniqueCpfCnpj(clientInputValues.cpfcnpj, companyId);
  }

  const clientWithNewValues = { ...currentClient, ...clientInputValues };

  const results = await database.query({
    text: `
      UPDATE
        clients
      SET
        name = $2,
        cpfcnpj = $3,
        premium = $4,
        address_id = $5,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND company_id = $6
      RETURNING
        *
      ;`,
    values: [
      clientWithNewValues.id,
      clientWithNewValues.name,
      clientWithNewValues.cpfcnpj,
      clientWithNewValues.premium,
      clientWithNewValues.address_id,
      companyId,
    ],
  });

  return results.rows[0];
}

async function validateUniqueCpfCnpj(cpfcnpj, companyId) {
  const results = await database.query({
    text: `
      SELECT
        cpfcnpj
      FROM
        clients
      WHERE
        cpfcnpj = $1
        AND company_id = $2
      ;`,
    values: [cpfcnpj, companyId],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O CPF/CNPJ informado já está sendo utilizado nesta empresa.",
      action: "Utilize outro CPF/CNPJ para realizar esta operação.",
    });
  }
}

const client = {
  create,
  findOneById,
  findOneByCpfCnpj,
  findAllByCompany,
  update,
};

export default client;