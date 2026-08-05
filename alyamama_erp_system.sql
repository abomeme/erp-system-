-- ==========================================
-- نظام اليمامة لبيانات الفاكهة كشوفات الحسابات والمخازن
-- Al-Yamama ERP - MySQL Database Export SQL
-- متوافق بنسبة 100% مع سيرفر الموزع المحلي XAMPP / phpMyAdmin
-- تم التهيئة والتعديل الكامل للخرطوم ومجتمعات مخازن أولاد داؤود
-- ==========================================

CREATE DATABASE IF NOT EXISTS `alyamama_erp_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `alyamama_erp_system`;

-- 1. جدول الفواكه والمنتجات الرئيسية
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول منشأ الفاكهة (المناطق الجغرافية)
DROP TABLE IF EXISTS `regions`;
CREATE TABLE `regions` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول تصنيفات الفاكهة
DROP TABLE IF EXISTS `product_types`;
CREATE TABLE `product_types` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول درجات الفاكهة
DROP TABLE IF EXISTS `grades`;
CREATE TABLE `grades` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول وحدات القياس والتعبئة
DROP TABLE IF EXISTS `units`;
CREATE TABLE `units` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. جدول جهات الاتصال والشركاء الماليين (موردين، عملاء، موظفي المزارع)
DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
  `id` varchar(50) NOT NULL,
  `type` enum('supplier','customer','worker') NOT NULL,
  `code` varchar(50) NOT NULL UNIQUE,
  `name` varchar(150) NOT NULL,
  `nameEn` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `lastActive` date NOT NULL,
  `notes` text DEFAULT NULL,
  `salary` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. جدول سلع المخزن الحالي
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id` varchar(50) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `productName` varchar(100) NOT NULL,
  `regionName` varchar(100) NOT NULL,
  `typeName` varchar(100) NOT NULL,
  `gradeName` varchar(100) NOT NULL,
  `unitName` varchar(100) NOT NULL,
  `qty` decimal(12,3) NOT NULL DEFAULT 0.000,
  `buyPrice` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sellPrice` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. جدول أسعار البيع والخدمات الميدانية
DROP TABLE IF EXISTS `product_prices`;
CREATE TABLE `product_prices` (
  `id` varchar(50) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `productName` varchar(100) NOT NULL,
  `regionName` varchar(100) NOT NULL,
  `typeName` varchar(100) NOT NULL,
  `gradeName` varchar(100) NOT NULL,
  `priceRetail` decimal(15,2) NOT NULL DEFAULT 0.00,
  `priceWholesale` decimal(15,2) NOT NULL DEFAULT 0.00,
  `priceSpecial` decimal(15,2) NOT NULL DEFAULT 0.00,
  `priceOffer` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. جدول قيود الحسابات والفواتير والعهود المالية
DROP TABLE IF EXISTS `ledger_entries`;
CREATE TABLE `ledger_entries` (
  `id` varchar(50) NOT NULL,
  `contactId` varchar(50) NOT NULL,
  `type` enum('invoice','payment') NOT NULL,
  `date` date NOT NULL,
  `number` varchar(50) NOT NULL UNIQUE,
  `description` text NOT NULL,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paymentMethod` enum('cash','bank') DEFAULT NULL,
  `paymentRef` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`contactId`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. تفاصيل أصناف وبنود الفواتير التفصيلية
DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
  `id` varchar(50) NOT NULL,
  `ledgerEntryId` varchar(50) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `productName` varchar(100) NOT NULL,
  `regionName` varchar(100) NOT NULL,
  `typeName` varchar(100) NOT NULL,
  `gradeName` varchar(100) NOT NULL,
  `unitName` varchar(100) NOT NULL,
  `qty` decimal(12,3) NOT NULL DEFAULT 1.000,
  `price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `priceType` varchar(50) DEFAULT 'retail',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ledgerEntryId`) REFERENCES `ledger_entries` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================
