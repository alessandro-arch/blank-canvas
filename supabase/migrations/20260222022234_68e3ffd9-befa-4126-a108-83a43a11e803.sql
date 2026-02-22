
-- Recalculate payment status for Madson and Valerio (Feb 2026) after fixing the bank validation check
DO $$
BEGIN
  -- Madson
  PERFORM fn_sync_payment_status(
    '22ded811-7482-4a95-9443-69907ae37bc5'::uuid,
    'db2d450b-1285-436c-8a69-0b0940cf827c'::uuid,
    '2026-02',
    NULL,
    'manual_recalc'
  );
  -- Valerio
  PERFORM fn_sync_payment_status(
    '0c133d5b-a822-4594-8ee0-f50ef8779bac'::uuid,
    'acf827a8-3759-4972-916c-988229d02d3e'::uuid,
    '2026-02',
    NULL,
    'manual_recalc'
  );
END;
$$;
