const { spawn } = require("child_process");

const backend = spawn(process.execPath, ["Backend/src/api/server.js"], {
  stdio: "inherit",
});

const frontend = spawn(process.execPath, [require.resolve("react-scripts/scripts/start")], {
  stdio: "inherit",
  env: process.env,
});

const shutdown = (code) => {
  if (!backend.killed) {
    backend.kill("SIGINT");
  }

  if (!frontend.killed) {
    frontend.kill("SIGINT");
  }

  process.exit(code);
};

backend.on("exit", (code) => shutdown(code || 0));
frontend.on("exit", (code) => shutdown(code || 0));

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));