const {
  pgTable,
  integer,
  text,
  timestamp,
  primaryKey,
  boolean,
  check,
} = require("drizzle-orm/pg-core");
const { sql } = require("drizzle-orm");
const { requests } = require("./request");
const { users } = require("./user");
const { requestStatusEnum } = require("./_enums");

const requestAssignments = pgTable(
  "RequestAssignments",
  {
    requestId: integer("requestId")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    assignedToUserId: integer("assignedToUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: requestStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejectionReason"),
    year: integer("year"),
    month: integer("month"),
    isExtended: boolean("isExtended"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.requestId, t.assignedToUserId] }),
    monthRange: check(
      "request_assignments_month_range",
      sql`${t.month} IS NULL OR (${t.month} BETWEEN 1 AND 12)`,
    ),
    yearRange: check(
      "request_assignments_year_range",
      sql`${t.year} IS NULL OR (${t.year} BETWEEN 1900 AND 3000)`,
    ),
  }),
);

module.exports = { requestAssignments };
