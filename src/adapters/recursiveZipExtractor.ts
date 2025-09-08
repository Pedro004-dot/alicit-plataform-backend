import * as yauzl from 'yauzl';

export interface ExtractedDocument {
  filename: string;
  path: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
  parentZip?: string;
  level: number;
}

export interface DocumentExtractionResult {
  documents: ExtractedDocument[];
  totalFiles: number;
  nestedLevels: number;
}


export class RecursiveZipExtractor {
  private maxDepth = 5;
  private extractedFiles: ExtractedDocument[] = [];

  async extractAllDocuments(
    buffer: Buffer,
    filename: string,
    level: number = 0,
    parentPath: string = ""
  ): Promise<DocumentExtractionResult> {
    
    this.extractedFiles = [];
    
    if (level > this.maxDepth) {
      console.warn(`⚠️ Máximo nível de aninhamento atingido: ${level}`);
      return { documents: [], totalFiles: 0, nestedLevels: level };
    }

    if (!this.isZipFile(buffer)) {
      const document = this.createExtractedDocument(buffer, filename, level, parentPath);
      return { documents: [document], totalFiles: 1, nestedLevels: level };
    }

    console.log(`📦 Processando ZIP nível ${level}: ${filename}`);
    await this.processZipRecursively(buffer, filename, level, parentPath);

    return {
      documents: this.extractedFiles,
      totalFiles: this.extractedFiles.length,
      nestedLevels: level
    };
  }

  private async processZipRecursively(
    zipBuffer: Buffer,
    filename: string,
    level: number,
    parentPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new Error(`Erro ao abrir ZIP ${filename}: ${err.message}`));
          return;
        }

        if (!zipfile) {
          reject(new Error(`ZIP ${filename} está vazio ou corrompido`));
          return;
        }

        console.log(`📂 ZIP nível ${level} aberto: ${zipfile.entryCount} entradas`);
        
        let processedEntries = 0;
        const totalEntries = zipfile.entryCount;

        zipfile.readEntry();

        zipfile.on('entry', async (entry: any) => {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
            return;
          }

          if (!this.isProcessableFile(entry.fileName)) {
            console.log(`⏭️ Pulando arquivo não-processável: ${entry.fileName}`);
            zipfile.readEntry();
            return;
          }

          console.log(`📄 Extraindo nível ${level}: ${entry.fileName}`);

          zipfile.openReadStream(entry, async (err: any, readStream: any) => {
            if (err) {
              console.warn(`⚠️ Erro ao ler ${entry.fileName}: ${err.message}`);
              processedEntries++;
              if (processedEntries === totalEntries) {
                resolve();
              } else {
                zipfile.readEntry();
              }
              return;
            }

            const chunks: Buffer[] = [];
            readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            
            readStream.on('end', async () => {
              const buffer = Buffer.concat(chunks);
              const currentPath = parentPath ? `${parentPath}/${filename}` : filename;

              try {
                if (this.isZipFile(buffer)) {
                  console.log(`📦 ZIP aninhado encontrado: ${entry.fileName}`);
                  await this.processZipRecursively(buffer, entry.fileName, level + 1, currentPath);
                } else if (this.isDocumentFile(entry.fileName)) {
                  console.log(`📄 Documento extraído: ${entry.fileName}`);
                  const document = this.createExtractedDocument(
                    buffer, 
                    entry.fileName, 
                    level + 1, 
                    currentPath
                  );
                  this.extractedFiles.push(document);
                } else {
                  console.log(`⚠️ Arquivo não-documento ignorado: ${entry.fileName}`);
                }

                processedEntries++;
                console.log(`📊 Processados ${processedEntries}/${totalEntries} arquivos`);
                
                if (processedEntries === totalEntries) {
                  console.log(`✅ Todos os ${totalEntries} arquivos do ZIP processados`);
                  resolve();
                } else {
                  zipfile.readEntry();
                }
              } catch (error) {
                console.error(`❌ Erro ao processar ${entry.fileName}:`, error);
                processedEntries++;
                if (processedEntries === totalEntries) {
                  resolve();
                } else {
                  zipfile.readEntry();
                }
              }
            });

            readStream.on('error', (err: any) => {
              console.warn(`⚠️ Erro no stream de ${entry.fileName}: ${err.message}`);
              processedEntries++;
              if (processedEntries === totalEntries) {
                resolve();
              } else {
                zipfile.readEntry();
              }
            });
          });
        });

        zipfile.on('end', () => {
          if (processedEntries === 0) {
            resolve();
          }
        });

        zipfile.on('error', (err: any) => {
          reject(new Error(`Erro durante extração do ZIP: ${err.message}`));
        });
      });
    });
  }

  private createExtractedDocument(
    buffer: Buffer,
    filename: string,
    level: number,
    parentPath: string
  ): ExtractedDocument {
    return {
      filename,
      path: parentPath,
      buffer,
      mimetype: this.getMimeTypeFromFilename(filename),
      size: buffer.length,
      level,
    };
  }


  private isZipFile(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    
    const zipSignatures = [
      [0x50, 0x4B, 0x03, 0x04],
      [0x50, 0x4B, 0x05, 0x06],
      [0x50, 0x4B, 0x07, 0x08],
    ];
    
    const header = Array.from(buffer.subarray(0, 4));
    
    return zipSignatures.some(signature => 
      signature.every((byte, index) => header[index] === byte)
    );
  }

  private isProcessableFile(filename: string): boolean {
    const processableExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xlsx', '.xls', '.zip'];
    const ext = filename.toLowerCase().split('.').pop();
    return ext ? processableExtensions.includes(`.${ext}`) : false;
  }

  private isDocumentFile(filename: string): boolean {
    const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xlsx', '.xls'];
    const ext = filename.toLowerCase().split('.').pop();
    return ext ? documentExtensions.includes(`.${ext}`) : false;
  }

  private getMimeTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel'
    };
    
    return mimeTypes[extension || 'pdf'] || 'application/pdf';
  }
}