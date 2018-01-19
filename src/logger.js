/* eslint-disable function-paren-newline */
const common = require("common-display-module");
const {
  bqProjectName, bqDataset, bqTable, failedEntryFile, logFolder,
  moduleName, getModuleVersion, getSubscriptStatusApiUrl
} = require("./config");

const externalLogger = require("common-display-module/external-logger")(bqProjectName, bqDataset, failedEntryFile);
const logger = require("rise-common-electron/logger")(externalLogger, logFolder, moduleName);

// Creates the detail data structure that the logging functions expect.
function detailsFor(eventDetails, data = {}) {
  return common.getDisplayId().then(displayId =>
    Object.assign({
      "event_details": eventDetails,
      "display_id": displayId,
      "version": getModuleVersion() || "unknown"
    }, data)
  );
}

function error(eventDetails, userFriendlyMessage) {
  return detailsFor(eventDetails)
  .then(detail => logger.error(detail, userFriendlyMessage, bqTable));
}

function all(eventType, eventDetails = "", data = {}) {
  return detailsFor(eventDetails, data)
    .then(detail => logger.all(eventType, detail, null, bqTable));
}

function external(eventType, eventDetails, data = {}) {
  return detailsFor(eventDetails, data)
  .then(detail => logger.external(eventType, detail, bqTable));
}

function logSubscriptionAPICallError(err, remote = true) {
  const detail = err.stack;
  const url = getSubscriptStatusApiUrl();
  const userFriendlyMessage = `Subscription Status API Call failed: ${url}`;

  const call = remote ? error : module.exports.file;

  return call(detail, userFriendlyMessage);
}

module.exports = {
  file: logger.file,
  debug: logger.debug,
  error,
  external,
  all,
  logSubscriptionAPICallError
};
