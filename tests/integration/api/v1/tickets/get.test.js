import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/tickets", () => {
  describe("Anonymous user", () => {
    test("Should return 401 without authentication", async () => {
      const response = await fetch("http://localhost:3000/api/v1/tickets");

      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    test("Should return empty list when no tickets exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser();

      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        { method: "GET" },
        session.token,
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(0);
    });

    test("Should return only tickets from user's company", async () => {
      const { session: session1, company: company1 } =
        await orchestrator.createAuthenticatedUser({
          role: "admin",
        });

      const { session: session2, company: company2 } =
        await orchestrator.createAuthenticatedUser({
          role: "admin",
        });

      // Create events for both companies
      const eventResponse1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento 1",
            slug: "evento-1",
          }),
        },
        session1.token,
      );

      const eventResponse2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Evento 2",
            slug: "evento-2",
          }),
        },
        session2.token,
      );

      const event1 = await eventResponse1.json();
      const event2 = await eventResponse2.json();

      // Create tickets for both companies
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event1.id,
            code: "TICKET-1",
            name: "Ingresso Empresa 1",
            price: 50.0,
            stock_total: 100,
            category: "pista",
            sales_start_at: "2024-01-01T10:00:00Z",
          }),
        },
        session1.token,
      );

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event2.id,
            code: "TICKET-2",
            name: "Ingresso Empresa 2",
            price: 75.0,
            stock_total: 200,
            category: "vip",
            sales_start_at: "2024-01-01T10:00:00Z",
          }),
        },
        session2.token,
      );

      // Company 1 should only see their tickets
      const response1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        { method: "GET" },
        session1.token,
      );

      expect(response1.status).toBe(200);

      const tickets1 = await response1.json();

      expect(tickets1.length).toBe(1);
      expect(tickets1[0].name).toBe("Ingresso Empresa 1");
      expect(tickets1[0].company_id).toBe(company1.id);

      // Company 2 should only see their tickets
      const response2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        { method: "GET" },
        session2.token,
      );

      expect(response2.status).toBe(200);

      const tickets2 = await response2.json();

      expect(tickets2.length).toBe(1);
      expect(tickets2[0].name).toBe("Ingresso Empresa 2");
      expect(tickets2[0].company_id).toBe(company2.id);
    });

    test("Should filter tickets by event ID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      // Create two events
      const eventResponse1 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Show A",
            slug: "show-a",
          }),
        },
        session.token,
      );

      const eventResponse2 = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Show B",
            slug: "show-b",
          }),
        },
        session.token,
      );

      const event1 = await eventResponse1.json();
      const event2 = await eventResponse2.json();

      // Create tickets for both events
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event1.id,
            code: "SHOW-A-TICKET",
            name: "Ingresso Show A",
            price: 50.0,
            stock_total: 100,
            category: "pista",
            sales_start_at: "2024-01-01T10:00:00Z",
          }),
        },
        session.token,
      );

      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event2.id,
            code: "SHOW-B-TICKET",
            name: "Ingresso Show B",
            price: 75.0,
            stock_total: 200,
            category: "vip",
            sales_start_at: "2024-01-01T10:00:00Z",
          }),
        },
        session.token,
      );

      // Filter by event ID
      const response = await orchestrator.makeAuthenticatedRequest(
        `http://localhost:3000/api/v1/tickets?eventId=${event1.id}`,
        { method: "GET" },
        session.token,
      );

      expect(response.status).toBe(200);

      const tickets = await response.json();

      expect(tickets.length).toBe(1);
      expect(tickets[0].event_id).toBe(event1.id);
      expect(tickets[0].name).toBe("Ingresso Show A");
    });

    test("Should filter tickets by active status", async () => {
      const { session } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const eventResponse = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Test Event",
            slug: "test-event",
          }),
        },
        session.token,
      );

      const event = await eventResponse.json();

      // Create active ticket
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event.id,
            code: "ACTIVE-TICKET",
            name: "Ingresso Ativo",
            price: 50.0,
            stock_total: 100,
            category: "pista",
            sales_start_at: "2024-01-01T10:00:00Z",
            is_active: true,
          }),
        },
        session.token,
      );

      // Create inactive ticket
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event.id,
            code: "INACTIVE-TICKET",
            name: "Ingresso Inativo",
            price: 75.0,
            stock_total: 200,
            category: "vip",
            sales_start_at: "2024-01-01T10:00:00Z",
            is_active: false,
          }),
        },
        session.token,
      );

      // Filter by active status
      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets?isActive=true",
        { method: "GET" },
        session.token,
      );

      expect(response.status).toBe(200);

      const tickets = await response.json();

      expect(tickets.length).toBe(1);
      expect(tickets[0].is_active).toBe(true);
      expect(tickets[0].name).toBe("Ingresso Ativo");
    });

    test("Should filter tickets by category", async () => {
      const { session } = await orchestrator.createAuthenticatedUser({
        role: "admin",
      });

      const eventResponse = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_name: "Test Event",
            slug: "test-event",
          }),
        },
        session.token,
      );

      const event = await eventResponse.json();

      // Create VIP ticket
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event.id,
            code: "VIP-TICKET",
            name: "Ingresso VIP",
            price: 100.0,
            stock_total: 50,
            category: "vip",
            sales_start_at: "2024-01-01T10:00:00Z",
          }),
        },
        session.token,
      );

      // Create regular ticket
      await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            event_id: event.id,
            code: "REGULAR-TICKET",
            name: "Ingresso Pista",
            price: 50.0,
            stock_total: 200,
            category: "pista",
            sales_start_at: "2024-01-01T10:00:00Z",
          }),
        },
        session.token,
      );

      // Filter by category
      const response = await orchestrator.makeAuthenticatedRequest(
        "http://localhost:3000/api/v1/tickets?category=vip",
        { method: "GET" },
        session.token,
      );

      expect(response.status).toBe(200);

      const tickets = await response.json();

      expect(tickets.length).toBe(1);
      expect(tickets[0].category).toBe("vip");
      expect(tickets[0].name).toBe("Ingresso VIP");
    });
  });
});
