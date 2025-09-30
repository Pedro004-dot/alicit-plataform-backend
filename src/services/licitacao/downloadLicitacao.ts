import pncpAdapter from '../../adapters/pncpAdapter';
import pineconeCacheService from '../../repositories/pineconeLicitacaoRepository';
import { RecursiveZipExtractor, ExtractedDocument, DocumentExtractionResult } from '../../adapters/recursiveZipExtractor';
import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';

interface DownloadLicitacaoInput {
    numeroControlePNCP: string;
}

interface licitacaoData {
    sequencial: number;
    ano: number;
    cnpj: string;
}

export interface DocumentFile {
    filename: string;
    buffer: Buffer;
    mimetype: string;
    size: number;
    url?: string;
}

export interface ProcessedLicitacao {
    documents: DocumentFile[];
    extractionResult: DocumentExtractionResult;
}

/**
 * Baixa um arquivo da URL e retorna o buffer
 */
const downloadFileFromUrl = async (url: string): Promise<{ buffer: Buffer; contentType: string; size: number }> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const size = buffer.length;

        return { buffer, contentType, size };
    } catch (error) {
        console.error(`❌ Erro ao baixar arquivo de ${url}:`, error);
        throw error;
    }
};

/**
 * Extrai nome do arquivo da URL
 */
const extractFilenameFromUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop() || 'documento';
        
        // Se não tem extensão, tenta inferir do content-type depois
        if (!filename.includes('.')) {
            return `${filename}.pdf`; // Assume PDF como padrão para editais
        }
        
        return filename;
    } catch (error) {
        return `documento-${Date.now()}.pdf`;
    }
};

/**
 * Determina o mimetype baseado na extensão do arquivo
 */
const getMimeTypeFromFilename = (filename: string, contentType?: string): string => {
    if (contentType && contentType !== 'application/octet-stream') {
        return contentType;
    }
    
    const extension = filename.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'txt': 'text/plain',
        'html': 'text/html',
        'htm': 'text/html'
    };
    
    return mimeTypes[extension || 'pdf'] || 'application/pdf';
};

const downloadLicitacaoPNCP = async (pncpId: DownloadLicitacaoInput): Promise<ProcessedLicitacao> => { 
    console.log(`📥 Iniciando download de documentos para ${pncpId.numeroControlePNCP}...`);
    const zipExtractor = new RecursiveZipExtractor();
    
    // 1. Buscar dados da licitação no Redis
    const licitacao = await pineconeLicitacaoRepository.getLicitacao(pncpId.numeroControlePNCP);
    if (!licitacao) {
        throw new Error(`Licitação ${pncpId.numeroControlePNCP} não encontrada no Pinecone`);
    }
    
    console.log(`📋 Licitação encontrada: ${licitacao.numeroControlePNCP}, ano ${licitacao.anoCompra}, sequencial ${licitacao.sequencialCompra}`);
    
    // 2. Buscar URLs dos documentos via adapter PNCP
    const adapter = new pncpAdapter();
    const documentUrls = await adapter.downloadLicitacaoPNCP({
        ano: licitacao.anoCompra || 0,
        sequencial: licitacao.sequencialCompra || 0,
        cnpj: licitacao.orgaoEntidade.cnpj || ''
    });
    
    if (!documentUrls || documentUrls.length === 0) {
        throw new Error(`Nenhum documento encontrado para a licitação ${pncpId.numeroControlePNCP}`);
    }
    
    console.log(`🔗 ${documentUrls.length} URL(s) de documento(s) encontrada(s)`);
    
    // 3. Baixar e processar cada documento recursivamente
    const documents: DocumentFile[] = [];
    let allExtractedDocuments: ExtractedDocument[] = [];
    let totalNestedLevels = 0;
    
    for (let i = 0; i < documentUrls.length; i++) {
        const url = documentUrls[i];
        console.log(`📥 Baixando documento ${i + 1}/${documentUrls.length}: ${url}`);
        
        try {
            const { buffer, contentType, size } = await downloadFileFromUrl(url);
            const filename = extractFilenameFromUrl(url);
            
            // Usar extração recursiva para todos os arquivos
            const extractionResult = await zipExtractor.extractAllDocuments(buffer, filename);
            
            if (extractionResult.totalFiles === 0) {
                console.warn(`⚠️ Nenhum documento processável encontrado em: ${filename}`);
                continue;
            }
            
            console.log(`📦 ${extractionResult.totalFiles} documento(s) extraído(s) de ${filename} (${extractionResult.nestedLevels} níveis)`);
            
            // Acumular resultados
            allExtractedDocuments.push(...extractionResult.documents);
            totalNestedLevels = Math.max(totalNestedLevels, extractionResult.nestedLevels);
            
            // Converter para formato DocumentFile para compatibilidade
            for (const doc of extractionResult.documents) {
                documents.push({
                    filename: doc.filename,
                    buffer: doc.buffer,
                    mimetype: doc.mimetype,
                    size: doc.size,
                    url: url
                });
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar documento ${i + 1}: ${error}`);
            // Continua com outros documentos
        }
    }
    
    if (documents.length === 0) {
        throw new Error(`Falha ao processar todos os documentos da licitação ${pncpId.numeroControlePNCP}`);
    }
    
    console.log(`✅ Processamento concluído: ${documents.length} documento(s) extraído(s) com ${totalNestedLevels} níveis de aninhamento`);
    
    return {
        documents,
        extractionResult: {
            documents: allExtractedDocuments,
            totalFiles: allExtractedDocuments.length,
            nestedLevels: totalNestedLevels
        }
    };
};

export default { downloadLicitacaoPNCP };