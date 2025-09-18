import { strategicFitAgent } from "../agents/sequential/strategicFitAgent";
import { operationalAgent } from "../agents/sequential/operationalAgent";
import { legalDocAgent } from "../agents/sequential/legalDocAgent";
import { IWorkflowAgent, WorkflowInput } from "./types";

export const AGENT_PIPELINE: IWorkflowAgent[] = [
  {
    name: "strategic",
    agent: strategicFitAgent,
    required: true,
    stopOnFailure: true,
    promptTemplate: (data: WorkflowInput) => `
      Analise a aderência estratégica entre a empresa ${data.empresaContext?.nome || 'N/A'} e a licitação ${data.licitacaoId}.
      
      DADOS DA EMPRESA:
      📋 Básicos:
      - Nome: ${data.empresaContext?.nome || 'N/A'}
      - CNPJ: ${data.empresaContext?.cnpj || 'N/A'}
      - Porte: ${data.empresaContext?.porte || 'N/A'}
      - Descrição: ${data.empresaContext?.descricao || 'N/A'}
      
      🎯 Core Business:
      - Produtos: ${data.empresaContext?.produtos?.slice(0, 8).join(', ') || 'N/A'}
      - Serviços: ${data.empresaContext?.servicos?.slice(0, 5).join(', ') || 'N/A'}
      - Palavras-chave: ${data.empresaContext?.palavrasChave || 'N/A'}
      - Produto/Serviço principal: ${data.empresaContext?.produtoServico || 'N/A'}
      
      💰 Capacidade Financeira:
      - Faturamento mensal: ${data.empresaContext?.financeiro?.faturamentoMensal ? 'R$ ' + data.empresaContext.financeiro.faturamentoMensal.toLocaleString() : 'N/A'}
      - Capital social: ${data.empresaContext?.financeiro?.capitalSocial ? 'R$ ' + data.empresaContext.financeiro.capitalSocial.toLocaleString() : 'N/A'}
      - Capital giro disponível: ${data.empresaContext?.financeiro?.capitalGiroDisponivel ? 'R$ ' + data.empresaContext.financeiro.capitalGiroDisponivel.toLocaleString() : 'N/A'}
      - Capacidade seguro/garantia: ${data.empresaContext?.financeiro?.capacidadeSeguroGarantia ? 'R$ ' + data.empresaContext.financeiro.capacidadeSeguroGarantia.toLocaleString() : 'N/A'}
      
      📊 Histórico Licitações:
      - Anos experiência: ${data.empresaContext?.financeiro?.experienciaLicitacoesAnos || 'N/A'}
      - Licitações vencidas: ${data.empresaContext?.financeiro?.numeroLicitacoesVencidas || 'N/A'}
      - Licitações participadas: ${data.empresaContext?.financeiro?.numeroLicitacoesParticipadas || 'N/A'}
      - Taxa sucesso: ${data.empresaContext?.comercial?.taxaSucessoLicitacoes ? (data.empresaContext.comercial.taxaSucessoLicitacoes * 100).toFixed(1) + '%' : 'N/A'}
      
      🏭 Capacidades:
      - Setores experiência: ${data.empresaContext?.capacidades?.setoresExperiencia?.join(', ') || 'N/A'}
      - Tempo mercado: ${data.empresaContext?.capacidades?.tempoMercadoAnos || 'N/A'} anos
      - Certificações: ${data.empresaContext?.capacidades?.certificacoes?.length || 0} certificações
      
      💼 Perfil Comercial:
      - Modalidades preferenciais: ${data.empresaContext?.comercial?.modalidadesPreferenciais?.join(', ') || 'N/A'}
      - Valor mínimo contrato: ${data.empresaContext?.comercial?.valorMinimoContrato ? 'R$ ' + data.empresaContext.comercial.valorMinimoContrato.toLocaleString() : 'N/A'}
      - Valor máximo contrato: ${data.empresaContext?.comercial?.valorMaximoContrato ? 'R$ ' + data.empresaContext.comercial.valorMaximoContrato.toLocaleString() : 'N/A'}
      
      IMPORTANTE: Use a tool RAG para consultar informações específicas sobre esta licitação (${data.licitacaoId}).
    `
  },
  {
    name: "operational",
    agent: operationalAgent,
    required: false,
    stopOnFailure: true,
    promptTemplate: (data: WorkflowInput) => `
      Analise a viabilidade operacional da licitação ${data.licitacaoId} para a empresa ${data.empresaContext?.nome || 'N/A'}.
      
      DADOS DA EMPRESA:
      📋 Identificação:
      - Nome: ${data.empresaContext?.nome || 'N/A'}
      - CNPJ: ${data.empresaContext?.cnpj || 'N/A'}
      - Porte: ${data.empresaContext?.porte || 'N/A'}
      
      🏭 Capacidade Operacional:
      - Funcionários: ${data.empresaContext?.capacidades?.numeroFuncionarios || 'N/A'}
      - Capacidade produção/mês: ${data.empresaContext?.capacidades?.capacidadeProducaoMensal ? data.empresaContext.capacidades.capacidadeProducaoMensal.toLocaleString() + ' unidades' : 'N/A'}
      - Contratos simultâneos: ${data.empresaContext?.capacidades?.capacidadeContratoSimultaneos || 'N/A'}
      - Tempo no mercado: ${data.empresaContext?.capacidades?.tempoMercadoAnos || 'N/A'} anos
      
      ⏱️ Prazos de Execução:
      - Prazo mínimo: ${data.empresaContext?.capacidades?.prazoMinimoExecucao || 'N/A'} dias
      - Prazo máximo: ${data.empresaContext?.capacidades?.prazoMaximoExecucao || 'N/A'} dias
      
      📍 Alcance Geográfico:
      - Localização: ${data.empresaContext?.localizacao || 'N/A'}
      - Endereço: ${data.empresaContext?.endereco || 'N/A'}
      - Raio distância: ${data.empresaContext?.raioDistancia || 'N/A'}km
      - Estados atendidos: ${data.empresaContext?.capacidades?.alcanceGeografico?.join(', ') || 'N/A'}
      
      🏆 Certificações e Experiência:
      - Certificações: ${data.empresaContext?.capacidades?.certificacoes?.length || 0} ativas
      - Setores experiência: ${data.empresaContext?.capacidades?.setoresExperiencia?.join(', ') || 'N/A'}
      
      💰 Capacidade Financeira Operacional:
      - Capital giro disponível: ${data.empresaContext?.financeiro?.capitalGiroDisponivel ? 'R$ ' + data.empresaContext.financeiro.capitalGiroDisponivel.toLocaleString() : 'N/A'}
      - Faturamento mensal: ${data.empresaContext?.financeiro?.faturamentoMensal ? 'R$ ' + data.empresaContext.financeiro.faturamentoMensal.toLocaleString() : 'N/A'}
      
      IMPORTANTE: Use a tool RAG para consultar informações específicas sobre prazos, cronograma e requisitos operacionais desta licitação (${data.licitacaoId}).
    `
  },
  {
    name: "legal",
    agent: legalDocAgent,
    required: false,
    stopOnFailure: false,
    promptTemplate: (data: WorkflowInput) => `
      Analise os requisitos de habilitação e riscos jurídicos da licitação ${data.licitacaoId} para a empresa ${data.empresaContext?.nome || 'N/A'}.
      
      DADOS DA EMPRESA:
      📋 Identificação:
      - Nome: ${data.empresaContext?.nome || 'N/A'}
      - CNPJ: ${data.empresaContext?.cnpj || 'N/A'}
      - Razão Social: ${data.empresaContext?.razaoSocial || 'N/A'}
      
      ⚖️ Situação Jurídica:
      - Situação Receita Federal: ${data.empresaContext?.juridico?.situacaoReceitaFederal || 'N/A'}
      - Impedimento para licitar: ${data.empresaContext?.juridico?.impedimentoLicitar ? 'SIM' : 'NÃO'}
      - Status certidões: ${data.empresaContext?.juridico?.certidoesStatus ? 'Disponível' : 'N/A'}
      
      🎓 Qualificação Técnica:
      - Atestados capacidade: ${data.empresaContext?.juridico?.atestadosCapacidadeTecnica?.length || 0} atestados
      - Certificações: ${data.empresaContext?.capacidades?.certificacoes?.length || 0} certificações
      - Tempo mercado: ${data.empresaContext?.capacidades?.tempoMercadoAnos || 'N/A'} anos
      - Setores experiência: ${data.empresaContext?.capacidades?.setoresExperiencia?.join(', ') || 'N/A'}
      
      💰 Capacidade Econômico-Financeira:
      - Capital social: ${data.empresaContext?.financeiro?.capitalSocial ? 'R$ ' + data.empresaContext.financeiro.capitalSocial.toLocaleString() : 'N/A'}
      - Faturamento mensal: ${data.empresaContext?.financeiro?.faturamentoMensal ? 'R$ ' + data.empresaContext.financeiro.faturamentoMensal.toLocaleString() : 'N/A'}
      - Capital giro disponível: ${data.empresaContext?.financeiro?.capitalGiroDisponivel ? 'R$ ' + data.empresaContext.financeiro.capitalGiroDisponivel.toLocaleString() : 'N/A'}
      - Capacidade seguro/garantia: ${data.empresaContext?.financeiro?.capacidadeSeguroGarantia ? 'R$ ' + data.empresaContext.financeiro.capacidadeSeguroGarantia.toLocaleString() : 'N/A'}
      
      💼 Experiência em Licitações:
      - Anos experiência: ${data.empresaContext?.financeiro?.experienciaLicitacoesAnos || 'N/A'}
      - Licitações participadas: ${data.empresaContext?.financeiro?.numeroLicitacoesParticipadas || 'N/A'}
      - Licitações vencidas: ${data.empresaContext?.financeiro?.numeroLicitacoesVencidas || 'N/A'}
      - Taxa sucesso: ${data.empresaContext?.comercial?.taxaSucessoLicitacoes ? (data.empresaContext.comercial.taxaSucessoLicitacoes * 100).toFixed(1) + '%' : 'N/A'}
      - Órgãos parceiros: ${data.empresaContext?.comercial?.orgaosParceiros?.join(', ') || 'N/A'}
      
      IMPORTANTE: Use a tool RAG para consultar informações específicas sobre documentos de habilitação desta licitação (${data.licitacaoId}).
    `
  }
];