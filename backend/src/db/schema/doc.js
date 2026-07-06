const {
  pgTable,
  serial,
  integer,
  jsonb,
  timestamp,
} = require("drizzle-orm/pg-core");
const { workflowInstances } = require("./workflow_instance");
const { templates } = require("./template");

const documents = pgTable("Documents", {
  id: serial("id").primaryKey(),
  data: jsonb("data"),
  templateId: integer("templateId")
    .notNull()
    .references(() => templates.id),
  instanceId: integer("instanceId")
    .notNull()
    .references(() => workflowInstances.id, { onDelete: "cascade" }),
  stageOrder: integer("stageOrder").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

module.exports = { documents };
