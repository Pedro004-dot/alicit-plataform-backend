/**
 * Tipos para chunking hierárquico de editais
 */

// Tipos básicos mantidos para compatibilidade se necessário
export interface HierarchicalSection {
  id: string;
  title: string;
  content: string;
  depth: number;
  parent: string | null;
  path: string;
  criticality: number;
  type: 'titulo' | 'item' | 'subitem' | 'prosa';
  startPos: number;
  endPos: number;
}

// Interfaces específicas para HierarchicalChunker podem ser adicionadas aqui no futuro
export interface ProtoChunkMetadata {
  hierarchyPath: string;
  pages: number[];
  protoChunkCount: number;
  originalSize: number;
  finalSize: number;
}