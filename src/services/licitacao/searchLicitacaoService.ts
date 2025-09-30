import LicitacaoAdapterFactory from '../../adapters/factories/LicitacaoAdapterFactory';
import { SearchParams, LicitacaoStandard } from '../../adapters/interfaces/ILicitacaoAdapter';
import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';

interface SearchLicitacaoInput extends SearchParams {
    dataFim: string;
}

const buscarLicitacoes = async (params: SearchLicitacaoInput): Promise<LicitacaoStandard[]> => { 
    const startTime = Date.now();

    const fonte = params.fonte || LicitacaoAdapterFactory.getFonteDefault();
    const adapter = LicitacaoAdapterFactory.create(fonte);
    
    console.log(`🔍 Buscando licitações via ${adapter.getNomeFonte().toUpperCase()}...`);
    
    const licitacoes = await adapter.buscarLicitacoes(params);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`⏱️ Busca concluída em ${duration}s`);
    
    return licitacoes;
};

const searchLicitacao = async (data: SearchLicitacaoInput) => {
    const licitacoes = await buscarLicitacoes(data);
    
    console.log(`💾 Salvando ${licitacoes.length} licitações no Pinecone...`);
    await pineconeLicitacaoRepository.saveLicitacoes(licitacoes);
    

    return {
        total: licitacoes.length,
        licitacoes: licitacoes,
        fonte: data.fonte || LicitacaoAdapterFactory.getFonteDefault(),
        message: `${licitacoes.length} licitações salvas no Pinecone`
    };
};


export default { searchLicitacao };