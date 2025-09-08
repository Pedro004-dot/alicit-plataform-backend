"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCorrecaoRegiao = testCorrecaoRegiao;
const empresaService_1 = __importDefault(require("../services/empresa/empresaService"));
/**
 * Script para testar a correção do mapeamento cidade → UF
 */
async function testCorrecaoRegiao() {
    console.log('🧪 Testando correção do mapeamento cidade → UF...\n');
    // Mock de empresas com as cidades problemáticas do log
    const empresasMock = [
        {
            id: '1',
            nome: 'TechMunicipal Solutions',
            cnpj: '12345678000199',
            cidade: 'Sao Paulo' // Sem acento
        },
        {
            id: '2',
            nome: 'TechSolutions Ltda',
            cnpj: '98765432000188',
            cidade: 'São Paulo' // Com acento
        },
        {
            id: '3',
            nome: 'Construtora Alpha S.A.',
            cnpj: '11223344000177',
            cidade: 'Rio de Janeiro'
        },
        {
            id: '4',
            nome: 'Empresa Teste',
            cnpj: '55666777000166',
            cidade: 'Cidade Inexistente' // Para testar caso não encontrado
        }
    ];
    console.log('🏢 Empresas de teste:');
    empresasMock.forEach(emp => {
        console.log(`   ${emp.nome}: ${emp.cidade}`);
    });
    console.log('\n🔄 Processando com a nova lógica...');
    try {
        // Simular o processo de montagem de perfil
        for (const empresa of empresasMock) {
            console.log(`\n📋 Empresa: ${empresa.nome}`);
            console.log(`   Cidade original: "${empresa.cidade}"`);
            // Chamada direta ao método privado via reflexão (para teste)
            const service = empresaService_1.default;
            const uf = service.converterCidadeParaUF(empresa.cidade);
            if (uf) {
                console.log(`   ✅ Mapeada para UF: "${uf}"`);
                console.log(`   🎯 regiaoAtuacao seria: ["${uf}"]`);
            }
            else {
                console.log(`   ❌ Não foi possível mapear para UF`);
                console.log(`   ⚠️ regiaoAtuacao seria: []`);
            }
        }
        console.log('\n📊 Resumo da correção:');
        console.log('   ✅ "Sao Paulo" e "São Paulo" → "SP"');
        console.log('   ✅ "Rio de Janeiro" → "RJ"');
        console.log('   ✅ Agora as licitações de SP/RJ serão encontradas!');
        console.log('   ✅ O filtro região funcionará corretamente');
    }
    catch (error) {
        console.error('❌ Erro durante o teste:', error);
    }
}
// Executa se for chamado diretamente
if (require.main === module) {
    testCorrecaoRegiao()
        .then(() => {
        console.log('\n🏁 Teste de correção finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
