/**
 * Configuração de memória simplificada para Vercel
 * - Sem Memory instance para reduzir bundle size
 * - Usaremos contexto direto nos agentes
 */
// Configuração simplificada para Vercel - sem Memory instance
export const sequentialWorkflowMemory = undefined;
/**
 * Template da working memory para contexto empresarial e análise progressiva
 */
function getWorkingMemoryTemplate() {
    return `# CONTEXTO EMPRESARIAL

## Dados da Empresa
- **Nome**:
- **CNPJ**:
- **Porte**: [Pequeno/Médio/Grande]
- **Segmento**:
- **Produtos**: 
- **Serviços**:
- **Localização**:
- **Capacidade Operacional**:

## Documentos Disponíveis na Plataforma
- **Certidões**: [Lista com validades]
- **Atestados Técnicos**: [Lista com capacidades]
- **Documentos Societários**: [Status]
- **Habilitação Fiscal**: [Status]

## ANÁLISE PROGRESSIVA ATUAL
### Licitação: [ID]
- **Agente Aderência**: [Score + Status]
- **Agente Operacional**: [Score + Status] 
- **Agente Jurídico**: [Score + Status]
- **Agente Financeiro**: [Score + Status]
- **Decisão Orquestrador**: [Pendente/Finalizada]

## HISTÓRICO DE LICITAÇÕES
- **Participações Anteriores**: [Resumo]
- **Padrões de Sucesso**: [Insights]
- **Lições Aprendidas**: [Pontos de atenção]
`;
}
