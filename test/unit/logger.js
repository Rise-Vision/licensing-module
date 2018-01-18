/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");
const common = require("common-display-module");
const simple = require("simple-mock");

const logger = require("../../src/logger");

describe("Logger - Unit", ()=>
{

  beforeEach(()=>
  {
    const settings = {displayid: "DIS123"};

    simple.mock(common, "broadcastMessage").returnWith();
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
  });

  afterEach(()=> {
    simple.restore()
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

});
