import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import corsMiddleware from "infra/cors.js";

const router = createRouter();

router.use(corsMiddleware);
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const origin = request.headers.origin;
  
  return response.status(200).json({
    message: "CORS test endpoint",
    origin: origin,
    method: request.method,
    headers: request.headers,
    timestamp: new Date().toISOString()
  });
}

async function postHandler(request, response) {
  const origin = request.headers.origin;
  
  return response.status(200).json({
    message: "CORS POST test successful",
    origin: origin,
    method: request.method,
    body: request.body,
    timestamp: new Date().toISOString()
  });
}
