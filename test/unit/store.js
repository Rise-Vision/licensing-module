const assert = require("assert");
const simple = require("simple-mock");
const common = require("common-display-module");

const config = require("../../src/config");
const store = require("../../src/store");

describe("Store - Unit", () => {

  beforeEach(() => {
    const settings = {displayid: "DIS123"};

    config.setCompanyId("123");

    simple.mock(Date, "now").returnWith(100);
    simple.mock(common, "getDisplaySettings").resolveWith(settings);
  });

  afterEach(() => {
    simple.restore()
    config.setCompanyId(null);
  });

  it("should interpret Subscribed as active", () => {
    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Subscribed',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    return store.getSubscriptionStatusUpdates()
    .then(table =>
    {
      assert.deepEqual(table, {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        }
      })
    })
  });

  it("should interpret Not Subscribed as not active", () => {
    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Not Subscribed',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    return store.getSubscriptionStatusUpdates()
    .then(table =>
    {
      assert.deepEqual(table, {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: false, timestamp: 100
        }
      })
    })
  });

  it("should interpret Free as active", () => {
    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Free',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    return store.getSubscriptionStatusUpdates()
    .then(table =>
    {
      assert.deepEqual(table, {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        }
      })
    })
  });

    it("should interpret On Trial as active", () => {
      simple.mock(store, "fetchSubscriptionStatus").resolveWith({
        body: [
          {
            pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
            status: 'On Trial',
            expiry: null,
            trialPeriod: 30
          }
        ]
      });

      return store.getSubscriptionStatusUpdates()
      .then(table =>
      {
        assert.deepEqual(table, {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          }
        })
      })
    });

  it("should interpret Trial Expired as not active", () => {
    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Trial Expired',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    return store.getSubscriptionStatusUpdates()
    .then(table =>
    {
      assert.deepEqual(table, {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: false, timestamp: 100
        }
      })
    })
  });

  it("should interpret Cancelled as not active", () => {
    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Cancelled',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    return store.getSubscriptionStatusUpdates()
    .then(table =>
    {
      assert.deepEqual(table, {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: false, timestamp: 100
        }
      })
    })
  });

  it("should interpret Suspended as not active", () => {
    simple.mock(store, "fetchSubscriptionStatus").resolveWith({
      body: [
        {
          pc: 'c4b368be86245bf9501baaa6e0b00df9719869fd',
          status: 'Suspended',
          expiry: null,
          trialPeriod: 30
        }
      ]
    });

    return store.getSubscriptionStatusUpdates()
    .then(table =>
    {
      assert.deepEqual(table, {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: false, timestamp: 100
        }
      })
    })
  });

});
