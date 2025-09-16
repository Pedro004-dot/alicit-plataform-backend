"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastraTools = exports.sequentialAgents = exports.mastra = void 0;
const mastra_1 = require("@mastra/core/mastra");
// Importar arquitetura sequencial limpa
const sequential_1 = require("./agents/sequential");
const workflow_1 = require("./workflows/workflow");
const vectorStore_1 = require("./config/vectorStore");
/**
 * Instância principal do Mastra com arquitetura sequencial
 * Sistema otimizado para análise progressiva de licitações
 * Configuração otimizada para Vercel serverless (sem storage persistente)
 */
exports.mastra = new mastra_1.Mastra({
    agents: {
        ...sequential_1.sequentialAgents,
    },
    workflows: {
        workflow: workflow_1.workflow,
    },
    vectors: {
        pinecone: vectorStore_1.pineconeVectorStore,
    },
});
// Inicializar Pinecone Index na primeira execução
(0, vectorStore_1.initializePineconeIndex)().then(success => {
    if (success) {
        console.log('✅ Vector search habilitado');
    }
    else {
        console.log('⚠️ Vector search desabilitado');
    }
}).catch(console.error);
// Re-exportar componentes principais para facilitar uso
var sequential_2 = require("./agents/sequential");
Object.defineProperty(exports, "sequentialAgents", { enumerable: true, get: function () { return sequential_2.sequentialAgents; } });
var tools_1 = require("./tools");
Object.defineProperty(exports, "mastraTools", { enumerable: true, get: function () { return tools_1.mastraTools; } });
