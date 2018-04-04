/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers, function-paren-newline, space-infix-ops */
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

describe("Licensing - Integration", ()=>
{

  beforeEach(() =>
  {
    const settings = {displayid: "DIS123"};

    simple.mock(messaging, "broadcastMessage").returnWith();
    simple.mock(messaging, "getClientList").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(common, "getInstallDir").returnWith("/home/rise/rvplayer");
    simple.mock(persistence, "save").resolveWith(true);
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(Date, "now").returnWith(100);

    simple.mock(platform, "readTextFile").callFn(path => {
      return Promise.resolve(
        path.endsWith('/licensing-cache.json')? '{}' : content
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

      // licensing-storage and the RPP licensing watch
      assert.equal(messaging.broadcastMessage.callCount, 2);

      messaging.broadcastMessage.calls.forEach(call => {
        const event = call.args[0];

        // I sent the event
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
            assert(!storage.active);
            break;
          }

          case "watch":
            assert.equal(event.filePath, 'risevision-display-notifications/DIS123/authorization/c4b368be86245bf9501baaa6e0b00df9719869fd.json');

            break;

          default: assert.fail();
        }
      });

      action().then(() => {
        assert.equal(messaging.broadcastMessage.callCount, 3);

        const event = messaging.broadcastMessage.lastCall.args[0];

        // I sent the event
        assert.equal(event.from, "licensing");
        // it's a log event
        assert.equal(event.topic, "licensing-update");

        assert(event.subscriptions);

        const rpp = event.subscriptions.c4b368be86245bf9501baaa6e0b00df9719869fd;
        assert(rpp);
        assert(rpp.active);

        const storage = event.subscriptions.b0cba08a4baa0c62b8cdc621b6f6a124f89a03db;
        assert(storage);
        // active on next iterations
        assert(storage.active);

        return action();
      })
      .then(() => {
        // no more broadcasts
        assert.equal(messaging.broadcastMessage.callCount, 3);

        return eventHandler({topic: "licensing-request"});
      })
      .then(() => {
        // forced broadcast, same event as current.
        assert.equal(messaging.broadcastMessage.callCount, 4);

        const event = messaging.broadcastMessage.lastCall.args[0];

        // I sent the event
        assert.equal(event.from, "licensing");
        // it's a log event
        assert.equal(event.topic, "licensing-update");

        assert(event.subscriptions);

        const rpp = event.subscriptions.c4b368be86245bf9501baaa6e0b00df9719869fd;
        assert(rpp);
        assert(rpp.active);

        const storage = event.subscriptions.b0cba08a4baa0c62b8cdc621b6f6a124f89a03db;
        assert(storage);
        assert(storage.active);

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
