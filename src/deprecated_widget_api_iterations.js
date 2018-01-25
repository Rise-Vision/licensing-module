/* eslint-disable no-magic-numbers, line-comment-position, no-inline-comments, function-paren-newline */

// Iteration loop for deprecated widget API.
// This will disappear as soon as Apps Display Licensing is available so code was copied from iterations.js with no special effort to refactor common functionality.

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
    return subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast()
    .then(() => programLicensingDataUpdate(schedule, EACH_DAY))
    .catch(error =>
      logger.logDeprecatedWidgetAPICallError(error, true)
      .then(() => programLicensingDataLoadingRetries(schedule))
    );
  }

  return Promise.resolve();
}

function programLicensingDataUpdate(schedule, interval) {
  stop();

  timerId = schedule(() => {
    return subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast()
    .catch(logger.logDeprecatedWidgetAPICallError);
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
  return subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast()
  .then(() => {
    logger.all('watch_api_call_successful_retry');

    // switch to normal reporting
    programLicensingDataUpdate(schedule, EACH_DAY)
  })
  .catch(error => {
    retryCounts += 1;

    // log the error locally, as this is a retry
    return logger.logDeprecatedWidgetAPICallError(error, false);
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
