/**
 * Sistema Robusto de Extração de Scores
 * Triplo fallback: Regex → Working Memory → Score Conservativo
 */

interface ScoreExtractionResult {
  score: number;
  method: 'regex' | 'working_memory' | 'conservative_fallback';
  confidence: 'high' | 'medium' | 'low';
  rawMatch?: string;
  warning?: string;
}

/**
 * Extrai score de forma robusta usando múltiplos métodos
 */
export function extractScore(
  analysisText: string,
  agentType: 'strategic' | 'operational' | 'legal' | 'financial',
  workingMemory?: string
): ScoreExtractionResult {
  
  // MÉTODO 1: Extração via Regex Estruturada
  const regexResult = extractScoreViaRegex(analysisText);
  if (regexResult.success) {
    return {
      score: regexResult.score,
      method: 'regex',
      confidence: 'high',
      rawMatch: regexResult.rawMatch
    };
  }

  // MÉTODO 2: Backup via Working Memory
  if (workingMemory) {
    const memoryResult = extractScoreFromWorkingMemory(workingMemory, agentType);
    if (memoryResult.success) {
      return {
        score: memoryResult.score,
        method: 'working_memory',
        confidence: 'medium',
        warning: 'Score extraído da working memory - verificar precisão'
      };
    }
  }

  // MÉTODO 3: Score Conservativo de Fallback
  const conservativeScore = getConservativeFallbackScore(agentType, analysisText);
  return {
    score: conservativeScore.score,
    method: 'conservative_fallback',
    confidence: 'low',
    warning: `Score fallback aplicado: ${conservativeScore.reason}`
  };
}

/**
 * MÉTODO 1: Extração via múltiplos padrões regex
 */
function extractScoreViaRegex(text: string): { success: boolean; score: number; rawMatch?: string } {
  // Padrões organizados por prioridade (mais específicos primeiro)
  const patterns = [
    // Formato "SCORE DE ADEQUAÇÃO: 85/100"
    /SCORE\s+DE\s+ADEQUAÇÃO:\s*(\d+)(?:\/100)?/i,
    
    // Formato "Score: 75"
    /Score:\s*(\d+)(?:\/100)?/i,
    
    // Formato "Score final: 80/100"  
    /Score\s+final:\s*(\d+)(?:\/100)?/i,
    
    // Formato "Pontuação: 70"
    /Pontuação:\s*(\d+)(?:\/100)?/i,
    
    // Formato "Nota: 85"
    /Nota:\s*(\d+)(?:\/100)?/i,
    
    // Formato "Rating: 90/100"
    /Rating:\s*(\d+)(?:\/100)?/i,
    
    // Formato genérico com números seguidos de /100
    /(\d+)\/100/g,
    
    // Último recurso: SCORE seguido de número
    /SCORE.*?(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const scoreValue = parseInt(match[1]);
      
      // Validar range 0-100
      if (scoreValue >= 0 && scoreValue <= 100) {
        return {
          success: true,
          score: scoreValue,
          rawMatch: match[0]
        };
      }
    }
  }

  return { success: false, score: 0 };
}

/**
 * MÉTODO 2: Extração da Working Memory
 */
function extractScoreFromWorkingMemory(workingMemory: string, agentType: string): { success: boolean; score: number } {
  // Procurar por scores parciais salvos na working memory
  const agentScorePatterns = [
    new RegExp(`${agentType}.*score.*?(\\d+)`, 'i'),
    new RegExp(`score.*${agentType}.*?(\\d+)`, 'i'),
    new RegExp(`\\*\\*Score [A-Za-z]*:\\*\\*\\s*(\\d+)`, 'i'),
    /Score\s+Parcial.*?(\d+)/i,
    /Última\s+Análise.*?(\d+)/i
  ];

  for (const pattern of agentScorePatterns) {
    const match = workingMemory.match(pattern);
    if (match) {
      const score = parseInt(match[1]);
      if (score >= 0 && score <= 100) {
        return { success: true, score };
      }
    }
  }

  return { success: false, score: 0 };
}

