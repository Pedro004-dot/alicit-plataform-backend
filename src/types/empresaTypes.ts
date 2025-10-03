export interface EmpresaProduto {
    id?: number;
    empresa_id: number;
    nome: string;
    descricao?: string;
    valor?: number;
    tipo: 'produto' | 'servico';
    created_at?: Date;
    updated_at?: Date;
}

export interface EmpresaContext {
    // Dados Básicos
    nome: string;
    cnpj: string;
    razaoSocial: string;
    porte: "Pequeno" | "Médio" | "Grande";
    descricao: string;
    
    // Core Business - Dados estruturados (mantém compatibilidade)
    produtos: string[];
    servicos: string[];
    palavrasChave: string;
    produtoServico: string;
    
    // Localização
    localizacao: string;
    endereco: string;
    raioDistancia: number;
    
    // ✅ DADOS FINANCEIROS COMPLETOS
    financeiro: {
      faturamento: number;
      faturamentoMensal: number;
      capitalSocial: number;
      capitalGiroDisponivel: number;
      margemLucroMedia: number;
      capacidadeSeguroGarantia: number;
      experienciaLicitacoesAnos: number;
      numeroLicitacoesVencidas: number;
      numeroLicitacoesParticipadas: number;
    },
    
    // ✅ CAPACIDADES OPERACIONAIS/TÉCNICAS
    capacidades: {
      capacidadeProducaoMensal: number;
      numeroFuncionarios: number;
      certificacoes: any[];
      alcanceGeografico: string[];
      setoresExperiencia: string[];
      tempoMercadoAnos: number;
      prazoMinimoExecucao: number;
      prazoMaximoExecucao: number;
      capacidadeContratoSimultaneos: number;
    },
    
    // ✅ SITUAÇÃO JURÍDICA
    juridico: {
      situacaoReceitaFederal: string;
      certidoesStatus: any[];
      impedimentoLicitar: boolean;
      atestadosCapacidadeTecnica: any[];
    },
    
    // ✅ PERFIL COMERCIAL
    comercial: {
      modalidadesPreferenciais: string[];
      margemCompetitiva: number ;
      valorMinimoContrato: number;
      valorMaximoContrato: number;
      taxaSucessoLicitacoes: number;
      orgaosParceiros: string[];
    },
    
    // Campos legados (manter compatibilidade)
    segmento: 'Não informado', // Pode ser derivado de setoresExperiencia
    capacidadeOperacional: number,
    faturamento: number,
    capitalSocial: number,
    certificacoes: any[],
    documentosDisponiveis: {}
    };                  