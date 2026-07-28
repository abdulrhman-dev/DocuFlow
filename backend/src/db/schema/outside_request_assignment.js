const {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  primaryKey,
} = require("drizzle-orm/pg-core");
const { requests } = require("./request");
const { outsideSupervisors } = require("./outside_supervisor");
const { requestStatusEnum } = require("./_enums");

const outsideRequestAssignments = pgTable(
  "OutsideRequestAssignments",
  {
    requestId: integer("requestId")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    outsideEmail: text("outsideEmail")
      .notNull()
      .references(() => outsideSupervisors.email, { onDelete: "cascade" }),
    status: requestStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejectionReason"),
    respondedAt: timestamp("respondedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.requestId, t.outsideEmail] }),
  }),
);

module.exports = { outsideRequestAssignments };
