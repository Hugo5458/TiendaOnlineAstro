
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate barcode-like visual
  const barcodePattern = order.orderNumber.split('').map(() =>
    Math.random() > 0.5 ? '█' : '▌'
  ).join('') + '▐▐▐';

  const itemsHtml = order.items.map(item =>
    `<tr><td style="padding: 8px 0; border-bottom: 1px dashed #d1d5db; font-size: 13px;"><div style="color: #111827; font-weight: 500;">${item.name}</div></td><td style="padding: 8px 0; border-bottom: 1px dashed #d1d5db; text-align: center; color: #6b7280; font-size: 13px; width: 50px;">x${item.quantity}</td><td style="padding: 8px 0; border-bottom: 1px dashed #d1d5db; text-align: right; color: #111827; font-size: 13px; font-weight: 500; width: 80px;">${formatPrice(item.total)}</td></tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket de Compra - FashionStore</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background-color: #f3f4f6;">
      <div style="max-width: 420px; margin: 40px auto; background: #ffffff; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Ticket Top Edge -->
        <div style="height: 12px; background: repeating-linear-gradient(90deg, transparent, transparent 8px, #e5e7eb 8px, #e5e7eb 16px);"></div>
        
        <!-- Header -->
        <div style="text-align: center; padding: 25px 20px 15px; border-bottom: 2px dashed #e5e7eb;">
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #1a202c;">FASHIONSTORE</div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 5px; letter-spacing: 1px;">MODA PREMIUM & EXCLUSIVA</div>
          <div style="font-size: 10px; color: #9ca3af; margin-top: 3px;">www.fashionstore.com</div>
        </div>

        <!-- Ticket Type Badge -->
        <div style="text-align: center; padding: 15px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 8px 25px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 2px;">
            ✓ COMPRA CONFIRMADA
          </div>
        </div>

        <!-- Order Info -->
        <div style="padding: 0 25px;">
          <table style="width: 100%; font-size: 12px; color: #4b5563;">
            <tr>
              <td style="padding: 4px 0;">Nº TICKET:</td>
              <td style="text-align: right; font-weight: bold; color: #111827; font-size: 13px;">${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">FECHA:</td>
              <td style="text-align: right;">${formatDate(order.date)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">CLIENTE:</td>
              <td style="text-align: right;">${order.customerName}</td>
            </tr>
          </table>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #e5e7eb; margin: 15px 25px;"></div>

        <!-- Items -->
        <div style="padding: 0 25px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 10px; letter-spacing: 1px;">ARTÍCULOS</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #e5e7eb; margin: 15px 25px;"></div>

        <!-- Totals -->
        <div style="padding: 0 25px;">
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td style="padding: 3px 0; color: #6b7280;">Subtotal</td>
              <td style="text-align: right; color: #111827;">${formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #6b7280;">Envío</td>
              <td style="text-align: right; color: #111827;">${order.shipping === 0 ? 'GRATIS' : formatPrice(order.shipping)}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #6b7280;">IVA (21%)</td>
              <td style="text-align: right; color: #111827;">${formatPrice(order.tax)}</td>
            </tr>
          </table>
          
          <!-- Total Box -->
          <div style="background: #f9fafb; border: 2px solid #111827; border-radius: 4px; padding: 12px; margin-top: 10px;">
            <table style="width: 100%;">
              <tr>
                <td style="font-size: 14px; font-weight: bold; color: #111827;">TOTAL PAGADO</td>
                <td style="text-align: right; font-size: 20px; font-weight: bold; color: #111827;">${formatPrice(order.total)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #e5e7eb; margin: 20px 25px 15px;"></div>

        <!-- Shipping Address -->
        <div style="padding: 0 25px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px; letter-spacing: 1px;">DIRECCIÓN DE ENVÍO</div>
          <div style="font-size: 12px; color: #4b5563; line-height: 1.5;">
            ${order.shippingAddress.line1 || ''}<br>
            ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
            ${order.shippingAddress.postal_code || ''} ${order.shippingAddress.city || ''}<br>
            ${order.shippingAddress.state ? order.shippingAddress.state + ', ' : ''}${order.shippingAddress.country || ''}
          </div>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #e5e7eb; margin: 20px 25px 15px;"></div>

        <!-- Barcode Visual -->
        <div style="text-align: center; padding: 10px 25px;">
          <div style="font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: -2px; color: #111827;">
            ${barcodePattern}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 5px; letter-spacing: 2px;">${order.orderNumber}</div>
        </div>

        <!-- Thank You Message -->
        <div style="text-align: center; padding: 20px 25px; background: #f9fafb;">
          <div style="font-size: 14px; color: #111827; font-weight: bold;">¡Gracias por tu compra!</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">
            Recibirás un email cuando tu pedido sea enviado.
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 15px 25px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          <div>Conserva este ticket como comprobante</div>
          <div style="margin-top: 5px;">soporte@fashionstore.com | +34 900 123 456</div>
          <div style="margin-top: 8px; font-size: 9px;">
            ════════════════════════════════
          </div>
        </div>

        <!-- Ticket Bottom Edge -->
        <div style="height: 12px; background: repeating-linear-gradient(90deg, transparent, transparent 8px, #e5e7eb 8px, #e5e7eb 16px);"></div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"FashionStore" <${import.meta.env.SMTP_USER}>`,
    to: order.customerEmail,
    subject: `🧾 Ticket de Compra #${order.orderNumber} - FashionStore`,
    html: html,
  });

  console.log(`Ticket de compra enviado a ${order.customerEmail}`);
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

