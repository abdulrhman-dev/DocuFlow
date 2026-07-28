const {
  pgTable,
  integer,
  text,
  timestamp,
  primaryKey,
} = require("drizzle-orm/pg-core");
const { workflowInstances } = require("./workflow_instance");
const { outsideSupervisors } = require("./outside_supervisor");

const instanceOutsideSupervisors = pgTable(
  "InstanceOutsideSupervisors",
  {
    instanceId: integer("instanceId")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "cascade" }),
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
    pk: primaryKey({ columns: [t.instanceId, t.outsideEmail] }),
  }),
);

module.exports = { instanceOutsideSupervisors };
