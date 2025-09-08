"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugRedisGeo = debugRedisGeo;
const redis_1 = require("redis");
const coordenadasService_1 = require("../services/licitacao/geolocation/coordenadasService");
const client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
/**
 * Script para debugar especificamente o problema Redis + Coordenadas
 */
async function debugRedisGeo() {
    console.log('🔍 DEBUG: Analisando problema Redis + Coordenadas...\n');
    try {
        // 1. Verificar se Redis está conectado e tem municípios
        console.log('1️⃣ Verificando conexão com Redis...');
        if (!client.isOpen)
            await client.connect();
        const municipioKeys = await client.keys('municipio:*');
        console.log(`   ✅ Redis conectado - ${municipioKeys.length} entradas de municípios encontradas`);
        if (municipioKeys.length === 0) {
            console.log('   ⚠️ PROBLEMA: Nenhum município carregado no Redis!');
            console.log('   💡 Execute: npm run load-municipios');
            return;
        }
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
            // Mostrar como fica a chave no Redis
            const chaveRedis = `municipio:nome:${formato.toLowerCase().replace(/\s+/g, '_')}`;
            console.log(`      Chave Redis gerada: "${chaveRedis}"`);
            const coordenadas = await (0, coordenadasService_1.getCoordenadasCidade)(formato);
            if (coordenadas) {
                console.log(`   ✅ ENCONTRADO! Lat: ${coordenadas.lat}, Lng: ${coordenadas.lng}`);
            }
            else {
                console.log(`   ❌ Não encontrado`);
                // Verificar diretamente no Redis
                const dataRedis = await client.get(chaveRedis);
                if (dataRedis) {
                    const municipio = JSON.parse(dataRedis);
                    console.log(`      ⚠️ Existe no Redis: ${municipio.nome} (mas função não encontrou)`);
                }
                else {
                    console.log(`      ❌ Não existe no Redis com esta chave`);
                }
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
        // 4. Buscar chaves que contenham "são" ou "sao" ou "paulo"
        console.log('\n4️⃣ Buscando chaves que contenham variações de São Paulo...');
        const todasChaves = await client.keys('municipio:nome:*');
        const chavesSaoPaulo = todasChaves.filter(chave => chave.includes('são') ||
            chave.includes('sao') ||
            chave.includes('paulo'));
        console.log(`   🔍 Encontradas ${chavesSaoPaulo.length} chaves relacionadas a São Paulo:`);
        for (const chave of chavesSaoPaulo) {
            const data = await client.get(chave);
            if (data) {
                const municipio = JSON.parse(data);
                console.log(`   📍 ${chave} → ${municipio.nome} (${municipio.codigo_uf})`);
            }
        }
        // 5. Verificar primeiro município como exemplo
        console.log('\n5️⃣ Verificando formato dos dados de exemplo...');
        const primeiraChave = await client.keys('municipio:nome:*');
        if (primeiraChave.length > 0) {
            const exemploData = await client.get(primeiraChave[0]);
            if (exemploData) {
                const exemploMunicipio = JSON.parse(exemploData);
                console.log(`   📄 Exemplo de estrutura de dados:`);
                console.log(`      Chave: ${primeiraChave[0]}`);
                console.log(`      Nome: "${exemploMunicipio.nome}"`);
                console.log(`      IBGE: ${exemploMunicipio.codigo_ibge}`);
                console.log(`      Coordenadas: ${exemploMunicipio.latitude}, ${exemploMunicipio.longitude}`);
            }
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
    debugRedisGeo()
        .then(() => {
        console.log('\n🏁 Debug finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
