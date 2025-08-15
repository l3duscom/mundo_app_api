import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import ticket from "models/ticket.js";
import corsMiddleware from "infra/cors.js";

/**
 * @swagger
 * /api/v1/tickets/{id}/clone:
 *   post:
 *     summary: Clonar ingresso individual
 *     description: |
 *       Clona um ingresso individual com novos parâmetros. Requer permissões de Admin ou Manager.
 *       O código do novo ingresso será gerado automaticamente baseado no original.
 *     tags:
 *       - Tickets
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do ingresso a ser clonado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *                 description: Novo estoque total (opcional - usa o mesmo se não fornecido)
 *                 example: 100
 *               priceIncreasePercentage:
 *                 type: number
 *                 format: float
 *                 description: Porcentagem de aumento do preço (0-100)
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
 *         description: Ingresso clonado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
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

router.use(corsMiddleware);
router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.post(authorization.requireRole(["admin", "manager"]), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const ticketId = request.query.id;
  const cloneOptions = request.body;
  const userId = request.context.user.id;
  const companyId = request.context.company.id;

  const clonedTicket = await ticket.cloneTicket(
    ticketId,
    cloneOptions,
    userId,
    companyId
  );

  return response.status(201).json(clonedTicket);
}