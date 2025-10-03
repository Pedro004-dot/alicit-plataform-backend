import { Request, Response } from 'express';
import syncDiagnosticService from '../../services/licitacao/syncDiagnosticService';

/**
 * Controller para diagnóstico de sincronização entre Supabase e Pinecone
 */
class SyncDiagnosticController {
  
  /**
   * Executa diagnóstico completo de sincronização
   */
  async diagnosticarSincronizacao(req: Request, res: Response) {
    try {
      console.log('🔍 Requisição de diagnóstico de sincronização recebida');
      
      const diagnostico = await syncDiagnosticService.diagnosticarSincronizacao();
      
      console.log('✅ Diagnóstico concluído com sucesso');
      
      return res.status(200).json({
        success: true,
        message: 'Diagnóstico de sincronização concluído',
        data: diagnostico,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erro no diagnóstico:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Erro interno no diagnóstico de sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new SyncDiagnosticController();