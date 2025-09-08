import pineconeCacheService from '../../../repositories/pineconeLicitacaoRepository';
const STOPWORDS = new Set(['para', 'com', 'sem', 'por', 'sua', 'suas', 'seu', 'seus', 'uma', 'dos', 'das', 'pela', 'pelo', 'sob', 'ate']);
/**
 * Normaliza texto removendo acentos, caracteres especiais e stopwords
 * @param text - Texto a ser normalizado
 * @returns Array de termos normalizados
 */
export const normalizeText = (text) => {
    const cached = pineconeCacheService.getCachedText(text);
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
    pineconeCacheService.setCachedText(text, normalized);
    return normalized;
};
