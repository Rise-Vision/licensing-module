const assert = require("assert");
const simple = require("simple-mock");
const messaging = require("common-display-module/messaging");

const display = require("../../src/display");

const displayData = {
  "companyId": "b918f23b-c227-454a-8117-ca6bafe753d3",
  "companyName": "Company",
  "claimID": "1234",
  "displayName": "NUC 2 (Linux)",
  "displayAddress": {
    "street": "10000 Marshall Dr",
    "unit": "",
    "city": "Lenexa",
    "province": "KS",
    "country": "US",
    "postalCode": "66215"
  }
};

describe("Display - Unit", () => {

  beforeEach(() => {
    simple.mock(messaging, "broadcastMessage").resolveWith();
    display.saveDisplayData(null);
  });

  afterEach(() => simple.restore());

  it("should broadcast display data", () => {

    display.saveDisplayData(displayData);

    return display.broadcastDisplayData().then(() => {
      assert.ok(messaging.broadcastMessage.called);

      const expectedMessage = {
        from: "licensing",
        topic: "display-data-update",
        displayData
      };

      assert.deepEqual(messaging.broadcastMessage.lastCall.arg, expectedMessage);
    });
  });

  it("should not broadcast display data when it is not set", () => {

    return display.broadcastDisplayData()
    .then(() => assert.fail())
    .catch((error) => {
      assert.equal(error.message, "Display data not set");
    });
  });


});
