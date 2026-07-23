/**
 * Generates beautiful, realistic Canvas-based mock shipping documents
 * for testing the Smart OCR tool.
 */

export interface SampleDocumentData {
  referenceNumber: string;
  type: string;
  originPort: string;
  destinationPort: string;
  weight: number;
  shipper: string;
  consignee: string;
  carrier: string;
}

export const SAMPLES: Record<'HBL' | 'AWB', SampleDocumentData> = {
  HBL: {
    referenceNumber: 'HBL-2026-9042',
    type: 'Sea-FCL 40\' HC',
    originPort: 'CNSHA',
    destinationPort: 'ESBCN',
    weight: 18450,
    shipper: 'Global Manufacturing Corp (Shanghai)',
    consignee: 'Acme Retailers SL (Barcelona)',
    carrier: 'Cosco Shipping Lines'
  },
  AWB: {
    referenceNumber: 'AWB-557-88402',
    type: 'Air',
    originPort: 'TPE',
    destinationPort: 'FRA',
    weight: 1250,
    shipper: 'Taiwan Electronics Mfg Co (Hsinchu)',
    consignee: 'EuroTech Distribution GmbH (Frankfurt)',
    carrier: 'Lufthansa Cargo'
  }
};

/**
 * Draws a professional-looking shipping blueprint / invoice document on a canvas
 * and returns it as a Base64 PNG data URL and File object.
 */
