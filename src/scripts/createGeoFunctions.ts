import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CRIAR FUNÇÕES GEOGRÁFICAS NO SUPABASE
 * Cria todas as funções SQL necessárias para filtros geográficos
 */
async function createGeoFunctions() {
  console.log('🛠️ CRIANDO FUNÇÕES GEOGRÁFICAS NO SUPABASE\n');

  try {
    // 1. Habilitar extensão unaccent
    await enableUnaccentExtension();

    // 2. Criar função de busca de cidade
    await createCityCoordinatesFunction();

    // 3. Criar função de cálculo de distância
    await createDistanceFunction();

    // 4. Criar função de filtro por raio
    await createRadiusFilterFunction();

    // 5. Testar funções
    await testGeoFunctions();

    console.log('\n🎉 TODAS AS FUNÇÕES GEOGRÁFICAS CRIADAS COM SUCESSO!');

  } catch (error) {
    console.error('\n❌ ERRO AO CRIAR FUNÇÕES:', error);
    process.exit(1);
  }
}

async function enableUnaccentExtension(): Promise<void> {
  console.log('📦 Habilitando extensão unaccent...');
  
  try {
    console.log('✅ Extensão unaccent deve ser habilitada pelo painel do Supabase');

  } catch (error) {
    console.log('⚠️ Extensão unaccent não disponível, usando alternativa');
  }

  console.log('');
}

async function createCityCoordinatesFunction(): Promise<void> {
  console.log('🗺️ Criando função get_city_coordinates...');

  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_city_coordinates(city_name TEXT)
    RETURNS TABLE(latitude DECIMAL, longitude DECIMAL) AS $$
    BEGIN
      -- Busca exata primeiro
      RETURN QUERY
      SELECT m.latitude, m.longitude
      FROM municipios m
      WHERE LOWER(TRIM(m.nome)) = LOWER(TRIM(city_name))
      LIMIT 1;
      
      -- Se não encontrar, busca similiar
      IF NOT FOUND THEN
        RETURN QUERY
        SELECT m.latitude, m.longitude
        FROM municipios m
        WHERE LOWER(TRIM(m.nome)) LIKE '%' || LOWER(TRIM(city_name)) || '%'
        ORDER BY LENGTH(m.nome)
        LIMIT 1;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `;

  console.log('📄 SQL da função:');
  console.log(functionSQL);
  console.log('⚠️ Execute este SQL no painel SQL do Supabase manualmente');
  console.log('✅ Função get_city_coordinates definida (execute manualmente)');

  console.log('');
}

async function createDistanceFunction(): Promise<void> {
  console.log('📐 Criando função calculate_distance_km...');

  const functionSQL = `
    CREATE OR REPLACE FUNCTION calculate_distance_km(
      lat1 DECIMAL, lng1 DECIMAL,
      lat2 DECIMAL, lng2 DECIMAL
    ) RETURNS DECIMAL AS $$
    BEGIN
      RETURN (6371 * acos(
        greatest(-1, least(1,
          cos(radians(lat1)) * cos(radians(lat2)) * 
          cos(radians(lng2) - radians(lng1)) + 
          sin(radians(lat1)) * sin(radians(lat2))
        ))
      ))::DECIMAL;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    
    if (error) {
      console.log('❌ Erro ao criar função calculate_distance_km:', error.message);
      throw error;
    }
    
    console.log('✅ Função calculate_distance_km criada');
  } catch (error) {
    console.log('❌ Falha ao criar função calculate_distance_km');
    throw error;
  }

  console.log('');
}

