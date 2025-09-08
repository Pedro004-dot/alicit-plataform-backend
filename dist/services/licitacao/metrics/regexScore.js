"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRegexScore = void 0;
const textNormalization_1 = require("./textNormalization");
/**
 * Calcula score baseado em correspondências regex
 * @param empresaTermos - Termos de interesse da empresa
 * @param licitacaoItens - Itens da licitação
 * @returns Score entre 0 e 1
 */
const calculateRegexScore = (empresaTermos, licitacaoItens) => {
    const allDescricoes = licitacaoItens.map(item => item.descricao).join(' ');
    const normalizedDescricoes = (0, textNormalization_1.normalizeText)(allDescricoes);
    let matches = 0;
    for (const termo of empresaTermos) {
        const regex = new RegExp(termo, 'i');
        if (normalizedDescricoes.some(desc => regex.test(desc))) {
            matches++;
        }
    }
    return empresaTermos.length > 0 ? matches / empresaTermos.length : 0;
};
exports.calculateRegexScore = calculateRegexScore;
