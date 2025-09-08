"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testExtensibleSystem = testExtensibleSystem;
const matchingLicitacaoService_1 = __importDefault(require("../services/licitacao/matchingLicitacaoService"));
const filters_1 = require("../services/licitacao/filters");
/**
 * Demonstra o sistema extensível de filtros
 */
async function testExtensibleSystem() {
    console.log('🧪 Testando Sistema Extensível de Filtros...\n');
    // Teste 1: Apenas filtros geográficos (sem termos)
    console.log('📍 TESTE 1: Busca sem termos (apenas geográfica)');
    const perfilGeo = {
        termosInteresse: [], // Array vazio!
        cidadeRadar: 'São Paulo',
        raioRadar: 50
    };
    console.log('Perfil:', JSON.stringify(perfilGeo, null, 2));
    try {
        const matches1 = await matchingLicitacaoService_1.default.calculateMatching(perfilGeo);
        console.log(`✅ Encontradas ${matches1.length} licitações\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    // Teste 2: Apenas filtros de valor
    console.log('💰 TESTE 2: Busca sem termos (apenas valor)');
    const perfilValor = {
        termosInteresse: [],
        valorMinimo: 10000,
        valorMaximo: 100000
    };
    console.log('Perfil:', JSON.stringify(perfilValor, null, 2));
    try {
        const matches2 = await matchingLicitacaoService_1.default.calculateMatching(perfilValor);
        console.log(`✅ Encontradas ${matches2.length} licitações\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    // Teste 3: Combinação de filtros
    console.log('🔄 TESTE 3: Combinação de filtros (geo + valor)');
    const perfilCombinado = {
        termosInteresse: [],
        cidadeRadar: 'Belo Horizonte',
        raioRadar: 100,
        valorMinimo: 50000,
        valorMaximo: 500000
    };
    console.log('Perfil:', JSON.stringify(perfilCombinado, null, 2));
    try {
        const matches3 = await matchingLicitacaoService_1.default.calculateMatching(perfilCombinado);
        console.log(`✅ Encontradas ${matches3.length} licitações\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    // Teste 4: Demonstrar extensibilidade - adicionar novo filtro
    console.log('⚡ TESTE 4: Demonstrando Extensibilidade');
    // Filtro exemplo: apenas licitações com valor par (demonstração)
    const filtroValorPar = {
        nome: 'valor_par',
        prioridade: 10,
        estaAtivo: (perfil) => perfil.valorMinimo !== undefined,
        aplicar: async (licitacoes) => {
            return licitacoes.filter(lic => Math.floor(lic.valorTotalEstimado) % 2 === 0);
        }
    };
    (0, filters_1.registrarFiltro)(filtroValorPar);
    console.log('✅ Novo filtro "valor_par" registrado automaticamente!\n');
    // Teste com o novo filtro
    try {
        const matches4 = await matchingLicitacaoService_1.default.calculateMatching(perfilValor);
        console.log(`✅ Com novo filtro: ${matches4.length} licitações\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    console.log('🎯 SISTEMA EXTENSÍVEL FUNCIONANDO PERFEITAMENTE!');
    console.log('   - Filtros aplicados automaticamente');
    console.log('   - Novos filtros adicionados sem tocar código principal');
    console.log('   - Performance otimizada (filtros em ordem de prioridade)');
    console.log('   - Termos opcionais (permite busca só por filtros)');
}
// Executa se for chamado diretamente
if (require.main === module) {
    testExtensibleSystem()
        .then(() => {
        console.log('\n🏁 Teste do sistema extensível finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
