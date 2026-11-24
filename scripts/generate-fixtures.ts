import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// Target: 18 items, 1172 units, net amount Rs 4,15,588
// Let's create realistic items with Gujarat seller (24) -> Haryana Blinkit warehouse (06), so IGST is filled.
interface SampleItem {
  line: number;
  itemCode: string;
  hsn: string;
  upc: string;
  description: string;
  grammage: string;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  addlCess: number;
  taxAmount: number;
  landingRate: number;
  quantity: number;
  mrp: number;
  totalAmount: number;
}

const items: SampleItem[] = [
  { line: 1, itemCode: "10297924", hsn: "96039000", upc: "21713050", description: "3-in-1 Floor Cleaning Brush with Wiper", grammage: "1 pc", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 45.61, landingRate: 299.00, quantity: 150, mrp: 499.00, totalAmount: 44850.00 },
  { line: 2, itemCode: "10297925", hsn: "96039000", upc: "21713051", description: "Kitchen Sink Cleaning Brush", grammage: "1 pc", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 18.15, landingRate: 119.00, quantity: 100, mrp: 199.00, totalAmount: 11900.00 },
  { line: 3, itemCode: "10297926", hsn: "39241010", upc: "21713052", description: "Airtight Plastic Kitchen Containers Set of 6", grammage: "6 pcs", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 76.07, landingRate: 499.00, quantity: 80, mrp: 899.00, totalAmount: 39920.00 },
  { line: 4, itemCode: "10297927", hsn: "39249090", upc: "21713053", description: "Silicone Dish Washing Scrub Gloves", grammage: "1 pair", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 24.25, landingRate: 159.00, quantity: 90, mrp: 299.00, totalAmount: 14310.00 },
  { line: 5, itemCode: "10297928", hsn: "96039000", upc: "21713054", description: "Microfiber Spin Mop with Bucket Set", grammage: "1 set", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 152.29, landingRate: 999.00, quantity: 60, mrp: 1799.00, totalAmount: 59940.00 },
  { line: 6, itemCode: "10297929", hsn: "48182000", upc: "21713055", description: "Kitchen Paper Towel Roll 2-Ply", grammage: "2 rolls", cgst: 0, sgst: 0, igst: 12, cess: 0, addlCess: 0, taxAmount: 10.61, landingRate: 99.00, quantity: 120, mrp: 150.00, totalAmount: 11880.00 },
  { line: 7, itemCode: "10297930", hsn: "39249090", upc: "21713056", description: "Multipurpose Drain Hair Catcher", grammage: "4 pcs", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 12.05, landingRate: 79.00, quantity: 80, mrp: 149.00, totalAmount: 6320.00 },
  { line: 8, itemCode: "10297931", hsn: "39241090", upc: "21713057", description: "Oil Dispenser Bottle with Measurement", grammage: "500 ml", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 34.93, landingRate: 229.00, quantity: 70, mrp: 399.00, totalAmount: 16030.00 },
  { line: 9, itemCode: "10297932", hsn: "39241090", upc: "21713058", description: "Vegetable and Fruit Chopper Hand Pull", grammage: "1 pc", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 45.61, landingRate: 299.00, quantity: 75, mrp: 549.00, totalAmount: 22425.00 },
  { line: 10, itemCode: "10297933", hsn: "39249090", upc: "21713059", description: "Over The Cabinet Door Trash Can", grammage: "9 litre", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 53.24, landingRate: 349.00, quantity: 45, mrp: 699.00, totalAmount: 15705.00 },
  { line: 11, itemCode: "10297934", hsn: "73239390", upc: "21713060", description: "Stainless Steel Sponge Scrubber Pack", grammage: "6 units", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 13.58, landingRate: 89.00, quantity: 65, mrp: 160.00, totalAmount: 5785.00 },
  { line: 12, itemCode: "10297935", hsn: "39249090", upc: "21713061", description: "Rotating Spice Rack Organizer", grammage: "16 jars", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 121.88, landingRate: 799.00, quantity: 35, mrp: 1499.00, totalAmount: 27965.00 },
  { line: 13, itemCode: "10297936", hsn: "96039000", upc: "21713062", description: "Heavy Duty Floor Squeegee Wiper", grammage: "1 pc", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 28.83, landingRate: 189.00, quantity: 50, mrp: 349.00, totalAmount: 9450.00 },
  { line: 14, itemCode: "10297937", hsn: "39241010", upc: "21713063", description: "Silicone Ice Cube Tray with Lid", grammage: "32 cavities", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 22.73, landingRate: 149.00, quantity: 40, mrp: 299.00, totalAmount: 5960.00 },
  { line: 15, itemCode: "10297938", hsn: "39241090", upc: "21713064", description: "Egg Storage Box for Refrigerator", grammage: "24 eggs", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 38.00, landingRate: 249.00, quantity: 32, mrp: 499.00, totalAmount: 7968.00 },
  { line: 16, itemCode: "10297939", hsn: "39249090", upc: "21713065", description: "Adhesive Corner Shower Caddy", grammage: "2 pcs", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 60.86, landingRate: 399.00, quantity: 25, mrp: 799.00, totalAmount: 9975.00 },
  { line: 17, itemCode: "10297940", hsn: "96039000", upc: "21713066", description: "Window Glass Cleaner Spray Brush", grammage: "1 pc", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 30.36, landingRate: 199.00, quantity: 30, mrp: 399.00, totalAmount: 5970.00 },
  { line: 18, itemCode: "10297941", hsn: "39249090", upc: "21713067", description: "Non-Stick Heat Resistant Silicone Spatula Set", grammage: "6 pcs", cgst: 0, sgst: 0, igst: 18, cess: 0, addlCess: 0, taxAmount: 114.25, landingRate: 749.00, quantity: 25, mrp: 1299.00, totalAmount: 18725.00 },
];

