const messaging = require("common-display-module/messaging");
const config = require("./config");

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
  return Promise.resolve();
}

module.exports = {
  broadcastDisplayData,
  saveDisplayData
}
