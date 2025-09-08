import pncpAdapter from '../../adapters/pncpAdapter';
import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';
const buscarLicitacoes = async (params) => {
    console.log('🔍 Iniciando busca paralela de licitações...');
    console.log('📋 Parâmetros:', {
        dataFim: params.dataFim,
        palavraChave: params.palavraChave ? 'definida' : 'não definida'
    });
    const startTime = Date.now();
    const licitacoes = await pncpAdapter.searchLicitacoesPNCP({
        dataFinal: params.dataFim?.replace(/-/g, '')
    }, 1000);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`⚡ Busca paralela concluída em ${duration.toFixed(2)}s: ${licitacoes.length} licitações`);
    return licitacoes;
};
const searchLicitacao = async (data) => {
    const licitacoes = await buscarLicitacoes(data);
    console.log(`💾 Salvando ${licitacoes.length} licitações no Pinecone...`);
    await pineconeLicitacaoRepository.saveLicitacoes(licitacoes);
    // Licitações já salvas diretamente no Pinecone
    return {
        total: licitacoes.length,
        licitacoes: licitacoes,
        message: `${licitacoes.length} licitações salvas no Pinecone`
    };
};
// Não é mais necessário - licitações são salvas diretamente no Pinecone
export default { searchLicitacao };
