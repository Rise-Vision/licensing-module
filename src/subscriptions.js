/* eslint-disable function-paren-new, function-paren-newline */
const messaging = require("common-display-module/messaging");

const config = require("./config");
const store = require("./store");
const logger = require("./logger");

let currentSubscriptionStatusTable = {};

function init(data) {
  currentSubscriptionStatusTable = data;
}

function isSubscriptionDataChanged(current, updated) {
  const currentKeys = Object.keys(current);
  const updatedKeys = Object.keys(updated);

  return currentKeys.length !== updatedKeys.length ||
    currentKeys.some(key =>
      !updated[key] || current[key].active !== updated[key].active
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

  messaging.broadcastMessage(message);
}

function loadDataAndBroadcast() {
  logger.debug("loading subscription data");

  // Currently the subscription status come only from store, but in future modules it may also come from the display's GCS bucket.
  return store.getSubscriptionStatusTable()
  .then(updatedSubscriptionStatusTable => {
    const changed = isSubscriptionDataChanged(currentSubscriptionStatusTable, updatedSubscriptionStatusTable);

    currentSubscriptionStatusTable = updatedSubscriptionStatusTable;

    return changed && broadcastSubscriptionData();
  })
}

// For testing purposes only
function clear() {
  currentSubscriptionStatusTable = {};
}

module.exports = {
  init,
  broadcastSubscriptionData,
  getSubscriptionData,
  isSubscriptionDataChanged,
  loadDataAndBroadcast,
  clear
};
