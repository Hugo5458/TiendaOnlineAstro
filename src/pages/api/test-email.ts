import type { APIRoute } from 'astro';
import { sendOrderConfirmationEmail } from '../../lib/email';

export const GET: APIRoute = async () => {
    try {
        const testOrder = {
            orderNumber: 'TEST-' + Math.floor(Math.random() * 1000),
            customerName: 'Test User',
            customerEmail: 'hugodelmoral77@gmail.com', // Enviarlo al admin para probar
            items: [
                { name: 'Producto de Prueba', quantity: 1, price: 1000, total: 1000 }
            ],
            subtotal: 1000,
            shipping: 0,
            tax: 210,
            total: 1210,
            shippingAddress: { line1: 'Calle Falsa 123', city: 'Madrid', country: 'ES' },
            date: new Date().toISOString()
        };

        await sendOrderConfirmationEmail(testOrder);

        return new Response(JSON.stringify({
            success: true,
            message: 'Email de prueba enviado. Revisa tu bandeja de entrada (y spam).'
        }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            stack: err.stack
        }), { status: 500 });
    }
};
