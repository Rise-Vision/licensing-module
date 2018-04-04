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
    "companyId": 1111,
    "licensing": {
      "c4b368be86245bf9501baaa6e0b00df9719869fd": {
        "active": true, "timestamp": 100
      },
      "b0cba08a4baa0c62b8cdc621b6f6a124f89a03db": {
        "active": false, "timestamp": 100
      }
    }
  }
`;

describe("Persistence - Integration", ()=>
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
    simple.mock(Date, "now").returnWith(200);

    simple.mock(platform, "readTextFile").resolveWith(content);

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

  it("should start iterations and broadcast licensing events based on cache file contents", done => {
    let eventHandler = null;

    function Receiver() {
      this.on = (type, handler) => {
        eventHandler = handler;
      }
    }

    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Subscribed',
          expiry: null,
          trialPeriod: 30
        },
        {
          pc: 'b0cba08a4baa0c62b8cdc621b6f6a124f89a03db',
          status: 'Subscribed',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    simple.mock(messaging, "receiveMessages").resolveWith(new Receiver());

    licensing.run((action, interval) => {
      assert.equal(interval, ONE_DAY);

      assert(messaging.broadcastMessage.callCount, 2);

      {
        const event = messaging.broadcastMessage.calls[0].args[0];

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
        // cache file marks it as not active
        assert(!storage.active);
      }

      {
        const event = messaging.broadcastMessage.calls[1].args[0];

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
        // API call says it's active
        assert(storage.active);
      }

      action().then(() => {
        // no more broadcasts
        assert(messaging.broadcastMessage.callCount, 2);

        return eventHandler({topic: "licensing-request"});
      })
      .then(() => {
        // forced broadcast, same event as current.
        assert(messaging.broadcastMessage.callCount, 3);

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
        assert.fail(error)

        done()
      });
    });
  });

});
