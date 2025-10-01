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
    
    // 🎯 FILTRO: Apenas licitações ativas (dataEncerramentoProposta > hoje)
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const licitacoesAtivas = licitacoes.filter(licitacao => {
        const dataEncerramento = licitacao.dataEncerramentoProposta;
        
        // Se não tem data de encerramento, considera ativa
        if (!dataEncerramento) return true;
        
        // Normalizar formato da data (pode vir como YYYY-MM-DD ou YYYYMMDD)
        let dataFormatada = dataEncerramento;
        if (dataEncerramento.length === 8) {
            // Se está em YYYYMMDD, converter para YYYY-MM-DD
            dataFormatada = `${dataEncerramento.slice(0,4)}-${dataEncerramento.slice(4,6)}-${dataEncerramento.slice(6,8)}`;
        }
        
        return dataFormatada > hoje;
    });
    
    console.log(`🔍 Filtro aplicado: ${licitacoes.length} → ${licitacoesAtivas.length} licitações ativas`);
    console.log(`📅 Critério: dataEncerramentoProposta > ${hoje}`);
    console.log(`💾 Salvando ${licitacoesAtivas.length} licitações ativas no Pinecone...`);
    
    await pineconeLicitacaoRepository.saveLicitacoes(licitacoesAtivas);
    

    return {
        total: licitacoesAtivas.length,
        licitacoes: licitacoesAtivas,
        fonte: data.fonte || LicitacaoAdapterFactory.getFonteDefault(),
        message: `${licitacoesAtivas.length} licitações ativas salvas (${licitacoes.length - licitacoesAtivas.length} finalizadas ignoradas)`
    };
};


export default { searchLicitacao };