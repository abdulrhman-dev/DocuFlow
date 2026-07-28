const jwt = require("jsonwebtoken");

const TTL_DAYS = Number(process.env.OUTSIDE_LINK_TTL_DAYS || 30);

function signOutsideAssignmentToken({ requestId, email }) {
  return jwt.sign(
    { typ: "outside", requestId, email },
    process.env.JWT_SECRET,
    { expiresIn: `${TTL_DAYS}d` },
  );
}

function verifyOutsideAssignmentToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded?.typ !== "outside" || !decoded.requestId || !decoded.email) {
    throw new Error("Invalid outside-assignment token");
  }
  return { requestId: Number(decoded.requestId), email: String(decoded.email) };
}

module.exports = { signOutsideAssignmentToken, verifyOutsideAssignmentToken };
