import { createClient } from '@supabase/supabase-js';
import { Coordenadas } from './types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache para coordenadas de cidades (evita múltiplas consultas ao Supabase)
const coordenadasCache = new Map<string, Coordenadas>();

/**
 * Busca município no Supabase por nome (com variações)
 */
const buscarMunicipioSupabase = async (nomeCidade: string): Promise<{ latitude: number; longitude: number; nome: string } | null> => {
  try {
    // Gerar todas as variações possíveis do nome
    const variacoes = gerarVariacoesCidade(nomeCidade);
    
    for (const variacao of variacoes) {
      // Busca exata primeiro
      let { data: municipios, error } = await supabase
        .from('municipios')
        .select('latitude, longitude, nome')
        .ilike('nome', variacao.trim())
        .limit(1);
      
      let municipio = municipios && municipios.length > 0 ? municipios[0] : null;
      
      // Se não encontrar, busca similar
      if (error || !municipio) {
        const { data: municipiosSimilar, error: searchError } = await supabase
          .from('municipios')
          .select('latitude, longitude, nome')
          .ilike('nome', `%${variacao.trim()}%`)
          .limit(1);
        municipio = municipiosSimilar && municipiosSimilar.length > 0 ? municipiosSimilar[0] : null;
      }
      
      if (municipio) {
        console.log(`✅ Município "${nomeCidade}" encontrado no Supabase: ${municipio.nome} (${municipio.latitude}, ${municipio.longitude})`);
        return {
          latitude: parseFloat(municipio.latitude),
          longitude: parseFloat(municipio.longitude),
          nome: municipio.nome
        };
      }
    }
    
    console.warn(`❌ Município "${nomeCidade}" não encontrado no Supabase. Tentativas: ${variacoes.join(', ')}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar município ${nomeCidade} no Supabase:`, error);
    return null;
  }
};

/**
 * Gera variações possíveis de nome de cidade para busca robusta
 * @param nome - Nome original da cidade
 * @returns Array de possíveis variações do nome
 */
const gerarVariacoesCidade = (nome: string): string[] => {
  const nomeBase = nome.trim();
  
  const variacoes = [
    // Versão original
    nomeBase,
    
    // Versão sem acentos
    nomeBase
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
      
    // Versões lowercase
    nomeBase.toLowerCase(),
    nomeBase
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
    
    // Casos especiais comuns
    nomeBase.replace(/^Sao /i, 'São '),
    nomeBase.replace(/^São /i, 'Sao '),
    nomeBase.replace(/^Rio de /i, 'Rio De '),
    nomeBase.replace(/^Porto /i, 'Porto '),
    nomeBase.replace(/^Belo /i, 'Belo ')
  ];
  
  // Remove duplicatas
  return [...new Set(variacoes)];
};

/**
 * Busca coordenadas de uma cidade no Supabase
 * @param nomeCidade - Nome da cidade
 * @returns Coordenadas da cidade ou null se não encontrada
 */
export const getCoordenadasCidade = async (nomeCidade: string): Promise<Coordenadas | null> => {
  const cidadeKey = nomeCidade.toLowerCase();
  
  // Verifica cache primeiro
  if (coordenadasCache.has(cidadeKey)) {
    return coordenadasCache.get(cidadeKey)!;
  }
  
  try {
    // Busca município no Supabase
    const municipio = await buscarMunicipioSupabase(nomeCidade);
    
    if (municipio) {
      const coordenadas = { lat: municipio.latitude, lng: municipio.longitude };
      
      // Salva no cache para acelerar buscas futuras
      coordenadasCache.set(cidadeKey, coordenadas);
      coordenadasCache.set(municipio.nome.toLowerCase(), coordenadas);
      
      return coordenadas;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar coordenadas de ${nomeCidade}:`, error);
    return null;
  }
};

/**
 * Limpa cache de coordenadas
 */
export const clearCoordenadasCache = (): void => {
  coordenadasCache.clear();
  console.log('🧹 Cache de coordenadas limpo');
};
