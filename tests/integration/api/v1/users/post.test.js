import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import password from "models/password.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("Should return 401 without authentication", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "filipedeschamps",
          email: "contato@curso.dev",
          password: "senha123",
        }),
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

  describe("Authenticated user", () => {
    test("Admin can create user with unique and valid data", async () => {
      const { session: adminSession } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "newuser",
            email: "newuser@empresa.com",
            password: "senha123",
            role: "operator",
          }),
        },
        adminSession.token
      );

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        company_id: responseBody.company_id,
        username: "newuser",
        email: "newuser@empresa.com",
        role: "operator",
        status: true,
        company_name: responseBody.company_name,
        company_slug: responseBody.company_slug,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(uuidVersion(responseBody.company_id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      const userInDatabase = await user.findOneByUsername("newuser", responseBody.company_id);
      const correctPasswordMatch = await password.compare(
        "senha123",
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
    });

    test("Manager can create user", async () => {
      const { session: managerSession } = await orchestrator.createAuthenticatedUser({
        role: "manager",
      });

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "manageduser",
            email: "manageduser@empresa.com",
            password: "senha123",
            role: "viewer",
          }),
        },
        managerSession.token
      );

      expect(response.status).toBe(201);
      expect((await response.json()).role).toBe("viewer");
    });

    test("Operator cannot create user", async () => {
      const { session: operatorSession } = await orchestrator.createAuthenticatedUser({
        role: "operator",
      });

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "unauthorizeduser",
            email: "unauthorizeduser@empresa.com",
            password: "senha123",
          }),
        },
        operatorSession.token
      );

      const responseBody = await response.json();
      console.log('Operator response status:', response.status);
      console.log('Operator response body:', responseBody);

      expect(response.status).toBe(403);

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar este recurso.",
        action: "Verifique se você possui as permissões necessárias.",
        status_code: 403,
      });
    });

    test("With duplicated email (global)", async () => {
      const { session: adminSession1 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
        email: "admin1@empresa1.com",
      });

      const { session: adminSession2 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
        email: "admin2@empresa2.com",
      });

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "user1",
            email: "duplicated@email.com",
            password: "senha123",
          }),
        },
        adminSession1.token
      );

      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "user2",
            email: "duplicated@email.com",
            password: "senha123",
          }),
        },
        adminSession2.token
      );

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });

    test("Username can be duplicated across different companies", async () => {
      const { session: adminSession1 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const { session: adminSession2 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const response1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "sameusername",
            email: "user1@empresa1.com",
            password: "senha123",
          }),
        },
        adminSession1.token
      );

      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "sameusername",
            email: "user2@empresa2.com",
            password: "senha123",
          }),
        },
        adminSession2.token
      );

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const user1 = await response1.json();
      const user2 = await response2.json();

      expect(user1.username).toBe("sameusername");
      expect(user2.username).toBe("sameusername");
      expect(user1.company_id).not.toBe(user2.company_id);
    });

    test("Username cannot be duplicated within same company", async () => {
      const { session: adminSession } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "duplicateduser",
            email: "user1@empresa.com",
            password: "senha123",
          }),
        },
        adminSession.token
      );

      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "duplicateduser",
            email: "user2@empresa.com",
            password: "senha123",
          }),
        },
        adminSession.token
      );

      expect(response2.status).toBe(400);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        status_code: 400,
      });
    });
  });

  describe("GET /api/v1/users", () => {
    test("Admin can list all users from their company", async () => {
      const { session: adminSession, company } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "listuser1",
            email: "listuser1@empresa.com",
            password: "senha123",
            role: "manager",
          }),
        },
        adminSession.token
      );

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "POST",
          body: JSON.stringify({
            username: "listuser2",
            email: "listuser2@empresa.com",
            password: "senha123",
            role: "operator",
          }),
        },
        adminSession.token
      );

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "GET",
        },
        adminSession.token
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(3); // admin + 2 created users

      responseBody.forEach(user => {
        expect(user.company_id).toBe(company.id);
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).not.toHaveProperty('password');
      });
    });

    test("Users cannot see users from other companies", async () => {
      const { session: adminSession1, company: company1 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const { session: adminSession2, company: company2 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const response1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "GET",
        },
        adminSession1.token
      );

      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/users",
        {
          method: "GET",
        },
        adminSession2.token
      );

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const users1 = await response1.json();
      const users2 = await response2.json();

      users1.forEach(user => {
        expect(user.company_id).toBe(company1.id);
      });

      users2.forEach(user => {
        expect(user.company_id).toBe(company2.id);
      });

      expect(users1.some(user => user.company_id === company2.id)).toBe(false);
      expect(users2.some(user => user.company_id === company1.id)).toBe(false);
    });
  });
});
