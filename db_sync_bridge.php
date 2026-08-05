<?php
/**
 * جسر المزامنة لقاعدة بيانات XAMPP - نظام أولاد داؤود للفواكه
 * XAMPP MySQL Database Sync Bridge v4.0
 * 
 * هذا الملف مخصص لربط ومزامنة بيانات المتصفح المحلي (LocalStorage) بقاعدة بيانات MySQL على سيرفر XAMPP محلياً.
 * 
 * طريقة الاستخدام:
 * 1. قم بتهيئة قاعدة البيانات في XAMPP بالدخول إلى phpMyAdmin واستيراد ملف (alyamama_erp_system.sql).
 * 2. انسخ هذا الملف (db_sync_bridge.php) ومجلد الفولدر الكامل بعد تنفيذ الـ build إلى مجلد htdocs في XAMPP:
 *    مساره الافتراضي: C:\xampp\htdocs\olad-dawood\
 * 3. يمكنك الآن استدعاء هذا الملف للمزامنة المباشرة وحفظ ورفع كافة الحركات بصيغة SQL حقيقية بدلاً من LocalStorage.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. إعدادات الاتصال لقاعدة بيانات XAMPP الافتراضية
$host = "localhost";
$db_name = "alyamama_erp_system";
$username = "root";
$password = ""; // افتراضي في XAMPP يكون فارغاً

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $exception) {
    echo json_encode(array(
        "status" => "error",
        "message" => "فشل الاتصال بقاعدة بيانات XAMPP! تأكد من تشغيل Apache و MySQL من لوحة تحكم XAMPP والتحقق من اسم قاعدة البيانات.",
        "error" => $exception->getMessage()
    ), JSON_UNESCAPED_UNICODE);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// 2. معالجة الإجراءات (الرفع مـزامنة من المتصفح إلى MySQL)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'sync_up') {
    // استقبال مصفوفة البيانات بالكامل من التطبيق وتخزينها في جداول MySQL
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(array("status" => "error", "message" => "بيانات المزامنة غير صالحة أو فارغة"), JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    try {
        $conn->beginTransaction();
        
        // أ. تحديث جدول المنتجات
        if (isset($data['products'])) {
            $conn->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $conn->exec("TRUNCATE TABLE `products`;");
            $stmt = $conn->prepare("INSERT INTO `products` (`id`, `name`) VALUES (:id, :name)");
            foreach ($data['products'] as $prod) {
                $stmt->execute(['id' => $prod['id'], 'name' => $prod['name']]);
            }
        }
        
        // ب. تحديث جدول المناطق
        if (isset($data['regions'])) {
            $conn->exec("TRUNCATE TABLE `regions`;");
            $stmt = $conn->prepare("INSERT INTO `regions` (`id`, `name`) VALUES (:id, :name)");
            foreach ($data['regions'] as $reg) {
                $stmt->execute(['id' => $reg['id'], 'name' => $reg['name']]);
            }
        }

        // ج. تحديث تصنيفات الفواكه
        if (isset($data['productTypes'])) {
            $conn->exec("TRUNCATE TABLE `product_types`;");
            $stmt = $conn->prepare("INSERT INTO `product_types` (`id`, `name`) VALUES (:id, :name)");
            foreach ($data['productTypes'] as $ptype) {
                $stmt->execute(['id' => $ptype['id'], 'name' => $ptype['name']]);
            }
        }

        // د. تحديث درجات الجودة
        if (isset($data['grades'])) {
            $conn->exec("TRUNCATE TABLE `grades`;");
            $stmt = $conn->prepare("INSERT INTO `grades` (`id`, `name`) VALUES (:id, :name)");
            foreach ($data['grades'] as $grd) {
                $stmt->execute(['id' => $grd['id'], 'name' => $grd['name']]);
            }
        }

        // هـ. تحديث وحدات الاستلام
        if (isset($data['units'])) {
            $conn->exec("TRUNCATE TABLE `units`;");
            $stmt = $conn->prepare("INSERT INTO `units` (`id`, `name`) VALUES (:id, :name)");
            foreach ($data['units'] as $unt) {
                $stmt->execute(['id' => $unt['id'], 'name' => $unt['name']]);
            }
        }

        // و. تحديث جهات الاتصال (موردين، عملاء، موظفين)
        if (isset($data['contacts'])) {
            $conn->exec("TRUNCATE TABLE `contacts`;");
            $stmt = $conn->prepare("INSERT INTO `contacts` (`id`, `type`, `code`, `name`, `nameEn`, `phone`, `email`, `lastActive`, `notes`, `salary`) VALUES (:id, :type, :code, :name, :nameEn, :phone, :email, :lastActive, :notes, :salary)");
            foreach ($data['contacts'] as $con) {
                $stmt->execute([
                    'id' => $con['id'],
                    'type' => $con['type'],
                    'code' => $con['code'],
                    'name' => $con['name'],
                    'nameEn' => isset($con['nameEn']) ? $con['nameEn'] : $con['name'],
                    'phone' => isset($con['phone']) ? $con['phone'] : null,
                    'email' => isset($con['email']) ? $con['email'] : null,
                    'lastActive' => isset($con['lastActive']) ? $con['lastActive'] : date('Y-m-d'),
                    'notes' => isset($con['notes']) ? $con['notes'] : null,
                    'salary' => isset($con['salary']) ? $con['salary'] : null
                ]);
            }
        }

        // ز. تحديث المخزون الحالي
        if (isset($data['inventory'])) {
            $conn->exec("TRUNCATE TABLE `inventory`;");
            $stmt = $conn->prepare("INSERT INTO `inventory` (`id`, `productId`, `productName`, `regionName`, `typeName`, `gradeName`, `unitName`, `qty`, `buyPrice`, `sellPrice`) VALUES (:id, :productId, :productName, :regionName, :typeName, :gradeName, :unitName, :qty, :buyPrice, :sellPrice)");
            foreach ($data['inventory'] as $inv) {
                $stmt->execute([
                    'id' => $inv['id'],
                    'productId' => $inv['productId'],
                    'productName' => $inv['productName'],
                    'regionName' => $inv['regionName'],
                    'typeName' => $inv['typeName'],
                    'gradeName' => $inv['gradeName'],
                    'unitName' => $inv['unitName'],
                    'qty' => $inv['qty'],
                    'buyPrice' => $inv['buyPrice'],
                    'sellPrice' => $inv['sellPrice']
                ]);
            }
        }

        // ح. تحديث أسعار الخدمات والبيع
        if (isset($data['prices'])) {
            $conn->exec("TRUNCATE TABLE `product_prices`;");
            $stmt = $conn->prepare("INSERT INTO `product_prices` (`id`, `productId`, `productName`, `regionName`, `typeName`, `gradeName`, `priceRetail`, `priceWholesale`, `priceSpecial`, `priceOffer`) VALUES (:id, :productId, :productName, :regionName, :typeName, :gradeName, :priceRetail, :priceWholesale, :priceSpecial, :priceOffer)");
            foreach ($data['prices'] as $prc) {
                $stmt->execute([
                    'id' => $prc['id'],
                    'productId' => $prc['productId'],
                    'productName' => $prc['productName'],
                    'regionName' => $prc['regionName'],
                    'typeName' => $prc['typeName'],
                    'gradeName' => $prc['gradeName'],
                    'priceRetail' => $prc['priceRetail'],
                    'priceWholesale' => $prc['priceWholesale'],
                    'priceSpecial' => $prc['priceSpecial'],
                    'priceOffer' => $prc['priceOffer']
                ]);
            }
        }

        // ط. تحديث قيود الحسابات والفواتير والعهود المالية
        if (isset($data['ledgers'])) {
            $conn->exec("TRUNCATE TABLE `ledger_entries`;");
            $conn->exec("TRUNCATE TABLE `invoice_items`;");
            
            $stmt_entry = $conn->prepare("INSERT INTO `ledger_entries` (`id`, `contactId`, `type`, `date`, `number`, `description`, `total`, `paid`, `paymentMethod`, `paymentRef`) VALUES (:id, :contactId, :type, :date, :number, :description, :total, :paid, :paymentMethod, :paymentRef)");
            $stmt_item = $conn->prepare("INSERT INTO `invoice_items` (`id`, `ledgerEntryId`, `productId`, `productName`, `regionName`, `typeName`, `gradeName`, `unitName`, `qty`, `price`, `total`, `priceType`) VALUES (:id, :ledgerEntryId, :productId, :productName, :regionName, :typeName, :gradeName, :unitName, :qty, :price, :total, :priceType)");
            
            foreach ($data['ledgers'] as $contactId => $entries) {
                foreach ($entries as $entry) {
                    $stmt_entry->execute([
                        'id' => $entry['id'],
                        'contactId' => $contactId,
                        'type' => $entry['type'],
                        'date' => $entry['date'],
                        'number' => $entry['number'],
                        'description' => $entry['description'],
                        'total' => $entry['total'],
                        'paid' => $entry['paid'],
                        'paymentMethod' => isset($entry['paymentMethod']) ? $entry['paymentMethod'] : null,
                        'paymentRef' => isset($entry['paymentRef']) ? $entry['paymentRef'] : null
                    ]);

                    // إذا كانت فاتورة وتحتوي على بنود، نقوم بإدخال البنود
                    if (isset($entry['items']) && is_array($entry['items'])) {
                        foreach ($entry['items'] as $item) {
                            $stmt_item->execute([
                                'id' => $item['id'],
                                'ledgerEntryId' => $entry['id'],
                                'productId' => $item['productId'],
                                'productName' => $item['productName'],
                                'regionName' => $item['regionName'],
                                'typeName' => $item['typeName'],
                                'gradeName' => $item['gradeName'],
                                'unitName' => $item['unitName'],
                                'qty' => $item['qty'],
                                'price' => $item['price'],
                                'total' => $item['total'],
                                'priceType' => isset($item['priceType']) ? $item['priceType'] : 'retail'
                            ]);
                        }
                    }
                }
            }
        }

        $conn->exec("SET FOREIGN_KEY_CHECKS = 1;");
        $conn->commit();
        
        echo json_encode(array(
            "status" => "success",
            "message" => "تم مزامنة ورفع كامل بيانات الدفاتر بنجاح إلى جداول قاعدة بيانات XAMPP MySQL التابعة لأولاد داؤود!"
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(array(
            "status" => "error",
            "message" => "فشل حفظ وتأمين البيانات في MySQL التابعة لـ XAMPP",
            "error" => $e->getMessage()
        ), JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 3. جلب الـ مـزامنة من MySQL إلى المتصفح (التحميل مجدداً)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'sync_down') {
    try {
        $payload = array(
            "meta" => array(
                "system" => "Al-Yamama ERP",
                "version" => "4.0",
                "syncDate" => date('c'),
                "currency" => "SDG"
            )
        );

        // أ. جلب المنتجات
        $payload['products'] = $conn->query("SELECT * FROM `products`")->fetchAll(PDO::FETCH_ASSOC);
        
        // ب. جلب المناطق
        $payload['regions'] = $conn->query("SELECT * FROM `regions`")->fetchAll(PDO::FETCH_ASSOC);
        
        // ج. جلب التصنيفات
        $payload['productTypes'] = $conn->query("SELECT * FROM `product_types`")->fetchAll(PDO::FETCH_ASSOC);
        
        // د. جلب الجودة
        $payload['grades'] = $conn->query("SELECT * FROM `grades`")->fetchAll(PDO::FETCH_ASSOC);
        
        // هـ. جلب الوحدات
        $payload['units'] = $conn->query("SELECT * FROM `units`")->fetchAll(PDO::FETCH_ASSOC);

        // و. جلب جهات الاتصال
        $payload['contacts'] = $conn->query("SELECT * FROM `contacts`")->fetchAll(PDO::FETCH_ASSOC);

        // ز. جلب المخزون
        $payload['inventory'] = $conn->query("SELECT * FROM `inventory`")->fetchAll(PDO::FETCH_ASSOC);

        // ح. جلب الأسعار
        $payload['prices'] = $conn->query("SELECT * FROM `product_prices`")->fetchAll(PDO::FETCH_ASSOC);

        // ط. جلب الدفاتر والعهود والبنود
        $entries = $conn->query("SELECT * FROM `ledger_entries` ORDER BY `date` DESC")->fetchAll(PDO::FETCH_ASSOC);
        $items = $conn->query("SELECT * FROM `invoice_items`")->fetchAll(PDO::FETCH_ASSOC);

        // تجميع البنود داخل فواتيرها
        $items_by_entry = array();
        foreach ($items as $item) {
            $e_id = $item['ledgerEntryId'];
            if (!isset($items_by_entry[$e_id])) {
                $items_by_entry[$e_id] = array();
            }
            $items_by_entry[$e_id][] = array(
                "id" => $item['id'],
                "productId" => $item['productId'],
                "productName" => $item['productName'],
                "regionName" => $item['regionName'],
                "typeName" => $item['typeName'],
                "gradeName" => $item['gradeName'],
                "unitName" => $item['unitName'],
                "qty" => floatval($item['qty']),
                "price" => floatval($item['price']),
                "total" => floatval($item['total']),
                "priceType" => $item['priceType']
            );
        }

        // تجميع القيود لكل جهة اتصال
        $ledgers = array();
        foreach ($entries as $entry) {
            $c_id = $entry['contactId'];
            if (!isset($ledgers[$c_id])) {
                $ledgers[$c_id] = array();
            }
            
            $structured_entry = array(
                "id" => $entry['id'],
                "type" => $entry['type'],
                "date" => $entry['date'],
                "number" => $entry['number'],
                "description" => $entry['description'],
                "total" => floatval($entry['total']),
                "paid" => floatval($entry['paid']),
                "paymentMethod" => $entry['paymentMethod'],
                "paymentRef" => $entry['paymentRef']
            );

            if ($entry['type'] === 'invoice' && isset($items_by_entry[$entry['id']])) {
                $structured_entry['items'] = $items_by_entry[$entry['id']];
            }

            $ledgers[$c_id][] = $structured_entry;
        }
        $payload['ledgers'] = $ledgers;

        echo json_encode(array(
            "status" => "success",
            "data" => $payload
        ), JSON_UNESCAPED_UNICODE);

    } catch (Exception $e) {
        echo json_encode(array(
            "status" => "error",
            "message" => "فشل استدعاء وتحميل البيانات من MySQL",
            "error" => $e->getMessage()
        ), JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// 4. دالة للمساعدة والتحقق المبدئي
echo json_encode(array(
    "status" => "active",
    "message" => "جسر المزامنة مع XAMPP MySQL يعمل بنجاح! استخدم (HTTP POST ?action=sync_up) للمزامنة للأعلى، وميثود (HTTP GET ?action=sync_down) للسحب للأسفل."
), JSON_UNESCAPED_UNICODE);
