-- 🗺️ GEOGRAPHIC SETUP FOR SUPABASE
-- Adicionar colunas geográficas e função de distância

-- 1. Adicionar colunas de coordenadas na tabela licitacoes
ALTER TABLE licitacoes 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- 2. Criar índices para performance geográfica
CREATE INDEX IF NOT EXISTS idx_licitacoes_lat_lng 
ON licitacoes (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Criar tabela de municípios para referência
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
);

-- 4. Índices para busca eficiente de municípios
CREATE INDEX IF NOT EXISTS idx_municipios_nome_lower 
ON municipios (LOWER(nome));

CREATE INDEX IF NOT EXISTS idx_municipios_uf 
ON municipios (codigo_uf);

-- 5. Função para calcular distância (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    6371 * acos(
      greatest(-1, least(1,
        cos(radians(lat1)) * 
        cos(radians(lat2)) * 
        cos(radians(lng2) - radians(lng1)) + 
        sin(radians(lat1)) * 
        sin(radians(lat2))
      ))
    )
  )::DECIMAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Função para buscar licitações dentro de um raio
CREATE OR REPLACE FUNCTION licitacoes_within_radius(
  target_city TEXT,
  radius_km DECIMAL
) RETURNS TABLE(numero_controle_pncp VARCHAR) AS $$
DECLARE
  radar_lat DECIMAL;
  radar_lng DECIMAL;
BEGIN
  -- Buscar coordenadas da cidade alvo
  SELECT latitude, longitude INTO radar_lat, radar_lng
  FROM municipios 
  WHERE LOWER(unaccent(nome)) = LOWER(unaccent(target_city))
  LIMIT 1;
  
  -- Se não encontrou, tentar busca mais flexível
  IF radar_lat IS NULL THEN
    SELECT latitude, longitude INTO radar_lat, radar_lng
    FROM municipios 
    WHERE LOWER(unaccent(nome)) LIKE '%' || LOWER(unaccent(target_city)) || '%'
    LIMIT 1;
  END IF;
  
  IF radar_lat IS NULL THEN
    RAISE EXCEPTION 'Cidade não encontrada: %', target_city;
  END IF;
  
  -- Retornar IDs das licitações dentro do raio
  RETURN QUERY
  SELECT l.numero_controle_pncp
  FROM licitacoes l
  WHERE l.latitude IS NOT NULL 
    AND l.longitude IS NOT NULL
    AND calculate_distance_km(radar_lat, radar_lng, l.latitude, l.longitude) <= radius_km;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para buscar coordenadas de cidade (para integração)
CREATE OR REPLACE FUNCTION get_city_coordinates(city_name TEXT)
RETURNS TABLE(latitude DECIMAL, longitude DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT m.latitude, m.longitude
  FROM municipios m
  WHERE LOWER(unaccent(m.nome)) = LOWER(unaccent(city_name))
  LIMIT 1;
  
  -- Se não encontrou exato, tentar busca parcial
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT m.latitude, m.longitude
    FROM municipios m
    WHERE LOWER(unaccent(m.nome)) LIKE '%' || LOWER(unaccent(city_name)) || '%'
    ORDER BY length(m.nome) ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;