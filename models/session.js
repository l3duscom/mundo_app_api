import crypto from "node:crypto";
import database from "infra/database.js";
import { UnauthorizedError } from "infra/errors";

const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 24 * 30 * 1000; // 30 Days

async function findOneValidByToken(sessionToken) {
  const results = await database.query({
    text: `
      SELECT
        s.*,
        u.username,
        u.email,
        u.role,
        c.name as company_name,
        c.slug as company_slug,
        c.subscription_plan,
        c.subscription_status
      FROM
        sessions s
      JOIN
        users u ON s.user_id = u.id
      JOIN
        companies c ON s.company_id = c.id
      WHERE
        s.token = $1
        AND s.expires_at > NOW()
        AND u.status = true
        AND c.is_active = true
      LIMIT
        1
      ;`,
    values: [sessionToken],
  });

  if (results.rowCount === 0) {
    throw new UnauthorizedError({
      message: "Usuário não possui sessão ativa.",
      action: "Verifique se este usuário está logado e tente novamente.",
    });
  }

  return results.rows[0];
}

async function create(userId, companyId) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const results = await database.query({
    text: `
      INSERT INTO
        sessions (token, user_id, company_id, expires_at)
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        *
      ;`,
    values: [token, userId, companyId, expiresAt],
  });

  return results.rows[0];
}

async function renew(sessionId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const results = await database.query({
    text: `
      UPDATE
        sessions
      SET
        expires_at = $2,
        updated_at = NOW()
      WHERE
        id = $1
      RETURNING
        *
      ;`,
    values: [sessionId, expiresAt],
  });

  return results.rows[0];
}

async function deleteByToken(sessionToken) {
  const results = await database.query({
    text: `
      DELETE FROM
        sessions
      WHERE
        token = $1
      RETURNING
        *
      ;`,
    values: [sessionToken],
  });

  return results.rows[0];
}

async function deleteAllByUser(userId) {
  const results = await database.query({
    text: `
      DELETE FROM
        sessions
      WHERE
        user_id = $1
      ;`,
    values: [userId],
  });

  return results.rowCount;
}

const session = {
  create,
  findOneValidByToken,
  renew,
  deleteByToken,
  deleteAllByUser,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;
