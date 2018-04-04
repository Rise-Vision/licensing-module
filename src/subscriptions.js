/* eslint-disable function-paren-new, function-paren-newline */

const licensing = require("common-display-module/licensing");
const messaging = require("common-display-module/messaging");

const config = require("./config");
const persistence = require("./persistence");
const store = require("./store");
const logger = require("./logger");

const supportedProductCodes = [
  licensing.RISE_PLAYER_PROFESSIONAL_PRODUCT_CODE,
  licensing.RISE_STORAGE_PRODUCT_CODE
];

let currentSubscriptionStatusTable = {};

function init(data) {
  currentSubscriptionStatusTable = data;
}

function subscriptionDataChangesFor(current, updated) {
  return Object.keys(updated).filter(key =>
    !current[key] || current[key].active !== updated[key].active
  );
}

function getSubscriptionData() {
  return currentSubscriptionStatusTable;
}

function broadcastSubscriptionData(codes = supportedProductCodes) {
  const message = {
    from: config.moduleName,
    topic: "licensing-update",
    subscriptions: currentSubscriptionStatusTable
  };

  return messaging.broadcastMessage(message)
  .then(() => Promise.all(codes
    .filter(code => message.subscriptions[code])
    .map(code =>
      broadcastSimpleLicensingMessages(message.subscriptions[code], code)
    )
  ));
}

function broadcastSubscriptionDataForCode(code) {
  return currentSubscriptionStatusTable[code] &&
    broadcastSimpleLicensingMessages(currentSubscriptionStatusTable[code], code);
}

function broadcastSimpleLicensingMessages(subscription, code) {
  const isAuthorized = subscription.active;
  const simpleMessage = {from: config.moduleName, isAuthorized};
  const suffix = `${isAuthorized ? '' : 'not '}authorized`;

  if (code === licensing.RISE_PLAYER_PROFESSIONAL_PRODUCT_CODE) {
    Object.assign(simpleMessage, {
      topic: 'rpp-licensing-update', userFriendlyStatus: `RPP ${suffix}`
    });
  }
  else if (code === licensing.RISE_STORAGE_PRODUCT_CODE) {
    Object.assign(simpleMessage, {
      topic: 'storage-licensing-update', userFriendlyStatus: `Rise Storage ${suffix}`
    });
  }
  else {
    return Promise.resolve();
  }

  return Promise.all([
    messaging.broadcastMessage(simpleMessage),
    messaging.broadcastToLocalWS(simpleMessage)
  ]);
}

function applyStatusUpdates(updatedStatusTable) {
  const changes = subscriptionDataChangesFor(currentSubscriptionStatusTable, updatedStatusTable);

  currentSubscriptionStatusTable =
    Object.assign({}, currentSubscriptionStatusTable, updatedStatusTable);

  return persistence.saveAndReport(currentSubscriptionStatusTable)
  .then(() => {
    if (changes.length > 0) {
      const data = JSON.stringify(currentSubscriptionStatusTable);
      logger.file(`Subscription data updated: ${data}`);

      return broadcastSubscriptionData(changes);
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
  broadcastSubscriptionDataForCode,
  getSubscriptionData,
  loadSubscriptionApiDataAndBroadcast,
  subscriptionDataChangesFor,
  clear
};
