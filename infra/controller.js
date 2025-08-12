import * as cookie from "cookie";
import session from "models/session.js";

import {
  InternalServerError,
  MethodNotAllowedError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "infra/errors";

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  // Log context information for debugging (if available)
  const context = {
    method: request.method,
    url: request.url,
    user: request.context?.user?.id || "anonymous",
    company: request.context?.company?.slug || "unknown",
    timestamp: new Date().toISOString(),
  };

  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof UnauthorizedError
  ) {
    console.log(
      `[${error.name}] ${context.method} ${context.url} - User: ${context.user} - Company: ${context.company}`,
      error.message,
    );
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error(
    `[InternalServerError] ${context.method} ${context.url} - User: ${context.user} - Company: ${context.company}`,
    {
      error: error.message,
      stack: error.stack,
      context,
    },
  );

  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

async function setSessionCookie(sessionToken, response) {
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict", // Added for better security
  });

  response.setHeader("Set-Cookie", setCookie);
}

function clearSessionCookie(response) {
  const clearCookie = cookie.serialize("session_id", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "strict",
  });

  response.setHeader("Set-Cookie", clearCookie);
}

function logActivity(request, action, details = {}) {
  const context = {
    method: request.method,
    url: request.url,
    user: request.context?.user?.id || "anonymous",
    username: request.context?.user?.username || "unknown",
    company: request.context?.company?.slug || "unknown",
    action,
    details,
    timestamp: new Date().toISOString(),
    ip:
      request.headers["x-forwarded-for"] ||
      request.connection?.remoteAddress ||
      "unknown",
  };

  console.log(`[ACTIVITY] ${action}`, context);
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
  setSessionCookie,
  clearSessionCookie,
  logActivity,
};

export default controller;
