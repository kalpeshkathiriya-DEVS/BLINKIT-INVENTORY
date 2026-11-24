# 05a Blinkit R.O. File Format (based on your real sample)

Blinkit calls the PO a **Recommended Quantity Order (R.O.)**, issued from Seller Hub. Sample files are in `samples/` (RO 2011710136067, 18 items, 1172 units, Rs 4,15,588). Use them as the test fixture.

## What each file contains
| Data | Excel (.xlsx) | PDF |
|---|---|---|
| Line items table | Yes, clean columns | Yes, but text breaks across lines (hard to parse) |
| R.O. number, date, **expiry date** | **No** | Yes |
| Delivery warehouse and address, Blinkit GST no. | **No** | Yes |
| Seller details, seller no., R.O. type | No | Yes |
| Totals (qty, items, net amount) | Yes (footer rows) | Yes |

**Design decision:** read the **line items from Excel** (reliable). Read the **header from the PDF**. Both are uploaded together. The R.O. number is also the file name (2011710136067), so the app can pre-fill it and warn if the Excel and PDF numbers differ. If the PDF is missing, the Admin fills the header by hand (R.O. no., date, expiry, warehouse). Never block the upload.

## Excel columns (row 1 header, data from row 2)
| Col | Header | Notes from sample |
|---|---|---|
| A | # | Line number |
| B | Item Code | Blinkit item code, e.g. 10297924. **Unique key for mapping.** |
| C | HSN Code | Text, e.g. 96039000 (keep as text) |
| D | Product UPC | Blinkit UPC, e.g. 21713050. This is what staff scan on the carton/unit. Keep as text. |
| E | Product Description | Blinkit's official name (becomes the official name or alias) |
| F | Grammage | e.g. "1 pc", "10 units", "1 roll (18" x 118")" |
| G, H, I | CGST %, SGST %, IGST % | Only one set is filled. Gujarat to Haryana shows **IGST**. A same-state PO would use CGST + SGST. Parser must read all three. |
| J, K | CESS %, Additional CESS | Usually 0 |
| L | Tax Amount | **Per unit** |
| M | Landing Rate | Your selling price per unit to Blinkit, **GST-inclusive** (299 at 5% gives tax 14.24, which is 299 - 299/1.05) |
| N | Quantity | Requested quantity |
| O | MRP | Per unit |
| P | Total Amount | Quantity x Landing Rate (300 x 299 = 89,700) |
| Footer | Total Quantity, Total Items, Total Amount, Cart Discount, Net amount | In columns I/J and O/P, below the last item. **Stop reading items at the first row where # is empty.** |

Columns Q to S exist but are empty. Ignore them. The header names may change slightly, so match headers by name (case-insensitive), not by position.

## PDF header fields to extract
R.O. Number, Date, R.O. Expiry date, R.O. Type (e.g. Seller Hub STO), Seller No., Delivered To (warehouse name and address, e.g. "BCPL - Kundli Feeder Warehouse", Sonipat, Haryana), Blinkit GST no. (state code 06 = Haryana), Seller GST no. (24 = Gujarat), Blinkit SPOC name and phone.
Use `pdf-parse` or `pdfjs-dist` for text, then regex on labels. Show an editable preview so the Admin confirms before saving.

## Validation rules on upload
1. Quantity x Landing Rate = Total Amount per line (flag mismatches)
2. Sum of quantities = Total Quantity, count of lines = Total Items, sum of totals = Net amount
3. Duplicate R.O. number is blocked (shows the existing PO)
4. Every Item Code must map to a product. If it is unmapped, try matching Product UPC, then show the line in red for the Admin to link (saved forever in `channel_item_map`)
5. R.O. expiry in the past is a warning. Default status is `expired` after that date.
6. Warehouse is saved as a `channel_locations` record, so shortage and rejection reports can be grouped by warehouse (Kundli, Farukhnagar, etc.).

