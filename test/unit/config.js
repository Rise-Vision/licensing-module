/* eslint-env mocha */
/* eslint-disable max-statements */
const assert = require("assert");

const config = require("../../src/config");

describe("Config - Unit", ()=>
{

  afterEach(() => config.setCompanyId(null));

  it("Construct Subscription API URL", () => {
    config.setCompanyId('123');

    const url = config.getSubscriptStatusApiUrl();

    assert.equal(url, 'https://store-dot-rvaserver2.appspot.com/v1/company/123/product/status?pc=c4b368be86245bf9501baaa6e0b00df9719869fd');
  });

  it("Fail on creating Subscription API URL if company id is not set", () => {
    try {
      config.getSubscriptStatusApiUrl();

      assert.fail();
    }
    catch (error) {
      // expected
    }
  });

});