import pncpAdapter from '../../adapters/pncpAdapter';
import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';

interface SearchLicitacaoInput {
    dataFim: string;
}

const buscarLicitacoes = async (params: SearchLicitacaoInput) => { 
 
    const startTime = Date.now();

    const licitacoes = await pncpAdapter.buscarLicitacoesPNCP({
        dataFinal: params.dataFim?.replace(/-/g, '')
    }, 30000); 
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    return licitacoes;
};

const searchLicitacao = async (data: SearchLicitacaoInput) => {
    const licitacoes = await buscarLicitacoes(data);
    
    console.log(`💾 Salvando ${licitacoes.length} licitações no Pinecone...`);
    await pineconeLicitacaoRepository.saveLicitacoes(licitacoes);
    

        
    return {
        total: licitacoes.length,
        licitacoes: licitacoes,
        message: `${licitacoes.length} licitações salvas no Pinecone`
    };
};


export default { searchLicitacao };