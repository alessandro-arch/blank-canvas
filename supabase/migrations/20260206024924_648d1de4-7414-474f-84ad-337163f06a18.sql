-- 1) Extensões para criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Adicionar colunas para dados criptografados e mascarados
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS pix_key_encrypted bytea,
  ADD COLUMN IF NOT EXISTS pix_key_masked text;

-- Nota: A coluna pix_key original será mantida temporariamente para migração de dados existentes