-- زرع وتغذية البيانات المصنعية الافتراضية للسيستم
-- ==========================================

-- تفريش الفواكه
INSERT INTO `products` (`id`, `name`) VALUES
('p-1', 'برتقال'),
('p-2', 'خوخ'),
('p-3', 'مشمش'),
('p-4', 'منقة (صديقة)'),
('p-5', 'تفاح أحمر'),
('p-6', 'عنب'),
('p-7', 'جوافة'),
('p-8', 'منقة (قلب الثور)'),
('p-9', 'أفوكادو'),
('p-10', 'قشطة');

-- تفريش المناطق
INSERT INTO `regions` (`id`, `name`) VALUES
('r-1', 'شمالية'),
('r-2', 'كسلا'),
('r-3', 'ايراني'),
('r-4', 'جبل مرة'),
('r-5', 'الخرطوم'),
('r-6', 'مصري'),
('r-7', 'عام');

-- تفريش التصانيف
INSERT INTO `product_types` (`id`, `name`) VALUES
('t-1', 'شوايقة'),
('t-2', 'جعليين'),
('t-3', 'شندي'),
('t-4', 'جبل مرة'),
('t-5', 'عام');

-- تفريش درجات الجودة
INSERT INTO `grades` (`id`, `name`) VALUES
('g-1', 'نمرة أولى'),
('g-2', 'نمرة ثانية'),
('g-3', 'نمرة ثالثة'),
('g-4', 'كشة'),
('g-5', 'عام');

-- تفريش وحدات الاستلام
INSERT INTO `units` (`id`, `name`) VALUES
('u-1', 'كرتونة'),
('u-2', 'سبت'),
('u-3', 'كيلو'),
('u-4', 'حبة'),
('u-5', 'طن');

-- تفريش المجموعات والشركاء (موردين Supplier ، عملاء Customer ، عمال ومزارعين Worker)
INSERT INTO `contacts` (`id`, `type`, `code`, `name`, `nameEn`, `phone`, `email`, `lastActive`, `notes`) VALUES
('s-1', 'supplier', 'SUP-001', 'تاجر المانجو الجيلي', 'Mango Trader Al-Geili', '0901234567', 'mango@merchant.sd', '2026-06-04', 'تصدير وتوريد مانجو صديقة وقلب الثور درجة أولى وسلقينات'),
('s-2', 'supplier', 'SUP-002', 'تاجر التفاح الإيراني', 'Apple Trader Iranian', '0906987873', 'apple@merchant.sd', '2026-05-22', 'السوق الكبير - تفاح أحمر وأخضر مستورد وحفظ برادات'),
('s-3', 'supplier', 'SUP-003', 'شركة البرتقال الوطنية شندي', 'National Orange Co Shendi', '0912233445', 'info@orange-shendi.sd', '2026-06-04', 'الشركة الرئيسية لمزارع البرتقال بالولاية الشمالية شندي'),
('s-4', 'supplier', 'SUP-004', 'مورد عام للفاكهة الاستوائية', 'General Tropical Fruit Supplier', '0123456789', 'general@fruits.sd', '2026-05-20', 'توريد جوافة أفوكادو قشطة وتين بري مع الفروع الرئيسية'),
('c-1', 'customer', 'CUST-001', 'محمد احمد للمبيعات الجملة', 'Muhammad Ahmad Wholesale', '0922887711', 'm.ahmed@customer.sd', '2026-06-04', 'وكيل توزيع معتمد مجمع وود البشير والمغتربين'),
('c-2', 'customer', 'CUST-002', 'إبراهيم تاجر السوق الشعبي', 'Ibrahim Al-Shaabi Merchant', '0911554422', 'ibrahim@customer.sd', '2026-06-04', 'محل بيع قطاعي ومخازن فرعية ببحري'),
('c-3', 'customer', 'CUST-003', 'داؤود لخدمات التجزئة والفنادق', 'Dawood Retail & Hotel Services', '0955663322', NULL, '2026-06-04', 'فواتير خاصة وعقود سداد نصف شهري'),
('c-4', 'customer', 'CUST-004', 'زبون نقدي عام', 'General Cash Walkin Customer', '0000000000', NULL, '2026-06-04', 'حساب التسجيل المباشر بدون قيود ائتمان'),
('w-1', 'worker', 'WRK-001', 'محمد احمد الهادي - مشرف الصيانة والمخازن', 'Muhammad Ahmed Al-Hadi - Store Supervisor', '090809987', NULL, '2026-06-04', 'الراتب الأساسي الشهري المدون 700,000 جنيه سوداني'),
('w-2', 'worker', 'WRK-002', 'محمد الهادي منصور - سائق ومسؤول النقل الجغرافي', 'Muhammad Mansour - Logistical Driver', '090405050', NULL, '2026-06-04', 'الراتب الأساسي الشهري المدون 500,000 جنيه سوداني مع عمولات نقل');

