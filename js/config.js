/* แก้ข้อมูลหลักในไฟล์นี้ แล้วเปิด index.html ใหม่ ไม่ต้องติดตั้งโปรแกรมเสริม */
window.WEDDING_CONFIG = {
  // Motion direction: slow watercolor reveal, subtle depth, no fast bouncing.
  motion: {
    enabled: true,
    intensity: 0.65, // 0–1: ความแรงของการลอยและ parallax
    ambient: true, // ภาพลอยช้ามาก เฉพาะเมื่ออยู่บนหน้าจอ
    scroll: true,
    pointer: true, // ทำงานกับเมาส์เท่านั้น ไม่จับการลากนิ้วบนมือถือ
    revealDuration: 1500 // milliseconds
  },
  couple: { groom: 'Somchai', bride: 'Phantira', monogram: 'SP' },
  invitation: 'ด้วยความยินดีของเราทั้งสองและครอบครัว\nขอเชิญคุณมาเป็นส่วนหนึ่งในวันสำคัญของเรา',
  date: {
    // ใส่วันจริงแบบ ISO พร้อม +07:00 เช่น YYYY-MM-DDTHH:mm:ss+07:00
    eventDay: '2026-10-25', // วันยืนยัน ใช้ปี ค.ศ.
    startAt: '2026-10-25T06:00:00+07:00', // เวลาเริ่มตามที่เจ้าของงานกำหนด
    endAt: '2026-10-25T12:00:00+07:00',
    timeZone: 'Asia/Bangkok',
    pendingLabel: 'วันงานจะแจ้งให้ทราบอีกครั้ง',
    timeLabel: 'เวลา 06:00–12:00'
  },
  venue: {
    name: 'สถานที่จัดงาน',
    province: 'จังหวัดหนองคาย',
    address: 'ตำบลนางิ้ว อำเภอสังคม จังหวัดหนองคาย',
    // วางลิงก์แชร์หมุด Google Maps จริง ห้ามใช้หมุดใจกลางจังหวัดแทนบ้าน
    mapUrl: 'https://maps.app.goo.gl/iWyshhVcmBTzDKYW7?g_st=ic',
    parking: 'รายละเอียดที่จอดรถจะแจ้งให้ทราบใกล้วันงาน',
    note: 'พิธีจัดภายในบ้าน แล้วมาร่วมรับประทานอาหารและใช้เวลาดี ๆ ด้วยกัน'
  },
  // ธีมสีสดใสแบบงานบุญอีสาน ปรับชื่อสี/รหัสสี หรือจำนวนสีได้ตามต้องการ
  dressCode: {
    note: 'เลือกสีใดสีหนึ่งหรือผสมกันได้ตามสบาย ขอเพียงมาร่วมยินดีกับเรา',
    colors: [
      { name: 'ส้มสด', hex: '#F4791F' },
      { name: 'ชมพูบานเย็น', hex: '#EC4899' },
      { name: 'เหลืองทอง', hex: '#FBBF24' },
      { name: 'เขียวมรกต', hex: '#10B981' },
      { name: 'ฟ้าสด', hex: '#0EA5E9' }
    ]
  },
  // กำหนดการตามที่เจ้าของงานส่งให้ล่าสุด 9 กันยายน 2569
  scheduleConfirmed: true,
  scheduleNote: 'กำหนดพิธีการ รายละเอียดดังต่อไปนี้',
  schedule: [
    {
        "time": "06:00–06:30",
        "title": "ทำบุญเช้าเพื่อความเป็นสิริมงคล",
        "description": ""
    },
    {
        "time": "08:30–09:00",
        "title": "แห่ขันหมากรับตัวเจ้าสาว",
        "description": ""
    },
    {
        "time": "09:09–10:00",
        "title": "พิธีบายศรีสู่ขวัญคู่บ่าวสาว",
        "description": ""
    },
    {
        "time": "10:00–10:30",
        "title": "ผูกแขนและสมมาผู้ใหญ่",
        "description": ""
    },
    {
        "time": "10:30–11:00",
        "title": "ถ่ายภาพและรับคำอวยพร",
        "description": ""
    },
    {
        "time": "11:00–12:00",
        "title": "ร่วมรับประทานอาหารและส่งแขก",
        "description": ""
    }
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
    hero: { src: 'assets/images/hero-couple.jpeg', width: 1448, height: 1086 },
    chair: { src: 'assets/images/ceremony-chair.jpeg', width: 1213, height: 1296 }
  }
};
