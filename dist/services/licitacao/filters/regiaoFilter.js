export const filtroRegiao = {
    nome: 'regiao',
    prioridade: 3,
    estaAtivo: (perfil) => {
        const ativo = !!(perfil.regiaoAtuacao?.length);
        if (ativo) {
            console.log(`🗺️ Filtro de região ATIVO: ${perfil.regiaoAtuacao.join(', ')}`);
        }
        return ativo;
    },
    aplicar: async (licitacoes, perfil) => {
        if (!perfil.regiaoAtuacao?.length) {
            return licitacoes;
        }
        // Log das regiões configuradas
        console.log(`🎯 Filtrando por regiões: ${perfil.regiaoAtuacao.join(', ')}`);
        // Log das UFs únicas presentes nas licitações
        const ufsPresentes = [...new Set(licitacoes.map(lic => lic.unidadeOrgao.ufSigla))].sort();
        console.log(`📍 UFs presentes nas licitações: ${ufsPresentes.join(', ')}`);
        // Filtrar
        const licitacoesFiltradas = licitacoes.filter(licitacao => {
            const ufLicitacao = licitacao.unidadeOrgao.ufSigla;
            const incluida = perfil.regiaoAtuacao.includes(ufLicitacao);
            // Log detalhado removido para reduzir ruído
            // if (!incluida) {
            //   console.log(`   ❌ Licitação ${licitacao.numeroControlePNCP} (${ufLicitacao}) não está em [${perfil.regiaoAtuacao!.join(', ')}]`);
            // }
            return incluida;
        });
        // Log final
        console.log(`📊 Filtro região: ${licitacoes.length} → ${licitacoesFiltradas.length} licitações`);
        if (licitacoesFiltradas.length === 0) {
            console.warn(`⚠️ ATENÇÃO: Filtro de região eliminou TODAS as licitações!`);
            console.warn(`   Regiões buscadas: ${perfil.regiaoAtuacao.join(', ')}`);
            console.warn(`   UFs disponíveis: ${ufsPresentes.join(', ')}`);
        }
        return licitacoesFiltradas;
    }
};
