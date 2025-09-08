import { filterLicitacoesPorGeografia } from '../geolocation';
export const filtroGeografico = {
    nome: 'geografico',
    prioridade: 1,
    estaAtivo: (perfil) => {
        const ativo = !!(perfil.cidadeRadar && perfil.raioRadar && perfil.raioRadar > 0);
        if (ativo) {
            console.log(`🗺️ Filtro geográfico ATIVO: ${perfil.cidadeRadar} + ${perfil.raioRadar}m`);
        }
        else {
            console.log(`❌ Filtro geográfico INATIVO: cidade=${perfil.cidadeRadar}, raio=${perfil.raioRadar}`);
        }
        return ativo;
    },
    aplicar: async (licitacoes, perfil) => {
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
