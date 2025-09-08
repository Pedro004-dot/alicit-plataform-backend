"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoDecisaoRepository_1 = __importDefault(require("../../repository/licitacaoDecisaoRepository"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
class LicitacaoDecisaoService {
    async processarDecisao(dados) {
        console.log(`📋 Processando decisão: ${dados.statusAprovacao} para ${dados.numeroControlePNCP}`);
        // Buscar licitação no banco local primeiro
        let licitacaoCompleta = await licitacaoDecisaoRepository_1.default.getLicitacao(dados.numeroControlePNCP);
        // Se não existir, buscar no Pinecone e salvar
        if (!licitacaoCompleta) {
            licitacaoCompleta = await pineconeLicitacaoRepository_1.default.getLicitacao(dados.numeroControlePNCP);
            if (!licitacaoCompleta)
                throw new Error('Licitação não encontrada no banco de dados');
            await licitacaoDecisaoRepository_1.default.salvarLicitacaoCompleta(licitacaoCompleta);
            console.log('✅ Licitação salva no banco local');
        }
        // Criar ou atualizar decisão
        const licitacaoEmpresa = await licitacaoDecisaoRepository_1.default.criarOuAtualizarDecisao(dados);
        // Criar estágio baseado no status
        const estagio = dados.statusAprovacao === 'aprovada' ? 'analise' : 'Não definido';
        await licitacaoDecisaoRepository_1.default.criarEstagio({
            licitacaoEmpresaId: licitacaoEmpresa.id,
            estagio
        });
        console.log(`✅ Licitação ${dados.statusAprovacao} e estágio "${estagio}" criado`);
        return {
            success: true,
            data: { licitacaoEmpresa, licitacao: licitacaoCompleta },
            message: `Licitação ${dados.statusAprovacao} com sucesso`
        };
    }
    async listarLicitacoesAprovadas(empresaCnpj) {
        const licitacoes = await licitacaoDecisaoRepository_1.default
            .listarLicitacoesAprovadas(empresaCnpj);
        return {
            success: true,
            data: licitacoes,
            total: licitacoes.length
        };
    }
    async atualizarEstagio(dados) {
        const estagiosValidos = ['analise', 'impugnacao', 'proposta', 'aguardando confirmacao'];
        if (!estagiosValidos.includes(dados.novoEstagio)) {
            throw new Error(`Estágio inválido. Estágios válidos: ${estagiosValidos.join(', ')}`);
        }
        const novoEstagio = await licitacaoDecisaoRepository_1.default
            .atualizarEstagio(dados.licitacaoEmpresaId, dados.novoEstagio, dados.observacoes);
        return {
            success: true,
            data: novoEstagio,
            message: `Estágio atualizado para '${dados.novoEstagio}'`
        };
    }
}
exports.default = new LicitacaoDecisaoService();
