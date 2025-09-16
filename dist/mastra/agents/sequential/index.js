"use strict";
/**
 * Agentes Especialistas para Workflow Sequencial
 * Arquitetura otimizada para análise progressiva de licitações
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequentialAgents = exports.financialAgent = exports.legalDocAgent = exports.operationalAgent = exports.strategicFitAgent = void 0;
// Agentes do workflow sequencial
var strategicFitAgent_1 = require("./strategicFitAgent");
Object.defineProperty(exports, "strategicFitAgent", { enumerable: true, get: function () { return strategicFitAgent_1.strategicFitAgent; } });
var operationalAgent_1 = require("./operationalAgent");
Object.defineProperty(exports, "operationalAgent", { enumerable: true, get: function () { return operationalAgent_1.operationalAgent; } });
var legalDocAgent_1 = require("./legalDocAgent");
Object.defineProperty(exports, "legalDocAgent", { enumerable: true, get: function () { return legalDocAgent_1.legalDocAgent; } });
var financialAgent_1 = require("./financialAgent");
Object.defineProperty(exports, "financialAgent", { enumerable: true, get: function () { return financialAgent_1.financialAgent; } });
// Re-exportar em objeto para facilitar uso
const strategicFitAgent_2 = require("./strategicFitAgent");
const operationalAgent_2 = require("./operationalAgent");
const legalDocAgent_2 = require("./legalDocAgent");
const financialAgent_2 = require("./financialAgent");
// ✅ AGENTS SIMPLIFICADOS PARA DEBUG
const simpleStrategicAgent_1 = require("../simpleStrategicAgent");
const ultraSimpleAgent_1 = require("../ultraSimpleAgent");
exports.sequentialAgents = {
    strategicFitAgent: strategicFitAgent_2.strategicFitAgent,
    simpleStrategicAgent: simpleStrategicAgent_1.simpleStrategicAgent, // ✅ ADICIONADO para debug
    ultraSimpleAgent: // ✅ ADICIONADO para debug
    ultraSimpleAgent_1.ultraSimpleAgent, // ✅ ULTRA SIMPLES para debug
    operationalAgent: // ✅ ULTRA SIMPLES para debug
    operationalAgent_2.operationalAgent,
    legalDocAgent: legalDocAgent_2.legalDocAgent,
    financialAgent: financialAgent_2.financialAgent,
};
