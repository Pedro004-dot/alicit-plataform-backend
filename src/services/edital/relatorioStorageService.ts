import relatoriosTecnicosRepository, { 
    RelatorioTecnico, 
    CreateRelatorioInput 
} from '../../repositories/relatoriosTecnicosRepository';
import licitacaoEmpresaRepository from '../../repositories/licitacaoEmpresaRepository';
import { RelatorioProcessorService } from './relatorioProcessorService';
import * as fs from 'fs';

export enum TipoRelatorio {
  ANALISE_COMPLETA = 'analise-completa',
  IMPUGNACAO = 'impugnacao',
  ESCLARECIMENTO = 'esclarecimento',
  ACOMPANHAMENTO = 'acompanhamento'
}

export interface RelatorioMetadados {
  qualityScore?: number;
  processedAt: string;
  documentsAnalyzed: number;
  totalCharacters: number;
  tipoRelatorio?: TipoRelatorio;
}

export interface RelatorioArmazenado {
  id: string;
  empresaCNPJ: string;
  numeroControlePNCP: string;
  tipoRelatorio: TipoRelatorio;
  nomeArquivo: string;
  pathStorage: string;
  urlStorage: string;
  statusProcessamento: string;
  createdAt: string;
}

export class RelatorioStorageService {
  private relatorioProcessor: RelatorioProcessorService;

  constructor() {
    this.relatorioProcessor = new RelatorioProcessorService();
  }

