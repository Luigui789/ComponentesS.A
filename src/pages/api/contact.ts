import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

// sanitizar texto
function escapeHtml(str: string) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// palabras típicas de spam SEO
const spamWords = [
    "seo",
    "backlinks",
    "google ranking",
    "increase traffic",
    "domain authority"
];

export const POST: APIRoute = async ({ request }) => {
    try {

        const apiKey = import.meta.env.RESEND_API_KEY;
        const destinatario = import.meta.env.EMAIL_ADDRESS;
        const fromAddress = import.meta.env.FROM_ADDRESS;

        if (!apiKey || !destinatario || !fromAddress) {
            console.error("Faltan variables de entorno");
            return new Response(null, { status: 302, headers: { Location: "/contacto?error=1" } });
        }

        const resend = new Resend(apiKey);

        const formData = await request.formData();

        // honeypot
        const honeypot = formData.get("website")?.toString();
        if (honeypot) {
            return new Response(null, { status: 302, headers: { Location: "/contacto?enviado=1" } });
        }

        // leer datos
        const nombre = escapeHtml(formData.get("nombre")?.toString().trim() ?? "");
        const empresa = escapeHtml(formData.get("empresa")?.toString().trim() ?? "—");
        const email = escapeHtml(formData.get("email")?.toString().trim() ?? "");
        const prefijo = formData.get("prefijo")?.toString().trim() ?? "";
        const telefono = formData.get("telefono")?.toString().trim() ?? "";
        const mensaje = escapeHtml(formData.get("mensaje")?.toString().trim() ?? "");

        const telCompleto =
            prefijo && telefono ? `${prefijo} ${telefono}` : telefono || "—";

        // validación
        if (!nombre || nombre.length < 2) {
            return new Response(null, { status: 302, headers: { Location: "/contacto?error=nombre" } });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(null, { status: 302, headers: { Location: "/contacto?error=email" } });
        }

        if (!mensaje || mensaje.length < 5) {
            return new Response(null, { status: 302, headers: { Location: "/contacto?error=mensaje" } });
        }

        // filtro anti SEO spam
        const lowerMsg = mensaje.toLowerCase();
        if (spamWords.some(word => lowerMsg.includes(word))) {
            console.warn("Spam detectado:", email);
            return new Response(null, { status: 302, headers: { Location: "/contacto?enviado=1" } });
        }

        console.log("Nuevo contacto:", {
            nombre,
            email,
            empresa,
            telefono: telCompleto
        });

        // ── DISEÑO NEXT-GEN: Email al negocio (CRM Report Style) ──
        const { error } = await resend.emails.send({
            from: fromAddress,
            to: [destinatario],
            replyTo: `${nombre} <${email}>`,
            subject: `Lead: ${nombre} — ${empresa}`,
            html: `
            <div style="background-color:#f1f5f9; padding: 50px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
                    <div style="background-color: #1e40af; padding: 40px; text-align: left;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Notificación</h1>
                        <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px; font-weight: 500;">Entrada desde Formulario Web</p>
                    </div>
                    
                    <div style="padding: 40px;">
                        <div style="display: grid; gap: 20px;">
                            <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px;">
                                <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Nombre Completo</span>
                                <p style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 4px 0 0;">${nombre}</p>
                            </div>
                            
                            <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px;">
                                <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Empresa</span>
                                <p style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 4px 0 0;">${empresa}</p>
                            </div>

                            <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px;">
                                <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Datos de Contacto</span>
                                <p style="font-size: 15px; font-weight: 500; color: #1e293b; margin: 4px 0 0;">
                                    <a href="mailto:${email}" style="color: #1e40af; text-decoration: none;">${email}</a><br>
                                    <a href="tel:${telCompleto}" style="color: #1e40af; text-decoration: none;">${telCompleto}</a>
                                </p>
                            </div>
                        </div>

                        <div style="margin-top: 30px; background-color: #f8fafc; border-radius: 16px; padding: 30px; border: 1px dashed #cbd5e1;">
                            <span style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Requerimiento / Mensaje</span>
                            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 12px 0 0; white-space: pre-line;">${mensaje}</p>
                        </div>

                        <div style="margin-top: 40px; text-align: center;">
                            <a href="mailto:${email}" style="background-color: #1e40af; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; transition: background-color 0.2s;">Abrir Respuesta Rápida</a>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="margin: 0; font-size: 12px; font-weight: 500; color: #94a3b8;">Timestamp: ${new Date().toLocaleString("es-NI", { timeZone: "America/Managua" })}</p>
                    </div>
                </div>
            </div>
            `
        });

        if (error) {
            console.error("Error enviando:", error);
            return new Response(null, { status: 302, headers: { Location: "/contacto?error=envio" } });
        }

        // ── DISEÑO PREMIUM: Confirmación al cliente (Concierge Style) ──
        resend.emails.send({
            from: fromAddress,
            to: [email],
            subject: "Recibimos tu solicitud — Componentes S.A.",
            html: `
            <div style="background-color:#ffffff; padding: 60px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
                <div style="max-width: 550px; margin: 0 auto;">
                    <div style="margin-bottom: 40px;">
                        <div style="background-color: #eff6ff; width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                            <span style="font-size: 32px;">📩</span>
                        </div>
                    </div>

                    <h1 style="font-size: 32px; font-weight: 900; color: #1e293b; margin: 0 0 20px; letter-spacing: -0.04em; text-align: center;">¡Hola ${nombre}!</h1>
                    <p style="font-size: 18px; line-height: 1.6; color: #475569; text-align: center; margin: 0 0 40px;">Gracias por confiar en nosotros. Hemos recibido tu mensaje y ya lo estamos revisando.</p>
                    
                    <div style="border: 1px solid #f1f5f9; border-radius: 24px; padding: 40px; margin-bottom: 40px;">
                        <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #1e40af; margin: 0 0 25px;">¿Qué sigue ahora?</h2>
                        
                        <div style="margin-bottom: 25px; display: flex;">
                            <p style="margin: 0; font-size: 15px; line-height: 1.5;"><strong style="color: #1e293b; display: block;">1. Análisis de Requerimientos</strong> Nuestro equipo técnico evalúa tu solicitud.</p>
                        </div>
                        <div style="margin-bottom: 25px; display: flex;">
                            <p style="margin: 0; font-size: 15px; line-height: 1.5;"><strong style="color: #1e293b; display: block;">2. Contacto Directo</strong> Un consultor experto te contactará en menos de 24h.</p>
                        </div>
                        <div style="display: flex;">
                            <p style="margin: 0; font-size: 15px; line-height: 1.5;"><strong style="color: #1e293b; display: block;">3. Propuesta a Medida</strong> Crearemos una solución específica para tu negocio.</p>
                        </div>
                    </div>

                    <div style="background-color: #1e293b; border-radius: 24px; padding: 35px; text-align: center; color: #ffffff;">
                        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 500; opacity: 0.8;">Para atención inmediata:</p>
                        <a href="tel:+50578266955" style="font-size: 20px; font-weight: 800; color: #ffffff; text-decoration: none; display: block;">+505 7826-6955</a>
                    </div>

                    <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 30px;">
                        <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Componentes S.A.</p>
                        <p style="margin: 4px 0 0; color: #cbd5e1; font-size: 12px;">Soluciones tecnológicas de alto nivel para tu empresa.</p>
                    </div>
                </div>
            </div>
            `
        }).catch(() => { });

        return new Response(null, { status: 302, headers: { Location: "/contacto?enviado=1" } });

    } catch (error) {
        console.error("Error inesperado:", error);
        return new Response(null, { status: 302, headers: { Location: "/contacto?error=1" } });
    }
};