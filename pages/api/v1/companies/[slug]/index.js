import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import company from "models/company.js";
import { UnauthorizedError } from "infra/errors.js";
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
router.patch(authorization.injectAuthenticatedUser, authorization.requireActiveSubscription, authorization.requireRole(["admin"]), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const slug = request.query.slug;
  const companyData = await company.findOneBySlug(slug);

  // Only return company data if user belongs to this company
  if (companyData.id !== request.context.company.id) {
    throw new UnauthorizedError({
      message: "Acesso negado a esta empresa.",
      action: "Verifique se você tem permissão para acessar esta empresa.",
    });
  }

  return response.status(200).json(companyData);
}

async function patchHandler(request, response) {
  const companyId = request.context.company.id;
  const companyInputValues = request.body;

  const updatedCompany = await company.update(companyId, companyInputValues);

  return response.status(200).json(updatedCompany);
}
