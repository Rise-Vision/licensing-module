/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const common = require("common-display-module");
const simple = require("simple-mock");

const config = require("../../src/config");
const logger = require("../../src/logger");

describe("Logger - Unit", ()=>
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
  });

  it("should log messages", () => {
    return logger.all('started')
    .then(() => {
      assert(common.broadcastMessage.called);

      // this is the actual event object sent to the logging module
      const event = common.broadcastMessage.lastCall.args[0];

      // I sent the event
      assert.equal(event.from, "licensing");
      // it's a log event
      assert.equal(event.topic, "log");

      const data = event.data;
      assert.equal(data.projectName, "client-side-events");
      assert.equal(data.datasetName, "Module_Events");
      assert.equal(data.table, "licensing_events");
      assert.equal(data.failedEntryFile, "licensing-failed.log");

      // the BigQuery row entry
      const row = data.data;
      assert.equal(row.event, "started");
      assert.equal(row.event_details, "");
      assert.equal(row.display_id, "DIS123");
      assert.equal(row.version, "1.1");
      // ts will be inserted in logging module, so we won't be checking it here
    })
  });

  it("should log Subscription API call error remotely", () => {
    return logger.logSubscriptionAPICallError(Error('failure'))
    .then(() => {
      assert(common.broadcastMessage.called);
      assert(!logger.file.called);

      // this is the actual event object sent to the logging module
      const event = common.broadcastMessage.lastCall.args[0];

      // I sent the event
      assert.equal(event.from, "licensing");
      // it's a log event
      assert.equal(event.topic, "log");

      const data = event.data;
      assert.equal(data.projectName, "client-side-events");
      assert.equal(data.datasetName, "Module_Events");
      assert.equal(data.table, "licensing_events");
      assert.equal(data.failedEntryFile, "licensing-failed.log");

      // the BigQuery row entry
      const row = data.data;
      assert.equal(row.event, "error");
      assert(row.event_details);
      assert.equal(row.display_id, "DIS123");
      assert.equal(row.version, "1.1");
      // ts will be inserted in logging module, so we won't be checking it here
    })
  });

  it("should log Subscription API call error locally", () => {
    // false flag means local logging.
    logger.logSubscriptionAPICallError(Error('failure'), false);

    assert(!common.broadcastMessage.called);
    assert(logger.file.called);

    const call = logger.file.lastCall;

    assert(call.args[0]);
    assert(call.args[1].startsWith('Subscription Status API Call failed: https://'));
  });

});
