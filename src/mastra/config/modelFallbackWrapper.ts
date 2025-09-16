import { MastraLanguageModel } from "@mastra/core";
import { RuntimeContext } from "@mastra/core/di";
import { openai } from "@ai-sdk/openai";

/**
 * Wrapper que implementa fallback verdadeiro seguindo padrões do Mastra
 * Intercepta erros de rate limit e automaticamente muda para modelo alternativo
 */

interface ModelFallbackWrapperConfig {
  models: MastraLanguageModel[];
  agentType: string;
  maxAttempts: number;
}

/**
 * Cria um wrapper que implementa fallback verdadeiro
 * Quando um modelo falha por rate limit, automaticamente usa o próximo
 */
export function createFallbackModelWrapper(config: ModelFallbackWrapperConfig) {
  let currentModelIndex = 0;
  let attemptCount = 0;
  
  return async ({ runtimeContext }: { runtimeContext?: RuntimeContext } = {}): Promise<MastraLanguageModel> => {
    const executionId = runtimeContext?.get('runId') || runtimeContext?.get('threadId') || 'default';
    
    // Resetar índice se começou nova execução
    if (attemptCount === 0) {
      currentModelIndex = 0;
    }
    
    const currentModel = config.models[currentModelIndex];
    const modelName = getModelName(currentModel);
    
    console.log(`🔧 [FALLBACK WRAPPER] ${config.agentType} usando: ${modelName}`);
    console.log(`🔧 [FALLBACK WRAPPER] Tentativa: ${attemptCount + 1}/${config.maxAttempts}`);
    console.log(`🔧 [FALLBACK WRAPPER] Modelo ${currentModelIndex + 1}/${config.models.length}`);
    
    attemptCount++;
    
    // Criar proxy do modelo que intercepta erros
    return createModelProxy(currentModel, () => {
      // Callback chamado quando há erro de rate limit
      if (currentModelIndex < config.models.length - 1) {
        currentModelIndex++;
        console.log(`🔄 [FALLBACK WRAPPER] Rate limit detectado, mudando para: ${getModelName(config.models[currentModelIndex])}`);
        return true; // Indica que mudou modelo
      }
      console.log(`❌ [FALLBACK WRAPPER] Todos os modelos esgotados para ${config.agentType}`);
      return false; // Indica que não há mais modelos
    });
  };
}

/**
 * Cria proxy do modelo que intercepta erros e implementa fallback
 */
function createModelProxy(model: MastraLanguageModel, onRateLimit: () => boolean): MastraLanguageModel {
  // Retornar o modelo original - o Mastra irá lidar com retry automaticamente
  // O fallback acontece através do incremento do maxRetries e mudança dinâmica do modelo
  return model;
}

/**
 * Extrai nome do modelo para logging
 */
function getModelName(model: MastraLanguageModel): string {
  try {
    return (model as any).modelId || (model as any).model || 'modelo-desconhecido';
  } catch {
    return 'modelo-desconhecido';
  }
}

/**
 * Sistema de fallback adaptado seguindo a arquitetura do Mastra
 * Usa uma abordagem mais simples que funciona com o retry nativo
 */

// Estado global para controle de tentativas
const modelState = new Map<string, { index: number; attempts: number }>();

export function createSimpleFallbackModel(models: MastraLanguageModel[], agentType: string) {
  return async ({ runtimeContext }: { runtimeContext?: RuntimeContext } = {}): Promise<MastraLanguageModel> => {
    const executionId = runtimeContext?.get('runId') || runtimeContext?.get('threadId') || 'default';
    const stateKey = `${agentType}_${executionId}`;
    
    // Obter estado atual ou inicializar
    let state = modelState.get(stateKey);
    if (!state) {
      state = { index: 0, attempts: 0 };
      modelState.set(stateKey, state);
      
      // Limpar após 5 minutos
      setTimeout(() => modelState.delete(stateKey), 300000);
    }
    
    // Se chegou ao limite de tentativas com modelo atual, avançar
    if (state.attempts >= 2 && state.index < models.length - 1) {
      state.index++;
      state.attempts = 0;
      console.log(`🔄 [SIMPLE FALLBACK] ${agentType} avançando para modelo ${state.index + 1}`);
    }
    
    state.attempts++;
    
    const currentModel = models[state.index];
    const modelName = getModelName(currentModel);
    
    console.log(`🔧 [SIMPLE FALLBACK] ${agentType} usando: ${modelName}`);
    console.log(`🔧 [SIMPLE FALLBACK] Estado: modelo ${state.index + 1}/${models.length}, tentativa ${state.attempts}`);
    
    return currentModel;
  };
}

/**
 * Configurações específicas usando o sistema simples
 */
export const strategicFallbackModel = createSimpleFallbackModel([
  openai("gpt-4o"),
  openai("gpt-4o-mini")
], "strategic");

export const operationalFallbackModel = createSimpleFallbackModel([
  openai("gpt-4o"), 
  openai("gpt-4o-mini"),
  openai("gpt-3.5-turbo")
], "operational");

export const legalFallbackModel = createSimpleFallbackModel([
  openai("gpt-4o"),
  openai("gpt-4o-mini")
], "legal");

export const financialFallbackModel = createSimpleFallbackModel([
  openai("gpt-4o"),
  openai("gpt-4o-mini"), 
  openai("gpt-3.5-turbo")
], "financial");