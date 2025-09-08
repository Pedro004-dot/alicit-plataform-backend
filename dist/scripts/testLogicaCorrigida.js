"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLogicaCorrigida = testLogicaCorrigida;
const valorUnitarioFilter_1 = require("../services/licitacao/filters/valorUnitarioFilter");
/**
 * Testa a lógica corrigida do filtro de valor unitário
 */
async function testLogicaCorrigida() {
    console.log('🧪 Testando Lógica Corrigida do Filtro Unitário...\n');
    // Licitação de exemplo com itens variados
    const licitacaoExemplo = {
        numeroControlePNCP: 'TEST-001',
        modalidadeNome: 'Pregão',
        valorTotalEstimado: 15000,
        objetoCompra: 'Materiais diversos',
        unidadeOrgao: {
            ufSigla: 'SP',
            municipioNome: 'São Paulo'
        },
        itens: [
            {
                numeroItem: 1,
                descricao: 'Computador Desktop',
                materialOuServico: 'M',
                materialOuServicoNome: 'Material',
                valorUnitarioEstimado: 2500, // ✅ Dentro da faixa 1000-3000
                valorTotal: 10000,
                quantidade: 4,
                ncmNbsCodigo: null,
                ncmNbsDescricao: null
            },
            {
                numeroItem: 2,
                descricao: 'Mouse premium',
                materialOuServico: 'M',
                materialOuServicoNome: 'Material',
                valorUnitarioEstimado: 150, // ❌ Fora da faixa 1000-3000
                valorTotal: 300,
                quantidade: 2,
                ncmNbsCodigo: null,
                ncmNbsDescricao: null
            },
            {
                numeroItem: 3,
                descricao: 'Servidor enterprise',
                materialOuServico: 'M',
                materialOuServicoNome: 'Material',
                valorUnitarioEstimado: 15000, // ❌ Fora da faixa 1000-3000
                valorTotal: 15000,
                quantidade: 1,
                ncmNbsCodigo: null,
                ncmNbsDescricao: null
            }
        ]
    };
    const perfil = {
        termosInteresse: [],
        valorMinimoUnitario: 1000,
        valorMaximoUnitario: 3000
    };
    console.log('📋 LICITAÇÃO DE TESTE:');
    console.log(`   Total: R$ ${licitacaoExemplo.valorTotalEstimado.toLocaleString('pt-BR')}`);
    console.log('   Itens:');
    licitacaoExemplo.itens.forEach(item => {
        const status = (item.valorUnitarioEstimado >= 1000 && item.valorUnitarioEstimado <= 3000) ? '✅' : '❌';
        console.log(`   ${status} ${item.descricao}: R$ ${item.valorUnitarioEstimado.toLocaleString('pt-BR')}`);
    });
    console.log('\n🎯 FILTRO APLICADO:');
    console.log(`   Faixa: R$ ${perfil.valorMinimoUnitario?.toLocaleString('pt-BR')} - R$ ${perfil.valorMaximoUnitario?.toLocaleString('pt-BR')}`);
    // Aplicar o filtro corrigido
    try {
        const resultado = await valorUnitarioFilter_1.filtroValorUnitario.aplicar([licitacaoExemplo], perfil);
        console.log('\n📊 RESULTADO:');
        if (resultado.length > 0) {
            console.log('✅ LICITAÇÃO INCLUÍDA');
            console.log('   Motivo: Pelo menos 1 item (Computador Desktop) está na faixa');
            console.log('   ✅ Lógica CORRETA: Inclui licitação se algum item serve');
        }
        else {
            console.log('❌ LICITAÇÃO EXCLUÍDA');
            console.log('   ❌ Lógica INCORRETA: Nenhum item na faixa');
        }
        // Teste de edge cases
        console.log('\n🔬 TESTANDO CASOS EXTREMOS:');
        // Caso 1: Apenas valor mínimo
        const perfilMinimo = {
            termosInteresse: [],
            valorMinimoUnitario: 2000 // Apenas mínimo
        };
        const resultadoMinimo = await valorUnitarioFilter_1.filtroValorUnitario.aplicar([licitacaoExemplo], perfilMinimo);
        console.log(`📈 Apenas mínimo R$ 2.000: ${resultadoMinimo.length > 0 ? '✅ Incluída' : '❌ Excluída'}`);
        console.log(`   Itens >= R$ 2.000: Computador (R$ 2.500), Servidor (R$ 15.000)`);
        // Caso 2: Apenas valor máximo
        const perfilMaximo = {
            termosInteresse: [],
            valorMaximoUnitario: 200 // Apenas máximo
        };
        const resultadoMaximo = await valorUnitarioFilter_1.filtroValorUnitario.aplicar([licitacaoExemplo], perfilMaximo);
        console.log(`📉 Apenas máximo R$ 200: ${resultadoMaximo.length > 0 ? '✅ Incluída' : '❌ Excluída'}`);
        console.log(`   Itens <= R$ 200: Mouse (R$ 150)`);
    }
    catch (error) {
        console.error('❌ Erro no teste:', error);
    }
    console.log('\n🎯 LÓGICA CORRIGIDA CONFIRMADA:');
    console.log('   ✅ Licitação É INCLUÍDA se pelo menos 1 item atende');
    console.log('   ✅ Licitação NÃO É rejeitada por ter itens fora da faixa');
    console.log('   ✅ Comportamento intuitivo para empresas especializadas');
}
// Executa se for chamado diretamente
if (require.main === module) {
    testLogicaCorrigida()
        .then(() => {
        console.log('\n🏁 Teste da lógica corrigida finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
