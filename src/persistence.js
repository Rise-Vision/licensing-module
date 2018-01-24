const platform = require("rise-common-electron/platform");

const config = require("./config");
const logger = require("./logger");

const EMPTY_CONTENTS = {companyId: null, licensing: {}};

function save(licensing) {
  const companyId = config.getCompanyId();

  const data = {companyId, licensing};
  const text = JSON.stringify(data);

  const path = config.getCachePath();

  return platform.writeTextFile(path, text);
}

function saveAndReport(licensing) {
  return module.exports.save(licensing)
  .catch(error => {
    const path = config.getCachePath();

    return logger.error(error.stack, `File write error: ${path}`);
  })
}

function retrieve() {
  const path = config.getCachePath();

  if (platform.fileExists(path)) {
    return platform.readTextFile(path)
    .then(text => {
      try {
        return JSON.parse(text);
      }
      catch (error) {
        logger.file(error.stack, `Illegal JSON content: ${text}`);

        return EMPTY_CONTENTS;
      }
    })
    .catch(error => {
      logger.file(error.stack, `File read error: ${path}`);

      return EMPTY_CONTENTS;
    });
  }

  return Promise.resolve(EMPTY_CONTENTS);
}

module.exports = {retrieve, save, saveAndReport};
