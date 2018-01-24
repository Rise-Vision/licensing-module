/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers, no-inline-comments, line-comment-position */
const assert = require("assert");
const simple = require("simple-mock");

const logger = require("../../src/logger");
const iterations = require("../../src/deprecated_widget_api_iterations");
const subscriptions = require("../../src/subscriptions");

const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

describe("Deprecated Widget API Iterations - Unit", ()=>
{

  beforeEach(()=>
  {
    simple.mock(logger, "logDeprecatedWidgetAPICallError").resolveWith({});
    simple.mock(logger, "file").returnWith();
    simple.mock(logger, "all").returnWith();
  });

  afterEach(()=> {
    simple.restore()
    iterations.stop();
  });

  it("should program updates if service call succeeds", done => {
    simple.mock(subscriptions, "loadRisePlayerProfessionalAuthorizationAndBroadcast").resolveWith();

    iterations.ensureLicensingLoopIsRunning((action, interval) => {
      assert.equal(interval, ONE_DAY);
      assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 1);

      action()
      .then(() => {
        assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 2);

        done();
      });
    });
  });

  it("should retry if first service call fails", done => {
    let loadCounter = 0;
    let state = 0;

    simple.mock(subscriptions, "loadRisePlayerProfessionalAuthorizationAndBroadcast").callFn(() => {
      if (loadCounter === 0) {
        loadCounter += 1;

        return Promise.reject(new Error('failure'));
      }

      return Promise.resolve();
    });

    iterations.ensureLicensingLoopIsRunning((action, interval) => {
      if (state === 0) {
        state = 1;

        assert.equal(interval, FIVE_MINUTES);
        assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 1);

        assert(logger.logDeprecatedWidgetAPICallError.called);
        assert.equal(logger.logDeprecatedWidgetAPICallError.callCount, 1);

        const call = logger.logDeprecatedWidgetAPICallError.lastCall;

        assert(call.args[0]);
        assert.equal(call.args[1], true); // remote call

        action();
      } else {
        assert.equal(interval, ONE_DAY);
        assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 2);

        // error did not repeat
        assert.equal(logger.logDeprecatedWidgetAPICallError.callCount, 1);

        done();
      }
    });
  });

  it("should retry until subscription API gives a successful answer", done => {
    let loadCounter = 0;
    let state = 0;

    simple.mock(subscriptions, "loadRisePlayerProfessionalAuthorizationAndBroadcast").callFn(() => {
      // reject the first 25 requests
      if (loadCounter < 25) {
        loadCounter += 1;

        return Promise.reject(new Error('failure'));
      }

      return Promise.resolve();
    });

    iterations.ensureLicensingLoopIsRunning((action, interval) => {
      if (state === 0) {
        state = 1;

        assert.equal(interval, FIVE_MINUTES);
        assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 1);

        assert(logger.logDeprecatedWidgetAPICallError.called);
        assert.equal(logger.logDeprecatedWidgetAPICallError.callCount, 1);

        const call = logger.logDeprecatedWidgetAPICallError.lastCall;

        assert(call.args[0]);
        assert.equal(call.args[1], true); // remote only first call

        // repeat 12 times * 5 minutes === 1 hour
        [...Array(12).keys()]
        .reduce(promise => promise.then(action), Promise.resolve());
      } else if (state === 1) {
        state = 2;

        assert.equal(interval, ONE_HOUR);
        assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 12);
        assert.equal(logger.all.called, false);

        assert(logger.logDeprecatedWidgetAPICallError.called);
        assert.equal(logger.logDeprecatedWidgetAPICallError.callCount, 12);

        const call = logger.logDeprecatedWidgetAPICallError.lastCall;

        assert(call.args[0]);
        assert.equal(call.args[1], false); // local call

        // repeat until service answers after 25 failed attempts
        [...Array(14).keys()]
        .reduce(promise => promise.then(action), Promise.resolve());
      } else {
        // it finally answered !
        assert.equal(interval, ONE_DAY);
        assert(subscriptions.loadRisePlayerProfessionalAuthorizationAndBroadcast.callCount, 25);

        assert.equal(logger.logDeprecatedWidgetAPICallError.callCount, 25);

        assert.equal(logger.all.callCount, 1);
        assert.equal(logger.all.lastCall.args[0], 'watch_api_call_successful_retry');

        done();
      }
    });
  });

});