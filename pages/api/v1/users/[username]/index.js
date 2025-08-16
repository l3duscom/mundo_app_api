import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import user from "models/user.js";
import corsMiddleware from "infra/cors.js";

const router = createRouter();

router.use(corsMiddleware);
router.all((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

router.get(authorization.injectAuthenticatedUser, authorization.requireActiveSubscription, getHandler);
router.patch(authorization.injectAuthenticatedUser, authorization.requireActiveSubscription, authorization.requireRole(["admin", "manager"]), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const username = request.query.username;
  const companyId = request.context.company.id;

  const userFound = await user.findOneByUsername(username, companyId);

  // Remove password from response
  // eslint-disable-next-line no-unused-vars
  const { password: _password, ...userWithoutPassword } = userFound;

  return response.status(200).json(userWithoutPassword);
}

async function patchHandler(request, response) {
  const username = request.query.username;
  const userInputValues = request.body;
  const companyId = request.context.company.id;

  // First find user to get their ID
  const existingUser = await user.findOneByUsername(username, companyId);

  const updatedUser = await user.update(
    existingUser.id,
    userInputValues,
    companyId,
  );

  // Remove password from response
  // eslint-disable-next-line no-unused-vars
  const { password: _password, ...updatedUserWithoutPassword } = updatedUser;

  return response.status(200).json(updatedUserWithoutPassword);
}
