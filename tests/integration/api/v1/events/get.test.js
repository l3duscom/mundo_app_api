import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/events", () => {
  describe("Anonymous user", () => {
    test("Should return 401 without authentication", async () => {
      const response = await fetch("http://localhost:3000/api/v1/events");

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Token de sessão não encontrado.",
        action: "Faça login novamente para obter um novo token de sessão.",
        status_code: 401,
      });
    });
  });

  describe("Authenticated user", () => {
    test("Should return empty list when no events exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        { method: "GET" },
        session.token
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(0);
    });

    test("Should return only events from user's company", async () => {
      const { session: session1, company: company1 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const { session: session2, company: company2 } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      // Create event in company 1
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Empresa 1",
            slug: "evento-empresa-1",
            start_date: "2024-12-31",
            category: "show",
          }),
        },
        session1.token
      );

      // Create event in company 2
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Empresa 2",
            slug: "evento-empresa-2",
            start_date: "2024-12-31",
            category: "festival",
          }),
        },
        session2.token
      );

      // Company 1 should only see their event
      const response1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        { method: "GET" },
        session1.token
      );

      expect(response1.status).toBe(200);

      const events1 = await response1.json();

      expect(events1.length).toBe(1);
      expect(events1[0].event_name).toBe("Evento Empresa 1");
      expect(events1[0].company_id).toBe(company1.id);

      // Company 2 should only see their event
      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        { method: "GET" },
        session2.token
      );

      expect(response2.status).toBe(200);

      const events2 = await response2.json();

      expect(events2.length).toBe(1);
      expect(events2[0].event_name).toBe("Evento Empresa 2");
      expect(events2[0].company_id).toBe(company2.id);
    });

    test("Should filter events by category", async () => {
      const { session } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      // Create events with different categories
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Show Musical",
            slug: "show-musical",
            category: "show",
          }),
        },
        session.token
      );

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Festival de Música",
            slug: "festival-musica",
            category: "festival",
          }),
        },
        session.token
      );

      // Filter by category
      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events?category=show",
        { method: "GET" },
        session.token
      );

      expect(response.status).toBe(200);

      const events = await response.json();

      expect(events.length).toBe(1);
      expect(events[0].category).toBe("show");
      expect(events[0].event_name).toBe("Show Musical");
    });

    test("Should filter events by active status", async () => {
      const { session } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      // Create active event
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Ativo",
            slug: "evento-ativo",
            active: true,
          }),
        },
        session.token
      );

      // Create inactive event
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento Inativo",
            slug: "evento-inativo",
            active: false,
          }),
        },
        session.token
      );

      // Filter by active status
      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events?active=true",
        { method: "GET" },
        session.token
      );

      expect(response.status).toBe(200);

      const events = await response.json();

      expect(events.length).toBe(1);
      expect(events[0].active).toBe(true);
      expect(events[0].event_name).toBe("Evento Ativo");
    });
  });
});