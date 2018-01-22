/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers, function-paren-new */
const assert = require("assert");
const subscriptions = require("../../src/subscriptions");

describe("Subscriptions - Unit", ()=>
{

  it("should detect changes if there is no previous licensing data", () => {
    const changed = subscriptions.isSubscriptionDataChanged(
      {},
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: true, timestamp: 100
        }
      }
    );

    assert(changed);
  });

  it("should detect changes if there is more licensing data", () => {
    const changed = subscriptions.isSubscriptionDataChanged(
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        }
      },
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: true, timestamp: 100
        }
      }
    );

    assert(changed);
  });

  it("should detect changes if there is less licensing data", () => {
    const changed = subscriptions.isSubscriptionDataChanged(
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: true, timestamp: 100
        }
      },
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        }
      }
    );

    assert(changed);
  });

  it("should detect changes if there is different licensing data", () => {
    const changed = subscriptions.isSubscriptionDataChanged(
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: false, timestamp: 100
        }
      },
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: true, timestamp: 100
        }
      }
    );

    assert(changed);
  });

  it("should detect changes if active values are the same, even if timestamps not", () => {
    const changed = subscriptions.isSubscriptionDataChanged(
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: false, timestamp: 100
        }
      },
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 200
        },
        c4b368be86245bf9501baaa6e0b00df9719869f2: {
          active: false, timestamp: 200
        }
      }
    );

    assert(!changed);
  });

});
