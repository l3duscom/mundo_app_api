import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import event from "models/event.js";
import corsMiddleware from "infra/cors.js";

/**
 * @swagger
 * /api/v1/events:
 *   get:
 *     summary: Listar eventos da empresa
 *     description: Retorna todos os eventos da empresa com opções de filtro
 *     tags:
 *       - Events
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo/inativo
 *         example: true
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar eventos a partir desta data
 *         example: "2024-01-01"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria do evento
 *         example: "show"
 *     responses:
 *       200:
 *         description: Lista de eventos retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   post:
 *     summary: Criar novo evento
 *     description: |
 *       Cria um novo evento na empresa. Requer permissões de Admin ou Manager.
 *       O evento será automaticamente associado à empresa do usuário criador.
 *     tags:
 *       - Events
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event_name]
 *             properties:
 *               event_name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Nome do evento
 *                 example: "Show da Banda XYZ"
 *               slug:
 *                 type: string
 *                 maxLength: 128
 *                 description: Slug único do evento (opcional - gerado automaticamente se não fornecido)
 *                 example: "show-banda-xyz"
 *               free:
 *                 type: boolean
 *                 description: Se o evento é gratuito
 *                 example: false
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Data de início
 *                 example: "2024-12-31"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: Horário de início
 *                 example: "20:00"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Data de término
 *                 example: "2024-12-31"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: Horário de término
 *                 example: "23:00"
 *               description:
 *                 type: string
 *                 description: Descrição do evento
 *                 example: "Um show incrível da banda XYZ"
 *               category:
 *                 type: string
 *                 description: Categoria do evento
 *                 example: "show"
 *               place:
 *                 type: string
 *                 description: Local do evento
 *                 example: "Teatro Municipal"
 *               address:
 *                 type: string
 *                 description: Endereço do evento
 *                 example: "Rua das Flores, 123"
 *               city:
 *                 type: string
 *                 description: Cidade do evento
 *                 example: "São Paulo"
 *               state:
 *                 type: string
 *                 description: Estado do evento
 *                 example: "SP"
 *               active:
 *                 type: boolean
 *                 default: true
 *                 description: Se o evento está ativo
 *               visibility:
 *                 type: string
 *                 enum: ["public", "private", "draft", "hidden"]
 *                 description: Visibilidade do evento
 *                 example: "public"
 *               integration:
 *                 type: integer
 *                 description: ID da integração (se aplicável)
 *                 example: 1
 *     responses:
 *       201:
 *         description: Evento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(corsMiddleware);
router.options((req, res) => res.status(200).end());
router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.post(authorization.requireRole(["admin", "manager"]), postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const companyId = request.context.company.id;
  const { active, startDate, category } = request.query;

  const filters = {};
  if (active !== undefined) filters.active = active === "true";
  if (startDate) filters.startDate = startDate;
  if (category) filters.category = category;

  const events = await event.findAllByCompany(companyId, filters);

  return response.status(200).json(events);
}

async function postHandler(request, response) {
  const eventInputValues = request.body;
  const userId = request.context.user.id;
  const companyId = request.context.company.id;

  const newEvent = await event.create(eventInputValues, userId, companyId);

  return response.status(201).json(newEvent);
}
