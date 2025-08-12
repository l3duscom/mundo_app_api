import database from "infra/database.js";
import password from "models/password.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function findOneById(id) {
  const userFound = await runSelectQuery(id);

  return userFound;

  async function runSelectQuery(id) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          users
        WHERE
          id = $1
        LIMIT
          1
        ;`,
      values: [id],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
      });
    }

    return results.rows[0];
  }
}

async function findOneByUsername(username, companyId) {
  const results = await database.query({
    text: `
      SELECT
        u.*,
        c.name as company_name,
        c.slug as company_slug
      FROM
        users u
      JOIN
        companies c ON u.company_id = c.id
      WHERE
        LOWER(u.username) = LOWER($1)
        AND u.company_id = $2
      LIMIT
        1
      ;`,
    values: [username, companyId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O username informado não foi encontrado no sistema.",
      action: "Verifique se o username está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneByUsernameInCompany(username, companySlug) {
  const results = await database.query({
    text: `
      SELECT
        u.*,
        c.name as company_name,
        c.slug as company_slug
      FROM
        users u
      JOIN
        companies c ON u.company_id = c.id
      WHERE
        LOWER(u.username) = LOWER($1)
        AND LOWER(c.slug) = LOWER($2)
      LIMIT
        1
      ;`,
    values: [username, companySlug],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O username informado não foi encontrado no sistema.",
      action: "Verifique se o username está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function findOneByEmail(email) {
  const results = await database.query({
    text: `
      SELECT
        u.*,
        c.name as company_name,
        c.slug as company_slug
      FROM
        users u
      JOIN
        companies c ON u.company_id = c.id
      WHERE
        LOWER(u.email) = LOWER($1)
      LIMIT
        1
      ;`,
    values: [email],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O email informado não foi encontrado no sistema.",
      action: "Verifique se o email está digitado corretamente.",
    });
  }

  return results.rows[0];
}

async function create(userInputValues) {
  if (!userInputValues.company_id) {
    throw new ValidationError({
      message: "O ID da empresa é obrigatório.",
      action: "Informe o ID da empresa para criar o usuário.",
    });
  }

  await validateUniqueUsername(userInputValues.username, userInputValues.company_id);
  await validateUniqueEmail(userInputValues.email);
  await hashPasswordInObject(userInputValues);

  const results = await database.query({
    text: `
      INSERT INTO
        users (company_id, username, email, password, role)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        *
      ;`,
    values: [
      userInputValues.company_id,
      userInputValues.username,
      userInputValues.email,
      userInputValues.password,
      userInputValues.role || "admin",
    ],
  });

  return results.rows[0];
}

async function update(userId, userInputValues, companyId) {
  const currentUser = await findOneById(userId);

  // Verify user belongs to company
  if (currentUser.company_id !== companyId) {
    throw new NotFoundError({
      message: "Usuário não encontrado nesta empresa.",
      action: "Verifique se o usuário pertence à empresa correta.",
    });
  }

  if ("username" in userInputValues && userInputValues.username !== currentUser.username) {
    await validateUniqueUsername(userInputValues.username, companyId);
  }

  if ("email" in userInputValues && userInputValues.email !== currentUser.email) {
    await validateUniqueEmail(userInputValues.email);
  }

  if ("password" in userInputValues) {
    await hashPasswordInObject(userInputValues);
  }

  const userWithNewValues = { ...currentUser, ...userInputValues };

  const results = await database.query({
    text: `
      UPDATE
        users
      SET
        username = $2,
        email = $3,
        password = $4,
        role = $5,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND company_id = $6
      RETURNING
        *
      ;`,
    values: [
      userWithNewValues.id,
      userWithNewValues.username,
      userWithNewValues.email,
      userWithNewValues.password,
      userWithNewValues.role,
      companyId,
    ],
  });

  return results.rows[0];
}

async function validateUniqueUsername(username, companyId) {
  const results = await database.query({
    text: `
      SELECT
        username
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
        AND company_id = $2
      ;`,
    values: [username, companyId],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O username informado já está sendo utilizado nesta empresa.",
      action: "Utilize outro username para realizar esta operação.",
    });
  }
}

async function validateUniqueEmail(email) {
  const results = await database.query({
    text: `
      SELECT
        email
      FROM
        users
      WHERE
        LOWER(email) = LOWER($1)
      ;`,
    values: [email],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O email informado já está sendo utilizado.",
      action: "Utilize outro email para realizar esta operação.",
    });
  }
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

async function findAllByCompany(companyId) {
  const results = await database.query({
    text: `
      SELECT
        u.*,
        c.name as company_name,
        c.slug as company_slug
      FROM
        users u
      JOIN
        companies c ON u.company_id = c.id
      WHERE
        u.company_id = $1
        AND u.status = true
      ORDER BY
        u.username ASC
      ;`,
    values: [companyId],
  });

  return results.rows;
}

const user = {
  create,
  findOneById,
  findOneByUsername,
  findOneByUsernameInCompany,
  findOneByEmail,
  findAllByCompany,
  update,
};

export default user;
