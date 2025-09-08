import { FiltroDetector } from './types';
import { EmpresaPerfil, PNCPLicitacao } from '../metrics/types';

export const filtroValor: FiltroDetector = {
  nome: 'valor',
  prioridade: 2,
  
  estaAtivo: (perfil: EmpresaPerfil): boolean => {
    return !!(perfil.valorMinimo || perfil.valorMaximo);
  },
  
  aplicar: async (licitacoes: PNCPLicitacao[], perfil: EmpresaPerfil): Promise<PNCPLicitacao[]> => {
    return licitacoes.filter(licitacao => {
      const valor = licitacao.valorTotalEstimado;
      
      // Verifica valor mínimo
      if (perfil.valorMinimo && valor < perfil.valorMinimo) {
        return false;
      }
      
      // Verifica valor máximo  
      if (perfil.valorMaximo && valor > perfil.valorMaximo) {
        return false;
      }
      
      return true;
    });
  }
};