// Check counts:
// Qty total: 150+100+80+90+60+120+80+70+75+45+65+35+50+40+32+25+30+25 = 1172 units!
// Amount total: 44850+11900+39920+14310+59940+11880+6320+16030+22425+15705+5785+27965+9450+5960+7968+9975+5970+18725 = 329098
// Let's adjust landing rates/quantities to reach exactly 415,588:
// Adjust precisely to 415588:
// Let's reset and compute exact amounts:
let sumAmount = items.reduce((s, i) => s + i.totalAmount, 0);
let delta = 415588 - sumAmount;

// item 0 has qty 150. Let's make items have clean rates such that total is exactly 415588:
// We can adjust item[0]:
// delta / 150:
// Let's adjust items directly:
items[0].landingRate = 259.00;
items[0].totalAmount = items[0].quantity * items[0].landingRate; // 150 * 259 = 38850
items[0].taxAmount = Number((items[0].landingRate - items[0].landingRate / 1.18).toFixed(2));

items[1].landingRate = 119.00;
items[1].totalAmount = items[1].quantity * items[1].landingRate; // 100 * 119 = 11900
items[1].taxAmount = Number((items[1].landingRate - items[1].landingRate / 1.18).toFixed(2));

// Recalculate diff to 415588:
sumAmount = items.reduce((s, i) => s + i.totalAmount, 0);
delta = 415588 - sumAmount; // Adjust remaining on item 1:
items[1].landingRate = Number((items[1].landingRate + delta / items[1].quantity).toFixed(2));
items[1].totalAmount = items[1].quantity * items[1].landingRate;
items[1].taxAmount = Number((items[1].landingRate - items[1].landingRate / 1.18).toFixed(2));

sumAmount = items.reduce((s, i) => s + i.totalAmount, 0);
delta = 415588 - sumAmount;
if (delta !== 0) {
  // If there's any cent/paisa rounding diff, apply to item 0 totalAmount and landingRate
  items[0].totalAmount += delta;
  items[0].landingRate = Number((items[0].totalAmount / items[0].quantity).toFixed(2));
}

const finalQty = items.reduce((s, i) => s + i.quantity, 0);
const finalAmount = items.reduce((s, i) => s + i.totalAmount, 0);
console.log(`Generated items count: ${items.length}, total qty: ${finalQty}, total amount: ${finalAmount}`);

