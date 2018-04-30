/* eslint-disable default-case, function-paren-newline, no-unused-expressions, no-unused-vars */

const commonLicensing = require("common-display-module/licensing");
const messaging = require("common-display-module/messaging");
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const persistence = require("./persistence");
const subscriptions = require("./subscriptions");
const watch = require("./watch");
const display = require("./display");

function configureMessagingHandlers(receiver, schedule) {
  receiver.on("message", message => {
    if (!message.topic) {return;}
    switch (message.topic.toUpperCase()) {
      case "CLIENT-LIST":
        return watch.sendWatchMessages(message);
      case "LICENSING-REQUEST":
        logger.file('licensing data requested');

        return subscriptions.broadcastSubscriptionData();
      case "DISPLAY-DATA-REQUEST":
        return display.broadcastDisplayData();
      case "RPP-LICENSING-REQUEST":
        return subscriptions.broadcastSubscriptionDataForCode(commonLicensing.RISE_PLAYER_PROFESSIONAL_PRODUCT_CODE);
      case "STORAGE-LICENSING-REQUEST":
        return subscriptions.broadcastSubscriptionDataForCode(commonLicensing.RISE_STORAGE_PRODUCT_CODE);
      case "FILE-UPDATE":
        return watch.handleFileUpdate(message, schedule)
    }
  });

  messaging.getClientList(config.moduleName);

  return logger.all("started");
}

function run(schedule = setInterval) {
  return persistence.retrieve()
  .then(data => {
    const {companyId, licensing} = data;

    messaging.receiveMessages(config.moduleName).then(receiver =>
      iterations.configureAndStartIfCompanyIdIsAvailable(companyId, licensing, schedule)
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
