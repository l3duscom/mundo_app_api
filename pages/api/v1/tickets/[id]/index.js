import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import ticket from "models/ticket.js";

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.patch(authorization.requireRole(["admin", "manager"]), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const id = request.query.id;
  const companyId = request.context.company.id;
  
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