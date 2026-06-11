/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contact, LedgerEntry, Product, Region, ProductType, Grade, Unit, InventoryItem, ProductPrice } from '../types';

export function generateSQLBackup({
  contacts,
  ledgers,
  products,
  regions,
  productTypes,
  grades,
  units,
  inventory,
  prices
}: {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  products: Product[];
  regions: Region[];
  productTypes: ProductType[];
  grades: Grade[];
  units: Unit[];
  inventory: InventoryItem[];
  prices: ProductPrice[];
}): string {
  let sql = `-- =====================================================================\n`;
  sql += `-- نظام أولاد داؤود لبيع الفواكه والمخازن وكشوفات الأستاذ والحسابات\n`;
  sql += `-- النسخة الاحتياطية التلقائية المتكاملة لـ XAMPP & phpMyAdmin\n`;
  sql += `-- تم التوليد بنسق SQL للاستيراد المباشر بقاعدة بيانات XAMPP\n`;
  sql += `-- تاريخ التصدير: ${new Date().toLocaleString('ar-SD')}\n`;
  sql += `-- =====================================================================\n\n`;

  const jsonPayload = {
    contacts,
    ledgers,
    products,
    regions,
    productTypes,
    grades,
    units,
    inventory,
    prices
  };
  sql += `-- SYSTEM_RESTORE_JSON_PAYLOAD: ${JSON.stringify(jsonPayload)}\n\n`;

  sql += `CREATE DATABASE IF NOT EXISTS \`alyamama_erp_system\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
  sql += `USE \`alyamama_erp_system\`;\n\n`;
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  const tables = ['invoice_items', 'ledger_entries', 'product_prices', 'inventory', 'contacts', 'units', 'grades', 'product_types', 'regions', 'products'];
  tables.forEach(tbl => {
    sql += `TRUNCATE TABLE \`${tbl}\`;\n`;
  });
  sql += `\n`;

  const esc = (str: any) => {
    if (str === null || str === undefined) return 'NULL';
    const escaped = String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  };

  // 1. products
  if (products.length > 0) {
    sql += `-- 1. المنتجات\n`;
    products.forEach(p => {
      sql += `INSERT INTO \`products\` (\`id\`, \`name\`) VALUES (${esc(p.id)}, ${esc(p.name)});\n`;
    });
    sql += `\n`;
  }

  // 2. regions
  if (regions.length > 0) {
    sql += `-- 2. المناطق الجغرافية\n`;
    regions.forEach(r => {
      sql += `INSERT INTO \`regions\` (\`id\`, \`name\`) VALUES (${esc(r.id)}, ${esc(r.name)});\n`;
    });
    sql += `\n`;
  }

  // 3. product_types
  if (productTypes.length > 0) {
    sql += `-- 3. تصنيفات الفواكه\n`;
    productTypes.forEach(t => {
      sql += `INSERT INTO \`product_types\` (\`id\`, \`name\`) VALUES (${esc(t.id)}, ${esc(t.name)});\n`;
    });
    sql += `\n`;
  }

  // 4. grades
  if (grades.length > 0) {
    sql += `-- 4. درجات الفواكه\n`;
    grades.forEach(g => {
      sql += `INSERT INTO \`grades\` (\`id\`, \`name\`) VALUES (${esc(g.id)}, ${esc(g.name)});\n`;
    });
    sql += `\n`;
  }

  // 5. units
  if (units.length > 0) {
    sql += `-- 5. وحدات القياس\n`;
    units.forEach(u => {
      sql += `INSERT INTO \`units\` (\`id\`, \`name\`) VALUES (${esc(u.id)}, ${esc(u.name)});\n`;
    });
    sql += `\n`;
  }

  // 6. contacts
  if (contacts.length > 0) {
    sql += `-- 6. جهات الاتصال والشركاء والعمال وراتبهم الشهري\n`;
    contacts.forEach(c => {
      const salVal = c.salary !== undefined ? c.salary : 'NULL';
      sql += `INSERT INTO \`contacts\` (\`id\`, \`type\`, \`code\`, \`name\`, \`nameEn\`, \`phone\`, \`email\`, \`lastActive\`, \`notes\`, \`salary\`) VALUES (${esc(c.id)}, ${esc(c.type)}, ${esc(c.code)}, ${esc(c.name)}, ${esc(c.nameEn)}, ${esc(c.phone)}, ${esc(c.email)}, ${esc(c.lastActive)}, ${esc(c.notes)}, ${salVal});\n`;
    });
    sql += `\n`;
  }

  // 7. inventory
  if (inventory.length > 0) {
    sql += `-- 7. المخزون\n`;
    inventory.forEach(inv => {
      sql += `INSERT INTO \`inventory\` (\`id\`, \`productId\`, \`productName\`, \`regionName\`, \`typeName\`, \`gradeName\`, \`unitName\`, \`qty\`, \`buyPrice\`, \`sellPrice\`) VALUES (${esc(inv.id)}, ${esc(inv.productId)}, ${esc(inv.productName)}, ${esc(inv.regionName)}, ${esc(inv.typeName)}, ${esc(inv.gradeName)}, ${esc(inv.unitName)}, ${inv.qty}, ${inv.buyPrice}, ${inv.sellPrice});\n`;
    });
    sql += `\n`;
  }

  // 8. product_prices
  if (prices.length > 0) {
    sql += `-- 8. قائمة أسعار البيع والتخصيص\n`;
    prices.forEach(pr => {
      sql += `INSERT INTO \`product_prices\` (\`id\`, \`productId\`, \`productName\`, \`regionName\`, \`typeName\`, \`gradeName\`, \`priceRetail\`, \`priceWholesale\`, \`priceSpecial\`, \`priceOffer\`) VALUES (${esc(pr.id)}, ${esc(pr.productId)}, ${esc(pr.productName)}, ${esc(pr.regionName)}, ${esc(pr.typeName)}, ${esc(pr.gradeName)}, ${pr.priceRetail}, ${pr.priceWholesale}, ${pr.priceSpecial}, ${pr.priceOffer});\n`;
    });
    sql += `\n`;
  }

  // 9. ledger entries and items
  const allEntries: any[] = [];
  const allItems: any[] = [];
  Object.keys(ledgers).forEach(cid => {
    const list = ledgers[cid] || [];
    list.forEach(entry => {
      allEntries.push({ ...entry, contactId: cid });
      if (entry.items && Array.isArray(entry.items)) {
        entry.items.forEach(itm => {
          allItems.push({ ...itm, ledgerEntryId: entry.id });
        });
      }
    });
  });

  if (allEntries.length > 0) {
    sql += `-- 9. قيود الحسابات والسندات المالية\n`;
    allEntries.forEach(ent => {
      const m = ent.paymentMethod ? esc(ent.paymentMethod) : 'NULL';
      const r = ent.paymentRef ? esc(ent.paymentRef) : 'NULL';
      sql += `INSERT INTO \`ledger_entries\` (\`id\`, \`contactId\`, \`type\`, \`date\`, \`number\`, \`description\`, \`total\`, \`paid\`, \`paymentMethod\`, \`paymentRef\`) VALUES (${esc(ent.id)}, ${esc(ent.contactId)}, ${esc(ent.type)}, ${esc(ent.date)}, ${esc(ent.number)}, ${esc(ent.description)}, ${ent.total}, ${ent.paid}, ${m}, ${r});\n`;
    });
    sql += `\n`;
  }

  if (allItems.length > 0) {
    sql += `-- 10. كشوفات الفواتير واصنافها\n`;
    allItems.forEach(itm => {
      sql += `INSERT INTO \`invoice_items\` (\`id\`, \`ledgerEntryId\`, \`productId\`, \`productName\`, \`regionName\`, \`typeName\`, \`gradeName\`, \`unitName\`, \`qty\`, \`price\`, \`total\`, \`priceType\`) VALUES (${esc(itm.id)}, ${esc(itm.ledgerEntryId)}, ${esc(itm.productId)}, ${esc(itm.productName)}, ${esc(itm.regionName)}, ${esc(itm.typeName)}, ${esc(itm.gradeName)}, ${esc(itm.unitName)}, ${itm.qty}, ${itm.price}, ${itm.total}, ${esc(itm.priceType)});\n`;
    });
    sql += `\n`;
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  return sql;
}
