"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugGeoFilter = debugGeoFilter;
const redis_1 = require("redis");
const pineconeLicitacaoRepository_1 = __importDefault(require("../repositories/pineconeLicitacaoRepository"));
const coordenadasService_1 = require("../services/licitacao/geolocation/coordenadasService");
const filters_1 = require("../services/licitacao/filters");
const client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
/**
 * Script para debugar o problema do filtro geográfico
 */
async function debugGeoFilter() {
    console.log('🔍 DEBUG: Analisando problema do filtro geográfico...\n');
    try {
        // 1. Verificar se Redis está conectado e tem municípios
        console.log('1️⃣ Verificando conexão com Redis...');
        if (!client.isOpen)
            await client.connect();
        const municipioKeys = await client.keys('municipio:*');
        console.log(`   ✅ Redis conectado - ${municipioKeys.length} entradas de municípios encontradas`);
        // 2. Testar busca por São Paulo especificamente
        console.log('\n2️⃣ Testando busca por São Paulo...');
        // Tentar diferentes formatos
        const formatosTeste = [
            'São Paulo',
            'sao paulo',
            'são paulo',
            'SAO PAULO',
            'SÃO PAULO'
        ];
        for (const formato of formatosTeste) {
            console.log(`   🔍 Testando formato: "${formato}"`);
            const coordenadas = await (0, coordenadasService_1.getCoordenadasCidade)(formato);
            if (coordenadas) {
                console.log(`   ✅ ENCONTRADO! Lat: ${coordenadas.lat}, Lng: ${coordenadas.lng}`);
                break;
            }
            else {
                console.log(`   ❌ Não encontrado`);
            }
        }
        // 3. Verificar chaves Redis específicas para São Paulo
        console.log('\n3️⃣ Verificando chaves Redis para São Paulo...');
        const chavesPossiveisSP = [
            'municipio:nome:são_paulo',
            'municipio:nome:sao_paulo',
            'municipio:ibge:3550308'
        ];
        for (const chave of chavesPossiveisSP) {
            console.log(`   🔍 Verificando chave: "${chave}"`);
            const data = await client.get(chave);
            if (data) {
                const municipio = JSON.parse(data);
                console.log(`   ✅ ENCONTRADO! Nome: ${municipio.nome}, Lat: ${municipio.latitude}, Lng: ${municipio.longitude}`);
            }
            else {
                console.log(`   ❌ Chave não encontrada`);
            }
        }
        // 4. Listar algumas chaves de municípios para ver o padrão
        console.log('\n4️⃣ Listando exemplos de chaves de municípios no Redis...');
        const exemplosChaves = await client.keys('municipio:nome:*');
        console.log(`   Total de chaves por nome: ${exemplosChaves.length}`);
        const primeiras10 = exemplosChaves.slice(0, 10);
        for (const chave of primeiras10) {
            console.log(`   📝 Chave exemplo: ${chave}`);
        }
        // 5. Buscar licitações no Pinecone e verificar estrutura
        console.log('\n5️⃣ Verificando licitações no Pinecone...');
        const licitacoes = await pineconeLicitacaoRepository_1.default.getAllLicitacoes();
        console.log(`   ✅ ${licitacoes.length} licitações encontradas no Pinecone`);
        if (licitacoes.length > 0) {
            console.log('\n6️⃣ Analisando estrutura das licitações...');
            // Verificar se há licitações de São Paulo
            const licitacoesSP = licitacoes.filter(lic => lic.unidadeOrgao?.municipioNome?.toLowerCase().includes('são paulo') ||
                lic.unidadeOrgao?.municipioNome?.toLowerCase().includes('sao paulo'));
            console.log(`   📍 Licitações de São Paulo encontradas: ${licitacoesSP.length}`);
            // Mostrar exemplos de nomes de municípios únicos
            const municipiosUnicos = [...new Set(licitacoes.map(lic => lic.unidadeOrgao?.municipioNome).filter(Boolean))];
            console.log(`   🏛️ Total de municípios únicos nas licitações: ${municipiosUnicos.length}`);
            console.log('\n   📋 Primeiros 20 municípios nas licitações:');
            municipiosUnicos.slice(0, 20).forEach((municipio, index) => {
                console.log(`   ${index + 1}. "${municipio}"`);
            });
            // Verificar se algum contém São Paulo
            const spVariacoes = municipiosUnicos.filter(m => m.toLowerCase().includes('são paulo') ||
                m.toLowerCase().includes('sao paulo') ||
                m.toLowerCase().includes('s.paulo') ||
                m.toLowerCase().includes('sp'));
            console.log(`\n   🎯 Municípios que podem ser São Paulo: ${spVariacoes.length}`);
            spVariacoes.forEach((municipio, index) => {
                console.log(`   ${index + 1}. "${municipio}"`);
            });
            // 7. Testar o filtro geográfico completo
            console.log('\n7️⃣ Testando filtro geográfico completo...');
            const perfilTeste = {
                cnpj: '12345678000199',
                termosInteresse: ['tecnologia'],
                cidadeRadar: 'São Paulo',
                raioRadar: 100
            };
            console.log(`   🎯 Testando com: cidadeRadar="${perfilTeste.cidadeRadar}", raio=${perfilTeste.raioRadar}km`);
            const resultadoFiltros = await (0, filters_1.aplicarFiltrosAtivos)(licitacoes, perfilTeste);
            console.log(`   📊 Resultado: ${resultadoFiltros.estatisticas.totalInicial} → ${resultadoFiltros.estatisticas.totalFinal} licitações`);
            console.log(`   📈 Filtros aplicados: ${resultadoFiltros.filtrosAplicados.join(', ')}`);
            console.log(`   📉 Redução: ${resultadoFiltros.estatisticas.reducaoPercentual}%`);
        }
    }
    catch (error) {
        console.error('❌ Erro durante debug:', error);
    }
    finally {
        if (client.isOpen) {
            await client.disconnect();
        }
    }
}
// Executa se for chamado diretamente
if (require.main === module) {
    debugGeoFilter()
        .then(() => {
        console.log('\n🏁 Debug finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
