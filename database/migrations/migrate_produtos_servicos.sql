-- Migração para unificar tabelas empresa_produtos e empresa_servicos
-- Data: 2025-10-03
-- Descrição: Criar tabela empresas_produtos unificada e migrar dados

BEGIN;

-- Passo 1: Criar nova tabela empresas_produtos
CREATE TABLE empresas_produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2),
    tipo VARCHAR(20) CHECK (tipo IN ('produto', 'servico')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Passo 2: Migrar dados da tabela empresa_produtos (produtos)
INSERT INTO empresas_produtos (empresa_id, nome, descricao, valor, tipo, created_at)
SELECT 
    empresa_id, 
    produto as nome,
    NULL as descricao,
    NULL as valor,
    'produto' as tipo,
    created_at
FROM empresa_produtos;

-- Passo 3: Migrar dados da tabela empresa_servicos (serviços)
INSERT INTO empresas_produtos (empresa_id, nome, descricao, valor, tipo, created_at)
SELECT 
    empresa_id,
    servico as nome,
    NULL as descricao, 
    NULL as valor,
    'servico' as tipo,
    created_at
FROM empresa_servicos;

-- Passo 4: Verificar migração
DO $$
DECLARE
    total_antigo INTEGER;
    total_novo INTEGER;
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM empresa_produtos) + (SELECT COUNT(*) FROM empresa_servicos) INTO total_antigo;
    SELECT COUNT(*) FROM empresas_produtos INTO total_novo;
    
    RAISE NOTICE 'Total registros antigos: %', total_antigo;
    RAISE NOTICE 'Total registros novos: %', total_novo;
    
    IF total_antigo != total_novo THEN
        RAISE EXCEPTION 'Erro na migração: total de registros não confere';
    END IF;
    
    RAISE NOTICE 'Migração validada com sucesso!';
END $$;

-- Passo 5: Remover tabelas antigas
DROP TABLE empresa_servicos;
DROP TABLE empresa_produtos;

-- Passo 6: Criar índices para performance
CREATE INDEX idx_empresas_produtos_empresa_id ON empresas_produtos(empresa_id);
CREATE INDEX idx_empresas_produtos_tipo ON empresas_produtos(tipo);

COMMIT;