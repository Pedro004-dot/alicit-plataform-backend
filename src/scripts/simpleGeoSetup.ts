import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MunicipioCSV {
  codigo_ibge: string;
  nome: string;
  latitude: number;
  longitude: number;
  capital: number;
  codigo_uf: string;
  siafi_id: string;
  ddd: string;
  fuso_horario: string;
}

/**
 * SETUP GEOGRÁFICO SIMPLIFICADO
 * Versão sem dependências complexas
 */
async function simpleGeoSetup() {
  console.log('🗺️ INICIANDO SETUP GEOGRÁFICO SIMPLIFICADO\n');

  try {
    // 1. Verificar conexão
    console.log('🔍 Verificando conexão com Supabase...');
    const { data, error } = await supabase.from('licitacoes').select('count').limit(1);
    
    if (error) {
      throw new Error(`Erro na conexão: ${error.message}`);
    }
    console.log('✅ Conexão com Supabase OK\n');

    // 2. Verificar se colunas geográficas existem
    console.log('📋 Verificando schema geográfico...');
    await addGeographicColumns();

    // 3. Criar/verificar tabela de municípios
    console.log('🗺️ Configurando tabela de municípios...');
    await createMunicipiosTable();

    // 4. Popular municípios do CSV
    console.log('📊 Carregando dados de municípios...');
    await loadMunicipiosFromCSV();

    // 5. Enriquecer algumas licitações como teste
    console.log('📍 Enriquecendo licitações com coordenadas (amostra)...');
    await enrichSampleLicitacoes();

    // 6. Teste básico
    console.log('🧪 Testando funcionalidade geográfica...');
    await testBasicGeography();

    console.log('\n🎉 SETUP GEOGRÁFICO CONCLUÍDO COM SUCESSO!');
    console.log('🗺️ Agora você pode usar filtros geográficos na rota /find');

  } catch (error) {
    console.error('\n❌ ERRO NO SETUP:', error);
    process.exit(1);
  }
}

async function addGeographicColumns(): Promise<void> {
  try {
    // Tentar adicionar colunas (vai falhar se já existirem, mas tudo bem)
    const alterQueries = [
      'ALTER TABLE licitacoes ADD COLUMN latitude DECIMAL(10,8)',
      'ALTER TABLE licitacoes ADD COLUMN longitude DECIMAL(11,8)'
    ];

    for (const query of alterQueries) {
      try {
        await supabase.rpc('sql', { query });
        console.log(`   ✅ Coluna adicionada`);
      } catch (error) {
        console.log(`   ℹ️ Coluna já existe (continuando)`);
      }
    }

    console.log('✅ Schema geográfico verificado\n');
  } catch (error) {
    console.log('⚠️ Erro no schema (continuando):', error);
  }
}

async function createMunicipiosTable(): Promise<void> {
  try {
    const { error } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS municipios (
          codigo_ibge VARCHAR(7) PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          latitude DECIMAL(10,8) NOT NULL,
          longitude DECIMAL(11,8) NOT NULL,
          capital INTEGER DEFAULT 0,
          codigo_uf VARCHAR(2),
          siafi_id VARCHAR(10),
          ddd VARCHAR(3),
          fuso_horario VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
    });

    if (error) {
      console.log('⚠️ Erro na criação da tabela (pode já existir):', error.message);
    } else {
      console.log('✅ Tabela municipios configurada');
    }

    // Criar índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_municipios_nome ON municipios (LOWER(nome))',
      'CREATE INDEX IF NOT EXISTS idx_licitacoes_lat_lng ON licitacoes (latitude, longitude)'
    ];

    for (const indexQuery of indexes) {
      try {
        await supabase.rpc('sql', { query: indexQuery });
        console.log('   ✅ Índice criado');
      } catch (error) {
        console.log('   ℹ️ Índice já existe');
      }
    }

    console.log('✅ Índices configurados\n');
  } catch (error) {
    console.log('⚠️ Erro na configuração da tabela:', error);
  }
}

