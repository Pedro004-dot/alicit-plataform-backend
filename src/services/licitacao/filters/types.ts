import { EmpresaPerfil, PNCPLicitacao } from '../metrics/types';

export interface FiltroDetector {
  nome: string;
  estaAtivo: (perfil: EmpresaPerfil) => boolean;
  aplicar: (licitacoes: PNCPLicitacao[], perfil: EmpresaPerfil) => Promise<PNCPLicitacao[]>;
  prioridade?: number; // Para ordem de execução (menor = primeiro)
}

export interface ResultadoFiltros {
  licitacoesFiltradas: PNCPLicitacao[];
  filtrosAplicados: string[];
  estatisticas: {
    totalInicial: number;
    totalFinal: number;
    reducaoPercentual: number;
  };
}
