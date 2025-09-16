import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Repository para Working Memory usando Supabase como storage
 * Substitui LibSQL por infraestrutura Supabase existente
 */
export class SupabaseMemoryRepository {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Testa a conexão com o Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('working_memory_threads')
        .select('count')
        .limit(1);
        
      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Erro de conexão Supabase:', error);
        return false;
      }
      
      console.log('✅ Conexão Supabase funcionando!');
      return true;
    } catch (error) {
      console.warn('⚠️ Falha na conexão Supabase:', error);
      return false;
    }
  }

  /**
   * Inicializa as tabelas necessárias para Working Memory
   */
  async initializeTables(): Promise<void> {
    try {
      // Testar conexão primeiro
      const connected = await this.testConnection();
      if (!connected) {
        console.warn('⚠️ Supabase não disponível, pulando inicialização de tabelas');
        return;
      }
      
      // Tabela para Working Memory threads
      await this.supabase.rpc('create_working_memory_tables');
      console.log('✅ Tabelas de Working Memory inicializadas no Supabase');
    } catch (error) {
      console.log('📋 Criando tabelas de Working Memory...');
      
      // Criar tabela de threads se não existir
      const { error: threadError } = await this.supabase.rpc('create_table_if_not_exists', {
        table_name: 'working_memory_threads',
        sql: `
          CREATE TABLE IF NOT EXISTS working_memory_threads (
            id TEXT PRIMARY KEY,
            resource_id TEXT NOT NULL,
            thread_data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_working_memory_resource ON working_memory_threads(resource_id);
          CREATE INDEX IF NOT EXISTS idx_working_memory_updated ON working_memory_threads(updated_at);
        `
      });

      if (threadError) {
        console.warn('Aviso ao criar tabelas:', threadError);
      }
    }
  }

  /**
   * Salva contexto de Working Memory para um resource específico
   */
  async saveWorkingMemory(
    resourceId: string, 
    threadId: string, 
    context: Record<string, any>
  ): Promise<void> {
    try {
      // Testar conexão primeiro
      const connected = await this.testConnection();
      if (!connected) {
        console.warn('⚠️ Supabase indisponível, pulando save de Working Memory');
        return;
      }
      
      const { error } = await this.supabase
        .from('working_memory_threads')
        .upsert({
          id: threadId,
          resource_id: resourceId,
          thread_data: context,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      console.log(`💾 Working Memory salva para ${resourceId} (thread: ${threadId})`);
    } catch (error) {
      console.warn('⚠️ Erro ao salvar Working Memory (não crítico):', error instanceof Error ? error.message : error);
      // Não propagar erro para não quebrar workflow
    }
  }

  /**
   * Recupera contexto de Working Memory para um resource
   */
  async getWorkingMemory(resourceId: string): Promise<Record<string, any> | null> {
    try {
      const { data, error } = await this.supabase
        .from('working_memory_threads')
        .select('thread_data')
        .eq('resource_id', resourceId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      if (data) {
        console.log(`🧠 Working Memory recuperada para ${resourceId}`);
        return data.thread_data;
      }

      console.log(`🆕 Nenhuma Working Memory encontrada para ${resourceId}`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao recuperar Working Memory:', error);
      return null;
    }
  }

  /**
   * Lista todas as Working Memories ativas
   */
  async listWorkingMemories(): Promise<Array<{
    resourceId: string;
    threadId: string;
    context: Record<string, any>;
    updatedAt: string;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('working_memory_threads')
        .select('id, resource_id, thread_data, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        resourceId: row.resource_id,
        threadId: row.id,
        context: row.thread_data,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('❌ Erro ao listar Working Memories:', error);
      return [];
    }
  }

  /**
   * Remove Working Memory antiga (cleanup)
   */
  async cleanupOldMemories(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { count, error } = await this.supabase
        .from('working_memory_threads')
        .delete()
        .lt('updated_at', cutoffDate.toISOString());

      if (error) throw error;

      console.log(`🧹 Limpeza: ${count || 0} Working Memories antigas removidas`);
      return count || 0;
    } catch (error) {
      console.error('❌ Erro na limpeza de Working Memory:', error);
      return 0;
    }
  }

  /**
   * Salva log de análise de licitação
   */
  async saveAnalysisLog(
    empresaId: string,
    licitacaoId: string, 
    step: string,
    result: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Testar conexão primeiro
      const connected = await this.testConnection();
      if (!connected) {
        console.warn(`⚠️ Supabase indisponível, pulando log do step: ${step}`);
        return;
      }
      
      // Criar tabela de logs se não existir (fail-safe)
      try {
        await this.supabase.rpc('create_analysis_log_table');
      } catch {
        // Ignore errors
      }

      const { error } = await this.supabase
        .from('analysis_logs')
        .insert({
          empresa_id: empresaId,
          licitacao_id: licitacaoId,
          step,
          result,
          metadata,
          created_at: new Date().toISOString()
        });

      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }

      console.log(`📊 Log de análise salvo: ${step} para ${empresaId}/${licitacaoId}`);
    } catch (error) {
      console.warn(`⚠️ Erro ao salvar log de análise (${step}):`, error instanceof Error ? error.message : error);
      // Não propagar erro para não quebrar workflow
    }
  }

  /**
   * Recupera histórico de análises
   */
  async getAnalysisHistory(empresaId: string, licitacaoId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('analysis_logs')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('licitacao_id', licitacaoId)
        .order('created_at', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.warn('⚠️ Erro ao recuperar histórico:', error);
      return [];
    }
  }

  /**
   * Estatísticas de uso da Working Memory
   */
  async getMemoryStats(): Promise<{
    totalThreads: number;
    activeToday: number;
    topResources: Array<{ resourceId: string; count: number }>;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [totalResult, todayResult, topResult] = await Promise.all([
        this.supabase
          .from('working_memory_threads')
          .select('id', { count: 'exact' }),
        
        this.supabase
          .from('working_memory_threads') 
          .select('id', { count: 'exact' })
          .gte('updated_at', today),
          
        this.supabase
          .from('working_memory_threads')
          .select('resource_id')
          .order('updated_at', { ascending: false })
          .limit(10)
      ]);

      const topResources = (topResult.data || [])
        .reduce((acc: Record<string, number>, row) => {
          acc[row.resource_id] = (acc[row.resource_id] || 0) + 1;
          return acc;
        }, {});

      return {
        totalThreads: totalResult.count || 0,
        activeToday: todayResult.count || 0,
        topResources: Object.entries(topResources)
          .map(([resourceId, count]) => ({ resourceId, count }))
          .sort((a, b) => b.count - a.count)
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { totalThreads: 0, activeToday: 0, topResources: [] };
    }
  }
}

// Singleton instance
export const supabaseMemoryRepository = new SupabaseMemoryRepository();