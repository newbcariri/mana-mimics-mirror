ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
CREATE INDEX IF NOT EXISTS orders_asaas_payment_id_idx ON public.orders(asaas_payment_id);