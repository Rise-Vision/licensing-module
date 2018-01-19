function broadcast(data) {
  // Implement broadcast to other modules here; next card
  return data;
}

function loadData() {
  // load web service data here.

  return Promise.resolve()
  .then(broadcast);
}

module.exports = {broadcast, loadData};
