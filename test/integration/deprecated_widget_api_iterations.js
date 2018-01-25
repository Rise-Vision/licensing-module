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
const deprecatedIterations = require("../../src/deprecated_widget_api_iterations");

const ONE_DAY = 24 * 60 * 60 * 1000;

describe("Deprecated Widget API Iterations - Integration", ()=>
{

  beforeEach(() =>
  {
    const settings = {displayid: "DIS123"};

    simple.mock(messaging, "broadcastMessage").returnWith();
    simple.mock(messaging, "getClientList").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(common, "getInstallDir").returnWith("/home/rise/rvplayer");
    simple.mock(iterations, "configureAndStartIfCompanyIdIsAvailable").resolveWith(true);
    simple.mock(persistence, "save").resolveWith(true);
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(watch, "startWatchIfLocalStorageModuleIsAvailable").resolveWith(true);
    simple.mock(Date, "now").returnWith(100);

    simple.mock(platform, "readTextFile").resolveWith({});

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
    deprecatedIterations.stop();
    subscriptions.clear();
    watch.clearMessageAlreadySentFlag();
  });

  it("should start watch API iterations and broadcast licensing events", done => {
    let eventHandler = null;

    function Receiver() {
      this.on = (type, handler) => {
        eventHandler = handler;
      }
    }

    let count = 0;

    simple.mock(store, "fetchRisePlayerProfessionalAuthorization").callFn(() => {
      count += 1;

      const response = {
        body: {
          authorized: count > 2,
          expiry: '2018-01-25T16:47:42.042+0000',
          signatures: null,
          error: null
        }
      };

      return Promise.resolve(response);
    });

    simple.mock(messaging, "receiveMessages").resolveWith(new Receiver());

    licensing.run(() => {}, (action, interval) => {
      assert.equal(interval, ONE_DAY);

      assert.equal(messaging.broadcastMessage.callCount, 1);

      {
        const event = messaging.broadcastMessage.lastCall.args[0];

        // I sent the event
        assert.equal(event.from, "licensing");
        // it's a log event
        assert.equal(event.topic, "licensing-update");

        assert(event.subscriptions);

        const rpp = event.subscriptions.c4b368be86245bf9501baaa6e0b00df9719869fd;
        assert(rpp);
        assert(!rpp.active);

        const storage = event.subscriptions.b0cba08a4baa0c62b8cdc621b6f6a124f89a03db;
        assert(!storage);
      }

      action().then(() => {
        // no changes until next

        assert.equal(messaging.broadcastMessage.callCount, 1);

        return action();
      })
      .then(() => {
        assert.equal(messaging.broadcastMessage.callCount, 2);

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
        assert(!storage);

        return action();
      })
      .then(() => {
        // no more broadcasts
        assert.equal(messaging.broadcastMessage.callCount, 2);

        return eventHandler({topic: "licensing-request"});
      })
      .then(() => {
        // forced broadcast, same event as current.
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
        assert(!storage);

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
