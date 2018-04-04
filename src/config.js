/* eslint-disable array-bracket-newline, line-comment-position, no-inline-comments, comma-dangle */

const common = require("common-display-module");
const licensing = require("common-display-module/licensing");
const path = require("path");

const moduleName = "licensing";

const CACHE_FILE_NAME = "licensing-cache.json";
const SUBSCRIPTION_API_SERVER = 'store-dot-rvaserver2.appspot.com';

const PRODUCT_CODES_BY_COMPANY = [
  licensing.RISE_STORAGE_PRODUCT_CODE,
].join(',');

let companyId = null;

function getSubscriptionStatusApiUrl() {
  if (!companyId) {
    throw Error("Company ID not set");
  }

  return `https://${SUBSCRIPTION_API_SERVER}/v1/company/${companyId}/product/status?pc=${
    PRODUCT_CODES_BY_COMPANY
  }`;
}

function getCachePath() {
  const modulePath = common.getModulePath(moduleName);

  if (!modulePath) {
    throw new Error(`No path found for ${moduleName}`);
  }

  return path.join(modulePath, CACHE_FILE_NAME);
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
  getCachePath,
  getSubscriptionStatusApiUrl
};
