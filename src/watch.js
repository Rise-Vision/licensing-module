/* eslint-disable function-paren-newline */

const common = require("common-display-module");
const licensing = require("common-display-module/licensing");
const messaging = require("common-display-module/messaging");
const platform = require("rise-common-electron").platform;
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const subscriptions = require("./subscriptions");
const display = require("./display");

const rppProductCode = licensing.RISE_PLAYER_PROFESSIONAL_PRODUCT_CODE;

const displayConfigBucket = "risevision-display-notifications";

// So we ensure it will only be sent once.
let authorizationWatchMessageAlreadySent = false;
let displayWatchMessageAlreadySent = false;

function clearMessagesAlreadySentFlag() {
  authorizationWatchMessageAlreadySent = false;
  displayWatchMessageAlreadySent = false;
}

function sendWatchMessages(message) {
  return Promise.all([sendRppLicenseWatch(message), sendDisplayWatch(message)]);
}

function sendRppLicenseWatch(message) {
  if (!authorizationWatchMessageAlreadySent) {
    logger.debug(JSON.stringify(message));

    const clients = message.clients;
    const path = `authorization/${rppProductCode}.json`

    if (clients.includes("local-storage")) {
      return module.exports.sendWatchMessageFor(path)
      .then(() => authorizationWatchMessageAlreadySent = true)
      .catch(error =>
        logger.file(error.stack, 'Error while sending authorization watch message')
      )
    }
  }

  return Promise.resolve();

}

function sendDisplayWatch(message) {
  if (displayWatchMessageAlreadySent) {
    return Promise.resolve();
  }

  const clients = message.clients;
  if (!clients.includes("local-storage")) {
    return Promise.resolve();
  }

  return module.exports.sendWatchMessageFor("display.json")
  .then(() => displayWatchMessageAlreadySent = true)
  .catch(error => logger.file(error.stack, 'Error while sending display watch message'))
}

function sendWatchMessageFor(path) {
  return common.getDisplayId()
  .then(displayId =>
      messaging.broadcastMessage({
        from: config.moduleName,
        topic: "watch",
        filePath: `${displayConfigBucket}/${displayId}/${path}`
     })
  );
}

function loadCompanyIdFromDisplayData(json, data, schedule) {
  if (json.companyId) {
    const companyId = json.companyId;

    return iterations.configureAndStartIfCompanyIdIsAvailable(companyId, null, schedule)
    .then(() => display.saveDisplayData(json));
  }

  return logger.error(`Company id could not be retrieved from display data: ${data}`);
}

function loadRppAuthorization(json, data) {
  if (typeof json.authorized === 'boolean') {
    const timestamp = Date.now();
    const update = {
      [rppProductCode]: {active: json.authorized, timestamp}
    };

    return subscriptions.applyStatusUpdates(update);
  }

  return logger.error(`RPP authorization could not be retrieved from content: ${data}`);
}

function receiveJsonFile(message, label, action) {
  if (["DELETED", "NOEXIST"].includes(message.status)) {
    if (label === 'display') {logger.error(`display file not found`);}
    return;
  }

  const path = message.ospath;

  if (path && platform.fileExists(path)) {
    return platform.readTextFile(path)
    .then(data => {
      try {
        const json = JSON.parse(data);

        return action(json, data);
      } catch (error) {
        return logger.error(error.stack, `Could not parse ${label} file ${path}`);
      }
    })
    .catch(error =>
      logger.file(error.stack, `Could not read ${label} file ${path}`)
    )
  }
}

function handleFileUpdate(message, schedule = setInterval) {
  if (!message.filePath || !message.filePath.startsWith(displayConfigBucket)) {
    return;
  }

  if (message.filePath.endsWith(`/${rppProductCode}.json`)) {
    return receiveJsonFile(message, 'RPP authorization', (json, data) =>
      loadRppAuthorization(json, data));
  }

  if (message.filePath.endsWith("/display.json")) {
    return receiveJsonFile(message, 'display', (json, data) =>
      loadCompanyIdFromDisplayData(json, data, schedule));
  }
}

module.exports = {
  handleFileUpdate,
  clearMessagesAlreadySentFlag,
  sendWatchMessageFor,
  sendWatchMessages
};
