import * as fs from 'fs';
import * as path from 'path';
import { Municipio, Coordenadas } from './types';

// Cache para coordenadas de cidades (evita múltiplas leituras do CSV)
const coordenadasCache = new Map<string, Coordenadas>();
let municipios: Municipio[] = [];
let csvCarregado = false;

/**
 * Carrega municípios do CSV uma única vez
 */
const carregarMunicipiosCSV = async (): Promise<void> => {
  if (csvCarregado) return;

  try {
    // Usar caminho absoluto para garantir que encontre o arquivo
    const csvPath = '/Users/pedrotorrezani/Documents/Programacao/alicit2.0/backend/src/municipios.csv';
    const csvContent = await fs.promises.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    municipios = [];
    // Pula o cabeçalho (primeira linha)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(',');
        if (columns.length >= 9) {
          const municipio: Municipio = {
            codigo_ibge: columns[0],
            nome: columns[1],
            latitude: parseFloat(columns[2]),
            longitude: parseFloat(columns[3]),
            capital: parseInt(columns[4]),
            codigo_uf: columns[5],
            siafi_id: columns[6],
            ddd: columns[7],
            fuso_horario: columns[8]
          };
          municipios.push(municipio);
        }
      }
    }
    
    csvCarregado = true;
    console.log(`📊 CSV carregado: ${municipios.length} municípios encontrados`);
  } catch (error) {
    console.error('❌ Erro ao carregar municípios do CSV:', error);
    throw error;
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
 * Busca coordenadas de uma cidade no CSV
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
    // Carrega CSV se ainda não foi carregado
    await carregarMunicipiosCSV();
    
    // Gera todas as variações possíveis
    const variacoes = gerarVariacoesCidade(nomeCidade);
    
    // Busca no array de municípios
    for (const variacao of variacoes) {
      const municipio = municipios.find(m => {
        const nomeNormalizado = m.nome.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const variacaoNormalizada = variacao.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        
        return nomeNormalizado === variacaoNormalizada;
      });
      
      if (municipio) {
        const coordenadas = { lat: municipio.latitude, lng: municipio.longitude };
        
        // Salva no cache para acelerar buscas futuras
        coordenadasCache.set(cidadeKey, coordenadas);
        coordenadasCache.set(variacao.toLowerCase(), coordenadas);
        
        console.log(`✅ Cidade "${nomeCidade}" encontrada: ${municipio.nome} (${coordenadas.lat}, ${coordenadas.lng})`);
        return coordenadas;
      }
    }
    
    console.warn(`❌ Cidade "${nomeCidade}" não encontrada no CSV. Tentativas: ${variacoes.join(', ')}`);
    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar coordenadas de ${nomeCidade}:`, error);
    return null;
  }
};

/**
 * Limpa cache de coordenadas e força recarregamento do CSV
 */
export const clearCoordenadasCache = (): void => {
  coordenadasCache.clear();
  csvCarregado = false;
  municipios = [];
  console.log('🧹 Cache de coordenadas limpo e CSV será recarregado na próxima busca');
};
