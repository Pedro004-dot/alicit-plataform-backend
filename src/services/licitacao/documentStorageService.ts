import { 
  ExtractedDocument, 
  DocumentExtractionResult
} from '../../adapters/recursiveZipExtractor';
import licitacaoRepository from '../../repositories/licitacaoRepository';

export interface StoredDocument {
  id: string;
  numeroControlePNCP: string;
  nomeArquivo: string;
  pathHierarquico: string;
  urlStorage: string;
  tipoDocumento: string;
  nivelAninhamento: number;
  zipPai?: string;
  mimetype: string;
  tamanhoBytes: number;
}

export class DocumentStorageService {

  async salvarDocumentosLicitacao(
    numeroControlePNCP: string,
    extractionResult: DocumentExtractionResult
  ): Promise<StoredDocument[]> {
    console.log(`💾 Salvando ${extractionResult.totalFiles} documentos para licitação ${numeroControlePNCP}`);
    
    const storedDocuments: StoredDocument[] = [];
    
    for (const document of extractionResult.documents) {
      try {
        const storagePath = this.buildStoragePath(numeroControlePNCP, document);
        
        const storageUrl = await licitacaoRepository.uploadDocumentoToStorage(
          storagePath,
          document.filename,
          document.buffer,
          document.mimetype
        );
        
        const documentData = {
          numero_controle_pncp: numeroControlePNCP,
          nome_arquivo: document.filename,
          url_storage: storageUrl,
          tipo_documento: 'documento',
          mimetype: document.mimetype,
          tamanho_bytes: document.size,
          hash_arquivo: this.generateFileHash(document.buffer)
        };
        
        const storedDoc = await licitacaoRepository.createDocumento(documentData);
        
        storedDocuments.push({
          id: storedDoc.id,
          numeroControlePNCP: storedDoc.numero_controle_pncp,
          nomeArquivo: storedDoc.nome_arquivo,
          pathHierarquico: document.path,
          urlStorage: storedDoc.url_storage,
          tipoDocumento: storedDoc.tipo_documento,
          nivelAninhamento: document.level,
          zipPai: document.parentZip,
          mimetype: storedDoc.mimetype,
          tamanhoBytes: storedDoc.tamanho_bytes
        });
        
        console.log(`✅ Documento salvo: ${document.filename}`);
        
      } catch (error) {
        console.error(`❌ Erro ao salvar documento ${document.filename}:`, error);
        throw error;
      }
    }
    
    console.log(`✅ Total de ${storedDocuments.length} documentos salvos com hierarquia`);
    return storedDocuments;
  }

  async buscarDocumentosPorTipo(
    numeroControlePNCP: string, 
    tipo: string
  ): Promise<StoredDocument[]> {
    const documentos = await licitacaoRepository.getDocumentosByTipo(numeroControlePNCP, tipo);
    return documentos.map(doc => this.convertToStoredDocument(doc));
  }

  async buscarDocumentosHierarquia(numeroControlePNCP: string): Promise<any> {
    const documentos = await licitacaoRepository.getDocumentosByPNCP(numeroControlePNCP);
    
    return {
      documentos,
      totalDocumentos: documentos.length
    };
  }

  private buildStoragePath(numeroControlePNCP: string, document: ExtractedDocument): string {
    return numeroControlePNCP;
  }


  private convertToStoredDocument(doc: any): StoredDocument {
    return {
      id: doc.id,
      numeroControlePNCP: doc.numero_controle_pncp,
      nomeArquivo: doc.nome_arquivo,
      pathHierarquico: '',
      urlStorage: doc.url_storage,
      tipoDocumento: doc.tipo_documento,
      nivelAninhamento: 0,
      zipPai: undefined,
      mimetype: doc.mimetype,
      tamanhoBytes: doc.tamanho_bytes
    };
  }

  private generateFileHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }
}