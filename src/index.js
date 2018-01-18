const common = require("common-display-module");
const config = require("./config");
const logger = require("./logger");

function run() {
  common.receiveMessages(config.moduleName).then(() => {
    // later process incoming messages here

    return logger.all("started");
  });
}

if (process.env.NODE_ENV !== "test") {
  run();
}

module.exports = {run};
