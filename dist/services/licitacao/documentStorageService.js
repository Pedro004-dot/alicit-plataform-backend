"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentStorageService = void 0;
const licitacaoRepository_1 = __importDefault(require("../../repositories/licitacaoRepository"));
class DocumentStorageService {
    async salvarDocumentosLicitacao(numeroControlePNCP, extractionResult) {
        console.log(`💾 Salvando ${extractionResult.totalFiles} documentos para licitação ${numeroControlePNCP}`);
        const storedDocuments = [];
        for (const document of extractionResult.documents) {
            try {
                const storagePath = this.buildStoragePath(numeroControlePNCP, document);
                const storageUrl = await licitacaoRepository_1.default.uploadDocumentoToStorage(storagePath, document.filename, document.buffer, document.mimetype);
                const documentData = {
                    numero_controle_pncp: numeroControlePNCP,
                    nome_arquivo: document.filename,
                    url_storage: storageUrl,
                    tipo_documento: 'documento',
                    mimetype: document.mimetype,
                    tamanho_bytes: document.size,
                    hash_arquivo: this.generateFileHash(document.buffer)
                };
                const storedDoc = await licitacaoRepository_1.default.createDocumento(documentData);
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
            }
            catch (error) {
                console.error(`❌ Erro ao salvar documento ${document.filename}:`, error);
                throw error;
            }
        }
        console.log(`✅ Total de ${storedDocuments.length} documentos salvos com hierarquia`);
        return storedDocuments;
    }
    async buscarDocumentosPorTipo(numeroControlePNCP, tipo) {
        const documentos = await licitacaoRepository_1.default.getDocumentosByTipo(numeroControlePNCP, tipo);
        return documentos.map(doc => this.convertToStoredDocument(doc));
    }
    async buscarDocumentosHierarquia(numeroControlePNCP) {
        const documentos = await licitacaoRepository_1.default.getDocumentosByPNCP(numeroControlePNCP);
        return {
            documentos,
            totalDocumentos: documentos.length
        };
    }
    buildStoragePath(numeroControlePNCP, document) {
        return numeroControlePNCP;
    }
    convertToStoredDocument(doc) {
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
    generateFileHash(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
}
exports.DocumentStorageService = DocumentStorageService;
