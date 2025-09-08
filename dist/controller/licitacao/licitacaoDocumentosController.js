import { LicitacaoDocumentosService } from '../../services/licitacao/licitacaoDocumentosService';
export class LicitacaoDocumentosController {
    constructor() {
        this.licitacaoDocumentosService = new LicitacaoDocumentosService();
    }
    async listarDocumentos(req, res) {
        try {
            const { numeroControlePNCP } = req.params;
            const documentos = await this.licitacaoDocumentosService.buscarDocumentos(numeroControlePNCP);
            // Mapear dados do backend para o formato esperado pelo frontend
            const documentosMapeados = documentos.map(doc => ({
                id: doc.id,
                nome: doc.nome_arquivo,
                nomeOriginal: doc.nome_arquivo,
                tipo: doc.mimetype,
                tamanho: doc.tamanho_bytes,
                caminhoArquivo: doc.url_storage,
                tipoDocumento: doc.tipo_documento
            }));
            res.json({
                success: true,
                data: documentosMapeados,
                total: documentosMapeados.length
            });
        }
        catch (error) {
            console.error('❌ Erro ao listar documentos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao listar documentos',
                message: error.message
            });
        }
    }
    async gerarPreview(req, res) {
        try {
            const { documentoId } = req.params;
            const expiresIn = parseInt(req.query.expiresIn) || 3600;
            const url = await this.licitacaoDocumentosService.gerarUrlPreview(documentoId, expiresIn);
            res.json({
                success: true,
                data: { previewUrl: url, expiresIn }
            });
        }
        catch (error) {
            console.error('❌ Erro ao gerar preview:', error);
            res.status(404).json({
                success: false,
                error: 'Documento não encontrado',
                message: error.message
            });
        }
    }
    async downloadDocumento(req, res) {
        try {
            const { documentoId } = req.params;
            const documento = await this.licitacaoDocumentosService.buscarDocumentoPorId(documentoId);
            if (!documento) {
                res.status(404).json({
                    success: false,
                    error: 'Documento não encontrado'
                });
                return;
            }
            const buffer = await this.licitacaoDocumentosService.downloadDocumento(documentoId);
            res.set({
                'Content-Type': documento.mimetype,
                'Content-Disposition': `attachment; filename="${documento.nome_arquivo}"`,
                'Content-Length': buffer.length
            });
            res.send(buffer);
        }
        catch (error) {
            console.error('❌ Erro ao fazer download:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao fazer download do documento',
                message: error.message
            });
        }
    }
    async verificarExistencia(req, res) {
        try {
            const { numeroControlePNCP } = req.params;
            const existem = await this.licitacaoDocumentosService.documentosExistem(numeroControlePNCP);
            res.json({
                success: true,
                data: { existem, numeroControlePNCP }
            });
        }
        catch (error) {
            console.error('❌ Erro ao verificar existência:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao verificar documentos',
                message: error.message
            });
        }
    }
}
