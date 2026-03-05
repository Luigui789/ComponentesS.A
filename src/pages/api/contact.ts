import type { APIRoute } from "astro";
import { Resend } from "resend";

// Ruta dinámica/serverless — NO prerenderizada
export const prerender = false;


const resend = new Resend(import.meta.env.RESEND_API_KEY);

const DESTINATARIO = import.meta.env.EMAIL_ADDRESS as string;
const FROM_ADDRESS = import.meta.env.FROM_ADDRESS as string ?? "[EMAIL_ADDRESS]";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();

        // ✔ Honeypot anti-spam:
        // Este campo está oculto para humanos. Si viene relleno → es un bot.
        const honeypot = formData.get("website")?.toString() ?? "";
        if (honeypot) {
            // Simular éxito para no alertar al bot
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?enviado=1" },
            });
        }

        // ✔ Validación backend
        const nombre = formData.get("nombre")?.toString().trim() ?? "";
        const empresa = formData.get("empresa")?.toString().trim() ?? "—";
        const email = formData.get("email")?.toString().trim() ?? "";
        const mensaje = formData.get("mensaje")?.toString().trim() ?? "";

        const errores: string[] = [];
        if (!nombre || nombre.length < 2) errores.push("Nombre inválido.");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push("Email inválido.");
        if (!mensaje || mensaje.length < 10) errores.push("Mensaje demasiado corto.");

        if (errores.length > 0) {
            return new Response(null, {
                status: 302,
                headers: { Location: `/contacto?error=1&msg=${encodeURIComponent(errores[0])}` },
            });
        }

        // ✔ Email principal al negocio
        await resend.emails.send({
            from: FROM_ADDRESS,
            to: [DESTINATARIO],
            // ✔ Reply-To configurado: al responder el correo, va directo al cliente
            replyTo: email,
            subject: `📩 Nuevo contacto de ${nombre} — Componentes S.A.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">📩 Nuevo mensaje desde la web</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Componentes S.A. — Formulario de contacto</p>
                    </div>
                    <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; font-weight: bold; width: 100px; color: #6b7280; font-size: 13px; text-transform: uppercase;">Nombre</td>
                                <td style="padding: 10px; color: #111827; font-size: 15px;">${nombre}</td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase;">Empresa</td>
                                <td style="padding: 10px; color: #111827; font-size: 15px;">${empresa}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase;">Email</td>
                                <td style="padding: 10px;"><a href="mailto:${email}" style="color: #1e40af;">${email}</a></td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px; text-transform: uppercase; vertical-align: top;">Mensaje</td>
                                <td style="padding: 10px; color: #111827; white-space: pre-line; font-size: 15px; line-height: 1.6;">${mensaje}</td>
                            </tr>
                        </table>
                        <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border-left: 4px solid #1e40af; border-radius: 4px; font-size: 12px; color: #1e40af;">
                            💡 Puedes responder directamente a este correo para contactar a ${nombre}.
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 16px;">
                        Enviado desde componentessa.com — ${new Date().toLocaleString("es-NI", { timeZone: "America/Managua" })}
                    </p>
                </div>
            `,
        });

        // ✔ Confirmación automática al cliente
        await resend.emails.send({
            from: FROM_ADDRESS,
            to: [email],
            subject: `✅ Recibimos tu mensaje — Componentes S.A.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 22px;">¡Gracias, ${nombre}!</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Recibimos tu mensaje correctamente.</p>
                    </div>
                    <div style="border: 1px solid #e5e7eb; border-top: none; padding: 32px; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
                            Nuestro equipo revisará tu consulta y te contactará en las próximas <strong>24 horas hábiles</strong>.
                        </p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 28px;">
                            Si tu consulta es urgente, también puedes llamarnos directamente:
                        </p>
                        <a href="tel:+50522707918" style="display: inline-block; background: #1e40af; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                            📞 +505 2270-7918
                        </a>
                        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                — El equipo de Componentes S.A.<br>
                                Especialistas en Oracle Simphony, Safiro ERP y Hardware POS
                            </p>
                        </div>
                    </div>
                </div>
            `,
        });

        return new Response(null, {
            status: 302,
            headers: { Location: "/contacto?enviado=1" },
        });

    } catch (error) {
        console.error("Error Resend:", error);
        return new Response(null, {
            status: 302,
            headers: { Location: "/contacto?error=1" },
        });
    }
};