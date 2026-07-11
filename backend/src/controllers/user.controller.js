const asyncDec = require("../utils/asyncDec");
const UserService = require("../services/user.service");

async function searchUsers(req, res) {
  const { role, query } = req.query;
  const users = await UserService.searchUsers({ role, query });
  res.json({ status: "success", data: { users } });
}

async function getUser(req, res) {
  const user = await UserService.getUserById(req.params.id);
  res.json({ status: "success", data: { user } });
}

module.exports = {
  searchUsers: asyncDec(searchUsers),
  getUser: asyncDec(getUser),
};
