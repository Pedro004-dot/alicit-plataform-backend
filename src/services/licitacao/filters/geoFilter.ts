import { FiltroDetector } from './types';
import { EmpresaPerfil, PNCPLicitacao } from '../metrics/types';
import { filterLicitacoesPorGeografia } from '../geolocation';

export const filtroGeografico: FiltroDetector = {
  nome: 'geografico',
  prioridade: 1, 
  
  estaAtivo: (perfil: EmpresaPerfil): boolean => {
    const ativo = !!(perfil.cidadeRadar && perfil.raioRadar && perfil.raioRadar > 0);
    if (ativo) {
      console.log(`🗺️ Filtro geográfico ATIVO: ${perfil.cidadeRadar} + ${perfil.raioRadar}km`);
    } else {
      console.log(`❌ Filtro geográfico INATIVO: cidade=${perfil.cidadeRadar}, raio=${perfil.raioRadar}`);
    }
    return ativo;
  },
  
  aplicar: async (licitacoes: PNCPLicitacao[], perfil: EmpresaPerfil): Promise<PNCPLicitacao[]> => {
    if (!perfil.cidadeRadar || !perfil.raioRadar) {
      return licitacoes;
    }
    
    const filtroGeo = {
      cidadeRadar: perfil.cidadeRadar,
      raioRadar: perfil.raioRadar
    };
    
    return await filterLicitacoesPorGeografia(licitacoes, filtroGeo);
  }
};
