-- Script para corrigir status "aprovado" para "em_analise"
-- Execute este script no banco de dados Supabase

-- Atualizar todos os registros com status "aprovado" para "em_analise"
UPDATE licitacoes_empresa 
SET status = 'em_analise' 
WHERE status = 'aprovado';

-- Verificar se a atualização foi bem-sucedida
SELECT 
  status, 
  COUNT(*) as quantidade
FROM licitacoes_empresa 
GROUP BY status 
ORDER BY status;