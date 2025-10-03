-- Migração para remover campos de busca obsoletos
-- Os produtos/serviços detalhados agora substituem estas informações

-- Remover colunas palavras_chave e produto_servico da tabela empresas
ALTER TABLE empresas 
DROP COLUMN IF EXISTS palavras_chave,
DROP COLUMN IF EXISTS produto_servico;

-- Recriar view empresa_contexto_completo sem os campos removidos
DROP VIEW IF EXISTS empresa_contexto_completo;

CREATE OR REPLACE VIEW empresa_contexto_completo AS
SELECT 
    e.id,
    e.nome,
    e.cnpj,
    e.razao_social,
    e.descricao,
    e.porte,
    e.cidade,
    e.endereco,
    e.raio_distancia,
    e.responsavel_legal,
    e.created_at,
    e.updated_at,
    
    -- Agregação de produtos e serviços da nova tabela unificada
    COALESCE(
        array_agg(
            DISTINCT ep.nome || ' (' || ep.tipo || ')' || 
            CASE WHEN ep.descricao IS NOT NULL THEN ' - ' || ep.descricao ELSE '' END ||
            CASE WHEN ep.valor IS NOT NULL THEN ' - R$ ' || ep.valor::text ELSE '' END
        ) FILTER (WHERE ep.nome IS NOT NULL), 
        ARRAY[]::text[]
    ) as produtos_servicos_detalhados,
    
    -- Separação por tipo para compatibilidade
    COALESCE(
        array_agg(DISTINCT ep.nome) FILTER (WHERE ep.tipo = 'produto' AND ep.nome IS NOT NULL), 
        ARRAY[]::text[]
    ) as produtos,
    
    COALESCE(
        array_agg(DISTINCT ep.nome) FILTER (WHERE ep.tipo = 'servico' AND ep.nome IS NOT NULL), 
        ARRAY[]::text[]
    ) as servicos,
    
    -- Dados financeiros (manter estrutura existente)
    e.faturamento,
    e.capitalSocial,
    e.faturamento_mensal,
    e.margem_lucro_media,
    e.capital_giro_disponivel,
    e.experiencia_licitacoes_anos,
    e.numero_licitacoes_participadas,
    e.numero_licitacoes_vencidas,
    e.capacidade_seguro_garantia,
    
    -- Capacidades técnicas/operacionais (manter estrutura existente)
    e.capacidade_producao_mensal,
    e.numero_funcionarios,
    e.certificacoes,
    e.alcance_geografico,
    e.setores_experiencia,
    e.tempo_mercado_anos,
    e.prazo_minimo_execucao,
    e.prazo_maximo_execucao,
    e.capacidade_contratos_simultaneos,
    
    -- Situação jurídica (manter estrutura existente)
    e.situacao_receita_federal,
    e.certidoes_status,
    e.impedimento_licitar,
    e.atestados_capacidade_tecnica,
    
    -- Perfil comercial (manter estrutura existente)
    e.modalidades_preferenciais,
    e.margem_competitiva,
    e.valor_minimo_contrato,
    e.valor_maximo_contrato,
    e.taxa_sucesso_licitacoes,
    e.orgaos_parceiros

FROM empresas e
LEFT JOIN empresas_produtos ep ON e.id = ep.empresa_id
GROUP BY e.id, e.nome, e.cnpj, e.razao_social, e.descricao, e.porte, 
         e.cidade, e.endereco, e.raio_distancia, e.responsavel_legal,
         e.created_at, e.updated_at, e.faturamento, e.capitalSocial,
         e.faturamento_mensal, e.margem_lucro_media, e.capital_giro_disponivel,
         e.experiencia_licitacoes_anos, e.numero_licitacoes_participadas,
         e.numero_licitacoes_vencidas, e.capacidade_seguro_garantia,
         e.capacidade_producao_mensal, e.numero_funcionarios, e.certificacoes,
         e.alcance_geografico, e.setores_experiencia, e.tempo_mercado_anos,
         e.prazo_minimo_execucao, e.prazo_maximo_execucao, e.capacidade_contratos_simultaneos,
         e.situacao_receita_federal, e.certidoes_status, e.impedimento_licitar,
         e.atestados_capacidade_tecnica, e.modalidades_preferenciais, e.margem_competitiva,
         e.valor_minimo_contrato, e.valor_maximo_contrato, e.taxa_sucesso_licitacoes, e.orgaos_parceiros;