-- تفريش كميات المخازن
INSERT INTO `inventory` (`id`, `productId`, `productName`, `regionName`, `typeName`, `gradeName`, `unitName`, `qty`, `buyPrice`, `sellPrice`) VALUES
('inv-1', 'p-1', 'برتقال', 'شمالية', 'شوايقة', 'نمرة أولى', 'كرتونة', 1092, 7000.00, 10000.00),
('inv-2', 'p-1', 'برتقال', 'شمالية', 'جعليين', 'نمرة ثالثة', 'كرتونة', 1199, 5000.00, 8000.00),
('inv-3', 'p-5', 'تفاح أحمر', 'ايراني', 'عام', 'نمرة أولى', 'سبت', 997, 3000.00, 5000.00),
('inv-4', 'p-7', 'جوافة', 'كسلا', 'عام', 'نمرة ثانية', 'سبت', 200, 4000.00, 6000.00);

-- تفريش قائمة أسعار بيع الفاكهة
INSERT INTO `product_prices` (`id`, `productId`, `productName`, `regionName`, `typeName`, `gradeName`, `priceRetail`, `priceWholesale`, `priceSpecial`, `priceOffer`) VALUES
('pr-1', 'p-1', 'برتقال', 'شمالية', 'شوايقة', 'نمرة أولى', 10000.00, 8000.00, 7500.00, 7000.00),
('pr-2', 'p-5', 'تفاح أحمر', 'ايراني', 'عام', 'نمرة أولى', 5000.00, 4200.00, 4000.00, 3800.00),
('pr-3', 'p-7', 'جوافة', 'كسلا', 'عام', 'نمرة ثانية', 6000.00, 5200.00, 5000.00, 4500.00);

