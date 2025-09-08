import { PNCPItem } from './types';
import { normalizeText } from './textNormalization';

/**
 * Calcula distância de Levenshtein entre duas strings
 * @param str1 - Primeira string
 * @param str2 - Segunda string
 * @returns Distância de Levenshtein
 */
const calculateLevenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Calcula score baseado em similaridade de Levenshtein
 * @param empresaTermos - Termos de interesse da empresa
 * @param licitacaoItens - Itens da licitação
 * @returns Score entre 0 e 1
 */
export const calculateLevenshteinScore = (empresaTermos: string[], licitacaoItens: PNCPItem[]): number => {
  const allDescricoes = licitacaoItens.map(item => item.descricao).join(' ');
  const licitacaoTermos = normalizeText(allDescricoes);
  
  let totalSimilarity = 0;
  let comparisons = 0;
  
  for (const empresaTermo of empresaTermos) {
    for (const licitacaoTermo of licitacaoTermos) {
      const maxLen = Math.max(empresaTermo.length, licitacaoTermo.length);
      if (maxLen > 0) {
        const distance = calculateLevenshteinDistance(empresaTermo, licitacaoTermo);
        const similarity = 1 - (distance / maxLen);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
  }
  
  return comparisons > 0 ? totalSimilarity / comparisons : 0;
};
