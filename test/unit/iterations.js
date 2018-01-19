/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const common = require("common-display-module");
const simple = require("simple-mock");

const config = require("../../src/config");
const logger = require("../../src/logger");
const iterations = require("../../src/iterations");
const subscriptions = require("../../src/subscriptions");

const ONE_DAY = 24 * 60 * 60 * 1000;

describe("Iterations - Unit", ()=>
{

  beforeEach(()=>
  {
    config.setCompanyId('123');
    const settings = {displayid: "DIS123"};

    simple.mock(common, "broadcastMessage").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(logger, "file").returnWith();
  });

  afterEach(()=> {
    simple.restore()
    config.setCompanyId(null);
    iterations.stop();
  });

  it("should program updates if service call succeeds", done => {
    simple.mock(subscriptions, "loadData").resolveWith();

    iterations.ensureLicensingLoopIsRunning((action, interval) => {
      assert.equal(interval, ONE_DAY);
      assert(subscriptions.loadData.callCount, 1);

      action()
      .then(() => {
        assert(subscriptions.loadData.callCount, 2);

        done();
      });
    });
  });

});
