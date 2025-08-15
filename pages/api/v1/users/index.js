import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import user from "models/user.js";
import corsMiddleware from "infra/cors.js";

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Listar usuários da empresa
 *     description: Retorna todos os usuários ativos da empresa do usuário autenticado
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   post:
 *     summary: Criar novo usuário
 *     description: |
 *       Cria um novo usuário na empresa. Requer permissões de Admin ou Manager.
 *       O usuário será automaticamente associado à empresa do usuário criador.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 maxLength: 30
 *                 description: Nome de usuário (único por empresa)
 *                 example: "joao.silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 254
 *                 description: Email do usuário (único globalmente)
 *                 example: "joao.silva@empresa.com"
 *               password:
 *                 type: string
 *                 description: Senha do usuário
 *                 example: "senhaSegura123"
 *               role:
 *                 type: string
 *                 enum: [admin, manager, operator, viewer]
 *                 default: admin
 *                 description: Papel do usuário na empresa
 *                 example: "manager"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(corsMiddleware);
router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.post(authorization.requireRole(["admin", "manager"]), postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const companyId = request.context.company.id;
  const users = await user.findAllByCompany(companyId);

  // Remove password from response
  const usersWithoutPassword = users.map((u) => {
    // eslint-disable-next-line no-unused-vars
    const { password: _password, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });

  return response.status(200).json(usersWithoutPassword);
}

async function postHandler(request, response) {
  const userInputValues = request.body;
  const companyId = request.context.company.id;

  // Inject company_id from authenticated context
  userInputValues.company_id = companyId;

  const newUser = await user.create(userInputValues);

  // Remove password from response
  // eslint-disable-next-line no-unused-vars
  const { password: _password, ...newUserWithoutPassword } = newUser;

  return response.status(201).json(newUserWithoutPassword);
}
