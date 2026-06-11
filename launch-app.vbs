' -------------------------------------------------------------------------
' اولاد داؤود للفواكه - مشغل التطبيق الصامت محلياً كبرنامج مستقل
' Quiet Background Server Launcher & Frameless Window Loader
' -------------------------------------------------------------------------

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. تشغيل الخادم المحلي صامتاً في الخلفية بدون ظهور نافذة CMD السوداء المزعجة
WshShell.Run "cmd.exe /c """ & currentDir & "\start-local-server.bat""", 0, false

' 2. الانتظار ثانيتين ونصف للتأكد من بزوغ وتشغيل خادم الفيت بنجاح
WScript.Sleep 2500

' 3. العثور على مسار متصفح جوجل كروم أو مايكروسوفت إيدج للتشغيل بوضع النافذة المثبتة (Frameless Mode)
Dim browserPath
browserPath = ""

Set fso = CreateObject("Scripting.FileSystemObject")

' التحقق من وجود جوجل كروم (المسار الافتراضي)
If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
    browserPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
    browserPath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
End If

' التحقق من وجود مايكروسوفت إيدج في حال عدم وجود كروم
If browserPath = "" Then
    If fso.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
        browserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    ElseIf fso.FileExists("C:\Program Files\Microsoft\Edge\Application\msedge.exe") Then
        browserPath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    End If
End If

' 4. فتح برنامج اولاد داؤود في نافذة مستقلة خفيفة وجميلة بدون أشرطة أدوات المتصفح المعتادة
If browserPath <> "" Then
    WshShell.Run """" & browserPath & """ --app=http://localhost:3000", 1, false
Else
    ' فتح بالمتصفح الافتراضي كخيار بديل أخير
    WshShell.Run "http://localhost:3000", 1, false
End If
