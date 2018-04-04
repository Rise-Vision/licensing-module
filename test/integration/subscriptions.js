/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

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
    simple.mock(messaging, "broadcastMessage").returnWith();
    simple.mock(persistence, "saveAndReport").resolveWith();
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(logger, "file").returnWith();
    simple.mock(logger, "all").returnWith();
  });

  afterEach(() => {
    simple.restore()
    subscriptions.clear();
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
      assert.equal(messaging.broadcastMessage.callCount, 1);
      assert.deepEqual(messaging.broadcastMessage.lastCall.args[0], {
        from: "licensing",
        topic: "licensing-update",
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          }
        }
      });
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
      assert.equal(messaging.broadcastMessage.callCount, 1);
      assert.deepEqual(messaging.broadcastMessage.lastCall.args[0], {
        from: "licensing",
        topic: "licensing-update",
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: false, timestamp: 100
          }
        }
      });
    });
  });

});
