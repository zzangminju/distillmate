const fs = require("fs");
const path = require("path");

const apiBaseUrl =
  process.env.API_BASE_URL
  || "http://127.0.0.1:8000";

const configContent = `window.APP_CONFIG = ${JSON.stringify(
  {
    API_BASE_URL: apiBaseUrl,
  },
  null,
  2
)};\n`;

const configPath = path.join(
  __dirname,
  "runtime-config.js"
);

fs.writeFileSync(
  configPath,
  configContent,
  "utf8"
);

console.log(
  `Frontend API URL configured: ${apiBaseUrl}`
);
