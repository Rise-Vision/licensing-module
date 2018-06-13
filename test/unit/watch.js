const assert = require("assert");
const logger = require("../../src/logger");
const common = require("common-display-module");
const messaging = require("common-display-module/messaging");
const simple = require("simple-mock");
const platform = require("rise-common-electron").platform;

const iterations = require("../../src/iterations");
const subscriptions = require("../../src/subscriptions");
const display = require("../../src/display");
const watch = require("../../src/watch");

const mockDisplay = `{
  "companyId": "b918f23b-c227-454a-8117-ca6bafe753d3",
  "companyName": "Company",
  "claimID": "1234",
  "displayName": "NUC 2 (Linux)",
  "displayAddress": {
    "street": "10000 Marshall Dr",
    "unit": "",
    "city": "Lenexa",
    "province": "KS",
    "country": "US",
    "postalCode": "66215"
  }
}`;

describe("Watch - Unit", () => {

  beforeEach(()=> {
    const settings = {displayid: "DIS123"};

    simple.mock(Date, "now").returnWith(100);
    simple.mock(messaging, "broadcastMessage").returnWith();
    simple.mock(logger, "error").returnWith();
    simple.mock(logger, "warning").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(iterations, "ensureLicensingLoopIsRunning").resolveWith(true);
    simple.mock(subscriptions, "applyStatusUpdates").resolveWith(true);
  });

  afterEach(() => {
    watch.clearMessagesAlreadySentFlag();

    simple.restore()
  });

  it("should not send WATCH messages if no module is available", () => {
    return watch.sendWatchMessages({clients: []})
    .then(() => {
      // no clients, so WATCH messages shouldn't have been sent
      assert(!messaging.broadcastMessage.called);
    })
  });

  it("should not send WATCH messages if local-storage module is not available", () => {
    return watch.sendWatchMessages({
      clients: ["logging", "system-metrics"]
    })
    .then(() => {
      // so WATCH messages shouldn't have been sent
      assert(!messaging.broadcastMessage.called);
    });
  });

  it("should send WATCH messages if local-storage module is available", () => {
    return watch.sendWatchMessages({
      clients: ["logging", "system-metrics", "local-storage"]
    })
    .then(() => {
      // so WATCH messages should have been sent for authorization and display.json
      assert(messaging.broadcastMessage.called);
      assert.equal(messaging.broadcastMessage.callCount, 2);

      const pathRegex =
        new RegExp('^risevision-display-notifications/DIS123/(display|authorization/c4b368be86245bf9501baaa6e0b00df9719869fd).json$')

      messaging.broadcastMessage.calls.forEach(call => {
        const event = call.args[0];

        assert(event);
        assert.equal(event.from, "licensing");
        assert.equal(event.topic, "watch");
        assert.ok(pathRegex.test(event.filePath));
      });
    });
  });

  it("should extract active RPP license from authorization file", ()=>{
    simple.mock(platform, "readTextFile").resolveWith('{"authorized":true}');

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert.equal(subscriptions.applyStatusUpdates.callCount, 1);
      assert.deepEqual(subscriptions.applyStatusUpdates.lastCall.args[0], {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {active: true, timestamp: 100}
      });
    });
  });

  it("should extract inactive RPP license from authorization file", ()=>{
    simple.mock(platform, "readTextFile").resolveWith('{"authorized":false}');

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert.equal(subscriptions.applyStatusUpdates.callCount, 1);
      assert.deepEqual(subscriptions.applyStatusUpdates.lastCall.args[0], {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {active: false, timestamp: 100}
      });
    });
  });

  it("should not extract RPP license from invalid authorization file", ()=>{
    simple.mock(platform, "readTextFile").resolveWith('{}');

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert(!subscriptions.applyStatusUpdates.called);
    });
  });

  it("should save display data", () => {
    simple.mock(display, "saveDisplayData").resolveWith();
    simple.mock(platform, "readTextFile").resolveWith(mockDisplay);

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/display.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert.ok(display.saveDisplayData.called);
      assert.ok(iterations.ensureLicensingLoopIsRunning.called);
    });
  });

});