export interface RefundTicketDetails {
  ticketNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  refundAmount: number;
  reason?: string;
  requestDate: string;
}

export const sendRefundTicketEmail = async (details: RefundTicketDetails) => {
  if (!import.meta.env.SMTP_HOST || !import.meta.env.SMTP_USER) {
    console.warn('SMTP configuration missing. Refund ticket email not sent.');
    return;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  };

  const itemsHtml = details.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #111827;">${item.name}</div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${item.quantity}</td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket de Reembolso</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; background-color: #f3f4f6; color: #374151; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; }
        .header .icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 40px; }
        .ticket-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 12px; padding: 24px; margin-bottom: 30px; text-align: center; }
        .ticket-number { font-size: 28px; font-weight: 700; color: #92400e; letter-spacing: 2px; margin: 10px 0; }
        .info-grid { display: block; margin-bottom: 30px; background-color: #f9fafb; padding: 20px; border-radius: 8px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .info-value { font-size: 14px; color: #1f2937; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #f3f4f6; }
        .total-box { background-color: #fef3c7; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px; }
        .total-label { font-size: 14px; color: #92400e; margin-bottom: 5px; }
        .total-amount { font-size: 32px; font-weight: 700; color: #92400e; }
        .steps { margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb; }
        .step { display: flex; align-items: flex-start; margin-bottom: 20px; }
        .step-number { background-color: #f59e0b; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 15px; flex-shrink: 0; }
        .step-content h4 { margin: 0 0 5px 0; color: #111827; font-size: 14px; }
        .step-content p { margin: 0; color: #6b7280; font-size: 13px; }
        .address-box { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin-top: 10px; }
        .footer { text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px; }
        .footer a { color: #6b7280; text-decoration: underline; }
        @media (max-width: 600px) {
          .content { padding: 20px; }
          .header { padding: 30px 20px; }
          .ticket-number { font-size: 22px; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div style="height: 40px;"></div>
        <div class="main">
          <!-- Header -->
          <div class="header">
            <div class="icon">↩️</div>
            <h1>Ticket de Reembolso</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Solicitud registrada correctamente</p>
          </div>

          <!-- Body -->
          <div class="content">
            
            <!-- Ticket Box -->
            <div class="ticket-box">
              <div style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">Número de Ticket</div>
              <div class="ticket-number">${details.ticketNumber}</div>
              <div style="font-size: 13px; color: #b45309;">Guarda este número para seguimiento</div>
            </div>

            <p style="text-align: center; color: #4b5563; margin-bottom: 30px;">
              Hola <strong>${details.customerName.split(' ')[0]}</strong>, hemos recibido tu solicitud de devolución para el pedido <strong>#${details.orderNumber}</strong>.
            </p>

            <!-- Info Grid -->
            <div class="info-grid">
               <div class="info-item">
                  <div class="info-label">Fecha de Solicitud</div>
                  <div class="info-value">${new Date(details.requestDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
               </div>
               ${details.reason ? `
               <div class="info-item" style="margin-bottom: 0;">
                  <div class="info-label">Motivo</div>
                  <div class="info-value">${details.reason}</div>
               </div>
               ` : ''}
            </div>

            <!-- Items to Return -->
            <h3 style="font-size: 16px; color: #111827; margin-bottom: 15px;">Artículos a devolver</h3>
            <table>
              <thead>
                <tr>
                  <th width="60%">Producto</th>
                  <th width="20%" style="text-align: center;">Cant.</th>
                  <th width="20%" style="text-align: right;">Importe</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Refund Amount -->
            <div class="total-box">
              <div class="total-label">Importe a Reembolsar</div>
              <div class="total-amount">${formatPrice(details.refundAmount)}</div>
            </div>

            <!-- Steps -->
            <div class="steps">
              <h3 style="font-size: 16px; color: #111827; margin-bottom: 20px;">📋 Próximos pasos</h3>
              
              <div class="step">
                <span class="step-number">1</span>
                <div class="step-content">
                  <h4>Prepara el paquete</h4>
                  <p>Empaqueta los artículos en su embalaje original si es posible.</p>
                </div>
              </div>
              
              <div class="step">
                <span class="step-number">2</span>
                <div class="step-content">
                  <h4>Envía a nuestra dirección</h4>
                  <div class="address-box">
                    <strong>📍 Centro de Devoluciones FashionStore</strong><br>
                    Calle de la Moda 123<br>
                    Polígono Industrial, 28001<br>
                    Madrid, España
                  </div>
                </div>
              </div>
              
              <div class="step">
                <span class="step-number">3</span>
                <div class="step-content">
                  <h4>Incluye este ticket</h4>
                  <p>Imprime este email o escribe el número de ticket (<strong>${details.ticketNumber}</strong>) en el paquete.</p>
                </div>
              </div>
              
              <div class="step">
                <span class="step-number">4</span>
                <div class="step-content">
                  <h4>Recibe tu reembolso</h4>
                  <p>Una vez recibamos y validemos el paquete, procesaremos el reembolso en tu método de pago original en <strong>5-7 días hábiles</strong>.</p>
                </div>
              </div>
            </div>

            <!-- Important Notice -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-top: 30px;">
              <p style="margin: 0; color: #991b1b; font-size: 13px;">
                <strong>⚠️ Importante:</strong> Dispones de 14 días naturales desde la recepción del pedido para realizar la devolución. Los artículos deben estar sin usar y con las etiquetas originales.
              </p>
            </div>
            
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>¿Tienes dudas? Responde a este correo o contacta con <a href="mailto:soporte@fashionstore.com">soporte@fashionstore.com</a></p>
          <p>FashionStore - Moda Premium y Exclusiva</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"FashionStore" <${import.meta.env.SMTP_USER}>`,
    to: details.customerEmail,
    subject: `🎫 Ticket de Reembolso ${details.ticketNumber} - FashionStore`,
    html: html,
  });

  console.log(`Email de ticket de reembolso enviado a ${details.customerEmail}`);
};

export interface RefundConfirmationDetails {
  refundNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  refundAmount: number;
  refundDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  shipping?: number;
  tax?: number;
}

export const sendRefundConfirmationEmail = async (details: RefundConfirmationDetails) => {
  if (!import.meta.env.SMTP_HOST || !import.meta.env.SMTP_USER) {
    console.warn('SMTP configuration missing. Refund confirmation email not sent.');
    return;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Generate barcode-like visual
  const barcodePattern = details.refundNumber.split('').map(() =>
    Math.random() > 0.5 ? '█' : '▌'
  ).join('') + '▐▐▐';

  const itemsHtml = details.items.map(item =>
    `<tr><td style="padding: 8px 0; border-bottom: 1px dashed #d1d5db; font-size: 13px;"><div style="color: #111827; font-weight: 500;">${item.name}</div></td><td style="padding: 8px 0; border-bottom: 1px dashed #d1d5db; text-align: center; color: #6b7280; font-size: 13px; width: 50px;">x${item.quantity}</td><td style="padding: 8px 0; border-bottom: 1px dashed #d1d5db; text-align: right; color: #10b981; font-size: 13px; font-weight: 500; width: 80px;">+${formatPrice(item.price * item.quantity)}</td></tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket de Reembolso - FashionStore</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background-color: #f3f4f6;">
      <div style="max-width: 420px; margin: 40px auto; background: #ffffff; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
        
        <!-- Ticket Top Edge (Green for refund) -->
        <div style="height: 12px; background: repeating-linear-gradient(90deg, transparent, transparent 8px, #10b981 8px, #10b981 16px);"></div>
        
        <!-- Header -->
        <div style="text-align: center; padding: 25px 20px 15px; border-bottom: 2px dashed #10b981;">
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #1a202c;">FASHIONSTORE</div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 5px; letter-spacing: 1px;">MODA PREMIUM & EXCLUSIVA</div>
          <div style="font-size: 10px; color: #9ca3af; margin-top: 3px;">www.fashionstore.com</div>
        </div>

        <!-- Ticket Type Badge -->
        <div style="text-align: center; padding: 15px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 8px 25px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 2px;">
            💰 REEMBOLSO COMPLETADO
          </div>
        </div>

        <!-- Refund Info -->
        <div style="padding: 0 25px;">
          <table style="width: 100%; font-size: 12px; color: #4b5563;">
            <tr>
              <td style="padding: 4px 0;">Nº REEMBOLSO:</td>
              <td style="text-align: right; font-weight: bold; color: #10b981; font-size: 13px;">${details.refundNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">PEDIDO ORIGINAL:</td>
              <td style="text-align: right; color: #111827;">#${details.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">FECHA:</td>
              <td style="text-align: right;">${formatDate(details.refundDate)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">CLIENTE:</td>
              <td style="text-align: right;">${details.customerName}</td>
            </tr>
          </table>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #10b981; margin: 15px 25px;"></div>

        <!-- Money Added Box -->
        <div style="margin: 0 25px; padding: 20px; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; color: #047857; letter-spacing: 1px;">💳 AÑADIDO A TU CUENTA</div>
          <div style="font-size: 32px; font-weight: bold; color: #065f46; margin-top: 5px;">+${formatPrice(details.refundAmount)}</div>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #10b981; margin: 15px 25px;"></div>

        <!-- Items -->
        <div style="padding: 0 25px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 10px; letter-spacing: 1px;">ARTÍCULOS DEVUELTOS</div>
          <table style="width: 100%;">
            ${itemsHtml}
          </table>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #10b981; margin: 15px 25px;"></div>

        <!-- Totals -->
        <div style="padding: 0 25px;">
          <table style="width: 100%; font-size: 12px;">
            ${details.subtotal ? `
            <tr>
              <td style="padding: 3px 0; color: #6b7280;">Subtotal productos</td>
              <td style="text-align: right; color: #10b981;">+${formatPrice(details.subtotal)}</td>
            </tr>
            ` : ''}
            ${details.shipping ? `
            <tr>
              <td style="padding: 3px 0; color: #6b7280;">Gastos de envío</td>
              <td style="text-align: right; color: #10b981;">+${formatPrice(details.shipping)}</td>
            </tr>
            ` : ''}
            ${details.tax ? `
            <tr>
              <td style="padding: 3px 0; color: #6b7280;">IVA</td>
              <td style="text-align: right; color: #10b981;">+${formatPrice(details.tax)}</td>
            </tr>
            ` : ''}
          </table>
          
          <!-- Total Box -->
          <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 4px; padding: 12px; margin-top: 10px;">
            <table style="width: 100%;">
              <tr>
                <td style="font-size: 14px; font-weight: bold; color: #065f46;">TOTAL REEMBOLSADO</td>
                <td style="text-align: right; font-size: 20px; font-weight: bold; color: #059669;">+${formatPrice(details.refundAmount)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #10b981; margin: 20px 25px 15px;"></div>

        <!-- Bank Notice -->
        <div style="padding: 0 25px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 12px; font-size: 11px; color: #1e40af;">
            <strong>📌 PLAZO DE ABONO:</strong> 5-7 días hábiles según tu entidad bancaria.
          </div>
        </div>

        <!-- Separator -->
        <div style="border-top: 2px dashed #10b981; margin: 15px 25px;"></div>

        <!-- Barcode Visual -->
        <div style="text-align: center; padding: 10px 25px;">
          <div style="font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: -2px; color: #10b981;">
            ${barcodePattern}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 5px; letter-spacing: 2px;">${details.refundNumber}</div>
        </div>

        <!-- Thank You Message -->
        <div style="text-align: center; padding: 20px 25px; background: #ecfdf5;">
          <div style="font-size: 14px; color: #065f46; font-weight: bold;">¡Tu dinero ha sido devuelto!</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 5px;">
            Esperamos verte pronto de nuevo.
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 15px 25px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          <div>Conserva este ticket como comprobante</div>
          <div style="margin-top: 5px;">soporte@fashionstore.com | +34 900 123 456</div>
          <div style="margin-top: 8px; font-size: 9px; color: #10b981;">
            ════════════════════════════════
          </div>
        </div>

        <!-- Ticket Bottom Edge (Green for refund) -->
        <div style="height: 12px; background: repeating-linear-gradient(90deg, transparent, transparent 8px, #10b981 8px, #10b981 16px);"></div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"FashionStore" <${import.meta.env.SMTP_USER}>`,
    to: details.customerEmail,
    subject: `🧾 Ticket de Reembolso +${formatPrice(details.refundAmount)} - FashionStore`,
    html: html,
  });

  console.log(`Ticket de reembolso enviado a ${details.customerEmail}`);
};
