"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMatchingScore = void 0;
const textNormalization_1 = require("./textNormalization");
const regexScore_1 = require("./regexScore");
const levenshteinScore_1 = require("./levenshteinScore");
const tfidfScore_1 = require("./tfidfScore");
const taxonomiaScore_1 = require("./taxonomiaScore");
/**
 * Calcula o score final de matching entre perfil da empresa e licitação
 * @param empresaPerfil - Perfil da empresa com termos de interesse
 * @param licitacao - Licitação a ser analisada
 * @returns Resultado do matching com score e detalhes
 */
const calculateMatchingScore = (empresaPerfil, licitacao) => {
    // Se não há termos de interesse, usa score base = 1.0 (sem análise textual)
    const temTermos = empresaPerfil.termosInteresse?.length > 0;
    let regexScore = 0;
    let levenshteinScore = 0;
    let tfidfScore = 0;
    let taxonomiaScore = 0;
    let finalScore = 1.0; // Score base quando não há análise textual
    if (temTermos) {
        const empresaTermos = (0, textNormalization_1.normalizeText)(empresaPerfil.termosInteresse.join(' '));
        regexScore = (0, regexScore_1.calculateRegexScore)(empresaTermos, licitacao.itens);
        levenshteinScore = (0, levenshteinScore_1.calculateLevenshteinScore)(empresaTermos, licitacao.itens);
        tfidfScore = (0, tfidfScore_1.calculateTfidfScore)(empresaTermos, licitacao.itens);
        taxonomiaScore = (0, taxonomiaScore_1.calculateTaxonomiaScore)(empresaTermos, licitacao.itens);
        finalScore = (regexScore * 0.4) + (levenshteinScore * 0.3) + (tfidfScore * 0.2) + (taxonomiaScore * 0.1);
    }
    // Aplica regras de negócio (sempre aplicadas, com ou sem termos)
    finalScore = applyBusinessRules(finalScore, empresaPerfil, licitacao);
    return {
        licitacao,
        matchScore: Math.min(finalScore, 1.0),
        matchDetails: {
            regexScore,
            levenshteinScore,
            tfidfScore,
            taxonomiaScore
        }
    };
};
exports.calculateMatchingScore = calculateMatchingScore;
/**
 * Aplica regras de negócio para boosting/penalização do score
 * @param score - Score inicial
 * @param empresaPerfil - Perfil da empresa
 * @param licitacao - Licitação analisada
 * @returns Score ajustado
 */
const applyBusinessRules = (score, empresaPerfil, licitacao) => {
    let adjustedScore = score;
    // Boost por modalidade preferida
    if (empresaPerfil.modalidadesPreferidas?.includes(licitacao.modalidadeNome)) {
        adjustedScore *= 1.2;
    }
    // Boost por correspondência NCM
    const hasNCMMatch = licitacao.itens.some(item => item.ncmNbsCodigo && empresaPerfil.codigosNCM?.includes(item.ncmNbsCodigo));
    if (hasNCMMatch) {
        adjustedScore *= 1.5;
    }
    return adjustedScore;
};
