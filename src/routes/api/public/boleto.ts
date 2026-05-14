import { createFileRoute } from "@tanstack/react-router";
import { handlePaymentAction, PAYMENT_CORS_HEADERS } from "@/server/payment-api.server";

export const Route = createFileRoute("/api/public/boleto")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: PAYMENT_CORS_HEADERS }),
      POST: async ({ request }) => handlePaymentAction("boleto", request),
    },
  },
});
