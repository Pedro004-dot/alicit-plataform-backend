import { DocumentStorageService } from './documentStorageService';
import downloadLicitacao from './downloadLicitacao';
import licitacaoRepository from '../../repositories/licitacaoRepository';
export class LicitacaoDocumentosService {
    constructor() {
        this.documentStorageService = new DocumentStorageService();
    }
    async processarEsalvarDocumentosLicitacao(numeroControlePNCP) {
        console.log(`🔄 Processando e salvando documentos para licitação ${numeroControlePNCP}`);
        const documentosExistentes = await this.documentosExistem(numeroControlePNCP);
        if (documentosExistentes) {
            console.log(`✅ Documentos já existem, retornando hierarquia organizada`);
            return await this.documentStorageService.buscarDocumentosHierarquia(numeroControlePNCP);
        }
        console.log(`📥 Documentos não encontrados, fazendo download e processamento completo`);
        const processedResult = await downloadLicitacao.downloadLicitacaoPNCP({
            numeroControlePNCP
        });
        await this.documentStorageService.salvarDocumentosLicitacao(numeroControlePNCP, processedResult.extractionResult);
        return processedResult.documents;
    }
    async documentosExistem(numeroControlePNCP) {
        return await licitacaoRepository.documentosExistem(numeroControlePNCP);
    }
    async buscarDocumentos(numeroControlePNCP) {
        return await licitacaoRepository.getDocumentosByPNCP(numeroControlePNCP);
    }
    async buscarDocumentoPorId(documentoId) {
        return await licitacaoRepository.getDocumentoById(documentoId);
    }
    async downloadDocumento(documentoId) {
        const documento = await licitacaoRepository.getDocumentoById(documentoId);
        if (!documento) {
            throw new Error(`Documento com ID ${documentoId} não encontrado`);
        }
        return await licitacaoRepository.downloadDocumentoFromStorage(documento.url_storage);
    }
    async gerarUrlPreview(documentoId, expiresIn = 3600) {
        const documento = await licitacaoRepository.getDocumentoById(documentoId);
        if (!documento) {
            throw new Error(`Documento com ID ${documentoId} não encontrado`);
        }
        return await licitacaoRepository.generateSignedUrl(documento.url_storage, expiresIn);
    }
    async processarDocumentosLicitacao(numeroControlePNCP) {
        console.log(`🔄 Processando documentos para licitação ${numeroControlePNCP}`);
        const documentosExistentes = await this.documentosExistem(numeroControlePNCP);
        if (documentosExistentes) {
            console.log(`✅ Documentos já existem no storage, carregando do Supabase...`);
            return await this.carregarDocumentosDoStorage(numeroControlePNCP);
        }
        else {
            console.log(`📥 Documentos não encontrados, fazendo processamento completo...`);
            const processedResult = await downloadLicitacao.downloadLicitacaoPNCP({
                numeroControlePNCP
            });
            await this.documentStorageService.salvarDocumentosLicitacao(numeroControlePNCP, processedResult.extractionResult);
            return processedResult.documents;
        }
    }
    async carregarDocumentosDoStorage(numeroControlePNCP) {
        const documentosIndexados = await this.buscarDocumentos(numeroControlePNCP);
        const documentos = [];
        for (const doc of documentosIndexados) {
            try {
                const buffer = await licitacaoRepository.downloadDocumentoFromStorage(doc.url_storage);
                const documentFile = {
                    filename: doc.nome_arquivo,
                    buffer: buffer,
                    mimetype: doc.mimetype,
                    size: doc.tamanho_bytes
                };
                documentos.push(documentFile);
            }
            catch (error) {
                console.error(`❌ Erro ao carregar documento ${doc.nome_arquivo}:`, error);
            }
        }
        console.log(`✅ ${documentos.length} documentos carregados do storage`);
        return documentos;
    }
    generateFileHash(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
    determinarTipoDocumento(filename) {
        const nome = filename.toLowerCase();
        if (nome.includes('edital'))
            return 'edital';
        if (nome.includes('anexo'))
            return 'anexo';
        if (nome.includes('planilha') || nome.includes('.xl'))
            return 'planilha';
        if (nome.includes('termo'))
            return 'termo';
        if (nome.includes('projeto'))
            return 'projeto';
        return 'documento';
    }
    async deletarDocumento(documentoId) {
        const documento = await licitacaoRepository.getDocumentoById(documentoId);
        if (!documento) {
            throw new Error(`Documento com ID ${documentoId} não encontrado`);
        }
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabase = createClient(supabaseUrl, supabaseKey);
            await supabase.storage
                .from('licitacao-documentos')
                .remove([documento.url_storage]);
        }
        catch (error) {
            console.warn(`⚠️ Erro ao deletar arquivo do storage: ${error}`);
        }
        await licitacaoRepository.deleteDocumento(documentoId);
        console.log(`🗑️ Documento ${documento.nome_arquivo} deletado com sucesso`);
    }
}
