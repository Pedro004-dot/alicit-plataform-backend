"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastraTools = exports.extractDadosFinanceirosLicitacao = exports.extractObjetoLicitacao = exports.pineconeLicitacao = exports.supabaseEmpresa = exports.compareDocuments = exports.extractFinancialData = exports.extractLegalData = exports.updateWorkingMemory = exports.getCurrentDate = exports.extractDatesFromText = exports.summarizeText = exports.queryEditalDatabase = void 0;
// Tools essenciais
var queryEditalTool_1 = require("./queryEditalTool");
Object.defineProperty(exports, "queryEditalDatabase", { enumerable: true, get: function () { return queryEditalTool_1.queryEditalDatabase; } });
var summarizeTextTool_1 = require("./summarizeTextTool");
Object.defineProperty(exports, "summarizeText", { enumerable: true, get: function () { return summarizeTextTool_1.summarizeText; } });
var extractDatesTool_1 = require("./extractDatesTool");
Object.defineProperty(exports, "extractDatesFromText", { enumerable: true, get: function () { return extractDatesTool_1.extractDatesFromText; } });
var getCurrentDateTool_1 = require("./getCurrentDateTool");
Object.defineProperty(exports, "getCurrentDate", { enumerable: true, get: function () { return getCurrentDateTool_1.getCurrentDate; } });
// Tools para workflow sequencial
var updateWorkingMemoryTool_1 = require("./updateWorkingMemoryTool");
Object.defineProperty(exports, "updateWorkingMemory", { enumerable: true, get: function () { return updateWorkingMemoryTool_1.updateWorkingMemory; } });
var extractLegalDataTool_1 = require("./extractLegalDataTool");
Object.defineProperty(exports, "extractLegalData", { enumerable: true, get: function () { return extractLegalDataTool_1.extractLegalData; } });
var extractFinancialDataTool_1 = require("./extractFinancialDataTool");
Object.defineProperty(exports, "extractFinancialData", { enumerable: true, get: function () { return extractFinancialDataTool_1.extractFinancialData; } });
var compareDocumentsTool_1 = require("./compareDocumentsTool");
Object.defineProperty(exports, "compareDocuments", { enumerable: true, get: function () { return compareDocumentsTool_1.compareDocuments; } });
// Tools para integração externa
var supabaseEmpresaTool_1 = require("./supabaseEmpresaTool");
Object.defineProperty(exports, "supabaseEmpresa", { enumerable: true, get: function () { return supabaseEmpresaTool_1.supabaseEmpresa; } });
var pineconeLicitacaoTool_1 = require("./pineconeLicitacaoTool");
Object.defineProperty(exports, "pineconeLicitacao", { enumerable: true, get: function () { return pineconeLicitacaoTool_1.pineconeLicitacao; } });
Object.defineProperty(exports, "extractObjetoLicitacao", { enumerable: true, get: function () { return pineconeLicitacaoTool_1.extractObjetoLicitacao; } });
Object.defineProperty(exports, "extractDadosFinanceirosLicitacao", { enumerable: true, get: function () { return pineconeLicitacaoTool_1.extractDadosFinanceirosLicitacao; } });
// Re-exportar todas as tools em um objeto para facilitar uso
const queryEditalTool_2 = require("./queryEditalTool");
const summarizeTextTool_2 = require("./summarizeTextTool");
const extractDatesTool_2 = require("./extractDatesTool");
const getCurrentDateTool_2 = require("./getCurrentDateTool");
const updateWorkingMemoryTool_2 = require("./updateWorkingMemoryTool");
const extractLegalDataTool_2 = require("./extractLegalDataTool");
const extractFinancialDataTool_2 = require("./extractFinancialDataTool");
const compareDocumentsTool_2 = require("./compareDocumentsTool");
const supabaseEmpresaTool_2 = require("./supabaseEmpresaTool");
const pineconeLicitacaoTool_2 = require("./pineconeLicitacaoTool");
exports.mastraTools = {
    // Tools Essenciais
    queryEditalDatabase: queryEditalTool_2.queryEditalDatabase,
    summarizeText: summarizeTextTool_2.summarizeText,
    extractDatesFromText: extractDatesTool_2.extractDatesFromText,
    getCurrentDate: getCurrentDateTool_2.getCurrentDate,
    // Workflow Sequencial
    updateWorkingMemory: updateWorkingMemoryTool_2.updateWorkingMemory,
    extractLegalData: extractLegalDataTool_2.extractLegalData,
    extractFinancialData: extractFinancialDataTool_2.extractFinancialData,
    compareDocuments: compareDocumentsTool_2.compareDocuments,
    // Integração Externa
    supabaseEmpresa: supabaseEmpresaTool_2.supabaseEmpresa,
    pineconeLicitacao: pineconeLicitacaoTool_2.pineconeLicitacao,
    extractObjetoLicitacao: pineconeLicitacaoTool_2.extractObjetoLicitacao,
    extractDadosFinanceirosLicitacao: pineconeLicitacaoTool_2.extractDadosFinanceirosLicitacao,
};
