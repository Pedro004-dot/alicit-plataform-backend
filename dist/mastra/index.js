"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastraTools = exports.sequentialWorkflowMemory = exports.sequentialAnalysisWorkflow = exports.sequentialAgents = exports.mastra = void 0;
const mastra_1 = require("@mastra/core/mastra");
const pg_1 = require("@mastra/pg");
// Importar arquitetura sequencial limpa
const sequential_1 = require("./agents/sequential");
const sequentialAnalysisWorkflowSimplified_1 = require("./workflows/sequentialAnalysisWorkflowSimplified");
/**
 * Instância principal do Mastra com arquitetura sequencial
 * Sistema otimizado para análise progressiva de licitações
 * Com PostgreSQL storage oficial do Mastra
 */
exports.mastra = new mastra_1.Mastra({
    agents: {
        ...sequential_1.sequentialAgents,
    },
    workflows: {
        sequentialAnalysisWorkflow: sequentialAnalysisWorkflowSimplified_1.sequentialAnalysisWorkflow,
    },
    // PostgreSQL storage oficial do Mastra
    ...(process.env.DATABASE_URL ? {
        storage: new pg_1.PostgresStore({
            connectionString: process.env.DATABASE_URL,
        })
    } : {})
});
// Re-exportar componentes principais para facilitar uso
var sequential_2 = require("./agents/sequential");
Object.defineProperty(exports, "sequentialAgents", { enumerable: true, get: function () { return sequential_2.sequentialAgents; } });
var sequentialAnalysisWorkflowSimplified_2 = require("./workflows/sequentialAnalysisWorkflowSimplified");
Object.defineProperty(exports, "sequentialAnalysisWorkflow", { enumerable: true, get: function () { return sequentialAnalysisWorkflowSimplified_2.sequentialAnalysisWorkflow; } });
var memoryConfig_1 = require("./config/memoryConfig");
Object.defineProperty(exports, "sequentialWorkflowMemory", { enumerable: true, get: function () { return memoryConfig_1.sequentialWorkflowMemory; } });
var tools_1 = require("./tools");
Object.defineProperty(exports, "mastraTools", { enumerable: true, get: function () { return tools_1.mastraTools; } });
