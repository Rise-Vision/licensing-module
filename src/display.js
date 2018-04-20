function broadcastDisplayData() {
  console.log('broadcastDisplayData');
  return Promise.resolve();
}

function saveDisplayData(data) {
  console.log(`save display data ${data}`);
  return Promise.resolve();
}

module.exports = {
  broadcastDisplayData,
  saveDisplayData
}
