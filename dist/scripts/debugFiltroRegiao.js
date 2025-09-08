"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugFiltroRegiao = debugFiltroRegiao;
const filters_1 = require("../services/licitacao/filters");
/**
 * Script para debugar especificamente o filtro de região
 */
async function debugFiltroRegiao() {
    console.log('🔍 DEBUG: Analisando problema do filtro de região...\n');
    try {
        // Criar licitações com diferentes UFs
        const licitacoesMock = [
            {
                numeroControlePNCP: 'SP001',
                informacaoComplementar: 'Mock SP',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 100000,
                objetoCompra: 'Equipamentos',
                unidadeOrgao: {
                    ufSigla: 'SP',
                    municipioNome: 'São Paulo'
                },
                itens: [{ numeroItem: 1, descricao: 'Item', materialOuServico: 'M', materialOuServicoNome: 'Material', valorUnitarioEstimado: 1000, valorTotal: 100000, quantidade: 100, ncmNbsCodigo: null, ncmNbsDescricao: null }]
            },
            {
                numeroControlePNCP: 'RJ001',
                informacaoComplementar: 'Mock RJ',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 150000,
                objetoCompra: 'Móveis',
                unidadeOrgao: {
                    ufSigla: 'RJ',
                    municipioNome: 'Rio de Janeiro'
                },
                itens: [{ numeroItem: 1, descricao: 'Item', materialOuServico: 'M', materialOuServicoNome: 'Material', valorUnitarioEstimado: 1000, valorTotal: 150000, quantidade: 150, ncmNbsCodigo: null, ncmNbsDescricao: null }]
            },
            {
                numeroControlePNCP: 'MG001',
                informacaoComplementar: 'Mock MG',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 80000,
                objetoCompra: 'Serviços',
                unidadeOrgao: {
                    ufSigla: 'MG',
                    municipioNome: 'Belo Horizonte'
                },
                itens: [{ numeroItem: 1, descricao: 'Item', materialOuServico: 'S', materialOuServicoNome: 'Serviço', valorUnitarioEstimado: 1000, valorTotal: 80000, quantidade: 80, ncmNbsCodigo: null, ncmNbsDescricao: null }]
            },
            {
                numeroControlePNCP: 'PR001',
                informacaoComplementar: 'Mock PR',
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 60000,
                objetoCompra: 'Material',
                unidadeOrgao: {
                    ufSigla: 'PR',
                    municipioNome: 'Curitiba'
                },
                itens: [{ numeroItem: 1, descricao: 'Item', materialOuServico: 'M', materialOuServicoNome: 'Material', valorUnitarioEstimado: 1000, valorTotal: 60000, quantidade: 60, ncmNbsCodigo: null, ncmNbsDescricao: null }]
            }
        ];
        console.log(`📋 Criadas ${licitacoesMock.length} licitações mock para testar filtro de região:`);
        licitacoesMock.forEach((lic, index) => {
            console.log(`   ${index + 1}. ${lic.numeroControlePNCP} - ${lic.unidadeOrgao.municipioNome} (${lic.unidadeOrgao.ufSigla})`);
        });
        // Testar diferentes configurações de filtro
        const testesFiltro = [
            {
                nome: 'Sem filtro de região',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 500 // Raio grande para pegar todas
                }
            },
            {
                nome: 'Com região: SP',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 500,
                    regiaoAtuacao: ['SP'] // Só SP
                }
            },
            {
                nome: 'Com região: SP, RJ',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 500,
                    regiaoAtuacao: ['SP', 'RJ'] // SP e RJ
                }
            },
            {
                nome: 'Com região: MG, PR',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 500,
                    regiaoAtuacao: ['MG', 'PR'] // MG e PR (não inclui SP)
                }
            },
            {
                nome: 'Com região vazia',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 500,
                    regiaoAtuacao: [] // Array vazio
                }
            }
        ];
        console.log('\n🎯 Testando diferentes configurações de filtro:');
        for (const teste of testesFiltro) {
            console.log(`\n   📍 ${teste.nome}:`);
            console.log(`      Região configurada: ${teste.perfil.regiaoAtuacao?.join(', ') || 'não definida'}`);
            const resultado = await (0, filters_1.aplicarFiltrosAtivos)(licitacoesMock, teste.perfil);
            console.log(`      📊 ${resultado.estatisticas.totalInicial} → ${resultado.estatisticas.totalFinal} licitações`);
            console.log(`      📈 Filtros: ${resultado.filtrosAplicados.join(', ')}`);
            console.log(`      📉 Redução: ${resultado.estatisticas.reducaoPercentual}%`);
            if (resultado.licitacoesFiltradas.length > 0) {
                console.log(`      ✅ Licitações restantes:`);
                resultado.licitacoesFiltradas.forEach(lic => {
                    console.log(`         - ${lic.numeroControlePNCP}: ${lic.unidadeOrgao.municipioNome} (${lic.unidadeOrgao.ufSigla})`);
                });
            }
            else {
                console.log(`      ❌ TODAS as licitações foram filtradas - PROBLEMA!`);
            }
        }
    }
    catch (error) {
        console.error('❌ Erro durante debug:', error);
    }
}
// Executa se for chamado diretamente
if (require.main === module) {
    debugFiltroRegiao()
        .then(() => {
        console.log('\n🏁 Debug finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
