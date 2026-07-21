const asyncDec = require("../utils/asyncDec");
const { eq } = require("drizzle-orm");
const { db, schema } = require("../db");
const { planForDepartment, AXES } = require("../services/research-plan");
const AppError = require("../errors/AppError");
const ar = require("../translations/ar");

async function getFullPlan(req, res) {
  res.json({ status: "success", data: { axes: AXES } });
}

async function getPlanForDepartment(req, res) {
  const { departmentId } = req.query;
  if (!departmentId) throw new AppError(ar.instance.departmentNotFound, 400);
  const dept = await db.query.departments.findFirst({
    where: eq(schema.departments.id, Number(departmentId)),
    columns: { id: true, name: true },
  });
  if (!dept) throw new AppError(ar.instance.departmentNotFound, 404);
  const axes = planForDepartment(dept.name);
  res.json({ status: "success", data: { axes, departmentName: dept.name } });
}

module.exports = {
  getFullPlan: asyncDec(getFullPlan),
  getPlanForDepartment: asyncDec(getPlanForDepartment),
};
