"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pncpAdapter_1 = __importDefault(require("../../adapters/pncpAdapter"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
const buscarLicitacoes = async (params) => {
    const startTime = Date.now();
    const licitacoes = await pncpAdapter_1.default.buscarLicitacoesPNCP({
        dataFinal: params.dataFim?.replace(/-/g, '')
    }, 30000);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    return licitacoes;
};
const searchLicitacao = async (data) => {
    const licitacoes = await buscarLicitacoes(data);
    console.log(`💾 Salvando ${licitacoes.length} licitações no Pinecone...`);
    await pineconeLicitacaoRepository_1.default.saveLicitacoes(licitacoes);
    return {
        total: licitacoes.length,
        licitacoes: licitacoes,
        message: `${licitacoes.length} licitações salvas no Pinecone`
    };
};
exports.default = { searchLicitacao };
