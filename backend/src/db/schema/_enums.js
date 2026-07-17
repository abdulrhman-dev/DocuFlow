const { pgEnum } = require("drizzle-orm/pg-core");

const roleEnum = pgEnum("role", [
  "professor",
  "department_manager",
  "administrator",
  "dean",
]);
const requestStatusEnum = pgEnum("request_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
]);
const instanceStatusEnum = pgEnum("instance_status", [
  "in_progress",
  "completed",
  "rejected",
  "executed",
]);
const accessLevelEnum = pgEnum("access_level", ["read", "respond", "edit"]);

module.exports = {
  roleEnum,
  requestStatusEnum,
  instanceStatusEnum,
  accessLevelEnum,
};
