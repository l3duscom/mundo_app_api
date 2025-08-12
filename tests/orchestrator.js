import retry from "async-retry";
import { faker } from "@faker-js/faker";

import database from "infra/database.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import session from "models/session.js";
import company from "models/company.js";

async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createCompany(companyObject) {
  const companyData = {
    name: companyObject?.name || faker.company.name(),
    slug:
      companyObject?.slug ||
      faker.helpers.slugify(faker.company.name()).toLowerCase(),
    cnpj: companyObject?.cnpj || faker.string.numeric(14),
    subscription_plan: companyObject?.subscription_plan || "free",
    subscription_status: companyObject?.subscription_status || "active",
    settings: companyObject?.settings || {},
    is_active:
      companyObject?.is_active !== undefined ? companyObject.is_active : true,
  };

  return await company.create(companyData);
}

async function createUser(userObject, companyId) {
  if (!companyId) {
    const testCompany = await createCompany();
    companyId = testCompany.id;
  }

  const userData = {
    company_id: companyId,
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
    role: userObject?.role || "admin",
    status: userObject?.status !== undefined ? userObject.status : true,
  };

  return await user.create(userData);
}

async function createSession(userId, companyId) {
  return await session.create(userId, companyId);
}

async function createAuthenticatedUser(userObject, companyObject) {
  const createdCompany = companyObject
    ? await createCompany(companyObject)
    : await createCompany();
  const createdUser = await createUser(userObject, createdCompany.id);
  const createdSession = await createSession(createdUser.id, createdCompany.id);

  return {
    user: createdUser,
    company: createdCompany,
    session: createdSession,
  };
}

async function makeAuthenticatedRequest(url, options = {}, sessionToken) {
  const headers = {
    "Content-Type": "application/json",
    Cookie: `session_id=${sessionToken}`,
    ...options.headers,
  };

  return await fetch(url, {
    ...options,
    headers,
  });
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createCompany,
  createUser,
  createSession,
  createAuthenticatedUser,
  makeAuthenticatedRequest,
};

export default orchestrator;
