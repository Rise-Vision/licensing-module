const platform = require("rise-common-electron/platform");

const config = require("./config");
const subscriptions = require("./subscriptions");

function save() {
  const companyId = config.getCompanyId();
  const licensing = subscriptions.getSubscriptionData();

  const data = {companyId, licensing};
  const text = JSON.stringify(data);

  const path = config.getCachePath();

  return platform.writeTextFile(path, text);
}

module.exports = {save};
