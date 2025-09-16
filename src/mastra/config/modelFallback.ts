import { openai } from "@ai-sdk/openai";
import { MastraLanguageModel } from "@mastra/core";
import { RuntimeContext } from "@mastra/core/di";

/**
 * Sistema de fallback de modelos seguindo padrões do Mastra AI
 * Usa uma hierarquia de modelos otimizada para evitar rate limits
 * Hierarquia: gpt-4o-mini → gpt-4o → gpt-3.5-turbo
 * PRIORIZA gpt-4o-mini para reduzir consumo de tokens e rate limits
 */

export interface ModelFallbackConfig {
  models: MastraLanguageModel[]; // Lista ordenada por prioridade
  maxRetries: number;
  agentType?: string;
}

// Estado global para controle de fallback por execução
const fallbackState = new Map<string, {
  currentModelIndex: number;
  attemptCount: number;
}>(); 

/**
 * Configuração padrão de modelos para agentes
 * PRIORIZANDO gpt-4o-mini para evitar rate limits
 */
export const defaultModelHierarchy: ModelFallbackConfig = {
  models: [
    openai("gpt-4o-mini"), // Modelo primário - gpt-4o-mini conforme solicitado
    openai("gpt-4o"),      // Fallback 1 - compatível com streamVNext
    openai("gpt-3.5-turbo") // Fallback 2 - backup para casos extremos
  ],
  maxRetries: 1, // Reduzido para evitar acúmulo de contexto
  agentType: "default"
};

/**
 * Função principal para criar modelo com fallback automático
 * Implementa fallback VERDADEIRO: detecta rate limits e muda modelo
 */
export function createModelWithFallback(config: ModelFallbackConfig = defaultModelHierarchy) {
  return async ({ runtimeContext }: { runtimeContext?: RuntimeContext } = {}): Promise<MastraLanguageModel> => {
    // Gerar ID único para esta execução do agente
    const executionId = runtimeContext?.get('runId') || runtimeContext?.get('threadId') || 'default';
    const agentKey = `${config.agentType}_${executionId}`;
    
    // Obter ou inicializar estado do fallback para esta execução
    let state = fallbackState.get(agentKey);
    if (!state) {
      state = { currentModelIndex: 0, attemptCount: 0 };
      fallbackState.set(agentKey, state);
      
      // Limpar estado após um tempo para evitar vazamento de memória
      setTimeout(() => {
        fallbackState.delete(agentKey);
      }, 300000); // 5 minutos
    }
    
    // Selecionar o modelo atual baseado no estado
    const currentModel = config.models[state.currentModelIndex];
    const modelName = getModelName(currentModel);
    
    console.log(`🔧 [MODEL FALLBACK] ${config.agentType} usando modelo: ${modelName}`);
    console.log(`🔧 [MODEL FALLBACK] Índice atual: ${state.currentModelIndex}/${config.models.length - 1}`);
    console.log(`🔧 [MODEL FALLBACK] Tentativa global: ${state.attemptCount + 1}`);
    
    // 🔥 IMPLEMENTAÇÃO DO FALLBACK VERDADEIRO
    return createFallbackProxy(currentModel, config, agentKey);
  };
}

/**
 * Cria um proxy do modelo que intercepta erros de rate limit
 * e automaticamente muda para o próximo modelo na hierarquia
 */
