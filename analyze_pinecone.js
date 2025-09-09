require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index('alicit-editais');

// Fazer algumas queries com diferentes filtros para entender os tipos de registros
Promise.all([
  // Query geral
  index.query({
    vector: new Array(1536).fill(0.1),
    topK: 100,
    includeValues: false,
    includeMetadata: true
  }),
  
  // Query com outro vetor
  index.query({
    vector: new Array(1536).fill(0.5),
    topK: 100,
    includeValues: false,
    includeMetadata: true
  }),
  
  // Query com outro vetor
  index.query({
    vector: new Array(1536).fill(-0.1),
    topK: 100,
    includeValues: false,
    includeMetadata: true
  })
]).then(results => {
  const allMatches = [];
  results.forEach(result => {
    result.matches.forEach(match => {
      if (!allMatches.find(m => m.id === match.id)) {
        allMatches.push(match);
      }
    });
  });
  
  console.log('📊 ANÁLISE DE TIPOS DE REGISTROS:');
  console.log('Total de amostras únicas:', allMatches.length);
  
  const tipos = {};
  allMatches.forEach(match => {
    let tipo = 'desconhecido';
    if (match.id.startsWith('licitacao:')) {
      tipo = 'licitacao';
    } else if (match.metadata && match.metadata.licitacaoId) {
      tipo = 'edital';
    } else if (match.metadata && match.metadata.documentType) {
      tipo = 'documento-' + match.metadata.documentType;
    } else if (match.id.includes('chunk')) {
      tipo = 'chunk';
    }
    
    tipos[tipo] = (tipos[tipo] || 0) + 1;
  });
  
  console.log('Tipos encontrados:');
  Object.entries(tipos).forEach(([tipo, count]) => {
    console.log('  ' + tipo + ':', count);
  });
  
  console.log('');
  console.log('Primeiros 10 IDs de exemplo:');
  allMatches.slice(0, 10).forEach((match, i) => {
    console.log('  ' + (i+1) + '.', match.id);
  });
  
}).catch(err => console.error('Erro:', err));