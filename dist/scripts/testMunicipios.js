"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMunicipios = testMunicipios;
const redis_1 = __importDefault(require("../repositories/redis"));
async function testMunicipios() {
    try {
        console.log('🚀 Iniciando teste de municípios...\n');
        // 1. Verificar se dados estão carregados
        console.log('1️⃣ Verificando se dados estão carregados...');
        const loaded = await redis_1.default.checkMunicipiosLoaded();
        console.log(`   Status: ${loaded ? '✅ Carregados' : '❌ Não carregados'}\n`);
        // 2. Carregar municípios se necessário
        if (!loaded) {
            console.log('2️⃣ Carregando municípios no Redis...');
            const count = await redis_1.default.loadMunicipiosToRedis();
            console.log(`   Resultado: ${count} municípios carregados\n`);
        }
        else {
            console.log('2️⃣ Dados já carregados, pulando carregamento...\n');
        }
        // 3. Buscar por código IBGE (São Paulo)
        console.log('3️⃣ Testando busca por código IBGE (3550308 - São Paulo)...');
        const municipio = await redis_1.default.getMunicipioByIbge('3550308');
        if (municipio) {
            console.log(`   ✅ Encontrado: ${municipio.nome}`);
            console.log(`   📍 Latitude: ${municipio.latitude}, Longitude: ${municipio.longitude}`);
            console.log(`   📞 DDD: ${municipio.ddd}, UF: ${municipio.codigo_uf}`);
        }
        else {
            console.log('   ❌ Não encontrado');
        }
        console.log('');
        // 4. Buscar por nome
        console.log('4️⃣ Testando busca por nome (São Paulo)...');
        const municipio2 = await redis_1.default.getMunicipioByNome('São Paulo');
        if (municipio2) {
            console.log(`   ✅ Encontrado: ${municipio2.nome}`);
            console.log(`   🏛️ Código IBGE: ${municipio2.codigo_ibge}`);
        }
        else {
            console.log('   ❌ Não encontrado');
        }
        console.log('');
        // 5. Teste adicional com outro município
        console.log('5️⃣ Testando busca adicional (Rio de Janeiro - 3304557)...');
        const municipio3 = await redis_1.default.getMunicipioByIbge('3304557');
        if (municipio3) {
            console.log(`   ✅ Encontrado: ${municipio3.nome}`);
            console.log(`   📍 Capital: ${municipio3.capital === 1 ? 'Sim' : 'Não'}`);
        }
        else {
            console.log('   ❌ Não encontrado');
        }
        console.log('\n🎉 Teste concluído com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro durante o teste:', error);
        throw error;
    }
}
// Executa o teste se for chamado diretamente
if (require.main === module) {
    testMunicipios()
        .then(() => {
        console.log('\n✅ Script finalizado com sucesso!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
