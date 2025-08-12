import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import client from "models/client.js";

const router = createRouter();

router.use(authorization.injectAuthenticatedUser);
router.use(authorization.requireActiveSubscription);

router.get(getHandler);
router.post(
  authorization.requireRole(["admin", "manager", "operator"]),
  postHandler,
);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const companyId = request.context.company.id;
  const { limit = 50, offset = 0 } = request.query;

  const clients = await client.findAllByCompany(
    companyId,
    parseInt(limit),
    parseInt(offset),
  );

  return response.status(200).json(clients);
}

async function postHandler(request, response) {
  const clientInputValues = request.body;
  const userId = request.context.user.id;
  const companyId = request.context.company.id;

  const newClient = await client.create(clientInputValues, userId, companyId);

  return response.status(201).json(newClient);
}
