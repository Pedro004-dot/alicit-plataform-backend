import { Request, Response } from 'express';
import cleanupOrfasService from '../../services/licitacao/cleanupOrfasService';

/**
 * Controller para limpeza de licitações órfãs
 */
class CleanupOrfasController {
  
  /**
   * Apaga todas as licitações órfãs identificadas (28 licitações)
   */
  async apagarLicitacoesOrfas(req: Request, res: Response) {
    try {
      console.log('🗑️ Requisição de limpeza de licitações órfãs recebida');
      
      const resultado = await cleanupOrfasService.apagarLicitacoesOrfas();
      
      const sucesso = resultado.erros.length === 0;
      const statusCode = sucesso ? 200 : 207; // 207 = Multi-Status (sucesso parcial)
      
      console.log(`${sucesso ? '✅' : '⚠️'} Limpeza concluída com ${resultado.erros.length} erros`);
      
      return res.status(statusCode).json({
        success: sucesso,
        message: sucesso 
          ? 'Licitações órfãs apagadas com sucesso'
          : 'Limpeza concluída com alguns erros',
        data: {
          licitacoesApagadas: resultado.licitacoesApagadas,
          itensApagados: resultado.itensApagados,
          totalEsperado: 28,
          idsApagados: resultado.idsApagados,
          erros: resultado.erros
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erro crítico na limpeza:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Erro interno na limpeza de licitações órfãs',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new CleanupOrfasController();