/* eslint-disable no-magic-numbers, line-comment-position, no-inline-comments */

// Iteration loop, separated to facilitate integration tests

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
    return subscriptions.loadData()
    .then(() => programLicensingDataUpdate(schedule, EACH_DAY))
    .catch(error => {
      logger.logSubscriptionAPICallError(error);

      programLicensingDataLoadingRetries(schedule);
    });
  }
}

function programLicensingDataUpdate(schedule, interval) {
  stop();

  timerId = schedule(() => {
    return subscriptions.loadData()
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
      retryLicensingDataLoad(schedule);
    }
  }, EACH_5_MINUTES);
}

function retryLicensingDataLoad(schedule) {
  return subscriptions.loadData()
  .then(() => programLicensingDataUpdate(schedule, EACH_DAY)) // switch to normal reporting
  .catch(error => {
    // log the error locally, as this is a retry
    logger.logSubscriptionAPICallError(error, false);

    retryCounts += 1;
  });
}

function stop() {
  if (timerId) {
    clearInterval(timerId);

    timerId = null;
    retryCounts = 0;
  }
}

module.exports = {ensureLicensingLoopIsRunning, stop};
