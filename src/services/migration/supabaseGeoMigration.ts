import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface MunicipioCSV {
  codigo_ibge: string;
  nome: string;
  latitude: string;
  longitude: string;
  capital: string;
  codigo_uf: string;
  siafi_id: string;
  ddd: string;
  fuso_horario: string;
}

/**
 * MIGRAÇÃO GEOGRÁFICA PARA SUPABASE
 * 1. Popula tabela municipios
 * 2. Enriquece licitações existentes com coordenadas
 */
export class SupabaseGeoMigration {

  /**
   * PASSO 1: Carregar municípios do CSV para Supabase
   */
  async migrateMunicipios(): Promise<void> {
    console.log('🗺️ Iniciando migração de municípios para Supabase...');
    
    try {
      // Carregar CSV de municípios
      const csvPath = path.join(__dirname, '../../../municipios.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1); // Pular header
      
      const municipios: any[] = [];
      let processedCount = 0;
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const [codigo_ibge, nome, latitude, longitude, capital, codigo_uf, siafi_id, ddd, fuso_horario] = 
          line.split(',');
        
        if (codigo_ibge && nome && latitude && longitude) {
          municipios.push({
            codigo_ibge: codigo_ibge.trim(),
            nome: nome.trim(),
            latitude: parseFloat(latitude.trim()),
            longitude: parseFloat(longitude.trim()),
            capital: parseInt(capital?.trim() || '0'),
            codigo_uf: codigo_uf?.trim() || null,
            siafi_id: siafi_id?.trim() || null,
            ddd: ddd?.trim() || null,
            fuso_horario: fuso_horario?.trim() || null
          });
          
          processedCount++;
        }
      }
      
      console.log(`📊 Processados ${processedCount} municípios do CSV`);
      
      // Inserir em batches para performance
      const BATCH_SIZE = 1000;
      let insertedCount = 0;
      
      for (let i = 0; i < municipios.length; i += BATCH_SIZE) {
        const batch = municipios.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from('municipios')
          .upsert(batch, { 
            onConflict: 'codigo_ibge',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`❌ Erro no batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        } else {
          insertedCount += batch.length;
          console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} municípios`);
        }
      }
      
      console.log(`🎯 Migração concluída: ${insertedCount} municípios inseridos`);
      
    } catch (error) {
      console.error('❌ Erro na migração de municípios:', error);
      throw error;
    }
  }

  /**
   * PASSO 2: Enriquecer licitações existentes com coordenadas
   */
  async enrichLicitacoesWithCoordinates(): Promise<void> {
    console.log('📍 Iniciando enriquecimento de licitações com coordenadas...');
    
    try {
      // Buscar licitações sem coordenadas
      const { data: licitacoesSemCoordenadas, error: fetchError } = await supabase
        .from('licitacoes')
        .select('numero_controle_pncp, municipio_nome')
        .is('latitude', null)
        .limit(10000); // Processar em chunks
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!licitacoesSemCoordenadas?.length) {
        console.log('✅ Todas as licitações já possuem coordenadas');
        return;
      }
      
      console.log(`📊 Encontradas ${licitacoesSemCoordenadas.length} licitações sem coordenadas`);
      
      let enrichedCount = 0;
      let notFoundCount = 0;
      
      // Processar em batches para não sobrecarregar
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < licitacoesSemCoordenadas.length; i += BATCH_SIZE) {
        const batch = licitacoesSemCoordenadas.slice(i, i + BATCH_SIZE);
        
        for (const licitacao of batch) {
          try {
            // Buscar coordenadas do município
            const coordenadas = await this.getCityCoordinates(licitacao.municipio_nome);
            
            if (coordenadas) {
              // Atualizar licitação com coordenadas
              const { error: updateError } = await supabase
                .from('licitacoes')
                .update({
                  latitude: coordenadas.latitude,
                  longitude: coordenadas.longitude
                })
                .eq('numero_controle_pncp', licitacao.numero_controle_pncp);
              
              if (updateError) {
                console.error(`❌ Erro ao atualizar ${licitacao.numero_controle_pncp}:`, updateError);
              } else {
                enrichedCount++;
              }
            } else {
              notFoundCount++;
              console.log(`⚠️ Coordenadas não encontradas para: ${licitacao.municipio_nome}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao processar ${licitacao.numero_controle_pncp}:`, error);
          }
        }
        
        // Log de progresso
        const progress = Math.floor(((i + BATCH_SIZE) / licitacoesSemCoordenadas.length) * 100);
        console.log(`🔄 Progresso: ${progress}% (${enrichedCount} enriquecidas, ${notFoundCount} não encontradas)`);
        
        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`🎯 Enriquecimento concluído:`);
      console.log(`   ✅ ${enrichedCount} licitações enriquecidas`);
      console.log(`   ⚠️ ${notFoundCount} municípios não encontrados`);
      
    } catch (error) {
      console.error('❌ Erro no enriquecimento de licitações:', error);
      throw error;
    }
  }

  /**
   * Buscar coordenadas de cidade (reutiliza lógica existente)
   */
  private async getCityCoordinates(cityName: string): Promise<{latitude: number, longitude: number} | null> {
    if (!cityName?.trim()) return null;
    
    try {
      // Busca exata primeiro
      const { data, error } = await supabase
        .from('municipios')
        .select('latitude, longitude')
        .ilike('nome', cityName.trim())
        .limit(1)
        .single();
      
      if (error || !data) {
        // Busca parcial como fallback
        const { data: partialMatch } = await supabase
          .from('municipios')
          .select('latitude, longitude')
          .ilike('nome', `%${cityName.trim()}%`)
          .limit(1)
          .single();
        
        return partialMatch || null;
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * PASSO 3: Verificar integridade dos dados
   */
  async verifyMigration(): Promise<void> {
    console.log('🔍 Verificando integridade da migração geográfica...');
    
    try {
      // Contar municípios
      const { count: municipiosCount } = await supabase
        .from('municipios')
        .select('*', { count: 'exact', head: true });
      
      // Contar licitações com coordenadas
      const { count: licitacoesComCoordenadas } = await supabase
        .from('licitacoes')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null);
      
      // Contar licitações sem coordenadas
      const { count: licitacoesSemCoordenadas } = await supabase
        .from('licitacoes')
        .select('*', { count: 'exact', head: true })
        .is('latitude', null);
      
      console.log(`📊 Relatório de Migração Geográfica:`);
      console.log(`   🗺️ Municípios cadastrados: ${municipiosCount}`);
      console.log(`   📍 Licitações com coordenadas: ${licitacoesComCoordenadas}`);
      console.log(`   ❓ Licitações sem coordenadas: ${licitacoesSemCoordenadas}`);
      
      const coveragePercent = licitacoesComCoordenadas ? 
        ((licitacoesComCoordenadas / (licitacoesComCoordenadas + (licitacoesSemCoordenadas || 0))) * 100).toFixed(1) : 0;
      
      console.log(`   🎯 Cobertura geográfica: ${coveragePercent}%`);
      
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
    }
  }

  /**
   * Executar migração completa
   */
  async runFullMigration(): Promise<void> {
    console.log('🚀 Iniciando migração geográfica completa...');
    
    try {
      await this.migrateMunicipios();
      await this.enrichLicitacoesWithCoordinates();
      await this.verifyMigration();
      
      console.log('🎉 Migração geográfica concluída com sucesso!');
    } catch (error) {
      console.error('❌ Falha na migração geográfica:', error);
      throw error;
    }
  }
}

// Script para execução standalone
if (require.main === module) {
  const migration = new SupabaseGeoMigration();
  migration.runFullMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default SupabaseGeoMigration;