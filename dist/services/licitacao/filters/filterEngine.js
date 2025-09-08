"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarFiltro = exports.aplicarFiltrosAtivos = void 0;
const geoFilter_1 = require("./geoFilter");
const valorFilter_1 = require("./valorFilter");
const valorUnitarioFilter_1 = require("./valorUnitarioFilter");
// Registro automático de filtros disponíveis
const filtrosDisponiveis = [
    geoFilter_1.filtroGeografico, // APENAS filtro geográfico (cidade_radar + raio_distancia)
    valorFilter_1.filtroValor,
    valorUnitarioFilter_1.filtroValorUnitario
];
/**
 * Motor de aplicação automática de filtros
 * Detecta quais filtros estão ativos e os aplica em ordem de prioridade
 */
const aplicarFiltrosAtivos = async (licitacoes, perfil) => {
    const totalInicial = licitacoes.length;
    // Detecta filtros ativos
    const filtrosAtivos = filtrosDisponiveis
        .filter(filtro => filtro.estaAtivo(perfil))
        .sort((a, b) => (a.prioridade || 999) - (b.prioridade || 999));
    let resultado = licitacoes;
    const filtrosAplicados = [];
    // Aplica cada filtro ativo em sequência
    for (const filtro of filtrosAtivos) {
        const antes = resultado.length;
        resultado = await filtro.aplicar(resultado, perfil);
        filtrosAplicados.push(`${filtro.nome} (${antes} → ${resultado.length})`);
    }
    const totalFinal = resultado.length;
    const reducaoPercentual = totalInicial > 0 ?
        ((totalInicial - totalFinal) / totalInicial * 100) : 0;
    return {
        licitacoesFiltradas: resultado,
        filtrosAplicados,
        estatisticas: {
            totalInicial,
            totalFinal,
            reducaoPercentual: Number(reducaoPercentual.toFixed(1))
        }
    };
};
exports.aplicarFiltrosAtivos = aplicarFiltrosAtivos;
/**
 * Adiciona um novo filtro ao sistema (para extensibilidade futura)
 */
const registrarFiltro = (filtro) => {
    if (!filtrosDisponiveis.find(f => f.nome === filtro.nome)) {
        filtrosDisponiveis.push(filtro);
        console.log(`✅ Filtro '${filtro.nome}' registrado no sistema`);
    }
};
exports.registrarFiltro = registrarFiltro;
