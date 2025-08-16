import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import session from "models/session";
import corsMiddleware from "infra/cors.js";

/**
 * @swagger
 * /api/v1/user:
 *   get:
 *     summary: Obter dados do usuário atual
 *     description: |
 *       Retorna os dados do usuário autenticado, incluindo informações da empresa.
 *       Também renova automaticamente a sessão.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário retornados com sucesso
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: "no-store, no-cache, max-age=0, must-revalidate"
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: Cookie de sessão renovado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [admin, manager, operator, viewer]
 *                 company:
 *                   $ref: '#/components/schemas/CompanyContext'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(corsMiddleware);
router.options((req, res) => res.status(200).end());
router.use(authorization.injectAuthenticatedUser);

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  // Renew session
  const renewedSessionObject = await session.renew(request.context.session.id);
  controller.setSessionCookie(renewedSessionObject.token, response);

  // User and company data already available in context
  const userData = {
    ...request.context.user,
    company: request.context.company,
  };

  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );

  return response.status(200).json(userData);
}
