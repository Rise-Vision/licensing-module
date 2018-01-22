const store = require("./store");

let currentSubscriptionStatusTable = {};

function loadData() {
  // Currently the subscription status come only from store, but in future modules it may also come from the display's GCS bucket.
  return store.getSubscriptionStatusTable()
  .then(table => {
    // Compare current against previous to see if there are changes; next card

    currentSubscriptionStatusTable = table;

    // Implement broadcast to other modules here; next card
    return currentSubscriptionStatusTable;
  })
}

module.exports = {loadData};
