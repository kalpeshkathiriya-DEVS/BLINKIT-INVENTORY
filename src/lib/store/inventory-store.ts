import { deriveSupplyType } from '../blinkit/ro-parser';

export interface Product {
  id: string;
  orgId: string;
  internalName: string;
  officialName: string;
  sku: string;
  upc: string;
  hsn: string;
  mrp: number;
  gstPercent: number;
  unit: string;
  category: string;
  rackLocation?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface ProductAlias {
  id: string;
  orgId: string;
  productId: string;
  alias: string;
  source?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  upc: string;
}

export interface ChannelItemMap {
  id: string;
  orgId: string;
  productId: string;
  channel: string;
  channelItemCode: string;
  channelItemName?: string;
}

export interface ChannelLocation {
  id: string;
  orgId: string;
  channel: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
}

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  gstin?: string;
  phone?: string;
  state?: string;
}

export interface PoItem {
  id: string;
  poId: string;
  productId?: string;
  channelItemCode: string;
  blinkitUpc: string;
  hsn: string;
  grammage: string;
  itemName: string;
  requestedQty: number;
  reservedQty: number;
  scannedQty: number;
  dispatchedQty: number;
  landingRate: number;
  mrp: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  cessPct: number;
  taxPerUnit: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  orgId: string;
  channel: string;
  poNumber: string;
  roType: string;
  sellerNo: string;
  poDate: string;
  validTill: string;
  deliveryLocation: string;
  deliveryLocationId?: string;
  buyerGstin: string;
  sellerGstin: string;
  supplyType: 'inter_state' | 'intra_state';
  spocName: string;
  spocPhone: string;
  totalQty: number;
  totalItems: number;
  netAmount: number;
  status: 'new' | 'reserved' | 'in_progress' | 'partly_dispatched' | 'dispatched' | 'grn_pending' | 'closed' | 'closed_with_claims' | 'cancelled' | 'expired';
  sourceFiles?: any;
  items: PoItem[];
  createdAt: string;
}

export interface PoScan {
  id: string;
  poItemId: string;
  poId: string;
  userId?: string;
  userName: string;
  qty: number;
  scannedCode: string;
  isVoided: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  createdAt: string;
}

export interface Dispatch {
  id: string;
  poId: string;
  invoiceNo: string;
  invoiceDate: string;
  cartons: number;
  cartonsPerLine?: Record<string, number>;
  vehicleNo?: string;
  transporter?: string;
  lrNo?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentBooked?: boolean;
  dispatchedAt: string;
  items: Array<{ poItemId: string; qty: number }>;
}

export interface GrnEntry {
  id: string;
  orgId: string;
  poId: string;
  dispatchId?: string;
  grnNo: string;
  grnDate: string;
  deliveryDate: string;
  ticketDeadline: string; // delivery + 10 days
  ticketNo?: string;
  proofFileUrl?: string;
  podFileUrl?: string;
  openingVideoUrl?: string;
  notes?: string;
  items: Array<{
    id: string;
    productId: string;
    poItemId?: string;
    dispatchedQty: number;
    acceptedQty: number;
    shortQty: number;
    rejectedQty: number;
    rejectionReason?: string;
  }>;
}