function createFallbackProxy(model: MastraLanguageModel, config: ModelFallbackConfig, agentKey: string): MastraLanguageModel {
  // Criar wrapper que intercepta chamadas do modelo
  const originalModel = model as any;
  
  // Proxy que intercepta métodos do modelo
  return new Proxy(originalModel, {
    get(target, prop, receiver) {
      const originalValue = target[prop];
      
      // Se é uma função (especialmente doGenerate, doStream)
      if (typeof originalValue === 'function') {
        return async function(...args: any[]) {
          try {
            console.log(`🚀 [FALLBACK PROXY] Executando ${String(prop)} com modelo ${getModelName(model)}`);
            const result = await originalValue.apply(target, args);
            // ✅ Sucesso: resetar contador de tentativas
            const state = fallbackState.get(agentKey);
            if (state) {
              state.attemptCount = 0;
            }
            return result;
          } catch (error: any) {
            // ❌ Erro: incrementar contador apenas aqui
            const state = fallbackState.get(agentKey);
            if (state) {
              state.attemptCount++;
            }
            console.log(`⚠️ [FALLBACK PROXY] Erro interceptado:`, error.message?.substring(0, 100));
            
            // Detectar se é erro de rate limit
            if (isRateLimitError(error)) {
              console.log(`🚨 [FALLBACK PROXY] Rate limit detectado! Tentando próximo modelo...`);
              
              const nextModel = getNextModel(config, agentKey);
              if (nextModel) {
                console.log(`🔄 [FALLBACK PROXY] Mudando para: ${getModelName(nextModel)}`);
                // Adicionar delay de 2 segundos antes de tentar novo modelo
                console.log(`⏳ [FALLBACK PROXY] Aguardando 2 segundos antes de tentar novo modelo...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Tentar novamente com o novo modelo
                return await (nextModel as any)[prop as keyof MastraLanguageModel](...args);
              } else {
                console.log(`❌ [FALLBACK PROXY] Sem mais modelos disponíveis`);
                throw error;
              }
            }
            
            // Se não é rate limit, lançar erro original
            throw error;
          }
        };
      }
      
      return originalValue;
    }
  });
}

/**
 * Detecta se o erro é de rate limit
 */
function isRateLimitError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('quota exceeded') ||
    errorCode === 'rate_limit_exceeded' ||
    error.status === 429
  );
}

/**
 * Obtém o próximo modelo na hierarquia de fallback
 */
function getNextModel(config: ModelFallbackConfig, agentKey: string): MastraLanguageModel | null {
  const state = fallbackState.get(agentKey);
  if (!state) return null;
  
  // Se ainda temos modelos na hierarquia
  if (state.currentModelIndex < config.models.length - 1) {
    state.currentModelIndex++;
    state.attemptCount = 0; // Reset contador para novo modelo
    
    const nextModel = config.models[state.currentModelIndex];
    console.log(`✅ [NEXT MODEL] Avançando para modelo ${state.currentModelIndex + 1}/${config.models.length}`);
    return createFallbackProxy(nextModel, config, agentKey);
  }
  
  return null;
}

/**
 * Função de debug para verificar estado atual do fallback
 */
export function getFallbackState(agentType: string, executionId: string = 'default') {
  const agentKey = `${agentType}_${executionId}`;
  const state = fallbackState.get(agentKey);
  return {
    agentKey,
    currentModelIndex: state?.currentModelIndex || 0,
    attemptCount: state?.attemptCount || 0,
    hasState: !!state
  };
}

/**
 * Força avanço para próximo modelo (para testes)
 */
export function forceAdvanceModel(agentType: string, executionId: string = 'default') {
  const agentKey = `${agentType}_${executionId}`;
  const state = fallbackState.get(agentKey);
  if (state && state.currentModelIndex < defaultModelHierarchy.models.length - 1) {
    state.currentModelIndex++;
    console.log(`🔄 [FORCE ADVANCE] Forçando avanço para modelo ${state.currentModelIndex + 1}`);
    return true;
  }
  return false;
}

/**
 * Extrai o nome do modelo para logging
 */
function getModelName(model: MastraLanguageModel): string {
  // Tentar extrair o nome do modelo - isso é específico do AI SDK
  try {
    return (model as any).modelId || (model as any).model || model.toString();
  } catch {
    return 'modelo-desconhecido';
  }
}

/**
 * Configurações específicas por tipo de agente
 * Cada agente tem uma estratégia de fallback otimizada
 * Estratégia: GPT-4o-mini → GPT-4o → GPT-3.5-turbo (priorizando menor consumo)
 */

export const strategicAgentModel = createModelWithFallback({
  models: [
    openai("gpt-4o-mini"), // Modelo primário - gpt-4o-mini conforme solicitado
    openai("gpt-4o"),      // Fallback - compatível com streamVNext
    openai("gpt-3.5-turbo") // Fallback de emergência
  ],
  maxRetries: 1, // Reduzido para evitar acúmulo de contexto
  agentType: "strategic"
});

export const operationalAgentModel = createModelWithFallback({
  models: [
    openai("gpt-4o-mini"), // Modelo primário - gpt-4o-mini conforme solicitado
    openai("gpt-4o"),      // Fallback - compatível com streamVNext
    openai("gpt-3.5-turbo") // Fallback de emergência
  ],
  maxRetries: 1, // Reduzido para evitar acúmulo de contexto
  agentType: "operational"
});

export const legalAgentModel = createModelWithFallback({
  models: [
    openai("gpt-4o-mini"), // Modelo primário - gpt-4o-mini conforme solicitado
    openai("gpt-4o"),      // Fallback - compatível com streamVNext
    openai("gpt-3.5-turbo") // Fallback de emergência
  ],
  maxRetries: 1, // Reduzido para evitar acúmulo de contexto
  agentType: "legal"
});

export const financialAgentModel = createModelWithFallback({
  models: [
    openai("gpt-4o-mini"), // Modelo primário - gpt-4o-mini conforme solicitado
    openai("gpt-4o"),      // Fallback - compatível com streamVNext
    openai("gpt-3.5-turbo") // Backup de emergência
  ],
  maxRetries: 1, // Reduzido para evitar acúmulo de contexto
  agentType: "financial"
});

/**
 * Função utilitária para resetar estado de fallback
 * Útil para testes ou reset manual
 */
export function resetFallbackState(agentType?: string, executionId?: string) {
  if (agentType && executionId) {
    const agentKey = `${agentType}_${executionId}`;
    fallbackState.delete(agentKey);
    console.log(`🔄 [MODEL FALLBACK] Estado resetado para ${agentKey}`);
  } else {
    fallbackState.clear();
    console.log(`🔄 [MODEL FALLBACK] Todos os estados de fallback resetados`);
  }
}

/**
 * EXPLICAÇÃO DO FALLBACK VERDADEIRO:
 * 
 * 1. DETECÇÃO: Intercepta erros de rate limit em tempo real
 * 2. FALLBACK AUTOMÁTICO: Muda automaticamente para próximo modelo
 * 3. PROXY: Usa Proxy JavaScript para interceptar chamadas do modelo
 * 4. ESTADO: Mantém estado por agente/execução para evitar loops
 * 5. TRANSPARÊNCIA: Funciona sem mudanças no código do workflow
 * 
 * Fluxo: GPT-4o (rate limit) → GPT-4o-mini (automático) → sucesso
 */