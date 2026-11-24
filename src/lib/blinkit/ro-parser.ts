import * as XLSX from 'xlsx';

export interface BlinkitRoItem {
  line: number;
  itemCode: string;
  hsn: string;
  upc: string;
  description: string;
  grammage: string;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  cessPct: number;
  addlCess: number;
  taxAmount: number;
  landingRate: number;
  quantity: number;
  mrp: number;
  totalAmount: number;
  // Validation status
  calcTotal: number;
  isValid: boolean;
  validationError?: string;
  // Product mapping status
  productId?: string;
  isMapped: boolean;
  mappedSku?: string;
}

export interface BlinkitRoFooter {
  totalQuantity?: number;
  totalItems?: number;
  totalAmount?: number;
  cartDiscount?: number;
  netAmount?: number;
}

export interface BlinkitRoHeader {
  roNumber: string;
  roDate: string;
  validTill: string;
  roType: string;
  sellerNo: string;
  sellerName?: string;
  sellerGstin: string;
  sellerAddress?: string;
  deliveryLocation: string;
  deliveryAddress: string;
  buyerGstin: string;
  spocName: string;
  spocPhone: string;
  supplyType: 'inter_state' | 'intra_state';
}

export interface BlinkitRoValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  lineItemsCount: number;
  totalUnits: number;
  totalNetAmount: number;
  footerMatches: boolean;
  unmappedCount: number;
  isExpired: boolean;
}

export interface BlinkitParsedRo {
  header: BlinkitRoHeader;
  items: BlinkitRoItem[];
  footer: BlinkitRoFooter;
  validation: BlinkitRoValidationResult;
  sourceFiles?: {
    excelFileName?: string;
    pdfFileName?: string;
  };
}

/**
 * Normalizes header string for case-insensitive matching
 */
