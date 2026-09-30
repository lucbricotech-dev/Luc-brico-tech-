-- LUC BRICO-TECH — Paiements adaptés au contexte béninois
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_network text,
  ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('cash','mobile_money','bank_transfer','card','check','other'));
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_payment_method_idx ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON public.payments(payment_date);
COMMENT ON COLUMN public.payments.payment_network IS 'Réseau de paiement mobile, ex. MTN MoMo, Moov Money, Celtiis Cash';
COMMENT ON COLUMN public.payments.bank_name IS 'Nom de la banque pour un virement bancaire';
