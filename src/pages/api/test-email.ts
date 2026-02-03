import type { APIRoute } from 'astro';
import { sendOrderConfirmationEmail, sendRefundConfirmationEmail } from '../../lib/email';

export const prerender = false;

// Test endpoint to send sample emails
// Usage: GET /api/test-email?type=purchase OR GET /api/test-email?type=refund
export const GET: APIRoute = async ({ url }) => {
    const type = url.searchParams.get('type') || 'purchase';
    const email = 'hugodelmoral77@gmail.com'; // Tu email

    try {
        if (type === 'refund') {
            // Send refund ticket
            await sendRefundConfirmationEmail({
                refundNumber: 'REF-20260202-TEST',
                orderNumber: 'FS-20260202-9877',
                customerName: 'Hugo Del Moral',
                customerEmail: email,
                refundAmount: 57240, // €572.40 in cents
                refundDate: new Date().toISOString(),
                items: [
                    { name: 'Camisa Elegante Premium', quantity: 2, price: 5900 },
                    { name: 'Pantalón Slim Fit', quantity: 1, price: 7900 },
                    { name: 'Corbata de Seda', quantity: 1, price: 3500 }
                ],
                subtotal: 47200,
                shipping: 499,
                tax: 9541
            });

            return new Response(JSON.stringify({
                success: true,
                message: `Ticket de REEMBOLSO enviado a ${email}`,
                type: 'refund'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Send purchase ticket
            await sendOrderConfirmationEmail({
                orderNumber: 'FS-20260202-TEST',
                customerName: 'Hugo Del Moral',
                customerEmail: email,
                date: new Date().toISOString(),
                items: [
                    { name: 'Camisa Elegante Premium', quantity: 2, price: 5900, total: 11800 },
                    { name: 'Pantalón Slim Fit', quantity: 1, price: 7900, total: 7900 },
                    { name: 'Corbata de Seda', quantity: 1, price: 3500, total: 3500 }
                ],
                subtotal: 23200,
                shipping: 0,
                tax: 4872,
                total: 28072,
                shippingAddress: {
                    line1: 'Calle Mayor 123',
                    line2: 'Piso 4, Puerta B',
                    city: 'Madrid',
                    state: 'Madrid',
                    postal_code: '28001',
                    country: 'España'
                }
            });

            return new Response(JSON.stringify({
                success: true,
                message: `Ticket de COMPRA enviado a ${email}`,
                type: 'purchase'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
