import { EmpresaPerfil, PNCPLicitacao, MatchResult } from './types';
import { normalizeText } from './textNormalization';
import { calculateRegexScore } from './regexScore';
import { calculateLevenshteinScore } from './levenshteinScore';
import { calculateTfidfScore } from './tfidfScore';
import { calculateTaxonomiaScore } from './taxonomiaScore';

/**
 * Calcula o score final de matching entre perfil da empresa e licitação
 * @param empresaPerfil - Perfil da empresa com termos de interesse
 * @param licitacao - Licitação a ser analisada
 * @returns Resultado do matching com score e detalhes
 */
export const calculateMatchingScore = (empresaPerfil: EmpresaPerfil, licitacao: PNCPLicitacao): MatchResult => {
  // Se não há termos de interesse, usa score base = 1.0 (sem análise textual)
  const temTermos = empresaPerfil.termosInteresse?.length > 0;
  
  let regexScore = 0;
  let levenshteinScore = 0;
  let tfidfScore = 0;
  let taxonomiaScore = 0;
  let finalScore = 1.0; // Score base quando não há análise textual
  
  if (temTermos) {
    const empresaTermos = normalizeText(empresaPerfil.termosInteresse.join(' '));
    
    regexScore = calculateRegexScore(empresaTermos, licitacao.itens);
    levenshteinScore = calculateLevenshteinScore(empresaTermos, licitacao.itens);
    tfidfScore = calculateTfidfScore(empresaTermos, licitacao.itens);
    taxonomiaScore = calculateTaxonomiaScore(empresaTermos, licitacao.itens);
    
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

/**
 * Aplica regras de negócio para boosting/penalização do score
 * @param score - Score inicial
 * @param empresaPerfil - Perfil da empresa
 * @param licitacao - Licitação analisada
 * @returns Score ajustado
 */
const applyBusinessRules = (score: number, empresaPerfil: EmpresaPerfil, licitacao: PNCPLicitacao): number => {
  let adjustedScore = score;
  
  // Boost por modalidade preferida
  if (empresaPerfil.modalidadesPreferidas?.includes(licitacao.modalidadeNome)) {
    adjustedScore *= 1.2;
  }
  
  // Boost por correspondência NCM
  const hasNCMMatch = licitacao.itens.some(item => 
    item.ncmNbsCodigo && empresaPerfil.codigosNCM?.includes(item.ncmNbsCodigo)
  );
  if (hasNCMMatch) {
    adjustedScore *= 1.5;
  }
  
  return adjustedScore;
};