## Fields to store (additions to the schema)
- `purchase_orders`: ro_type, seller_no, ro_date, valid_till (expiry), delivery_location_id, buyer_gstin, seller_gstin, supply_type (inter_state or intra_state), spoc_name, spoc_phone, total_qty, total_items, net_amount, source_files
- `po_items`: item_code, blinkit_upc, hsn, grammage, mrp, landing_rate (inclusive), tax_percent (cgst, sgst, igst, cess), tax_per_unit, line_total
- `channel_locations`: org_id, channel, name, address, city, state, gstin

## Blinkit rules from the PDF the app should support
1. **One carton should contain only one UPC.** Add a **carton count per line** at dispatch (e.g. 300 units = 12 cartons of 25). Cartons are labelled with the UPC, and the app can print a carton label (UPC, item name, qty in carton, R.O. no.).
2. **Each unit needs UPC and correct MRP printed.** Add a pre-dispatch check: product has UPC and MRP filled in the master. Warn if the MRP in the PO differs from the master.
3. **Original GST invoice must accompany goods** and show UPC, item name, quantity, price, MRP, tax breakup (CGST/SGST/IGST, cess), expiry/manufacturing dates. Generate this **invoice PDF** from the dispatch record.
4. **Delivery appointment:** the seller must book a slot in Seller Hub or Blinkit can reject the delivery. Add fields `appointment_date/time` and `appointment_booked` with a reminder before the slot.
5. **GRN discrepancy window: 10 days from delivery.** The seller must raise a ticket in Seller Hub with opening footage and Proof of Delivery (POD). The claim record needs `delivery_date`, `ticket_deadline` (delivery + 10 days), `ticket_no`, and file fields for the opening video and POD. Alert at day 7 and day 9, and show "X days left" on every open shortage claim.
6. **DN (debit note) pickup:** for rejected stock, raise a ticket about 2 days ahead in Seller Hub so the warehouse prepares it. **Blinkit liquidates un-picked DN stock after 7 days.** Add `dn_no`, `pickup_ticket_no`, `pickup_deadline` to return records, with a red alert before the 7-day limit.

## Vibe-coding prompt
~~~
Implement the Blinkit R.O. importer exactly as described in 05a-blinkit-ro-format-spec.md.
Use the sample files in /samples as fixtures.
1. Upload step accepts the Excel and the PDF together. Parse line items from the Excel by matching header names (not column positions), reading CGST/SGST/IGST, keeping Item Code, HSN and UPC as text, and stopping at the first row with an empty "#". Parse the footer totals.
2. Parse header fields from the PDF text (R.O. number, date, expiry, R.O. type, seller no., delivery warehouse and address, buyer and seller GSTIN, SPOC). If the PDF is missing or a field is not found, show an editable form. Pre-fill the R.O. number from the file name.
3. Show a preview screen with validation results (qty x rate = total per line, footer totals match, duplicate R.O., expired, unmapped items). The Admin must confirm before saving.
4. Unmapped items: match by Item Code in channel_item_map, then by UPC against products.upc, otherwise let the Admin pick or create a product, and save the mapping.
5. Save the PO with its warehouse in channel_locations, supply_type derived from the first two digits of the two GSTINs, and the line tax fields.
6. After saving, call reserve_po (see 06-stock-reservation.md).
7. Add dispatch fields: cartons per line, appointment date/time, carton label printing, and GST invoice PDF generation with all fields Blinkit requires.
8. Add claim fields delivery_date, ticket_deadline (delivery + 10 days), ticket_no, opening video and POD uploads, with alerts at day 7 and 9. Add DN pickup fields (dn_no, pickup_ticket_no, pickup_deadline = 7 days) with alerts.
Write a test that imports the sample xlsx and asserts: 18 items, 1172 units, net amount 415588, all totals validate.
~~~

## Acceptance checklist
- [ ] Sample Excel imports as 18 lines, 1172 units, Rs 4,15,588
- [ ] A PO from a Haryana-to-Haryana style file (CGST+SGST) also imports
- [ ] Item Code and UPC keep leading digits (no scientific notation)
- [ ] Missing PDF does not block import
- [ ] A line with changed quantity or rate is flagged
- [ ] Alerts appear for the 10-day GRN ticket window and 7-day DN pickup limit
