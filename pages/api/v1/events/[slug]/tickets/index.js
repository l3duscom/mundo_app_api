import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import event from "models/event.js";
import ticket from "models/ticket.js";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const slug = request.query.slug;
  const { companyId } = request.query;

  if (!companyId) {
    return response.status(400).json({
      error: "company_id é obrigatório como parâmetro de query"
    });
  }

  // First find the event by slug
  const eventData = await event.findOneBySlug(slug, companyId);

  // Then get all tickets for this event
  const tickets = await ticket.findAllByEvent(eventData.id, companyId);

  return response.status(200).json(tickets);
}