export function generateSampleDocument(key: 'HBL' | 'AWB'): { dataUrl: string; file: File; ocrData: SampleDocumentData } {
  const data = SAMPLES[key];
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  // Draw background (high-contrast structured document style)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 800);
  
  // Draw grid/blueprint look in the margins
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 580, 780);
  
  // Outer frame accents
  ctx.strokeStyle = key === 'HBL' ? '#2563eb' : '#dc2626'; // Blue for Sea, Red for Air
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 576, 776);
  
  // --- Header ---
  ctx.fillStyle = key === 'HBL' ? '#eff6ff' : '#fef2f2';
  ctx.fillRect(15, 15, 570, 70);
  
  ctx.fillStyle = key === 'HBL' ? '#1e40af' : '#991b1b';
  ctx.font = 'bold 22px "Inter", "Helvetica", Arial, sans-serif';
  ctx.fillText(key === 'HBL' ? 'HOUSE BILL OF LADING' : 'INTERNATIONAL AIR WAYBILL', 30, 45);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('NON-NEGOTIABLE FOR TRANSPORT REGISTRATION', 30, 65);
  
  // Document Reference Box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(380, 25, 190, 50);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(380, 25, 190, 50);
  
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'B/L REFERENCE NUMBER' : 'AWB CONSIGNMENT NO.', 390, 40);
  
  ctx.fillStyle = key === 'HBL' ? '#2563eb' : '#dc2626';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.fillText(data.referenceNumber, 390, 62);

  // --- Grid Layout for Shipper & Consignee ---
  // Shipper block (Top Left)
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(30, 100, 260, 120);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(31, 101, 258, 20);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText('1. SHIPPER / CONSIGNOR (Complete name & address)', 35, 114);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(data.shipper, 35, 140);
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Industrial Sector 4-A, Building 19', 35, 158);
  ctx.fillText('Pudong Logistics Zone', 35, 174);
  ctx.fillText(key === 'HBL' ? 'Shanghai, China' : 'Hsinchu Science Park, Taiwan', 35, 190);
  
  // Consignee block (Middle Left)
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(30, 235, 260, 120);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(31, 236, 258, 20);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText('2. CONSIGNEE (Complete name & address)', 35, 249);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(data.consignee, 35, 275);
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('District 12, Logistics Avenue 82', 35, 293);
  ctx.fillText(key === 'HBL' ? 'Port of Barcelona Area' : 'Main Frankfurt Airport Hub', 35, 309);
  ctx.fillText(key === 'HBL' ? '08039 Barcelona, Spain' : '60549 Frankfurt, Germany', 35, 325);

  // Carrier block (Top Right)
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(310, 100, 260, 120);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(311, 101, 258, 20);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText('3. MAIN CARRIER / AIRLINE DETAILS', 315, 114);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText(data.carrier, 315, 142);
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'Vessel: COSCO SPAIN V-093' : 'Flight No: LH-8402 / Cargo', 315, 162);
  ctx.fillText(key === 'HBL' ? 'IMO Registry: 9811402' : 'Carrier Code: 220-LH', 315, 178);
  ctx.fillText('Authorized Signature Present', 315, 196);

  // Mode of Transport & Voyage (Middle Right)
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(310, 235, 260, 120);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(311, 236, 258, 20);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText('4. TRANSPORT DETAILS & TERMS', 315, 249);
  
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Transport Mode:', 315, 275);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(data.type, 410, 275);
  
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Incoterms 2020:', 315, 295);
  ctx.fillStyle = '#0f172a';
  ctx.fillText(key === 'HBL' ? 'FOB - Free On Board' : 'FCA - Free Carrier', 410, 295);
  
  ctx.fillStyle = '#475569';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Service Standard:', 315, 315);
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Expedited Logistics Group', 410, 315);

  // --- Routing & Ports ---
  ctx.strokeStyle = '#2563eb';
  ctx.strokeRect(30, 370, 540, 90);
  ctx.fillStyle = '#eff6ff';
  ctx.fillRect(31, 371, 538, 20);
  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText('5. ROUTING & PORT DESIGNATIONS', 35, 384);
  
  // Origin Port Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(45, 400, 220, 50);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(45, 400, 220, 50);
  ctx.fillStyle = '#475569';
  ctx.font = '9px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'PORT OF LOADING' : 'AIRPORT OF DEPARTURE', 55, 413);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText(data.originPort, 55, 438);
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'Shanghai Int\'l Port' : 'Taipei Taoyuan (TPE)', 115, 435);
  
  // Arrow
  ctx.fillStyle = '#2563eb';
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillText('➔', 288, 430);
  
  // Destination Port Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(335, 400, 220, 50);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(335, 400, 220, 50);
  ctx.fillStyle = '#475569';
  ctx.font = '9px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'PORT OF DISCHARGE' : 'AIRPORT OF DESTINATION', 345, 413);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillText(data.destinationPort, 345, 438);
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'Barcelona Terminal 1' : 'Frankfurt Cargo City', 405, 435);

  // --- Cargo Details Table ---
  ctx.strokeStyle = '#94a3b8';
  ctx.strokeRect(30, 475, 540, 180);
  
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(31, 476, 538, 25);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.fillText('MARKS & NUMBERS', 40, 492);
  ctx.fillText('NO. OF PACKAGES', 160, 492);
  ctx.fillText('DESCRIPTION OF CARGO', 270, 492);
  ctx.fillText('GROSS WEIGHT', 485, 492);
  
  // Table row
  ctx.fillStyle = '#0f172a';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('ACME-BCN-01/18', 40, 520);
  ctx.fillText('18 Pallets (40HC)', 160, 520);
  
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.fillText(key === 'HBL' ? 'ELECTRONIC APPLIANCES & COMPONENTS' : 'HIGH-DENSITY MICROPROCESSORS', 270, 520);
  ctx.font = '9px "Inter", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('HS Code: 8517.18.00 - High priority shipment', 270, 535);
  ctx.fillText('Packaged securely under standard dry conditions', 270, 550);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillText(`${data.weight.toLocaleString()} KGS`, 485, 520);
  
  // Signatures & footer
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(30, 655);
  ctx.lineTo(570, 655);
  ctx.stroke();
  
  ctx.fillStyle = '#475569';
  ctx.font = '9px "Inter", sans-serif';
  ctx.fillText('SHIPPED on board the vessel in apparent good order and condition. Weight and quantity as declared by Shipper.', 40, 675);
  
  // Signature Box
  ctx.strokeRect(350, 695, 200, 65);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(351, 696, 198, 15);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 8px "Inter", sans-serif';
  ctx.fillText('ISSUED BY CARRIER AUTHORIZED SIGNATORY', 355, 706);
  
  // Mock hand-written signature
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(370, 745);
  ctx.bezierCurveTo(400, 715, 420, 755, 450, 725);
  ctx.bezierCurveTo(470, 715, 500, 755, 530, 730);
  ctx.stroke();
  
  ctx.fillStyle = '#94a3b8';
  ctx.font = '7px "JetBrains Mono", monospace';
  ctx.fillText('TIMESTAMP: 2026-07-07 09:50 UTC - SCM SECURE STAMP', 40, 765);

  const dataUrl = canvas.toDataURL('image/png');
  
  // Convert Data URL to File
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const file = new File([u8arr], key === 'HBL' ? 'sample_hbl.png' : 'sample_awb.png', { type: mime });

  return { dataUrl, file, ocrData: data };
}
