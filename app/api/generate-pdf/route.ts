import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { htmlContent, fileName } = await request.json();

    // Obtener el logo en base64
    let logoBase64 = '';
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = readFileSync(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    } catch (error) {
      console.error('Error loading logo:', error);
      // Usar SVG fallback
      const svgLogo = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="60" fill="#2c3e50"/>
        <text x="100" y="35" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">ASIF GRUP</text>
      </svg>`;
      logoBase64 = btoa(svgLogo);
    }

    // Reemplazar placeholder del logo con el logo real
    const htmlWithLogo = htmlContent
      .replace(/data:image\/png;base64,[^"]+/g, `data:image/png;base64,${logoBase64}`)
      .replace(/data:image\/svg\+xml;base64,[^"]+/g, `data:image/png;base64,${logoBase64}`);

    // Configuración para Vercel con Chromium
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Lanzar Puppeteer con Chromium para Vercel
    const browser = await puppeteer.launch({
      args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: isProduction ? await chromium.executablePath() : puppeteer.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    
    // Configurar el contenido HTML
    await page.setContent(htmlWithLogo, {
      waitUntil: 'networkidle0'
    });

    // Generar el PDF con márgenes optimizados (1cm como se configuró antes)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; color: #666; width: 100%; text-align: center; margin-top: 10px;">
          <span>Este certificado ha sido generado automáticamente por el sistema de gestión de ASIF GRUP.</span><br>
          <span>Generado el ${new Date().toLocaleDateString('es-ES')}</span><br>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `
    });

    await browser.close();

    // Devolver el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    );
  }
} 
 
 