const got = require("got");
const common = require("common-display-module");
const config = require("./config");

// Status list where a subscription to a product can be considered as 'active'.
// See https://developer.risevision.com/documentation/store-api/subscription-status/sub-status-api
const ACTIVE_STATUS = ["Free", "On Trial", "Subscribed"];

function fetchSubscriptionStatus() {
  const companyId = config.getCompanyId();

  if (!companyId) {
    return Promise.reject(new Error("Company id not set"));
  }

  const url = config.getSubscriptionStatusApiUrl();

  const agents = common.getProxyAgents();
  const options = {json: true, agent: agents.httpsAgent};

  return got(url, options);
}

function getSubscriptionStatusTable() {
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

module.exports = {fetchSubscriptionStatus, getSubscriptionStatusTable};
