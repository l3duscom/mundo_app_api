import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import orchestrator from "tests/orchestrator.js";
import session from "models/session.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    describe("Login by email", () => {
      test("With incorrect `email` but correct `password`", async () => {
        const { user } = await orchestrator.createAuthenticatedUser({
          password: "senha-correta",
        });

        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "email.errado@curso.dev",
            password: "senha-correta",
          }),
        });

        expect(response.status).toBe(401);

        const responseBody = await response.json();

        expect(responseBody).toEqual({
          name: "UnauthorizedError",
          message: "Dados de autenticação não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
          status_code: 401,
        });
      });

      test("With correct `email` but incorrect `password`", async () => {
        const { user } = await orchestrator.createAuthenticatedUser({
          email: "email.correto@curso.dev",
        });

        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "email.correto@curso.dev",
            password: "senha-incorreta",
          }),
        });

        expect(response.status).toBe(401);

        const responseBody = await response.json();

        expect(responseBody).toEqual({
          name: "UnauthorizedError",
          message: "Dados de autenticação não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
          status_code: 401,
        });
      });

      test("With correct `email` and correct `password`", async () => {
        const { user, company } = await orchestrator.createAuthenticatedUser({
          email: "tudo.correto@curso.dev",
          password: "tudocorreto",
        });

        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "tudo.correto@curso.dev",
            password: "tudocorreto",
          }),
        });

        expect(response.status).toBe(201);

        const responseBody = await response.json();

        expect(responseBody).toEqual({
          id: responseBody.id,
          token: responseBody.token,
          user_id: user.id,
          company_id: company.id,
          expires_at: responseBody.expires_at,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
          },
          created_at: responseBody.created_at,
          updated_at: responseBody.updated_at,
        });

        expect(uuidVersion(responseBody.id)).toBe(4);
        expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
        expect(Date.parse(responseBody.created_at)).not.toBeNaN();
        expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

        const expiresAt = new Date(responseBody.expires_at);
        const createdAt = new Date(responseBody.created_at);

        expiresAt.setMilliseconds(0);
        createdAt.setMilliseconds(0);

        expect(expiresAt - createdAt).toBe(session.EXPIRATION_IN_MILLISECONDS);

        const parsedSetCookie = setCookieParser(response, {
          map: true,
        });

        expect(parsedSetCookie.session_id).toEqual({
          name: "session_id",
          value: responseBody.token,
          maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
          path: "/",
          httpOnly: true,
          sameSite: "Strict",
        });
      });
    });

    describe("Login by username and company", () => {
      test("With correct `username`, correct `company_slug` and correct `password`", async () => {
        const { user, company } = await orchestrator.createAuthenticatedUser({
          username: "testuser",
          password: "senhatest",
        }, {
          slug: "test-company"
        });

        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "testuser",
            company_slug: "test-company",
            password: "senhatest",
          }),
        });

        expect(response.status).toBe(201);

        const responseBody = await response.json();

        expect(responseBody.user_id).toBe(user.id);
        expect(responseBody.company_id).toBe(company.id);
        expect(responseBody.user.username).toBe("testuser");
        expect(responseBody.company.slug).toBe("test-company");
      });

      test("With incorrect `username` but correct `company_slug` and `password`", async () => {
        const { user, company } = await orchestrator.createAuthenticatedUser({
          username: "testuser2",
          password: "senhatest2",
        }, {
          slug: "test-company2"
        });

        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "wronguser",
            company_slug: "test-company2",
            password: "senhatest2",
          }),
        });

        expect(response.status).toBe(401);

        const responseBody = await response.json();

        expect(responseBody).toEqual({
          name: "UnauthorizedError",
          message: "Dados de autenticação não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
          status_code: 401,
        });
      });

      test("With correct `username` but incorrect `company_slug`", async () => {
        const { user, company } = await orchestrator.createAuthenticatedUser({
          username: "testuser3",
          password: "senhatest3",
        }, {
          slug: "test-company3"
        });

        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "testuser3",
            company_slug: "wrong-company",
            password: "senhatest3",
          }),
        });

        expect(response.status).toBe(401);

        const responseBody = await response.json();

        expect(responseBody).toEqual({
          name: "UnauthorizedError",
          message: "Dados de autenticação não conferem.",
          action: "Verifique se os dados enviados estão corretos.",
          status_code: 401,
        });
      });
    });

    describe("Logout", () => {
      test("DELETE /api/v1/sessions with valid session", async () => {
        const { session: testSession } = await orchestrator.createAuthenticatedUser();

        const response = await orchestrator.makeAuthenticatedRequest(
          "http://localhost:3000/api/v1/sessions",
          {
            method: "DELETE",
          },
          testSession.token
        );

        expect(response.status).toBe(200);

        const responseBody = await response.json();
        expect(responseBody.message).toBe("Logout realizado com sucesso.");

        const parsedSetCookie = setCookieParser(response, {
          map: true,
        });

        expect(parsedSetCookie.session_id.value).toBe("");
        expect(parsedSetCookie.session_id.expires.getTime()).toBeLessThan(Date.now());
      });

      test("DELETE /api/v1/sessions without session", async () => {
        const response = await fetch("http://localhost:3000/api/v1/sessions", {
          method: "DELETE",
        });

        expect(response.status).toBe(401);

        const responseBody = await response.json();

        expect(responseBody).toEqual({
          name: "UnauthorizedError",
          message: "Usuário não autenticado.",
          action: "Faça login para continuar.",
          status_code: 401,
        });
      });
    });
  });
});
