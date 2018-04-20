const config = require("../../src/config");
const store = require("../../src/store");

const companyId = process.argv.length > 2 ?
  process.argv[2] : "176314ee-6b88-47ed-a354-10659722dc39";

config.setCompanyId(companyId);

store.fetchSubscriptionStatus()
.then(request => console.log(request.body))
.catch(console.error);
