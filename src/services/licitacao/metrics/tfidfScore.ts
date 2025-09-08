import { PNCPItem } from './types';
import { normalizeText } from './textNormalization';

/**
 * Calcula TF-IDF e similaridade coseno entre dois conjuntos de termos
 * @param empresaTermos - Termos de interesse da empresa
 * @param licitacaoTermos - Termos da licitação
 * @returns Score de similaridade coseno entre 0 e 1
 */
const calculateTfIdf = (empresaTermos: string[], licitacaoTermos: string[]): number => {
  if (empresaTermos.length === 0 || licitacaoTermos.length === 0) return 0;
  
  // Criar vocabulário único
  const vocabulary = [...new Set([...empresaTermos, ...licitacaoTermos])];
  
  // Calcular TF para empresa (query)
  const empresaTf = vocabulary.map(term => {
    const count = empresaTermos.filter(t => t === term).length;
    return count / empresaTermos.length;
  });
  
  // Calcular TF para licitação (documento)  
  const licitacaoTf = vocabulary.map(term => {
    const count = licitacaoTermos.filter(t => t === term).length;
    return count / licitacaoTermos.length;
  });
  
  // Calcular IDF (simplificado para 2 documentos)
  const idf = vocabulary.map(term => {
    const empresaHasTerm = empresaTermos.includes(term) ? 1 : 0;
    const licitacaoHasTerm = licitacaoTermos.includes(term) ? 1 : 0;
    const docsWithTerm = empresaHasTerm + licitacaoHasTerm;
    return Math.log(2 / (docsWithTerm || 1));
  });
  
  // Calcular vetores TF-IDF
  const empresaTfIdf = empresaTf.map((tf, i) => tf * idf[i]);
  const licitacaoTfIdf = licitacaoTf.map((tf, i) => tf * idf[i]);
  
  // Similaridade coseno
  const dotProduct = empresaTfIdf.reduce((sum, val, i) => sum + val * licitacaoTfIdf[i], 0);
  const empresaMagnitude = Math.sqrt(empresaTfIdf.reduce((sum, val) => sum + val * val, 0));
  const licitacaoMagnitude = Math.sqrt(licitacaoTfIdf.reduce((sum, val) => sum + val * val, 0));
  
  if (empresaMagnitude === 0 || licitacaoMagnitude === 0) return 0;
  
  return dotProduct / (empresaMagnitude * licitacaoMagnitude);
};

/**
 * Calcula score baseado em TF-IDF e similaridade coseno
 * @param empresaTermos - Termos de interesse da empresa
 * @param licitacaoItens - Itens da licitação
 * @returns Score entre 0 e 1
 */
export const calculateTfidfScore = (empresaTermos: string[], licitacaoItens: PNCPItem[]): number => {
  const allDescricoes = licitacaoItens.map(item => item.descricao);
  const licitacaoTermos = normalizeText(allDescricoes.join(' '));
  
  return calculateTfIdf(empresaTermos, licitacaoTermos);
};
