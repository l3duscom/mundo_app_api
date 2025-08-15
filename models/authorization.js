import session from "models/session.js";
import { UnauthorizedError, ForbiddenError } from "infra/errors.js";

async function injectAuthenticatedUser(request, response, next) {
  const sessionToken = request.cookies.session_id;

  if (!sessionToken) {
    throw new UnauthorizedError({
      message: "Usuário não autenticado.",
      action: "Faça login para continuar.",
    });
  }

  try {
    const sessionObject = await session.findOneValidByToken(sessionToken);

    // Inject user and company context into request
    request.context = {
      user: {
        id: sessionObject.user_id,
        username: sessionObject.username,
        email: sessionObject.email,
        role: sessionObject.role,
      },
      company: {
        id: sessionObject.company_id,
        name: sessionObject.company_name,
        slug: sessionObject.company_slug,
        subscription_plan: sessionObject.subscription_plan,
        subscription_status: sessionObject.subscription_status,
      },
      session: {
        id: sessionObject.id,
        token: sessionObject.token,
        expires_at: sessionObject.expires_at,
      },
    };

    next();
  } catch {
    throw new UnauthorizedError({
      message: "Sessão inválida ou expirada.",
      action: "Faça login novamente.",
    });
  }
}

function requireRole(allowedRoles) {
  return (request, response, next) => {
    if (!request.context || !request.context.user) {
      throw new UnauthorizedError({
        message: "Usuário não autenticado.",
        action: "Faça login para continuar.",
      });
    }

    const userRole = request.context.user.role;
    const roleHierarchy = {
      viewer: 1,
      operator: 2,
      manager: 3,
      admin: 4,
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = Math.min(
      ...allowedRoles.map((role) => roleHierarchy[role] || 0),
    );

    if (userLevel < requiredLevel) {
      throw new ForbiddenError({
        message: "Você não possui permissão para acessar este recurso.",
        action: "Verifique se você possui as permissões necessárias.",
      });
    }

    next();
  };
}

function requireActiveSubscription(request, response, next) {
  if (!request.context || !request.context.company) {
    throw new UnauthorizedError({
      message: "Contexto de empresa não encontrado.",
      action: "Faça login novamente.",
    });
  }

  const { subscription_status } = request.context.company;

  if (subscription_status !== "active") {
    throw new UnauthorizedError({
      message: "Subscription inativa ou suspensa.",
      action: "Entre em contato com o suporte para regularizar.",
    });
  }

  next();
}

function requirePlan(allowedPlans) {
  return (request, response, next) => {
    if (!request.context || !request.context.company) {
      throw new UnauthorizedError({
        message: "Contexto de empresa não encontrado.",
        action: "Faça login novamente.",
      });
    }

    const { subscription_plan } = request.context.company;

    if (!allowedPlans.includes(subscription_plan)) {
      throw new UnauthorizedError({
        message: "Plano insuficiente para esta funcionalidade.",
        action: "Faça upgrade do plano para acessar esta funcionalidade.",
      });
    }

    next();
  };
}

const authorization = {
  injectAuthenticatedUser,
  requireRole,
  requireActiveSubscription,
  requirePlan,
};

export default authorization;
