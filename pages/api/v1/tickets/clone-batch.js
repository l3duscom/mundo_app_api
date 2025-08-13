import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import ticket from "models/ticket.js";
import { ValidationError } from "infra/errors.js";

/**
 * @swagger
 * /api/v1/tickets/clone-batch:
 *   post:
 *     summary: Clonar lote de ingressos do evento
 *     description: |
 *       Clona todos os ingressos de um evento específico com novos parâmetros. Requer permissões de Admin ou Manager.
 *       Os códigos dos novos ingressos serão gerados automaticamente baseados nos originais.
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
 *             required: [eventId]
 *             properties:
 *               eventId:
 *                 type: string
 *                 format: uuid
 *                 description: ID do evento cujos ingressos serão clonados
 *                 example: "e5d8dafb-0e19-47f7-8913-160eb51d2d65"
 *               newEventId:
 *                 type: string
 *                 format: uuid
 *                 description: ID do novo evento (opcional - usa o mesmo se não fornecido)
 *                 example: "e5d8dafb-0e19-47f7-8913-160eb51d2d65"
 *               batchNo:
 *                 type: integer
 *                 description: Número do novo lote (opcional - incrementa automaticamente se não fornecido)
 *                 example: 2
 *               batchDate:
 *                 type: string
 *                 format: date-time
 *                 description: Data do novo lote
 *                 example: "2024-02-01T00:00:00Z"
 *               newStock:
 *                 type: integer
 *                 description: Novo estoque total para todos os ingressos (opcional - usa o original se não fornecido)
 *                 example: 100
 *               priceIncreasePercentage:
 *                 type: number
 *                 format: float
 *                 description: Porcentagem de aumento do preço para todos os ingressos (0-100)
 *                 example: 15.5
 *               salesStartAt:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data de início das vendas
 *                 example: "2024-02-01T10:00:00Z"
 *               salesEndAt:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data de fim das vendas
 *                 example: "2024-02-28T23:59:59Z"
 *     responses:
 *       201:
 *         description: Lote de ingressos clonado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lote de ingressos clonado com sucesso."
 *                 clonedCount:
 *                   type: integer
 *                   example: 5
 *                 tickets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.post(authorization.requireRole(["admin", "manager"]), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const { eventId, ...cloneOptions } = request.body;
  const userId = request.context.user.id;
  const companyId = request.context.company.id;

  if (!eventId) {
    throw new ValidationError({
      message: "O campo eventId é obrigatório.",
      action: "Forneça o ID do evento cujos ingressos serão clonados.",
    });
  }

  const clonedTickets = await ticket.cloneBatchTickets(
    eventId,
    cloneOptions,
    userId,
    companyId
  );

  return response.status(201).json({
    message: "Lote de ingressos clonado com sucesso.",
    clonedCount: clonedTickets.length,
    tickets: clonedTickets,
  });
}