-- تفريش قيود دفاتر اليومية والحسابات الأولية
INSERT INTO `ledger_entries` (`id`, `contactId`, `type`, `date`, `number`, `description`, `total`, `paid`, `paymentMethod`, `paymentRef`) VALUES
('l-s1-1', 's-1', 'invoice', '2026-05-20', 'PUR-IN-001', 'فاتورة توريد مانجو صديقة وموز نمرة واحد', 420000.00, 0.00, NULL, NULL),
('l-s1-2', 's-1', 'payment', '2026-05-22', 'PAY-OUT-101', 'سند صرف نقدي لتسديد جزء حساب المانجو', 180000.00, 180000.00, 'cash', 'CASH-S1-A'),
('l-s2-1', 's-2', 'invoice', '2026-05-22', 'PUR-IN-002', 'فاتورة توريد تفاح أحمر نخب ممتاز برادات', 1000000.00, 400000.00, NULL, NULL),
('l-s3-1', 's-3', 'invoice', '2026-06-04', 'PUR-IN-301', 'توريد برتقال ولاية شمالية شندي نمرة أولى بالتفريغ الجاف', 630000.00, 0.00, NULL, NULL),
('l-c1-1', 'c-1', 'invoice', '2026-05-20', 'SAL-INV-001', 'فاتورة مبيعات برتقال شمالية وكوكتيل فواكه', 2000000.00, 2000000.00, NULL, NULL),
('l-c1-2', 'c-1', 'invoice', '2026-06-04', 'SAL-INV-002', 'فاتورة بيع عنب ومشمش جملة', 40700.00, 42100.00, NULL, NULL),
('l-c1-3', 'c-1', 'payment', '2026-05-22', 'REC-IN-401', 'تحصيل نقدي دفعة مقدمة بنكك', 70000.00, 70000.00, 'bank', 'BKK-1049219'),
('l-c2-1', 'c-2', 'invoice', '2026-06-04', 'SAL-INV-003', 'فاتورة بيع قطاعي تفاح ممتاز', 490000.00, 490000.00, NULL, NULL),
('l-w1-1', 'w-1', 'invoice', '2026-05-22', 'WRK-S01', 'مستحقات مرتب شهر مايو لمشرف المخازن', 700000.00, 700000.00, NULL, NULL),
('l-w1-2', 'w-1', 'invoice', '2026-05-22', 'WRK-D02', 'سلفة مالية مستلمة نقدا لتأهيل منصة التعبئة', 600000.00, 0.00, NULL, NULL),
('l-w1-3', 'w-1', 'payment', '2026-06-04', 'WRK-P03', 'قبض واسترجاع جزء من سلفة مشرف المخزن نقداً', 200000.00, 200000.00, 'cash', 'CASH-RET-11'),
('l-w2-1', 'w-2', 'invoice', '2026-05-22', 'WRK-S02', 'مرجع مرتب السائق الشهري المستحق - مايو', 500000.00, 500000.00, NULL, NULL),
('l-w2-2', 'w-2', 'invoice', '2026-05-22', 'WRK-D03', 'سلفية عاجلة لتأجير شاحنة نقل مبردة', 600000.00, 0.00, NULL, NULL);

-- تفريش بنود الفواتير المذكورة بالتفصيل
INSERT INTO `invoice_items` (`id`, `ledgerEntryId`, `productId`, `productName`, `regionName`, `typeName`, `gradeName`, `unitName`, `qty`, `price`, `total`, `priceType`) VALUES
('p-itm-1', 'l-s1-1', 'p-4', 'منقة (صديقة)', 'كسلا', 'عام', 'نمرة أولى', 'سبت', 60, 7000.00, 420000.00, 'retail'),
('p-itm-2', 'l-s2-1', 'p-5', 'تفاح أحمر', 'ايراني', 'عام', 'نمرة أولى', 'كرتونة', 100, 10000.00, 1000000.00, 'retail'),
('p-itm-3', 'l-s3-1', 'p-1', 'برتقال', 'شمالية', 'شوايقة', 'نمرة أولى', 'كرتونة', 90, 7000.00, 630000.00, 'retail'),
('s-itm-1', 'l-c1-1', 'p-1', 'برتقال', 'شمالية', 'شوايقة', 'نمرة أولى', 'كرتونة', 200, 10000.00, 2000000.00, 'retail'),
('s-itm-2', 'l-c1-2', 'p-1', 'برتقال', 'شمالية', 'شوايقة', 'نمرة أولى', 'كرتونة', 2, 7000.00, 14000.00, 'offer'),
('s-itm-3', 'l-c1-2', 'p-7', 'جوافة', 'كسلا', 'عام', 'نمرة ثانية', 'سبت', 4, 5000.00, 20000.00, 'special'),
('s-itm-4', 'l-c2-1', 'p-1', 'برتقال', 'شمالية', 'شوايقة', 'نمرة أولى', 'كرتونة', 70, 7000.00, 490000.00, 'retail');