/**
 * MÉTODO 3: Score Conservativo Baseado em Análise Textual
 */
function getConservativeFallbackScore(
  agentType: 'strategic' | 'operational' | 'legal' | 'financial',
  analysisText: string
): { score: number; reason: string } {
  
  const text = analysisText.toLowerCase();
  
  // Palavras-chave positivas/negativas por contexto
  const positiveKeywords = [
    'viável', 'recomend', 'adequad', 'compatible', 'favorável', 
    'positiv', 'alto potencial', 'oportunidade', 'match'
  ];
  
  const negativeKeywords = [
    'inviável', 'não recomend', 'inadequad', 'incompatível', 'desfavorável',
    'negativ', 'alto risco', 'ameaça', 'sem match', 'não atende'
  ];

  // Contar ocorrências
  const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length;
  const negativeCount = negativeKeywords.filter(keyword => text.includes(keyword)).length;
  
  // Score baseado em sentimento + baseline por agente
  const baselineScores = {
    strategic: 40, // Mais conservador
    operational: 45, 
    legal: 50,     // Neutro
    financial: 35  // Mais conservador (risco financeiro)
  };
  
  const baseline = baselineScores[agentType];
  const sentimentAdjustment = (positiveCount - negativeCount) * 10;
  
  // Aplicar limitações
  const finalScore = Math.max(10, Math.min(90, baseline + sentimentAdjustment));
  
  return {
    score: finalScore,
    reason: `Baseline ${baseline} + sentiment (${positiveCount}pos/${negativeCount}neg) = ${finalScore}`
  };
}

/**
 * Utilitário para extrair decisão final
 */
export function extractDecision(analysisText: string): "PROSSEGUIR" | "NAO_PROSSEGUIR" {
  const text = analysisText.toLowerCase();
  
  const positivePatterns = [
    /decisão.*prosseguir/i,
    /recomend.*participar/i,
    /viável.*participar/i,
    /✅.*participar/i
  ];
  
  const negativePatterns = [
    /decisão.*não.*prosseguir/i,
    /não.*recomend.*participar/i,
    /inviável.*participar/i,
    /❌.*participar/i
  ];
  
  // Verificar padrões específicos primeiro
  for (const pattern of positivePatterns) {
    if (pattern.test(analysisText)) {
      return "PROSSEGUIR";
    }
  }
  
  for (const pattern of negativePatterns) {
    if (pattern.test(analysisText)) {
      return "NAO_PROSSEGUIR";
    }
  }
  
  // Fallback baseado em palavras-chave
  const positiveWords = ['viável', 'recomend', 'participar', 'prosseguir', 'favorável'];
  const negativeWords = ['inviável', 'não recomend', 'não participar', 'não prosseguir', 'desfavorável'];
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;
  
  return positiveCount > negativeCount ? "PROSSEGUIR" : "NAO_PROSSEGUIR";
}

/**
 * Log detalhado do processo de extração para debug
 */
export function logScoreExtraction(result: ScoreExtractionResult, agentType: string): void {
  const methodEmoji = {
    'regex': '🎯',
    'working_memory': '🧠', 
    'conservative_fallback': '🛡️'
  };
  
  const confidenceEmoji = {
    'high': '✅',
    'medium': '⚠️',
    'low': '❌'
  };
  
  console.log(`${methodEmoji[result.method]} [${agentType.toUpperCase()} SCORE] Extraído: ${result.score}/100`);
  console.log(`   Método: ${result.method} | Confiança: ${confidenceEmoji[result.confidence]} ${result.confidence}`);
  
  if (result.rawMatch) {
    console.log(`   Match: "${result.rawMatch}"`);
  }
  
  if (result.warning) {
    console.log(`   ⚠️ ${result.warning}`);
  }
}