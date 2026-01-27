
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
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #111827;">${item.name}</div>
      </td>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${item.quantity}</td>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">${formatPrice(item.price)}</td>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">${formatPrice(item.total)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; background-color: #f3f4f6; color: #374151; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: #1a202c; color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 40px; }
        .order-title { text-align: center; margin-bottom: 30px; }
        .order-title h2 { margin: 0; color: #111827; font-size: 20px; }
        .order-title p { color: #6b7280; font-size: 14px; margin-top: 5px; }
        
        .info-grid { display: block; margin-bottom: 30px; background-color: #f9fafb; padding: 20px; border-radius: 8px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .info-value { font-size: 14px; color: #1f2937; font-weight: 500; }

        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #f3f4f6; }
        
        .totals { margin-top: 30px; padding-top: 20px; border-top: 2px solid #f3f4f6; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #6b7280; }
        .total-row.final { font-size: 18px; color: #111827; font-weight: 700; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e5e7eb; }
        
        .shipping-address { margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb; }
        .shipping-address h3 { font-size: 16px; color: #111827; margin-bottom: 15px; }
        .address-box { color: #4b5563; font-style: normal; }

        .footer { text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px; }
        .footer a { color: #6b7280; text-decoration: underline; }
        
        @media (max-width: 600px) {
          .content { padding: 20px; }
          .header { padding: 30px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div style="height: 40px;"></div>
        <div class="main">
          <!-- Header -->
          <div class="header">
            <h1>FashionStore</h1>
          </div>

          <!-- Body -->
          <div class="content">
            
            <div class="order-title">
              <h2>¡Gracias por tu pedido, ${order.customerName.split(' ')[0]}!</h2>
              <p>Hemos recibido correctamente tu orden #${order.orderNumber}.</p>
            </div>

            <!-- Info Grid -->
            <div class="info-grid">
               <div class="info-item">
                  <div class="info-label">Fecha del Pedido</div>
                  <div class="info-value">${new Date(order.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
               </div>
               <div class="info-item" style="margin-bottom: 0;">
                  <div class="info-label">Correo Electrónico</div>
                  <div class="info-value">${order.customerEmail}</div>
               </div>
            </div>

            <!-- Items Information -->
            <table>
              <thead>
                <tr>
                  <th width="50%">Producto</th>
                  <th width="15%" style="text-align: center;">Cant.</th>
                  <th width="20%" style="text-align: right;">Precio</th>
                  <th width="15%" style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatPrice(order.subtotal)}</span>
              </div>
              <div class="total-row">
                <span>Envío</span>
                <span>${formatPrice(order.shipping)}</span>
              </div>
              <div class="total-row">
                <span>Impuestos (IVA 21%)</span>
                <span>${formatPrice(order.tax)}</span>
              </div>
              <div class="total-row final">
                <span>Total</span>
                <span>${formatPrice(order.total)}</span>
              </div>
            </div>

            <!-- Shipping Address -->
            <div class="shipping-address">
              <h3>Dirección de Envío</h3>
              <div class="address-box">
                <p style="margin: 0;">
                  ${order.shippingAddress.line1 || ''}<br>
                  ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
                  ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.postal_code || ''}<br>
                  ${order.shippingAddress.country || ''}
                </p>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>¿Necesitas ayuda? Responde a este correo o visita nuestro <a href="${import.meta.env.PUBLIC_SITE_URL}/contacto">centro de ayuda</a>.</p>
          <p>FashionStore - Moda Premium y Exclusiva</p>
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
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer Contraseña</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; background-color: #f3f4f6; color: #374151; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #1a202c; color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 40px; text-align: center; }
        .button { display: inline-block; background-color: #1a202c; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; letter-spacing: 0.5px; margin: 30px 0; text-transform: uppercase; font-size: 14px; }
        .footer { text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div style="height: 40px;"></div>
        <div class="main">
          <div class="header">
            <h1>FashionStore</h1>
          </div>
          <div class="content">
            <h2 style="color: #111827; margin-top: 0;">Recuperación de Contraseña</h2>
            <p style="color: #4b5563;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FashionStore.</p>
            <p style="color: #4b5563;">Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            
            <a href="${resetLink}" class="button">Restablecer Contraseña</a>
            
            <p style="font-size: 13px; color: #6b7280;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          </div>
        </div>
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
