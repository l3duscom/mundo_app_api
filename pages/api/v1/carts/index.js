import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import cart from "models/cart.js";
import ticket from "models/ticket.js";
import corsMiddleware from "infra/cors.js";
import { ValidationError } from "infra/errors.js";

/**
 * @swagger
 * /api/v1/carts:
 *   get:
 *     summary: Listar itens do carrinho
 *     description: Retorna todos os itens em rascunho do carrinho identificados pelo sessionToken
 *     tags:
 *       - Carts
 *     parameters:
 *       - in: query
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Token da sessão (qualquer string única)
 *     responses:
 *       200:
 *         description: Carrinho retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem informativa sobre o status do carrinho
 *                   example: "Carrinho recuperado com sucesso."
 *                 sessionToken:
 *                   type: string
 *                   description: Token da sessão
 *                 company_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                   description: ID da empresa (null se carrinho vazio)
 *                 event_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                   description: ID do evento (null se carrinho vazio)
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticket_id:
 *                         type: string
 *                         format: uuid
 *                       price:
 *                         type: number
 *                       quantity:
 *                         type: integer
 *                       currency:
 *                         type: string
 *                 totals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       total_items:
 *                         type: integer
 *                       total_quantity:
 *                         type: integer
 *                       total_amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   post:
 *     summary: Inicializar/Atualizar carrinho
 *     description: |
 *       Cria um novo carrinho ou atualiza um existente com múltiplos itens.
 *       Os campos sessionToken, company_id e event_id são imutáveis após a primeira criação.
 *       Enviar novos itens substituirá todos os itens existentes no carrinho.
 *       Não há validação do sessionToken - aceita qualquer string única.
 *     tags:
 *       - Carts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionToken, company_id, event_id, items]
 *             properties:
 *               sessionToken:
 *                 type: string
 *                 description: Token da sessão (qualquer string única para identificar o carrinho)
 *               company_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID da empresa (imutável após primeira criação)
 *               event_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do evento (imutável após primeira criação)
 *               items:
 *                 type: array
 *                 description: Lista de itens do carrinho (substitui todos os itens existentes)
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [ticket_id, price, quantity]
 *                   properties:
 *                     ticket_id:
 *                       type: string
 *                       format: uuid
 *                       description: ID do ingresso
 *                     price:
 *                       type: number
 *                       format: decimal
 *                       description: Preço unitário do ingresso
 *                       example: 100.00
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Quantidade de ingressos
 *                       example: 2
 *                     currency:
 *                       type: string
 *                       maxLength: 3
 *                       default: "BRL"
 *                       description: Moeda do preço
 *             example:
 *               sessionToken: "minha-sessao-123"
 *               company_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               event_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               items:
 *                 - ticket_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   price: 100
 *                   quantity: 2
 *                   currency: "BRL"
 *                 - ticket_id: "4fa85f64-5717-4562-b3fc-2c963f66afa7"
 *                   price: 50
 *                   quantity: 1
 *                   currency: "BRL"
 *     responses:
 *       201:
 *         description: Carrinho atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de confirmação
 *                   example: "Carrinho atualizado com sucesso."
 *                 sessionToken:
 *                   type: string
 *                   description: Token da sessão
 *                 company_id:
 *                   type: string
 *                   format: uuid
 *                   description: ID da empresa
 *                 event_id:
 *                   type: string
 *                   format: uuid
 *                   description: ID do evento
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticket_id:
 *                         type: string
 *                         format: uuid
 *                       price:
 *                         type: number
 *                       quantity:
 *                         type: integer
 *                       currency:
 *                         type: string
 *                 totals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       total_items:
 *                         type: integer
 *                       total_quantity:
 *                         type: integer
 *                       total_amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

const router = createRouter();

router.use(corsMiddleware);
router.all((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  try {
    const { sessionToken } = request.query;

    if (!sessionToken) {
      return response.status(400).json({
        error: "sessionToken é obrigatório como parâmetro de query"
      });
    }

    const cartItems = await cart.findBySessionToken(sessionToken);
    const totals = await cart.calculateTotalsBySessionToken(sessionToken);

    // Extract basic cart info from first item (if exists)
    let company_id = null;
    let event_id = null;
    if (cartItems.length > 0) {
      company_id = cartItems[0].company_id;
      event_id = cartItems[0].event_id;
    }

    // Transform items to simplified format
    const simplifiedItems = cartItems.map(item => ({
      ticket_id: item.ticket_id,
      price: parseFloat(item.price),
      quantity: item.quantity,
      currency: item.currency
    }));

    const message = cartItems.length === 0 ? "Carrinho vazio." : "Carrinho recuperado com sucesso.";

    return response.status(200).json({
      message: message,
      sessionToken: sessionToken,
      company_id: company_id,
      event_id: event_id,
      items: simplifiedItems,
      totals: totals.map(total => ({
        total_items: parseInt(total.total_items),
        total_quantity: parseInt(total.total_quantity),
        total_amount: parseFloat(total.total_amount),
        currency: total.currency
      }))
    });
  } catch (error) {
    // Handle errors manually since next-connect isn't catching them properly
    if (error.statusCode) {
      return response.status(error.statusCode).json(error);
    }
    return response.status(500).json({
      message: "Erro interno do servidor.",
      action: "Tente novamente mais tarde."
    });
  }
}

async function postHandler(request, response) {
  try {
    const { sessionToken, company_id, event_id, items } = request.body;

  // Validate required fields
  if (!sessionToken) {
    throw new ValidationError({
      message: "Token da sessão é obrigatório.",
      action: "Forneça um sessionToken válido.",
    });
  }

  if (!company_id || !event_id || !items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError({
      message: "Campos obrigatórios: sessionToken, company_id, event_id, items (array não vazio).",
      action: "Forneça todos os campos obrigatórios.",
    });
  }

  // Validate UUID format for company_id and event_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(company_id)) {
    throw new ValidationError({
      message: "ID da empresa inválido.",
      action: "Forneça um ID de empresa válido no formato UUID.",
    });
  }

  if (!uuidRegex.test(event_id)) {
    throw new ValidationError({
      message: "ID do evento inválido.",
      action: "Forneça um ID de evento válido no formato UUID.",
    });
  }

  // Check if cart already exists for this session
  const existingCart = await cart.findBySessionToken(sessionToken);
  if (existingCart.length > 0) {
    // Validate that session, company and event are immutable
    const firstExistingItem = existingCart[0];
    if (firstExistingItem.company_id !== company_id || firstExistingItem.event_id !== event_id) {
      throw new ValidationError({
        message: "Não é possível alterar company_id ou event_id de um carrinho existente.",
        action: "Use um novo sessionToken ou mantenha os mesmos company_id e event_id.",
      });
    }
    
    // Clear existing items to replace with new ones
    await cart.clearDraftsBySessionToken(sessionToken);
  }

  const createdItems = [];

  // Process each item
  for (const item of items) {
    const { ticket_id, price, quantity, currency } = item;

    // Validate item fields
    if (!ticket_id || !price || !quantity) {
      throw new ValidationError({
        message: "Cada item deve ter: ticket_id, price, quantity.",
        action: "Verifique se todos os campos dos itens estão preenchidos.",
      });
    }

    if (quantity < 1) {
      throw new ValidationError({
        message: "A quantidade deve ser maior que zero.",
        action: "Forneça uma quantidade válida para todos os itens.",
      });
    }

    // Validate ticket_id UUID format
    if (!uuidRegex.test(ticket_id)) {
      throw new ValidationError({
        message: "ID do ingresso inválido.",
        action: "Forneça um ID de ingresso válido no formato UUID.",
      });
    }

    // Validate ticket exists and belongs to the company/event
    let ticketData;
    try {
      ticketData = await ticket.findOneById(ticket_id, company_id);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw error; // Re-throw NotFoundError from ticket model
      }
      // Handle any other database errors
      throw new ValidationError({
        message: "Erro ao buscar informações do ingresso.",
        action: "Verifique se o ingresso e empresa informados estão corretos.",
      });
    }
    
    if (ticketData.event_id !== event_id) {
      throw new ValidationError({
        message: "Um dos ingressos não pertence ao evento informado.",
        action: "Verifique se todos os ingressos pertencem ao evento correto.",
      });
    }

    // Validate ticket price matches
    if (Number(ticketData.price) !== Number(price)) {
      throw new ValidationError({
        message: `O preço informado para o ingresso ${ticketData.name} não confere com o preço atual.`,
        action: "Atualize a página e tente novamente.",
      });
    }

    const cartInputValues = {
      company_id,
      event_id,
      ticket_id,
      price: Number(price),
      quantity: Number(quantity),
      currency: currency || "BRL"
    };

    const newCartItem = await cart.createBySessionToken(cartInputValues, sessionToken);
    createdItems.push(newCartItem);
  }

  // Return cart summary
  const cartItems = await cart.findBySessionToken(sessionToken);
  const totals = await cart.calculateTotalsBySessionToken(sessionToken);

  // Transform items to simplified format
  const simplifiedItems = cartItems.map(item => ({
    ticket_id: item.ticket_id,
    price: parseFloat(item.price),
    quantity: item.quantity,
    currency: item.currency
  }));

    return response.status(201).json({
      message: "Carrinho atualizado com sucesso.",
      sessionToken: sessionToken,
      company_id: company_id,
      event_id: event_id,
      items: simplifiedItems,
      totals: totals.map(total => ({
        total_items: parseInt(total.total_items),
        total_quantity: parseInt(total.total_quantity),
        total_amount: parseFloat(total.total_amount),
        currency: total.currency
      }))
    });
  } catch (error) {
    // Handle errors manually since next-connect isn't catching them properly
    if (error.statusCode) {
      return response.status(error.statusCode).json(error);
    }
    return response.status(500).json({
      message: "Erro interno do servidor.",
      action: "Tente novamente mais tarde."
    });
  }
}