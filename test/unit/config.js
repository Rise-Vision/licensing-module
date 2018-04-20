const assert = require("assert");
const simple = require("simple-mock");
const common = require("common-display-module");

const config = require("../../src/config");

describe("Config - Unit", () => {

  beforeEach(() => {
    simple.mock(common, "getModuleVersion").returnWith("1.1");
    simple.mock(common, "getInstallDir").returnWith("/home/rise/rvplayer");
  });

  afterEach(() => {
    simple.restore();
    config.setCompanyId(null);
  });

  it("Build Subscription API URL", () => {
    config.setCompanyId('123');

    const url = config.getSubscriptionStatusApiUrl();

    assert.equal(url, 'https://store-dot-rvaserver2.appspot.com/v1/company/123/product/status?pc=b0cba08a4baa0c62b8cdc621b6f6a124f89a03db');
  });

  it("Build cache path", () => {
    const path = config.getCachePath();

    assert.equal(path, "/home/rise/rvplayer/modules/licensing/1.1/licensing-cache.json");
  });

  it("Fail on creating Subscription API URL if company id is not set", () => {
    try {
      config.getSubscriptionStatusApiUrl();

      assert.fail();
    }
    catch (error) {
      // expected
    }
  });

});
