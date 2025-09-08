"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
class LicitacaoRepository {
    async getLicitacaoById(id) {
        const { data, error } = await supabase_1.supabase
            .from('licitacoes')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            throw new Error(`Erro ao buscar licitação: ${error.message}`);
        }
        return data;
    }
    // Operações de documentos
    async uploadDocumentoToStorage(numeroControlePNCP, filename, buffer, mimetype) {
        // Sanitizar nome do arquivo para compatibilidade com Supabase Storage
        const sanitizedFilename = this.sanitizeFilename(filename);
        const filePath = `${numeroControlePNCP}/${sanitizedFilename}`;
        console.log(`📁 Upload: ${filename} → ${sanitizedFilename}`);
        // Determinar mimetype se não fornecido
        const contentType = mimetype || this.getMimeTypeFromFilename(filename);
        const { error } = await supabase_1.supabase.storage
            .from('licitacao-documentos')
            .upload(filePath, buffer, {
            contentType
        });
        if (error) {
            throw new Error(`Erro ao fazer upload do documento: ${error.message}`);
        }
        return filePath;
    }
    sanitizeFilename(filename) {
        return filename
            .normalize('NFD') // Normaliza acentos
            .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
            .replace(/\s+/g, '_') // Espaços → underscores
            .replace(/[^\w\-_.]/g, '') // Remove caracteres especiais
            .replace(/_{2,}/g, '_') // Múltiplos underscores → único
            .replace(/^_+|_+$/g, '') // Remove underscores início/fim
            .toLowerCase(); // Lowercase para consistência
    }
    getMimeTypeFromFilename(filename) {
        const extension = filename.toLowerCase().split('.').pop();
        const mimeTypes = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'rtf': 'application/rtf'
        };
        return mimeTypes[extension || 'pdf'] || 'application/pdf';
    }
    async createDocumento(documentoData) {
        const { data, error } = await supabase_1.supabase
            .from('licitacao_documentos')
            .insert(documentoData)
            .select()
            .single();
        if (error) {
            throw new Error(`Erro ao criar documento: ${error.message}`);
        }
        return data;
    }
    async documentosExistem(numeroControlePNCP) {
        const { count, error } = await supabase_1.supabase
            .from('licitacao_documentos')
            .select('*', { count: 'exact', head: true })
            .eq('numero_controle_pncp', numeroControlePNCP);
        if (error) {
            throw new Error(`Erro ao verificar documentos: ${error.message}`);
        }
        return (count || 0) > 0;
    }
    async getDocumentosByPNCP(numeroControlePNCP) {
        const { data, error } = await supabase_1.supabase
            .from('licitacao_documentos')
            .select('*')
            .eq('numero_controle_pncp', numeroControlePNCP)
            .order('tipo_documento', { ascending: true });
        if (error) {
            throw new Error(`Erro ao buscar documentos: ${error.message}`);
        }
        return data || [];
    }
    async getDocumentosByTipo(numeroControlePNCP, tipo) {
        const { data, error } = await supabase_1.supabase
            .from('licitacao_documentos')
            .select('*')
            .eq('numero_controle_pncp', numeroControlePNCP)
            .eq('tipo_documento', tipo);
        if (error) {
            throw new Error(`Erro ao buscar documentos por tipo: ${error.message}`);
        }
        return data || [];
    }
    async getDocumentoById(documentoId) {
        const { data, error } = await supabase_1.supabase
            .from('licitacao_documentos')
            .select('*')
            .eq('id', documentoId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Erro ao buscar documento: ${error.message}`);
        }
        return data;
    }
    async downloadDocumentoFromStorage(urlStorage) {
        const { data, error } = await supabase_1.supabase.storage
            .from('licitacao-documentos')
            .download(urlStorage);
        if (error) {
            throw new Error(`Erro ao baixar documento: ${error.message}`);
        }
        return Buffer.from(await data.arrayBuffer());
    }
    async generateSignedUrl(urlStorage, expiresIn = 3600) {
        const { data, error } = await supabase_1.supabase.storage
            .from('licitacao-documentos')
            .createSignedUrl(urlStorage, expiresIn);
        if (error) {
            throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
        }
        return data.signedUrl;
    }
    async deleteDocumento(documentoId) {
        const { error } = await supabase_1.supabase
            .from('licitacao_documentos')
            .delete()
            .eq('id', documentoId);
        if (error) {
            throw new Error(`Erro ao deletar documento: ${error.message}`);
        }
    }
    async deleteDocumentoFromStorage(urlStorage) {
        const { error } = await supabase_1.supabase.storage
            .from('licitacao-documentos')
            .remove([urlStorage]);
        if (error) {
            console.warn(`⚠️ Erro ao deletar arquivo do storage: ${error.message}`);
        }
    }
}
exports.default = new LicitacaoRepository();
