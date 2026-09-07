/* แก้ข้อมูลหลักในไฟล์นี้ แล้วเปิด index.html ใหม่ ไม่ต้องติดตั้งโปรแกรมเสริม */
window.WEDDING_CONFIG = {
  couple: { groom: 'Somchai', bride: 'Phantira', monogram: 'SP' },
  invitation: 'ด้วยความยินดีของเราทั้งสองและครอบครัว\nขอเชิญคุณมาเป็นส่วนหนึ่งในวันสำคัญของเรา',
  date: {
    // ใส่วันจริงแบบ ISO พร้อม +07:00 เช่น YYYY-MM-DDTHH:mm:ss+07:00
    startAt: null,
    endAt: null,
    timeZone: 'Asia/Bangkok',
    pendingLabel: 'วันงานจะแจ้งให้ทราบอีกครั้ง',
    timeLabel: 'งานช่วงเช้า · เสร็จสิ้นไม่เกินเที่ยง'
  },
  venue: {
    name: 'บ้านของเรา',
    province: 'จังหวัดหนองคาย',
    address: '',
    // วางลิงก์แชร์หมุด Google Maps จริง ห้ามใช้หมุดใจกลางจังหวัดแทนบ้าน
    mapUrl: '',
    parking: 'รายละเอียดที่จอดรถจะแจ้งให้ทราบใกล้วันงาน',
    note: 'พิธีจัดภายในบ้าน แล้วมาร่วมรับประทานอาหารและใช้เวลาดี ๆ ด้วยกัน'
  },
  // เป็นลำดับกิจกรรมเบื้องต้น แก้ชื่อและเวลาเมื่อกำหนดการยืนยันแล้ว
  scheduleConfirmed: false,
  schedule: [
    { time: '', title: 'ยินดีต้อนรับ', description: 'พบปะครอบครัวและคนที่เรารัก ก่อนเริ่มวันสำคัญ' },
    { time: '', title: 'ช่วงเวลาแห่งคำอวยพร', description: 'ร่วมพิธีมงคลและรับพรจากผู้ใหญ่' },
    { time: '', title: 'เก็บความทรงจำด้วยกัน', description: 'ถ่ายภาพร่วมกับบ่าวสาวและครอบครัว' },
    { time: '', title: 'อิ่มอร่อย ก่อนแยกย้าย', description: 'ร่วมรับประทานอาหารกลางวันแบบอบอุ่นที่บ้าน' }
  ],
  contact: {
    // กรอกชื่อและเบอร์จริง ปุ่มโทรจะปรากฏเมื่อมีหมายเลขเท่านั้น
    name: '', phone: ''
  },
  // ถ้าต้องการปุ่มตอบรับ ไปยัง Google Form หรือแบบฟอร์มจริง ให้ใส่ URL HTTPS
  rsvpUrl: '',
  // ลิงก์เว็บจริงหลังอัปโหลด ใช้แชร์เมื่อเปิดจากไฟล์ในเครื่อง
  siteUrl: '',
  assets: {
    hero: { src: 'assets/images/hero-couple.png', width: 1536, height: 1024 },
    chair: { src: 'assets/images/ceremony-chair.png', width: 1024, height: 1536 }
  }
};
