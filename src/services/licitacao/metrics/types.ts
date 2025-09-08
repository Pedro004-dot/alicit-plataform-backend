export interface EmpresaPerfil {
  // === IDENTIFICAÇÃO ===
  id?: string;
  cnpj: string;
  nome?: string;
  razaoSocial?: string;
  
  // === LOCALIZAÇÃO ===
  cidade?: string;
  cep?: string;
  endereco?: string;
  cidadeRadar?: string;
  raioDistancia?: number;
  raioRadar?: number; // backcompat
  regiaoAtuacao?: string[];
  
  // === NEGÓCIO ===
  descricao?: string;
  produtoServico?: string;
  palavrasChave?: string;
  porte?: string[] | string;
  
  // === PRODUTOS E SERVIÇOS ===
  produtos?: string[];
  servicos?: string[];
  
  // === CONTATO ===
  email?: string;
  telefone?: string;
  responsavelLegal?: string;
  
  // === MATCHING PARAMS ===
  termosInteresse: string[];
  codigosNCM?: string[];
  valorMinimo?: number;
  valorMaximo?: number;
  valorMinimoUnitario?: number;
  valorMaximoUnitario?: number;
  modalidadesPreferidas?: string[];
}

export interface PNCPItem {
  numeroItem: number;
  descricao: string;
  materialOuServico: string;
  materialOuServicoNome: string;
  valorUnitarioEstimado: number;
  valorTotal: number;
  quantidade: number;
  ncmNbsCodigo: any;
  ncmNbsDescricao: any;
}

export interface PNCPLicitacao {
  informacaoComplementar: string;
  numeroControlePNCP: string;
  modalidadeNome: string;
  valorTotalEstimado: number;
  objetoCompra: string;
  unidadeOrgao: {
    ufSigla: string;
    municipioNome: string;
  };
  itens: PNCPItem[];
}

export interface MatchDetails {
  regexScore: number;
  levenshteinScore: number;
  tfidfScore: number;
  taxonomiaScore: number;
}

export interface HybridDetails {
  traditional: number;
  semantic: number;
  combined: number;
}

export interface MatchResult {
  licitacao: PNCPLicitacao;
  matchScore: number;
  matchDetails: MatchDetails;
  semanticScore?: number;
  hybridDetails?: HybridDetails;
}
