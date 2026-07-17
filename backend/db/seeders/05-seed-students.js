const { eq } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

const ARABIC_FIRST = [
  "أحمد",
  "محمد",
  "عمر",
  "خالد",
  "علي",
  "يوسف",
  "حسن",
  "مصطفى",
  "سارة",
  "منى",
  "فاطمة",
  "مريم",
  "هدى",
  "نور",
  "دينا",
  "ياسمين",
  "طارق",
  "كريم",
  "أنس",
  "زياد",
];
const ARABIC_LAST = [
  "عبد الله",
  "إبراهيم",
  "السيد",
  "شلبي",
  "حمدي",
  "فؤاد",
  "غانم",
  "بكري",
  "المصري",
  "العدل",
  "حسانين",
  "الحديدي",
  "المنشاوي",
  "الشناوي",
  "الخولي",
  "المهدي",
  "الشرقاوي",
  "طه",
  "منصور",
  "رياض",
];

function fullNameFor(i) {
  const first = ARABIC_FIRST[i % ARABIC_FIRST.length];
  const last = ARABIC_LAST[(i * 3) % ARABIC_LAST.length];
  return `${first} ${last}`;
}

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) await db.delete(schema.students);

    const now = new Date();
    const oneYearAhead = new Date(now);
    oneYearAhead.setFullYear(now.getFullYear() + 1);

    for (let i = 1; i <= 20; i++) {
      const code = `STU${String(i).padStart(4, "0")}`;
      const existing = await db.query.students.findFirst({
        where: eq(schema.students.code, code),
      });
      const name = fullNameFor(i);
      if (existing) {
        // keep name in sync so old English names get replaced
        if (existing.name !== name) {
          await db
            .update(schema.students)
            .set({ name })
            .where(eq(schema.students.code, code));
        }
        continue;
      }
      await db.insert(schema.students).values({
        code,
        name,
        registrationStart: now,
        registrationEnd: oneYearAhead,
      });
    }
  },
};
