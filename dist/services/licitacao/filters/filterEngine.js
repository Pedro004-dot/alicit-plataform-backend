import { filtroGeografico } from './geoFilter';
import { filtroValor } from './valorFilter';
import { filtroValorUnitario } from './valorUnitarioFilter';
// Registro automático de filtros disponíveis
const filtrosDisponiveis = [
    filtroGeografico, // APENAS filtro geográfico (cidade_radar + raio_distancia)
    filtroValor,
    filtroValorUnitario
];
/**
 * Motor de aplicação automática de filtros
 * Detecta quais filtros estão ativos e os aplica em ordem de prioridade
 */
export const aplicarFiltrosAtivos = async (licitacoes, perfil) => {
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
/**
 * Adiciona um novo filtro ao sistema (para extensibilidade futura)
 */
export const registrarFiltro = (filtro) => {
    if (!filtrosDisponiveis.find(f => f.nome === filtro.nome)) {
        filtrosDisponiveis.push(filtro);
        console.log(`✅ Filtro '${filtro.nome}' registrado no sistema`);
    }
};
