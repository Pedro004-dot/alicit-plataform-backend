"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const searchLicitacaoService_1 = __importDefault(require("../../services/licitacao/searchLicitacaoService"));
const MODALIDADES_DISPONIVEIS = {
    1: 'Pregão',
    2: 'Concorrência',
    3: 'Diálogo Competitivo',
    4: 'Concurso',
    5: 'Leilão'
};
const searchLicitacao = async (req, res) => {
    try {
        const { modalidades, fonte } = req.body;
        let modalidadesValidas;
        if (modalidades) {
            if (!Array.isArray(modalidades)) {
                return res.status(400).json({
                    error: "Modalidades deve ser um array de números",
                    modalidadesDisponiveis: MODALIDADES_DISPONIVEIS
                });
            }
            modalidadesValidas = modalidades.filter((m) => {
                const modalidadeNum = Number(m);
                return modalidadeNum >= 1 && modalidadeNum <= 5;
            });
            if (modalidadesValidas.length === 0) {
                return res.status(400).json({
                    error: "Nenhuma modalidade válida informada. Use números de 1 a 5.",
                    modalidadesDisponiveis: MODALIDADES_DISPONIVEIS
                });
            }
            console.log(`📋 Modalidades especificadas: [${modalidadesValidas.join(', ')}]`);
        }
        else {
            console.log(`📋 Nenhuma modalidade especificada - buscando TODAS as modalidades`);
        }
        const hoje = new Date().toISOString().split('T')[0];
        console.log(`📅 Buscando licitações do dia: ${hoje}`);
        const search = await searchLicitacaoService_1.default.searchLicitacao({
            dataInicio: hoje,
            dataFim: hoje,
            fonte,
            modalidades: modalidadesValidas
        });
        res.status(201).json({
            ...search,
            parametros: {
                data: hoje,
                modalidades: modalidadesValidas || Object.keys(MODALIDADES_DISPONIVEIS).map(Number),
                modalidadesDisponiveis: MODALIDADES_DISPONIVEIS
            }
        });
        return search;
    }
    catch (error) {
        console.error("Erro ao buscar licitação:", error);
        res.status(500).json({ error: "Erro ao buscar licitação" });
    }
};
exports.default = { searchLicitacao, MODALIDADES_DISPONIVEIS };
