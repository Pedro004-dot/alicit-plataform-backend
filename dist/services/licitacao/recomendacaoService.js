import recomendacaoRepository from '../../repositories/recomendacaoRepository';
class RecomendacaoService {
    async salvarRecomendacoes(empresaCnpj, matchResults) {
        try {
            console.log(`📊 Salvando ${matchResults.length} recomendações para empresa ${empresaCnpj}`);
            // Usar apenas o recomendacaoRepository que já salva na licitacao_empresa
            // com origem_recomendacao=true e status="nao_definido"
            const recomendacoes = matchResults.map(match => ({
                numeroControlePNCP: match.licitacao.numeroControlePNCP,
                empresaCnpj,
                matchScore: match.matchScore,
                detalhesMatching: {
                    matchDetails: match.matchDetails,
                    semanticScore: match.semanticScore,
                    timestamp: new Date().toISOString()
                }
            }));
            const resultado = await recomendacaoRepository.salvarRecomendacoes(recomendacoes);
            console.log(`✅ ${resultado.length} recomendações salvas com sucesso`);
            return {
                success: true,
                data: resultado,
                total: resultado.length
            };
        }
        catch (error) {
            console.error('❌ Erro ao salvar recomendações:', error);
            throw error;
        }
    }
    async listarRecomendacoesPendentes(empresaCnpj) {
        try {
            console.log(`🔍 Listando recomendações pendentes para empresa ${empresaCnpj}`);
            const recomendacoes = await recomendacaoRepository.listarRecomendacoesPendentes(empresaCnpj);
            console.log(`📋 ${recomendacoes.length} recomendações encontradas`);
            return {
                success: true,
                data: recomendacoes,
                total: recomendacoes.length
            };
        }
        catch (error) {
            console.error('❌ Erro ao listar recomendações:', error);
            throw error;
        }
    }
    async removerRecomendacao(numeroControlePNCP, empresaCnpj) {
        try {
            console.log(`🗑️ Removendo recomendação ${numeroControlePNCP} da empresa ${empresaCnpj}`);
            await recomendacaoRepository.removerRecomendacao(numeroControlePNCP, empresaCnpj);
            console.log('✅ Recomendação removida com sucesso');
            return {
                success: true,
                message: 'Recomendação removida com sucesso'
            };
        }
        catch (error) {
            console.error('❌ Erro ao remover recomendação:', error);
            throw error;
        }
    }
    async limparRecomendacoesAntigas(diasParaExpirar = 30) {
        try {
            console.log(`🧹 Limpando recomendações antigas (>${diasParaExpirar} dias)`);
            const removidas = await recomendacaoRepository.limparRecomendacoesAntigas(diasParaExpirar);
            console.log(`✅ ${removidas} recomendações antigas removidas`);
            return {
                success: true,
                removidas,
                message: `${removidas} recomendações antigas removidas`
            };
        }
        catch (error) {
            console.error('❌ Erro ao limpar recomendações antigas:', error);
            throw error;
        }
    }
}
export default new RecomendacaoService();
