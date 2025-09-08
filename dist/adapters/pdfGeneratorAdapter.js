import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownParser } from '../utils/markdownParser';
export class PDFGeneratorAdapter {
    constructor() {
        this.outputDir = path.join(__dirname, '../../reports');
        this.ensureOutputDir();
    }
    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }
    async generateReport(data) {
        try {
            const htmlContent = await this.generateHTML(data);
            const sanitizedLicitacaoId = data.licitacaoId.replace(/[\/\\:*?"<>|]/g, '-');
            const filename = `relatorio_${sanitizedLicitacaoId}_${Date.now()}.pdf`;
            const outputPath = path.join(this.outputDir, filename);
            const dadosPdf = this.extractPdfData(data);
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0'
            });
            await page.pdf({
                path: outputPath,
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 10px;">
            <div style="color: #ff6b35; font-weight: bold;">ALICIT</div>
            <div>Relatório de Análise de Edital - ${data.licitacaoId}</div>
          </div>
        `,
                footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 10px;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span> | 
            Gerado em ${new Date().toLocaleString('pt-BR')} | 
            <span style="color: #ff6b35; font-weight: bold;">ALICIT</span>
          </div>
        `
            });
            await browser.close();
            console.log(`✅ PDF gerado: ${outputPath}`);
            return { pdfPath: outputPath, dadosPdf };
        }
        catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            throw new Error(`Falha na geração do PDF: ${error.message}`);
        }
    }
    async generateHTML(data) {
        // Convertendo logo para base64
        const logoPath = path.join(__dirname, '../../../public/logo192.png');
        let logoBase64 = '';
        try {
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            }
        }
        catch (error) {
            console.warn('⚠️ Logo não encontrada, continuando sem logo');
        }
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Análise de Edital - ${data.licitacaoId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
            color: white;
            padding: 40px;
            margin-bottom: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(255, 107, 53, 0.3);
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: bold;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 10px;
        }
        
        .header img {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #fff8f5;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff6b35;
            border: 1px solid #ffe4dc;
        }
        
        .info-card h3 {
            color: #c63d00;
            font-size: 14px;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-weight: bold;
        }
        
        .info-card p {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        
        .section {
            margin-bottom: 40px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .section-header {
            background: #ff6b35;
            color: white;
            padding: 15px 20px;
            font-size: 18px;
            font-weight: bold;
        }
        
        .section-content {
            padding: 25px;
            line-height: 1.8;
        }
        
        .section-content h4 {
            color: #c63d00;
            margin: 20px 0 10px 0;
            font-size: 16px;
        }
        
        .section-content p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .section-content ul {
            margin: 15px 0;
            padding-left: 20px;
        }
        
        .section-content li {
            margin-bottom: 8px;
        }
        
        .highlight {
            background: #fff4f0;
            padding: 15px;
            border-left: 4px solid #ff6b35;
            margin: 20px 0;
            border-radius: 4px;
            border: 1px solid #ffe4dc;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-completed {
            background: #d1fae5;
            color: #065f46;
        }
        
        .footer {
            margin-top: 40px;
            padding: 20px;
            background: #fff8f5;
            border-radius: 8px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border: 1px solid #ffe4dc;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            .container {
                max-width: none;
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Alicit Logo" style="height: 60px; margin-bottom: 20px;">` : ''}
            <h1>RELATÓRIO DE ANÁLISE DE EDITAL</h1>
            <div class="subtitle">Sistema Automatizado de Análise Licitatória - ALICIT</div>
        </div>
        
        <div class="info-grid">
            <div class="info-card">
                <h3>Licitação</h3>
                <p>${data.licitacaoId}</p>
            </div>
            <div class="info-card">
                <h3>Data da Análise</h3>
                <p>${data.dataAnalise}</p>
            </div>
            <div class="info-card">
                <h3>Empresa Solicitante</h3>
                <p>${data.empresa}</p>
            </div>
            <div class="info-card">
                <h3>Status</h3>
                <p><span class="status-badge status-completed">Concluído</span></p>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                📊 RESUMO EXECUTIVO
            </div>
            <div class="section-content">
                <div class="info-grid">
                    <div>
                        <h4>Documentos Analisados</h4>
                        <p>${data.documentsAnalyzed} documentos</p>
                    </div>
                    <div>
                        <h4>Volume de Dados</h4>
                        <p>${data.totalCharacters.toLocaleString('pt-BR')} caracteres</p>
                    </div>
                </div>
                
                <div class="highlight">
                    <strong>Conclusão:</strong> Análise completa realizada com sucesso pela ALICIT, utilizando 
                    tecnologia de IA avançada para identificação de requisitos técnicos e possíveis irregularidades 
                    em processos licitatórios.
                </div>
            </div>
        </div>
        
        <div class="section page-break">
            <div class="section-header">
                🔍 ANÁLISE TÉCNICA DETALHADA
            </div>
            <div class="section-content">
                ${this.formatMarkdownToHTML(data.technicalSummary)}
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                ⚖️ ANÁLISE DE CONFORMIDADE LEGAL
            </div>
            <div class="section-content">
                ${this.formatMarkdownToHTML(data.impugnacaoAnalysis)}
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                📋 RELATÓRIO COMPLETO
            </div>
            <div class="section-content">
                ${this.formatMarkdownToHTML(data.finalReport)}
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Relatório gerado automaticamente pelo Sistema ALICIT de Análise de Editais</strong></p>
            <p>Este documento foi processado por inteligência artificial e deve ser revisado por especialistas</p>
            <p>© ${new Date().getFullYear()} - <span style="color: #ff6b35; font-weight: bold;">ALICIT</span> - Análise Inteligente de Licitações</p>
        </div>
    </div>
</body>
</html>
    `;
    }
    formatMarkdownToHTML(markdown) {
        return markdown
            // Headers
            .replace(/### (.*)/g, '<h4>$1</h4>')
            .replace(/## (.*)/g, '<h3>$1</h3>')
            .replace(/# (.*)/g, '<h2>$1</h2>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Lists
            .replace(/^- (.*)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraphs
            .replace(/^(.*)$/gm, '<p>$1</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p><br><\/p>/g, '')
            // Emojis and checkmarks
            .replace(/✅/g, '<span style="color: #10b981;">✅</span>')
            .replace(/❌/g, '<span style="color: #ef4444;">❌</span>')
            .replace(/⚠️/g, '<span style="color: #ff6b35;">⚠️</span>')
            .replace(/📋/g, '<span style="color: #ff6b35;">📋</span>')
            .replace(/🔍/g, '<span style="color: #ff6b35;">🔍</span>')
            .replace(/⚖️/g, '<span style="color: #ff6b35;">⚖️</span>')
            .replace(/📊/g, '<span style="color: #ff6b35;">📊</span>');
    }
    getReportsDirectory() {
        return this.outputDir;
    }
    extractPdfData(data) {
        const currentDate = new Date().toISOString();
        const formattedDate = new Date().toLocaleString('pt-BR');
        // Parser do markdown para dados frontend-friendly
        const parser = new MarkdownParser(data.finalReport);
        const dadosFrontend = parser.parseToFrontendFormat(data.documentsAnalyzed, 85, // qualityScore padrão
        30000 // processingTime padrão em ms
        );
        return {
            // Estrutura frontend-friendly (PRINCIPAL)
            dados_frontend: dadosFrontend,
            // Dados para compatibilidade com PDF
            cabecalho: {
                titulo: 'RELATÓRIO DE ANÁLISE DE EDITAL',
                subtitulo: 'Sistema Automatizado de Análise Licitatória - ALICIT',
                logo_alicit: true
            },
            informacoes_basicas: {
                licitacao_id: data.licitacaoId,
                data_analise: data.dataAnalise,
                empresa_solicitante: data.empresa,
                status: 'Concluído',
                data_geracao: currentDate,
                data_geracao_formatada: formattedDate
            },
            resumo_executivo: {
                documentos_analisados: data.documentsAnalyzed,
                volume_dados_caracteres: data.totalCharacters,
                conclusao: dadosFrontend.recomendacao.descricao
            },
            analise_tecnica_detalhada: {
                conteudo_original: data.technicalSummary,
                conteudo_formatado: this.extractStructuredContent(data.technicalSummary)
            },
            analise_conformidade_legal: {
                conteudo_original: data.impugnacaoAnalysis,
                conteudo_formatado: this.extractStructuredContent(data.impugnacaoAnalysis)
            },
            relatorio_completo: {
                conteudo_original: data.finalReport,
                conteudo_formatado: this.extractStructuredContent(data.finalReport)
            },
            rodape: {
                texto_principal: 'Relatório gerado automaticamente pelo Sistema ALICIT de Análise de Editais',
                aviso_legal: 'Este documento foi processado por inteligência artificial e deve ser revisado por especialistas',
                copyright: `© ${new Date().getFullYear()} - ALICIT - Análise Inteligente de Licitações`
            },
            metadados_processamento: {
                versao_sistema: '1.0',
                algoritmo_ia: 'ALICIT-AI',
                timestamp_processamento: currentDate,
                configuracoes_pdf: {
                    formato: 'A4',
                    margens: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
                    background_printing: true,
                    header_footer: true
                }
            }
        };
    }
    extractStructuredContent(content) {
        const sections = [];
        const lines = content.split('\n');
        let currentSection = null;
        let currentContent = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('###')) {
                if (currentSection) {
                    sections.push({
                        tipo: 'secao',
                        titulo: currentSection,
                        conteudo: currentContent.join('\n').trim()
                    });
                }
                currentSection = trimmedLine.replace('###', '').trim();
                currentContent = [];
            }
            else if (trimmedLine.startsWith('##')) {
                if (currentSection) {
                    sections.push({
                        tipo: 'secao',
                        titulo: currentSection,
                        conteudo: currentContent.join('\n').trim()
                    });
                }
                currentSection = trimmedLine.replace('##', '').trim();
                currentContent = [];
            }
            else if (trimmedLine.startsWith('#')) {
                if (currentSection) {
                    sections.push({
                        tipo: 'secao',
                        titulo: currentSection,
                        conteudo: currentContent.join('\n').trim()
                    });
                }
                currentSection = trimmedLine.replace('#', '').trim();
                currentContent = [];
            }
            else if (trimmedLine) {
                currentContent.push(trimmedLine);
            }
        }
        if (currentSection && currentContent.length > 0) {
            sections.push({
                tipo: 'secao',
                titulo: currentSection,
                conteudo: currentContent.join('\n').trim()
            });
        }
        return {
            secoes: sections,
            listas: this.extractLists(content),
            destaques: this.extractHighlights(content),
            checkmarks: this.extractCheckmarks(content),
            texto_completo: content
        };
    }
    extractLists(content) {
        const listRegex = /^- (.+)$/gm;
        const matches = content.match(listRegex);
        return matches ? matches.map(match => match.replace('- ', '').trim()) : [];
    }
    extractHighlights(content) {
        const boldRegex = /\*\*(.*?)\*\*/g;
        const matches = content.match(boldRegex);
        return matches ? matches.map(match => match.replace(/\*\*/g, '').trim()) : [];
    }
    extractCheckmarks(content) {
        const lines = content.split('\n');
        const positivos = lines.filter(line => line.includes('✅')).map(line => line.replace('✅', '').trim());
        const negativos = lines.filter(line => line.includes('❌')).map(line => line.replace('❌', '').trim());
        const avisos = lines.filter(line => line.includes('⚠️')).map(line => line.replace('⚠️', '').trim());
        return { positivos, negativos, avisos };
    }
    async listReports() {
        try {
            const files = fs.readdirSync(this.outputDir);
            return files.filter(file => file.endsWith('.pdf'));
        }
        catch (error) {
            console.error('❌ Erro ao listar relatórios:', error);
            return [];
        }
    }
}
