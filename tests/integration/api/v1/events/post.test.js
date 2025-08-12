import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/events", () => {
  describe("Anonymous user", () => {
    test("Should return 401 without authentication", async () => {
      const response = await fetch("http://localhost:3000/api/v1/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_name: "Test Event",
          slug: "test-event",
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    test("Admin can create event with valid data", async () => {
      const {
        session: adminSession,
        company,
        user,
      } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const eventData = {
        event_name: "Festival de Verão",
        slug: "festival-verao-2024",
        free: false,
        start_date: "2024-02-15",
        start_time: "20:00",
        end_date: "2024-02-15",
        end_time: "23:00",
        description: "Um festival incrível de verão",
        category: "festival",
        place: "Praia de Copacabana",
        address: "Av. Atlântica, 1000",
        city: "Rio de Janeiro",
        state: "RJ",
        active: true,
      };

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify(eventData),
        },
        adminSession.token,
      );

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        user_id: user.id,
        company_id: company.id,
        event_name: "Festival de Verão",
        slug: "festival-verao-2024",
        free: false,
        start_date: "2024-02-15",
        start_time: "20:00:00",
        end_date: "2024-02-15",
        end_time: "23:00:00",
        description: "Um festival incrível de verão",
        category: "festival",
        place: "Praia de Copacabana",
        address: "Av. Atlântica, 1000",
        city: "Rio de Janeiro",
        state: "RJ",
        active: true,
        created_by_username: user.username,
        ticket_types_count: 0,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("Manager can create event", async () => {
      const { session: managerSession } =
        await orchestrator.createAuthenticatedUser({
          role: "manager",
        });

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Manager",
            slug: "evento-manager",
          }),
        },
        managerSession.token,
      );

      expect(response.status).toBe(201);
    });

    test("Operator cannot create event", async () => {
      const { session: operatorSession } =
        await orchestrator.createAuthenticatedUser({
          role: "operator",
        });

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Não Autorizado",
            slug: "evento-nao-autorizado",
          }),
        },
        operatorSession.token,
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para acessar este recurso.",
        action: "Verifique se você possui as permissões necessárias.",
        status_code: 403,
      });
    });

    test("Slug can be duplicated across different companies", async () => {
      const { session: session1 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const { session: session2 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const response1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Empresa 1",
            slug: "same-slug",
          }),
        },
        session1.token,
      );

      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Empresa 2",
            slug: "same-slug",
          }),
        },
        session2.token,
      );

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const event1 = await response1.json();
      const event2 = await response2.json();

      expect(event1.slug).toBe("same-slug");
      expect(event2.slug).toBe("same-slug");
      expect(event1.company_id).not.toBe(event2.company_id);
    });

    test("Slug cannot be duplicated within same company", async () => {
      const { session: adminSession } =
        await orchestrator.createAuthenticatedUser({
          role: "admin",
        });

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Primeiro Evento",
            slug: "duplicated-slug",
          }),
        },
        adminSession.token,
      );

      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Segundo Evento",
            slug: "duplicated-slug",
          }),
        },
        adminSession.token,
      );

      expect(response2.status).toBe(400);

      const responseBody = await response2.json();

      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toContain("slug");
    });

    test("Should validate required fields", async () => {
      const { session: adminSession } =
        await orchestrator.createAuthenticatedUser({
          role: "admin",
        });

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            // Missing event_name and slug
            category: "show",
          }),
        },
        adminSession.token,
      );

      expect(response.status).toBe(400);

      const responseBody = await response.json();

      expect(responseBody.name).toBe("ValidationError");
    });
  });
});
