# 📊 Mundo App API - SaaS Multi-Tenant

API completa para gestão de eventos e venda de ingressos multi-empresas.

## 🚀 Documentação Interativa

A documentação completa da API está disponível em:

- **Desenvolvimento**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Produção**: [https://api.mundoapp.com/api-docs](https://api.mundoapp.com/api-docs)
- **JSON Schema**: [http://localhost:3000/api/swagger.json](http://localhost:3000/api/swagger.json)

## 🏗️ Arquitetura Multi-Tenant

Esta API implementa um sistema SaaS completo com isolamento total de dados por empresa:

### 🔐 Autenticação
- **Cookie-based**: Sessões seguras com cookies HTTP-only
- **Duplo login**: Email global OU username+empresa
- **Multi-tenant**: Contexto automático da empresa

### 👥 Roles e Permissões
- **Admin**: Gestão completa da empresa
- **Manager**: Eventos, usuários e relatórios  
- **Operator**: Vendas e atendimento
- **Viewer**: Apenas visualização

### 📊 Subscription Management
- **Free**: Funcionalidades básicas
- **Premium**: Recursos avançados
- **Enterprise**: Funcionalidades completas
- **Status**: Active/Suspended/Cancelled

## 🛠️ Endpoints Principais

### Autenticação
```bash
# Login por email
POST /api/v1/sessions
{
  "email": "admin@empresa.com",
  "password": "senha123"
}

# Login por empresa
POST /api/v1/sessions
{
  "username": "admin",
  "company_slug": "minha-empresa", 
  "password": "senha123"
}

# Logout
DELETE /api/v1/sessions
```

### Usuários
```bash
# Listar usuários da empresa
GET /api/v1/users

# Criar usuário
POST /api/v1/users
{
  "username": "novo.usuario",
  "email": "novo@empresa.com",
  "password": "senha123",
  "role": "manager"
}

# Dados do usuário atual
GET /api/v1/user
```

### Eventos
```bash
# Listar eventos
GET /api/v1/events?active=true&category=show

# Criar evento
POST /api/v1/events
{
  "event_name": "Show da Banda XYZ",
  "slug": "show-banda-xyz",
  "start_date": "2024-12-31",
  "start_time": "20:00",
  "category": "show",
  "place": "Teatro Municipal"
}

# Buscar por slug
GET /api/v1/events/show-banda-xyz
```

### Ingressos
```bash
# Listar ingressos
GET /api/v1/tickets?eventId=uuid&isActive=true

# Criar ingresso
POST /api/v1/tickets
{
  "event_id": "uuid",
  "code": "VIP-001",
  "name": "Ingresso VIP",
  "price": 100.00,
  "stock_total": 50,
  "category": "vip",
  "sales_start_at": "2024-01-01T10:00:00Z"
}

# Ingressos por evento
GET /api/v1/events/show-banda-xyz/tickets
```

### Clientes
```bash
# Listar clientes
GET /api/v1/clients?limit=50&offset=0

# Criar cliente
POST /api/v1/clients
{
  "name": "João Silva",
  "cpfcnpj": "12345678901",
  "premium": true
}
```

## 🔒 Segurança

### Headers de Autenticação
Todas as rotas autenticadas usam cookies:
```bash
Cookie: session_id=abc123...
```

### Isolamento Multi-Tenant
- ✅ Todas as queries filtram por `company_id`
- ✅ Validação automática de empresa ativa
- ✅ Verificação de subscription válida
- ✅ Controle de acesso por role

### Rate Limiting
- Implementar rate limiting por IP/empresa
- Monitoramento de tentativas de login
- Logs de auditoria por empresa

## 📈 Filtros e Paginação

### Parâmetros Comuns
```bash
# Paginação
?limit=50&offset=100

# Filtros booleanos
?active=true&premium=false

# Filtros de data
?startDate=2024-01-01&endDate=2024-12-31

# Filtros de texto
?category=show&search=banda
```

## 🚦 Códigos de Status

| Status | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Erro de validação |
| `401` | Não autorizado |
| `403` | Permissão insuficiente |
| `404` | Não encontrado |
| `500` | Erro interno |

## 📋 Exemplos de Uso

### Workflow Completo
```bash
# 1. Login
POST /api/v1/sessions
{
  "username": "admin",
  "company_slug": "minha-empresa",
  "password": "senha123"
}

# 2. Criar evento
POST /api/v1/events
{
  "event_name": "Festival de Verão",
  "slug": "festival-verao-2024",
  "start_date": "2024-02-15",
  "category": "festival"
}

# 3. Criar ingressos
POST /api/v1/tickets
{
  "event_id": "evento-uuid",
  "code": "PISTA-001", 
  "name": "Pista",
  "price": 80.00,
  "stock_total": 1000
}

# 4. Listar vendas
GET /api/v1/tickets?eventId=evento-uuid&isActive=true
```

## 🛠️ Desenvolvimento

### Testar API Localmente
```bash
# Iniciar servidor
npm run dev

# Acessar documentação
open http://localhost:3000/api-docs

# Verificar status
curl http://localhost:3000/api/v1/status
```

### Validar Schema
```bash
# Baixar schema OpenAPI
curl http://localhost:3000/api/swagger.json > api-schema.json

# Validar com ferramentas externas
swagger-validator api-schema.json
```

## 📞 Suporte

- **Documentação**: `/api-docs`
- **Status**: `/api/v1/status` 
- **Schema**: `/api/swagger.json`
- **Email**: api@mundoapp.com

---

**🎯 Esta API está pronta para produção com isolamento completo multi-tenant!**