
import nodemailer from 'nodemailer';

export interface EmailOrderDetails {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    image?: string | null;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: any;
  date: string;
}

const transporter = nodemailer.createTransport({
  host: import.meta.env.SMTP_HOST,
  port: parseInt(import.meta.env.SMTP_PORT || '587'),
  secure: import.meta.env.SMTP_SECURE === 'true',
  auth: {
    user: import.meta.env.SMTP_USER,
    pass: import.meta.env.SMTP_PASS,
  },
});

export const sendOrderConfirmationEmail = async (order: EmailOrderDetails) => {
  if (!import.meta.env.SMTP_HOST || !import.meta.env.SMTP_USER) {
    console.warn('SMTP configuration missing. Email not sent.');
    return;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  };

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.total)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .order-info { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 4px; }
        .order-info p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { text-align: left; padding: 12px; background-color: #f8f9fa; border-bottom: 2px solid #ddd; }
        .totals { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .grand-total { font-weight: bold; font-size: 1.2em; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">FashionStore</div>
          <h3>Confirmación de Pedido</h3>
        </div>

        <div class="order-info">
          <p><strong>Número de Pedido:</strong> ${order.orderNumber}</p>
          <p><strong>Fecha:</strong> ${new Date(order.date).toLocaleDateString('es-ES')}</p>
          <p><strong>Cliente:</strong> ${order.customerName}</p>
          <p><strong>Email:</strong> ${order.customerEmail}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatPrice(order.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Envío:</span>
            <span>${formatPrice(order.shipping)}</span>
          </div>
          <div class="total-row">
            <span>IVA (21%):</span>
            <span>${formatPrice(order.tax)}</span>
          </div>
          <div class="total-row grand-total">
            <span>Total:</span>
            <span>${formatPrice(order.total)}</span>
          </div>
        </div>

        <div style="margin-top: 30px;">
          <h4>Dirección de Envío</h4>
          <p style="white-space: pre-line;">
            ${order.shippingAddress.line1 || ''} ${order.shippingAddress.line2 || ''}
            ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postal_code || ''}
            ${order.shippingAddress.country || ''}
          </p>
        </div>

        <div class="footer">
          <p>Gracias por tu compra en FashionStore.</p>
          <p>Si tienes alguna pregunta, por favor contáctanos respondiendo a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"FashionStore" <${import.meta.env.SMTP_USER}>`,
    to: order.customerEmail,
    subject: `Confirmación de Pedido #${order.orderNumber} - FashionStore`,
    html: html,
  });

  console.log(`Email de confirmación enviado a ${order.customerEmail}`);
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  if (!import.meta.env.SMTP_HOST || !import.meta.env.SMTP_USER) {
    console.warn('SMTP configuration missing. Email not sent.');
    throw new Error('SMTP no configurado');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #eee; border-radius: 8px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; }
        .button { display: inline-block; background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; letter-spacing: 1px; margin: 30px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">FashionStore</div>
        <h2>Recuperación de Contraseña</h2>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        
        <a href="${resetLink}" class="button">RESTABLECER CONTRASEÑA</a>
        
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        
        <div class="footer">
          <p>Este enlace expirará en 1 hora.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"FashionStore" <${import.meta.env.SMTP_USER}>`,
    to: email,
    subject: `Restablecer contraseña - FashionStore`,
    html: html,
  });

  console.log(`Email de recuperación enviado a ${email}`);
};
