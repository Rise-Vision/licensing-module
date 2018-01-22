/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");

const config = require("../../src/config");

describe("Config - Unit", ()=>
{

  afterEach(() => config.setCompanyId(null));

  it("Construct Subscription API URL", () => {
    config.setCompanyId('123');

    const url = config.getSubscriptionStatusApiUrl();

    assert.equal(url, 'https://store-dot-rvaserver2.appspot.com/v1/company/123/product/status?pc=c4b368be86245bf9501baaa6e0b00df9719869fd,b0cba08a4baa0c62b8cdc621b6f6a124f89a03db');
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
