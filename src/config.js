const common = require("common-display-module");

const moduleName = "licensing";

let companyId = null;

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
  }
};
