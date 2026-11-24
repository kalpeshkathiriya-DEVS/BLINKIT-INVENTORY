export interface CartonInfo {
  line: number;
  itemCode: string;
  upc: string;
  description: string;
  totalQty: number;
  unitsPerCarton: number;
  totalCartons: number;
  roNumber: string;
}

export interface GstInvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  roNumber: string;
  roDate: string;
  transporter?: string;
  vehicleNo?: string;
  lrNo?: string;
  cartonsCount: number;
  
  seller: {
    name: string;
    address: string;
    gstin: string;
    state: string;
    stateCode: string;
    phone?: string;
  };

  buyer: {
    warehouseName: string;
    address: string;
    gstin: string;
    state: string;
    stateCode: string;
    spocName?: string;
    spocPhone?: string;
  };

  items: Array<{
    srNo: number;
    itemCode: string;
    upc: string;
    hsn: string;
    description: string;
    grammage?: string;
    qty: number;
    mrp: number;
    landingRate: number; // GST inclusive
    taxableValue: number;
    cgstPct: number;
    cgstAmount: number;
    sgstPct: number;
    sgstAmount: number;
    igstPct: number;
    igstAmount: number;
    totalAmount: number;
  }>;

  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalAmount: number;
  amountInWords?: string;
}

/**
 * Calculates carton count for a line item
 */
export function calculateCartonsPerLine(quantity: number, unitsPerCarton: number = 25): {
  cartons: number;
  unitsPerCarton: number;
  remainder: number;
} {
  if (quantity <= 0 || unitsPerCarton <= 0) {
    return { cartons: 0, unitsPerCarton, remainder: 0 };
  }
  const cartons = Math.ceil(quantity / unitsPerCarton);
  const remainder = quantity % unitsPerCarton;
  return { cartons, unitsPerCarton, remainder };
}

/**
 * Generate printable HTML for Carton Labels
 * (Rule: One carton should contain only one UPC)
 */
