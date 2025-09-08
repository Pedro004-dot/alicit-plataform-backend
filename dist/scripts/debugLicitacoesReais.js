"use strict";
/**
 * Script para analisar licitações reais sem usar Pinecone
 * Vamos criar algumas licitações de teste que simular o problema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugLicitacoesReais = debugLicitacoesReais;
const redis_1 = require("redis");
const coordenadasService_1 = require("../services/licitacao/geolocation/coordenadasService");
const filters_1 = require("../services/licitacao/filters");
const client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
/**
 * Simula licitações como podem vir do PNCP (com diferentes formatos de cidade)
 */
function criarLicitacoesRealisticas() {
    return [
        // Formato que pode estar vindo do PNCP - sem acento
        {
            numeroControlePNCP: 'REAL001',
            informacaoComplementar: 'Licitação real simulada',
            modalidadeNome: 'Pregão Eletrônico',
            valorTotalEstimado: 100000,
            objetoCompra: 'Equipamentos de informática',
            unidadeOrgao: {
                ufSigla: 'SP',
                municipioNome: 'SAO PAULO' // Formato sem acento que pode vir do PNCP
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
            numeroControlePNCP: 'REAL002',
            informacaoComplementar: 'Licitação real simulada',
            modalidadeNome: 'Pregão Eletrônico',
            valorTotalEstimado: 150000,
            objetoCompra: 'Móveis e utensílios',
            unidadeOrgao: {
                ufSigla: 'SP',
                municipioNome: 'Sao Paulo' // Formato misto
            },
            itens: [{
                    numeroItem: 1,
                    descricao: 'Mesa',
                    materialOuServico: 'M',
                    materialOuServicoNome: 'Material',
                    valorUnitarioEstimado: 1500,
                    valorTotal: 150000,
                    quantidade: 100,
                    ncmNbsCodigo: null,
                    ncmNbsDescricao: null
                }]
        },
        {
            numeroControlePNCP: 'REAL003',
            informacaoComplementar: 'Licitação real simulada',
            modalidadeNome: 'Pregão Eletrônico',
            valorTotalEstimado: 80000,
            objetoCompra: 'Material de limpeza',
            unidadeOrgao: {
                ufSigla: 'SP',
                municipioNome: 'sao paulo' // Formato minúsculo sem acento
            },
            itens: [{
                    numeroItem: 1,
                    descricao: 'Detergente',
                    materialOuServico: 'M',
                    materialOuServicoNome: 'Material',
                    valorUnitarioEstimado: 10,
                    valorTotal: 80000,
                    quantidade: 8000,
                    ncmNbsCodigo: null,
                    ncmNbsDescricao: null
                }]
        },
        {
            numeroControlePNCP: 'REAL004',
            informacaoComplementar: 'Licitação real simulada',
            modalidadeNome: 'Pregão Eletrônico',
            valorTotalEstimado: 120000,
            objetoCompra: 'Veículos',
            unidadeOrgao: {
                ufSigla: 'RJ',
                municipioNome: 'Rio de Janeiro' // Outra cidade para testar
            },
            itens: [{
                    numeroItem: 1,
                    descricao: 'Carro',
                    materialOuServico: 'M',
                    materialOuServicoNome: 'Material',
                    valorUnitarioEstimado: 60000,
                    valorTotal: 120000,
                    quantidade: 2,
                    ncmNbsCodigo: null,
                    ncmNbsDescricao: null
                }]
        },
        {
            numeroControlePNCP: 'REAL005',
            informacaoComplementar: 'Licitação real simulada',
            modalidadeNome: 'Pregão Eletrônico',
            valorTotalEstimado: 90000,
            objetoCompra: 'Equipamentos',
            unidadeOrgao: {
                ufSigla: 'SP',
                municipioNome: 'Osasco' // Cidade próxima a SP
            },
            itens: [{
                    numeroItem: 1,
                    descricao: 'Projetor',
                    materialOuServico: 'M',
                    materialOuServicoNome: 'Material',
                    valorUnitarioEstimado: 3000,
                    valorTotal: 90000,
                    quantidade: 30,
                    ncmNbsCodigo: null,
                    ncmNbsDescricao: null
                }]
        }
    ];
}
async function debugLicitacoesReais() {
    console.log('🔍 DEBUG: Analisando problema com licitações realísticas...\n');
    try {
        // 1. Conectar Redis
        if (!client.isOpen)
            await client.connect();
        // 2. Criar dados de teste
        const licitacoes = criarLicitacoesRealisticas();
        console.log(`📋 Criadas ${licitacoes.length} licitações realísticas:`);
        licitacoes.forEach((lic, index) => {
            console.log(`   ${index + 1}. ${lic.numeroControlePNCP} - "${lic.unidadeOrgao.municipioNome}" (${lic.unidadeOrgao.ufSigla})`);
        });
        // 3. Testar busca de coordenadas para cada cidade
        console.log('\n🗺️ Testando busca de coordenadas para cada cidade:');
        const cidadesUnicas = [...new Set(licitacoes.map(lic => lic.unidadeOrgao.municipioNome))];
        for (const cidade of cidadesUnicas) {
            console.log(`   🔍 "${cidade}"`);
            const coord = await (0, coordenadasService_1.getCoordenadasCidade)(cidade);
            if (coord) {
                console.log(`      ✅ ENCONTRADA: Lat ${coord.lat}, Lng ${coord.lng}`);
            }
            else {
                console.log(`      ❌ NÃO ENCONTRADA - ESTE É O PROBLEMA!`);
                // Vamos tentar normalizar e buscar novamente
                const cidadeNormalizada = cidade
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
                console.log(`      🔄 Tentando versão normalizada: "${cidadeNormalizada}"`);
                const coordNorm = await (0, coordenadasService_1.getCoordenadasCidade)(cidadeNormalizada);
                if (coordNorm) {
                    console.log(`      ✅ ENCONTRADA NORMALIZADA: Lat ${coordNorm.lat}, Lng ${coordNorm.lng}`);
                }
                else {
                    console.log(`      ❌ Ainda não encontrada`);
                }
            }
        }
        // 4. Aplicar filtro com diferentes configurações
        console.log('\n🎯 Testando filtro geográfico:');
        const perfis = [
            {
                nome: 'SP com 50km',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 50
                }
            },
            {
                nome: 'SP com 100km',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 100
                }
            },
            {
                nome: 'RJ com 50km',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'Rio de Janeiro',
                    raioRadar: 50
                }
            }
        ];
        for (const teste of perfis) {
            console.log(`\n   📍 ${teste.nome}:`);
            const resultado = await (0, filters_1.aplicarFiltrosAtivos)(licitacoes, teste.perfil);
            console.log(`      📊 ${resultado.estatisticas.totalInicial} → ${resultado.estatisticas.totalFinal} licitações`);
            console.log(`      📈 ${resultado.filtrosAplicados.join(', ')}`);
            if (resultado.licitacoesFiltradas.length > 0) {
                console.log(`      ✅ Licitações encontradas:`);
                resultado.licitacoesFiltradas.forEach(lic => {
                    console.log(`         - ${lic.numeroControlePNCP}: ${lic.unidadeOrgao.municipioNome}`);
                });
            }
            else {
                console.log(`      ❌ Nenhuma licitação passou no filtro`);
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
    debugLicitacoesReais()
        .then(() => {
        console.log('\n🏁 Debug finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
