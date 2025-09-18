import { z } from "zod";

export const workflowInputSchema = z.object({
  licitacaoId: z.string(),
  empresaId: z.string(),
  empresaContext: z.object({
    // Dados Básicos
    nome: z.string(),
    cnpj: z.string(),
    razaoSocial: z.string().optional(),
    porte: z.enum(["Pequeno", "Médio", "Grande"]),
    descricao: z.string().optional(),
    
    // Core Business
    produtos: z.array(z.string()),
    servicos: z.array(z.string()),
    palavrasChave: z.string().optional(),
    produtoServico: z.string().optional(),
    
    // Localização
    localizacao: z.string(),
    endereco: z.string().optional(),
    raioDistancia: z.number().optional(),
    
    // Dados Financeiros
    financeiro: z.object({
      faturamento: z.number().optional(),
      faturamentoMensal: z.number().optional(),
      capitalSocial: z.number().optional(),
      capitalGiroDisponivel: z.number().optional(),
      margemLucroMedia: z.number().optional(),
      capacidadeSeguroGarantia: z.number().optional(),
      experienciaLicitacoesAnos: z.number().optional(),
      numeroLicitacoesVencidas: z.number().optional(),
      numeroLicitacoesParticipadas: z.number().optional(),
    }).optional(),
    
    // Capacidades
    capacidades: z.object({
      capacidadeProducaoMensal: z.number().optional(),
      numeroFuncionarios: z.number().optional(),
      certificacoes: z.array(z.any()).optional(),
      alcanceGeografico: z.array(z.string()).optional(),
      setoresExperiencia: z.array(z.string()).optional(),
      tempoMercadoAnos: z.number().optional(),
      prazoMinimoExecucao: z.number().optional(),
      prazoMaximoExecucao: z.number().optional(),
      capacidadeContratoSimultaneos: z.number().optional(),
    }).optional(),
    
    // Situação Jurídica
    juridico: z.object({
      situacaoReceitaFederal: z.string().optional(),
      certidoesStatus: z.any().optional(),
      impedimentoLicitar: z.boolean().optional(),
      atestadosCapacidadeTecnica: z.array(z.any()).optional(),
    }).optional(),
    
    // Perfil Comercial
    comercial: z.object({
      modalidadesPreferenciais: z.array(z.string()).optional(),
      margemCompetitiva: z.number().optional(),
      valorMinimoContrato: z.number().optional(),
      valorMaximoContrato: z.number().optional(),
      taxaSucessoLicitacoes: z.number().optional(),
      orgaosParceiros: z.array(z.string()).optional(),
    }).optional(),
    
    // Campos legados
    segmento: z.string(),
    capacidadeOperacional: z.string(),
    faturamento: z.number().optional(),
    capitalSocial: z.number().optional(),
    certificacoes: z.array(z.object({
      nome: z.string(),
      descricao: z.string().optional(),
      dataVencimento: z.string().optional(),
      status: z.string().optional(),
    })),
    documentosDisponiveis: z.record(z.any()).optional(),
  }).optional(),
});

export const agentResultSchema = z.object({
  decision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
  score: z.number().min(0).max(100),
  analysis: z.string(),
});

export const workflowResultSchema = z.object({
  finalDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
  consolidatedScore: z.number().min(0).max(100),
  agents: z.record(agentResultSchema),
  executiveSummary: z.string(),
  executiveReport: z.string().optional(),
  riskLevel: z.enum(["BAIXO", "MEDIO", "ALTO"]).optional(),
  keyAlerts: z.array(z.string()).optional(),
});

export interface IWorkflowAgent {
  name: string;
  agent: any;
  required: boolean;
  stopOnFailure: boolean;
  promptTemplate: (data: WorkflowInput) => string;
}

export type WorkflowInput = z.infer<typeof workflowInputSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
export type WorkflowResult = z.infer<typeof workflowResultSchema>;