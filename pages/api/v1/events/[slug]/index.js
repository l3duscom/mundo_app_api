import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import event from "models/event.js";

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.patch(authorization.requireRole(["admin", "manager"]), patchHandler);

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
  
  const updatedEvent = await event.update(existingEvent.id, eventInputValues, companyId);
  
  return response.status(200).json(updatedEvent);
}