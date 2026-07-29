const {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} = require("drizzle-orm/pg-core");

const otpRecords = pgTable("OtpRecords", {
  id: serial("id").primaryKey(),
  otp: text("otp").notNull().unique(),
  photoHash: text("photoHash").notNull(),
  filePath: text("filePath"),
  status: text("status").notNull().default("pending"),
  consumedAt: timestamp("consumedAt", { withTimezone: true }),
  consumedByInstanceId: integer("consumedByInstanceId"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

module.exports = { otpRecords };
