# licensing-module
Notifies other modules about their licensing status.

## Development

Install:

```bash
npm install
```

Unit and integration tests:

```bash
npm run test
```

### Manual testing

A rvplayer install with a valid RiseDisplayNetworkII.ini file with an
assigned displayid or tempdisplayid is needed. Rise Vision Player must not be
running.

Clone local-messaging-module, install and run it:

```bash
git clone https://github.com/Rise-Vision/local-messaging-module.git
npm install
node src/index.js
```

Do the same for logging-module in a different terminal window:

```bash
git clone https://github.com/Rise-Vision/logging-module.git
npm install
node src/index.js
```

Clone, install and run additional modules if desired.

Then, supposing licensing-module is already installed, open another
terminal window and run it:

```bash
node src/index.js
```

As a result, in the remote BigQuery table an 'started' event will be appended.
Also, licensing events will appear on the local-messaging-module screen as
licensing data is retrieved and broadcasted.

### Subscription Status API Test Client

A simple Subscription Status API client is provided:

```bash
node src/test/manual/request.js COMPANY-ID
```

Where COMPANY-ID is a valid company id for which configured subscriptions
are checked.

To test with a proxy, add an HTTPS_PROXY environment variable:

```bash
HTTPS_PROXY=http://localhost:8888 node test/manual/request.js
```

### Building

```bash
npm run build
```
