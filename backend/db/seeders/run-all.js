require("../../src/config/env.js");
const path = require("path");

// Optional flags:
//   --reset : run seeders in "destructive" mode (they truncate their tables
//             before inserting). Useful in CI or a fresh dev environment.
//   --only=NN[,NN,...] : run only seeders with those numeric prefixes.
const flags = process.argv.slice(2);
const RESET = flags.includes("--reset");
const only = (() => {
  const arg = flags.find((f) => f.startsWith("--only="));
  if (!arg) return null;
  return new Set(
    arg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim()),
  );
})();

const seeds = [
  "01-seed-workflows-stages.js",
  "02-seed-templates.js",
  "03-seed-stage-templates.js",
  "04-seed-users-departments.js",
  "05-seed-students.js",
  "06-seed-supervised-students.js",
  "07-seed-instances.js",
];

(async () => {
  const { runMigrations, pool } = require("../../src/db");
  await runMigrations();

  for (const file of seeds) {
    const prefix = file.slice(0, 2);
    if (only && !only.has(prefix)) continue;

    console.log(`Running ${file}${RESET ? " (reset)" : ""}...`);
    const seeder = require(path.join(__dirname, file));
    await seeder.up({ reset: RESET });
    console.log(`Done ${file}`);
  }
  await pool.end();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
