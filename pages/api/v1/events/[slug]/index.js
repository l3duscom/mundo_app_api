import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import event from "models/event.js";
import corsMiddleware from "infra/cors.js";

/**
 * @swagger
 * /api/v1/events/{slug}:
 *   get:
 *     summary: Buscar evento por slug
 *     description: Retorna um evento específico da empresa pelo seu slug
 *     tags:
 *       - Events
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug único do evento
 *         example: "show-banda-xyz"
 *     responses:
 *       200:
 *         description: Evento encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   patch:
 *     summary: Atualizar evento
 *     description: |
 *       Atualiza um evento existente. Requer permissões de Admin ou Manager.
 *       Apenas os campos fornecidos serão atualizados.
 *     tags:
 *       - Events
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug único do evento
 *         example: "show-banda-xyz"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event_name:
 *                 type: string
 *                 maxLength: 128
 *                 description: Nome do evento
 *               slug:
 *                 type: string
 *                 maxLength: 128
 *                 description: Slug único do evento (por empresa)
 *               free:
 *                 type: boolean
 *                 description: Se o evento é gratuito
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Data de início
 *               start_time:
 *                 type: string
 *                 format: time
 *                 description: Horário de início
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Data de término
 *               end_time:
 *                 type: string
 *                 format: time
 *                 description: Horário de término
 *               description:
 *                 type: string
 *                 description: Descrição do evento
 *               category:
 *                 type: string
 *                 description: Categoria do evento
 *               place:
 *                 type: string
 *                 description: Local do evento
 *               address:
 *                 type: string
 *                 description: Endereço do evento
 *               city:
 *                 type: string
 *                 description: Cidade do evento
 *               state:
 *                 type: string
 *                 description: Estado do evento
 *               active:
 *                 type: boolean
 *                 description: Se o evento está ativo
 *     responses:
 *       200:
 *         description: Evento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
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
 *     summary: Excluir evento
 *     description: |
 *       Exclui permanentemente um evento. Requer permissões de Admin ou Manager.
 *       Não é possível excluir eventos que possuem ingressos ativos.
 *     tags:
 *       - Events
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug único do evento
 *         example: "show-banda-xyz"
 *     responses:
 *       200:
 *         description: Evento excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Evento excluído com sucesso."
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

router.get(getHandler);
router.patch(authorization.requireRole(["admin", "manager"]), patchHandler);
router.delete(authorization.requireRole(["admin", "manager"]), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const slug = request.query.slug;
  const companyId = request.context.company.id;

  const eventData = await event.findOneBySlug(slug, companyId);

  return response.status(200).json(eventData);
}

async function patchHandler(request, response) {
  const slug = request.query.slug;
  const eventInputValues = request.body;
  const companyId = request.context.company.id;

  // First find event to get its ID
  const existingEvent = await event.findOneBySlug(slug, companyId);

  const updatedEvent = await event.update(
    existingEvent.id,
    eventInputValues,
    companyId,
  );

  return response.status(200).json(updatedEvent);
}

async function deleteHandler(request, response) {
  const slug = request.query.slug;
  const companyId = request.context.company.id;

  // First find event to get its ID
  const existingEvent = await event.findOneBySlug(slug, companyId);

  await event.deleteById(existingEvent.id, companyId);

  return response.status(200).json({
    message: "Evento excluído com sucesso.",
  });
}
