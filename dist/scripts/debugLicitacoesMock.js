"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugComMockLicitacoes = debugComMockLicitacoes;
const redis_1 = require("redis");
const coordenadasService_1 = require("../services/licitacao/geolocation/coordenadasService");
const filters_1 = require("../services/licitacao/filters");
const client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
/**
 * Script para debugar usando dados mockados de licitações
 */
async function debugComMockLicitacoes() {
    console.log('🔍 DEBUG: Testando filtro geográfico com dados mock...\n');
    try {
        // 1. Verificar Redis
        console.log('1️⃣ Verificando Redis...');
        if (!client.isOpen)
            await client.connect();
        // Testar se São Paulo funciona
        const coordSP = await (0, coordenadasService_1.getCoordenadasCidade)('São Paulo');
        console.log(`   ✅ São Paulo encontrado: Lat ${coordSP?.lat}, Lng ${coordSP?.lng}`);
        // 2. Criar licitações mock com diferentes formatos de nome de cidade
        console.log('\n2️⃣ Criando licitações mock...');
        const licitacoesMock = [
            {
                numeroControlePNCP: 'SP001',
                informacaoComplementar: 'Info mock',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 100000,
                objetoCompra: 'Equipamentos de TI',
                unidadeOrgao: {
                    ufSigla: 'SP',
                    municipioNome: 'São Paulo' // Formato correto
                },
                itens: [{
                        numeroItem: 1,
                        descricao: 'Computador',
                        materialOuServico: 'M',
                        materialOuServicoNome: 'Material',
                        valorUnitarioEstimado: 5000,
                        valorTotal: 100000,
                        quantidade: 20,
                        ncmNbsCodigo: null,
                        ncmNbsDescricao: null
                    }]
            },
            {
                numeroControlePNCP: 'SP002',
                informacaoComplementar: 'Info mock',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 50000,
                objetoCompra: 'Móveis',
                unidadeOrgao: {
                    ufSigla: 'SP',
                    municipioNome: 'SÃO PAULO' // Formato maiúsculo
                },
                itens: [{
                        numeroItem: 1,
                        descricao: 'Cadeira',
                        materialOuServico: 'M',
                        materialOuServicoNome: 'Material',
                        valorUnitarioEstimado: 500,
                        valorTotal: 50000,
                        quantidade: 100,
                        ncmNbsCodigo: null,
                        ncmNbsDescricao: null
                    }]
            },
            {
                numeroControlePNCP: 'SP003',
                informacaoComplementar: 'Info mock',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 75000,
                objetoCompra: 'Serviços',
                unidadeOrgao: {
                    ufSigla: 'SP',
                    municipioNome: 'sao paulo' // Formato minúsculo sem acento
                },
                itens: [{
                        numeroItem: 1,
                        descricao: 'Limpeza',
                        materialOuServico: 'S',
                        materialOuServicoNome: 'Serviço',
                        valorUnitarioEstimado: 1000,
                        valorTotal: 75000,
                        quantidade: 75,
                        ncmNbsCodigo: null,
                        ncmNbsDescricao: null
                    }]
            },
            {
                numeroControlePNCP: 'RJ001',
                informacaoComplementar: 'Info mock',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 200000,
                objetoCompra: 'Construção',
                unidadeOrgao: {
                    ufSigla: 'RJ',
                    municipioNome: 'Rio de Janeiro' // Cidade diferente
                },
                itens: [{
                        numeroItem: 1,
                        descricao: 'Obra',
                        materialOuServico: 'S',
                        materialOuServicoNome: 'Serviço',
                        valorUnitarioEstimado: 200000,
                        valorTotal: 200000,
                        quantidade: 1,
                        ncmNbsCodigo: null,
                        ncmNbsDescricao: null
                    }]
            },
            {
                numeroControlePNCP: 'SP004',
                informacaoComplementar: 'Info mock',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 30000,
                objetoCompra: 'Material escolar',
                unidadeOrgao: {
                    ufSigla: 'SP',
                    municipioNome: 'Guarulhos' // Cidade próxima a SP
                },
                itens: [{
                        numeroItem: 1,
                        descricao: 'Livros',
                        materialOuServico: 'M',
                        materialOuServicoNome: 'Material',
                        valorUnitarioEstimado: 30,
                        valorTotal: 30000,
                        quantidade: 1000,
                        ncmNbsCodigo: null,
                        ncmNbsDescricao: null
                    }]
            }
        ];
        console.log(`   ✅ Criadas ${licitacoesMock.length} licitações mock`);
        // 3. Testar filtro geográfico
        console.log('\n3️⃣ Testando filtro geográfico...');
        const perfilTeste = {
            cnpj: '12345678000199',
            termosInteresse: ['tecnologia'],
            cidadeRadar: 'São Paulo',
            raioRadar: 50 // 50km de raio
        };
        console.log(`   🎯 Perfil: cidadeRadar="${perfilTeste.cidadeRadar}", raio=${perfilTeste.raioRadar}km`);
        const resultado = await (0, filters_1.aplicarFiltrosAtivos)(licitacoesMock, perfilTeste);
        console.log(`   📊 Resultado: ${resultado.estatisticas.totalInicial} → ${resultado.estatisticas.totalFinal} licitações`);
        console.log(`   📈 Filtros aplicados: ${resultado.filtrosAplicados.join(', ')}`);
        console.log(`   📉 Redução: ${resultado.estatisticas.reducaoPercentual}%`);
        // 4. Mostrar quais licitações passaram no filtro
        console.log('\n4️⃣ Licitações que passaram no filtro:');
        resultado.licitacoesFiltradas.forEach((lic, index) => {
            console.log(`   ${index + 1}. ${lic.numeroControlePNCP} - ${lic.unidadeOrgao.municipioNome} (${lic.unidadeOrgao.ufSigla})`);
        });
        // 5. Testar cada cidade individualmente
        console.log('\n5️⃣ Testando coordenadas de cada cidade das licitações mock...');
        const cidadesUnicas = [...new Set(licitacoesMock.map(lic => lic.unidadeOrgao.municipioNome))];
        for (const cidade of cidadesUnicas) {
            console.log(`   🔍 Testando cidade: "${cidade}"`);
            const coord = await (0, coordenadasService_1.getCoordenadasCidade)(cidade);
            if (coord) {
                console.log(`      ✅ ENCONTRADA: Lat ${coord.lat}, Lng ${coord.lng}`);
            }
            else {
                console.log(`      ❌ NÃO ENCONTRADA`);
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
    debugComMockLicitacoes()
        .then(() => {
        console.log('\n🏁 Debug finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
