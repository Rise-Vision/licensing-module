// Iteration loop, separated to facilitate integration tests

let timerId = null;

function sendSubscriptionsData() {
  // to be implemented in the next card
  return Promise.resolve();
}

function ensureLicensingLoopIsRunning(schedule = setInterval) {
  if (!timerId) {
    start(schedule);
  }
}

function start(schedule = setInterval) {
  console.log(schedule);
}

function stop() {
  if (timerId) {
    clearInterval(timerId);

    timerId = null;
  }
}

module.exports = {ensureLicensingLoopIsRunning, sendSubscriptionsData, stop};