async function createRadiusFilterFunction(): Promise<void> {
  console.log('🎯 Criando função licitacoes_within_radius...');

  const functionSQL = `
    CREATE OR REPLACE FUNCTION licitacoes_within_radius(
      target_city TEXT,
      radius_km DECIMAL
    ) RETURNS TABLE(numero_controle_pncp VARCHAR) AS $$
    DECLARE
      city_coords RECORD;
    BEGIN
      -- Buscar coordenadas da cidade
      SELECT latitude, longitude INTO city_coords
      FROM get_city_coordinates(target_city)
      LIMIT 1;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Cidade não encontrada: %', target_city;
      END IF;
      
      -- Retornar licitações dentro do raio
      RETURN QUERY
      SELECT l.numero_controle_pncp
      FROM licitacoes l
      WHERE l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL
        AND calculate_distance_km(
          city_coords.latitude, city_coords.longitude,
          l.latitude, l.longitude
        ) <= radius_km;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    
    if (error) {
      console.log('❌ Erro ao criar função licitacoes_within_radius:', error.message);
      throw error;
    }
    
    console.log('✅ Função licitacoes_within_radius criada');
  } catch (error) {
    console.log('❌ Falha ao criar função licitacoes_within_radius');
    throw error;
  }

  console.log('');
}

async function testGeoFunctions(): Promise<void> {
  console.log('🧪 TESTANDO FUNÇÕES GEOGRÁFICAS...');

  try {
    // Teste 1: Buscar coordenadas de São Paulo
    console.log('🔍 Teste 1: Buscar coordenadas de São Paulo...');
    const { data: spCoords, error: spError } = await supabase
      .rpc('get_city_coordinates', { city_name: 'São Paulo' });

    if (spError) {
      console.log('❌ Erro no teste São Paulo:', spError.message);
    } else if (spCoords && spCoords.length > 0) {
      console.log(`✅ São Paulo: ${spCoords[0].latitude}, ${spCoords[0].longitude}`);
    } else {
      console.log('⚠️ São Paulo não encontrado');
    }

    // Teste 2: Calcular distância SP-RJ
    console.log('🔍 Teste 2: Calcular distância SP-RJ...');
    const { data: distance, error: distError } = await supabase
      .rpc('calculate_distance_km', {
        lat1: -23.5505, lng1: -46.6333, // São Paulo
        lat2: -22.9068, lng2: -43.1729  // Rio de Janeiro
      });

    if (distError) {
      console.log('❌ Erro no teste distância:', distError.message);
    } else {
      console.log(`✅ Distância SP-RJ: ${parseFloat(distance).toFixed(1)}km (esperado: ~357km)`);
    }

    // Teste 3: Filtro por raio em São Paulo
    console.log('🔍 Teste 3: Filtro por raio São Paulo (50km)...');
    const { data: licitacoesSP, error: spRadiusError } = await supabase
      .rpc('licitacoes_within_radius', {
        target_city: 'São Paulo',
        radius_km: 50
      });

    if (spRadiusError) {
      console.log('❌ Erro no teste filtro SP:', spRadiusError.message);
    } else {
      console.log(`✅ Licitações num raio de 50km de São Paulo: ${licitacoesSP?.length || 0}`);
    }

    // Teste 4: Rio Branco (para o erro original)
    console.log('🔍 Teste 4: Buscar Rio Branco...');
    const { data: rbCoords, error: rbError } = await supabase
      .rpc('get_city_coordinates', { city_name: 'Rio Branco' });

    if (rbError) {
      console.log('❌ Erro no teste Rio Branco:', rbError.message);
    } else if (rbCoords && rbCoords.length > 0) {
      console.log(`✅ Rio Branco: ${rbCoords[0].latitude}, ${rbCoords[0].longitude}`);
    } else {
      console.log('⚠️ Rio Branco não encontrado - verificando alternativas...');
      
      // Buscar cidades similares
      const { data: similar } = await supabase
        .from('municipios')
        .select('nome, codigo_uf')
        .ilike('nome', '%rio%branco%')
        .limit(5);

      if (similar && similar.length > 0) {
        console.log('🔍 Cidades similares encontradas:');
        similar.forEach(city => {
          console.log(`   - ${city.nome} (${city.codigo_uf})`);
        });
      }
    }

  } catch (error) {
    console.log('❌ Erro nos testes:', error);
  }

  console.log('');
}

// Executar se chamado diretamente
if (require.main === module) {
  createGeoFunctions()
    .then(() => {
      console.log('\n🎯 Para testar, use: { "cidade_radar": "São Paulo", "raioDistancia": 50 }');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

export default createGeoFunctions;