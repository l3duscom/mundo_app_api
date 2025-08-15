import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import ticket from "models/ticket.js";

/**
 * @swagger
 * /api/v1/tickets/{id}:
 *   get:
 *     summary: Buscar ingresso por ID
 *     description: Retorna um ingresso específico da empresa pelo seu ID
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
 *         description: ID único do ingresso
 *     responses:
 *       200:
 *         description: Ingresso encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   patch:
 *     summary: Atualizar ingresso
 *     description: |
 *       Atualiza um ingresso existente. Requer permissões de Admin ou Manager.
 *       Apenas os campos fornecidos serão atualizados.
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
 *         description: ID único do ingresso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Nome do ingresso
 *               code:
 *                 type: string
 *                 maxLength: 128
 *                 description: Código único do ingresso (por empresa)
 *               price:
 *                 type: number
 *                 format: decimal
 *                 description: Preço de venda
 *               stock_total:
 *                 type: integer
 *                 description: Estoque total disponível
 *               category:
 *                 type: string
 *                 description: Categoria do ingresso
 *               sales_start_at:
 *                 type: string
 *                 format: date-time
 *                 description: Início das vendas
 *               sales_end_at:
 *                 type: string
 *                 format: date-time
 *                 description: Fim das vendas
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Descrição do ingresso
 *               is_active:
 *                 type: boolean
 *                 description: Se o ingresso está ativo
 *     responses:
 *       200:
 *         description: Ingresso atualizado com sucesso
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
 *
 *   delete:
 *     summary: Excluir ingresso
 *     description: |
 *       Exclui permanentemente um ingresso. Requer permissões de Admin ou Manager.
 *       Não é possível excluir ingressos que já possuem vendas realizadas.
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
 *         description: ID único do ingresso
 *     responses:
 *       200:
 *         description: Ingresso excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ingresso excluído com sucesso."
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

router.get(getHandler);
router.patch(authorization.injectAuthenticatedUser, authorization.requireActiveSubscription, authorization.requireRole(["admin", "manager"]), patchHandler);
router.delete(authorization.injectAuthenticatedUser, authorization.requireActiveSubscription, authorization.requireRole(["admin", "manager"]), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const id = request.query.id;
  const { companyId } = request.query;

  if (!companyId) {
    return response.status(400).json({
      error: "company_id é obrigatório como parâmetro de query"
    });
  }

  const ticketData = await ticket.findOneById(id, companyId);

  return response.status(200).json(ticketData);
}

async function patchHandler(request, response) {
  const id = request.query.id;
  const ticketInputValues = request.body;
  const companyId = request.context.company.id;

  const updatedTicket = await ticket.update(id, ticketInputValues, companyId);

  return response.status(200).json(updatedTicket);
}

async function deleteHandler(request, response) {
  const id = request.query.id;
  const companyId = request.context.company.id;

  await ticket.deleteById(id, companyId);

  return response.status(200).json({
    message: "Ingresso excluído com sucesso.",
  });
}
