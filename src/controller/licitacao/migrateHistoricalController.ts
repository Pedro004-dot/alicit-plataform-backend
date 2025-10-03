import { Request, Response } from 'express';
import { HistoricalLicitacaoMigrator } from '../../scripts/migrateHistoricalLicitacoes';

interface MigrateHistoricalBody {
  dataInicio: string; // 'YYYYMMDD'
  dataFim?: string;   // 'YYYYMMDD' - opcional, default hoje
  modalidades?: number[]; // opcional, default [1,2,3,4,5,6,7,8]
  batchSizePaginas?: number; // opcional, default 10
  delayBetweenBatches?: number; // opcional, default 1000ms
}

const migrateHistorical = async (req: Request, res: Response) => {
  try {
    const {
      dataInicio,
      dataFim,
      modalidades,
      batchSizePaginas,
      delayBetweenBatches
    }: MigrateHistoricalBody = req.body;

    // Validação obrigatória
    if (!dataInicio) {
      return res.status(400).json({
        message: 'Campo dataInicio é obrigatório',
        format: 'YYYYMMDD',
        exemplo: '20250101'
      });
    }

    // Validação formato data
    if (!/^\d{8}$/.test(dataInicio)) {
      return res.status(400).json({
        message: 'dataInicio deve estar no formato YYYYMMDD',
        recebido: dataInicio,
        exemplo: '20250101'
      });
    }

    // Parâmetros com defaults
    const params = {
      dataInicio,
      dataFim: dataFim || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      modalidades: modalidades || [6,8,9],
      batchSizePaginas: batchSizePaginas || 5,
      delayBetweenBatches: delayBetweenBatches || 500
    };

    console.log('🚀 Iniciando migração histórica via API...');
    console.log('📋 Parâmetros:', params);
    
    // Enviar resposta imediata para o cliente
    res.status(200).json({
      message: 'Migração histórica iniciada em background',
      status: 'started',
      params,
      timestamp: new Date().toISOString()
    });

    // Executar migração em background
    const migrator = new HistoricalLicitacaoMigrator();
    migrator.executeMigration(params)
      .then(() => {
        console.log('✅ Migração histórica concluída com sucesso!');
      })
      .catch((error) => {
        console.error('❌ Erro na migração histórica:', error);
      });

  } catch (error) {
    console.error('❌ Erro ao iniciar migração:', error);
    res.status(500).json({
      message: 'Erro ao iniciar migração histórica',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export default { migrateHistorical };