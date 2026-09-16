# Wedding Invitation v18 — การ์ดตามภาพอ้างอิงและเสียงกระดาษ

ต่อยอดจาก SP_Wedding_Garden_Motion_v17.zip

## สิ่งที่ปรับ
- ปุ่มดูการ์ดใน Landing Page และหน้าหลักเปิด dialog และ controller ชุดเดียวกัน
- ใช้ภาพหน้า–หลังที่ผู้ใช้แนบ 16 กันยายน 2026 โดยตรง ขนาด 1480 × 2048 px แปลงเป็น WebP lossless โดยไม่แก้ artwork หรือข้อความบนภาพ
- เปิดจากหน้าการ์ดไปสู่หน้ากำหนดการในประมาณ 2.4 วินาที: หยุดให้เห็นปกสั้น ๆ, ค่อยเปิดจากสันซ้าย, ชะลอเข้าที่ พร้อมเงาและ blur บาง ๆ ที่ตัวภาพ ไม่ขยายหรือย่อทั้งเว็บ
- อ้างอิงจังหวะคลี่เปิดและการเข้าโฟกัสจากคลิปที่แนบ ไม่ได้จำลองการหมุนโทรศัพท์ทั้งชิ้น
- เสียงกระดาษสังเคราะห์ด้วย Web Audio ยาวประมาณ 1.7 วินาที ระดับเบา เล่นครั้งเดียวหลังแตะเปิด ปิดเสียงได้ และจำตัวเลือกในเบราว์เซอร์
- ภาพปรับตามพื้นที่จอโดยรักษาสัดส่วน มีปุ่มสลับด้านหน้า/กำหนดการและปุ่มเปิดสถานที่จัดงาน
- ข้อความขนาดปกติใน “อ่านข้อความและกำหนดการ” เพื่ออ่านบนมือถือ/ใช้ screen reader ได้ และเป็นทางสำรองหากภาพโหลดไม่สำเร็จ
- ปิดกลางแอนิเมชันแล้วหยุดเสียงและ timer; ซ่อนแท็บหรือเปิด Reduce Motion แล้วแสดงการ์ดในสถานะอ่านได้ทันที
- ไม่เพิ่ม foreground animation ในหน้าหลักในรอบนี้ เพราะผู้ใช้ขอคุยแนวทางก่อน คง Mesh Gradient นก และกรอบจาก v17

## การแก้ไขต่อ
- js/config.js → invitationCard.durationMs: ค่าเริ่มต้น 2400, จำกัด 1800–3200 ms
- invitationCard.paperSound: true/false
- invitationCard.paperVolume: 0–0.18, ค่าเริ่มต้น 0.10
- invitationCard.message และ scheduleLabels: ข้อความฉบับอ่านบนเว็บ
- config.schedule: กำหนดการหลัก; ข้อความบรรทัดสุดท้ายของการ์ดอ้างอิงใช้ “ร่วมรับประทานอาหาร” ตามภาพ
- assets/invitation/card-front.webp และ card-back.webp: เปลี่ยน artwork ที่นี่หากปรับรายละเอียดบนภาพ
- design-source/invitation/card-front-reference.png และ card-back-reference.png: ต้นฉบับแนบ
- css/invitation-card.css และ js/invitation-card.js: โมดูลเฉพาะการ์ด

ภาพต้นฉบับมีข้อความฝังอยู่แล้ว การแก้ config ไม่เปลี่ยนข้อความในภาพ ต้องเปลี่ยนภาพและข้อความอ่านให้สอดคล้องกันด้วย

## การตรวจสอบที่ทำแล้ว
- วันอาทิตย์ 25 ตุลาคม 2026 ตรงกับ 25 ตุลาคม 2569
- คงลิงก์สถานที่จัดงาน https://maps.app.goo.gl/DUhbhavXCWh5exkH7
- ตรวจภาพ WebP เทียบต้นฉบับแบบ pixel comparison
- validate.py และ build-web.cjs ผ่าน
- test-invitation-card.cjs: 7 tests ครอบคลุมสอง entrypoints, duplicate click, ปิดกลาง animation, โหลดภาพช้า/ล้มเหลว, Reduce Motion, mute/ไม่มี AudioContext และซ่อนแท็บ
- test-dialogs.cjs: 5 tests การคืน scroll, focus และความกว้างหลังปิด modal
- test-wedding-update.cjs: 6 tests ระบบเดิม

ข้อจำกัด: เบราว์เซอร์ตรวจงานไม่สามารถเปิด local preview ได้ (ERR_BLOCKED_BY_CLIENT) จึงยังไม่ได้ตรวจภาพเคลื่อนไหว ความพอดีจอ และฟังระดับเสียงบน iPhone/Samsung จริง เสียงขึ้นกับการอนุญาตและระดับเสียงของเครื่อง; หากเสียงถูกบล็อก การ์ดยังเปิดได้ตามปกติ

## ติดตั้ง
แตก ZIP แล้วอัปเดตไฟล์ในโปรเจกต์ Vercel เดิมโดยเก็บ Environment Variables เดิม ใช้ build tools/build-web.cjs เหมือนเดิม แพ็กเกจนี้ยังไม่ได้ Deploy ให้โดยอัตโนมัติ
