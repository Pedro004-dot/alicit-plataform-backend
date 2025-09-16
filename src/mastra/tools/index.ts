// Tools essenciais
export { queryEditalDatabase } from "./queryEditalTool";
export { summarizeText } from "./summarizeTextTool";
export { extractDatesFromText } from "./extractDatesTool";
export { getCurrentDate } from "./getCurrentDateTool";

// Tools para workflow sequencial
export { updateWorkingMemory } from "./updateWorkingMemoryTool";
export { extractLegalData } from "./extractLegalDataTool";
export { extractFinancialData } from "./extractFinancialDataTool";
export { compareDocuments } from "./compareDocumentsTool";

// Tools para integração externa
export { supabaseEmpresa } from "./supabaseEmpresaTool";
export { 
  pineconeLicitacao,
  extractObjetoLicitacao,
  extractDadosFinanceirosLicitacao 
} from "./pineconeLicitacaoTool";

// Vector Query Tools específicas por agente (Mastra RAG)
export { 
  strategicVectorTool,
  operationalVectorTool, 
  legalVectorTool,
  financialVectorTool
} from "./vectorQueryTools";

// Re-exportar todas as tools em um objeto para facilitar uso
import { queryEditalDatabase } from "./queryEditalTool";
import { summarizeText } from "./summarizeTextTool";
import { extractDatesFromText } from "./extractDatesTool";
import { getCurrentDate } from "./getCurrentDateTool";
import { updateWorkingMemory } from "./updateWorkingMemoryTool";
import { extractLegalData } from "./extractLegalDataTool";
import { extractFinancialData } from "./extractFinancialDataTool";
import { compareDocuments } from "./compareDocumentsTool";
import { supabaseEmpresa } from "./supabaseEmpresaTool";
import { 
  pineconeLicitacao,
  extractObjetoLicitacao,
  extractDadosFinanceirosLicitacao 
} from "./pineconeLicitacaoTool";
import { 
  strategicVectorTool,
  operationalVectorTool,
  legalVectorTool,
  financialVectorTool
} from "./vectorQueryTools";

export const mastraTools = {
  // Tools Essenciais
  queryEditalDatabase,
  summarizeText,
  extractDatesFromText,
  getCurrentDate,
  
  // Workflow Sequencial
  updateWorkingMemory,
  extractLegalData,
  extractFinancialData,
  compareDocuments,
  
  // Integração Externa
  supabaseEmpresa,
  pineconeLicitacao,
  extractObjetoLicitacao,
  extractDadosFinanceirosLicitacao,
  
  // Vector Query Tools (Mastra RAG)
  strategicVectorTool,
  operationalVectorTool,
  legalVectorTool,
  financialVectorTool,
} as const;

export type MastraToolsType = typeof mastraTools;