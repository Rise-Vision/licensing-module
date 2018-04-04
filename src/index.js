/* eslint-disable default-case, function-paren-newline, no-unused-expressions, no-unused-vars */

const messaging = require("common-display-module/messaging");
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const persistence = require("./persistence");
const subscriptions = require("./subscriptions");
const watch = require("./watch");

function configureMessagingHandlers(receiver, schedule) {
  receiver.on("message", message => {
    if (!message.topic) {return;}
    switch (message.topic.toUpperCase()) {
      case "CLIENT-LIST":
        return watch.sendWatchMessages(message);
      case "LICENSING-REQUEST":
        return subscriptions.broadcastSubscriptionData();
      case "FILE-UPDATE":
        return watch.handleFileUpdate(message, schedule)
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
