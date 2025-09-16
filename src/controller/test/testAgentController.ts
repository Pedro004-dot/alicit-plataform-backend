import { Request, Response } from "express";
import { testAgent } from "../../mastra/agents/testAgent";
import { RuntimeContext } from "@mastra/core/di";

/**
 * Controller para testar agent simples da OpenAI
 * Usado para diagnóstico de problemas de configuração
 */
export class TestAgentController {
  
  /**
   * Executa teste do agent simples para verificar configuração OpenAI
   */
  async testSimpleAgent(req: Request, res: Response) {
    try {
      console.log("🧪 [TEST CONTROLLER] Iniciando teste do agent simples...");
      
      // Criar contexto runtime simples
      const runtimeContext = new RuntimeContext();
      runtimeContext.set('testId', `test-${Date.now()}`);
      
      // Executar o agent de teste diretamente
      const result = await testAgent.generate("Execute teste", { runtimeContext });
      
      console.log("✅ [TEST CONTROLLER] Teste concluído:", result.text);
      
      return res.status(200).json({
        status: 'success',
        message: 'Teste do agent simples executado com sucesso',
        data: {
          response: result.text,
          usage: result.usage,
          finishReason: result.finishReason,
          timestamp: new Date().toISOString()
        },
        openaiWorking: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error("❌ [TEST CONTROLLER] Erro no teste do agent:", error);
      
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao executar teste do agent simples',
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        openaiWorking: false,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Endpoint para informações sobre o teste
   */
  async getTestInfo(req: Request, res: Response) {
    try {
      const info = {
        name: "Test Agent Controller",
        description: "Controller para testar configuração básica da OpenAI",
        agent: "testAgent",
        workflow: "testWorkflow",
        purpose: "Verificar se a configuração básica da OpenAI está funcionando",
        endpoints: [
          {
            path: "/test/simple",
            method: "POST",
            description: "Executa teste do agent simples"
          },
          {
            path: "/test/info", 
            method: "GET",
            description: "Informações sobre os testes disponíveis"
          }
        ],
        timestamp: new Date().toISOString()
      };
      
      return res.status(200).json(info);
      
    } catch (error: any) {
      console.error("❌ [TEST CONTROLLER] Erro ao buscar informações:", error);
      
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao buscar informações do teste',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}