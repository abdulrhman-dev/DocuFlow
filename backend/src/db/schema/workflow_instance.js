const {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} = require("drizzle-orm/pg-core");
const { workflows } = require("./workflow");
const { stages } = require("./stage");
const { users } = require("./user");
const { departments } = require("./department");
const { students } = require("./student");
const { instanceStatusEnum } = require("./_enums");

const workflowInstances = pgTable("WorkflowInstances", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflowId")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  stageId: integer("stageId")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  rejectedAtStageId: integer("rejectedAtStageId").references(() => stages.id, {
    onDelete: "set null",
  }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id),
  departmentId: integer("departmentId")
    .notNull()
    .references(() => departments.id),
  studentId: text("studentId")
    .notNull()
    .references(() => students.code, { onDelete: "restrict" }),
  status: instanceStatusEnum("status").notNull().default("in_progress"),

  // Affairs (administrator) printed the packet.
  printedById: integer("printedById").references(() => users.id, {
    onDelete: "set null",
  }),
  printedAt: timestamp("printedAt", { withTimezone: true }),

  // Director approved / rejected.
  approvedById: integer("approvedById").references(() => users.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approvedAt", { withTimezone: true }),
  approvalFile: text("approvalFile"),
  rejectionReason: text("rejectionReason"),

  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

module.exports = { workflowInstances };
