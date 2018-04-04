/* eslint-disable function-paren-new, function-paren-newline */
const messaging = require("common-display-module/messaging");

const config = require("./config");
const persistence = require("./persistence");
const store = require("./store");
const logger = require("./logger");

let currentSubscriptionStatusTable = {};

function init(data) {
  currentSubscriptionStatusTable = data;
}

function hasSubscriptionDataChanges(current, updated) {
  const currentKeys = Object.keys(current);
  const updatedKeys = Object.keys(updated);

  return currentKeys.length < updatedKeys.length ||
    updatedKeys.some(key =>
      !current[key] || current[key].active !== updated[key].active
    );
}

function getSubscriptionData() {
  return currentSubscriptionStatusTable;
}

function broadcastSubscriptionData() {
  const message = {
    from: config.moduleName,
    topic: "licensing-update",
    subscriptions: currentSubscriptionStatusTable
  };

  return messaging.broadcastMessage(message);
}

function applyStatusUpdates(updatedStatusTable) {
  const changed = hasSubscriptionDataChanges(currentSubscriptionStatusTable, updatedStatusTable);

  currentSubscriptionStatusTable =
    Object.assign({}, currentSubscriptionStatusTable, updatedStatusTable);

  return persistence.saveAndReport(currentSubscriptionStatusTable)
  .then(() => {
    if (changed) {
      const data = JSON.stringify(currentSubscriptionStatusTable);
      logger.file(`Subscription data updated: ${data}`);

      return broadcastSubscriptionData();
    }
  });
}

function loadSubscriptionApiDataAndBroadcast() {
  logger.debug("loading subscription data");

  // Currently the subscription status come only from store, but in future modules it may also come from the display's GCS bucket.
  return store.getSubscriptionStatusUpdates()
  .then(applyStatusUpdates);
}

// For testing purposes only
function clear() {
  currentSubscriptionStatusTable = {};
}

module.exports = {
  init,
  applyStatusUpdates,
  broadcastSubscriptionData,
  getSubscriptionData,
  hasSubscriptionDataChanges,
  loadSubscriptionApiDataAndBroadcast,
  clear
};
