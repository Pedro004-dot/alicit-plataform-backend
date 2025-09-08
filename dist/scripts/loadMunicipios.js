"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const redis_1 = __importDefault(require("../repositories/redis"));
/**
 * Script para carregar os municípios do CSV no Redis
 * Execute este script uma vez para carregar todos os dados de municípios
 */
async function main() {
    try {
        console.log('🚀 Iniciando carregamento de municípios no Redis...');
        // Verifica se os dados já estão carregados
        const alreadyLoaded = await redis_1.default.checkMunicipiosLoaded();
        if (alreadyLoaded) {
            console.log('ℹ️  Municípios já estão carregados no Redis');
            // Exemplo de busca
            const municipio = await redis_1.default.getMunicipioByIbge('3550308'); // São Paulo
            if (municipio) {
                console.log('📍 Exemplo - Município encontrado:', municipio.nome);
            }
            return;
        }
        // Carrega os municípios
        const count = await redis_1.default.loadMunicipiosToRedis();
        if (count > 0) {
            console.log(`✅ Carregamento concluído! ${count} municípios foram inseridos no Redis`);
            console.log('⏰ TTL configurado para 365 dias');
            // Teste de busca
            console.log('\n🔍 Testando busca...');
            const testeMunicipio = await redis_1.default.getMunicipioByIbge('3550308'); // São Paulo
            if (testeMunicipio) {
                console.log('✅ Teste de busca bem-sucedido:', testeMunicipio.nome);
            }
        }
        else {
            console.log('❌ Erro no carregamento');
        }
    }
    catch (error) {
        console.error('❌ Erro durante execução:', error);
    }
}
// Executa o script se for chamado diretamente
if (require.main === module) {
    main().then(() => {
        console.log('🏁 Script finalizado');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
    });
}
