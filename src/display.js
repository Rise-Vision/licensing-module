const messaging = require("common-display-module/messaging");
const config = require("./config");
const persistence = require("./persistence");
const subscriptions = require("./subscriptions");

let displayData = null;

function broadcastDisplayData() {
  if (!displayData) {
    return Promise.reject(new Error("Display data not set"));
  }

  const message = {
    from: config.moduleName,
    topic: "display-data-update",
    displayData
  };

  return messaging.broadcastMessage(message);
}

function saveDisplayData(data) {
  displayData = data;
  if (!displayData) {
    return Promise.resolve();
  }
  return broadcastDisplayData()
  .then(() => persistence.save(subscriptions.getSubscriptionData()));
}

module.exports = {
  broadcastDisplayData,
  saveDisplayData
}
