const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`THE BIG GYM backend running at http://localhost:${env.port}`);
});
