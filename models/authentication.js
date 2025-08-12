import user from "models/user.js";
import company from "models/company.js";
import password from "models/password.js";
import { NotFoundError, UnauthorizedError } from "infra/errors.js";

async function getAuthenticatedUser(providedEmail, providedPassword) {
  try {
    const storedUser = await findUserByEmail(providedEmail);
    await validatePassword(providedPassword, storedUser.password);
    await validateCompanyStatus(storedUser.company_id);

    return storedUser;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
      });
    }

    throw error;
  }
}

async function getAuthenticatedUserByUsername(providedUsername, providedPassword, companySlug) {
  try {
    const storedUser = await findUserByUsernameInCompany(providedUsername, companySlug);
    await validatePassword(providedPassword, storedUser.password);
    await validateCompanyStatus(storedUser.company_id);

    return storedUser;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se os dados enviados estão corretos.",
      });
    }

    throw error;
  }
}

async function findUserByEmail(providedEmail) {
  try {
    return await user.findOneByEmail(providedEmail);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new UnauthorizedError({
        message: "Email não confere.",
        action: "Verifique se este dado está correto.",
      });
    }
    throw error;
  }
}

async function findUserByUsernameInCompany(providedUsername, companySlug) {
  try {
    return await user.findOneByUsernameInCompany(providedUsername, companySlug);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new UnauthorizedError({
        message: "Username não confere.",
        action: "Verifique se este dado está correto.",
      });
    }
    throw error;
  }
}

async function validatePassword(providedPassword, storedPassword) {
  const correctPasswordMatch = await password.compare(
    providedPassword,
    storedPassword,
  );

  if (!correctPasswordMatch) {
    throw new UnauthorizedError({
      message: "Senha não confere.",
      action: "Verifique se este dado está correto.",
    });
  }
}

async function validateCompanyStatus(companyId) {
  try {
    const companyData = await company.findOneById(companyId);
    
    if (!companyData.is_active) {
      throw new UnauthorizedError({
        message: "Empresa inativa.",
        action: "Entre em contato com o suporte.",
      });
    }

    if (companyData.subscription_status === "suspended") {
      throw new UnauthorizedError({
        message: "Subscription da empresa suspensa.",
        action: "Entre em contato com o suporte para regularizar.",
      });
    }

    if (companyData.subscription_status === "cancelled") {
      throw new UnauthorizedError({
        message: "Subscription da empresa cancelada.",
        action: "Entre em contato com o suporte.",
      });
    }

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new UnauthorizedError({
        message: "Empresa não encontrada.",
        action: "Entre em contato com o suporte.",
      });
    }
    throw error;
  }
}

const authentication = {
  getAuthenticatedUser,
  getAuthenticatedUserByUsername,
};

export default authentication;
