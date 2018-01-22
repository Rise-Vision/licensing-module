/* eslint-env mocha */
/* eslint-disable max-statements, no-magic-numbers, function-paren-new */
const assert = require("assert");
const simple = require("simple-mock");
const common = require("common-display-module");

const store = require("../../src/store");
const subscriptions = require("../../src/subscriptions");

describe("Subscriptions - Unit", ()=>
{

  beforeEach(() => {
    simple.mock(common, "broadcastMessage").returnWith();
  })

  afterEach(() => {
    simple.restore()
    subscriptions.clear();
  });

  it("should detect changes if there is no previous licensing data", () => {
    const changed = subscriptions.isSubscriptionDataChanged(
      {},
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
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
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
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
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
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
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
          active: false, timestamp: 100
        }
      },
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 100
        },
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
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
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
          active: false, timestamp: 100
        }
      },
      {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp: 200
        },
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
          active: false, timestamp: 200
        }
      }
    );

    assert(!changed);
  });

  it("should broadcast messages depending on current Subscription Status API data", () => {
    let count = 0;

    simple.mock(store, "getSubscriptionStatusTable").callFn(() => {
      count += 1;
      const timestamp = count * 100;

      const table = {
        c4b368be86245bf9501baaa6e0b00df9719869fd: {
          active: true, timestamp
        },
        b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
          active: count > 1, timestamp
        }
      };

      return Promise.resolve(table);
    });

    return subscriptions.loadDataAndBroadcast()
    .then(() => {
      assert(common.broadcastMessage.called);
      assert.equal(common.broadcastMessage.callCount, 1);
      assert.deepEqual(common.broadcastMessage.lastCall.args[0], {
        from: 'licensing',
        topic: 'licensing-update',
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 100
          },
          b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
            active: false, timestamp: 100
          }
        }
      });

      return subscriptions.loadDataAndBroadcast();
    })
    .then(() => {
      assert.equal(common.broadcastMessage.callCount, 2);
      assert.deepEqual(common.broadcastMessage.lastCall.args[0], {
        from: 'licensing',
        topic: 'licensing-update',
        subscriptions: {
          c4b368be86245bf9501baaa6e0b00df9719869fd: {
            active: true, timestamp: 200
          },
          b0cba08a4baa0c62b8cdc621b6f6a124f89a03db: {
            active: true, timestamp: 200
          }
        }
      });

      return subscriptions.loadDataAndBroadcast();
    })
    .then(() => {
      // no further change in active flags even if timestamps change, no broadcast then
      assert.equal(common.broadcastMessage.callCount, 2);
    })
  });

});
