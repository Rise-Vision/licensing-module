const assert = require("assert");
const messaging = require("common-display-module/messaging");
const platform = require("rise-common-electron").platform;
const simple = require("simple-mock");

const logger = require("../../src/logger");
const persistence = require("../../src/persistence");
const subscriptions = require("../../src/subscriptions");
const watch = require("../../src/watch");

describe("Subscriptions - Integration", () => {

  beforeEach(() => {
    simple.mock(Date, "now").returnWith(100);
    simple.mock(messaging, "broadcastMessage").resolveWith();
    simple.mock(messaging, "broadcastToLocalWS").resolveWith();
    simple.mock(persistence, "saveAndReport").resolveWith();
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(logger, "file").returnWith();
    simple.mock(logger, "all").returnWith();
  });

  afterEach(() => {
    simple.restore()
    subscriptions.clear();
    watch.clearMessagesAlreadySentFlag();
  });

  it("should extract active RPP license from authorization file and broadcast", () => {
    simple.mock(platform, "readTextFile").resolveWith('{"authorized":true}');

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json",
      ospath: "xxxxxxx"
    })
    .then(() => {

      assert.equal(messaging.broadcastMessage.callCount, 2);

      messaging.broadcastMessage.calls.forEach(call => {
        const event = call.args[0];

        assert.equal(event.from, 'licensing');

        switch (event.topic) {
          case "licensing-update":
            assert.deepEqual(event.subscriptions, {
              c4b368be86245bf9501baaa6e0b00df9719869fd: {
                active: true, timestamp: 100
              }
            });

            break;

          case "rpp-licensing-update":
            assert(event.isAuthorized);
            assert.equal(event.userFriendlyStatus, 'RPP authorized');
            break;

          default: assert.fail();
        }
      });

      assert.equal(messaging.broadcastToLocalWS.callCount, 1);
      const event = messaging.broadcastToLocalWS.lastCall.args[0];

      assert.equal(event.from, 'licensing');
      assert.equal(event.topic, "rpp-licensing-update");
      assert(event.isAuthorized);
      assert.equal(event.userFriendlyStatus, 'RPP authorized');
    });
  });

  it("should extract inactive RPP license from authorization file and broadcast", () => {
    simple.mock(platform, "readTextFile").resolveWith('{"authorized":false}');

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert.equal(messaging.broadcastMessage.callCount, 2);

      messaging.broadcastMessage.calls.forEach(call => {
        const event = call.args[0];

        assert.equal(event.from, 'licensing');

        switch (event.topic) {
          case "licensing-update":
            assert.deepEqual(event.subscriptions, {
              c4b368be86245bf9501baaa6e0b00df9719869fd: {
                active: false, timestamp: 100
              }
            });

            break;

          case "rpp-licensing-update":
            assert(!event.isAuthorized);
            assert.equal(event.userFriendlyStatus, 'RPP not authorized');
            break;

          default: assert.fail();
        }
      });

      assert.equal(messaging.broadcastToLocalWS.callCount, 1);
      const event = messaging.broadcastToLocalWS.lastCall.args[0];

      assert.equal(event.from, 'licensing');
      assert.equal(event.topic, "rpp-licensing-update");
      assert(!event.isAuthorized);
      assert.equal(event.userFriendlyStatus, 'RPP not authorized');
    });
  });

});
