"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LicitacaoAdapterFactory_1 = __importDefault(require("../../adapters/factories/LicitacaoAdapterFactory"));
const licitacaoStorageService_1 = __importDefault(require("./licitacaoStorageService"));
const buscarLicitacoes = async (params) => {
    const startTime = Date.now();
    const fonte = params.fonte || LicitacaoAdapterFactory_1.default.getFonteDefault();
    const adapter = LicitacaoAdapterFactory_1.default.create(fonte);
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
const filterByDataEncerramento = (licitacoes) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Reset horas para comparação correta
    const licitacoesAtivas = licitacoes.filter(licitacao => {
        const dataEncerramento = licitacao.dataEncerramentoProposta;
        // Se não tem data, considera ativa
        if (!dataEncerramento)
            return true;
        // Converter para Date object para comparação correta
        let dataEncerramentoObj;
        if (dataEncerramento.length === 8) {
            // YYYYMMDD
            const ano = parseInt(dataEncerramento.slice(0, 4));
            const mes = parseInt(dataEncerramento.slice(4, 6)) - 1; // Month 0-indexed
            const dia = parseInt(dataEncerramento.slice(6, 8));
            dataEncerramentoObj = new Date(ano, mes, dia);
        }
        else if (dataEncerramento.includes('T')) {
            // ISO format with time (YYYY-MM-DDTHH:mm:ss)
            dataEncerramentoObj = new Date(dataEncerramento);
        }
        else {
            // YYYY-MM-DD
            dataEncerramentoObj = new Date(dataEncerramento);
        }
        return dataEncerramentoObj > hoje;
    });
    return licitacoesAtivas;
};
const searchLicitacao = async (data) => {
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
    const storageResult = await licitacaoStorageService_1.default.saveLicitacoes(licitacoesAtivas);
    if (storageResult.success) {
        console.log(`✅ Salvou ${storageResult.total} licitações (Supabase: ${storageResult.supabase}, Pinecone: ${storageResult.pinecone})`);
    }
    else {
        console.error(`❌ Falhas no salvamento:`, storageResult.errors);
    }
    return {
        total: licitacoesAtivas.length,
        licitacoes: licitacoesAtivas,
        fonte: data.fonte || LicitacaoAdapterFactory_1.default.getFonteDefault(),
        message: `${licitacoesAtivas.length} licitações ativas salvas (${licitacoes.length - licitacoesAtivas.length} finalizadas ignoradas)`
    };
};
exports.default = { searchLicitacao, filterByDataEncerramento };
