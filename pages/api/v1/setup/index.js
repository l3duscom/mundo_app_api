import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import password from "models/password.js";

const router = createRouter();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // Check if default company already exists
    const companyResult = await client.query({
      text: "SELECT id FROM companies WHERE slug = $1;",
      values: ["empresa-padrao"],
    });

    let companyId;

    if (companyResult.rows.length === 0) {
      // Create default company
      const insertCompanyResult = await client.query({
        text: `
          INSERT INTO companies (id, name, slug, cnpj, subscription_plan, subscription_status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `,
        values: [
          "a0000000-0000-0000-0000-000000000001",
          "Empresa Padrão",
          "empresa-padrao", 
          "00000000000100",
          "enterprise",
          "active"
        ],
      });
      companyId = insertCompanyResult.rows[0].id;
    } else {
      companyId = companyResult.rows[0].id;
    }

    // Check if admin user already exists
    const userResult = await client.query({
      text: "SELECT id FROM users WHERE email = $1;",
      values: ["admin@empresapadrao.com"],
    });

    let userId;

    if (userResult.rows.length === 0) {
      // Create admin user
      const hashedPassword = await password.hash("mudar123");
      
      const insertUserResult = await client.query({
        text: `
          INSERT INTO users (id, company_id, username, email, password, role)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `,
        values: [
          "b0000000-0000-0000-0000-000000000001",
          companyId,
          "admin",
          "admin@empresapadrao.com",
          hashedPassword,
          "admin"
        ],
      });
      userId = insertUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    await client.query("COMMIT");

    response.status(201).json({
      message: "Empresa e usuário padrão criados com sucesso",
      company: {
        id: companyId,
        name: "Empresa Padrão",
        slug: "empresa-padrao"
      },
      user: {
        id: userId,
        username: "admin",
        email: "admin@empresapadrao.com",
        role: "admin"
      }
    });

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}