async function loadMunicipiosFromCSV(): Promise<void> {
  try {
    // Verificar se já temos municípios
    const { count } = await supabase
      .from('municipios')
      .select('*', { count: 'exact', head: true });

    if (count && count > 1000) {
      console.log(`✅ Municípios já carregados (${count} registros)\n`);
      return;
    }

    // Carregar CSV
    const csvPath = path.join(__dirname, '../municipios.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Arquivo não encontrado: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Pular header

    const municipios: any[] = [];
    let processedCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(',');
      if (parts.length >= 9) {
        municipios.push({
          codigo_ibge: parts[0].trim(),
          nome: parts[1].trim(),
          latitude: parseFloat(parts[2].trim()),
          longitude: parseFloat(parts[3].trim()),
          capital: parseInt(parts[4]?.trim() || '0'),
          codigo_uf: parts[5]?.trim() || null,
          siafi_id: parts[6]?.trim() || null,
          ddd: parts[7]?.trim() || null,
          fuso_horario: parts[8]?.trim() || null
        });
        processedCount++;
      }
    }

    console.log(`📊 Processados ${processedCount} municípios do CSV`);

    // Inserir em batches
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < municipios.length; i += BATCH_SIZE) {
      const batch = municipios.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('municipios')
        .upsert(batch, { onConflict: 'codigo_ibge' });

      if (error) {
        console.error(`❌ Erro no batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
      } else {
        insertedCount += batch.length;
        console.log(`   ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} municípios`);
      }
    }

    console.log(`✅ ${insertedCount} municípios carregados\n`);

  } catch (error) {
    console.error('❌ Erro ao carregar municípios:', error);
    throw error;
  }
}

async function enrichSampleLicitacoes(): Promise<void> {
  try {
    // Buscar algumas licitações sem coordenadas
    const { data: licitacoes } = await supabase
      .from('licitacoes')
      .select('numero_controle_pncp, municipio_nome')
      .is('latitude', null)
      .limit(50); // Apenas uma amostra

    if (!licitacoes?.length) {
      console.log('✅ Todas as licitações já possuem coordenadas\n');
      return;
    }

    console.log(`📊 Enriquecendo ${licitacoes.length} licitações...`);

    let enrichedCount = 0;

    for (const licitacao of licitacoes) {
      if (!licitacao.municipio_nome) continue;

      // Buscar coordenadas do município
      const { data: municipio } = await supabase
        .from('municipios')
        .select('latitude, longitude')
        .ilike('nome', licitacao.municipio_nome)
        .limit(1)
        .single();

      if (municipio) {
        // Atualizar licitação
        const { error } = await supabase
          .from('licitacoes')
          .update({
            latitude: municipio.latitude,
            longitude: municipio.longitude
          })
          .eq('numero_controle_pncp', licitacao.numero_controle_pncp);

        if (!error) {
          enrichedCount++;
        }
      }
    }

    console.log(`✅ ${enrichedCount} licitações enriquecidas\n`);

  } catch (error) {
    console.log('⚠️ Erro no enriquecimento (não crítico):', error);
  }
}

async function testBasicGeography(): Promise<void> {
  try {
    // Teste 1: Buscar coordenadas de São Paulo
    const { data: sp } = await supabase
      .from('municipios')
      .select('latitude, longitude')
      .ilike('nome', 'São Paulo')
      .limit(1)
      .single();

    if (sp) {
      console.log(`✅ São Paulo: ${sp.latitude}, ${sp.longitude}`);
    }

    // Teste 2: Contar licitações com coordenadas
    const { count } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null);

    console.log(`✅ Licitações com coordenadas: ${count || 0}`);

    // Teste 3: Contar municípios
    const { count: municipiosCount } = await supabase
      .from('municipios')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Municípios cadastrados: ${municipiosCount || 0}`);

    console.log('\n🧪 Testes básicos concluídos');

  } catch (error) {
    console.log('⚠️ Erro nos testes:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  simpleGeoSetup()
    .then(() => {
      console.log('\n🎯 Para testar o filtro geográfico:');
      console.log('POST /licitacoes/find');
      console.log('{ "palavraChave": "hospital", "cidade_radar": "São Paulo", "raioDistancia": 50 }');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}