import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import cart from "models/cart.js";
import corsMiddleware from "infra/cors.js";
import { ValidationError } from "infra/errors.js";

/**
 * @swagger
 * /api/v1/carts/shipping:
 *   post:
 *     summary: Selecionar forma de entrega
 *     description: |
 *       Atualiza o carrinho com a forma de entrega selecionada.
 *       Opções disponíveis:
 *       - "digital": Entrega digital - R$ 0,00
 *       - "home": Entrega em casa - R$ 25,00
 *     tags:
 *       - Carts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionToken, shipping_method]
 *             properties:
 *               sessionToken:
 *                 type: string
 *                 description: Token da sessão
 *               shipping_method:
 *                 type: string
 *                 enum: [digital, home]
 *                 description: Método de entrega
 *             example:
 *               sessionToken: "minha-sessao-123"
 *               shipping_method: "digital"
 *     responses:
 *       200:
 *         description: Forma de entrega atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de confirmação
 *                   example: "Forma de entrega atualizada com sucesso."
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
 *                 shipping:
 *                   type: object
 *                   properties:
 *                     method:
 *                       type: string
 *                       description: Método de entrega
 *                     price:
 *                       type: number
 *                       description: Preço da entrega
 *                     description:
 *                       type: string
 *                       description: Descrição da entrega
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
 *                       shipping_total:
 *                         type: number
 *                       grand_total:
 *                         type: number
 *                       currency:
 *                         type: string
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
    const { sessionToken, shipping_method } = request.body;

    // Validate required fields
    if (!sessionToken) {
      throw new ValidationError({
        message: "Token da sessão é obrigatório.",
        action: "Forneça um sessionToken válido.",
      });
    }

    if (!shipping_method) {
      throw new ValidationError({
        message: "Método de entrega é obrigatório.",
        action: "Escolha entre 'digital' ou 'home'.",
      });
    }

    // Validate shipping method
    const validMethods = ['digital', 'home'];
    if (!validMethods.includes(shipping_method)) {
      throw new ValidationError({
        message: "Método de entrega inválido.",
        action: "Escolha entre 'digital' (grátis) ou 'home' (R$ 25,00).",
      });
    }

    // Define shipping details
    const shippingDetails = {
      digital: {
        method: 'digital',
        price: 0,
        description: 'Entrega digital - Receba por email'
      },
      home: {
        method: 'home', 
        price: 25.00,
        description: 'Entrega em casa - Taxa de R$ 25,00'
      }
    };

    const selectedShipping = shippingDetails[shipping_method];

    // Update cart with shipping information
    await cart.updateShippingBySessionToken(
      sessionToken,
      selectedShipping.method,
      selectedShipping.price
    );

    // Get updated cart data
    const cartItems = await cart.findBySessionToken(sessionToken);
    const totals = await cart.calculateTotalsBySessionToken(sessionToken);

    // Extract basic cart info from first item
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

    return response.status(200).json({
      message: "Forma de entrega atualizada com sucesso.",
      sessionToken: sessionToken,
      company_id: company_id,
      event_id: event_id,
      shipping: selectedShipping,
      items: simplifiedItems,
      totals: totals.map(total => ({
        total_items: parseInt(total.total_items),
        total_quantity: parseInt(total.total_quantity),
        total_amount: parseFloat(total.total_amount),
        shipping_total: parseFloat(total.shipping_total || 0),
        grand_total: parseFloat(total.grand_total || total.total_amount),
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