import { FiltroDetector } from './types';
import { EmpresaPerfil, PNCPLicitacao } from '../metrics/types';

export const filtroValorUnitario: FiltroDetector = {
  nome: 'valor_unitario',
  prioridade: 4,
  
  estaAtivo: (perfil: EmpresaPerfil): boolean => {
    return !!(perfil.valorMinimoUnitario || perfil.valorMaximoUnitario);
  },
  
  aplicar: async (licitacoes: PNCPLicitacao[], perfil: EmpresaPerfil): Promise<PNCPLicitacao[]> => {
    return licitacoes.filter(licitacao => {
      // Uma licitação passa no filtro se pelo menos um item estiver DENTRO da faixa
      return licitacao.itens.some(item => {
        const valorUnitario = item.valorUnitarioEstimado;
        
        // Item deve estar dentro de AMBOS os limites (se especificados)
        const dentroDoMinimo = !perfil.valorMinimoUnitario || valorUnitario >= perfil.valorMinimoUnitario;
        const dentroDoMaximo = !perfil.valorMaximoUnitario || valorUnitario <= perfil.valorMaximoUnitario;
        
        return dentroDoMinimo && dentroDoMaximo;
      });
    });
  }
};
