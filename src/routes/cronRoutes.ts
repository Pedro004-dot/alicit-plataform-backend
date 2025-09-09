import { Router } from 'express';
import { cronService } from '../services/cron/cronService';

const router = Router();

/**
 * GET /cron/jobs - Lista jobs ativos
 */
router.get('/jobs', (req, res) => {
  try {
    const activeJobs = cronService.listActiveJobs();
    
    res.json({
      success: true,
      activeJobs,
      count: activeJobs.length,
      message: 'Jobs listados com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao listar jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /cron/run/:jobName - Executa job manualmente
 */
router.post('/run/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    
    await cronService.runJobManually(jobName);
    
    res.json({
      success: true,
      message: `Job ${jobName} executado com sucesso`,
      executedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro ao executar job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /cron/status - Status geral dos cron jobs
 */
router.get('/status', (req, res) => {
  try {
    const activeJobs = cronService.listActiveJobs();
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.json({
      success: true,
      environment: process.env.NODE_ENV || 'development',
      cronEnabled: isProduction,
      activeJobs,
      timezone: 'America/Sao_Paulo',
      nextExecution: '09:00 BRT (daily)',
      status: isProduction ? 'active' : 'disabled'
    });
  } catch (error: any) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;