/* eslint-disable function-paren-newline */

const common = require("common-display-module");
const licensing = require("common-display-module/licensing");
const messaging = require("common-display-module/messaging");
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const persistence = require("./persistence");
const subscriptions = require("./subscriptions");
const platform = require("rise-common-electron").platform;

const rppProductCode = licensing.RISE_PLAYER_PROFESSIONAL_PRODUCT_CODE;

const displayConfigBucket = "risevision-display-notifications";

// So we ensure it will only be sent once.
let contentWatchMessageAlreadySent = false
let authorizationWatchMessageAlreadySent = false

function clearMessagesAlreadySentFlag() {
  contentWatchMessageAlreadySent = false;
  authorizationWatchMessageAlreadySent = false
}

function sendWatchMessages(message) {
  return Promise.all([sendContentWatch(message), sendRppLicenseWatch(message)]);
}

function sendContentWatch(message) {
  if (!contentWatchMessageAlreadySent && !config.getCompanyId()) {
    logger.debug(JSON.stringify(message));

    const clients = message.clients;

    if (clients.includes("local-storage")) {
      return module.exports.sendWatchMessageFor('content.json')
      .then(() => contentWatchMessageAlreadySent = true)
      .catch(error =>
        logger.file(error.stack, 'Error while sending content watch message')
      )
    }
  }

  return Promise.resolve();

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

function loadCompanyIdFromContent(json, data, schedule) {
  // Note that if the display doesn't have a schedule assigned, licensing data won't be avaiable.
  if (json.content && json.content.schedule && json.content.schedule.companyId) {
    const companyId = json.content.schedule.companyId;

    return iterations.configureAndStartIfCompanyIdIsAvailable(companyId, null, schedule)
    .then(() => persistence.save(subscriptions.getSubscriptionData()));
  }

  return logger.error(`Company id could not be retrieved from content: ${data}`);
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

  if (message.filePath.endsWith("/content.json")) {
    return receiveJsonFile(message, 'content', (json, data) =>
      loadCompanyIdFromContent(json, data, schedule));
  }

  if (message.filePath.endsWith(`/${rppProductCode}.json`)) {
    return receiveJsonFile(message, 'RPP authorization', (json, data) =>
      loadRppAuthorization(json, data));
  }
}

module.exports = {
  handleFileUpdate,
  clearMessagesAlreadySentFlag,
  sendWatchMessageFor,
  sendWatchMessages
};
