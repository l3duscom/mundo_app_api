import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import ticket from "models/ticket.js";

/**
 * @swagger
 * /api/v1/tickets:
 *   get:
 *     summary: Listar ingressos da empresa
 *     description: Retorna todos os ingressos da empresa com opções de filtro
 *     tags:
 *       - Tickets
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por ID do evento
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo/inativo
 *         example: true
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria do ingresso
 *         example: "vip"
 *     responses:
 *       200:
 *         description: Lista de ingressos retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ticket'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   post:
 *     summary: Criar novo ingresso
 *     description: |
 *       Cria um novo ingresso para um evento. Requer permissões de Admin ou Manager.
 *       O ingresso será automaticamente associado à empresa do usuário criador.
 *     tags:
 *       - Tickets
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event_id, code, name, price, stock_total, category, sales_start_at]
 *             properties:
 *               event_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do evento
 *               code:
 *                 type: string
 *                 maxLength: 128
 *                 description: Código único do ingresso (por empresa)
 *                 example: "VIP-001"
 *               name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Nome do ingresso
 *                 example: "Ingresso VIP"
 *               unit_value:
 *                 type: number
 *                 format: decimal
 *                 description: Valor unitário
 *                 example: 50.00
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: Preço de venda
 *                 example: 100.00
 *               currency:
 *                 type: string
 *                 maxLength: 3
 *                 default: "BRL"
 *                 description: Moeda do preço
 *               quantity:
 *                 type: integer
 *                 description: Quantidade por compra
 *                 example: 1
 *               stock_total:
 *                 type: integer
 *                 description: Estoque total disponível
 *                 example: 100
 *               type:
 *                 type: string
 *                 description: Tipo do ingresso
 *                 example: "individual"
 *               category:
 *                 type: string
 *                 description: Categoria do ingresso
 *                 example: "vip"
 *               sales_start_at:
 *                 type: string
 *                 format: date-time
 *                 description: Início das vendas
 *                 example: "2024-01-01T10:00:00Z"
 *               sales_end_at:
 *                 type: string
 *                 format: date-time
 *                 description: Fim das vendas
 *                 example: "2024-12-31T23:59:59Z"
 *               batch_no:
 *                 type: integer
 *                 default: 1
 *                 description: Número do lote
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Descrição do ingresso
 *                 example: "Ingresso VIP com acesso aos camarotes"
 *     responses:
 *       201:
 *         description: Ingresso criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.post(authorization.requireRole(["admin", "manager"]), postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const companyId = request.context.company.id;
  const { eventId, isActive, category } = request.query;

  const filters = {};
  if (eventId) filters.eventId = eventId;
  if (isActive !== undefined) filters.isActive = isActive === "true";
  if (category) filters.category = category;

  const tickets = await ticket.findAllByCompany(companyId, filters);

  return response.status(200).json(tickets);
}

async function postHandler(request, response) {
  const ticketInputValues = request.body;
  const userId = request.context.user.id;
  const companyId = request.context.company.id;

  const newTicket = await ticket.create(ticketInputValues, userId, companyId);

  return response.status(201).json(newTicket);
}
