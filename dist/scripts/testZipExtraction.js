"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zipExtractorAdapter_1 = require("../adapters/zipExtractorAdapter");
async function testZipExtraction() {
    console.log('🧪 Testando funcionalidade de extração de ZIP...');
    const zipExtractor = new zipExtractorAdapter_1.ZipExtractorAdapter();
    // Criar um buffer de exemplo para testar detecção de ZIP
    const mockZipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    const mockPdfBuffer = Buffer.from('%PDF-1.4\n%Sample PDF');
    console.log('1. Testando detecção de arquivo ZIP:');
    console.log(`   ZIP detectado: ${zipExtractorAdapter_1.ZipExtractorAdapter.isZipFile(mockZipBuffer)}`);
    console.log(`   PDF detectado como ZIP: ${zipExtractorAdapter_1.ZipExtractorAdapter.isZipFile(mockPdfBuffer)}`);
    console.log('2. Testando mimeType detection:');
    const testFilenames = [
        'edital.pdf',
        'documento.doc',
        'anexo.docx',
        'termo.txt',
        'arquivo'
    ];
    testFilenames.forEach(filename => {
        const mimetype = zipExtractor.getMimeTypeFromFilename(filename);
        console.log(`   ${filename} -> ${mimetype}`);
    });
    console.log('3. Testando detecção de documento:');
    const testFiles = [
        'edital.pdf',
        'planilha.xlsx',
        'documento.doc',
        'foto.jpg',
        'video.mp4'
    ];
    testFiles.forEach(filename => {
        const isDocument = zipExtractor.isDocumentFile(filename);
        console.log(`   ${filename} -> ${isDocument ? 'DOCUMENTO' : 'ignorar'}`);
    });
    console.log('✅ Teste de funcionalidade concluído!');
}
testZipExtraction().catch(console.error);
