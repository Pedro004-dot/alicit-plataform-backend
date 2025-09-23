"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoEmpresaRepository_1 = __importDefault(require("../../repositories/licitacaoEmpresaRepository"));
const statusValidos = [
    "nao_definido", "selecionada", "nao_analisado", "em_analise", "analisado", "proposta", "enviada",
    "vencida", "recusada", "perdida"
];
const validarStatus = (status) => {
    return statusValidos.includes(status);
};
const criar = async (data) => {
    const status = data.status || "nao_definido";
    if (!validarStatus(status)) {
        throw new Error(`Status inválido: ${status}`);
    }
    return await licitacaoEmpresaRepository_1.default.criar({
        ...data,
        status
    });
};
const atualizarStatus = async (id, novoStatus) => {
    if (!validarStatus(novoStatus)) {
        throw new Error(`Status inválido: ${novoStatus}`);
    }
    return await licitacaoEmpresaRepository_1.default.atualizarStatus(id, novoStatus);
};
const listarPorEmpresa = async (cnpj) => {
    return await licitacaoEmpresaRepository_1.default.listarPorEmpresa(cnpj);
};
const buscarPorId = async (id) => {
    const licitacao = await licitacaoEmpresaRepository_1.default.buscarPorId(id);
    if (!licitacao) {
        throw new Error("Licitação não encontrada");
    }
    return licitacao;
};
const buscarOuCriar = async (numeroControlePNCP, empresaCnpj) => {
    const existente = await licitacaoEmpresaRepository_1.default.buscarPorChaves(numeroControlePNCP, empresaCnpj);
    if (existente) {
        return existente;
    }
    return await criar({
        numeroControlePNCP,
        cnpjEmpresa: empresaCnpj,
        status: "nao_definido"
    });
};
const atualizarStatusPorChaves = async (numeroControlePNCP, empresaCnpj, novoStatus) => {
    if (!validarStatus(novoStatus)) {
        throw new Error(`Status inválido: ${novoStatus}`);
    }
    const licitacao = await buscarOuCriar(numeroControlePNCP, empresaCnpj);
    return await licitacaoEmpresaRepository_1.default.atualizarStatus(licitacao.id, novoStatus);
};
const deletar = async (id) => {
    return await licitacaoEmpresaRepository_1.default.deletar(id);
};
exports.default = {
    criar,
    atualizarStatus,
    atualizarStatusPorChaves,
    listarPorEmpresa,
    buscarPorId,
    buscarOuCriar,
    deletar,
    statusValidos
};
