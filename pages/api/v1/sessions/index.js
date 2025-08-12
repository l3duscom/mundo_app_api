import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import authentication from "models/authentication.js";
import session from "models/session.js";
import { ValidationError } from "infra/errors.js";

/**
 * @swagger
 * /api/v1/sessions:
 *   post:
 *     summary: Fazer login no sistema
 *     description: |
 *       Autentica um usuário e cria uma sessão. Suporta dois tipos de login:
 *       1. **Login por email**: Email (único globalmente) + senha
 *       2. **Login por empresa**: Username + slug da empresa + senha
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [email, password]
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: Email do usuário
 *                     example: "admin@empresa-a.com"
 *                   password:
 *                     type: string
 *                     description: Senha do usuário
 *                     example: "minhasenha123"
 *               - type: object
 *                 required: [username, company_slug, password]
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: Nome de usuário na empresa
 *                     example: "admin"
 *                   company_slug:
 *                     type: string
 *                     description: Slug da empresa
 *                     example: "empresa-a"
 *                   password:
 *                     type: string
 *                     description: Senha do usuário
 *                     example: "minhasenha123"
 *     responses:
 *       201:
 *         description: Login realizado com sucesso
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "session_id=abc123...; Path=/; HttpOnly; SameSite=Strict"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   
 *   delete:
 *     summary: Fazer logout do sistema
 *     description: Invalida a sessão atual e limpa o cookie
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: "session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout realizado com sucesso."
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.post(postHandler);
router.delete(authorization.injectAuthenticatedUser, deleteHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userInputValues = request.body;

  let authenticatedUser;

  // Support both email and username+company login
  if (userInputValues.email) {
    authenticatedUser = await authentication.getAuthenticatedUser(
      userInputValues.email,
      userInputValues.password,
    );
  } else if (userInputValues.username && userInputValues.company_slug) {
    authenticatedUser = await authentication.getAuthenticatedUserByUsername(
      userInputValues.username,
      userInputValues.password,
      userInputValues.company_slug,
    );
  } else {
    throw new ValidationError({
      message: "Dados de login insuficientes.",
      action: "Informe email+password ou username+company_slug+password.",
    });
  }

  const newSession = await session.create(
    authenticatedUser.id,
    authenticatedUser.company_id,
  );

  controller.setSessionCookie(newSession.token, response);

  // Return session with user context
  const sessionResponse = {
    ...newSession,
    user: {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
    },
    company: {
      id: authenticatedUser.company_id,
      name: authenticatedUser.company_name,
      slug: authenticatedUser.company_slug,
    },
  };

  return response.status(201).json(sessionResponse);
}

async function deleteHandler(request, response) {
  const sessionToken = request.cookies.session_id;
  
  if (sessionToken) {
    await session.deleteByToken(sessionToken);
    
    // Clear session cookie
    response.setHeader("Set-Cookie", "session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly");
  }

  return response.status(200).json({
    message: "Logout realizado com sucesso.",
  });
}
