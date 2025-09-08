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

const app = express();
const PORT = 3002;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Servidor rodando!' });
});

app.use('/licitacoes', licitacaoRoutes);
app.use('/licitacoes-documentos', licitacaoDocumentosRoutes);
app.use('/edital', editalAnalysisRoutes);
app.use('/relatorios', relatoriosRoutes);
app.use('/empresa', empresaRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);

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

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await initializePinecone();
});