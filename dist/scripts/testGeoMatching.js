"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGeoMatching = testGeoMatching;
const matchingLicitacaoService_1 = __importDefault(require("../services/licitacao/matchingLicitacaoService"));
/**
 * Script para testar o matching geográfico
 */
async function testGeoMatching() {
    console.log('🧪 Testando matching geográfico...\n');
    // Exemplo de perfil de empresa
    const empresaPerfil = {
        termosInteresse: ['equipamentos', 'tecnologia', 'computador'],
        cidadeRadar: 'São Paulo', // Cidade centro
        raioRadar: 100 // 100km de raio
    };
    try {
        console.log('📍 Configuração do teste:');
        console.log(`   Cidade radar: ${empresaPerfil.cidadeRadar}`);
        console.log(`   Raio: ${empresaPerfil.raioRadar}km`);
        console.log(`   Termos: ${empresaPerfil.termosInteresse.join(', ')}\n`);
        const inicio = Date.now();
        const matches = await matchingLicitacaoService_1.default.calculateMatching(empresaPerfil);
        const tempoProcessamento = Date.now() - inicio;
        console.log('\n📊 RESULTADOS:');
        console.log(`   ✅ ${matches.length} licitações encontradas`);
        console.log(`   ⏱️  Tempo de processamento: ${tempoProcessamento}ms`);
        if (matches.length > 0) {
            console.log('\n🎯 TOP 5 MATCHES:');
            matches.slice(0, 5).forEach((match, index) => {
                console.log(`   ${index + 1}. Score: ${match.matchScore.toFixed(3)}`);
                console.log(`      📍 ${match.licitacao.unidadeOrgao.municipioNome} (${match.licitacao.unidadeOrgao.ufSigla})`);
                console.log(`      💰 R$ ${match.licitacao.valorTotalEstimado.toLocaleString('pt-BR')}`);
                console.log(`      📄 ${match.licitacao.objetoCompra.substring(0, 100)}...`);
                console.log('      ' + '-'.repeat(60));
            });
        }
        // Teste sem filtro geográfico
        console.log('\n🔄 Testando SEM filtro geográfico...');
        const perfilSemGeo = {
            termosInteresse: empresaPerfil.termosInteresse
        };
        const inicioSemGeo = Date.now();
        const matchesSemGeo = await matchingLicitacaoService_1.default.calculateMatching(perfilSemGeo);
        const tempoSemGeo = Date.now() - inicioSemGeo;
        console.log(`   ✅ ${matchesSemGeo.length} licitações encontradas (sem filtro)`);
        console.log(`   ⏱️  Tempo: ${tempoSemGeo}ms`);
        const reducaoPercentual = ((matchesSemGeo.length - matches.length) / matchesSemGeo.length * 100).toFixed(1);
        console.log(`   📉 Redução: ${reducaoPercentual}% das licitações filtradas`);
    }
    catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}
// Executa se for chamado diretamente
if (require.main === module) {
    testGeoMatching()
        .then(() => {
        console.log('\n🏁 Teste finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
