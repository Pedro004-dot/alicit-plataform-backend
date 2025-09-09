"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pncpAdapter_1 = __importDefault(require("../../adapters/pncpAdapter"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
const buscarLicitacoes = async (params) => {
    console.log('🔍 Iniciando busca paralela de licitações...');
    console.log('📋 Parâmetros:', {
        dataFim: params.dataFim,
        palavraChave: params.palavraChave ? 'definida' : 'não definida'
    });
    const startTime = Date.now();
    const licitacoes = await pncpAdapter_1.default.searchLicitacoesPNCP({
        dataFinal: params.dataFim?.replace(/-/g, '')
    }, 30000);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`⚡ Busca paralela concluída em ${duration.toFixed(2)}s: ${licitacoes.length} licitações`);
    return licitacoes;
};
const searchLicitacao = async (data) => {
    const licitacoes = await buscarLicitacoes(data);
    console.log(`💾 Salvando ${licitacoes.length} licitações no Pinecone...`);
    await pineconeLicitacaoRepository_1.default.saveLicitacoes(licitacoes);
    // Licitações já salvas diretamente no Pinecone
    return {
        total: licitacoes.length,
        licitacoes: licitacoes,
        message: `${licitacoes.length} licitações salvas no Pinecone`
    };
};
// Não é mais necessário - licitações são salvas diretamente no Pinecone
exports.default = { searchLicitacao };