function normalizeHeader(h: any): string {
  if (h === null || h === undefined) return '';
  return String(h).trim().toLowerCase().replace(/[\r\n\t_]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Ensures code/UPC values are strictly treated as strings without scientific notation
 */
function cleanCodeString(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes('e+') || str.includes('E+')) {
    try {
      const num = Number(val);
      return BigInt(Math.floor(num)).toString();
    } catch {
      return str;
    }
  }
  return str;
}

/**
 * Parse line items and footer from Blinkit Excel sheet
 */
export function parseBlinkitRoExcel(fileBuffer: ArrayBuffer | Uint8Array | Buffer): {
  items: BlinkitRoItem[];
  footer: BlinkitRoFooter;
} {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to array of rows (raw)
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!rows || rows.length < 2) {
    throw new Error('Excel file is empty or does not have at least a header and 1 row.');
  }

  // Row 1 is header
  const headerRow = rows[0];
  const colMap: Record<string, number> = {};

  headerRow.forEach((colName: any, idx: number) => {
    const norm = normalizeHeader(colName);
    if (!norm) return;

    if (norm === '#' || norm === 'line' || norm === 'sr' || norm === 's.no' || norm === 'sr no' || norm === 'sl no') {
      colMap['#'] = idx;
    } else if (norm.includes('item code') || norm.includes('item_code') || norm === 'itemcode') {
      colMap['itemCode'] = idx;
    } else if (norm.includes('hsn')) {
      colMap['hsn'] = idx;
    } else if (norm.includes('product upc') || norm.includes('upc') || norm.includes('barcode')) {
      colMap['upc'] = idx;
    } else if (norm.includes('description') || norm.includes('item name') || norm.includes('product name')) {
      colMap['description'] = idx;
    } else if (norm.includes('grammage') || norm.includes('pack size') || norm.includes('size')) {
      colMap['grammage'] = idx;
    } else if (norm.includes('cgst %') || norm === 'cgst' || norm === 'cgst%') {
      colMap['cgst'] = idx;
    } else if (norm.includes('sgst %') || norm === 'sgst' || norm === 'sgst%') {
      colMap['sgst'] = idx;
    } else if (norm.includes('igst %') || norm === 'igst' || norm === 'igst%') {
      colMap['igst'] = idx;
    } else if (norm.includes('additional cess') || norm.includes('addl cess')) {
      colMap['addlCess'] = idx;
    } else if (norm.includes('cess %') || norm === 'cess' || norm === 'cess%') {
      colMap['cess'] = idx;
    } else if (norm.includes('tax amount') || norm === 'tax' || norm === 'tax amount (per unit)') {
      colMap['taxAmount'] = idx;
    } else if (norm.includes('landing rate') || norm.includes('purchase rate') || norm.includes('rate')) {
      colMap['landingRate'] = idx;
    } else if (norm.includes('quantity') || norm === 'qty') {
      colMap['quantity'] = idx;
    } else if (norm === 'mrp' || norm.includes('mrp')) {
      colMap['mrp'] = idx;
    } else if (norm.includes('total amount') || norm === 'total' || norm === 'net amount') {
      colMap['totalAmount'] = idx;
    }
  });

  const items: BlinkitRoItem[] = [];
  const footer: BlinkitRoFooter = {};
  let readingItems = true;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];

    // Check Col A (#) or line index
    const lineVal = colMap['#'] !== undefined ? row[colMap['#']] : row[0];
    const isLineEmpty = lineVal === undefined || lineVal === null || String(lineVal).trim() === '';

    if (readingItems) {
      if (isLineEmpty) {
        // Spec rule: "Stop reading items at the first row where # is empty."
        readingItems = false;
      } else {
        const lineNum = Number(lineVal);
        if (isNaN(lineNum)) {
          readingItems = false;
        } else {
          // Read item
          const itemCode = cleanCodeString(colMap['itemCode'] !== undefined ? row[colMap['itemCode']] : row[1]);
          const hsn = cleanCodeString(colMap['hsn'] !== undefined ? row[colMap['hsn']] : row[2]);
          const upc = cleanCodeString(colMap['upc'] !== undefined ? row[colMap['upc']] : row[3]);
          const description = String(colMap['description'] !== undefined ? row[colMap['description']] : row[4] || '').trim();
          const grammage = String(colMap['grammage'] !== undefined ? row[colMap['grammage']] : row[5] || '').trim();

          const cgstPct = Number(colMap['cgst'] !== undefined ? row[colMap['cgst']] : 0) || 0;
          const sgstPct = Number(colMap['sgst'] !== undefined ? row[colMap['sgst']] : 0) || 0;
          const igstPct = Number(colMap['igst'] !== undefined ? row[colMap['igst']] : 0) || 0;
          const cessPct = Number(colMap['cess'] !== undefined ? row[colMap['cess']] : 0) || 0;
          const addlCess = Number(colMap['addlCess'] !== undefined ? row[colMap['addlCess']] : 0) || 0;

          const taxAmount = Number(colMap['taxAmount'] !== undefined ? row[colMap['taxAmount']] : 0) || 0;
          const landingRate = Number(colMap['landingRate'] !== undefined ? row[colMap['landingRate']] : 0) || 0;
          const quantity = parseInt(String(colMap['quantity'] !== undefined ? row[colMap['quantity']] : 0), 10) || 0;
          const mrp = Number(colMap['mrp'] !== undefined ? row[colMap['mrp']] : 0) || 0;
          const totalAmount = Number(colMap['totalAmount'] !== undefined ? row[colMap['totalAmount']] : 0) || 0;

          const calcTotal = Number((quantity * landingRate).toFixed(2));
          const isValid = Math.abs(calcTotal - totalAmount) < 0.05;

          items.push({
            line: lineNum,
            itemCode,
            hsn,
            upc,
            description,
            grammage,
            cgstPct,
            sgstPct,
            igstPct,
            cessPct,
            addlCess,
            taxAmount,
            landingRate,
            quantity,
            mrp,
            totalAmount,
            calcTotal,
            isValid,
            validationError: isValid ? undefined : `Mismatch: ${quantity} x ₹${landingRate} = ₹${calcTotal}, but sheet has ₹${totalAmount}`,
            isMapped: false,
          });
          continue;
        }
      }
    }

    // If readingItems is false, inspect footer rows
    // Check all cells for footer keywords
    for (let c = 0; c < row.length; c++) {
      const cellText = normalizeHeader(row[c]);
      if (!cellText) continue;

      if (cellText.includes('total quantity')) {
        const val = findAdjacentNumber(row, c);
        if (val !== undefined) footer.totalQuantity = val;
      } else if (cellText.includes('total items') || cellText.includes('total item')) {
        const val = findAdjacentNumber(row, c);
        if (val !== undefined) footer.totalItems = val;
      } else if (cellText.includes('total amount')) {
        const val = findAdjacentNumber(row, c);
        if (val !== undefined) footer.totalAmount = val;
      } else if (cellText.includes('cart discount')) {
        const val = findAdjacentNumber(row, c);
        if (val !== undefined) footer.cartDiscount = val;
      } else if (cellText.includes('net amount') || cellText.includes('net total')) {
        const val = findAdjacentNumber(row, c);
        if (val !== undefined) footer.netAmount = val;
      }
    }
  }

  return { items, footer };
}

