const { pgTable, text, boolean, timestamp } = require("drizzle-orm/pg-core");

const outsideSupervisors = pgTable("OutsideSupervisors", {
  email: text("email").primaryKey(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  isIndustrial: boolean("isIndustrial").notNull().default(false),
  academicDegreeAndInstitution: text("academicDegreeAndInstitution"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

module.exports = { outsideSupervisors };
