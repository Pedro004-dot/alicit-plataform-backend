"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LicitacaoAdapterFactory_1 = __importDefault(require("../../adapters/factories/LicitacaoAdapterFactory"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
const buscarLicitacoes = async (params) => {
    const startTime = Date.now();
    const fonte = params.fonte || LicitacaoAdapterFactory_1.default.getFonteDefault();
    const adapter = LicitacaoAdapterFactory_1.default.create(fonte);
    console.log(`🔍 Buscando licitações via ${adapter.getNomeFonte().toUpperCase()}...`);
    const licitacoes = await adapter.buscarLicitacoes(params);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`⏱️ Busca concluída em ${duration}s`);
    return licitacoes;
};
const searchLicitacao = async (data) => {
    const licitacoes = await buscarLicitacoes(data);
    // 🎯 FILTRO: Apenas licitações realmente ativas
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
            // ISO format: 2025-09-22T10:00:00
            dataEncerramentoObj = new Date(dataEncerramento);
        }
        else {
            // YYYY-MM-DD
            dataEncerramentoObj = new Date(dataEncerramento);
        }
        // Resetar horas da data de encerramento para comparação apenas de dia
        dataEncerramentoObj.setHours(23, 59, 59, 999); // Final do dia
        return dataEncerramentoObj > hoje;
    });
    console.log(`🔍 Filtro aplicado: ${licitacoes.length} → ${licitacoesAtivas.length} licitações ativas`);
    console.log(`📅 Critério: dataEncerramentoProposta > ${hoje.toISOString().split('T')[0]}`);
    // Log de debug para amostra de licitações filtradas
    if (licitacoes.length > licitacoesAtivas.length) {
        const filtradas = licitacoes.filter(l => !licitacoesAtivas.includes(l));
        console.log(`❌ Exemplos de licitações filtradas (${filtradas.length} total):`);
        filtradas.slice(0, 3).forEach(l => {
            console.log(`   - ${l.numeroControlePNCP}: data=${l.dataEncerramentoProposta}`);
        });
    }
    console.log(`💾 Salvando ${licitacoesAtivas.length} licitações ativas no Pinecone...`);
    await pineconeLicitacaoRepository_1.default.saveLicitacoes(licitacoesAtivas);
    return {
        total: licitacoesAtivas.length,
        licitacoes: licitacoesAtivas,
        fonte: data.fonte || LicitacaoAdapterFactory_1.default.getFonteDefault(),
        message: `${licitacoesAtivas.length} licitações ativas salvas (${licitacoes.length - licitacoesAtivas.length} finalizadas ignoradas)`
    };
};
exports.default = { searchLicitacao };
