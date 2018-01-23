/* eslint-disable default-case */

const messaging = require("common-display-module/messaging");
const config = require("./config");
const logger = require("./logger");
const subscriptions = require("./subscriptions");
const watch = require("./watch");

const displayConfigBucket = "risevision-display-notifications";

function run(schedule = setInterval) {
  messaging.receiveMessages(config.moduleName).then(receiver => {
    receiver.on("message", message => {
      switch (message.topic.toUpperCase()) {
        case "CLIENT-LIST":
          return watch.startWatchIfLocalStorageModuleIsAvailable(message);
        case "LICENSING-REQUEST":
          return subscriptions.broadcastSubscriptionData();
        case "FILE-UPDATE":
          if (!message.filePath || !message.filePath.startsWith(displayConfigBucket)) {
            return;
          }

          if (message.filePath.endsWith("/content.json")) {
            return watch.receiveContentFile(message, schedule);
          }
      }
    });

    messaging.getClientList(config.moduleName);

    return logger.all("started");
  })
  .catch(error => logger.file(error.stack, 'Could not connect'));
}

if (process.env.NODE_ENV !== "test") {
  run();
}

module.exports = {run};
