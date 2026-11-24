import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  parseBlinkitRoExcel,
  parseBlinkitRoPdfText,
  validateBlinkitRo,
  deriveSupplyType,
} from '../src/lib/blinkit/ro-parser';
import {
  evaluateGrnTicketDeadline,
  evaluateDnPickupDeadline,
} from '../src/lib/blinkit/alerts';
import {
  calculateCartonsPerLine,
  generateCartonLabelsHtml,
  generateGstInvoiceHtml,
} from '../src/lib/blinkit/dispatch-invoice';
import { InventoryStore } from '../src/lib/store/inventory-store';

function runTests() {
  console.log('================================================================');
  console.log('RUNNING BLINKIT R.O. SPECIFICATION & ACCEPTANCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  const samplesDir = path.join(process.cwd(), 'samples');
  const sampleXlsx = path.join(samplesDir, 'RO_2011710136067.xlsx');
  const samplePdfTxt = path.join(samplesDir, 'RO_2011710136067.txt');
  const intraXlsx = path.join(samplesDir, 'RO_2011710136068_intra_state.xlsx');

  // TEST 1: Parse Sample Excel (Inter-State IGST)
  console.log('Scenario 1: Sample Excel Parsing & Totals Validation (05a spec)');
  const excelBuf = fs.readFileSync(sampleXlsx);
  const { items, footer } = parseBlinkitRoExcel(excelBuf);

  assert(items.length === 18, `18 line items imported (got ${items.length})`);
  
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  assert(totalUnits === 1172, `Total quantity equals 1172 units (got ${totalUnits})`);

  const totalAmount = items.reduce((s, i) => s + i.totalAmount, 0);
  assert(Math.round(totalAmount) === 415588, `Total net amount equals Rs 4,15,588 (got ${Math.round(totalAmount)})`);

  assert(footer.totalQuantity === 1172, `Footer total quantity is 1172 (got ${footer.totalQuantity})`);
  assert(footer.totalItems === 18, `Footer total items is 18 (got ${footer.totalItems})`);
  assert(footer.netAmount === 415588, `Footer net amount is 415588 (got ${footer.netAmount})`);

  // TEST 2: PDF Header Extraction
  console.log('\nScenario 2: PDF Header Extraction & Supply Type (05a spec)');
  const pdfContent = fs.readFileSync(samplePdfTxt, 'utf-8');
  const header = parseBlinkitRoPdfText(pdfContent, 'RO_2011710136067.xlsx');

  assert(header.roNumber === '2011710136067', `R.O. Number parsed: ${header.roNumber}`);
  assert(header.buyerGstin === '06AABCB4321P1ZT', `Blinkit Haryana GSTIN: ${header.buyerGstin}`);
  assert(header.sellerGstin === '24AAACA9876Q1Z5', `Seller Gujarat GSTIN: ${header.sellerGstin}`);
  assert(header.supplyType === 'inter_state', `Supply Type derived as inter_state (06 vs 24)`);
  assert(header.deliveryLocation.includes('Kundli'), `Warehouse: ${header.deliveryLocation}`);

  // Validation
  const valResult = validateBlinkitRo(header, items, footer, []);
  assert(valResult.isValid === true, `Validation result is valid (errors: ${valResult.errors.length})`);
  assert(valResult.footerMatches === true, `Footer numbers match item sums`);

  // TEST 3: Haryana-to-Haryana Intra-state (CGST + SGST)
  console.log('\nScenario 3: Intra-State PO (CGST + SGST)');
  const intraBuf = fs.readFileSync(intraXlsx);
  const intraParsed = parseBlinkitRoExcel(intraBuf);
  assert(intraParsed.items.length === 18, `Intra-state PO parsed 18 items`);
  const firstIntra = intraParsed.items[0];
  assert(firstIntra.cgstPct > 0 && firstIntra.sgstPct > 0 && firstIntra.igstPct === 0,
    `Intra-state item has CGST (${firstIntra.cgstPct}%) and SGST (${firstIntra.sgstPct}%) with 0 IGST`);
  const intraSupply = deriveSupplyType('06AABCB4321P1ZT', '06AAACA9876Q1Z5');
  assert(intraSupply === 'intra_state', `Supply type derived as intra_state for 06 vs 06`);

  // TEST 4: Leading zeroes / String types
  console.log('\nScenario 4: Item Code & UPC Formatting');
  const sampleItem = items[0];
  assert(typeof sampleItem.itemCode === 'string' && sampleItem.itemCode === '10297924', `Item Code is text string: ${sampleItem.itemCode}`);
  assert(typeof sampleItem.upc === 'string' && sampleItem.upc === '21713050', `Product UPC is text string: ${sampleItem.upc}`);
  assert(typeof sampleItem.hsn === 'string' && sampleItem.hsn === '96039000', `HSN is text string: ${sampleItem.hsn}`);

  // TEST 5: Missing PDF does not block import
  console.log('\nScenario 5: Missing PDF Handling');
  const fallbackHeader = parseBlinkitRoPdfText('', 'RO_2011710136067.xlsx');
  assert(fallbackHeader.roNumber === '2011710136067', `Pre-fills R.O. Number from filename when PDF missing: ${fallbackHeader.roNumber}`);
  const fallbackVal = validateBlinkitRo(fallbackHeader, items, footer, []);
  assert(fallbackVal.isValid === true, `Missing PDF does not block validation`);

  // TEST 6: Changed Quantity or Rate is Flagged
  console.log('\nScenario 6: Line Item Rate x Qty Mismatch Detection');
  const tamperedItems = items.map(it => ({ ...it }));
  tamperedItems[0].totalAmount = 999999; // tampered
  tamperedItems[0].isValid = false;
  const tamperedVal = validateBlinkitRo(header, tamperedItems, footer, []);
  assert(tamperedVal.isValid === false, `Tampered line is flagged as invalid`);
  assert(tamperedVal.errors.some(e => e.includes('mismatch')), `Error message mentions mismatch`);

  // TEST 7: 10-day GRN ticket window alerts (Day 7 and Day 9)
  console.log('\nScenario 7: 10-day GRN Ticket Window Alerts');
  const now = new Date();
  // 7 days ago
  const d7Ago = new Date(now.getTime() - 7.5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const alertDay7 = evaluateGrnTicketDeadline(d7Ago, 'claim-1', 'RO-101');
  assert(alertDay7.urgency === 'warning_day_7', `Day 7 warning triggered (${alertDay7.message})`);

  // 9 days ago
  const d9Ago = new Date(now.getTime() - 9.2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const alertDay9 = evaluateGrnTicketDeadline(d9Ago, 'claim-2', 'RO-102');
  assert(alertDay9.urgency === 'critical_day_9', `Day 9 critical alert triggered (${alertDay9.message})`);

  // 7-day DN Pickup Limit
  console.log('\nScenario 8: 7-day DN Pickup Limit Alert');
  const d5Ago = new Date(now.getTime() - 5.5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dnAlert = evaluateDnPickupDeadline(d5Ago, 'ret-1', 'RO-103', 'DN-9941');
  assert(dnAlert.urgency === 'critical_liquidation_risk', `DN liquidation risk alert triggered (${dnAlert.message})`);

  // TEST 9: Carton Count and GST Invoice Generation
  console.log('\nScenario 9: Carton Calculations & GST Invoice Generation');
  const cCalc = calculateCartonsPerLine(300, 25);
  assert(cCalc.cartons === 12, `300 units @ 25/carton = 12 cartons (got ${cCalc.cartons})`);

  const cartonHtml = generateCartonLabelsHtml([{
    roNumber: '2011710136067',
    upc: '21713050',
    itemCode: '10297924',
    description: '3-in-1 Floor Wiper',
    cartonIndex: 1,
    totalCartonsForProduct: 12,
    qtyInCarton: 25,
    destinationWarehouse: 'BCPL - Kundli',
  }]);
  assert(cartonHtml.includes('ONE CARTON CONTAINS ONLY ONE UPC'), `Carton label enforces one UPC per carton`);

  const invoiceHtml = generateGstInvoiceHtml({
    invoiceNo: 'INV-2026-001',
    invoiceDate: '16-Nov-2026',
    roNumber: '2011710136067',
    roDate: '12-Nov-2026',
    cartonsCount: 48,
    seller: {
      name: 'Apex Home Essentials Pvt Ltd',
      address: 'Vatva, Ahmedabad',
      gstin: '24AAACA9876Q1Z5',
      state: 'Gujarat',
      stateCode: '24',
    },
    buyer: {
      warehouseName: 'BCPL - Kundli Feeder Warehouse',
      address: 'HSIIDC Kundli, Sonipat, Haryana',
      gstin: '06AABCB4321P1ZT',
      state: 'Haryana',
      stateCode: '06',
    },
    items: [{
      srNo: 1,
      itemCode: '10297924',
      upc: '21713050',
      hsn: '96039000',
      description: '3-in-1 Floor Wiper',
      qty: 150,
      mrp: 499,
      landingRate: 259,
      taxableValue: 32923.73,
      cgstPct: 0,
      cgstAmount: 0,
      sgstPct: 0,
      sgstAmount: 0,
      igstPct: 18,
      igstAmount: 5926.27,
      totalAmount: 38850,
    }],
    totalTaxable: 32923.73,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 5926.27,
    totalAmount: 38850,
  });
  assert(invoiceHtml.includes('TAX INVOICE') && invoiceHtml.includes('INV-2026-001'), `GST Invoice HTML generated successfully`);

  // TEST 10: Store Integration & Full Lifecycle (Inward -> PO Reserve -> Scan Lock -> Dispatch -> GRN -> Return)
  console.log('\nScenario 10: End-to-End Inventory Store Lifecycle (Ledger & RPC checks)');
  const store = new InventoryStore();

  // Step 1: Import the 18 items PO (ensure future validTill for active reservation test)
  const activeHeader = { ...header, validTill: new Date(Date.now() + 7 * 86400000).toISOString() };
  const po = store.importBlinkitRo({ header: activeHeader, items });
  assert(po.items.length === 18, `PO created with 18 items in store`);
  assert(po.totalQty === 1172, `PO total qty is 1172`);

  // Reservation check
  const firstPoItem = po.items[0];
  assert(firstPoItem.reservedQty === firstPoItem.requestedQty,
    `Item #${firstPoItem.channelItemCode} reserved ${firstPoItem.reservedQty}/${firstPoItem.requestedQty} units from available stock`);

  // Step 2: Team Scanning with Over-scan rejection
  console.log('\nScenario 11: Team Scanning & Over-Scan Rejection');
  const lineItem = po.items[0]; // requested 150
  // Scan 100 units
  store.scanItem({
    poItemId: lineItem.id,
    scannedCode: lineItem.blinkitUpc,
    qty: 100,
    userName: 'Ravi',
  });
  assert(lineItem.scannedQty === 100, `Ravi scanned 100 units`);

  // Scan remaining 50 units
  store.scanItem({
    poItemId: lineItem.id,
    scannedCode: lineItem.blinkitUpc,
    qty: 50,
    userName: 'Priya',
  });
  assert(lineItem.scannedQty === 150, `Priya scanned 50 units, total scanned = 150`);

  // 151st scan must throw over-quantity exception!
  let overScanBlocked = false;
  try {
    store.scanItem({
      poItemId: lineItem.id,
      scannedCode: lineItem.blinkitUpc,
      qty: 1,
      userName: 'Ravi',
    });
  } catch (err: any) {
    overScanBlocked = true;
    assert(err.message.includes('Over quantity'), `151st scan on 150-unit line rejected: "${err.message}"`);
  }
  assert(overScanBlocked, `Over-scan strictly blocked`);

  // Step 3: Scan all items to match requested so dispatch closes
  for (let i = 1; i < po.items.length; i++) {
    const it = po.items[i];
    store.scanItem({
      poItemId: it.id,
      scannedCode: it.blinkitUpc,
      qty: it.requestedQty,
      userName: 'Warehouse Staff',
    });
  }

  // Step 4: Close Dispatch
  console.log('\nScenario 12: Close Dispatch & Stock Buckets');
  const dispatch = store.closeDispatch({
    poId: po.id,
    invoiceNo: 'INV-2026-BLINK-01',
    invoiceDate: '2026-11-16',
    cartons: 48,
    vehicleNo: 'HR-26-AB-1234',
    transporter: 'Delhivery',
    lrNo: 'LR-987654',
  });
  assert(dispatch.invoiceNo === 'INV-2026-BLINK-01', `Dispatch closed with invoice ${dispatch.invoiceNo}`);
  assert(po.status === 'dispatched', `PO status is now dispatched`);

  const summary = store.getStockSummary().find(s => s.productId === lineItem.productId);
  assert(summary !== undefined && summary.inTransit >= 150, `Dispatched units moved to in_transit bucket (${summary?.inTransit})`);

  // Step 5: Post GRN: Sent 150 -> 140 Accepted, 6 Rejected, 4 Short
  console.log('\nScenario 13: Post GRN with Shortage & Rejection');
  const grn = store.postGrn({
    poId: po.id,
    dispatchId: dispatch.id,
    grnNo: 'GRN-BLNK-9988',
    grnDate: '2026-11-18',
    deliveryDate: '2026-11-18',
    ticketNo: 'TIK-77112',
    items: [{
      productId: lineItem.productId!,
      poItemId: lineItem.id,
      dispatchedQty: 150,
      acceptedQty: 140,
      rejectedQty: 6,
      rejectionReason: 'Packaging squashed during transit',
    }],
  });
  assert(grn.items[0].shortQty === 4, `Shortage calculated correctly: 150 - 140 - 6 = 4 units`);
  
  const shortageClaim = store.claims.find(c => c.poId === po.id && c.type === 'shortage');
  assert(shortageClaim !== undefined && shortageClaim.qty === 4, `Shortage claim created for 4 units`);

  // Step 6: Receive Return of 6 rejected units: 4 good, 1 damaged, 1 missing
  console.log('\nScenario 14: Receive Return & Auto-allocation');
  const retReceipt = store.receiveReturn({
    poId: po.id,
    dnNo: 'DN-2011-88',
    pickupTicketNo: 'RET-TK-55',
    receivedDate: '2026-11-20',
    items: [{
      productId: lineItem.productId!,
      expectedQty: 6,
      goodQty: 4,
      damagedQty: 1,
      missingQty: 1,
    }],
  });
  assert(retReceipt.dnNo === 'DN-2011-88', `Return receipt posted`);

  const missingClaim = store.claims.find(c => c.type === 'rejection');
  assert(missingClaim !== undefined && missingClaim.qty === 1, `Missing return unit created rejection claim`);

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
