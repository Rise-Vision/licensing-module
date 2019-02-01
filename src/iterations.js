/* eslint-disable no-magic-numbers, line-comment-position, no-inline-comments, function-paren-newline */

// Iteration loop, separated to facilitate integration tests

const config = require("./config");
const logger = require("./logger");
const subscriptions = require("./subscriptions");

const MINUTES = 60 * 1000;
const EACH_5_MINUTES = 5 * MINUTES;
const EACH_HOUR = 60 * MINUTES;
const EACH_DAY = 24 * EACH_HOUR;

let timerId = null;
let retryCounts = 0;

function addRandomMinutes(number) {
  const variance = Math.floor(Math.random() * 30 * MINUTES);
  return number + variance;
}

function ensureLicensingLoopIsRunning(schedule = setInterval) {
  if (!timerId) {
    return subscriptions.loadSubscriptionApiDataAndBroadcast()
    .then(() => programLicensingDataUpdate(schedule, addRandomMinutes(EACH_DAY)))
    .catch(error =>
      logger.logSubscriptionAPICallError(error, true)
      .then(() => programLicensingDataLoadingRetries(schedule))
    );
  }

  return Promise.resolve();
}

function loadAndBroadcastInitialData(companyId, initialLicensingData) {
  if (companyId) {
    logger.file(`Setting company id as ${companyId}`);
    config.setCompanyId(companyId);
  }

  if (initialLicensingData && Object.keys(initialLicensingData).length > 0) {
    subscriptions.init(initialLicensingData);

    return subscriptions.broadcastSubscriptionData();
  }

  return Promise.resolve();
}

function programLicensingDataUpdate(schedule, interval) {
  stop();

  timerId = schedule(() => {
    return subscriptions.loadSubscriptionApiDataAndBroadcast()
    .catch(logger.logSubscriptionAPICallError);
  }, interval);
}

function programLicensingDataLoadingRetries(schedule) {
  timerId = schedule(() => {
    if (retryCounts > 10) {
      // stop and reprogram every hour
      stop();

      timerId = schedule(() => retryLicensingDataLoad(schedule), addRandomMinutes(EACH_HOUR));
    } else {
      return retryLicensingDataLoad(schedule);
    }
  }, EACH_5_MINUTES);
}

function retryLicensingDataLoad(schedule) {
  return subscriptions.loadSubscriptionApiDataAndBroadcast()
  .then(() => {
    logger.all('api_call_successful_retry');

    // switch to normal reporting
    programLicensingDataUpdate(schedule, addRandomMinutes(EACH_DAY))
  })
  .catch(error => {
    retryCounts += 1;

    // log the error locally, as this is a retry
    return logger.logSubscriptionAPICallError(error, false);
  });
}

function stop() {
  if (timerId) {
    clearInterval(timerId);

    timerId = null;
    retryCounts = 0;
  }
}

module.exports = {loadAndBroadcastInitialData, ensureLicensingLoopIsRunning, stop};
