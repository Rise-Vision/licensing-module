/* eslint-disable function-paren-newline */

const common = require("common-display-module");
const messaging = require("common-display-module/messaging");
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const persistence = require("./persistence");
const subscriptions = require("./subscriptions");
const platform = require("rise-common-electron").platform;

const displayConfigBucket = "risevision-display-notifications";
const watchedFilePaths = [
  'content.json',
  'authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json'
];

// So we ensure it will only be sent once.
let watchMessageAlreadySent = false

function clearMessageAlreadySentFlag() {
  watchMessageAlreadySent = false;
}

function startWatchIfLocalStorageModuleIsAvailable(message) {
  if (!watchMessageAlreadySent && !config.getCompanyId()) {
    logger.debug(JSON.stringify(message));

    const clients = message.clients;

    if (clients.includes("local-storage")) {
      return module.exports.sendWatchMessage()
      .then(() => watchMessageAlreadySent = true)
      .catch(error =>
        logger.file(error.stack, 'Error while sending watch message')
      )
    }
  }

  return Promise.resolve();
}

function sendWatchMessage() {
  return common.getDisplayId()
  .then(displayId => {
    return Promise.all(watchedFilePaths.map(path =>
      messaging.broadcastMessage({
        from: config.moduleName,
        topic: "watch",
        filePath: `${displayConfigBucket}/${displayId}/${path}`
      })));
    }
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
  console.log(json, data);
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

  if (message.filePath.endsWith("/c4b368be86245bf9501baaa6e0b00df9719869fd.json")) {
    return receiveJsonFile(message, 'content', (json, data) =>
      loadRppAuthorization(json, data));
  }
}

module.exports = {
  handleFileUpdate,
  startWatchIfLocalStorageModuleIsAvailable,
  clearMessageAlreadySentFlag,
  sendWatchMessage
};
