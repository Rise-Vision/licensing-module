const platform = require("rise-common-electron/platform");

const config = require("./config");
const logger = require("./logger");
const subscriptions = require("./subscriptions");

const EMPTY_CONTENTS = {companyId: null, licensing: {}};

function save() {
  const companyId = config.getCompanyId();
  const licensing = subscriptions.getSubscriptionData();

  const data = {companyId, licensing};
  const text = JSON.stringify(data);

  const path = config.getCachePath();

  return platform.writeTextFile(path, text);
}

function retrieve() {
  const path = config.getCachePath();

  if (platform.fileExists(path)) {
    return platform.readTextFile(path)
    .then(text => {
      try {
        return JSON.parse(text);
      }
      catch (error) {
        logger.file(error.stack, `Illegal JSON content: ${text}`);

        return EMPTY_CONTENTS;
      }
    })
    .catch(error => {
      logger.file(error.stack, `File read error: ${path}`);

      return EMPTY_CONTENTS;
    });
  }

  return Promise.resolve(EMPTY_CONTENTS);
}

module.exports = {retrieve, save};
