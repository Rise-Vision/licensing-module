/* eslint-disable no-magic-numbers */

const store = require("../../src/store");

store.fetchRisePlayerProfessionalAuthorization()
.then(request => console.log(request.body))
.catch(console.error);
