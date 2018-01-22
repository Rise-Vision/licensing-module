/* eslint-disable default-case */

const common = require("common-display-module");
const config = require("./config");
const logger = require("./logger");
const watch = require("./watch");

const displayConfigBucket = "risevision-display-notifications";

function run(schedule = setInterval) {
  common.receiveMessages(config.moduleName).then(receiver => {
    receiver.on("message", message => {
      switch (message.topic.toUpperCase()) {
        case "CLIENT-LIST":
          return watch.startWatchIfLocalStorageModuleIsAvailable(message);
        case "FILE-UPDATE":
          if (!message.filePath || !message.filePath.startsWith(displayConfigBucket)) {
            return;
          }

          if (message.filePath.endsWith("/content.json")) {
            return watch.receiveContentFile(message, schedule);
          }
      }
    });

    common.getClientList(config.moduleName);

    return logger.all("started");
  });
}

if (process.env.NODE_ENV !== "test") {
  run();
}

module.exports = {run};