// Write Excel file:
const headers = [
  "#",
  "Item Code",
  "HSN Code",
  "Product UPC",
  "Product Description",
  "Grammage",
  "CGST %",
  "SGST %",
  "IGST %",
  "CESS %",
  "Additional CESS",
  "Tax Amount",
  "Landing Rate",
  "Quantity",
  "MRP",
  "Total Amount"
];

const rows: any[][] = [];
rows.push(headers);

for (const it of items) {
  rows.push([
    it.line,
    it.itemCode,
    it.hsn,
    it.upc,
    it.description,
    it.grammage,
    it.cgst,
    it.sgst,
    it.igst,
    it.cess,
    it.addlCess,
    it.taxAmount,
    it.landingRate,
    it.quantity,
    it.mrp,
    it.totalAmount
  ]);
}

// Add empty row
rows.push([]);

// Footer rows as per spec:
// In columns I/J and O/P below last item:
// "Total Quantity", "Total Items", "Total Amount", "Cart Discount", "Net amount"
// We put footer labels in column I and values in column J, and column O and P:
const footerRow1 = new Array(16).fill("");
footerRow1[8] = "Total Quantity";
footerRow1[9] = finalQty;
footerRow1[14] = "Total Amount";
footerRow1[15] = finalAmount;
rows.push(footerRow1);

const footerRow2 = new Array(16).fill("");
footerRow2[8] = "Total Items";
footerRow2[9] = items.length;
footerRow2[14] = "Cart Discount";
footerRow2[15] = 0;
rows.push(footerRow2);

const footerRow3 = new Array(16).fill("");
footerRow3[14] = "Net amount";
footerRow3[15] = finalAmount;
rows.push(footerRow3);

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const samplesDir = path.join(process.cwd(), "samples");
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

const sampleXlsxPath = path.join(samplesDir, "RO_2011710136067.xlsx");
XLSX.writeFile(wb, sampleXlsxPath);
console.log(`Saved sample fixture to: ${sampleXlsxPath}`);

// Also create the PDF text header file
const pdfText = `
RECOMMENDED QUANTITY ORDER (R.O.)
Seller Hub STO
R.O. Number: 2011710136067
R.O. Date: 12-Nov-2026
R.O. Expiry Date: 22-Nov-2026
R.O. Type: Seller Hub STO
Seller No.: SEL-98421
Seller Name: Apex Home Essentials Pvt Ltd
Seller GSTIN: 24AAACA9876Q1Z5
Seller Address: Plot 42, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat - 382445

Delivered To (Warehouse):
BCPL - Kundli Feeder Warehouse
Blinkit Commerce Private Limited
Plot No. 182-184, Phase 4, Sector 57, HSIIDC Industrial Area, Kundli, Sonipat, Haryana - 131028
Blinkit GSTIN: 06AABCB4321P1ZT

Blinkit SPOC:
Name: Amit Sharma
Phone: +91 98765 43210

Total Items: 18
Total Quantity: 1172
Total Net Amount: INR 4,15,588.00
`;
fs.writeFileSync(path.join(samplesDir, "RO_2011710136067.txt"), pdfText.trim());

// Also create Haryana-to-Haryana fixture (CGST + SGST):
const intraItems = items.map((it, idx) => ({
  ...it,
  cgst: it.igst / 2,
  sgst: it.igst / 2,
  igst: 0,
}));

const intraRows: any[][] = [];
intraRows.push(headers);
for (const it of intraItems) {
  intraRows.push([
    it.line,
    it.itemCode,
    it.hsn,
    it.upc,
    it.description,
    it.grammage,
    it.cgst,
    it.sgst,
    it.igst,
    it.cess,
    it.addlCess,
    it.taxAmount,
    it.landingRate,
    it.quantity,
    it.mrp,
    it.totalAmount
  ]);
}
intraRows.push([]);
intraRows.push(footerRow1);
intraRows.push(footerRow2);
intraRows.push(footerRow3);

const intraWs = XLSX.utils.aoa_to_sheet(intraRows);
const intraWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(intraWb, intraWs, "Sheet1");
const intraXlsxPath = path.join(samplesDir, "RO_2011710136068_intra_state.xlsx");
XLSX.writeFile(intraWb, intraXlsxPath);
console.log(`Saved intra-state fixture to: ${intraXlsxPath}`);
