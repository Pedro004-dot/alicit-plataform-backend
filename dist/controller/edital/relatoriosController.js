import { RelatorioStorageService } from '../../services/edital/relatorioStorageService';
export class RelatoriosController {
    constructor() {
        this.relatoriosService = new RelatorioStorageService();
    }
    async listarRelatoriosEmpresa(req, res) {
        try {
            const { empresaCNPJ } = req.params;
            const relatorios = await this.relatoriosService.buscarRelatorios(empresaCNPJ);
            res.json({
                success: true,
                data: relatorios,
                total: relatorios.length
            });
        }
        catch (error) {
            console.error('❌ Erro ao listar relatórios:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao listar relatórios',
                message: error.message
            });
        }
    }
    async buscarRelatorio(req, res) {
        try {
            const { empresaCNPJ, numeroControlePNCP } = req.params;
            const relatorios = await this.relatoriosService.buscarRelatorios(empresaCNPJ, numeroControlePNCP);
            const relatorio = relatorios.length > 0 ? relatorios[0] : null;
            if (!relatorio) {
                res.status(404).json({
                    success: false,
                    error: 'Relatório não encontrado'
                });
                return;
            }
            res.json({
                success: true,
                data: relatorio
            });
        }
        catch (error) {
            console.error('❌ Erro ao buscar relatório:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar relatório',
                message: error.message
            });
        }
    }
    async downloadRelatorio(req, res) {
        try {
            const { relatorioId } = req.params;
            const relatorio = await this.relatoriosService.buscarRelatorioPorId(relatorioId);
            if (!relatorio) {
                res.status(404).json({
                    success: false,
                    error: 'Relatório não encontrado'
                });
                return;
            }
            const buffer = await this.relatoriosService.downloadRelatorio(relatorioId);
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${relatorio.nome_arquivo}"`,
                'Content-Length': buffer.length
            });
            res.send(buffer);
        }
        catch (error) {
            console.error('❌ Erro ao fazer download:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao fazer download do relatório',
                message: error.message
            });
        }
    }
    async gerarUrlDownload(req, res) {
        try {
            const { relatorioId } = req.params;
            const expiresIn = parseInt(req.query.expiresIn) || 3600;
            const url = await this.relatoriosService.gerarUrlDownloadRelatorio(relatorioId, expiresIn);
            res.json({
                success: true,
                data: { downloadUrl: url, expiresIn }
            });
        }
        catch (error) {
            console.error('❌ Erro ao gerar URL:', error);
            res.status(404).json({
                success: false,
                error: 'Relatório não encontrado',
                message: error.message
            });
        }
    }
    async verificarRelatorioExistente(req, res) {
        try {
            const { empresaCNPJ, numeroControlePNCP } = req.params;
            const existe = await this.relatoriosService.relatorioExiste(empresaCNPJ, numeroControlePNCP);
            const relatorios = existe ? await this.relatoriosService.buscarRelatorios(empresaCNPJ, numeroControlePNCP) : [];
            const relatorio = relatorios.length > 0 ? relatorios[0] : null;
            res.json({
                success: true,
                data: {
                    existe,
                    relatorio: relatorio || null
                }
            });
        }
        catch (error) {
            console.error('❌ Erro ao verificar relatório:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao verificar relatório existente',
                message: error.message
            });
        }
    }
}
