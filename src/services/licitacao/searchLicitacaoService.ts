import LicitacaoAdapterFactory from '../../adapters/factories/LicitacaoAdapterFactory';
import { SearchParams, LicitacaoStandard } from '../../adapters/interfaces/ILicitacaoAdapter';
import licitacaoStorageService from './licitacaoStorageService';

interface SearchLicitacaoInput extends SearchParams {
    dataFim: string;
    modalidades?: number[]; // 🆕 NOVO: Modalidades específicas (opcional)
}

const buscarLicitacoes = async (params: SearchLicitacaoInput): Promise<LicitacaoStandard[]> => { 
    const startTime = Date.now();

    const fonte = params.fonte || LicitacaoAdapterFactory.getFonteDefault();
    const adapter = LicitacaoAdapterFactory.create(fonte);
    
    // 📋 LOG DAS MODALIDADES
    const modalidadesInfo = params.modalidades 
      ? `modalidades [${params.modalidades.join(', ')}]`
      : 'TODAS as modalidades';
    
    console.log(`🔍 Buscando licitações via ${adapter.getNomeFonte().toUpperCase()} - ${modalidadesInfo}...`);
    
    const licitacoes = await adapter.buscarLicitacoes(params);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`⏱️ Busca concluída em ${duration}s`);
    
    return licitacoes;
};

// 📅 FILTRO DE DATA CENTRALIZADO (alinhado com migrateHistoricalLicitacoes.ts)
const filterByDataEncerramento = (licitacoes: LicitacaoStandard[]): LicitacaoStandard[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Reset horas para comparação correta
    
    const licitacoesAtivas = licitacoes.filter(licitacao => {
        const dataEncerramento = licitacao.dataEncerramentoProposta;
        
        // Se não tem data, considera ativa
        if (!dataEncerramento) return true;
        
        // Converter para Date object para comparação correta
        let dataEncerramentoObj: Date;
        
        if (dataEncerramento.length === 8) {
            // YYYYMMDD
            const ano = parseInt(dataEncerramento.slice(0, 4));
            const mes = parseInt(dataEncerramento.slice(4, 6)) - 1; // Month 0-indexed
            const dia = parseInt(dataEncerramento.slice(6, 8));
            dataEncerramentoObj = new Date(ano, mes, dia);
        } else if (dataEncerramento.includes('T')) {
            // ISO format with time (YYYY-MM-DDTHH:mm:ss)
            dataEncerramentoObj = new Date(dataEncerramento);
        } else {
            // YYYY-MM-DD
            dataEncerramentoObj = new Date(dataEncerramento);
        }
        
        return dataEncerramentoObj > hoje;
    });
    
    return licitacoesAtivas;
};

const searchLicitacao = async (data: SearchLicitacaoInput) => {
    const licitacoes = await buscarLicitacoes(data);
    
    // 🎯 USAR FILTRO CENTRALIZADO (mesma lógica do migration)
    const licitacoesAtivas = filterByDataEncerramento(licitacoes);
    
    console.log(`🔍 Filtro aplicado: ${licitacoes.length} → ${licitacoesAtivas.length} licitações ativas`);
    
    // Log simplificado (alinhado com migration)
    if (licitacoes.length > licitacoesAtivas.length) {
        const filtradas = licitacoes.length - licitacoesAtivas.length;
        console.log(`❌ ${filtradas} licitações filtradas (data de encerramento expirada)`);
    }
    
    console.log(`💾 Salvando ${licitacoesAtivas.length} licitações ativas usando LicitacaoStorageService...`);
    
    // Usar o serviço de storage para coordenar salvamento em ambos os bancos
    const storageResult = await licitacaoStorageService.saveLicitacoes(licitacoesAtivas);
    
    if (storageResult.success) {
        console.log(`✅ Salvou ${storageResult.total} licitações (Supabase: ${storageResult.supabase}, Pinecone: ${storageResult.pinecone})`);
    } else {
        console.error(`❌ Falhas no salvamento:`, storageResult.errors);
    }
    

    return {
        total: licitacoesAtivas.length,
        licitacoes: licitacoesAtivas,
        fonte: data.fonte || LicitacaoAdapterFactory.getFonteDefault(),
        message: `${licitacoesAtivas.length} licitações ativas salvas (${licitacoes.length - licitacoesAtivas.length} finalizadas ignoradas)`
    };
};


export default { searchLicitacao, filterByDataEncerramento };