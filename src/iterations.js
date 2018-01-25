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

function ensureLicensingLoopIsRunning(schedule = setInterval) {
  if (!timerId) {
    return subscriptions.loadSubscriptionApiDataAndBroadcast()
    .then(() => programLicensingDataUpdate(schedule, EACH_DAY))
    .catch(error =>
      logger.logSubscriptionAPICallError(error, true)
      .then(() => programLicensingDataLoadingRetries(schedule))
    );
  }

  return Promise.resolve();
}

function configureAndStartIfCompanyIdIsAvailable(companyId, initialLicensingData, schedule) {
  if (companyId) {
    logger.file(`Setting company id as ${companyId}`);
    config.setCompanyId(companyId);
  }

  return Promise.resolve().then(() => {
    if (initialLicensingData && Object.keys(initialLicensingData).length > 0) {
      subscriptions.init(initialLicensingData);

      return subscriptions.broadcastSubscriptionData();
    }
  })
  .then(() =>
    companyId && module.exports.ensureLicensingLoopIsRunning(schedule)
  );
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

      timerId = schedule(() => retryLicensingDataLoad(schedule), EACH_HOUR);
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
    programLicensingDataUpdate(schedule, EACH_DAY)
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

module.exports = {configureAndStartIfCompanyIdIsAvailable, ensureLicensingLoopIsRunning, stop};
