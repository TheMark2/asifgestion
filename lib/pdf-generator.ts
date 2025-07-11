import { ContratoAlquiler, Inquilino, Propietario, Vivienda } from './types';

// Función para obtener el logo en base64
async function getLogoBase64(): Promise<string> {
  try {
    const response = await fetch('/api/logo');
    const data = await response.json();
    return data.logo.split(',')[1]; // Remover el prefijo data:image/png;base64,
  } catch (error) {
    console.error('Error loading logo:', error);
    // Fallback a logo SVG simple
    const svgLogo = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="60" fill="#2c3e50"/>
      <text x="100" y="35" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">ASIF GRUP</text>
    </svg>`;
    return btoa(svgLogo);
  }
}

function getLogoBase64Sync(): string {
  // Logo SVG simple para uso sincrónico
  const svgLogo = `<svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="60" fill="#2c3e50"/>
    <text x="100" y="35" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">ASIF GRUP</text>
  </svg>`;
  return btoa(svgLogo);
}

export interface ReciboData {
  contrato: ContratoAlquiler;
  inquilinos: Inquilino[];
  propietario: Propietario;
  vivienda: Vivienda;
  mes: string;
  año: number;
  numeroRecibo: string;
  gastos: Array<{
    concepto: string;
    importe: number;
  }>;
  totalGastos: number;
  totalConGastos: number;
}

// Interfaz para mantener compatibilidad con código existente
export interface ReciboPreview {
  numero_recibo: string;
  fecha_emision: Date;
  contrato_id: string;
  meses_seleccionados: Array<{
    mes: number;
    anio: number;
    nombre_mes: string;
    es_atrasado: boolean;
  }>;
  contrato: {
    id: string;
    importe_alquiler_mensual: number;
    viviendas: {
      id: string;
      direccion_completa: string;
      propietarios: {
        nombre_completo: string;
        dni_cif: string;
        telefono?: string;
        email?: string;
        porcentaje_gestion: number;
      };
    };
    inquilinos: Array<{
      id: string;
      nombre_completo: string;
      dni: string;
      telefono?: string;
      email?: string;
    }>;
  };
  gastos_adicionales?: Array<{
    concepto: string;
    importe: number;
  }>;
  totales: {
    importe_total_bruto: number;
    importe_total_neto: number;
  };
  totales_con_gastos?: {
    importe_neto_final: number;
    total_gastos_adicionales: number;
  };
  forma_pago: string;
  referencia_pago: string;
  observaciones: string;
}

function formatearFecha(fecha: Date): string {
  const opciones: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return fecha.toLocaleDateString('es-ES', opciones);
}

function formatearMes(mes: string): string {
  const meses: { [key: string]: string } = {
    'enero': 'Enero', 'febrero': 'Febrero', 'marzo': 'Marzo', 'abril': 'Abril',
    'mayo': 'Mayo', 'junio': 'Junio', 'julio': 'Julio', 'agosto': 'Agosto',
    'septiembre': 'Septiembre', 'octubre': 'Octubre', 'noviembre': 'Noviembre', 'diciembre': 'Diciembre'
  };
  return meses[mes.toLowerCase()] || mes;
}

function generarHTMLRecibo(data: ReciboData): string {
  const fechaActual = formatearFecha(new Date());
  const mesFormateado = formatearMes(data.mes);
  
  // Calcular importes de gestión - acceso defensivo
  const importeBruto = data.contrato.importe_alquiler_mensual;
  const porcentajeGestion = data.propietario?.porcentaje_gestion || 0;
  const importeGestion = (importeBruto * porcentajeGestion) / 100;
  const ivaGestion = importeGestion * 0.21;
  const importeNeto = importeBruto - importeGestion - ivaGestion;
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Alquiler ${data.numeroRecibo}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          page-break-inside: avoid;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .logo {
          margin-bottom: 15px;
        }
        
        .logo img {
          height: 40px;
          width: auto;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #333;
        }
        
        .header .numero {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .info-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .info-box {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 4px;
          background: #f9f9f9;
          page-break-inside: avoid;
        }
        
        .info-box h3 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .info-label {
          font-weight: bold;
          color: #555;
        }
        
        .info-value {
          color: #333;
        }
        
        .recibido-section {
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-left: 4px solid #333;
          page-break-inside: avoid;
        }
        
        .recibido-text {
          font-size: 11px;
          line-height: 1.5;
          color: #555;
          margin-bottom: 15px;
        }
        
        .detalles-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .detalles-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .detalles-table th,
        .detalles-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        
        .detalles-table th {
          background: #f5f5f5;
          font-weight: bold;
          color: #333;
        }
        
        .detalles-table .number {
          text-align: right;
        }
        
        .gastos-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .gastos-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .gastos-table th,
        .gastos-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        .gastos-table th {
          background: #f5f5f5;
          font-weight: bold;
          color: #333;
        }
        
        .gastos-table .number {
          text-align: right;
        }
        
        .total-section {
          border: 2px solid #333;
          padding: 15px;
          background: #f8f9fa;
          text-align: center;
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .total-section h3 {
          font-size: 18px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .total-amount {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          page-break-inside: avoid;
        }
        
        .inquilinos-list {
          margin-bottom: 10px;
        }
        
        .inquilino-item {
          margin-bottom: 8px;
          padding: 8px;
          background: #f9f9f9;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        
        .page-number {
          position: fixed;
          bottom: 20px;
          right: 50%;
          transform: translateX(50%);
          font-size: 10px;
          color: #666;
        }
        
        @media print {
          .container {
            max-width: none;
            margin: 0;
            padding: 15px;
          }
          
          body {
            font-size: 11px;
          }
          
          .header h1 {
            font-size: 20px;
          }
          
          .total-section h3 {
            font-size: 16px;
          }
          
          .total-amount {
            font-size: 20px;
          }
          
          .page-number {
            display: block;
          }
        }
        
        @page {
          margin: 2cm;
          @bottom-center {
            content: "Página " counter(page) " de " counter(pages);
            font-size: 10px;
            color: #666;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="data:image/png;base64,${getLogoBase64Sync()}" alt="Logo" />
          </div>
          <h1>RECIBO DE ALQUILER</h1>
          <div class="numero">Número: ${data.numeroRecibo}</div>
          <div>Fecha: ${fechaActual}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>PROPIETARIO</h3>
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">${data.propietario?.nombre_completo || 'Por determinar'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">DNI/CIF:</span>
              <span class="info-value">${data.propietario?.dni_cif || 'Por determinar'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span class="info-value">${data.propietario?.telefono || 'No disponible'}</span>
            </div>
          </div>
          
          <div class="info-box">
            <h3>VIVIENDA</h3>
            <div class="info-row">
              <span class="info-label">Dirección:</span>
              <span class="info-value">${data.vivienda?.direccion_completa || 'Por determinar'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Periodo:</span>
              <span class="info-value">${mesFormateado} ${data.año}</span>
            </div>
          </div>
        </div>
        
        <div class="info-section">
          <h3 style="margin-bottom: 10px; color: #333;">INQUILINOS</h3>
          <div class="inquilinos-list">
            ${data.inquilinos.map(inquilino => `
              <div class="inquilino-item">
                <strong>${inquilino.nombre_completo}</strong> - DNI: ${inquilino.dni}
                ${inquilino.telefono ? `<br>Teléfono: ${inquilino.telefono}` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="recibido-section">
          <div class="recibido-text">
            He recibido de D. Antonia Pedragosa Vernet, con DNI 52144987P, y domicilio C/Travessia, 18, 08182, Sant Feliu de Codines, Barcelona, las siguientes cantidades:
          </div>
        </div>
        
        <div class="detalles-section">
          <h3 style="margin-bottom: 10px; color: #333;">DETALLE DE CANTIDADES RECIBIDAS</h3>
          <table class="detalles-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Período</th>
                <th class="number">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alquiler bruto</td>
                <td>${mesFormateado} ${data.año}</td>
                <td class="number">${importeBruto.toFixed(2)} €</td>
              </tr>
              <tr>
                <td>Gastos de gestión (${porcentajeGestion}%)</td>
                <td>${mesFormateado} ${data.año}</td>
                <td class="number">-${importeGestion.toFixed(2)} €</td>
              </tr>
              <tr>
                <td>IVA gestión (21%)</td>
                <td>${mesFormateado} ${data.año}</td>
                <td class="number">-${ivaGestion.toFixed(2)} €</td>
              </tr>
              <tr style="font-weight: bold; background: #f0f0f0;">
                <td>TOTAL NETO PROPIETARIO</td>
                <td>${mesFormateado} ${data.año}</td>
                <td class="number">${importeNeto.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        ${data.gastos.length > 0 ? `
        <div class="gastos-section">
          <h3 style="margin-bottom: 10px; color: #333;">GASTOS ADICIONALES</h3>
          <table class="gastos-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th class="number">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${data.gastos.map(gasto => `
                <tr>
                  <td>${gasto.concepto}</td>
                  <td class="number">-${gasto.importe.toFixed(2)} €</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background: #f5f5f5;">
                <td>TOTAL GASTOS ADICIONALES</td>
                <td class="number">-${data.totalGastos.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div class="total-section">
          <h3>TOTAL RECIBIDO POR EL PROPIETARIO</h3>
          <div class="total-amount">${(importeNeto - data.totalGastos).toFixed(2)} €</div>
        </div>
        
        <div class="footer">
          <p>Este certificado ha sido generado automáticamente por el sistema de gestión de ASIF GRUP.</p>
          <p>Generado el ${fechaActual}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Función para convertir ReciboPreview a ReciboData
function convertirPreviewAData(preview: ReciboPreview): ReciboData {
  const primerMes = preview.meses_seleccionados[0];
  const mesNombre = primerMes.nombre_mes.toLowerCase();
  
  return {
    contrato: {
      id: preview.contrato.id,
      vivienda_id: preview.contrato.viviendas.id,
      fecha_inicio_contrato: '',
      importe_alquiler_mensual: preview.contrato.importe_alquiler_mensual,
      activo: true,
      created_at: '',
      updated_at: ''
    },
    inquilinos: preview.contrato.inquilinos.map((inquilino: any) => ({
      id: inquilino.id,
      nombre_completo: inquilino.nombre_completo,
      dni: inquilino.dni,
      telefono: inquilino.telefono,
      email: inquilino.email,
      created_at: '',
      updated_at: ''
    })),
    propietario: {
      id: '',
      nombre_completo: preview.contrato.viviendas.propietarios.nombre_completo,
      dni_cif: preview.contrato.viviendas.propietarios.dni_cif,
      telefono: preview.contrato.viviendas.propietarios.telefono,
      email: preview.contrato.viviendas.propietarios.email,
      porcentaje_gestion: preview.contrato.viviendas.propietarios.porcentaje_gestion,
      created_at: '',
      updated_at: ''
    },
    vivienda: {
      id: preview.contrato.viviendas.id,
      propietario_id: '',
      direccion_completa: preview.contrato.viviendas.direccion_completa,
      created_at: '',
      updated_at: ''
    },
    mes: mesNombre,
    año: primerMes.anio,
    numeroRecibo: preview.numero_recibo,
    gastos: preview.gastos_adicionales?.map((g: any) => ({
      concepto: g.concepto || g.tipo_gasto || 'Gasto',
      importe: g.importe
    })) || [],
    totalGastos: preview.totales_con_gastos?.total_gastos_adicionales || 0,
    totalConGastos: preview.totales_con_gastos?.importe_neto_final || preview.totales.importe_total_neto
  };
}

export async function generarPDFRecibo(data: ReciboData): Promise<void> {
  try {
    const htmlContent = generarHTMLRecibo(data);
    const inquilinosNombres = data.inquilinos.map(i => i.nombre_completo).join('_');
    const fileName = `recibo_${data.numeroRecibo}_${inquilinosNombres.replace(/[^a-zA-Z0-9]/g, '_')}_${data.mes}_${data.año}.pdf`;
    
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent,
        fileName
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al generar el PDF');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
}

// Función para generar PDF de recibo desde ReciboData
export async function generateReceiptPdf(data: ReciboData): Promise<Blob> {
  const htmlContent = generarHTMLRecibo(data);
  const fileName = `recibo-${data.numeroRecibo}-${data.inquilinos.map(i => i.nombre_completo.replace(/\s+/g, '-')).join('-')}.pdf`;
  
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      htmlContent,
      fileName,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al generar el PDF');
  }

  return response.blob();
}

// Función para generar PDF de recibo desde ReciboPreview
export async function generateReceiptPdfFromPreview(preview: ReciboPreview): Promise<Blob> {
  const data = convertirPreviewAData(preview);
  return generateReceiptPdf(data);
}

// Función para generar PDF de certificado anual
export async function generateCertificateAnnualPdf(data: any): Promise<Blob> {
  const htmlContent = generarHTMLCertificadoAnual(data);
  const fileName = `certificado-anual-${data.propietario?.nombre_completo?.replace(/\s+/g, '-') || 'propietario'}-${data.anio}.pdf`;
  
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      htmlContent,
      fileName,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al generar el PDF');
  }

  return response.blob();
}

export async function generarPDFsMultiples(recibos: ReciboData[]): Promise<void> {
  try {
    for (const recibo of recibos) {
      await generarPDFRecibo(recibo);
      // Pequeña pausa entre descargas para evitar problemas del navegador
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error generando PDFs múltiples:', error);
    throw error;
  }
}

function generarHTMLCertificadoAnual(data: any): string {
  const fechaActual = formatearFecha(new Date());
  const anio = data.anio || new Date().getFullYear();
  
  // Asegurar que tenemos los datos necesarios
  const propietario = data.propietario || {};
  const totales = data.totales || {
    total_ingresos_brutos: 0,
    total_gastos_gestion: 0,
    total_iva_gestion: 0,
    total_ingresos_netos: 0,
    numero_viviendas: 0,
    numero_contratos: 0,
    porcentaje_gestion_promedio: 0
  };
  const viviendas = data.viviendas || [];
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado Anual ${anio}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          background: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
          flex: 1;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .logo {
          margin-bottom: 15px;
        }
        
        .logo img {
          height: 40px;
          width: auto;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }
        
        .header .anio {
          font-size: 18px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .info-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .info-box {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 4px;
          background: #f9f9f9;
          page-break-inside: avoid;
        }
        
        .info-box h3 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .info-label {
          font-weight: bold;
          color: #555;
        }
        
        .info-value {
          color: #333;
        }
        
        .certifico-section {
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-left: 4px solid #333;
          page-break-inside: avoid;
        }
        
        .certifico-text {
          font-size: 12px;
          line-height: 1.6;
          color: #555;
          margin-bottom: 15px;
          text-align: justify;
        }
        
        .detalles-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .detalles-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        
        .detalles-table th,
        .detalles-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        
        .detalles-table th {
          background: #f5f5f5;
          font-weight: bold;
          color: #000;
        }
        
        .detalles-table .number {
          text-align: right;
        }
        
        .total-section {
          border: 2px solid #333;
          padding: 15px;
          background: #f8f9fa;
          text-align: center;
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .total-section h3 {
          font-size: 18px;
          margin-bottom: 10px;
          color: #000;
        }
        
        .total-amount {
          font-size: 24px;
          font-weight: bold;
          color: #000;
        }
        
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 11px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          page-break-inside: avoid;
          min-height: 60px;
        }
        
        .footer p {
          margin-bottom: 5px;
        }
        
        .empresa-contacto {
          margin-top: 20px;
          text-align: center;
          font-size: 10px;
          color: #888;
          padding: 10px;
          border: 1px solid #ddd;
          background: #f9f9f9;
          border-radius: 4px;
        }
        
        .empresa-contacto p {
          margin-bottom: 2px;
        }
        
        @media print {
          .container {
            max-width: none;
            margin: 0;
            padding: 15px;
          }
          
          body {
            font-size: 11px;
          }
          
          .header h1 {
            font-size: 20px;
          }
          
          .total-section h3 {
            font-size: 16px;
          }
          
          .total-amount {
            font-size: 20px;
          }
          
          .footer {
            page-break-inside: avoid;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
          }
        }
        
        @page {
          margin: 2cm;
          @bottom-center {
            content: "Página " counter(page) " de " counter(pages);
            font-size: 10px;
            color: #666;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="data:image/svg+xml;base64,${getLogoBase64Sync()}" alt="ASIF GRUP Logo" />
          </div>
          <h1>CERTIFICADO ANUAL DE RENTAS</h1>
          <div class="anio">Ejercicio ${anio}</div>
          <div>Fecha de emisión: ${fechaActual}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>PROPIETARIO</h3>
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">${propietario.nombre_completo || 'Por determinar'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">DNI/CIF:</span>
              <span class="info-value">${propietario.dni_cif || 'Por determinar'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dirección:</span>
              <span class="info-value">${propietario.direccion || 'Por determinar'}</span>
            </div>
          </div>
          
          <div class="info-box">
            <h3>DATOS DEL CERTIFICADO</h3>
            <div class="info-row">
              <span class="info-label">Ejercicio:</span>
              <span class="info-value">${anio}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Número de propiedades:</span>
              <span class="info-value">${totales.numero_viviendas}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Período:</span>
              <span class="info-value">01/01/${anio} - 31/12/${anio}</span>
            </div>
          </div>
        </div>
        
        <div class="certifico-section">
          <div class="certifico-text">
            <strong>CERTIFICO:</strong> Que D./Dña. <strong>${propietario.nombre_completo || '[NOMBRE PROPIETARIO]'}</strong>, 
            con DNI/CIF <strong>${propietario.dni_cif || '[DNI/CIF]'}</strong>, ha percibido durante el ejercicio ${anio} 
            los siguientes ingresos por el arrendamiento de inmuebles urbanos destinados a vivienda, gestionados por nuestra empresa:
          </div>
        </div>
        
        <div class="detalles-section">
          <h3 style="margin-bottom: 10px; color: #000;">DETALLE DE INGRESOS POR ARRENDAMIENTO</h3>
          <table class="detalles-table">
            <thead>
              <tr>
                <th>Propiedad</th>
                <th>Período</th>
                <th class="number">Ingresos Brutos</th>
                <th class="number">Gastos Gestión</th>
                <th class="number">IVA Gestión</th>
                <th class="number">Ingresos Netos</th>
              </tr>
            </thead>
            <tbody>
              ${viviendas.length > 0 ? viviendas.map((vivienda: any) => `
                <tr>
                  <td>${vivienda.vivienda?.direccion_completa || vivienda.direccion_completa || 'Propiedad'}</td>
                  <td>Enero - Diciembre ${anio}</td>
                  <td class="number">${(vivienda.total_ingresos_brutos || 0).toFixed(2)} €</td>
                  <td class="number">${(vivienda.total_gastos_gestion || 0).toFixed(2)} €</td>
                  <td class="number">${(vivienda.total_iva_gestion || 0).toFixed(2)} €</td>
                  <td class="number">${(vivienda.total_ingresos_netos || 0).toFixed(2)} €</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="text-align: center; color: #666; font-style: italic;">
                    No hay datos de propiedades para mostrar
                  </td>
                </tr>
              `}
              <tr style="font-weight: bold; background: #f0f0f0;">
                <td colspan="2">TOTALES</td>
                <td class="number">${totales.total_ingresos_brutos.toFixed(2)} €</td>
                <td class="number">${totales.total_gastos_gestion.toFixed(2)} €</td>
                <td class="number">${totales.total_iva_gestion.toFixed(2)} €</td>
                <td class="number">${totales.total_ingresos_netos.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="total-section">
          <h3>TOTAL INGRESOS NETOS PERCIBIDOS EN ${anio}</h3>
          <div class="total-amount">${totales.total_ingresos_netos.toFixed(2)} €</div>
        </div>
        
        <div class="certifico-section">
          <div class="certifico-text">
            Este certificado se expide a efectos de cumplimentar la declaración del Impuesto sobre la Renta de las Personas Físicas 
            correspondiente al ejercicio ${anio}, de conformidad con la normativa fiscal vigente.
          </div>
        </div>
        
        <div class="info-section" style="margin-top: 40px;">
          <div class="info-grid">
            <div class="info-box">
              <h3>OBSERVACIONES</h3>
              <p style="font-size: 11px; line-height: 1.4;">
                - Los importes reflejados corresponden a las cantidades efectivamente percibidas.<br>
                - Los gastos de gestión incluyen IVA cuando procede.<br>
                - Este certificado tiene validez fiscal para la declaración de la renta.<br>
                - Para cualquier aclaración, contacte con nuestra oficina.
              </p>
            </div>
            
            <div class="info-box">
              <h3>FIRMA Y SELLO</h3>
              <div style="height: 80px; border: 1px dashed #ccc; margin: 10px 0; display: flex; align-items: center; justify-content: center; color: #999; font-style: italic;">
                Espacio para firma y sello
              </div>
              <p style="text-align: center; font-size: 11px; margin-top: 10px;">
                <strong>Antonia Pedragosa Vernet</strong><br>
                Administradora de Fincas
              </p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Este certificado ha sido generado automáticamente por el sistema de gestión.</p>
          <p>Generado el ${fechaActual}</p>
        </div>
        
        <div class="empresa-contacto">
          <p><strong>Información de contacto:</strong></p>
          <p>C/Travessia, 18 • 08182 Sant Feliu de Codines, Barcelona</p>
          <p>Tel: 938 654 063 • Email: asifgrup@gmail.com • NIF: 52144987P</p>
        </div>
      </div>
    </body>
    </html>
  `;
} 