export interface Claim {
  id: string;
  orgId: string;
  poId: string;
  grnItemId?: string;
  type: 'shortage' | 'rejection';
  qty: number;
  amount: number;
  ticketDeadline: string;
  ticketNo?: string;
  status: 'open' | 'raised' | 'settled' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface ReturnReceipt {
  id: string;
  orgId: string;
  poId: string;
  grnId?: string;
  dnNo: string;
  pickupTicketNo?: string;
  pickupDeadline: string; // 7 days
  receivedDate: string;
  items: Array<{
    productId: string;
    expectedQty: number;
    receivedQty: number;
    goodQty: number;
    damagedQty: number;
    missingQty: number;
  }>;
}

export interface InwardItem {
  id: string;
  entryId: string;
  productId: string;
  receivedQty: number;
  goodQty: number;
  damagedQty: number;
  damageReason?: string;
  rate: number;
  gstPercent: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface InwardEntry {
  id: string;
  orgId: string;
  supplierId: string;
  supplierName: string;
  docType: 'bill' | 'challan';
  docNo: string;
  docDate: string;
  vehicleNo?: string;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalAmount: number;
  items: InwardItem[];
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  category: 'Home & Kitchen' | 'Clothing' | 'Manufacturing' | 'Other';
  phone?: string;
  email?: string;
  gstin?: string;
  state?: string;
  status: 'pending' | 'active' | 'blocked';
  plan: 'free' | 'pro' | 'business';
  ownerName: string;
  usersCount?: number;
  lastActive?: string;
  hideRatesFromStaff?: boolean;
  createdAt: string;
}

export interface DamagedStockAction {
  id: string;
  orgId: string;
  productId: string;
  productName: string;
  qty: number;
  action: 'repaired' | 'returned_to_supplier' | 'discarded';
  notes?: string;
  performedBy: string;
  createdAt: string;
}

export interface StaffProfile {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  role: 'admin' | 'user';
  isActive: boolean;
  pin: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  action: string;
  entity: string;
  entityId?: string;
  userName: string;
  userRole: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  orgId: string;
  productId: string;
  bucket: 'good' | 'damaged' | 'reserved' | 'in_transit' | 'return_pending' | 'written_off';
  qty: number;
  reason: 'inward' | 'reserve' | 'release' | 'dispatch' | 'grn_short' | 'grn_reject' | 'return_good' | 'return_damaged' | 'adjustment' | 'writeoff' | 'repaired' | 'returned_to_supplier' | 'discarded';
  refTable?: string;
  refId?: string;
  userName?: string;
  createdAt: string;
}

export interface StockSummaryItem {
  productId: string;
  internalName: string;
  officialName: string;
  sku: string;
  upc: string;
  mrp: number;
  good: number;
  reserved: number;
  available: number;
  damaged: number;
  inTransit: number;
  returnPending: number;
  writtenOff: number;
}

// Global Demo State
export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export class InventoryStore {
  orgId: string = DEFAULT_ORG_ID;
  currentUser: { id: string; name: string; role: 'admin' | 'user' | 'superadmin' } = {
    id: 'user-admin',
    name: 'Admin User',
    role: 'admin',
  };

  products: Product[] = [];
  productAliases: ProductAlias[] = [];
  productVariants: ProductVariant[] = [];
  channelItemMap: ChannelItemMap[] = [];
  channelLocations: ChannelLocation[] = [];
  suppliers: Supplier[] = [];
  purchaseOrders: PurchaseOrder[] = [];
  poScans: PoScan[] = [];
  dispatches: Dispatch[] = [];
  grnEntries: GrnEntry[] = [];
  claims: Claim[] = [];
  returnReceipts: ReturnReceipt[] = [];
  stockMovements: StockMovement[] = [];
  inwardEntries: InwardEntry[] = [];
  damagedStockActions: DamagedStockAction[] = [];
  staffProfiles: StaffProfile[] = [];
  auditLogs: AuditLogEntry[] = [];
  organizations: Organization[] = [];
  impersonatedOrgId: string | null = null;

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    // Seed initial organizations (PRD 02 & PRD 09)
    this.organizations = [
      {
        id: DEFAULT_ORG_ID,
        name: 'Apex Home Essentials Pvt Ltd',
        category: 'Home & Kitchen',
        phone: '+91 98790 33445',
        email: 'admin@apexessentials.in',
        gstin: '24AAACA9876Q1Z5',
        state: 'Gujarat',
        status: 'active',
        plan: 'pro',
        ownerName: 'Apex Owner',
        usersCount: 8,
        lastActive: 'Just now',
        hideRatesFromStaff: false,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Green Leaf Organics',
        category: 'Manufacturing',
        phone: '+91 98250 88776',
        email: 'contact@greenleaforganics.in',
        gstin: '27AABCU9876Q1Z9',
        state: 'Maharashtra',
        status: 'pending',
        plan: 'free',
        ownerName: 'Pooja Patil',
        usersCount: 2,
        lastActive: 'Yesterday',
        hideRatesFromStaff: true,
        createdAt: '2026-11-15T10:00:00Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Urban Trends Clothing',
        category: 'Clothing',
        phone: '+91 99000 12345',
        email: 'admin@urbantrends.co',
        gstin: '29AAACU1234P1Z3',
        state: 'Karnataka',
        status: 'active',
        plan: 'business',
        ownerName: 'Karthik Rao',
        usersCount: 24,
        lastActive: '2 days ago',
        hideRatesFromStaff: false,
        createdAt: '2026-10-10T00:00:00Z',
      },
    ];

    // Seed initial suppliers
    this.suppliers = [
      { id: 'sup-1', orgId: this.orgId, name: 'Bharat Plastics & Brushes', gstin: '24AAACB1234D1Z2', state: 'Gujarat', phone: '+91 98250 11223' },
      { id: 'sup-2', orgId: this.orgId, name: 'Apex Home Essentials Factory', gstin: '24AAACA9876Q1Z5', state: 'Gujarat', phone: '+91 98790 33445' },
    ];

    // Seed initial warehouse location
    this.channelLocations = [
      {
        id: 'loc-1',
        orgId: this.orgId,
        channel: 'blinkit',
        name: 'BCPL - Kundli Feeder Warehouse',
        address: 'Plot No. 182-184, Phase 4, Sector 57, HSIIDC Industrial Area, Kundli',
        city: 'Sonipat',
        state: 'Haryana',
        gstin: '06AABCB4321P1ZT',
      },
      {
        id: 'loc-2',
        orgId: this.orgId,
        channel: 'blinkit',
        name: 'BCPL - Farukhnagar Warehouse',
        address: 'Khasra No 45/12, Farukhnagar',
        city: 'Gurugram',
        state: 'Haryana',
        gstin: '06AABCB4321P1ZT',
      },
    ];

    // Seed the 18 products from the real Blinkit RO specification
    const sampleProductSpecs = [
      { code: "10297924", upc: "21713050", iname: "3-in-1 Floor Wiper Brush", oname: "3-in-1 Floor Cleaning Brush with Wiper", sku: "WIPER-3IN1", mrp: 499, hsn: "96039000", initGood: 300 },
      { code: "10297925", upc: "21713051", iname: "Sink Brush Small", oname: "Kitchen Sink Cleaning Brush", sku: "SINK-BRUSH-SM", mrp: 199, hsn: "96039000", initGood: 200 },
      { code: "10297926", upc: "21713052", iname: "Kitchen Containers 6pc", oname: "Airtight Plastic Kitchen Containers Set of 6", sku: "CONT-SET-6", mrp: 899, hsn: "39241010", initGood: 150 },
      { code: "10297927", upc: "21713053", iname: "Silicone Scrub Gloves", oname: "Silicone Dish Washing Scrub Gloves", sku: "GLOVES-SCRUB", mrp: 299, hsn: "39249090", initGood: 180 },
      { code: "10297928", upc: "21713054", iname: "Spin Mop Bucket Set", oname: "Microfiber Spin Mop with Bucket Set", sku: "MOP-SPIN-BUCKET", mrp: 1799, hsn: "96039000", initGood: 100 },
      { code: "10297929", upc: "21713055", iname: "Kitchen Paper Towel", oname: "Kitchen Paper Towel Roll 2-Ply", sku: "TOWEL-ROLL-2P", mrp: 150, hsn: "48182000", initGood: 250 },
      { code: "10297930", upc: "21713056", iname: "Drain Hair Catcher 4pc", oname: "Multipurpose Drain Hair Catcher", sku: "DRAIN-CATCH-4", mrp: 149, hsn: "39249090", initGood: 160 },
      { code: "10297931", upc: "21713057", iname: "Oil Bottle 500ml", oname: "Oil Dispenser Bottle with Measurement", sku: "OIL-DISP-500", mrp: 399, hsn: "39241090", initGood: 140 },
      { code: "10297932", upc: "21713058", iname: "Veg Chopper Manual", oname: "Vegetable and Fruit Chopper Hand Pull", sku: "CHOPPER-PULL", mrp: 549, hsn: "39241090", initGood: 150 },
      { code: "10297933", upc: "21713059", iname: "Door Trash Can 9L", oname: "Over The Cabinet Door Trash Can", sku: "TRASH-CAB-9L", mrp: 699, hsn: "39249090", initGood: 90 },
      { code: "10297934", upc: "21713060", iname: "Steel Sponge 6pc", oname: "Stainless Steel Sponge Scrubber Pack", sku: "STEEL-SCRUB-6", mrp: 160, hsn: "73239390", initGood: 130 },
      { code: "10297935", upc: "21713061", iname: "Spice Rack 16 Jar", oname: "Rotating Spice Rack Organizer", sku: "SPICE-ROT-16", mrp: 1499, hsn: "39249090", initGood: 70 },
      { code: "10297936", upc: "21713062", iname: "Floor Wiper Heavy", oname: "Heavy Duty Floor Squeegee Wiper", sku: "WIPER-HEAVY", mrp: 349, hsn: "96039000", initGood: 100 },
      { code: "10297937", upc: "21713063", iname: "Ice Cube Tray Lid", oname: "Silicone Ice Cube Tray with Lid", sku: "ICE-TRAY-LID", mrp: 299, hsn: "39241010", initGood: 80 },
      { code: "10297938", upc: "21713064", iname: "Egg Box 24", oname: "Egg Storage Box for Refrigerator", sku: "EGG-BOX-24", mrp: 499, hsn: "39241090", initGood: 70 },
      { code: "10297939", upc: "21713065", iname: "Corner Caddy 2pc", oname: "Adhesive Corner Shower Caddy", sku: "CADDY-CORN-2", mrp: 799, hsn: "39249090", initGood: 60 },
      { code: "10297940", upc: "21713066", iname: "Window Glass Spray", oname: "Window Glass Cleaner Spray Brush", sku: "WINDOW-SPRAY-BR", mrp: 399, hsn: "96039000", initGood: 70 },
      { code: "10297941", upc: "21713067", iname: "Silicone Spatula 6pc", oname: "Non-Stick Heat Resistant Silicone Spatula Set", sku: "SPATULA-SET-6", mrp: 1299, hsn: "39249090", initGood: 60 },
    ];

    sampleProductSpecs.forEach((sp, idx) => {
      const prodId = `prod-${idx + 1}`;
      this.products.push({
        id: prodId,
        orgId: this.orgId,
        internalName: sp.iname,
        officialName: sp.oname,
        sku: sp.sku,
        upc: sp.upc,
        hsn: sp.hsn,
        mrp: sp.mrp,
        gstPercent: 18,
        unit: 'pc',
        category: 'Home & Kitchen',
        isActive: true,
      });

      this.channelItemMap.push({
        id: `cim-${idx + 1}`,
        orgId: this.orgId,
        productId: prodId,
        channel: 'blinkit',
        channelItemCode: sp.code,
        channelItemName: sp.oname,
      });

      // Initial good stock in ledger
      this.stockMovements.push({
        id: `sm-init-${idx + 1}`,
        orgId: this.orgId,
        productId: prodId,
        bucket: 'good',
        qty: sp.initGood,
        reason: 'inward',
        refTable: 'initial_stock',
        refId: prodId,
        userName: 'System Init',
        createdAt: new Date().toISOString(),
      });
    });

    // Seed some initial damaged stock for demo/disposal testing
    this.stockMovements.push({
      id: 'sm-init-dam-1',
      orgId: this.orgId,
      productId: 'prod-1',
      bucket: 'damaged',
      qty: 12,
      reason: 'inward',
      refTable: 'inward_entries',
      refId: 'inw-seed-1',
      userName: 'System Init',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    });

    this.stockMovements.push({
      id: 'sm-init-dam-2',
      orgId: this.orgId,
      productId: 'prod-2',
      bucket: 'damaged',
      qty: 8,
      reason: 'return_damaged',
      refTable: 'return_receipts',
      refId: 'ret-seed-1',
      userName: 'System Init',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    });

    // Seed initial staff
    this.staffProfiles = [
      { id: 'st-1', orgId: this.orgId, name: 'Ravi Kumar', phone: '9876543210', role: 'user', isActive: true, pin: '1234', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
      { id: 'st-2', orgId: this.orgId, name: 'Priya Sharma', phone: '9876543211', role: 'user', isActive: true, pin: '4321', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
      { id: 'st-3', orgId: this.orgId, name: 'Amit Verma', phone: '9876543212', role: 'user', isActive: true, pin: '1122', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    ];

    // Seed initial inward entries
    this.inwardEntries = [
      {
        id: 'inw-seed-1',
        orgId: this.orgId,
        supplierId: 'sup-1',
        supplierName: 'Bharat Plastics & Brushes',
        docType: 'bill',
        docNo: 'BILL-8821',
        docDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        vehicleNo: 'GJ-01-AB-1234',
        totalTaxable: 12711.86,
        totalCgst: 1144.07,
        totalSgst: 1144.07,
        totalIgst: 0,
        totalAmount: 15000,
        items: [
          {
            id: 'ini-1',
            entryId: 'inw-seed-1',
            productId: 'prod-1',
            receivedQty: 100,
            goodQty: 88,
            damagedQty: 12,
            damageReason: 'Carton crushed in transit',
            rate: 150,
            gstPercent: 18,
            taxableAmount: 12711.86,
            cgstAmount: 1144.07,
            sgstAmount: 1144.07,
            igstAmount: 0,
            totalAmount: 15000,
          },
        ],
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'inw-seed-2',
        orgId: this.orgId,
        supplierId: 'sup-2',
        supplierName: 'Apex Home Essentials Factory',
        docType: 'bill',
        docNo: 'BILL-7712',
        docDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        vehicleNo: 'GJ-01-CD-5678',
        totalTaxable: 13559.32,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 2440.68,
        totalAmount: 16000,
        items: [
          {
            id: 'ini-2',
            entryId: 'inw-seed-2',
            productId: 'prod-2',
            receivedQty: 200,
            goodQty: 200,
            damagedQty: 0,
            rate: 80,
            gstPercent: 18,
            taxableAmount: 13559.32,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 2440.68,
            totalAmount: 16000,
          },
        ],
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ];

    // Seed initial scans for staff productivity tracking
    const now = Date.now();
    this.poScans = [
      { id: 'scan-s1', poItemId: 'poi-1', poId: 'po-sample', userName: 'Ravi Kumar', qty: 10, scannedCode: '21713050', isVoided: false, createdAt: new Date(now - 3600000 * 5).toISOString() },
      { id: 'scan-s2', poItemId: 'poi-1', poId: 'po-sample', userName: 'Ravi Kumar', qty: 15, scannedCode: '21713050', isVoided: false, createdAt: new Date(now - 3600000 * 4).toISOString() },
      { id: 'scan-s3', poItemId: 'poi-2', poId: 'po-sample', userName: 'Ravi Kumar', qty: 5, scannedCode: '21713051', isVoided: true, voidReason: 'Double scan', voidedAt: new Date(now - 3600000 * 3.5).toISOString(), createdAt: new Date(now - 3600000 * 3.8).toISOString() },
      { id: 'scan-s4', poItemId: 'poi-2', poId: 'po-sample', userName: 'Priya Sharma', qty: 25, scannedCode: '21713051', isVoided: false, createdAt: new Date(now - 3600000 * 3).toISOString() },
      { id: 'scan-s5', poItemId: 'poi-3', poId: 'po-sample', userName: 'Priya Sharma', qty: 20, scannedCode: '21713052', isVoided: false, createdAt: new Date(now - 3600000 * 2).toISOString() },
      { id: 'scan-s6', poItemId: 'poi-4', poId: 'po-sample', userName: 'Amit Verma', qty: 12, scannedCode: '21713053', isVoided: false, createdAt: new Date(now - 3600000 * 1.5).toISOString() },
      { id: 'scan-s7', poItemId: 'poi-4', poId: 'po-sample', userName: 'Amit Verma', qty: 2, scannedCode: '21713053', isVoided: true, voidReason: 'Damaged item removed', voidedAt: new Date(now - 3600000 * 1.2).toISOString(), createdAt: new Date(now - 3600000 * 1.3).toISOString() },
      { id: 'scan-s8', poItemId: 'poi-5', poId: 'po-sample', userName: 'Admin User', qty: 30, scannedCode: '21713054', isVoided: false, createdAt: new Date(now - 3600000 * 1).toISOString() },
    ];

    // Seed audit logs
    this.auditLogs = [
      { id: 'aud-1', orgId: this.orgId, action: 'system_initialized', entity: 'system', userName: 'System', userRole: 'superadmin', details: { msg: 'Apex Essentials tenant initialized with 18 SKUs' }, createdAt: new Date(now - 86400000 * 10).toISOString() },
      { id: 'aud-2', orgId: this.orgId, action: 'inward_posted', entity: 'inward_entry', entityId: 'inw-seed-1', userName: 'Admin User', userRole: 'admin', details: { docNo: 'BILL-8821', supplier: 'Bharat Plastics & Brushes', receivedQty: 100, goodQty: 88, damagedQty: 12 }, createdAt: new Date(now - 86400000 * 4).toISOString() },
      { id: 'aud-3', orgId: this.orgId, action: 'inward_posted', entity: 'inward_entry', entityId: 'inw-seed-2', userName: 'Admin User', userRole: 'admin', details: { docNo: 'BILL-7712', supplier: 'Apex Home Essentials Factory', receivedQty: 200, goodQty: 200, damagedQty: 0 }, createdAt: new Date(now - 86400000 * 3).toISOString() },
      { id: 'aud-4', orgId: this.orgId, action: 'staff_scan', entity: 'po_scan', entityId: 'scan-s1', userName: 'Ravi Kumar', userRole: 'user', details: { upc: '21713050', qty: 10 }, createdAt: new Date(now - 3600000 * 5).toISOString() },
      { id: 'aud-5', orgId: this.orgId, action: 'scan_voided', entity: 'po_scan', entityId: 'scan-s3', userName: 'Ravi Kumar', userRole: 'user', details: { reason: 'Double scan', voidedQty: 5 }, createdAt: new Date(now - 3600000 * 3.5).toISOString() },
    ];
  }

  // Stock Summary View calculation
  getStockSummary(): StockSummaryItem[] {
    return this.products.map(p => {
      const movements = this.stockMovements.filter(sm => sm.productId === p.id && sm.orgId === this.orgId);
      
      const good = movements.filter(m => m.bucket === 'good').reduce((s, m) => s + m.qty, 0);
      const reserved = movements.filter(m => m.bucket === 'reserved').reduce((s, m) => s + m.qty, 0);
      const damaged = movements.filter(m => m.bucket === 'damaged').reduce((s, m) => s + m.qty, 0);
      const inTransit = movements.filter(m => m.bucket === 'in_transit').reduce((s, m) => s + m.qty, 0);
      const returnPending = movements.filter(m => m.bucket === 'return_pending').reduce((s, m) => s + m.qty, 0);
      const writtenOff = movements.filter(m => m.bucket === 'written_off').reduce((s, m) => s + m.qty, 0);
      const available = good - reserved;

      return {
        productId: p.id,
        internalName: p.internalName,
        officialName: p.officialName,
        sku: p.sku,
        upc: p.upc,
        mrp: p.mrp,
        good,
        reserved,
        available,
        damaged,
        inTransit,
        returnPending,
        writtenOff,
      };
    });
  }

  // Lookup product by Item Code or UPC
  findProductMapping(itemCode: string, upc?: string): { product?: Product; matchedBy: 'itemCode' | 'upc' | 'none' } {
    // 1. Try channel_item_map
    const cim = this.channelItemMap.find(m => m.channel === 'blinkit' && m.channelItemCode === itemCode);
    if (cim) {
      const p = this.products.find(prod => prod.id === cim.productId);
      if (p) return { product: p, matchedBy: 'itemCode' };
    }

    // 2. Try products.upc
    if (upc) {
      const p = this.products.find(prod => prod.upc === upc);
      if (p) return { product: p, matchedBy: 'upc' };
    }

    return { matchedBy: 'none' };
  }

  // Map channel item to product
  mapChannelItem(channelItemCode: string, productId: string, channelItemName?: string) {
    const existing = this.channelItemMap.find(m => m.channel === 'blinkit' && m.channelItemCode === channelItemCode);
    if (existing) {
      existing.productId = productId;
      if (channelItemName) existing.channelItemName = channelItemName;
    } else {
      this.channelItemMap.push({
        id: `cim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orgId: this.orgId,
        productId,
        channel: 'blinkit',
        channelItemCode,
        channelItemName,
      });
    }
  }

  // Create product and map it
  createProductAndMap(item: {
    internalName: string;
    officialName: string;
    sku: string;
    upc: string;
    hsn: string;
    mrp: number;
    gstPercent: number;
    channelItemCode: string;
  }): Product {
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      orgId: this.orgId,
      internalName: item.internalName,
      officialName: item.officialName,
      sku: item.sku,
      upc: item.upc,
      hsn: item.hsn,
      mrp: item.mrp,
      gstPercent: item.gstPercent,
      unit: 'pc',
      category: 'Home & Kitchen',
      isActive: true,
    };
    this.products.push(newProd);
    this.mapChannelItem(item.channelItemCode, newProd.id, item.officialName);
    return newProd;
  }

  // Import Blinkit R.O.
  importBlinkitRo(params: {
    header: any;
    items: any[];
    sourceFiles?: any;
  }): PurchaseOrder {
    const existing = this.purchaseOrders.find(po => po.poNumber === params.header.roNumber);
    if (existing) {
      throw new Error(`Duplicate R.O. Number: R.O. #${params.header.roNumber} already exists.`);
    }

    // Find or create channel_locations record for warehouse
    let loc = this.channelLocations.find(l => l.name.toLowerCase() === params.header.deliveryLocation.toLowerCase());
    if (!loc) {
      loc = {
        id: `loc-${Date.now()}`,
        orgId: this.orgId,
        channel: 'blinkit',
        name: params.header.deliveryLocation,
        address: params.header.deliveryAddress,
        gstin: params.header.buyerGstin,
      };
      this.channelLocations.push(loc);
    }

    const supplyType = params.header.supplyType || deriveSupplyType(params.header.buyerGstin, params.header.sellerGstin);
    const poId = `po-${Date.now()}`;

    const poItems: PoItem[] = params.items.map((it, idx) => {
      const mapping = this.findProductMapping(it.itemCode, it.upc);
      return {
        id: `poi-${poId}-${idx + 1}`,
        poId,
        productId: mapping.product?.id,
        channelItemCode: it.itemCode,
        blinkitUpc: it.upc,
        hsn: it.hsn,
        grammage: it.grammage || '',
        itemName: it.description,
        requestedQty: it.quantity,
        reservedQty: 0,
        scannedQty: 0,
        dispatchedQty: 0,
        landingRate: it.landingRate,
        mrp: it.mrp,
        cgstPct: it.cgstPct,
        sgstPct: it.sgstPct,
        igstPct: it.igstPct,
        cessPct: it.cessPct,
        taxPerUnit: it.taxAmount,
        lineTotal: it.totalAmount,
      };
    });

    const totalQty = poItems.reduce((s, i) => s + i.requestedQty, 0);
    const netAmount = poItems.reduce((s, i) => s + i.lineTotal, 0);

    const isExpired = params.header.validTill && new Date(params.header.validTill) < new Date();

    const po: PurchaseOrder = {
      id: poId,
      orgId: this.orgId,
      channel: 'blinkit',
      poNumber: params.header.roNumber,
      roType: params.header.roType || 'Seller Hub STO',
      sellerNo: params.header.sellerNo || '',
      poDate: params.header.roDate || new Date().toISOString().split('T')[0],
      validTill: params.header.validTill || '',
      deliveryLocation: params.header.deliveryLocation,
      deliveryLocationId: loc.id,
      buyerGstin: params.header.buyerGstin,
      sellerGstin: params.header.sellerGstin,
      supplyType,
      spocName: params.header.spocName || '',
      spocPhone: params.header.spocPhone || '',
      totalQty,
      totalItems: poItems.length,
      netAmount,
      status: isExpired ? 'expired' : 'new',
      sourceFiles: params.sourceFiles,
      items: poItems,
      createdAt: new Date().toISOString(),
    };

    this.purchaseOrders.push(po);

    // Call reserve_po if not expired
    if (!isExpired) {
      this.reservePo(poId);
    }

    return po;
  }

  // RPC: reserve_po(po_id)
  reservePo(poId: string): { poId: string; totalShortfall: number; lines: any[] } {
    const po = this.purchaseOrders.find(p => p.id === poId);
    if (!po) throw new Error(`PO ${poId} not found`);

    let totalShortfall = 0;
    const lines: any[] = [];

    for (const item of po.items) {
      if (item.productId) {
        const summary = this.getStockSummary().find(s => s.productId === item.productId);
        const available = summary ? summary.available : 0;
        const needed = item.requestedQty - item.reservedQty;
        const toReserve = Math.min(Math.max(needed, 0), Math.max(available, 0));

        if (toReserve > 0) {
          this.stockMovements.push({
            id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            orgId: this.orgId,
            productId: item.productId,
            bucket: 'reserved',
            qty: toReserve,
            reason: 'reserve',
            refTable: 'purchase_orders',
            refId: poId,
            userName: this.currentUser.name,
            createdAt: new Date().toISOString(),
          });
          item.reservedQty += toReserve;
        }

        const short = Math.max(item.requestedQty - item.reservedQty, 0);
        totalShortfall += short;
        lines.push({
          poItemId: item.id,
          productId: item.productId,
          requested: item.requestedQty,
          reserved: item.reservedQty,
          shortfall: short,
        });
      }
    }

    po.status = totalShortfall === 0 ? 'reserved' : 'new';
    return { poId, totalShortfall, lines };
  }

  // RPC: release_po(po_id, reason)
  releasePo(poId: string, reason: string) {
    const po = this.purchaseOrders.find(p => p.id === poId);
    if (!po) throw new Error('PO not found');

    for (const item of po.items) {
      if (item.productId && item.reservedQty > 0) {
        this.stockMovements.push({
          id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'reserved',
          qty: -item.reservedQty,
          reason: 'release',
          refTable: 'purchase_orders',
          refId: poId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
        item.reservedQty = 0;
      }
    }
    po.status = 'cancelled';
  }

  // RPC: scan_item
  scanItem(params: {
    poItemId: string;
    scannedCode: string;
    qty?: number;
    userName?: string;
  }): { scannedQty: number; requestedQty: number; remainingQty: number } {
    const qty = params.qty || 1;
    const po = this.purchaseOrders.find(p => p.items.some(it => it.id === params.poItemId));
    if (!po) throw new Error('PO not found');

    const item = po.items.find(it => it.id === params.poItemId);
    if (!item) throw new Error('PO Item not found');

    // Verify barcode matches UPC
    const prod = item.productId ? this.products.find(p => p.id === item.productId) : undefined;
    const validCodes = [item.blinkitUpc, item.channelItemCode, prod?.upc].filter(Boolean);
    if (validCodes.length > 0 && !validCodes.includes(params.scannedCode)) {
      throw new Error(`Scanned code ${params.scannedCode} does not match PO UPC ${item.blinkitUpc}`);
    }

    // Over-quantity check
    const newScanned = item.scannedQty + qty;
    if (newScanned > item.requestedQty) {
      throw new Error(`Over quantity: PO needs ${item.requestedQty}, already scanned ${item.scannedQty}, trying to add ${qty}.`);
    }

    item.scannedQty = newScanned;
    if (po.status === 'new' || po.status === 'reserved') {
      po.status = 'in_progress';
    }

    const scanRecord: PoScan = {
      id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      poItemId: item.id,
      poId: po.id,
      userName: params.userName || this.currentUser.name,
      qty,
      scannedCode: params.scannedCode,
      isVoided: false,
      createdAt: new Date().toISOString(),
    };
    this.poScans.push(scanRecord);

    this.logAudit('item_scanned', 'po_scan', scanRecord.id, {
      poId: po.id,
      poNumber: po.poNumber,
      upc: params.scannedCode,
      qty,
      scannedBy: params.userName || this.currentUser.name,
    });

    return {
      scannedQty: item.scannedQty,
      requestedQty: item.requestedQty,
      remainingQty: item.requestedQty - item.scannedQty,
    };
  }

  // RPC: void_scan
  voidScan(scanId: string, reason: string) {
    const scan = this.poScans.find(s => s.id === scanId);
    if (!scan || scan.isVoided) throw new Error('Scan not found or already voided');

    const po = this.purchaseOrders.find(p => p.id === scan.poId);
    const item = po?.items.find(i => i.id === scan.poItemId);
    if (item) {
      item.scannedQty = Math.max(item.scannedQty - scan.qty, 0);
    }

    scan.isVoided = true;
    scan.voidedAt = new Date().toISOString();
    scan.voidReason = reason;

    this.logAudit('scan_voided', 'po_scan', scan.id, {
      poId: scan.poId,
      reason,
      voidedQty: scan.qty,
      voidedBy: this.currentUser.name,
    });
  }

  // RPC: close_dispatch
  closeDispatch(params: {
    poId: string;
    invoiceNo: string;
    invoiceDate?: string;
    cartons: number;
    cartonsPerLine?: Record<string, number>;
    vehicleNo?: string;
    transporter?: string;
    lrNo?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    shortfallReason?: string;
  }): Dispatch {
    const po = this.purchaseOrders.find(p => p.id === params.poId);
    if (!po) throw new Error('PO not found');

    const hasShortfall = po.items.some(i => i.scannedQty < i.requestedQty);
    if (hasShortfall && (!params.shortfallReason || params.shortfallReason.trim() === '')) {
      throw new Error('Closing dispatch with shortfall requires an Admin shortfall reason.');
    }

    const dispatchId = `disp-${Date.now()}`;
    const dispatchItems: Array<{ poItemId: string; qty: number }> = [];

    for (const item of po.items) {
      if (item.scannedQty > 0 && item.productId) {
        dispatchItems.push({ poItemId: item.id, qty: item.scannedQty });

        // Ledger: good -= scanned, reserved -= min(reserved, scanned), in_transit += scanned
        this.stockMovements.push({
          id: `sm-disp-g-${Date.now()}-${item.id}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'good',
          qty: -item.scannedQty,
          reason: 'dispatch',
          refTable: 'dispatches',
          refId: dispatchId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });

        const releaseReserved = Math.min(item.reservedQty, item.scannedQty);
        if (releaseReserved > 0) {
          this.stockMovements.push({
            id: `sm-disp-r-${Date.now()}-${item.id}`,
            orgId: this.orgId,
            productId: item.productId,
            bucket: 'reserved',
            qty: -releaseReserved,
            reason: 'dispatch',
            refTable: 'dispatches',
            refId: dispatchId,
            userName: this.currentUser.name,
            createdAt: new Date().toISOString(),
          });
        }

        this.stockMovements.push({
          id: `sm-disp-it-${Date.now()}-${item.id}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'in_transit',
          qty: item.scannedQty,
          reason: 'dispatch',
          refTable: 'dispatches',
          refId: dispatchId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });

        item.dispatchedQty += item.scannedQty;
        item.reservedQty = Math.max(item.reservedQty - item.scannedQty, 0);
      }
    }

    const dispatch: Dispatch = {
      id: dispatchId,
      poId: params.poId,
      invoiceNo: params.invoiceNo,
      invoiceDate: params.invoiceDate || new Date().toISOString().split('T')[0],
      cartons: params.cartons,
      cartonsPerLine: params.cartonsPerLine,
      vehicleNo: params.vehicleNo,
      transporter: params.transporter,
      lrNo: params.lrNo,
      appointmentDate: params.appointmentDate,
      appointmentTime: params.appointmentTime,
      appointmentBooked: Boolean(params.appointmentDate),
      dispatchedAt: new Date().toISOString(),
      items: dispatchItems,
    };

    this.dispatches.push(dispatch);
    po.status = hasShortfall ? 'partly_dispatched' : 'dispatched';

    return dispatch;
  }

  // RPC: post_inward
  postInward(entry: {
    supplierId: string;
    docType: 'bill' | 'challan';
    docNo: string;
    docDate: string;
    vehicleNo?: string;
    items: Array<{
      productId: string;
      receivedQty: number;
      goodQty: number;
      damagedQty: number;
      damageReason?: string;
      rate: number;
      gstPercent: number;
    }>;
  }) {
    const entryId = `inw-${Date.now()}`;
    const supplier = this.suppliers.find(s => s.id === entry.supplierId);
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalAmount = 0;

    const inwardItems: InwardItem[] = [];

    for (const item of entry.items) {
      if (item.goodQty + item.damagedQty !== item.receivedQty) {
        throw new Error(`Inward validation error: Good (${item.goodQty}) + Damaged (${item.damagedQty}) must equal Received (${item.receivedQty})`);
      }

      const taxable = item.receivedQty * item.rate;
      const isInterState = supplier?.state && supplier.state.toLowerCase() !== 'gujarat';
      const taxRate = item.gstPercent / 100;
      const totalTax = taxable * taxRate;
      const cgst = isInterState ? 0 : totalTax / 2;
      const sgst = isInterState ? 0 : totalTax / 2;
      const igst = isInterState ? totalTax : 0;
      const lineTotal = taxable + totalTax;

      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalAmount += lineTotal;

      inwardItems.push({
        id: `ini-${entryId}-${inwardItems.length + 1}`,
        entryId,
        productId: item.productId,
        receivedQty: item.receivedQty,
        goodQty: item.goodQty,
        damagedQty: item.damagedQty,
        damageReason: item.damageReason,
        rate: item.rate,
        gstPercent: item.gstPercent,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: lineTotal,
      });

      if (item.goodQty > 0) {
        this.stockMovements.push({
          id: `sm-inw-g-${Date.now()}-${item.productId}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'good',
          qty: item.goodQty,
          reason: 'inward',
          refTable: 'inward_entries',
          refId: entryId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }

      if (item.damagedQty > 0) {
        this.stockMovements.push({
          id: `sm-inw-d-${Date.now()}-${item.productId}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'damaged',
          qty: item.damagedQty,
          reason: 'inward',
          refTable: 'inward_entries',
          refId: entryId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const inwardRecord: InwardEntry = {
      id: entryId,
      orgId: this.orgId,
      supplierId: entry.supplierId,
      supplierName: supplier?.name || 'Supplier',
      docType: entry.docType,
      docNo: entry.docNo,
      docDate: entry.docDate,
      vehicleNo: entry.vehicleNo,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalAmount,
      items: inwardItems,
      createdAt: new Date().toISOString(),
    };
    this.inwardEntries.unshift(inwardRecord);

    this.logAudit('inward_posted', 'inward_entry', entryId, {
      docNo: entry.docNo,
      supplier: supplier?.name,
      totalAmount,
      itemsCount: entry.items.length,
    });

    // Auto-allocate waiting POs
    this.allocateWaitingPos();

    return entryId;
  }

  // RPC: allocate_waiting_pos
  allocateWaitingPos(): number {
    let allocated = 0;
    const openPos = this.purchaseOrders
      .filter(p => p.status === 'new' || p.status === 'reserved')
      .sort((a, b) => new Date(a.poDate).getTime() - new Date(b.poDate).getTime());

    for (const po of openPos) {
      this.reservePo(po.id);
      allocated++;
    }
    return allocated;
  }

  // RPC: dispose_damaged
  disposeDamaged(params: {
    productId: string;
    qty: number;
    action: 'repaired' | 'returned_to_supplier' | 'discarded';
    notes?: string;
  }): DamagedStockAction {
    if (params.qty <= 0) {
      throw new Error(`Quantity must be greater than 0, got ${params.qty}`);
    }

    const summary = this.getStockSummary().find(s => s.productId === params.productId);
    if (!summary) throw new Error('Product not found');

    if (summary.damaged < params.qty) {
      throw new Error(`Cannot dispose ${params.qty} units. Only ${summary.damaged} damaged units available.`);
    }

    const actionId = `dsa-${Date.now()}`;

    // 1. Deduct from damaged bucket
    this.stockMovements.push({
      id: `sm-dsa-d-${Date.now()}-${params.productId}`,
      orgId: this.orgId,
      productId: params.productId,
      bucket: 'damaged',
      qty: -params.qty,
      reason: params.action,
      refTable: 'damaged_stock_actions',
      refId: actionId,
      userName: this.currentUser.name,
      createdAt: new Date().toISOString(),
    });

    // 2. Add to destination bucket
    if (params.action === 'repaired') {
      // Repaired stock goes back to good ATP
      this.stockMovements.push({
        id: `sm-dsa-g-${Date.now()}-${params.productId}`,
        orgId: this.orgId,
        productId: params.productId,
        bucket: 'good',
        qty: params.qty,
        reason: 'repaired',
        refTable: 'damaged_stock_actions',
        refId: actionId,
        userName: this.currentUser.name,
        createdAt: new Date().toISOString(),
      });
      // Good stock increased; allocate to waiting POs
      this.allocateWaitingPos();
    } else {
      // returned_to_supplier or discarded goes to written_off
      this.stockMovements.push({
        id: `sm-dsa-w-${Date.now()}-${params.productId}`,
        orgId: this.orgId,
        productId: params.productId,
        bucket: 'written_off',
        qty: params.qty,
        reason: params.action,
        refTable: 'damaged_stock_actions',
        refId: actionId,
        userName: this.currentUser.name,
        createdAt: new Date().toISOString(),
      });
    }

    const rec: DamagedStockAction = {
      id: actionId,
      orgId: this.orgId,
      productId: params.productId,
      productName: summary.officialName,
      qty: params.qty,
      action: params.action,
      notes: params.notes,
      performedBy: this.currentUser.name,
      createdAt: new Date().toISOString(),
    };
    this.damagedStockActions.unshift(rec);

    this.logAudit('damaged_stock_disposal', 'product', rec.id, {
      product: summary.officialName,
      action: params.action,
      qty: params.qty,
      notes: params.notes,
    });

    return rec;
  }

  // Audit logging helper
  logAudit(action: string, entity: string, entityId?: string, details?: Record<string, any>) {
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orgId: this.orgId,
      action,
      entity,
      entityId,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  // Organization and Multi-Tenancy Management (PRD 02 & PRD 09)
  registerOrganization(data: {
    businessName: string;
    ownerName: string;
    phone: string;
    email: string;
    category: 'Home & Kitchen' | 'Clothing' | 'Manufacturing' | 'Other';
    gstin?: string;
    state: string;
  }): Organization {
    const existing = this.organizations.find(
      o => o.email?.toLowerCase() === data.email.toLowerCase() || o.name.toLowerCase() === data.businessName.toLowerCase()
    );
    if (existing) {
      throw new Error(`Business "${data.businessName}" or email "${data.email}" is already registered.`);
    }

    const org: Organization = {
      id: `org-${Date.now()}`,
      name: data.businessName,
      category: data.category,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      state: data.state,
      status: 'pending',
      plan: 'free',
      ownerName: data.ownerName,
      usersCount: 1,
      lastActive: 'Just registered',
      hideRatesFromStaff: false,
      createdAt: new Date().toISOString(),
    };

    this.organizations.unshift(org);

    this.logAudit('business_registered', 'organizations', org.id, {
      name: org.name,
      category: org.category,
      owner: org.ownerName,
      status: 'pending',
    });

    return org;
  }

  approveOrganization(orgId: string): Organization {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organization not found');
    org.status = 'active';

    this.logAudit('business_approved', 'organizations', org.id, {
      name: org.name,
      approvedBy: this.currentUser.name,
    });

    return org;
  }

  blockOrganization(orgId: string): Organization {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organization not found');
    org.status = 'blocked';

    this.logAudit('business_blocked', 'organizations', org.id, {
      name: org.name,
      blockedBy: this.currentUser.name,
    });

    return org;
  }

  unblockOrganization(orgId: string): Organization {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organization not found');
    org.status = 'active';

    this.logAudit('business_unblocked', 'organizations', org.id, {
      name: org.name,
      unblockedBy: this.currentUser.name,
    });

    return org;
  }

  impersonateOrganization(orgId: string): Organization {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organization not found');
    this.impersonatedOrgId = org.id;

    this.logAudit('superadmin_view_as', 'organizations', org.id, {
      viewedOrg: org.name,
      superadmin: this.currentUser.name,
      mode: 'read_only',
    });

    return org;
  }

  stopImpersonating() {
    this.impersonatedOrgId = null;
  }

  setCurrentUser(user: { id: string; name: string; role: 'admin' | 'user' | 'superadmin' }) {
    this.currentUser = user;
  }

  getCurrentOrg(): Organization {
    const targetId = this.impersonatedOrgId || this.orgId;
    const found = this.organizations.find(o => o.id === targetId);
    return found || this.organizations[0];
  }

  // Product CRUD
  createProduct(data: Omit<Product, 'id' | 'orgId' | 'isActive'>): Product {
    const existing = this.products.find(
      p => (data.upc && p.upc === data.upc) || (data.sku && p.sku === data.sku)
    );
    if (existing) {
      if (data.upc && existing.upc === data.upc) throw new Error(`Duplicate UPC: ${data.upc}`);
      throw new Error(`Duplicate SKU: ${data.sku}`);
    }
    const product: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orgId: this.orgId,
      isActive: true,
      ...data,
    };
    this.products.push(product);
    return product;
  }

  updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'orgId'>>): Product {
    const product = this.products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    // Check dupe UPC/SKU against other products
    if (data.upc && data.upc !== product.upc) {
      const dupe = this.products.find(p => p.id !== id && p.upc === data.upc);
      if (dupe) throw new Error(`Duplicate UPC: ${data.upc}`);
    }
    if (data.sku && data.sku !== product.sku) {
      const dupe = this.products.find(p => p.id !== id && p.sku === data.sku);
      if (dupe) throw new Error(`Duplicate SKU: ${data.sku}`);
    }
    Object.assign(product, data);
    return product;
  }

  addAlias(productId: string, alias: string, source?: string): ProductAlias {
    const a: ProductAlias = {
      id: `alias-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orgId: this.orgId,
      productId,
      alias,
      source,
    };
    this.productAliases.push(a);
    return a;
  }

  deleteAlias(aliasId: string) {
    this.productAliases = this.productAliases.filter(a => a.id !== aliasId);
  }

  addChannelItem(data: Omit<ChannelItemMap, 'id' | 'orgId'>): ChannelItemMap {
    const cim: ChannelItemMap = {
      id: `cim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orgId: this.orgId,
      ...data,
    };
    this.channelItemMap.push(cim);
    return cim;
  }

  deleteChannelItem(id: string) {
    this.channelItemMap = this.channelItemMap.filter(c => c.id !== id);
  }

  addVariant(data: Omit<ProductVariant, 'id'>): ProductVariant {
    const v: ProductVariant = {
      id: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...data,
    };
    this.productVariants.push(v);
    return v;
  }

  // RPC: post_grn
  postGrn(params: {
    poId: string;
    dispatchId?: string;
    grnNo: string;
    grnDate: string;
    deliveryDate: string;
    ticketNo?: string;
    notes?: string;
    items: Array<{
      productId: string;
      poItemId?: string;
      dispatchedQty: number;
      acceptedQty: number;
      rejectedQty: number;
      rejectionReason?: string;
    }>;
  }): GrnEntry {
    const po = this.purchaseOrders.find(p => p.id === params.poId);
    if (!po) throw new Error('PO not found');

    const grnId = `grn-${Date.now()}`;
    const delivery = new Date(params.deliveryDate);
    const deadline = new Date(delivery.getTime() + 10 * 24 * 60 * 60 * 1000);

    const grnItems = params.items.map((item, idx) => {
      const shortQty = item.dispatchedQty - item.acceptedQty - item.rejectedQty;
      if (shortQty < 0) {
        throw new Error(`Accepted (${item.acceptedQty}) + Rejected (${item.rejectedQty}) cannot exceed Dispatched (${item.dispatchedQty})`);
      }

      // Ledger: Accepted -> leaves in_transit
      if (item.acceptedQty > 0) {
        this.stockMovements.push({
          id: `sm-grn-acc-${Date.now()}-${idx}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'in_transit',
          qty: -item.acceptedQty,
          reason: 'inward',
          refTable: 'grn_entries',
          refId: grnId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }

      // Ledger: Rejected -> in_transit to return_pending
      if (item.rejectedQty > 0) {
        this.stockMovements.push({
          id: `sm-grn-rejit-${Date.now()}-${idx}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'in_transit',
          qty: -item.rejectedQty,
          reason: 'grn_reject',
          refTable: 'grn_entries',
          refId: grnId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });

        this.stockMovements.push({
          id: `sm-grn-rejrp-${Date.now()}-${idx}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'return_pending',
          qty: item.rejectedQty,
          reason: 'grn_reject',
          refTable: 'grn_entries',
          refId: grnId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }

      // Shortage -> stays in in_transit as disputed, create Claim
      if (shortQty > 0) {
        const poItem = po.items.find(i => i.id === item.poItemId);
        const rate = poItem?.landingRate || 0;

        this.claims.push({
          id: `claim-${Date.now()}-${idx}`,
          orgId: this.orgId,
          poId: po.id,
          type: 'shortage',
          qty: shortQty,
          amount: shortQty * rate,
          ticketDeadline: deadline.toISOString().split('T')[0],
          ticketNo: params.ticketNo,
          status: 'open',
          notes: 'Shortage at Blinkit warehouse GRN',
          createdAt: new Date().toISOString(),
        });
      }

      return {
        id: `grni-${grnId}-${idx}`,
        productId: item.productId,
        poItemId: item.poItemId,
        dispatchedQty: item.dispatchedQty,
        acceptedQty: item.acceptedQty,
        shortQty,
        rejectedQty: item.rejectedQty,
        rejectionReason: item.rejectionReason,
      };
    });

    const grnEntry: GrnEntry = {
      id: grnId,
      orgId: this.orgId,
      poId: params.poId,
      dispatchId: params.dispatchId,
      grnNo: params.grnNo,
      grnDate: params.grnDate,
      deliveryDate: params.deliveryDate,
      ticketDeadline: deadline.toISOString().split('T')[0],
      ticketNo: params.ticketNo,
      notes: params.notes,
      items: grnItems,
    };

    this.grnEntries.push(grnEntry);
    po.status = 'grn_pending';

    return grnEntry;
  }

  // RPC: resolve_claim
  resolveClaim(claimId: string, resolution: 'settled' | 'found' | 'rejected', notes?: string) {
    const claim = this.claims.find(c => c.id === claimId);
    if (!claim) throw new Error('Claim not found');

    const po = this.purchaseOrders.find(p => p.id === claim.poId);
    const grn = this.grnEntries.find(g => g.poId === claim.poId);
    const grnItem = grn?.items[0]; // representative

    if (resolution === 'settled') {
      // Blinkit pays/credits -> write off from in_transit to written_off
      if (grnItem) {
        this.stockMovements.push({
          id: `sm-claim-wo1-${Date.now()}`,
          orgId: this.orgId,
          productId: grnItem.productId,
          bucket: 'in_transit',
          qty: -claim.qty,
          reason: 'writeoff',
          refTable: 'claims',
          refId: claimId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
        this.stockMovements.push({
          id: `sm-claim-wo2-${Date.now()}`,
          orgId: this.orgId,
          productId: grnItem.productId,
          bucket: 'written_off',
          qty: claim.qty,
          reason: 'writeoff',
          refTable: 'claims',
          refId: claimId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }
      claim.status = 'settled';
      claim.notes = (claim.notes || '') + ' | Settled with credit note';
    } else if (resolution === 'found') {
      // Stock located and accepted
      if (grnItem) {
        this.stockMovements.push({
          id: `sm-claim-fnd-${Date.now()}`,
          orgId: this.orgId,
          productId: grnItem.productId,
          bucket: 'in_transit',
          qty: -claim.qty,
          reason: 'adjustment',
          refTable: 'claims',
          refId: claimId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
        grnItem.acceptedQty += claim.qty;
        grnItem.shortQty = Math.max(grnItem.shortQty - claim.qty, 0);
      }
      claim.status = 'settled';
      claim.notes = (claim.notes || '') + ' | Found and accepted';
    } else if (resolution === 'rejected') {
      // Loss borne by seller
      if (grnItem) {
        this.stockMovements.push({
          id: `sm-claim-rej1-${Date.now()}`,
          orgId: this.orgId,
          productId: grnItem.productId,
          bucket: 'in_transit',
          qty: -claim.qty,
          reason: 'writeoff',
          refTable: 'claims',
          refId: claimId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
        this.stockMovements.push({
          id: `sm-claim-rej2-${Date.now()}`,
          orgId: this.orgId,
          productId: grnItem.productId,
          bucket: 'written_off',
          qty: claim.qty,
          reason: 'writeoff',
          refTable: 'claims',
          refId: claimId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }
      claim.status = 'rejected';
      claim.notes = (claim.notes || '') + ' | Claim rejected by channel';
    }
  }

  // RPC: receive_return
  receiveReturn(params: {
    poId: string;
    dnNo: string;
    pickupTicketNo?: string;
    receivedDate: string;
    items: Array<{
      productId: string;
      expectedQty: number;
      goodQty: number;
      damagedQty: number;
      missingQty: number;
    }>;
  }): ReturnReceipt {
    const recId = `ret-${Date.now()}`;
    const recDate = new Date(params.receivedDate);
    const deadline = new Date(recDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const item of params.items) {
      if (item.goodQty + item.damagedQty + item.missingQty !== item.expectedQty) {
        throw new Error(`Return check failed: good (${item.goodQty}) + damaged (${item.damagedQty}) + missing (${item.missingQty}) must equal expected (${item.expectedQty})`);
      }

      // Deduct from return_pending
      this.stockMovements.push({
        id: `sm-ret-rp-${Date.now()}-${item.productId}`,
        orgId: this.orgId,
        productId: item.productId,
        bucket: 'return_pending',
        qty: -item.expectedQty,
        reason: 'return_good',
        refTable: 'return_receipts',
        refId: recId,
        userName: this.currentUser.name,
        createdAt: new Date().toISOString(),
      });

      // Add good stock
      if (item.goodQty > 0) {
        this.stockMovements.push({
          id: `sm-ret-g-${Date.now()}-${item.productId}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'good',
          qty: item.goodQty,
          reason: 'return_good',
          refTable: 'return_receipts',
          refId: recId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }

      // Add damaged stock
      if (item.damagedQty > 0) {
        this.stockMovements.push({
          id: `sm-ret-d-${Date.now()}-${item.productId}`,
          orgId: this.orgId,
          productId: item.productId,
          bucket: 'damaged',
          qty: item.damagedQty,
          reason: 'return_damaged',
          refTable: 'return_receipts',
          refId: recId,
          userName: this.currentUser.name,
          createdAt: new Date().toISOString(),
        });
      }

      // Missing units become a rejection claim
      if (item.missingQty > 0) {
        this.claims.push({
          id: `claim-ret-${Date.now()}-${item.productId}`,
          orgId: this.orgId,
          poId: params.poId,
          type: 'rejection',
          qty: item.missingQty,
          amount: 0,
          ticketDeadline: deadline.toISOString().split('T')[0],
          status: 'open',
          notes: 'Stock missing from Blinkit return delivery box',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Auto-allocate returned good units to waiting POs
    this.allocateWaitingPos();

    const returnReceipt: ReturnReceipt = {
      id: recId,
      orgId: this.orgId,
      poId: params.poId,
      dnNo: params.dnNo,
      pickupTicketNo: params.pickupTicketNo,
      pickupDeadline: deadline.toISOString().split('T')[0],
      receivedDate: params.receivedDate,
      items: params.items.map(i => ({
        productId: i.productId,
        expectedQty: i.expectedQty,
        receivedQty: i.goodQty + i.damagedQty,
        goodQty: i.goodQty,
        damagedQty: i.damagedQty,
        missingQty: i.missingQty,
      })),
    };

    this.returnReceipts.push(returnReceipt);
    return returnReceipt;
  }
}

// Global Singleton Instance
let storeInstance: InventoryStore | null = null;
export function getInventoryStore(): InventoryStore {
  if (!storeInstance) {
    storeInstance = new InventoryStore();
  }
  return storeInstance;
}
