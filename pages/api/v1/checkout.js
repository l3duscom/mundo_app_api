import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import checkout from "models/checkout.js";
import cart from "models/cart.js";
import corsMiddleware from "infra/cors.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

/**
 * @swagger
 * /api/v1/checkout:
 *   post:
 *     summary: Iniciar processo de checkout
 *     description: |
 *       Inicia o processo de checkout com base no carrinho da sessão.
 *       Busca o usuário por email se existir na empresa.
 *       Cria o registro de checkout com totais calculados do carrinho.
 *     tags:
 *       - Checkout
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionToken, email]
 *             properties:
 *               sessionToken:
 *                 type: string
 *                 description: Token da sessão do carrinho
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do cliente
 *               payment_method:
 *                 type: string
 *                 description: Método de pagamento (opcional)
 *                 example: "credit_card"
 *             example:
 *               sessionToken: "minha-sessao-123"
 *               email: "cliente@email.com"
 *               payment_method: "credit_card"
 *     responses:
 *       201:
 *         description: Checkout iniciado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de confirmação
 *                   example: "Checkout iniciado com sucesso."
 *                 checkout_id:
 *                   type: string
 *                   format: uuid
 *                   description: ID do checkout criado
 *                 sessionToken:
 *                   type: string
 *                   description: Token da sessão
 *                 client_email:
 *                   type: string
 *                   format: email
 *                   description: Email do cliente
 *                 user_id:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                   description: ID do usuário (null se novo cliente)
 *                 company_id:
 *                   type: string
 *                   format: uuid
 *                   description: ID da empresa
 *                 event_id:
 *                   type: string
 *                   format: uuid
 *                   description: ID do evento
 *                 totals:
 *                   type: object
 *                   properties:
 *                     total_amount:
 *                       type: number
 *                       description: Total dos itens
 *                     shipping_total:
 *                       type: number
 *                       description: Total do frete
 *                     discount_total:
 *                       type: number
 *                       description: Total do desconto
 *                     grand_total:
 *                       type: number
 *                       description: Total geral
 *                     currency:
 *                       type: string
 *                       description: Moeda
 *                 status:
 *                   type: string
 *                   description: Status do checkout
 *                   example: "pending"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  try {
    const { sessionToken, email, payment_method } = request.body;

    // Validate required fields
    if (!sessionToken) {
      throw new ValidationError({
        message: "Token da sessão é obrigatório.",
        action: "Forneça um sessionToken válido.",
      });
    }

    if (!email) {
      throw new ValidationError({
        message: "Email é obrigatório.",
        action: "Forneça um email válido.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError({
        message: "Formato de email inválido.",
        action: "Forneça um email válido no formato correto.",
      });
    }

    // Get cart items and validate cart exists
    const cartItems = await cart.findBySessionToken(sessionToken);
    if (cartItems.length === 0) {
      throw new NotFoundError({
        message: "Carrinho não encontrado ou está vazio.",
        action: "Adicione itens ao carrinho antes de iniciar o checkout.",
      });
    }

    // Extract cart basic info
    const firstItem = cartItems[0];
    const company_id = firstItem.company_id;
    const event_id = firstItem.event_id;

    // Check if user exists by email in this company
    const existingUser = await checkout.findUserByEmail(email, company_id);

    // Calculate cart totals
    const cartTotals = await cart.calculateTotalsBySessionToken(sessionToken);
    if (cartTotals.length === 0) {
      throw new ValidationError({
        message: "Não foi possível calcular totais do carrinho.",
        action: "Verifique se o carrinho possui itens válidos.",
      });
    }

    const totals = cartTotals[0];

    // Prepare checkout data
    const checkoutData = {
      session_token: sessionToken,
      company_id: company_id,
      event_id: event_id,
      user_id: existingUser ? existingUser.id : null,
      client_email: email,
      payment_method: payment_method || null,
      coupon_code: null,
      coupon_discount: 0,
      total_amount: parseFloat(totals.total_amount),
      shipping_total: parseFloat(totals.shipping_total || 0),
      discount_total: 0,
      grand_total: parseFloat(totals.grand_total || totals.total_amount),
      currency: totals.currency,
      status: "pending",
    };

    // Create checkout
    const newCheckout = await checkout.createCheckout(checkoutData);

    return response.status(201).json({
      message: "Checkout iniciado com sucesso.",
      checkout_id: newCheckout.id,
      sessionToken: sessionToken,
      client_email: email,
      user_id: existingUser ? existingUser.id : null,
      company_id: company_id,
      event_id: event_id,
      totals: {
        total_amount: parseFloat(newCheckout.total_amount),
        shipping_total: parseFloat(newCheckout.shipping_total),
        discount_total: parseFloat(newCheckout.discount_total),
        grand_total: parseFloat(newCheckout.grand_total),
        currency: newCheckout.currency,
      },
      status: newCheckout.status,
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