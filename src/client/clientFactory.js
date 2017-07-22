const request = require("../fms-request");
const FMSError = require("../fms-request/FileMakerServerError");
const debug = require("debug")("fms-xml-client");

const handleResponse = response => {
  debug("Response", response);
  if (response.error.code === 0 || response.error.code === 401) {
    const count =
      response.error.code === 401 ? 0 : parseInt(response.meta.found);
    const total =
      response.error.code === 401 ? null : parseInt(response.meta.total);
    return {
      count,
      total,
      records: response.records ? response.records : []
    };
  } else {
    throw new FMSError(response.error.code);
  }
};

/**
 * creates a client with the default options
 * @param options
 * @param options.server  the FileMaker Server URL
 * @param options.auth
 * @param options.auth.user the user name
 * @param options.auth.pass the user password
 * @param options.command the XML gateway command object
 * @returns {object}
 */
const createClient = options => {
  const baseOpts = options;

  const buildOpts = (record, commands, auth) => {
    const opts = {
      server: baseOpts.server,
      auth: Object.assign({}, baseOpts.auth),
      command: Object.assign({}, baseOpts.command)
    };
    if (auth) {
      Object.assign(opts, auth);
    }
    opts.command = Object.assign(opts.command, record, commands);
    return opts;
  };

  const addCommandParam = (command, param) => {
    const modifiedCommand = command ? command : {};
    modifiedCommand[param] = true;
    return modifiedCommand;
  };

  /**
   * 
   * saves a record, creates it if it doesn't exist
   * @param {object} record 
   * @param {object} optionalCommands 
   * @param {object} auth 
   */
  const save = (record, optionalCommands, auth) => {
    const param = record["-recid"] ? "-edit" : "-new";
    const commands = addCommandParam(optionalCommands, param);
    const opts = buildOpts(record, commands, auth);
    debug("saving with these opts", opts);
    return request(opts).then(handleResponse);
  };

  const saveExisting = (record, optionalCommands, auth) => {
    const param = "-new";
    const commands = addCommandParam(optionalCommands, param);
    const opts = buildOpts(record, commands, auth);
    debug("saving with these opts", opts);
    return request(opts).then(handleResponse);
  };

  /**
 * performs a find using the query Object
 * @param {object} query 
 * @param {object} optionalCommands 
 * @param {object} auth 
 */
  const find = (query, optionalCommands, auth) => {
    const commands = addCommandParam(optionalCommands, "-find");
    const opts = buildOpts(query, commands, auth);

    return request(opts).then(handleResponse);
  };

  /**
   * find all records
   * 
   * @param {any} optionalCommands 
   * @param {any} auth 
   * @returns 
   */
  const findall = (optionalCommands, auth) => {
    const commands = addCommandParam(optionalCommands, "-findall");
    const opts = buildOpts({}, commands, auth);
    return request(opts).then(handleResponse);
  };

  /**
 * finds an updates the first record returned by the find
 * creates the record if it isn' there.
 * @param {object} query 
 * @param {object} newData 
 * @param {object} optionalCommands 
 * @param {object} auth 
 */
  const upsert = (query, newData, optionalCommands, auth) => {
    return find(query, optionalCommands, auth).then(resultSet => {
      const record = resultSet.records[0] ? resultSet.records[0] : {};
      if (record["-recid"]) {
        newData["-recid"] = record["-recid"];
      }
      return save(newData, optionalCommands);
    });
  };

  /**
 * updates the first record, errors if it doesn't find it
 * @param {object} query 
 * @param {object} newData 
 * @param {object} optionalCommands 
 * @param {object} auth 
 */
  const update = (query, newData, optionalCommands, auth) => {
    return find(query, optionalCommands, auth)
      .then(resultSet => {
        if (resultSet.count === 0) {
          throw new FMSError(401);
        }
        return resultSet;
      })
      .then(resultSet => {
        const record = resultSet.records[0] ? resultSet.records[0] : {};
        newData["-recid"] = record["-recid-id"];
        return saveExisting(newData, optionalCommands);
      });
  };

  const deleteByRecId = (recid, optionalCommands, auth) => {
    const commands = addCommandParam(optionalCommands, "-delete");
    commands["-recid"] = recid;
    opts = buildOpts({}, commands, auth);
    return request(opts).then(handleResponse);
  };

  /**
   * deletes the first record returned by the find if there is one
   * @param {object} query 
   * @param {object} optionalCommand 
   * @param {object} auth 
   */
  const remove = (query, optionalCommand, auth) => {
    if (query["-recid"]) {
      return deleteByRecId(query["-recid"]);
    } else {
      return find(query, optionalCommand, auth).then(resultSet => {
        const record = resultSet.records[0];
        if (record) {
          return deleteByRecId(record["-recid"], optionalCommand, auth);
        } else {
          throw new FMSError(401);
        }
      });
    }
  };

  return {
    save,
    find,
    findall,
    findAll: findall,
    update,
    upsert,
    delete: remove
  };
};

module.exports = createClient;
