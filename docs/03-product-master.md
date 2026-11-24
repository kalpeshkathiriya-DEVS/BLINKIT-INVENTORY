# 03 Product Master

## Goal
Admin sets up all products first. Staff only select from this list.

## Fields
internal_name (e.g. Orange Wiper), official_name (3-in-1 Tiles Cleaning Brush), SKU, UPC (optional at first), HSN, MRP, GST %, unit, category, rack location, photo, active flag. Aliases (extra names). Channel item codes (Blinkit item ID, Amazon ASIN, etc.). Clothing: variants with size, colour, own UPC.

## Behaviour
- **Search everywhere** matches internal name, official name, SKU, UPC, alias, channel code. Fuzzy, tolerant of spelling.
- Inwards shows internal name with official name in grey; outwards/PO shows official name. Admin setting picks the default.
- If no UPC: generate an internal barcode (Code128) and print a label sheet (PDF) in sizes 38x25mm and A4 grid.
- **Bulk upload:** download Excel template, upload, preview with errors per row, then confirm.
- Duplicate UPC or SKU within an org is blocked.
- Deactivating a product hides it from new entries but keeps history.

## Screens
Product list (search, filters, photo grid toggle), Add/Edit product, Aliases and channel codes tab, Bulk upload, Print labels.

## Vibe-coding prompt
~~~
Build the Product Master module per 03-product-master.md.
- Products CRUD for admins; staff get read-only search.
- Global fast search component (debounced, matches internal_name, official_name, sku, upc, alias, channel_item_code), reusable on inwards and PO screens.
- Aliases and channel_item_map tabs on the product page.
- Excel bulk upload using xlsx with a downloadable template, row-level validation preview, and import.
- Barcode label generator (Code128) for products without UPC, printable as PDF.
- Prevent duplicate UPC/SKU per org. Write audit_log entries on every change.
Mobile-friendly, with product photo thumbnails in search results.
~~~

## Acceptance checklist
- [ ] Typing "orange" and "3-in-1" both find the same product
- [ ] Bulk upload rejects bad rows without losing good ones
- [ ] Staff cannot edit products
- [ ] Label PDF prints correctly
