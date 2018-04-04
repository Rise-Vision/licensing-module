/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const logger = require("../../src/logger");
const common = require("common-display-module");
const messaging = require("common-display-module/messaging");
const simple = require("simple-mock");
const platform = require("rise-common-electron").platform;

const config = require("../../src/config");
const iterations = require("../../src/iterations");
const persistence = require("../../src/persistence");
const subscriptions = require("../../src/subscriptions");
const watch = require("../../src/watch");

const mockContent = `
{
  "content": {
    "schedule": {
      "id": "dc2ff914-6b9c-4296-9941-cec92c2ceaec",
      "companyId": "176314ee-6b88-47ed-a354-10659722dc39",
      "name": "sometimes nest pi",
      "changeDate": "27122017200053754",
      "transition": "",
      "scale": "",
      "position": "",
      "distribution": ["7C4W7QQVSJEQ", "C93KGJC68GBN"],
      "distributeToAll": false,
      "timeDefined": false,
      "recurrenceType": "Daily",
      "recurrenceFrequency": 1,
      "recurrenceAbsolute": false,
      "recurrenceDayOfWeek": 0,
      "recurrenceDayOfMonth": 0,
      "recurrenceWeekOfMonth": 0,
      "recurrenceMonthOfYear": 0,
      "items": [{
        "name": "countries",
        "type": "presentation",
        "objectReference": "d0b27c18-5f0b-48e8-944d-63857b6e852c",
        "duration": 10,
        "timeDefined": true,
        "startDate": "12/27/2017 12:00:00 AM",
        "startTime": "12/27/2017 2:15:00 PM",
        "endTime": "12/27/2017 2:30:00 PM",
        "recurrenceType": "Daily",
        "recurrenceFrequency": 1,
        "recurrenceAbsolute": true,
        "recurrenceDaysOfWeek": [],
        "recurrenceDayOfWeek": 0,
        "recurrenceDayOfMonth": 1,
        "recurrenceWeekOfMonth": 0,
        "recurrenceMonthOfYear": 0
      }, {
        "name": "Copy of countries",
        "type": "presentation",
        "objectReference": "d0b27c18-5f0b-48e8-944d-63857b6e852c",
        "duration": 10,
        "timeDefined": true,
        "startDate": "12/27/2017 12:00:00 AM",
        "startTime": "12/27/2017 2:45:00 PM",
        "endTime": "12/27/2017 2:59:00 PM",
        "recurrenceType": "Daily",
        "recurrenceFrequency": 1,
        "recurrenceAbsolute": true,
        "recurrenceDaysOfWeek": [],
        "recurrenceDayOfWeek": 0,
        "recurrenceDayOfMonth": 1,
        "recurrenceWeekOfMonth": 0,
        "recurrenceMonthOfYear": 0
      }]
    },
    "presentations": [{
      "id": "d0b27c18-5f0b-48e8-944d-63857b6e852c",
      "companyId": "176314ee-6b88-47ed-a354-10659722dc39",
      "name": "countries",
      "changeDate": "22092017212306616",
      "publish": 0,
      "layout": "",
      "distribution": [],
      "isTemplate": false,
      "revisionStatus": 1
    }]
  },
  "display": {
    "displayAddress": {
      "street": "",
      "unit": "",
      "city": "",
      "province": "",
      "country": "",
      "postalCode": ""
    },
    "authKey": "uJjhqfNhx7K6",
    "restartEnabled": true,
    "restartTime": "02:00",
    "orientation": 0
  },
  "social": [],
  "signature": "23a5522c67a2c7fba6d42ee9a322bf042cb1acd5"
}
`

describe("Watch - Unit", ()=> {

  beforeEach(()=> {
    const settings = {displayid: "DIS123"};

    simple.mock(Date, "now").returnWith(100);
    simple.mock(messaging, "broadcastMessage").returnWith();
    simple.mock(logger, "error").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(iterations, "ensureLicensingLoopIsRunning").resolveWith(true);
    simple.mock(persistence, "save").resolveWith(true);
    simple.mock(persistence, "saveAndReport").resolveWith(true);
    simple.mock(subscriptions, "applyStatusUpdates").resolveWith(true);
  });

  afterEach(()=> {
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
      // so WATCH messages should have been sent for both authorization and content.json files
      assert(messaging.broadcastMessage.called);
      assert.equal(2, messaging.broadcastMessage.callCount);

      const pathRegex =
        new RegExp('^risevision-display-notifications/DIS123/(content|authorization/c4b368be86245bf9501baaa6e0b00df9719869fd).json$')

      messaging.broadcastMessage.calls.forEach(call => {
        const event = call.args[0];

        assert(event);
        assert.equal(event.from, "licensing");
        assert.equal(event.topic, "watch");
        assert(pathRegex.test(event.filePath));
      });
    });
  });

  it("should extract customer id from content file", ()=>{
    simple.mock(platform, "readTextFile").resolveWith(mockContent);

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/content.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert.deepEqual(config.getCompanyId(), '176314ee-6b88-47ed-a354-10659722dc39');

      assert(persistence.save.called);
    });
  });

  it("should catch invalid content file", ()=>{
    const mockScheduleText = '{"content": invalid}';
    simple.mock(platform, "readTextFile").resolveWith(mockScheduleText);

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/content.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert(logger.error.lastCall.args[1].startsWith("Could not parse"));

      assert(!persistence.save.called);
    });
  });

  it("should report an error if content file has no company id", ()=>{
    const mockScheduleText = '{"content": ""}';
    simple.mock(platform, "readTextFile").resolveWith(mockScheduleText);

    return watch.handleFileUpdate({
      topic: "file-update",
      status: "CURRENT",
      filePath: "risevision-display-notifications/xxx/content.json",
      ospath: "xxxxxxx"
    })
    .then(() => {
      assert(logger.error.lastCall.args[0].startsWith("Company id could not be retrieved from content"));

      assert(!persistence.save.called);
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

});
