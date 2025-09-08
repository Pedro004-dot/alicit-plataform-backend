"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugSituacaoReal = debugSituacaoReal;
const filters_1 = require("../services/licitacao/filters");
/**
 * Script para reproduzir exatamente a situação do log:
 * "Filtros aplicados: geografico (9651 → 9651), regiao (9651 → 0)"
 */
async function debugSituacaoReal() {
    console.log('🔍 DEBUG: Reproduzindo situação do log original...\n');
    try {
        // Simular uma situação com muitas licitações que passam no filtro geográfico
        const licitacoesMock = [];
        // Criar licitações principalmente de SP (para simular o cenário real)
        const municipiosSP = ['São Paulo', 'Guarulhos', 'Campinas', 'Osasco', 'Santo André'];
        const outrosEstados = [
            { uf: 'RJ', municipio: 'Rio de Janeiro' },
            { uf: 'MG', municipio: 'Belo Horizonte' },
            { uf: 'PR', municipio: 'Curitiba' },
            { uf: 'RS', municipio: 'Porto Alegre' },
            { uf: 'SC', municipio: 'Florianópolis' }
        ];
        // Adicionar muitas licitações de SP
        for (let i = 0; i < 50; i++) {
            licitacoesMock.push({
                numeroControlePNCP: `SP${String(i).padStart(3, '0')}`,
                informacaoComplementar: `Mock SP ${i}`,
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 50000 + i * 1000,
                objetoCompra: 'Equipamentos diversos',
                unidadeOrgao: {
                    ufSigla: 'SP',
                    municipioNome: municipiosSP[i % municipiosSP.length]
                },
                itens: [{ numeroItem: 1, descricao: 'Item', materialOuServico: 'M', materialOuServicoNome: 'Material', valorUnitarioEstimado: 1000, valorTotal: 50000, quantidade: 50, ncmNbsCodigo: null, ncmNbsDescricao: null }]
            });
        }
        // Adicionar algumas de outros estados
        for (let i = 0; i < 20; i++) {
            const estado = outrosEstados[i % outrosEstados.length];
            licitacoesMock.push({
                numeroControlePNCP: `${estado.uf}${String(i).padStart(3, '0')}`,
                informacaoComplementar: `Mock ${estado.uf} ${i}`,
                modalidadeNome: 'Pregão Eletrônico',
                valorTotalEstimado: 30000 + i * 1000,
                objetoCompra: 'Material variado',
                unidadeOrgao: {
                    ufSigla: estado.uf,
                    municipioNome: estado.municipio
                },
                itens: [{ numeroItem: 1, descricao: 'Item', materialOuServico: 'M', materialOuServicoNome: 'Material', valorUnitarioEstimado: 1000, valorTotal: 30000, quantidade: 30, ncmNbsCodigo: null, ncmNbsDescricao: null }]
            });
        }
        console.log(`📋 Criadas ${licitacoesMock.length} licitações mock:`);
        // Contar por UF
        const contadorUF = licitacoesMock.reduce((acc, lic) => {
            const uf = lic.unidadeOrgao.ufSigla;
            acc[uf] = (acc[uf] || 0) + 1;
            return acc;
        }, {});
        console.log('   📊 Distribuição por UF:');
        Object.entries(contadorUF).forEach(([uf, count]) => {
            console.log(`      ${uf}: ${count} licitações`);
        });
        // Cenários de teste que reproduzem o problema
        const cenarios = [
            {
                nome: 'Cenário 1: Empresa SP buscando só em SP',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 1000, // Raio muito grande para pegar tudo geograficamente
                    regiaoAtuacao: ['SP']
                }
            },
            {
                nome: 'Cenário 2: Empresa configurada para região que não existe',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 1000,
                    regiaoAtuacao: ['BA', 'CE'] // Estados que não temos nas licitações
                }
            },
            {
                nome: 'Cenário 3: Região com sigla errada',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 1000,
                    regiaoAtuacao: ['SP', 'sp', 'Sp'] // Case sensitivity problema?
                }
            },
            {
                nome: 'Cenário 4: Região undefined mas array existe',
                perfil: {
                    cnpj: '12345678000199',
                    termosInteresse: ['tecnologia'],
                    cidadeRadar: 'São Paulo',
                    raioRadar: 1000,
                    regiaoAtuacao: [undefined, null]
                }
            }
        ];
        console.log('\n🎯 Testando cenários que podem reproduzir o problema:');
        for (const cenario of cenarios) {
            console.log(`\n   📍 ${cenario.nome}:`);
            console.log(`      regiaoAtuacao: ${JSON.stringify(cenario.perfil.regiaoAtuacao)}`);
            const resultado = await (0, filters_1.aplicarFiltrosAtivos)(licitacoesMock, cenario.perfil);
            console.log(`      📊 ${resultado.estatisticas.totalInicial} → ${resultado.estatisticas.totalFinal} licitações`);
            console.log(`      📈 Filtros: ${resultado.filtrosAplicados.join(', ')}`);
            console.log(`      📉 Redução: ${resultado.estatisticas.reducaoPercentual}%`);
            if (resultado.estatisticas.totalFinal === 0) {
                console.log(`      ❌ REPRODUZIMOS O PROBLEMA! Todas foram filtradas`);
            }
            else {
                console.log(`      ✅ ${resultado.estatisticas.totalFinal} licitações passaram`);
            }
        }
    }
    catch (error) {
        console.error('❌ Erro durante debug:', error);
    }
}
// Executa se for chamado diretamente
if (require.main === module) {
    debugSituacaoReal()
        .then(() => {
        console.log('\n🏁 Debug finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
