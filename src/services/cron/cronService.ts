import * as cron from 'node-cron';

export class CronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Inicia todos os cron jobs
   */
  public startAllJobs(): void {
    console.log('🕘 Iniciando cron jobs...');
    
    // Job diário às 9h da manhã
    this.scheduleDailyJob();
    
    console.log('✅ Cron jobs configurados e iniciados');
  }

  /**
   * Job que roda todo dia às 9h da manhã
   */
  private scheduleDailyJob(): void {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('🌅 Executando job diário das 9h...');
      
      try {
        await this.executeDailyTasks();
        console.log('✅ Job diário executado com sucesso');
      } catch (error) {
        console.error('❌ Erro no job diário:', error);
      }
    }, {
      timezone: "America/Sao_Paulo" // Fuso horário de São Paulo
    });

    this.jobs.set('daily-9am', job);
    job.start();
    
    console.log('📅 Job diário das 9h configurado (fuso: America/Sao_Paulo)');
  }

  /**
   * Tarefas que serão executadas diariamente
   */
  private async executeDailyTasks(): Promise<void> {
    console.log('🔄 Iniciando tarefas diárias...');

    // 1. Limpeza de dados antigos
    await this.cleanupOldData();
    
    // 2. Sincronização de licitações
    await this.syncLicitacoes();
    
    // 3. Atualização de embeddings
    await this.updateEmbeddings();
    
    // 4. Relatórios de status
    await this.generateDailyReport();
    
    console.log('✅ Todas as tarefas diárias concluídas');
  }

  /**
   * Limpeza de dados antigos
   */
  private async cleanupOldData(): Promise<void> {
    console.log('🗑️ Executando limpeza de dados antigos...');
    
    try {
      // Exemplo: limpar relatórios com mais de 30 dias
      // Implementar lógica de limpeza aqui
      
      console.log('✅ Limpeza concluída');
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
  }

  /**
   * Sincronização de licitações
   */
  private async syncLicitacoes(): Promise<void> {
    console.log('🔄 Sincronizando licitações...');
    
    try {
      // Implementar sincronização com fontes externas (PNCP, etc.)
      // Exemplo: buscar novas licitações das últimas 24h
      
      console.log('✅ Sincronização concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  }

  /**
   * Atualização de embeddings
   */
  private async updateEmbeddings(): Promise<void> {
    console.log('🧠 Atualizando embeddings...');
    
    try {
      // Implementar atualização de embeddings para novos documentos
      // Exemplo: processar documentos pendentes
      
      console.log('✅ Embeddings atualizados');
    } catch (error) {
      console.error('❌ Erro na atualização de embeddings:', error);
    }
  }

  /**
   * Gera relatório diário de status
   */
  private async generateDailyReport(): Promise<void> {
    console.log('📊 Gerando relatório diário...');
    
    try {
      const report = {
        timestamp: new Date().toISOString(),
        totalLicitacoes: 0, // Implementar contagem
        totalEmpresas: 0,   // Implementar contagem
        analises24h: 0,     // Implementar contagem
        status: 'success'
      };

      console.log('📈 Relatório diário:', report);
      console.log('✅ Relatório gerado');
    } catch (error) {
      console.error('❌ Erro na geração do relatório:', error);
    }
  }

  /**
   * Para todos os jobs
   */
  public stopAllJobs(): void {
    console.log('⏹️ Parando todos os cron jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Job ${name} parado`);
    });
    
    this.jobs.clear();
    console.log('✅ Todos os jobs foram parados');
  }

  /**
   * Lista jobs ativos
   */
  public listActiveJobs(): string[] {
    const activeJobs = Array.from(this.jobs.keys());
    console.log('📋 Jobs ativos:', activeJobs);
    return activeJobs;
  }

  /**
   * Executa job específico manualmente (para testes)
   */
  public async runJobManually(jobName: string): Promise<void> {
    console.log(`🔧 Executando job ${jobName} manualmente...`);
    
    switch (jobName) {
      case 'daily-9am':
        await this.executeDailyTasks();
        break;
      default:
        throw new Error(`Job ${jobName} não encontrado`);
    }
    
    console.log(`✅ Job ${jobName} executado manualmente`);
  }
}

// Singleton instance
export const cronService = new CronService();