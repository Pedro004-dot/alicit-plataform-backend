"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const analiseQueueRepository_1 = __importDefault(require("../../repositories/analiseQueueRepository"));
const analysisService_1 = require("./analysisService");
const LIMITE_ANALISES_SIMULTANEAS = 3;
class AnaliseQueueService {
    constructor() {
        this.editalAnalysisService = new analysisService_1.EditalAnalysisService();
    }
    async adicionarAnalise(numeroControlePNCP, empresaCnpj) {
        try {
            // Verificar se já existe análise para esta licitação
            const analiseExistente = await analiseQueueRepository_1.default.buscarPorNumeroControle(numeroControlePNCP);
            if (analiseExistente && (analiseExistente.status === 'pendente' || analiseExistente.status === 'processando')) {
                console.log(`⚠️ Análise já existe para ${numeroControlePNCP} com status: ${analiseExistente.status}`);
                return;
            }
            // Criar nova análise na fila
            const novaAnalise = await analiseQueueRepository_1.default.criar({
                numeroControlePNCP,
                empresaCnpj
            });
            console.log(`📋 Nova análise adicionada à fila: ${novaAnalise.id}`);
            // Verificar se pode processar imediatamente
            await this.processarFilaSeNecessario();
        }
        catch (error) {
            console.error('❌ Erro ao adicionar análise à fila:', error);
            throw error;
        }
    }
    async buscarStatusAnalise(numeroControlePNCP) {
        try {
            const analise = await analiseQueueRepository_1.default.buscarPorNumeroControle(numeroControlePNCP);
            if (!analise) {
                return { status: 'erro', erro: 'Análise não encontrada' };
            }
            const status = {
                status: analise.status
            };
            // Calcular posição na fila se pendente
            if (analise.status === 'pendente') {
                const posicao = await analiseQueueRepository_1.default.calcularPosicaoFila(analise.id);
                status.posicaoFila = posicao;
                status.tempoEstimado = posicao * 2; // Estimativa: 2 min por análise
            }
            // Adicionar detalhes do erro se houver
            if (analise.status === 'erro' && analise.erro_detalhes) {
                status.erro = analise.erro_detalhes;
            }
            return status;
        }
        catch (error) {
            console.error('❌ Erro ao buscar status da análise:', error);
            return { status: 'erro', erro: 'Erro interno do servidor' };
        }
    }
    async processarFilaSeNecessario() {
        try {
            // Contar quantas análises estão processando atualmente
            const processandoAtualmente = await analiseQueueRepository_1.default.contarPorStatus('processando');
            if (processandoAtualmente < LIMITE_ANALISES_SIMULTANEAS) {
                // Buscar próxima análise pendente
                const proximaAnalise = await analiseQueueRepository_1.default.buscarProximaPendente();
                if (proximaAnalise) {
                    console.log(`🚀 Iniciando processamento da análise: ${proximaAnalise.id}`);
                    // Processar em background sem aguardar
                    this.processarAnaliseBackground(proximaAnalise).catch(error => {
                        console.error('❌ Erro no processamento em background:', error);
                    });
                }
            }
            else {
                console.log(`⏳ Limite atingido: ${processandoAtualmente}/${LIMITE_ANALISES_SIMULTANEAS} análises processando`);
            }
        }
        catch (error) {
            console.error('❌ Erro ao processar fila:', error);
        }
    }
    async processarAnaliseBackground(analise) {
        try {
            // Marcar como processando
            await analiseQueueRepository_1.default.atualizarStatus(analise.id, 'processando');
            console.log(`⚡ Análise iniciada: ${analise.numero_controle_pncp}`);
            // Executar análise usando o sistema atual
            await this.executarAnaliseCompleta(analise);
            // Marcar como concluída
            await analiseQueueRepository_1.default.atualizarStatus(analise.id, 'concluida');
            console.log(`✅ Análise concluída: ${analise.numero_controle_pncp}`);
        }
        catch (error) {
            console.error(`❌ Erro na análise ${analise.numero_controle_pncp}:`, error);
            // Salvar erro no banco
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            await analiseQueueRepository_1.default.salvarErro(analise.id, errorMessage);
        }
        finally {
            // Sempre tentar processar próxima da fila
            setTimeout(() => {
                this.processarFilaSeNecessario();
            }, 1000);
        }
    }
    async executarAnaliseCompleta(analise) {
        // Integração com o sistema atual de análises
        const requestData = {
            licitacaoId: analise.numero_controle_pncp,
            empresaCNPJ: analise.empresa_cnpj
        };
        // Chamar o serviço atual de análise
        const resultado = await this.editalAnalysisService.analyzeEdital(requestData);
        console.log(`📊 Resultado da análise para ${analise.numero_controle_pncp}:`, resultado);
    }
}
exports.default = new AnaliseQueueService();
