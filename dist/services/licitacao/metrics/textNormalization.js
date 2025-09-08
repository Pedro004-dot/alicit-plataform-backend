"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeText = void 0;
const pineconeLicitacaoRepository_1 = __importDefault(require("../../../repositories/pineconeLicitacaoRepository"));
const STOPWORDS = new Set(['para', 'com', 'sem', 'por', 'sua', 'suas', 'seu', 'seus', 'uma', 'dos', 'das', 'pela', 'pelo', 'sob', 'ate']);
/**
 * Normaliza texto removendo acentos, caracteres especiais e stopwords
 * @param text - Texto a ser normalizado
 * @returns Array de termos normalizados
 */
const normalizeText = (text) => {
    const cached = pineconeLicitacaoRepository_1.default.getCachedText(text);
    if (cached)
        return cached;
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\b(ltda|s\.a\.|me|epp|eireli)\b/g, '') // Remove sufixos empresariais
        .split(/\s+/)
        .filter(term => term.length > 2 && !STOPWORDS.has(term));
    pineconeLicitacaoRepository_1.default.setCachedText(text, normalized);
    return normalized;
};
exports.normalizeText = normalizeText;
