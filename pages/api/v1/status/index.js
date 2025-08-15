import { createRouter } from "next-connect";
import database from "infra/database";
import controller from "infra/controller.js";
import corsMiddleware from "infra/cors.js";

/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Status da API
 *     description: |
 *       Retorna o status da API e informações sobre o banco de dados.
 *       Esta rota é pública e não requer autenticação.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Status da API retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp da resposta
 *                   example: "2024-01-01T12:00:00.000Z"
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         version:
 *                           type: string
 *                           description: Versão do PostgreSQL
 *                           example: "15.4"
 *                         max_connections:
 *                           type: integer
 *                           description: Máximo de conexões configuradas
 *                           example: 100
 *                         opened_connections:
 *                           type: integer
 *                           description: Conexões atualmente abertas
 *                           example: 5
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(corsMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();

  const databaseVersionResult = await database.query("SHOW server_version;");
  const databaseVersionValue = databaseVersionResult.rows[0].server_version;

  const databaseMaxConnectionsResult = await database.query(
    "SHOW max_connections;",
  );
  const databaseMaxConnectionsValue =
    databaseMaxConnectionsResult.rows[0].max_connections;

  const databaseName = process.env.POSTGRES_DB;
  const databaseOpenedConnectionsResult = await database.query({
    text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });
  const databaseOpenedConnectionsValue =
    databaseOpenedConnectionsResult.rows[0].count;

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersionValue,
        max_connections: parseInt(databaseMaxConnectionsValue),
        opened_connections: databaseOpenedConnectionsValue,
      },
    },
  });
}
