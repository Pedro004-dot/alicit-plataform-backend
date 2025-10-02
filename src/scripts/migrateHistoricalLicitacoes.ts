import 'dotenv/config';
import PNCPLicitacaoAdapter from '../adapters/PNCPLicitacaoAdapter';
import licitacaoStorageService from '../services/licitacao/licitacaoStorageService';
import supabaseLicitacaoRepository from '../repositories/supabaseLicitacaoRepository';

export interface HistoricalMigrationParams {
  dataInicio: string; // 'YYYYMMDD'
  dataFim: string;    // 'YYYYMMDD'
  modalidades: number[];
  batchSizePaginas: number;
  delayBetweenBatches: number;
  // REMOVIDO: skipDuplicateCheck - não é mais necessário com fluxo simplificado
}

export class HistoricalLicitacaoMigrator {
  private adapter = new PNCPLicitacaoAdapter();
  private processedCount = 0;
  private savedCount = 0;
  private skippedCount = 0;
  private supabaseSavedCount = 0;
  private pineconeSavedCount = 0;

  async executeMigration(params: HistoricalMigrationParams) {
    console.log(`🚀 INICIANDO MIGRAÇÃO HISTÓRICA`);
    console.log(`📅 Período: ${params.dataInicio} → ${params.dataFim}`);
    console.log(`📋 Modalidades: [${params.modalidades.join(', ')}]`);
    
    // 🔧 TESTE DE CONECTIVIDADE
    console.log(`🔍 Testando conectividade dos bancos de dados...`);
    const supabaseOK = await supabaseLicitacaoRepository.testConnection();
    
    if (!supabaseOK) {
      console.error(`❌ Falha na conexão com Supabase. Abortando migração.`);
      return;
    }
    
    console.log(`✅ Todos os bancos estão conectados. Iniciando migração...`);
    
    for (const modalidade of params.modalidades) {
      await this.processModalidade(modalidade, params);
      
      // Pausa entre modalidades
      console.log(`⏸️ Pausa de ${params.delayBetweenBatches}ms entre modalidades...`);
      await this.sleep(params.delayBetweenBatches);
    }
    
    console.log(`✅ MIGRAÇÃO CONCLUÍDA`);
    console.log(`📊 Processadas: ${this.processedCount}`);
    console.log(`💾 Salvas no Supabase: ${this.supabaseSavedCount}`);
    console.log(`🎯 Salvas no Pinecone: ${this.pineconeSavedCount}`);
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
    console.log(`📦 Processando batch modalidade ${modalidade}: páginas ${startPage}-${endPage}`);
    
    const licitacoesBatch: any[] = [];
    
    // Timeout de 5 minutos para o batch completo
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout de 5 minutos no batch páginas ${startPage}-${endPage}`));
      }, 5 * 60 * 1000);
    });
    
    try {
      await Promise.race([
        this.processBatchInternal(modalidade, params, startPage, endPage, licitacoesBatch),
        timeoutPromise
      ]);
    } catch (error) {
      console.error(`❌ ERRO no batch páginas ${startPage}-${endPage}:`, error);
    }
  }
  
  private async processBatchInternal(modalidade: number, params: HistoricalMigrationParams, startPage: number, endPage: number, licitacoesBatch: any[]) {
    try {
      // Buscar páginas do batch em paralelo (controlado)
      const promises = [];
      let pagesProcessed = 0;
      
      for (let page = startPage; page <= endPage; page++) {
        promises.push(this.fetchPage(modalidade, params, page));
        
        // Requests sequenciais (conforme boas práticas PNCP)
        if (promises.length >= 1 || page === endPage) {
          const currentPages: number[] = [];
          for (let i = 0; i < promises.length; i++) {
            currentPages.push(startPage + pagesProcessed + i);
          }
          
          // Timeout para o grupo de requests
          const groupTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout de 2 minutos no grupo de páginas [${currentPages.join(', ')}]`)), 2 * 60 * 1000);
          });
          
          try {
            const results = await Promise.race([
              Promise.allSettled(promises),
              groupTimeoutPromise
            ]);
            
            let successCount = 0;
            results.forEach((result, index) => {
              const pageNum = startPage + pagesProcessed + index;
              if (result.status === 'fulfilled' && result.value?.data) {
                licitacoesBatch.push(...result.value.data);
                successCount++;
              } else {
                console.warn(`⚠️ Página ${pageNum} falhou`);
              }
            });
            
            pagesProcessed += promises.length;
            console.log(`📊 Páginas ${currentPages[0]}-${currentPages[currentPages.length-1]}: ${successCount}/${promises.length} sucesso, ${licitacoesBatch.length} total`);
            
          } catch (error) {
            console.error(`❌ TIMEOUT no grupo de páginas [${currentPages.join(', ')}]`);
            pagesProcessed += promises.length; // Continuar mesmo com erro
          }
          
          promises.length = 0; // Clear array
          
          if (page < endPage) {
            await this.sleep(2000); // Pausa respeitosa entre requests (PNCP é API pública)
          }
        }
      }
      
      // Processar licitações do batch
      await this.processLicitacoesBatch(licitacoesBatch);
      
    } catch (error) {
      console.error(`❌ ERRO CRÍTICO no batch interno:`, error);
    }
  }

  private async processLicitacoesBatch(licitacoes: any[]) {
    if (licitacoes.length === 0) {
      console.log(`⚠️ Batch vazio, pulando...`);
      return;
    }
    
    try {
      // 1. Filtrar licitações ativas
      const licitacoesAbertas = this.filterByDataEncerramento(licitacoes);
      console.log(`📅 Filtradas: ${licitacoes.length} → ${licitacoesAbertas.length} ativas`);
      
      if (licitacoesAbertas.length === 0) {
        this.processedCount += licitacoes.length;
        return;
      }
      
      // 2. Adicionar itens às licitações
      const licitacoesComItens = await this.addItemsToLicitacoes(licitacoesAbertas);
      
      if (licitacoesComItens.length === 0) {
        this.processedCount += licitacoes.length;
        return;
      }
      
      // 3. Salvar no Supabase + Pinecone
      console.log(`💾 Salvando ${licitacoesComItens.length} licitações...`);
      const storageResult = await licitacaoStorageService.saveLicitacoes(licitacoesComItens);
      
      // Atualizar contadores
      this.supabaseSavedCount += storageResult.supabase;
      this.pineconeSavedCount += storageResult.pinecone;
      this.savedCount += storageResult.total;
      
      if (storageResult.success) {
        console.log(`✅ Salvas: ${storageResult.total} (Supabase: ${storageResult.supabase}, Pinecone: ${storageResult.pinecone})`);
      } else {
        console.error(`❌ Erro no salvamento:`, storageResult.errors);
      }
      
      this.processedCount += licitacoes.length;
      
    } catch (error) {
      console.error(`❌ ERRO no processamento do batch:`, error);
      this.processedCount += licitacoes.length;
    }
  }

  private filterByDataEncerramento(licitacoes: any[]): any[] {
    // 🎯 FILTRO SIMPLIFICADO: APENAS DATA DE ENCERRAMENTO
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Reset horas para comparação correta
    
    const licitacoesAtivas = licitacoes.filter(licitacao => {
      // VERIFICAR APENAS DATA DE ENCERRAMENTO
      const dataEncerramento = licitacao.dataEncerramentoProposta;
      
      // Se não tem data, considera ativa
      if (!dataEncerramento) return true;
      
      // Converter para Date object para comparação correta
      let dataEncerramentoObj: Date;
      
      if (dataEncerramento.length === 8) {
        // YYYYMMDD
        const ano = parseInt(dataEncerramento.slice(0, 4));
        const mes = parseInt(dataEncerramento.slice(4, 6)) - 1; // Month 0-indexed
        const dia = parseInt(dataEncerramento.slice(6, 8));
        dataEncerramentoObj = new Date(ano, mes, dia);
      } else if (dataEncerramento.includes('T')) {
        // ISO format with time (YYYY-MM-DDTHH:mm:ss)
        dataEncerramentoObj = new Date(dataEncerramento);
      } else {
        // YYYY-MM-DD
        dataEncerramentoObj = new Date(dataEncerramento);
      }
      
      return dataEncerramentoObj > hoje;
    });
    
    // Log simplificado
    
    return licitacoesAtivas;
  }

  // REMOVIDO: filterExistingInPinecone() - agora usa licitacaoStorageService.filterExistingLicitacoes()

  private async addItemsToLicitacoes(licitacoes: any[]): Promise<any[]> {
    try {
      // Reusar lógica do adapter existente
      const resultado = await (this.adapter as any).adicionarItens(licitacoes);
      return resultado || [];
      
    } catch (error) {
      console.error(`❌ ERRO ao adicionar itens:`, error);
      // Retornar licitações sem itens para não travar o processo
      return licitacoes;
    }
  }

  private async fetchPage(modalidade: number, params: HistoricalMigrationParams, pagina: number) {
    const url = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
    
    const queryParams = new URLSearchParams({
      dataInicial: params.dataInicio,
      dataFinal: params.dataFim,
      codigoModalidadeContratacao: modalidade.toString(),
      pagina: pagina.toString()
    });
    
    const fullUrl = `${url}?${queryParams}`;
    
    // Delay conforme boas práticas PNCP (ser respeitoso com a API pública)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Timeout de 60 segundos por request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de 60s na página ${pagina}`)), 60000);
      });
      
      const fetchPromise = fetch(fullUrl, {
        headers: {
          'User-Agent': 'Alicit-Integration/2.0 (Sistema de Análise de Licitações)',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        console.warn(`⚠️ HTTP ${response.status} - página ${pagina}`);
        return null;
      }

      const text = await response.text();
      
      if (!text.trim()) {
        console.warn(`⚠️ Resposta vazia - página ${pagina}`);
        return null;
      }

      const parsed = JSON.parse(text);
      return parsed;
    } catch (error) {
      console.error(`❌ ERRO página ${pagina}:`, error);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

