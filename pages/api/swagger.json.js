import swaggerJsdoc from "swagger-jsdoc";

/**
 * @swagger
 * /api/swagger.json:
 *   get:
 *     summary: Obter especificação OpenAPI
 *     description: Retorna a especificação OpenAPI completa da API em formato JSON
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: Especificação OpenAPI retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Especificação OpenAPI 3.0
 */

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mundo App API - SaaS Multi-Tenant",
      version: "1.0.0",
      description: `
        API para gestão de eventos e venda de ingressos multi-empresas.
        
        ## Autenticação
        
        Esta API usa cookies HTTP-only para autenticação. Após fazer login via \`POST /api/v1/sessions\`, 
        o cookie de sessão será automaticamente incluído nas requisições subsequentes.
        
        ## Multi-Tenancy
        
        O sistema é multi-tenant, onde cada empresa tem seus dados completamente isolados.
        Todas as operações são realizadas no contexto da empresa do usuário autenticado.
        
        ## Roles e Permissões
        
        - **Admin**: Acesso completo à empresa
        - **Manager**: Gestão de eventos, usuários e relatórios  
        - **Operator**: Operações de venda e atendimento
        - **Viewer**: Apenas visualização
      `,
      contact: {
        name: "Suporte API",
        email: "api@mundoapp.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Desenvolvimento",
      },
      {
        url: "https://api.mundoapp.com",
        description: "Produção",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "session_id",
          description: "Cookie de sessão HTTP-only",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Não autorizado - Token inválido ou expirado",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        ValidationError: {
          description: "Erro de validação nos dados enviados",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        NotFoundError: {
          description: "Recurso não encontrado",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        InternalServerError: {
          description: "Erro interno do servidor",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["name", "message", "action", "status_code"],
          properties: {
            name: {
              type: "string",
              description: "Nome do tipo de erro",
            },
            message: {
              type: "string",
              description: "Mensagem descritiva do erro",
            },
            action: {
              type: "string",
              description: "Ação sugerida para resolver o erro",
            },
            status_code: {
              type: "integer",
              description: "Código HTTP de status",
            },
          },
        },
        Company: {
          type: "object",
          required: ["id", "name", "slug", "cnpj"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Identificador único da empresa",
            },
            name: {
              type: "string",
              maxLength: 255,
              description: "Nome da empresa",
            },
            slug: {
              type: "string",
              maxLength: 100,
              description: "Slug único da empresa (URL friendly)",
            },
            cnpj: {
              type: "string",
              maxLength: 14,
              description: "CNPJ da empresa (apenas números)",
            },
            subscription_plan: {
              type: "string",
              enum: ["free", "premium", "enterprise"],
              default: "free",
              description: "Plano de assinatura da empresa",
            },
            subscription_status: {
              type: "string",
              enum: ["active", "suspended", "cancelled"],
              default: "active",
              description: "Status da assinatura",
            },
            settings: {
              type: "object",
              description: "Configurações personalizadas da empresa",
            },
            is_active: {
              type: "boolean",
              default: true,
              description: "Se a empresa está ativa no sistema",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Data de criação",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Data da última atualização",
            },
          },
        },
        User: {
          type: "object",
          required: ["id", "company_id", "username", "email", "role"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Identificador único do usuário",
            },
            company_id: {
              type: "string",
              format: "uuid",
              description: "ID da empresa do usuário",
            },
            username: {
              type: "string",
              maxLength: 30,
              description: "Nome de usuário (único por empresa)",
            },
            email: {
              type: "string",
              format: "email",
              maxLength: 254,
              description: "Email do usuário (único globalmente)",
            },
            role: {
              type: "string",
              enum: ["admin", "manager", "operator", "viewer"],
              default: "admin",
              description: "Role do usuário na empresa",
            },
            status: {
              type: "boolean",
              default: true,
              description: "Se o usuário está ativo",
            },
            company_name: {
              type: "string",
              description: "Nome da empresa (quando incluído)",
            },
            company_slug: {
              type: "string",
              description: "Slug da empresa (quando incluído)",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Data de criação",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Data da última atualização",
            },
          },
        },
        Session: {
          type: "object",
          required: ["id", "token", "user_id", "company_id", "expires_at"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Identificador único da sessão",
            },
            token: {
              type: "string",
              description: "Token da sessão",
            },
            user_id: {
              type: "string",
              format: "uuid",
              description: "ID do usuário",
            },
            company_id: {
              type: "string",
              format: "uuid",
              description: "ID da empresa",
            },
            expires_at: {
              type: "string",
              format: "date-time",
              description: "Data de expiração da sessão",
            },
            user: {
              $ref: "#/components/schemas/UserContext",
              description: "Dados do usuário (quando incluído)",
            },
            company: {
              $ref: "#/components/schemas/CompanyContext",
              description: "Dados da empresa (quando incluído)",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Data de criação",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Data da última atualização",
            },
          },
        },
        UserContext: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            username: {
              type: "string",
            },
            email: {
              type: "string",
            },
            role: {
              type: "string",
              enum: ["admin", "manager", "operator", "viewer"],
            },
          },
        },
        CompanyContext: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
            slug: {
              type: "string",
            },
            subscription_plan: {
              type: "string",
            },
            subscription_status: {
              type: "string",
            },
          },
        },
        Event: {
          type: "object",
          required: ["id", "user_id", "company_id", "event_name", "slug"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Identificador único do evento",
            },
            user_id: {
              type: "string",
              format: "uuid",
              description: "ID do usuário criador",
            },
            company_id: {
              type: "string",
              format: "uuid",
              description: "ID da empresa",
            },
            event_name: {
              type: "string",
              maxLength: 128,
              description: "Nome do evento",
            },
            slug: {
              type: "string",
              maxLength: 128,
              description: "Slug do evento (único por empresa)",
            },
            free: {
              type: "boolean",
              description: "Se o evento é gratuito",
            },
            start_date: {
              type: "string",
              format: "date",
              description: "Data de início do evento",
            },
            start_time: {
              type: "string",
              format: "time",
              description: "Horário de início",
            },
            end_date: {
              type: "string",
              format: "date",
              description: "Data de término do evento",
            },
            end_time: {
              type: "string",
              format: "time",
              description: "Horário de término",
            },
            description: {
              type: "string",
              description: "Descrição do evento",
            },
            category: {
              type: "string",
              maxLength: 255,
              description: "Categoria do evento",
            },
            place: {
              type: "string",
              maxLength: 255,
              description: "Local do evento",
            },
            address: {
              type: "string",
              maxLength: 128,
              description: "Endereço do evento",
            },
            city: {
              type: "string",
              maxLength: 50,
              description: "Cidade do evento",
            },
            state: {
              type: "string",
              maxLength: 5,
              description: "Estado do evento",
            },
            active: {
              type: "boolean",
              default: true,
              description: "Se o evento está ativo",
            },
            created_by_username: {
              type: "string",
              description: "Username do criador (quando incluído)",
            },
            ticket_types_count: {
              type: "integer",
              description: "Quantidade de tipos de ingressos (quando incluído)",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Client: {
          type: "object",
          required: ["id", "user_id", "company_id", "name", "cpfcnpj"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Identificador único do cliente",
            },
            user_id: {
              type: "string",
              format: "uuid",
              description: "ID do usuário que cadastrou",
            },
            company_id: {
              type: "string",
              format: "uuid",
              description: "ID da empresa",
            },
            name: {
              type: "string",
              maxLength: 30,
              description: "Nome do cliente",
            },
            cpfcnpj: {
              type: "string",
              maxLength: 14,
              description: "CPF/CNPJ do cliente (único por empresa)",
            },
            premium: {
              type: "boolean",
              default: true,
              description: "Se o cliente é premium",
            },
            address_id: {
              type: "string",
              format: "uuid",
              description: "ID do endereço (opcional)",
            },
            created_by_username: {
              type: "string",
              description: "Username do criador (quando incluído)",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Ticket: {
          type: "object",
          required: [
            "id",
            "user_id",
            "company_id",
            "event_id",
            "code",
            "name",
            "price",
          ],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Identificador único do ingresso",
            },
            user_id: {
              type: "string",
              format: "uuid",
              description: "ID do usuário criador",
            },
            company_id: {
              type: "string",
              format: "uuid",
              description: "ID da empresa",
            },
            event_id: {
              type: "string",
              format: "uuid",
              description: "ID do evento",
            },
            parent_ticket_id: {
              type: "string",
              format: "uuid",
              description: "ID do ingresso pai (opcional)",
            },
            code: {
              type: "string",
              maxLength: 128,
              description: "Código do ingresso (único por empresa)",
            },
            name: {
              type: "string",
              maxLength: 128,
              description: "Nome do ingresso",
            },
            unit_value: {
              type: "number",
              format: "decimal",
              description: "Valor unitário",
            },
            price: {
              type: "number",
              format: "decimal",
              description: "Preço do ingresso",
            },
            currency: {
              type: "string",
              maxLength: 3,
              default: "BRL",
              description: "Moeda do preço",
            },
            quantity: {
              type: "integer",
              description: "Quantidade por compra",
            },
            stock_total: {
              type: "integer",
              description: "Estoque total",
            },
            stock_sold: {
              type: "integer",
              description: "Quantidade vendida",
            },
            stock_available: {
              type: "integer",
              description: "Estoque disponível (calculado)",
            },
            type: {
              type: "string",
              maxLength: 128,
              description: "Tipo do ingresso",
            },
            category: {
              type: "string",
              maxLength: 128,
              description: "Categoria do ingresso",
            },
            sales_start_at: {
              type: "string",
              format: "date-time",
              description: "Início das vendas",
            },
            sales_end_at: {
              type: "string",
              format: "date-time",
              description: "Fim das vendas",
            },
            batch_no: {
              type: "integer",
              default: 1,
              description: "Número do lote",
            },
            description: {
              type: "string",
              maxLength: 500,
              description: "Descrição do ingresso",
            },
            is_active: {
              type: "boolean",
              default: true,
              description: "Se o ingresso está ativo",
            },
            event_name: {
              type: "string",
              description: "Nome do evento (quando incluído)",
            },
            event_slug: {
              type: "string",
              description: "Slug do evento (quando incluído)",
            },
            created_by_username: {
              type: "string",
              description: "Username do criador (quando incluído)",
            },
            created_at: {
              type: "string",
              format: "date-time",
            },
            updated_at: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "Autenticação e sessões",
      },
      {
        name: "Users",
        description: "Gestão de usuários",
      },
      {
        name: "Companies",
        description: "Gestão de empresas",
      },
      {
        name: "Events",
        description: "Gestão de eventos",
      },
      {
        name: "Tickets",
        description: "Gestão de ingressos",
      },
      {
        name: "Clients",
        description: "Gestão de clientes",
      },
      {
        name: "System",
        description: "Status e informações do sistema",
      },
    ],
  },
  apis: ["./pages/api/**/*.js"], // Paths to files containing OpenAPI definitions
};

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Generate specs on server-side
  const specs = swaggerJsdoc(options);

  res.status(200).json(specs);
}
