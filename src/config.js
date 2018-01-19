/* eslint-disable array-bracket-newline, line-comment-position, no-inline-comments */

const common = require("common-display-module");

const moduleName = "licensing";
const SUBSCRIPTION_API_SERVER = 'store-dot-rvaserver2.appspot.com';
const PRODUCT_CODES = [
  'c4b368be86245bf9501baaa6e0b00df9719869fd' // Rise Player Professional
].join(',');

let companyId = null;

function getSubscriptStatusApiUrl() {
  if (!companyId) {
    throw Error("Company ID not set");
  }

  return `https://${SUBSCRIPTION_API_SERVER}/v1/company/${companyId}/product/status?pc=${PRODUCT_CODES}`;
}

module.exports = {
  bqProjectName: "client-side-events",
  bqDataset: "Module_Events",
  bqTable: "licensing_events",
  failedEntryFile: "licensing-failed.log",
  logFolder: common.getModulePath(moduleName),
  moduleName,
  getModuleVersion() {
    return common.getModuleVersion(moduleName)
  },
  getCompanyId() {
    return companyId;
  },
  setCompanyId(id) {
    companyId = id;
  },
  getSubscriptStatusApiUrl
};
