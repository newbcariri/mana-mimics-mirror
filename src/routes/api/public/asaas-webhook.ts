import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
        if (expectedToken) {
          const token = request.headers.get("asaas-access-token");
          if (token !== expectedToken) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = payload?.event as string | undefined;
        const payment = payload?.payment;
        const paymentId = payment?.id as string | undefined;

        if (!event || !paymentId) {
          return new Response("ok", { status: 200 });
        }

        const paidEvents = new Set([
          "PAYMENT_RECEIVED",
          "PAYMENT_CONFIRMED",
          "PAYMENT_RECEIVED_IN_CASH",
        ]);

        if (paidEvents.has(event)) {
          const { error } = await supabaseAdmin
            .from("orders")
            .update({ status: "pago" })
            .eq("asaas_payment_id", paymentId);
          if (error) {
            console.error("asaas-webhook update error", error);
            return new Response("DB error", { status: 500 });
          }
        } else if (
          event === "PAYMENT_REFUNDED" ||
          event === "PAYMENT_DELETED" ||
          event === "PAYMENT_CHARGEBACK_REQUESTED"
        ) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "cancelado" })
            .eq("asaas_payment_id", paymentId);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
