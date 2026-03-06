import type { APIRoute } from "astro";
import { Resend } from "resend";

// ✔ Ruta dinámica/serverless — NO prerenderizada
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        // ✔ Leer variables de entorno DENTRO del handler para que los errores sean capturables
        const apiKey = import.meta.env.RESEND_API_KEY;
        const destinatario = import.meta.env.EMAIL_ADDRESS;
        const fromAddress = import.meta.env.FROM_ADDRESS ?? "[EMAIL_ADDRESS]";

        // ✔ Validar que las variables críticas estén configuradas en Vercel
        if (!apiKey || !destinatario) {
            console.error("Faltan variables de entorno: RESEND_API_KEY o EMAIL_ADDRESS");
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?error=1&msg=Error%20de%20configuración" },
            });
        }

        const resend = new Resend(apiKey);

        const formData = await request.formData();

        // ✔ Honeypot anti-spam
        const honeypot = formData.get("website")?.toString() ?? "";
        if (honeypot) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?enviado=1" },
            });
        }

        // ✔ Leer campos
        const nombre = formData.get("nombre")?.toString().trim() ?? "";
        const empresa = formData.get("empresa")?.toString().trim() ?? "—";
        const email = formData.get("email")?.toString().trim() ?? "";
        const prefijo = formData.get("prefijo")?.toString().trim() ?? "";
        const telefono = formData.get("telefono")?.toString().trim() ?? "";
        const mensaje = formData.get("mensaje")?.toString().trim() ?? "";
        const telCompleto = (prefijo && telefono) ? `${prefijo} ${telefono}` : telefono || "—";

        // ✔ Validación backend robusta
        if (!nombre || nombre.length < 2) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?error=1&msg=Escribe%20tu%20nombre" },
            });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?error=1&msg=Email%20inválido" },
            });
        }
        if (!mensaje || mensaje.length < 5) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?error=1&msg=Escribe%20tu%20mensaje" },
            });
        }

        // ✔ Email al negocio
        const { error: errorNegocio } = await resend.emails.send({
            from: fromAddress,
            to: [destinatario],
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
                                <td style="padding: 10px; font-weight: bold; width: 100px; color: #6b7280; font-size: 13px;">NOMBRE</td>
                                <td style="padding: 10px; font-size: 15px;">${nombre}</td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px;">EMPRESA</td>
                                <td style="padding: 10px; font-size: 15px;">${empresa}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px;">EMAIL</td>
                                <td style="padding: 10px;"><a href="mailto:${email}" style="color: #1e40af;">${email}</a></td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px;">TELÉFONO</td>
                                <td style="padding: 10px;"><a href="tel:${telCompleto}" style="color: #1e40af;">${telCompleto}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #6b7280; font-size: 13px; vertical-align: top;">MENSAJE</td>
                                <td style="padding: 10px; white-space: pre-line; line-height: 1.6;">${mensaje}</td>
                            </tr>
                        </table>
                        <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border-left: 4px solid #1e40af; border-radius: 4px; font-size: 12px; color: #1e40af;">
                            💡 Responde directamente a este correo para contactar a ${nombre}.
                        </div>
                    </div>
                    <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 16px;">
                        Enviado desde componentessa.com — ${new Date().toLocaleString("es-NI", { timeZone: "America/Managua" })}
                    </p>
                </div>`,
        });

        if (errorNegocio) {
            console.error("Error enviando al negocio:", errorNegocio);
            return new Response(null, {
                status: 302,
                headers: { Location: "/contacto?error=1&msg=Error%20al%20enviar" },
            });
        }

        // ✔ Confirmación automática al cliente (no bloquea si falla)
        resend.emails.send({
            from: fromAddress,
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
                </div>`,
        }).catch((e) => console.warn("Confirmación no enviada:", e));

        return new Response(null, {
            status: 302,
            headers: { Location: "/contacto?enviado=1" },
        });

    } catch (error) {
        console.error("Error inesperado:", error);
        return new Response(null, {
            status: 302,
            headers: { Location: "/contacto?error=1" },
        });
    }
};