export function generateCartonLabelsHtml(cartons: Array<{
  roNumber: string;
  upc: string;
  itemCode: string;
  description: string;
  cartonIndex: number;
  totalCartonsForProduct: number;
  qtyInCarton: number;
  destinationWarehouse: string;
}>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Blinkit Carton Labels</title>
  <style>
    @page { size: 100mm 150mm; margin: 5mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 10px; }
    .label-box {
      border: 2px solid #000;
      padding: 15px;
      margin-bottom: 25px;
      page-break-after: always;
      border-radius: 4px;
    }
    .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
    .ro-tag { font-size: 14px; color: #222; }
    .upc-large { font-size: 26px; font-weight: 900; letter-spacing: 2px; margin: 10px 0; font-family: monospace; }
    .barcode-placeholder {
      font-family: 'Libre Barcode 128', monospace;
      font-size: 42px;
      text-align: center;
      margin: 8px 0;
      line-height: 1;
    }
    .desc { font-size: 15px; font-weight: 600; min-height: 40px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; border-top: 1px dashed #333; padding-top: 8px; }
    .cell-label { font-size: 11px; text-transform: uppercase; color: #555; }
    .cell-val { font-size: 18px; font-weight: bold; }
    .warning {
      background: #eee;
      border: 1px solid #999;
      padding: 4px;
      font-size: 10px;
      text-align: center;
      margin-top: 10px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${cartons.map(c => `
    <div class="label-box">
      <div class="header">
        <div class="title">BLINKIT INWARD CARTON</div>
        <div class="ro-tag">R.O. #: <strong>${c.roNumber}</strong></div>
      </div>

      <div class="cell-label">Product UPC (Scan Code)</div>
      <div class="upc-large">${c.upc}</div>
      <div class="barcode-placeholder">||| | |||| ||| || ||||</div>

      <div class="cell-label">Item Description</div>
      <div class="desc">${c.description}</div>

      <div class="grid">
        <div>
          <div class="cell-label">Qty in Carton</div>
          <div class="cell-val">${c.qtyInCarton} pcs</div>
        </div>
        <div>
          <div class="cell-label">Carton No.</div>
          <div class="cell-val">${c.cartonIndex} / ${c.totalCartonsForProduct}</div>
        </div>
      </div>

      <div style="margin-top: 8px;">
        <div class="cell-label">Destination Warehouse</div>
        <div style="font-size: 12px; font-weight: bold;">${c.destinationWarehouse}</div>
      </div>

      <div class="warning">
        RULE: ONE CARTON CONTAINS ONLY ONE UPC. DO NOT MIX ITEMS.
      </div>
    </div>
  `).join('')}
</body>
</html>`;
}

/**
 * Generate printable HTML for Blinkit GST Tax Invoice
 */
export function generateGstInvoiceHtml(data: GstInvoiceData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GST Tax Invoice - ${data.invoiceNo}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; line-height: 1.3; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #333; padding: 4px 6px; }
    th { background: #f0f0f0; font-weight: bold; text-align: left; }
    .header-table td { border: none; padding: 2px 4px; }
    .box { border: 1px solid #333; padding: 8px; margin-bottom: 10px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 5px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="title">TAX INVOICE</div>
  <div class="text-center" style="margin-bottom: 12px; font-size: 10px;">(Original for Recipient / Blinkit Commerce Delivery)</div>

  <table style="margin-bottom: 12px;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <div class="bold" style="font-size: 13px;">${data.seller.name}</div>
        <div>${data.seller.address}</div>
        <div><strong>GSTIN:</strong> ${data.seller.gstin}</div>
        <div><strong>State:</strong> ${data.seller.state} (Code: ${data.seller.stateCode})</div>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <div class="bold">Invoice No: ${data.invoiceNo}</div>
        <div><strong>Invoice Date:</strong> ${data.invoiceDate}</div>
        <div><strong>Blinkit R.O. No:</strong> ${data.roNumber}</div>
        <div><strong>R.O. Date:</strong> ${data.roDate}</div>
        <div><strong>Vehicle No:</strong> ${data.vehicleNo || 'N/A'}</div>
        <div><strong>Transporter / LR No:</strong> ${data.transporter || 'Direct'} / ${data.lrNo || 'N/A'}</div>
        <div><strong>Total Cartons:</strong> ${data.cartonsCount}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="background: #fafafa;">
        <div class="bold">Billed To / Shipped To (Blinkit Warehouse):</div>
        <div class="bold">${data.buyer.warehouseName}</div>
        <div>${data.buyer.address}</div>
        <div><strong>GSTIN:</strong> ${data.buyer.gstin} | <strong>State:</strong> ${data.buyer.state} (Code: ${data.buyer.stateCode})</div>
        <div><strong>SPOC:</strong> ${data.buyer.spocName || 'N/A'} (${data.buyer.spocPhone || 'N/A'})</div>
      </td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 25px;">#</th>
        <th>Product UPC</th>
        <th>Item Description</th>
        <th>HSN</th>
        <th class="text-right">Qty</th>
        <th class="text-right">MRP</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Taxable</th>
        <th class="text-right">Tax (%)</th>
        <th class="text-right">Tax Amt</th>
        <th class="text-right">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(it => `
        <tr>
          <td class="text-center">${it.srNo}</td>
          <td style="font-family: monospace; font-weight: bold;">${it.upc}</td>
          <td>${it.description}</td>
          <td>${it.hsn}</td>
          <td class="text-right">${it.qty}</td>
          <td class="text-right">${it.mrp.toFixed(2)}</td>
          <td class="text-right">${it.landingRate.toFixed(2)}</td>
          <td class="text-right">${it.taxableValue.toFixed(2)}</td>
          <td class="text-right">${it.igstPct > 0 ? `IGST ${it.igstPct}%` : `C+S ${it.cgstPct*2}%`}</td>
          <td class="text-right">${(it.igstAmount + it.cgstAmount + it.sgstAmount).toFixed(2)}</td>
          <td class="text-right bold">${it.totalAmount.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr style="font-weight: bold; background: #f0f0f0;">
        <td colspan="4" class="text-right">Total:</td>
        <td class="text-right">${data.items.reduce((s, i) => s + i.qty, 0)}</td>
        <td colspan="2"></td>
        <td class="text-right">₹${data.totalTaxable.toFixed(2)}</td>
        <td></td>
        <td class="text-right">₹${(data.totalIgst + data.totalCgst + data.totalSgst).toFixed(2)}</td>
        <td class="text-right">₹${data.totalAmount.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
    <div><strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Original copy to accompany shipment to Blinkit Feeder Warehouse.</div>
    <div style="margin-top: 35px; text-align: right;">
      <div class="bold">For ${data.seller.name}</div>
      <div style="margin-top: 30px;">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;
}
