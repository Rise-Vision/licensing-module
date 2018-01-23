/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers */
const assert = require("assert");
const common = require("common-display-module");
const simple = require("simple-mock");
const platform = require("rise-common-electron/platform");

const config = require("../../src/config");
const logger = require("../../src/logger");
const persistence = require("../../src/persistence");
const subscriptions = require("../../src/subscriptions");

describe("Persistence - Unit", ()=>
{

  beforeEach(()=>
  {
    simple.mock(platform, "writeTextFile").resolveWith(true);
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(common, "getInstallDir").returnWith("/home/rise/rvplayer");
  });

  afterEach(()=> {
    simple.restore()
    config.setCompanyId(null);
  });

  it("should save licensing data", () => {
    simple.mock(subscriptions, "getSubscriptionData").returnWith({
      c4b368be86245bf9501baaa6e0b00df9719869fd: {
        active: true, timestamp: 100
      },
      b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
        active: true, timestamp: 100
      }
    });

    config.setCompanyId(1111);

    return persistence.save().then(() => {
      assert(platform.writeTextFile.called);
      assert.equal(platform.writeTextFile.callCount, 1);

      const call = platform.writeTextFile.lastCall;

      const path = call.args[0];
      assert.equal(path, "/home/rise/rvplayer/modules/licensing/1.1/licensing-cache.json");

      const text = call.args[1];
      assert(text);

      const json = JSON.parse(text)
      assert.deepEqual(json, {
        companyId: 1111,
        licensing: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          },
          b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
            active: true, timestamp: 100
          }
        }
      });
    });
  });

  it("should save empty licensing data", () => {
    return persistence.save().then(() => {
      assert(platform.writeTextFile.called);
      assert.equal(platform.writeTextFile.callCount, 1);

      const call = platform.writeTextFile.lastCall;

      const path = call.args[0];
      assert.equal(path, "/home/rise/rvplayer/modules/licensing/1.1/licensing-cache.json");

      const text = call.args[1];
      assert(text);

      const json = JSON.parse(text)
      assert.deepEqual(json, {companyId: null, licensing: {}});
    });
  });

  it("should retrieve licensing data", () => {
    simple.mock(platform, "fileExists").returnWith(true);

    simple.mock(platform, "readTextFile").resolveWith(`
      {
        "companyId": 1111,
        "licensing": {
          "c4b368be86245bf9501baaa6e0b00df9719869fd": {
            "active": true, "timestamp": 100
          },
          "b0cba08a4baa0c62b8cdc621b6f6a124f89a03db": {
            "active": true, "timestamp": 100
          }
        }
      }
    `);

    return persistence.retrieve().then(data => {
    assert.deepEqual(data, {
        companyId: 1111,
        licensing: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          },
          b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
            active: true, timestamp: 100
          }
        }
      });
    });
  });

  it("should retrieve empty data if file is corrupted and log error", () => {
    simple.mock(platform, "fileExists").returnWith(true);
    simple.mock(logger, "file").returnWith();

    simple.mock(platform, "readTextFile").resolveWith(`
      {
        "companyId": 1111,
        "licensing": {
          "c4b368be86245bf9501baaa6e0b00df9719869fd": {
            "active": true, "timestamp": 100
          },
          "b0cba08a4baa0c62b8cdc621b6f6a124f89a03db":
        }
      }
    `);

    return persistence.retrieve().then(data => {
      assert.deepEqual(data, {companyId: null, licensing: {}});

      assert(logger.file.called);
      assert.equal(logger.file.callCount, 1);

      const message = logger.file.lastCall.args[1];
      assert(message.startsWith('Illegal JSON content'));
    });
  });

});
