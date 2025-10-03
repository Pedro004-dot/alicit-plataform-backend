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
            await this.sleep(2500); // Pausa padronizada com adapter (2.5s)
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
    // 🎯 FILTRO DE DATA DE ENCERRAMENTO COM DEBUGGING DETALHADO
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Reset horas para comparação correta
    
    console.log(`📅 [FILTRO DEBUG] Data de hoje para comparação: ${hoje.toISOString().split('T')[0]}`);
    console.log(`📊 [FILTRO DEBUG] Analisando ${licitacoes.length} licitações...`);
    
    let semData = 0;
    let ativas = 0;
    let expiradas = 0;
    let errosProcessamento = 0;
    
    const amostrasLog: any[] = [];
    
    const licitacoesAtivas = licitacoes.filter((licitacao, index) => {
      // VERIFICAR APENAS DATA DE ENCERRAMENTO
      const dataEncerramento = licitacao.dataEncerramentoProposta;
      
      // Se não tem data, considera ativa
      if (!dataEncerramento || dataEncerramento === '' || dataEncerramento === null) {
        semData++;
        if (amostrasLog.length < 3) {
          amostrasLog.push({
            id: licitacao.numeroControlePNCP || `licitacao-${index}`,
            dataEncerramento: 'SEM_DATA',
            status: 'ATIVA_SEM_DATA'
          });
        }
        return true;
      }
      
      try {
        // Converter para Date object para comparação correta
        let dataEncerramentoObj: Date;
        let formatoDetectado = '';
        
        if (typeof dataEncerramento === 'string' && dataEncerramento.length === 8 && /^\d{8}$/.test(dataEncerramento)) {
          // YYYYMMDD
          const ano = parseInt(dataEncerramento.slice(0, 4));
          const mes = parseInt(dataEncerramento.slice(4, 6)) - 1; // Month 0-indexed
          const dia = parseInt(dataEncerramento.slice(6, 8));
          dataEncerramentoObj = new Date(ano, mes, dia);
          formatoDetectado = 'YYYYMMDD';
        } else if (typeof dataEncerramento === 'string' && dataEncerramento.includes('T')) {
          // ISO format with time (YYYY-MM-DDTHH:mm:ss)
          dataEncerramentoObj = new Date(dataEncerramento);
          formatoDetectado = 'ISO_WITH_TIME';
        } else if (typeof dataEncerramento === 'string' && dataEncerramento.includes('-')) {
          // YYYY-MM-DD
          dataEncerramentoObj = new Date(dataEncerramento);
          formatoDetectado = 'YYYY-MM-DD';
        } else {
          // Tentar conversão direta
          dataEncerramentoObj = new Date(dataEncerramento);
          formatoDetectado = 'CONVERSAO_DIRETA';
        }
        
        // Validar se a data foi convertida corretamente
        if (isNaN(dataEncerramentoObj.getTime())) {
          console.warn(`⚠️ [FILTRO] Data inválida detectada: "${dataEncerramento}" (formato: ${formatoDetectado})`);
          errosProcessamento++;
          return true; // Considera ativa em caso de erro
        }
        
        const dataEncerramentoFormatada = dataEncerramentoObj.toISOString().split('T')[0];
        const isAtiva = dataEncerramentoObj > hoje;
        
        if (isAtiva) {
          ativas++;
        } else {
          expiradas++;
        }
        
        // Coletar amostras para log (primeiras 5)
        if (amostrasLog.length < 5) {
          amostrasLog.push({
            id: licitacao.numeroControlePNCP || `licitacao-${index}`,
            dataOriginal: dataEncerramento,
            formato: formatoDetectado,
            dataProcessada: dataEncerramentoFormatada,
            status: isAtiva ? 'ATIVA' : 'EXPIRADA',
            diasRestantes: Math.ceil((dataEncerramentoObj.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
        
        return isAtiva;
        
      } catch (error) {
        console.error(`❌ [FILTRO] Erro ao processar data "${dataEncerramento}":`, error);
        errosProcessamento++;
        return true; // Considera ativa em caso de erro
      }
    });
    
    // 📊 LOG DETALHADO DOS RESULTADOS
    console.log(`📊 [FILTRO RESULTADO]:`);
    console.log(`  ✅ Ativas: ${ativas}`);
    console.log(`  ❌ Expiradas: ${expiradas}`);
    console.log(`  ⚪ Sem data: ${semData}`);
    console.log(`  🚫 Erros: ${errosProcessamento}`);
    console.log(`  📈 Total aceitas: ${licitacoesAtivas.length}/${licitacoes.length}`);
    
    // 🔍 AMOSTRAS PARA DEBUGGING
    if (amostrasLog.length > 0) {
      console.log(`🔍 [FILTRO AMOSTRAS]:`);
      amostrasLog.forEach((amostra, i) => {
        console.log(`  ${i + 1}. ${amostra.id}:`);
        console.log(`     Original: "${amostra.dataOriginal}" (${amostra.formato})`);
        console.log(`     Processada: ${amostra.dataProcessada}`);
        console.log(`     Status: ${amostra.status} (${amostra.diasRestantes} dias)`);
      });
    }
    
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
    const maxRetries = 3;
    const REQUEST_DELAY = 2500; // 2.5s (padronizado com adapter)
    
    for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
      const url = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';
      
      const queryParams = new URLSearchParams({
        dataInicial: params.dataInicio,
        dataFinal: params.dataFim,
        codigoModalidadeContratacao: modalidade.toString(),
        pagina: pagina.toString()
      });
      
      const fullUrl = `${url}?${queryParams}`;
      
      // 🕰️ DELAY PADRONIZADO (mais conservador)
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      
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
        
        // 📊 TRATAMENTO ESPECÍFICO DE CÓDIGOS HTTP (alinhado com adapter)
        if (response.status === 204) {
          console.log(`📄 PNCP: Sem conteúdo (204) - página ${pagina}`);
          return null;
        }
        
        if (response.status === 400) {
          console.warn(`⚠️ PNCP: Bad Request (400) - página ${pagina}`);
          return null;
        }
        
        if (response.status === 422) {
          console.warn(`⚠️ PNCP: Unprocessable Entity (422) - página ${pagina}`);
          return null;
        }
        
        // 🔄 RETRY PARA HTTP 500 (implementação robusta)
        if (response.status === 500) {
          if (tentativa < maxRetries) {
            const retryDelay = 3000 + (tentativa * 1000); // 3s, 4s, 5s
            console.warn(`⚠️ PNCP: HTTP 500 - página ${pagina}, tentativa ${tentativa}/${maxRetries}. Retry em ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue; // Tenta novamente
          } else {
            console.error(`❌ PNCP: HTTP 500 persistente após ${maxRetries} tentativas - página ${pagina}`);
            return null;
          }
        }
        
        if (!response.ok) {
          console.warn(`⚠️ PNCP: HTTP ${response.status} - página ${pagina}`);
          return null;
        }

        const text = await response.text();
        
        if (!text.trim()) {
          console.warn(`⚠️ PNCP: Resposta vazia - página ${pagina}`);
          return null;
        }

        const parsed = JSON.parse(text);
        
        // 📊 VALIDAR ESTRUTURA CONFORME DOCUMENTAÇÃO
        if (!parsed.data && parsed.totalRegistros === undefined) {
          console.warn(`⚠️ PNCP: Estrutura inválida - página ${pagina}`);
          return null;
        }
        
        // ✅ SUCESSO - retorna resultado
        console.log(`✅ PNCP: Página ${pagina} processada com sucesso (tentativa ${tentativa})`);
        return parsed;
        
      } catch (error: any) {
        if (error.message?.includes('Timeout')) {
          console.warn(`⏱️ PNCP: Timeout página ${pagina}, tentativa ${tentativa}/${maxRetries}`);
        } else {
          console.error(`❌ PNCP: Erro página ${pagina}, tentativa ${tentativa}:`, error.message);
        }
        
        if (tentativa < maxRetries) {
          const retryDelay = Math.pow(2, tentativa) * 1000; // Backoff exponencial
          console.log(`🔄 PNCP: Reagendando página ${pagina} para ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    console.error(`💥 PNCP: Falha definitiva após ${maxRetries} tentativas - página ${pagina}`);
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