  async salvarRelatorio(
    empresaCNPJ: string,
    numeroControlePNCP: string,
    pdfPath: string,
    tipo: TipoRelatorio = TipoRelatorio.ANALISE_COMPLETA,
    metadados: RelatorioMetadados,
    dadosPdf?: any,
    markdownContent?: string
  ): Promise<RelatorioTecnico> {
    console.log(`💾 Salvando relatório ${tipo} para empresa ${empresaCNPJ} - licitação ${numeroControlePNCP}`);
    
    // 🚀 NOVO: Processar dados estruturados se markdownContent for fornecido
    if (markdownContent) {
      try {
        console.log(`📊 Processando dados estruturados para ${numeroControlePNCP}`);
        await this.relatorioProcessor.processarRelatorio(markdownContent, numeroControlePNCP, empresaCNPJ);
        console.log(`✅ Dados estruturados salvos com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao processar dados estruturados:`, error);
        // Não bloqueia o salvamento do PDF se processar estruturado falhar
      }
    }
    
    const licitacaoEmpresa = await this.buscarLicitacaoEmpresa(empresaCNPJ, numeroControlePNCP);
    
    if (!licitacaoEmpresa) {
      throw new Error(`Relação licitação-empresa não encontrada para ${empresaCNPJ} - ${numeroControlePNCP}`);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${tipo}-${timestamp}-${Date.now()}.pdf`;
    const storagePath = `${empresaCNPJ}/${numeroControlePNCP}/${filename}`;
    
    const urlStorage = await this.uploadRelatorioToStorage(
      storagePath,
      pdfBuffer
    );
    
    const relatorioData: CreateRelatorioInput = {
      licitacao_empresa_id: licitacaoEmpresa.id,
      empresa_cnpj: empresaCNPJ,
      numero_controle_pncp: numeroControlePNCP,
      tipo_relatorio: tipo,
      url_storage: urlStorage,
      nome_arquivo: filename,
      path_storage: storagePath,
      status_relatorio: 'gerado',
      metadados: {
        ...metadados,
        tamanho_arquivo: pdfBuffer.length,
        gerado_em: new Date().toISOString()
      },
      dados_pdf: dadosPdf || {}
    };
    
    const relatorioSalvo = await relatoriosTecnicosRepository.createRelatorio(relatorioData);
    
    console.log(`✅ Relatório ${tipo} salvo: ${filename}`);
    return relatorioSalvo;
  }

  async buscarRelatorios(
    empresaCNPJ: string, 
    numeroControlePNCP?: string,
    tipo?: TipoRelatorio
  ): Promise<RelatorioTecnico[]> {
    if (numeroControlePNCP && tipo) {
      return await relatoriosTecnicosRepository.getRelatoriosByTipo(
        empresaCNPJ, 
        numeroControlePNCP, 
        tipo
      );
    } else if (numeroControlePNCP) {
      const relatorio = await relatoriosTecnicosRepository.getRelatorioByEmpresaAndPNCP(
        empresaCNPJ, 
        numeroControlePNCP
      );
      return relatorio ? [relatorio] : [];
    } else {
      return await relatoriosTecnicosRepository.getRelatoriosByEmpresa(empresaCNPJ);
    }
  }

  async gerarUrlDownloadRelatorio(relatorioId: string, expiresIn: number = 3600): Promise<string> {
    const relatorio = await relatoriosTecnicosRepository.getRelatorioById(relatorioId);
    
    if (!relatorio) {
      throw new Error(`Relatório com ID ${relatorioId} não encontrado`);
    }
    
    return await relatoriosTecnicosRepository.generateSignedUrl(relatorio.url_storage, expiresIn);
  }

  async listarRelatoriosPorEmpresa(empresaCNPJ: string): Promise<any> {
    const relatorios = await relatoriosTecnicosRepository.getRelatoriosByEmpresa(empresaCNPJ);
    
    const organizados = relatorios.reduce((acc, relatorio) => {
      const pncp = relatorio.numero_controle_pncp;
      if (!acc[pncp]) {
        acc[pncp] = {
          numeroControlePNCP: pncp,
          relatorios: []
        };
      }
      acc[pncp].relatorios.push(relatorio);
      return acc;
    }, {} as any);
    
    return Object.values(organizados);
  }

  private async buscarLicitacaoEmpresa(empresaCNPJ: string, numeroControlePNCP: string) {
    try {
      console.log(`🔍 Buscando relação licitacao-empresa para CNPJ: ${empresaCNPJ} e PNCP: ${numeroControlePNCP}`);
      
      const relacao = await licitacaoEmpresaRepository.buscarPorChaves(numeroControlePNCP, empresaCNPJ);
      
      if (relacao) {
        console.log(`✅ Relação encontrada: ${relacao.id}`);
        return relacao;
      }
      
      console.log(`❌ Nenhuma relação encontrada para CNPJ: ${empresaCNPJ} e PNCP: ${numeroControlePNCP}`);
      return null;
      
    } catch (error) {
      console.error('❌ Erro ao buscar relação licitacao-empresa:', error);
      throw error;
    }
  }

  async buscarRelatorioPorId(relatorioId: string): Promise<RelatorioTecnico | null> {
    return await relatoriosTecnicosRepository.getRelatorioById(relatorioId);
  }

  async downloadRelatorio(relatorioId: string): Promise<Buffer> {
    const relatorio = await relatoriosTecnicosRepository.getRelatorioById(relatorioId);
    
    if (!relatorio) {
      throw new Error(`Relatório com ID ${relatorioId} não encontrado`);
    }
    
    const buffer = await relatoriosTecnicosRepository.downloadRelatorioFromStorage(relatorio.url_storage);
    
    await relatoriosTecnicosRepository.updateStatus(relatorio.id, 'baixado');
    
    return buffer;
  }

  async relatorioExiste(empresaCNPJ: string, numeroControlePNCP: string): Promise<boolean> {
    return await relatoriosTecnicosRepository.relatorioExiste(empresaCNPJ, numeroControlePNCP);
  }

  async deletarRelatorio(relatorioId: string): Promise<void> {
    const relatorio = await relatoriosTecnicosRepository.getRelatorioById(relatorioId);
    
    if (!relatorio) {
      throw new Error(`Relatório com ID ${relatorioId} não encontrado`);
    }
    
    try {
      await this.deleteFromStorage(relatorio.url_storage);
    } catch (error) {
      console.warn(`⚠️ Erro ao deletar relatório do storage: ${error}`);
    }
    
    await relatoriosTecnicosRepository.deleteRelatorio(relatorioId);
    
    console.log(`🗑️ Relatório ${relatorio.nome_arquivo} deletado com sucesso`);
  }

  private async uploadRelatorioToStorage(storagePath: string, buffer: Buffer): Promise<string> {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase.storage
      .from('relatorios-tecnicos')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf'
      });
    
    if (error) {
      throw new Error(`Erro ao fazer upload do relatório: ${error.message}`);
    }
    
    return storagePath;
  }

  private async deleteFromStorage(urlStorage: string): Promise<void> {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase.storage
      .from('relatorios-tecnicos')
      .remove([urlStorage]);
        
    if (error) throw error;
  }
}