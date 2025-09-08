"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewAllMunicipios = viewAllMunicipios;
const redis_1 = require("redis");
const client = (0, redis_1.createClient)({ url: 'redis://localhost:6379' });
async function viewAllMunicipios() {
    try {
        console.log('🔍 Conectando ao Redis...');
        if (!client.isOpen) {
            await client.connect();
        }
        console.log('📊 Buscando todos os municípios salvos...\n');
        // Buscar todas as chaves de municípios por IBGE
        const keys = await client.keys('municipio:ibge:*');
        if (keys.length === 0) {
            console.log('❌ Nenhum município encontrado no Redis');
            return;
        }
        console.log(`✅ Encontrados ${keys.length} municípios no Redis\n`);
        // Buscar os dados de todos os municípios
        const municipios = [];
        for (const key of keys) {
            const data = await client.get(key);
            if (data) {
                const municipio = JSON.parse(data);
                municipios.push(municipio);
            }
        }
        // Ordenar por nome para melhor visualização
        municipios.sort((a, b) => a.nome.localeCompare(b.nome));
        // Mostrar estatísticas
        console.log('📈 ESTATÍSTICAS:');
        console.log(`   Total de municípios: ${municipios.length}`);
        const capitais = municipios.filter(m => m.capital === 1);
        console.log(`   Capitais: ${capitais.length}`);
        const estadosUnicos = [...new Set(municipios.map(m => m.codigo_uf))];
        console.log(`   Estados únicos: ${estadosUnicos.length}`);
        const dddsUnicos = [...new Set(municipios.map(m => m.ddd))];
        console.log(`   DDDs únicos: ${dddsUnicos.length}`);
        console.log('\n🏛️ CAPITAIS:');
        capitais.forEach((capital, index) => {
            console.log(`   ${index + 1}. ${capital.nome} (${capital.codigo_uf}) - DDD: ${capital.ddd}`);
        });
        // Mostrar alguns exemplos por estado
        console.log('\n🗺️ EXEMPLOS POR ESTADO (primeiros 3 de cada):');
        const municipiosPorEstado = municipios.reduce((acc, municipio) => {
            if (!acc[municipio.codigo_uf]) {
                acc[municipio.codigo_uf] = [];
            }
            acc[municipio.codigo_uf].push(municipio);
            return acc;
        }, {});
        Object.entries(municipiosPorEstado)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([uf, muns]) => {
            console.log(`\n   🏛️ UF ${uf} (${muns.length} municípios):`);
            muns.slice(0, 3).forEach((m, i) => {
                const isCapital = m.capital === 1 ? ' 👑' : '';
                console.log(`      ${i + 1}. ${m.nome}${isCapital} - IBGE: ${m.codigo_ibge}`);
            });
            if (muns.length > 3) {
                console.log(`      ... e mais ${muns.length - 3} municípios`);
            }
        });
        // Opção para mostrar todos (com confirmação)
        console.log('\n❓ Deseja ver TODOS os municípios? (isso pode ser muito longo)');
        console.log('   Execute: npm run view-all-municipios -- --all');
        // Se passou o parâmetro --all, mostrar todos
        const showAll = process.argv.includes('--all');
        if (showAll) {
            console.log('\n📋 LISTA COMPLETA DE MUNICÍPIOS:');
            console.log('='.repeat(80));
            municipios.forEach((municipio, index) => {
                const isCapital = municipio.capital === 1 ? ' 👑' : '';
                console.log(`${index + 1}. ${municipio.nome}${isCapital}`);
                console.log(`   📍 IBGE: ${municipio.codigo_ibge} | UF: ${municipio.codigo_uf} | DDD: ${municipio.ddd}`);
                console.log(`   🌍 Lat: ${municipio.latitude}, Lng: ${municipio.longitude}`);
                console.log(`   ⏰ Fuso: ${municipio.fuso_horario}`);
                console.log('   ' + '-'.repeat(70));
            });
        }
        console.log('\n✅ Visualização concluída!');
    }
    catch (error) {
        console.error('❌ Erro ao visualizar municípios:', error);
        throw error;
    }
    finally {
        if (client.isOpen) {
            await client.disconnect();
        }
    }
}
// Executa se for chamado diretamente
if (require.main === module) {
    viewAllMunicipios()
        .then(() => {
        console.log('\n🏁 Script finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}
