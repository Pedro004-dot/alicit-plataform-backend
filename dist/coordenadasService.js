"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCoordenadasCache = exports.getCoordenadasCidade = void 0;
const redis_1 = require("redis");
const client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
// Cache para coordenadas de cidades (evita múltiplas consultas ao Redis)
const coordenadasCache = new Map();
/**
 * Gera variações possíveis de nome de cidade para busca robusta
 * @param nome - Nome original da cidade
 * @returns Array de possíveis chaves Redis
 */
const gerarVariacoesCidade = (nome) => {
    const nomeBase = nome.trim();
    const variacoes = [
        // Versão original lowercase com underscores
        nomeBase.toLowerCase().replace(/\s+/g, '_'),
        // Versão sem acentos
        nomeBase
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_'),
        // Versão com acentos preservados
        nomeBase.toLowerCase().replace(/\s+/g, '_'),
        // Casos especiais comuns
        nomeBase.toLowerCase().replace('sao ', 'são_').replace(/\s+/g, '_'),
        nomeBase.toLowerCase().replace('são ', 'sao_').replace(/\s+/g, '_')
    ];
    // Remove duplicatas
    return [...new Set(variacoes)];
};
/**
 * Busca coordenadas de uma cidade no Redis
 * @param nomeCidade - Nome da cidade
 * @returns Coordenadas da cidade ou null se não encontrada
 */
const getCoordenadasCidade = async (nomeCidade) => {
    const cidadeKey = nomeCidade.toLowerCase();
    // Verifica cache primeiro
    if (coordenadasCache.has(cidadeKey)) {
        return coordenadasCache.get(cidadeKey);
    }
    try {
        if (!client.isOpen)
            await client.connect();
        // Gera todas as variações possíveis
        const variacoes = gerarVariacoesCidade(nomeCidade);
        // Tenta cada variação até encontrar
        for (const variacao of variacoes) {
            const redisKey = `municipio:nome:${variacao}`;
            const municipioData = await client.get(redisKey);
            if (municipioData) {
                const municipio = JSON.parse(municipioData);
                const coordenadas = { lat: municipio.latitude, lng: municipio.longitude };
                // Salva no cache usando múltiplas chaves para acelerar buscas futuras
                coordenadasCache.set(cidadeKey, coordenadas);
                coordenadasCache.set(variacao, coordenadas);
                // Log de sucesso removido para reduzir ruído
                // console.log(`✅ Cidade "${nomeCidade}" encontrada como "${municipio.nome}" (chave: ${redisKey})`);
                return coordenadas;
            }
        }
        // Log de cidade não encontrada removido para reduzir ruído
        // console.warn(`❌ Cidade "${nomeCidade}" não encontrada em nenhuma variação. Tentativas: ${variacoes.map(v => `municipio:nome:${v}`).join(', ')}`);
        return null;
    }
    catch (error) {
        console.warn(`Erro ao buscar coordenadas de ${nomeCidade}:`, error);
        return null;
    }
};
exports.getCoordenadasCidade = getCoordenadasCidade;
/**
 * Limpa cache de coordenadas
 */
const clearCoordenadasCache = () => {
    coordenadasCache.clear();
    console.log('🧹 Cache de coordenadas limpo');
};
exports.clearCoordenadasCache = clearCoordenadasCache;
