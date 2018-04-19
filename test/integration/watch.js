/* eslint-env mocha */
/* eslint-disable no-magic-numbers */

const assert = require("assert");
const common = require("common-display-module");
const messaging = require("common-display-module/messaging");
const simple = require("simple-mock");
const platform = require("rise-common-electron").platform;

const config = require("../../src/config");
const licensing = require("../../src/index");
const logger = require("../../src/logger");
const iterations = require("../../src/iterations");
const subscriptions = require("../../src/subscriptions");
const watch = require("../../src/watch");

describe("Watch - Integration", () => {

  before(() => {
    config.setCompanyId(null);
    watch.clearMessagesAlreadySentFlag()
  });

  beforeEach(() => {
    const settings = {displayid: "DIS123"};

    simple.mock(messaging, "broadcastMessage").resolveWith();
    simple.mock(messaging, "getClientList").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(common, "getInstallDir").returnWith("/home/rise/rvplayer");
    simple.mock(platform, "fileExists").returnWith(false);
    simple.mock(logger, "file").returnWith();
    simple.mock(logger, "all").returnWith();
  });

  afterEach(() => {
    simple.restore();
    watch.clearMessagesAlreadySentFlag();
    config.setCompanyId(null);
    iterations.stop();
    subscriptions.clear();
  });

  it("should wait for local-storage to be available to send WATCH messages", done => {
    function Receiver() {
      this.on = (type, handler) =>
      {
        handler({topic: "client-list", clients: []})
        .then(() =>
        {
          // no clients, getClientList() should have been called, but no WATCH
          assert.equal(messaging.getClientList.callCount, 1);
          assert.equal(messaging.broadcastMessage.callCount, 0);

          // other non-local-storage clients
          return handler({
            topic: "client-list",
            clients: ["logging", "system-metrics"]
          })
        })
        .then(() =>
        {
          // so WATCH message shouldn't have been sent
          assert.equal(messaging.broadcastMessage.callCount, 0);

          // now local-storage is present
          return handler({
            topic: "client-list",
            clients: ["logging", "system-metrics", "local-storage"]
          });
        })
        .then(() =>
        {
          // so WATCH messages should have been sent
          assert.equal(messaging.broadcastMessage.callCount, 2);

          const pathRegex =
            new RegExp('^risevision-display-notifications/DIS123/(content|authorization/c4b368be86245bf9501baaa6e0b00df9719869fd).json$')

          messaging.broadcastMessage.calls.forEach(call => {
            const event = call.args[0];

            assert(event);
            assert.equal(event.from, "licensing");
            assert.equal(event.topic, "watch");
            assert(pathRegex.test(event.filePath));
          });

          done();
        })
        .catch(error =>
        {
          assert.fail(error)

          done()
        });
      }
    }

    simple.mock(messaging, "receiveMessages").resolveWith(new Receiver());

    licensing.run(() => {});
  });

});
