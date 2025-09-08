// Exporta todas as funções de métricas em um módulo centralizado
export { normalizeText } from './textNormalization';
export { calculateRegexScore } from './regexScore';
export { calculateLevenshteinScore } from './levenshteinScore';
export { calculateTfidfScore } from './tfidfScore';
export { calculateTaxonomiaScore } from './taxonomiaScore';
export { calculateMatchingScore } from './matchingCalculator';
export * from './types';
