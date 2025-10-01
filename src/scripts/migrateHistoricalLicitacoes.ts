import 'dotenv/config';
import PNCPLicitacaoAdapter from '../adapters/PNCPLicitacaoAdapter';
import pineconeLicitacaoRepository from '../repositories/pineconeLicitacaoRepository';

export interface HistoricalMigrationParams {
  dataInicio: string; // 'YYYYMMDD'
  dataFim: string;    // 'YYYYMMDD'
  modalidades: number[];
  batchSizePaginas: number;
  delayBetweenBatches: number;
}

export class HistoricalLicitacaoMigrator {
  private adapter = new PNCPLicitacaoAdapter();
  private processedCount = 0;
  private savedCount = 0;
  private skippedCount = 0;

  async executeMigration(params: HistoricalMigrationParams) {
    console.log(`🚀 INICIANDO MIGRAÇÃO HISTÓRICA`);
    console.log(`📅 Período: ${params.dataInicio} → ${params.dataFim}`);
    console.log(`📋 Modalidades: [${params.modalidades.join(', ')}]`);
    
    for (const modalidade of params.modalidades) {
      await this.processModalidade(modalidade, params);
      
      // Pausa entre modalidades
      console.log(`⏸️ Pausa de ${params.delayBetweenBatches}ms entre modalidades...`);
      await this.sleep(params.delayBetweenBatches);
    }
    
    console.log(`✅ MIGRAÇÃO CONCLUÍDA`);
    console.log(`📊 Processadas: ${this.processedCount}`);
    console.log(`💾 Salvas: ${this.savedCount}`);
    console.log(`⏭️ Ignoradas: ${this.skippedCount}`);
  }

  private async processModalidade(modalidade: number, params: HistoricalMigrationParams) {
    console.log(`\n🔄 PROCESSANDO MODALIDADE ${modalidade}`);
    
    // 1. Descobrir total de páginas
    const firstPage = await this.fetchPage(modalidade, params, 1);
    if (!firstPage) return;
    
    const totalPaginas = firstPage.totalPaginas;
    console.log(`📄 Modalidade ${modalidade}: ${firstPage.totalRegistros} registros em ${totalPaginas} páginas`);
    
    // 2. Processar em batches
    for (let startPage = 1; startPage <= totalPaginas; startPage += params.batchSizePaginas) {
      const endPage = Math.min(startPage + params.batchSizePaginas - 1, totalPaginas);
      
      await this.processBatch(modalidade, params, startPage, endPage);
      
      // Pausa entre batches
      if (endPage < totalPaginas) {
        await this.sleep(params.delayBetweenBatches);
      }
    }
  }

  private async processBatch(modalidade: number, params: HistoricalMigrationParams, startPage: number, endPage: number) {
    console.log(`📦 Batch modalidade ${modalidade}: páginas ${startPage}-${endPage}`);
    
    const licitacoesBatch: any[] = [];
    
    // Buscar páginas do batch em paralelo (controlado)
    const promises = [];
    for (let page = startPage; page <= endPage; page++) {
      promises.push(this.fetchPage(modalidade, params, page));
      
      // Máximo 5 requests paralelas por vez
      if (promises.length >= 5 || page === endPage) {
        const results = await Promise.allSettled(promises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value?.data) {
            licitacoesBatch.push(...result.value.data);
          }
        });
        
        promises.length = 0; // Clear array
        await this.sleep(200); // Mini pausa entre grupos
      }
    }
    
    // Processar licitações do batch
    await this.processLicitacoesBatch(licitacoesBatch);
  }

  private async processLicitacoesBatch(licitacoes: any[]) {
    console.log(`🔍 Processando ${licitacoes.length} licitações do batch...`);
    
    // 1. Filtrar por data de encerramento
    const licitacoesAbertas = this.filterByDataEncerramento(licitacoes);
    console.log(`📅 Filtradas: ${licitacoes.length} → ${licitacoesAbertas.length} abertas`);
    
    // 2. Verificar duplicatas no Pinecone
    const licitacoesNovas = await this.filterExistingInPinecone(licitacoesAbertas);
    console.log(`🔍 Verificação duplicatas: ${licitacoesAbertas.length} → ${licitacoesNovas.length} novas`);
    
    // 3. Adicionar itens às licitações
    const licitacoesComItens = await this.addItemsToLicitacoes(licitacoesNovas);
    
    // 4. Salvar no Pinecone com embeddings
    if (licitacoesComItens.length > 0) {
      const saved = await pineconeLicitacaoRepository.saveLicitacoes(licitacoesComItens);
      this.savedCount += saved;
      console.log(`💾 Salvas: ${saved}/${licitacoesComItens.length}`);
    }
    
    this.processedCount += licitacoes.length;
    this.skippedCount += (licitacoes.length - licitacoesComItens.length);
  }

  private filterByDataEncerramento(licitacoes: any[]): any[] {
    const hoje = new Date().toISOString().split('T')[0];
    
    return licitacoes.filter(licitacao => {
      const dataEncerramento = licitacao.dataEncerramentoProposta;
      if (!dataEncerramento) return true;
      
      // Normalizar formato
      let dataFormatada = dataEncerramento;
      if (dataEncerramento.length === 8) {
        dataFormatada = `${dataEncerramento.slice(0,4)}-${dataEncerramento.slice(4,6)}-${dataEncerramento.slice(6,8)}`;
      }
      
      return dataFormatada > hoje;
    });
  }

  private async filterExistingInPinecone(licitacoes: any[]): Promise<any[]> {
    const novas = [];
    
    // Verificar em batches de 50
    for (let i = 0; i < licitacoes.length; i += 50) {
      const batch = licitacoes.slice(i, i + 50);
      
      for (const licitacao of batch) {
        const exists = await pineconeLicitacaoRepository.getLicitacao(licitacao.numeroControlePNCP);
        if (!exists) {
          novas.push(licitacao);
        }
      }
      
      await this.sleep(100); // Pausa entre verificações
    }
    
    return novas;
  }

  private async addItemsToLicitacoes(licitacoes: any[]): Promise<any[]> {
    // Reusar lógica do adapter existente
    return (this.adapter as any).adicionarItens(licitacoes);
  }

  private async fetchPage(modalidade: number, params: HistoricalMigrationParams, pagina: number) {
    const url = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
    
    const queryParams = new URLSearchParams({
      dataInicial: params.dataInicio,
      dataFinal: params.dataFim,
      codigoModalidadeContratacao: modalidade.toString(),
      pagina: pagina.toString()
    });
    
    try {
      const response = await fetch(`${url}?${queryParams}`, {
        headers: {
          'User-Agent': 'Alicit-Bot/1.0',
          'Accept': 'application/json'
        }
      });
      
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.warn(`⚠️ Erro página ${pagina} modalidade ${modalidade}:`, error);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Script executável
async function runHistoricalMigration() {
  const migrator = new HistoricalLicitacaoMigrator();
  
  const params: HistoricalMigrationParams = {
    dataInicio: '20250930', // Início do ano
    dataFim: new Date().toISOString().slice(0, 10).replace(/-/g, ''), // Hoje
    modalidades: [1, 2, 3, 4, 5,6,7,8], // Todas as modalidades
    batchSizePaginas: 10, // 10 páginas por batch
    delayBetweenBatches: 1000 // 1 segundo entre batches
  };
  
  await migrator.executeMigration(params);
}

export { runHistoricalMigration };