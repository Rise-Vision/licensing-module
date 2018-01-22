/* eslint-disable function-paren-new, function-paren-newline */
const store = require("./store");

let currentSubscriptionStatusTable = {};

function isSubscriptionDataChanged(current, updated) {
  const currentKeys = Object.keys(current);
  const updatedKeys = Object.keys(updated);

  return currentKeys.length !== updatedKeys.length ||
    currentKeys.some(key =>
      !updated[key] || current[key].active !== updated[key].active
    );
}

function loadDataAndBroadcast() {
  // Currently the subscription status come only from store, but in future modules it may also come from the display's GCS bucket.
  return store.getSubscriptionStatusTable()
  .then(updatedSubscriptionStatusTable => {
    const changed = isSubscriptionDataChanged(currentSubscriptionStatusTable, updatedSubscriptionStatusTable);

    currentSubscriptionStatusTable = updatedSubscriptionStatusTable;

    // Implement broadcast to other modules here; next card
    return changed;
  })
}

module.exports = {isSubscriptionDataChanged, loadDataAndBroadcast};
