/**
 * SP Wedding · ตัวรับคำอวยพร เก็บเป็น "ภาพการ์ด" ลง Google Drive
 *
 * ใช้คู่กับ js/config.js ส่วน wishes ดูขั้นตอนติดตั้งใน docs/GUESTBOOK-DRIVE-TH.md
 * วางไฟล์นี้ทั้งไฟล์ในโปรเจกต์ Apps Script แล้ว Deploy เป็น Web app
 *   Execute as        : Me
 *   Who has access    : Anyone
 */

// ===== ตั้งค่า 3 บรรทัดนี้ก่อนใช้งาน =====
var FOLDER_ID = '';      // ID ของโฟลเดอร์ Drive ที่จะเก็บภาพ (จาก URL ของโฟลเดอร์)
var SHEET_ID = '';       // ไม่บังคับ ใส่ ID ของ Google Sheet ถ้าอยากได้สารบัญคำอวยพร
var SHARED_TOKEN = '';   // ต้องตรงกับ wishes.token ใน js/config.js

var MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // กันไฟล์ผิดปกติ
var TIME_ZONE = 'Asia/Bangkok';

function doGet() {
  return reply({ service: 'sp-wedding-guestbook-drive-v1', ready: !!FOLDER_ID });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!FOLDER_ID) return reply({ saved: false, error: 'folder_not_configured' });
    if (!e || !e.postData || !e.postData.contents) return reply({ saved: false, error: 'empty' });

    var body = JSON.parse(e.postData.contents);
    if (SHARED_TOKEN && body.token !== SHARED_TOKEN) return reply({ saved: false, error: 'token' });

    var name = String(body.name || '').trim().slice(0, 80);
    var text = String(body.text || '').trim().slice(0, 1000);
    var mode = body.mode === 'draw' ? 'draw' : 'type';

    // รับเฉพาะภาพ PNG หรือ JPEG แบบ data URL เท่านั้น
    var match = String(body.image || '').match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+\/=]+)$/);
    if (!match) return reply({ saved: false, error: 'image' });
    if (match[2].length * 0.75 > MAX_IMAGE_BYTES) return reply({ saved: false, error: 'too_large' });
    var extension = match[1] === 'jpeg' ? '.jpg' : '.png';

    lock.waitLock(30000);

    var stamp = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyyMMdd-HHmmss');
    var safeName = (name || 'ไม่ระบุชื่อ').replace(/[\\\/:*?"<>|]/g, ' ').trim();
    var fileName = 'wish-' + stamp + '-' + safeName + extension;

    var blob = Utilities.newBlob(Utilities.base64Decode(match[2]), 'image/' + match[1], fileName);
    var file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setDescription([name, mode, text].join(' | '));

    if (SHEET_ID) {
      SpreadsheetApp.openById(SHEET_ID).getSheets()[0]
        .appendRow([new Date(), name, mode, text, file.getUrl(), file.getId()]);
    }
    return reply({ saved: true, id: file.getId() });
  } catch (error) {
    return reply({ saved: false, error: String(error) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function reply(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** รันครั้งเดียวจากเมนู Run เพื่อตรวจว่า FOLDER_ID และ SHEET_ID ถูกต้อง */
function testConfiguration() {
  Logger.log('โฟลเดอร์: ' + DriveApp.getFolderById(FOLDER_ID).getName());
  if (SHEET_ID) Logger.log('ชีต: ' + SpreadsheetApp.openById(SHEET_ID).getName());
}
