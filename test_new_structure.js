// Script para testar a nova estrutura unificada de produtos/serviços
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testNewStructure() {
    console.log('🧪 Testando nova estrutura unificada de produtos/serviços...\n');

    try {
        // Dados de teste para uma nova empresa
        const empresaData = {
            nome: 'Empresa Teste Nova Estrutura',
            cnpj: '12345678000199',
            razaoSocial: 'Empresa Teste Nova Estrutura LTDA',
            endereco: 'Rua Teste, 123',
            email: 'teste@empresa.com',
            telefone: '11999999999',
            CEP: '01234567',
            cidades: 'São Paulo',
            cidadeRadar: 'São Paulo',
            raioDistancia: 50,
            dadosBancarios: {
                agencia: '1234',
                numeroConta: '56789-0',
                nomeTitular: 'Empresa Teste'
            },
            palavrasChave: 'teste, software, tecnologia',
            descricao: 'Empresa de teste para validar nova estrutura',
            produtoServico: 'Desenvolvimento de software',
            produtosServicos: [
                {
                    nome: 'Sistema Web',
                    descricao: 'Sistema web completo para gestão empresarial',
                    valor: 15000.00,
                    tipo: 'produto'
                },
                {
                    nome: 'Consultoria em TI',
                    descricao: 'Consultoria especializada em tecnologia da informação',
                    valor: 200.00,
                    tipo: 'servico'
                },
                {
                    nome: 'App Mobile',
                    descricao: 'Aplicativo mobile para iOS e Android',
                    valor: 25000.00,
                    tipo: 'produto'
                }
            ]
        };

        console.log('📤 Criando empresa com nova estrutura...');
        const response = await axios.post(`${BASE_URL}/empresa`, empresaData);
        
        console.log('✅ Empresa criada com sucesso!');
        console.log('📊 ID da empresa:', response.data.id);
        
        // Buscar empresa para verificar se os produtos/serviços foram salvos corretamente
        console.log('\n🔍 Verificando empresa criada...');
        const empresaCompleta = await axios.get(`${BASE_URL}/empresa/cnpj/${empresaData.cnpj}/completa`);
        
        console.log('📋 Dados da empresa:');
        console.log('- Nome:', empresaCompleta.data.nome);
        console.log('- CNPJ:', empresaCompleta.data.cnpj);
        
        if (empresaCompleta.data.empresas_produtos) {
            console.log('\n🎯 Produtos/Serviços encontrados:');
            empresaCompleta.data.empresas_produtos.forEach((item, index) => {
                console.log(`${index + 1}. ${item.nome} (${item.tipo})`);
                if (item.descricao) console.log(`   Descrição: ${item.descricao}`);
                if (item.valor) console.log(`   Valor: R$ ${item.valor}`);
            });
        }

        console.log('\n✨ Teste concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro no teste:', error.response?.data || error.message);
    }
}

// Executar teste
testNewStructure();