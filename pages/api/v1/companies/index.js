import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import company from "models/company.js";

/**
 * @swagger
 * /api/v1/companies:
 *   get:
 *     summary: Obter dados da empresa atual
 *     description: Retorna os dados da empresa do usuário autenticado
 *     tags:
 *       - Companies
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados da empresa retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   
 *   post:
 *     summary: Criar nova empresa
 *     description: |
 *       Cria uma nova empresa no sistema. Normalmente restrito a super administradores.
 *       Esta operação é sensível e deve ser bem controlada em produção.
 *     tags:
 *       - Companies
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, cnpj]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 description: Nome da empresa
 *                 example: "Minha Empresa Ltda"
 *               slug:
 *                 type: string
 *                 maxLength: 100
 *                 description: Slug único da empresa
 *                 example: "minha-empresa"
 *               cnpj:
 *                 type: string
 *                 maxLength: 14
 *                 description: CNPJ da empresa (apenas números)
 *                 example: "12345678000195"
 *               subscription_plan:
 *                 type: string
 *                 enum: [free, premium, enterprise]
 *                 default: free
 *                 description: Plano de assinatura
 *               settings:
 *                 type: object
 *                 description: Configurações personalizadas
 *                 example: {"theme": "dark", "timezone": "America/Sao_Paulo"}
 *     responses:
 *       201:
 *         description: Empresa criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);

router.get(getHandler);
router.post(authorization.requireRole(["admin"]), postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const companyId = request.context.company.id;
  const companyData = await company.findOneById(companyId);
  
  return response.status(200).json(companyData);
}

async function postHandler(request, response) {
  // Only super admins should be able to create companies
  // This would typically be restricted further in a production environment
  const companyInputValues = request.body;
  
  const newCompany = await company.create(companyInputValues);
  
  return response.status(201).json(newCompany);
}