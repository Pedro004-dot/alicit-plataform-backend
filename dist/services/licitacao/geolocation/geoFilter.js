import { getCoordenadasCidade } from './coordenadasService';
import { calcularDistanciaHaversine } from './distanciaCalculator';
// Cache para cidades em raio específico (chave: "cidade:raio", valor: Set de cidades)
const cidadesRaioCache = new Map();
/**
 * Filtra licitações por proximidade geográfica
 * @param licitacoes - Array de licitações
 * @param filtroGeo - Filtro geográfico com cidade e raio
 * @returns Licitações dentro do raio especificado
 */
export const filterLicitacoesPorGeografia = async (licitacoes, filtroGeo) => {
    const { cidadeRadar, raioRadar } = filtroGeo;
    // Busca coordenadas da cidade radar
    const coordenadasRadar = await getCoordenadasCidade(cidadeRadar);
    if (!coordenadasRadar) {
        console.warn(`Cidade radar '${cidadeRadar}' não encontrada`);
        return licitacoes; // Retorna todas se não encontrar a cidade
    }
    const cacheKey = `${cidadeRadar.toLowerCase()}:${raioRadar}`;
    // Verifica se já temos as cidades no raio em cache
    if (cidadesRaioCache.has(cacheKey)) {
        const cidadesPermitidas = cidadesRaioCache.get(cacheKey);
        return licitacoes.filter(lic => cidadesPermitidas.has(lic.unidadeOrgao.municipioNome.toLowerCase()));
    }
    // Calcula e cacheia as cidades no raio
    const cidadesNoRaio = new Set();
    const licitacoesFiltradas = [];
    for (const licitacao of licitacoes) {
        const cidadeLicitacao = licitacao.unidadeOrgao.municipioNome;
        const cidadeKey = cidadeLicitacao.toLowerCase();
        // Se já calculamos esta cidade, usa o resultado
        if (cidadesNoRaio.has(cidadeKey)) {
            licitacoesFiltradas.push(licitacao);
            continue;
        }
        // Calcula distância
        const coordenadasLicitacao = await getCoordenadasCidade(cidadeLicitacao);
        if (coordenadasLicitacao) {
            const distancia = calcularDistanciaHaversine(coordenadasRadar, coordenadasLicitacao);
            if (distancia <= raioRadar) {
                cidadesNoRaio.add(cidadeKey);
                licitacoesFiltradas.push(licitacao);
            }
        }
    }
    // Cacheia o resultado
    cidadesRaioCache.set(cacheKey, cidadesNoRaio);
    return licitacoesFiltradas;
};
/**
 * Limpa cache de cidades por raio
 */
export const clearCidadesRaioCache = () => {
    cidadesRaioCache.clear();
    console.log('🧹 Cache de cidades por raio limpo');
};
