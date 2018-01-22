/* eslint-disable function-paren-newline */

const common = require("common-display-module");
const config = require("./config");
const iterations = require("./iterations");
const logger = require("./logger");
const platform = require("rise-common-electron").platform;

// So we ensure it will only be sent once.
let watchMessageAlreadySent = false

function clearMessageAlreadySentFlag() {
  watchMessageAlreadySent = false;
}

function startWatchIfLocalStorageModuleIsAvailable(message) {
  if (!watchMessageAlreadySent) {
    logger.debug(JSON.stringify(message));

    const clients = message.clients;

    if (clients.includes("local-storage")) {
      return sendWatchMessage()
      .then(() => watchMessageAlreadySent = true)
    }
  }

  return Promise.resolve()
}

function sendWatchMessage() {
  return common.getDisplayId()
  .then(displayId =>
    common.broadcastMessage({
      from: config.moduleName,
      topic: "watch",
      filePath: `risevision-display-notifications/${displayId}/content.json`
    })
  );
}

function loadCompanyIdFromContent(data, schedule) {
  const json = JSON.parse(data);

  if (json.content && json.content.schedule && json.content.schedule.companyId) {
    const companyId = json.content.schedule.companyId;

    logger.file(`Setting company id as ${companyId}`);
    config.setCompanyId(companyId);

    iterations.ensureLicensingLoopIsRunning(schedule);
  }
  else {
    logger.error(`Company id could not be retrieved from content: ${data}`);
  }
}

function receiveContentFile(message, schedule = setInterval) {
  if (["DELETED", "NOEXIST"].includes(message.status)) {
    return;
  }

  const path = message.ospath;

  if (path && platform.fileExists(path)) {
    return platform.readTextFile(path)
    .then(data => {
      try {
        loadCompanyIdFromContent(data, schedule);
      } catch (error) {
        logger.error(error.stack, `Could not parse content file ${path}`);
      }
    })
  }
}

module.exports = {
  startWatchIfLocalStorageModuleIsAvailable,
  clearMessageAlreadySentFlag,
  receiveContentFile
};
