import 'dotenv/config';

// Desabilitar telemetria do Mastra
(globalThis as any).___MASTRA_TELEMETRY___ = true;

import express from 'express';
import cors from 'cors';
import licitacaoRoutes from './routes/licitacaoRoutes';
import editalAnalysisRoutes from './routes/analysisRoutes';
import empresaRoutes from './routes/empresaRoutes';
import licitacaoDocumentosRoutes from './routes/licitacaoDocumentosRoutes';
import relatoriosRoutes from './routes/relatoriosRoutes';
import { PineconeRepository } from './repositories/pineconeRepository';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import cronRoutes from './routes/cronRoutes';
import { cronService } from './services/cron/cronService';

const app = express();
const PORT = parseInt(process.env.PORT || '3002', 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check para Vercel
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ALICIT Backend API is running',
    service: 'alicit-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'alicit-backend',
    timestamp: new Date().toISOString()
  });
});

app.use('/licitacoes', licitacaoRoutes);
app.use('/licitacoes-documentos', licitacaoDocumentosRoutes);
app.use('/edital', editalAnalysisRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/empresa', empresaRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/cron', cronRoutes);

// Error handler para debugging no Vercel
app.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// Inicializar Pinecone no startup  
const initializePinecone = async () => {
  try {
    if (process.env.PINECONE_API_KEY) {
      const pineconeRepo = new PineconeRepository();
      await pineconeRepo.initialize();
    } else {
      console.log('⚠️ PINECONE_API_KEY não configurada - Pinecone não será inicializado');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Pinecone:', error);
    console.log('⚠️ Sistema continuará funcionando sem Pinecone - funcionalidades de RAG podem ficar limitadas');
  }
};

// Inicializar Pinecone de forma assíncrona para Vercel
const initApp = async () => {
  await initializePinecone();
  return app;
};

// Iniciar servidor sempre (Railway, desenvolvimento, etc)
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  
  // Inicializar serviços
  await initializePinecone();
  
  // Iniciar cron jobs apenas em produção
  if (process.env.NODE_ENV === 'production') {
    cronService.startAllJobs();
  } else {
    console.log('⏰ Cron jobs desabilitados em desenvolvimento');
  }
});

// Para Vercel - export default
export default app;