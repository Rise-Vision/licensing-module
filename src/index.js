/* eslint-disable default-case, function-paren-newline, no-unused-expressions, no-unused-vars */

const messaging = require("common-display-module/messaging");
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const persistence = require("./persistence");
const subscriptions = require("./subscriptions");
const watch = require("./watch");
const deprecatedIterations = require("./deprecated_widget_api_iterations");

const displayConfigBucket = "risevision-display-notifications";

function startSubscriptionApiRequestsIfCompanyIdIsAvailable(companyId, licensing, schedule) {
  if (companyId) {
    return iterations.configureAndStart(companyId, licensing, schedule);
  }

  return Promise.resolve();
}

function configureMessagingHandlers(receiver, schedule) {
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
}

function run(schedule = setInterval, scheduleDeprecated = setInterval) {
  return persistence.retrieve()
  .then(data =>{
    const {companyId, licensing} = data;

    messaging.receiveMessages(config.moduleName).then(receiver =>
      startSubscriptionApiRequestsIfCompanyIdIsAvailable(companyId, licensing, schedule)
      .then(() => deprecatedIterations.ensureLicensingLoopIsRunning(scheduleDeprecated))
      .then(() => configureMessagingHandlers(receiver, schedule))
      .catch(error =>
        logger.file(error.stack, 'Unexpected error while configuring messaging handlers')
      )
    );
  })
  .catch(error =>
    logger.file(error.stack, 'Unexpected error while starting the module')
  );
}

if (process.env.NODE_ENV !== "test") {
  run();
}

module.exports = {run};
