/* eslint-disable max-lines, function-paren-newline */
const assert = require("assert");
const common = require("common-display-module");
const messaging = require("common-display-module/messaging");
const simple = require("simple-mock");
const platform = require("rise-common-electron").platform;

const config = require("../../src/config");
const iterations = require("../../src/iterations");
const licensing = require("../../src/index");
const logger = require("../../src/logger");
const persistence = require("../../src/persistence");
const store = require("../../src/store");
const subscriptions = require("../../src/subscriptions");
const watch = require("../../src/watch");

const ONE_DAY = 24 * 60 * 60 * 1000;

const content = `
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

describe("Licensing - Integration", () => {

  before(() => {
    config.setCompanyId(null);
    watch.clearMessagesAlreadySentFlag()
  });

  beforeEach(() => {
    const settings = {displayid: "DIS123"};

    simple.mock(messaging, "broadcastMessage").resolveWith();
    simple.mock(messaging, "broadcastToLocalWS").resolveWith();
    simple.mock(messaging, "getClientList").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(common, "getInstallDir").returnWith("/home/rise/rvplayer");
    simple.mock(persistence, "save").resolveWith(true);
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(Date, "now").returnWith(100);

    simple.mock(platform, "readTextFile").callFn(path => {
      return Promise.resolve(
        path.endsWith('/licensing-cache.json') ? '{}' : content
      );
    });

    simple.mock(logger, "file").returnWith();
    simple.mock(logger, "all").returnWith();
    simple.mock(logger, "error").callFn((stack, error) => {
      console.error(error);
      console.error(JSON.stringify(stack));
    });
  });

  afterEach(() => {
    simple.restore();
    config.setCompanyId(null);
    iterations.stop();
    subscriptions.clear();
    watch.clearMessagesAlreadySentFlag();
  });

  it("should start iterations and broadcast licensing events", done => {
    let eventHandler = null;

    function Receiver() {
      this.on = (type, handler) =>
      {
        eventHandler = handler;

        handler({
          topic: "client-list",
          clients: ["logging", "system-metrics", "local-storage"]
        })
        .then(() =>
          handler({
            topic: "file-update",
            status: "CURRENT",
            filePath: "risevision-display-notifications/dc2ff914-6b9c-4296-9941-cec92c2ceaec/content.json",
            ospath: "xxxxxx"
          })
        )
        .catch(error => {
          assert.fail(error);
          done();
        });
      }
    }

    let count = 0;

    simple.mock(store, "fetchSubscriptionStatus").callFn(() => {
      count += 1;

      const response = {
        body: [
          {
            pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
            status: 'Subscribed',
            expiry: null,
            trialPeriod: 30
          },
          {
            pc: 'b0cba08a4baa0c62b8cdc621b6f6a124f89a03db',
            status: count > 1 ? 'Subscribed' : 'Not subscribed',
            expiry: null,
            trialPeriod: 30
          }
        ]
      }

      return Promise.resolve(response);
    });

    simple.mock(messaging, "receiveMessages").resolveWith(new Receiver());

    licensing.run((action, interval) => {
      assert.equal(interval, ONE_DAY);

      // 3 licensing updates plus content, display and RPP licensing watch
      assert.equal(messaging.broadcastMessage.callCount, 6);

      messaging.broadcastMessage.calls.forEach(call => {
        const event = call.args[0];

        assert.equal(event.from, "licensing");

        const wathPathRegex = new RegExp('^risevision-display-notifications/DIS123/(display|content|authorization/c4b368be86245bf9501baaa6e0b00df9719869fd).json$');

        switch (event.topic) {
          case "licensing-update": {
            assert(event.subscriptions);

            const rpp = event.subscriptions.c4b368be86245bf9501baaa6e0b00df9719869fd;
            assert(rpp);
            assert(rpp.active);

            const storage = event.subscriptions.b0cba08a4baa0c62b8cdc621b6f6a124f89a03db;
            assert(storage);
            // not active on first iteration
            assert(!storage.active);
            break;
          }

          case 'rpp-licensing-update':
            assert(event.isAuthorized);
            assert.equal(event.userFriendlyStatus, 'RPP authorized');
            break;

          case 'storage-licensing-update':
            assert(!event.isAuthorized);
            assert.equal(event.userFriendlyStatus, 'Rise Storage not authorized');
            break;

          case "watch":
            assert.ok(wathPathRegex.test(event.filePath), "watch file path");

            break;

          default: assert.fail();
        }
      });

      // 2 licensing updates
      assert.equal(messaging.broadcastToLocalWS.callCount, 2);

      messaging.broadcastToLocalWS.calls.forEach(call => {
        const event = call.args[0];

        assert.equal(event.from, "licensing");

        switch (event.topic) {
          case 'rpp-licensing-update':
            assert(event.isAuthorized);
            assert.equal(event.userFriendlyStatus, 'RPP authorized');
            break;

          case 'storage-licensing-update':
            assert(!event.isAuthorized);
            assert.equal(event.userFriendlyStatus, 'Rise Storage not authorized');
            break;

          default: assert.fail();
        }
      });

      action().then(() => {
        assert.equal(messaging.broadcastMessage.callCount, 8);

        messaging.broadcastMessage.calls.slice(6).forEach(call => {
          const event = call.args[0];

          assert.equal(event.from, "licensing");

          switch (event.topic) {
            case "licensing-update": {
              assert(event.subscriptions);

              const rpp = event.subscriptions.c4b368be86245bf9501baaa6e0b00df9719869fd;
              assert(rpp);
              assert(rpp.active);

              const storage = event.subscriptions.b0cba08a4baa0c62b8cdc621b6f6a124f89a03db;
              assert(storage);
              // now active
              assert(storage.active);
              break;
            }

            case 'storage-licensing-update':
              assert(event.isAuthorized);
              assert.equal(event.userFriendlyStatus, 'Rise Storage authorized');
              break;

            default: assert.fail();
          }
        });

        assert.equal(messaging.broadcastToLocalWS.callCount, 3);

        const event = messaging.broadcastToLocalWS.lastCall.args[0];
        assert.equal(event.from, "licensing");
        assert(event.isAuthorized);
        assert.equal(event.userFriendlyStatus, 'Rise Storage authorized');

        return action();
      })
      .then(() => {
        // no more broadcasts
        assert.equal(messaging.broadcastMessage.callCount, 8);
        assert.equal(messaging.broadcastToLocalWS.callCount, 3);

        return eventHandler({topic: "licensing-request"});
      })
      .then(() => {
        // forced broadcast, same event as current.
        assert.equal(messaging.broadcastMessage.callCount, 11);

        messaging.broadcastMessage.calls.slice(7).forEach(call => {
          const event = call.args[0];

          assert.equal(event.from, "licensing");

          switch (event.topic) {
            case "licensing-update": {
              assert(event.subscriptions);

              const rpp = event.subscriptions.c4b368be86245bf9501baaa6e0b00df9719869fd;
              assert(rpp);
              assert(rpp.active);

              const storage = event.subscriptions.b0cba08a4baa0c62b8cdc621b6f6a124f89a03db;
              assert(storage);
              // not active on first iteration
              assert(storage.active);
              break;
            }

            case 'rpp-licensing-update':

              assert(event.isAuthorized);
              assert.equal(event.userFriendlyStatus, 'RPP authorized');
              break;

            case 'storage-licensing-update':

              assert(event.isAuthorized);
              assert.equal(event.userFriendlyStatus, 'Rise Storage authorized');
              break;

            default: assert.fail();
          }
        });

        assert.equal(messaging.broadcastToLocalWS.callCount, 5);

        messaging.broadcastToLocalWS.calls.slice(3).forEach(call => {
          const event = call.args[0];

          assert.equal(event.from, "licensing");

          switch (event.topic) {
            case 'rpp-licensing-update':

              assert(event.isAuthorized);
              assert.equal(event.userFriendlyStatus, 'RPP authorized');
              break;

            case 'storage-licensing-update':

              assert(event.isAuthorized);
              assert.equal(event.userFriendlyStatus, 'Rise Storage authorized');
              break;

            default: assert.fail();
          }
        });

        return eventHandler({topic: "rpp-licensing-request"});
      })
      .then(() => {
        assert.equal(messaging.broadcastMessage.callCount, 12);

        const event = messaging.broadcastMessage.lastCall.args[0];

        assert.equal(event.from, "licensing");
        assert.equal(event.topic, "rpp-licensing-update");
        assert(event.isAuthorized);
        assert.equal(event.userFriendlyStatus, 'RPP authorized');

        assert.equal(messaging.broadcastToLocalWS.callCount, 6);
        assert.deepEqual(messaging.broadcastToLocalWS.lastCall.args[0], event);

        return eventHandler({topic: "storage-licensing-request"});
      })
      .then(() => {
        assert.equal(messaging.broadcastMessage.callCount, 13);

        const event = messaging.broadcastMessage.lastCall.args[0];

        assert.equal(event.from, "licensing");
        assert.equal(event.topic, "storage-licensing-update");
        assert(event.isAuthorized);
        assert.equal(event.userFriendlyStatus, 'Rise Storage authorized');

        assert.equal(messaging.broadcastToLocalWS.callCount, 7);
        assert.deepEqual(messaging.broadcastToLocalWS.lastCall.args[0], event);

        done();
      })
      .catch(error =>
      {
        assert.fail(error);

        done();
      });
    });
  });

});
