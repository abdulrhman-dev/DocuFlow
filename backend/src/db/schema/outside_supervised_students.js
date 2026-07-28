const { pgTable, text, timestamp, primaryKey } = require("drizzle-orm/pg-core");
const { students } = require("./student");
const { outsideSupervisors } = require("./outside_supervisor");

const outsideSupervisedStudents = pgTable(
  "OutsideSupervisedStudents",
  {
    studentCode: text("studentCode")
      .notNull()
      .references(() => students.code, { onDelete: "cascade" }),
    outsideEmail: text("outsideEmail")
      .notNull()
      .references(() => outsideSupervisors.email, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.studentCode, t.outsideEmail] }),
  }),
);

module.exports = { outsideSupervisedStudents };
