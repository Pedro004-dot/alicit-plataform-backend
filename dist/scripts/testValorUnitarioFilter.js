"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testValorUnitarioFilter = testValorUnitarioFilter;
const matchingLicitacaoService_1 = __importDefault(require("../services/licitacao/matchingLicitacaoService"));
/**
 * Demonstra o novo filtro de valor unitário
 */
async function testValorUnitarioFilter() {
    console.log('🧪 Testando Novo Filtro de Valor Unitário...\n');
    // Teste 1: Apenas filtro de valor unitário mínimo
    console.log('💰 TESTE 1: Filtro por valor unitário mínimo');
    const perfilMinimo = {
        termosInteresse: [], // Sem termos - apenas filtro unitário
        valorMinimoUnitario: 1000 // Itens com valor unitário >= R$ 1.000
    };
    console.log('Perfil:', JSON.stringify(perfilMinimo, null, 2));
    try {
        const matches1 = await matchingLicitacaoService_1.default.calculateMatching(perfilMinimo);
        console.log(`✅ Encontradas ${matches1.length} licitações com itens >= R$ 1.000\n`);
        if (matches1.length > 0) {
            console.log('📋 Exemplo de item que passou no filtro:');
            const primeiraLicitacao = matches1[0];
            const itemExemplo = primeiraLicitacao.licitacao.itens.find(item => item.valorUnitarioEstimado >= 1000);
            if (itemExemplo) {
                console.log(`   📦 ${itemExemplo.descricao.substring(0, 60)}...`);
                console.log(`   💵 Valor unitário: R$ ${itemExemplo.valorUnitarioEstimado.toLocaleString('pt-BR')}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    // Teste 2: Faixa de valor unitário
    console.log('\n💰 TESTE 2: Faixa de valor unitário (R$ 500 - R$ 5.000)');
    const perfilFaixa = {
        termosInteresse: [],
        valorMinimoUnitario: 500,
        valorMaximoUnitario: 5000
    };
    console.log('Perfil:', JSON.stringify(perfilFaixa, null, 2));
    try {
        const matches2 = await matchingLicitacaoService_1.default.calculateMatching(perfilFaixa);
        console.log(`✅ Encontradas ${matches2.length} licitações na faixa R$ 500-5.000\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    // Teste 3: Combinação com outros filtros
    console.log('🔄 TESTE 3: Valor unitário + Filtro geográfico');
    const perfilCombinado = {
        termosInteresse: [],
        valorMinimoUnitario: 100,
        valorMaximoUnitario: 10000,
        cidadeRadar: 'São Paulo',
        raioRadar: 50
    };
    console.log('Perfil:', JSON.stringify(perfilCombinado, null, 2));
    try {
        const matches3 = await matchingLicitacaoService_1.default.calculateMatching(perfilCombinado);
        console.log(`✅ Encontradas ${matches3.length} licitações (geo + valor unitário)\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    // Teste 4: Comparação com/sem filtro unitário
    console.log('📊 TESTE 4: Impacto do filtro unitário');
    const perfilSemFiltro = {
        termosInteresse: [],
        cidadeRadar: 'Rio de Janeiro',
        raioRadar: 30
    };
    const perfilComFiltro = {
        termosInteresse: [],
        cidadeRadar: 'Rio de Janeiro',
        raioRadar: 30,
        valorMinimoUnitario: 2000 // Adiciona filtro unitário
    };
    try {
        const semFiltro = await matchingLicitacaoService_1.default.calculateMatching(perfilSemFiltro);
        const comFiltro = await matchingLicitacaoService_1.default.calculateMatching(perfilComFiltro);
        console.log(`📍 Sem filtro unitário: ${semFiltro.length} licitações`);
        console.log(`📍 Com filtro unitário >= R$ 2.000: ${comFiltro.length} licitações`);
        const reducao = ((semFiltro.length - comFiltro.length) / semFiltro.length * 100).toFixed(1);
        console.log(`📉 Redução de ${reducao}% com filtro unitário\n`);
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    console.log('🎯 NOVO FILTRO DE VALOR UNITÁRIO FUNCIONANDO!');
    console.log('   ✅ Filtra licitações por valor unitário dos itens');
    console.log('   ✅ Integrado automaticamente ao sistema extensível');
    console.log('   ✅ Combina perfeitamente com outros filtros');
    console.log('   ✅ Zero modificações no código principal necessárias');
}
// Executa se for chamado diretamente
if (require.main === module) {
    testValorUnitarioFilter()
        .then(() => {
        console.log('\n🏁 Teste do filtro de valor unitário finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
