const got = require("got");
const common = require("common-display-module");
const config = require("./config");

const MAX_RETRIES = 10;
const MIN_RETRY_INTERVAL = 2000;
const MAX_RETRY_INTERVAL = 10000;

// Status list where a subscription to a product can be considered as 'active'.
// See https://developer.risevision.com/documentation/store-api/subscription-status/sub-status-api
const ACTIVE_STATUS = ["Free", "On Trial", "Subscribed"];

function fetchJSON(url) {
  const agents = common.getProxyAgents();
  const options = {
    json: true,
    agent: agents.httpsAgent,
    retries: count => {
      if (count > MAX_RETRIES) {
        return 0;
      }

      return Math.min(MIN_RETRY_INTERVAL * count, MAX_RETRY_INTERVAL);
    }
  };

  return got(url, options);
}

function fetchSubscriptionStatus() {
  const url = config.getSubscriptionStatusApiUrl();

  return fetchJSON(url);
}

function getSubscriptionStatusUpdates() {
  return module.exports.fetchSubscriptionStatus()
  .then(response => {
    const timestamp = Date.now();
    const statusTable = {};

    response.body.forEach(entry => {
      const active = ACTIVE_STATUS.includes(entry.status);

      statusTable[entry.pc] = {active, timestamp};
    });

    return statusTable;
  });
}

module.exports = {
  fetchSubscriptionStatus,
  getSubscriptionStatusUpdates
};
