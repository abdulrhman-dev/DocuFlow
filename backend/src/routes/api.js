const express = require("express");

const authRouter = require("./auth.route");
const workflowRouter = require("./workflow.route");
const instanceRouter = require("./instance.route");
const requestRouter = require("./request.route");
const meRouter = require("./me.route");
const templateRouter = require("./template.route");
const documentRouter = require("./document.route");
const departmentRouter = require("./department.route");
const studentRouter = require("./student.route");
const userRouter = require("./user.route");
const deanRouter = require("./dean.route");
const planRouter = require("./plan.route");

const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/workflow", workflowRouter);
apiRouter.use("/instance", instanceRouter);
apiRouter.use("/request", requestRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/template", templateRouter);
apiRouter.use("/document", documentRouter);
apiRouter.use("/department", departmentRouter);
apiRouter.use("/student", studentRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/dean", deanRouter);
apiRouter.use("/plan", planRouter);

module.exports = apiRouter;
