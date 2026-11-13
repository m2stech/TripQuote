-- Seção "Opcionais" do formulário terrestre: reaproveita o bucket
-- `cruise-photos` (RLS já cobre qualquer kind que aponte pra esse bucket,
-- via owns_quote_storage_object) — só precisa estender o enum.
alter type public.attachment_kind add value 'optional_item_photo';