function findAdjacentNumber(row: any[], currentIdx: number): number | undefined {
  for (let offset = 1; offset <= 3; offset++) {
    if (currentIdx + offset < row.length) {
      const val = row[currentIdx + offset];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const cleaned = String(val).replace(/,/g, '').replace(/₹/g, '').trim();
        const num = Number(cleaned);
        if (!isNaN(num)) return num;
      }
    }
  }
  return undefined;
}

/**
 * Derive supply type by comparing state codes (first 2 digits of GSTIN)
 */
export function deriveSupplyType(buyerGstin: string, sellerGstin: string): 'inter_state' | 'intra_state' {
  const buyerState = (buyerGstin || '').trim().substring(0, 2);
  const sellerState = (sellerGstin || '').trim().substring(0, 2);

  if (buyerState && sellerState && buyerState.length === 2 && sellerState.length === 2) {
    return buyerState === sellerState ? 'intra_state' : 'inter_state';
  }
  return 'inter_state';
}

/**
 * Extracts header fields from raw PDF text using regex
 */
export function parseBlinkitRoPdfText(pdfText: string, fallbackFileName?: string): BlinkitRoHeader {
  const clean = pdfText.replace(/\r/g, '');

  // 1. R.O. Number
  let roNumber = '';
  const roMatch = clean.match(/R\.?O\.?\s*(?:Number|No\.?|#)?\s*[:\s-]\s*([0-9]{10,20})/i);
  if (roMatch) {
    roNumber = roMatch[1].trim();
  } else if (fallbackFileName) {
    const fnMatch = fallbackFileName.match(/([0-9]{10,20})/);
    if (fnMatch) roNumber = fnMatch[1];
  }

  // 2. Date
  let roDate = '';
  const dateMatch = clean.match(/R\.?O\.?\s*Date\s*[:\s-]\s*([0-9]{1,2}[-/.\s][A-Za-z0-9]{2,4}[-/.\s][0-9]{2,4})/i) ||
                    clean.match(/Date\s*[:\s-]\s*([0-9]{1,2}[-/.\s][A-Za-z0-9]{2,4}[-/.\s][0-9]{2,4})/i);
  if (dateMatch) {
    roDate = dateMatch[1].trim();
  } else {
    roDate = new Date().toISOString().split('T')[0];
  }

  // 3. Expiry Date
  let validTill = '';
  const expMatch = clean.match(/Expiry\s*Date\s*[:\s-]\s*([0-9]{1,2}[-/.\s][A-Za-z0-9]{2,4}[-/.\s][0-9]{2,4})/i) ||
                   clean.match(/Valid\s*(?:Till|Until|To)\s*[:\s-]\s*([0-9]{1,2}[-/.\s][A-Za-z0-9]{2,4}[-/.\s][0-9]{2,4})/i);
  if (expMatch) {
    validTill = expMatch[1].trim();
  }

  // 4. RO Type
  let roType = 'Seller Hub STO';
  const typeMatch = clean.match(/R\.?O\.?\s*Type\s*[:\s-]\s*([^\n\r,]+)/i);
  if (typeMatch) roType = typeMatch[1].trim();

  // 5. Seller No
  let sellerNo = '';
  const sellerMatch = clean.match(/Seller\s*No\.?\s*[:\s-]\s*([A-Za-z0-9_-]+)/i);
  if (sellerMatch) sellerNo = sellerMatch[1].trim();

  // 6. GSTINs (Format: 2 digits + 10 chars + 1 digit + 1 char + 1 char)
  let buyerGstin = '';
  let sellerGstin = '';

  const blinkitGstMatch = clean.match(/(?:Blinkit|Buyer|Delivered\s*To)\s*GST(?:IN)?\s*[:\s-]\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
  if (blinkitGstMatch) {
    buyerGstin = blinkitGstMatch[1].trim();
  }

  const sellerGstMatch = clean.match(/Seller\s*GST(?:IN)?\s*[:\s-]\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
  if (sellerGstMatch) {
    sellerGstin = sellerGstMatch[1].trim();
  }

  // General GSTIN fallback scan
  if (!buyerGstin || !sellerGstin) {
    const allGstins = Array.from(clean.matchAll(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/g)).map(m => m[1]);
    if (allGstins.length >= 2) {
      if (!sellerGstin) sellerGstin = allGstins[0];
      if (!buyerGstin) buyerGstin = allGstins[1];
    } else if (allGstins.length === 1 && !buyerGstin) {
      buyerGstin = allGstins[0];
    }
  }

  // 7. Delivery Warehouse Name and Address
  let deliveryLocation = 'BCPL - Kundli Feeder Warehouse';
  let deliveryAddress = 'Plot No. 182-184, Phase 4, Sector 57, HSIIDC Industrial Area, Kundli, Sonipat, Haryana - 131028';
  const whMatch = clean.match(/Delivered\s*To[^\n\r:]*[:\s-]*\n*([^\n\r]+)/i);
  if (whMatch && whMatch[1].trim()) {
    deliveryLocation = whMatch[1].trim();
  }

  // 8. SPOC Name and Phone
  let spocName = '';
  let spocPhone = '';
  const spocNameMatch = clean.match(/SPOC\s*(?:Name)?\s*[:\s-]\s*([A-Za-z\s]+)/i);
  if (spocNameMatch) spocName = spocNameMatch[1].trim();

  const spocPhoneMatch = clean.match(/(?:SPOC\s*Phone|Phone|Mobile)\s*[:\s-]\s*([+0-9\s-]{10,15})/i);
  if (spocPhoneMatch) spocPhone = spocPhoneMatch[1].trim();

  const supplyType = deriveSupplyType(buyerGstin, sellerGstin);

  return {
    roNumber,
    roDate,
    validTill,
    roType,
    sellerNo,
    sellerGstin,
    deliveryLocation,
    deliveryAddress,
    buyerGstin,
    spocName,
    spocPhone,
    supplyType,
  };
}

/**
 * Validate parsed Blinkit R.O.
 */
export function validateBlinkitRo(
  header: BlinkitRoHeader,
  items: BlinkitRoItem[],
  footer: BlinkitRoFooter,
  existingRoNumbers: string[] = []
): BlinkitRoValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Duplicate R.O.
  if (header.roNumber && existingRoNumbers.includes(header.roNumber)) {
    errors.push(`Duplicate R.O. Number: R.O. #${header.roNumber} already exists in the system.`);
  }

  // Check 2: Expiry date
  let isExpired = false;
  if (header.validTill) {
    const expDate = new Date(header.validTill);
    if (!isNaN(expDate.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        isExpired = true;
        warnings.push(`R.O. has expired (Expiry Date: ${header.validTill}). Default status will be 'expired'.`);
      }
    }
  }

  // Check 3: Line items validation
  let sumQuantity = 0;
  let sumAmount = 0;
  let invalidLineCount = 0;
  let unmappedCount = 0;

  items.forEach((item) => {
    sumQuantity += item.quantity;
    sumAmount += item.totalAmount;

    if (!item.isValid) {
      invalidLineCount++;
      errors.push(`Line #${item.line} (${item.description}): Rate x Quantity mismatch (${item.quantity} x ₹${item.landingRate} = ₹${item.calcTotal}, sheet total: ₹${item.totalAmount})`);
    }

    if (!item.isMapped) {
      unmappedCount++;
    }
  });

  // Check 4: Footer match
  let footerMatches = true;

  if (footer.totalQuantity !== undefined && footer.totalQuantity !== sumQuantity) {
    footerMatches = false;
    errors.push(`Total Quantity mismatch: Line items sum to ${sumQuantity}, but footer specifies ${footer.totalQuantity}.`);
  }

  if (footer.totalItems !== undefined && footer.totalItems !== items.length) {
    footerMatches = false;
    errors.push(`Total Items mismatch: Sheet has ${items.length} lines, but footer specifies ${footer.totalItems}.`);
  }

  const roundedSumAmount = Math.round(sumAmount);
  if (footer.netAmount !== undefined && Math.abs(footer.netAmount - roundedSumAmount) > 2) {
    footerMatches = false;
    errors.push(`Net Amount mismatch: Sum of line totals is ₹${roundedSumAmount.toLocaleString('en-IN')}, but footer specifies ₹${footer.netAmount.toLocaleString('en-IN')}.`);
  }

  if (unmappedCount > 0) {
    warnings.push(`${unmappedCount} item(s) are not yet mapped to product master. You can link or create them before confirming.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    lineItemsCount: items.length,
    totalUnits: sumQuantity,
    totalNetAmount: sumAmount,
    footerMatches,
    unmappedCount,
    isExpired,
  };
}
