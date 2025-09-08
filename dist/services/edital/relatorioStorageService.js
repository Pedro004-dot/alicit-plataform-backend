"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelatorioStorageService = exports.TipoRelatorio = void 0;
const relatoriosTecnicosRepository_1 = __importDefault(require("../../repositories/relatoriosTecnicosRepository"));
const licitacaoEmpresaRepository_1 = __importDefault(require("../../repositories/licitacaoEmpresaRepository"));
const fs = __importStar(require("fs"));
var TipoRelatorio;
(function (TipoRelatorio) {
    TipoRelatorio["ANALISE_COMPLETA"] = "analise-completa";
    TipoRelatorio["IMPUGNACAO"] = "impugnacao";
    TipoRelatorio["ESCLARECIMENTO"] = "esclarecimento";
    TipoRelatorio["ACOMPANHAMENTO"] = "acompanhamento";
})(TipoRelatorio || (exports.TipoRelatorio = TipoRelatorio = {}));
class RelatorioStorageService {
    async salvarRelatorio(empresaCNPJ, numeroControlePNCP, pdfPath, tipo = TipoRelatorio.ANALISE_COMPLETA, metadados, dadosPdf) {
        console.log(`💾 Salvando relatório ${tipo} para empresa ${empresaCNPJ} - licitação ${numeroControlePNCP}`);
        const licitacaoEmpresa = await this.buscarLicitacaoEmpresa(empresaCNPJ, numeroControlePNCP);
        if (!licitacaoEmpresa) {
            throw new Error(`Relação licitação-empresa não encontrada para ${empresaCNPJ} - ${numeroControlePNCP}`);
        }
        const pdfBuffer = fs.readFileSync(pdfPath);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${tipo}-${timestamp}-${Date.now()}.pdf`;
        const storagePath = `${empresaCNPJ}/${numeroControlePNCP}/${filename}`;
        const urlStorage = await this.uploadRelatorioToStorage(storagePath, pdfBuffer);
        const relatorioData = {
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
        const relatorioSalvo = await relatoriosTecnicosRepository_1.default.createRelatorio(relatorioData);
        console.log(`✅ Relatório ${tipo} salvo: ${filename}`);
        return relatorioSalvo;
    }
    async buscarRelatorios(empresaCNPJ, numeroControlePNCP, tipo) {
        if (numeroControlePNCP && tipo) {
            return await relatoriosTecnicosRepository_1.default.getRelatoriosByTipo(empresaCNPJ, numeroControlePNCP, tipo);
        }
        else if (numeroControlePNCP) {
            const relatorio = await relatoriosTecnicosRepository_1.default.getRelatorioByEmpresaAndPNCP(empresaCNPJ, numeroControlePNCP);
            return relatorio ? [relatorio] : [];
        }
        else {
            return await relatoriosTecnicosRepository_1.default.getRelatoriosByEmpresa(empresaCNPJ);
        }
    }
    async gerarUrlDownloadRelatorio(relatorioId, expiresIn = 3600) {
        const relatorio = await relatoriosTecnicosRepository_1.default.getRelatorioById(relatorioId);
        if (!relatorio) {
            throw new Error(`Relatório com ID ${relatorioId} não encontrado`);
        }
        return await relatoriosTecnicosRepository_1.default.generateSignedUrl(relatorio.url_storage, expiresIn);
    }
    async listarRelatoriosPorEmpresa(empresaCNPJ) {
        const relatorios = await relatoriosTecnicosRepository_1.default.getRelatoriosByEmpresa(empresaCNPJ);
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
        }, {});
        return Object.values(organizados);
    }
    async buscarLicitacaoEmpresa(empresaCNPJ, numeroControlePNCP) {
        try {
            console.log(`🔍 Buscando relação licitacao-empresa para CNPJ: ${empresaCNPJ} e PNCP: ${numeroControlePNCP}`);
            const relacao = await licitacaoEmpresaRepository_1.default.buscarPorChaves(numeroControlePNCP, empresaCNPJ);
            if (relacao) {
                console.log(`✅ Relação encontrada: ${relacao.id}`);
                return relacao;
            }
            console.log(`❌ Nenhuma relação encontrada para CNPJ: ${empresaCNPJ} e PNCP: ${numeroControlePNCP}`);
            return null;
        }
        catch (error) {
            console.error('❌ Erro ao buscar relação licitacao-empresa:', error);
            throw error;
        }
    }
    async buscarRelatorioPorId(relatorioId) {
        return await relatoriosTecnicosRepository_1.default.getRelatorioById(relatorioId);
    }
    async downloadRelatorio(relatorioId) {
        const relatorio = await relatoriosTecnicosRepository_1.default.getRelatorioById(relatorioId);
        if (!relatorio) {
            throw new Error(`Relatório com ID ${relatorioId} não encontrado`);
        }
        const buffer = await relatoriosTecnicosRepository_1.default.downloadRelatorioFromStorage(relatorio.url_storage);
        await relatoriosTecnicosRepository_1.default.updateStatus(relatorio.id, 'baixado');
        return buffer;
    }
    async relatorioExiste(empresaCNPJ, numeroControlePNCP) {
        return await relatoriosTecnicosRepository_1.default.relatorioExiste(empresaCNPJ, numeroControlePNCP);
    }
    async deletarRelatorio(relatorioId) {
        const relatorio = await relatoriosTecnicosRepository_1.default.getRelatorioById(relatorioId);
        if (!relatorio) {
            throw new Error(`Relatório com ID ${relatorioId} não encontrado`);
        }
        try {
            await this.deleteFromStorage(relatorio.url_storage);
        }
        catch (error) {
            console.warn(`⚠️ Erro ao deletar relatório do storage: ${error}`);
        }
        await relatoriosTecnicosRepository_1.default.deleteRelatorio(relatorioId);
        console.log(`🗑️ Relatório ${relatorio.nome_arquivo} deletado com sucesso`);
    }
    async uploadRelatorioToStorage(storagePath, buffer) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    async deleteFromStorage(urlStorage) {
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase.storage
            .from('relatorios-tecnicos')
            .remove([urlStorage]);
        if (error)
            throw error;
    }
}
exports.RelatorioStorageService = RelatorioStorageService;
