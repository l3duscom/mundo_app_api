import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import client from "models/client.js";

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.patch(authorization.requireRole(["admin", "manager", "operator"]), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const id = request.query.id;
  const companyId = request.context.company.id;
  
  const clientData = await client.findOneById(id, companyId);
  
  return response.status(200).json(clientData);
}

async function patchHandler(request, response) {
  const id = request.query.id;
  const clientInputValues = request.body;
  const companyId = request.context.company.id;
  
  const updatedClient = await client.update(id, clientInputValues, companyId);
  
  return response.status(200).json(updatedClient);
}