// Generated by CoffeeScript 1.7.1
var BCSession, BackChannel, Date, EventEmitter, OutgoingArray, asciijson, browserChannel, bufferPostData, clearInterval, clearTimeout, clientCode, clientFile, clientStats, decodeData, defaultOptions, e, fs, getHostPrefix, hat, ieHeaders, ieJunk, k, messagingMethods, order, parse, querystring, randomArrayElement, randomInt, sendError, setInterval, setTimeout, standardHeaders, transformData, v;

parse = require('url').parse;

querystring = require('querystring');

fs = require('fs');

EventEmitter = require('events').EventEmitter;

hat = require('hat').rack(40, 36);

asciijson = require('ascii-json');

randomInt = function(n) {
  return Math.floor(Math.random() * n);
};

randomArrayElement = function(array) {
  return array[randomInt(array.length)];
};

setInterval = global.setInterval, clearInterval = global.clearInterval, setTimeout = global.setTimeout, clearTimeout = global.clearTimeout, Date = global.Date;

defaultOptions = {
  hostPrefixes: null,
  base: '/channel',
  keepAliveInterval: 20 * 1000,
  sessionTimeoutInterval: 30 * 1000,
  cors: null,
  corsAllowCredentials: false,
  headers: null
};

standardHeaders = {
  'Content-Type': 'text/plain',
  'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT',
  'X-Content-Type-Options': 'nosniff'
};

ieHeaders = {};

for (k in standardHeaders) {
  v = standardHeaders[k];
  ieHeaders[k] = v;
}

ieHeaders['Content-Type'] = 'text/html';

ieJunk = "7cca69475363026330a0d99468e88d23ce95e222591126443015f5f462d9a177186c8701fb45a6ffee0daf1a178fc0f58cd309308fba7e6f011ac38c9cdd4580760f1d4560a84d5ca0355ecbbed2ab715a3350fe0c479050640bd0e77acec90c58c4d3dd0f5cf8d4510e68c8b12e087bd88cad349aafd2ab16b07b0b1b8276091217a44a9fe92fedacffff48092ee693af\n";

messagingMethods = function(options, query, res) {
  var junkSent, methods, type;
  type = query.TYPE;
  if (type === 'html') {
    junkSent = false;
    methods = {
      writeHead: function() {
        var domain;
        res.writeHead(200, 'OK', ieHeaders);
        res.write('<html><body>');
        domain = query.DOMAIN;
        if (domain && domain !== '') {
          return res.write("<script>try{document.domain=" + (asciijson.stringify(domain)) + ";}catch(e){}</script>\n");
        }
      },
      write: function(data) {
        res.write("<script>try {parent.m(" + (asciijson.stringify(data)) + ")} catch(e) {}</script>\n");
        if (!junkSent) {
          res.write(ieJunk);
          return junkSent = true;
        }
      },
      end: function() {
        return res.end("<script>try  {parent.d(); }catch (e){}</script>\n");
      },
      writeError: function(statusCode, message) {
        methods.writeHead();
        return res.end("<script>try {parent.rpcClose(" + (asciijson.stringify(message)) + ")} catch(e){}</script>\n");
      }
    };
    methods.writeRaw = methods.write;
    return methods;
  } else {
    return {
      writeHead: function() {
        return res.writeHead(200, 'OK', options.headers);
      },
      write: function(data) {
        return res.write("" + data.length + "\n" + data);
      },
      writeRaw: function(data) {
        return res.write(data);
      },
      end: function() {
        return res.end();
      },
      writeError: function(statusCode, message) {
        res.writeHead(statusCode, options.headers);
        return res.end(message);
      }
    };
  }
};

sendError = function(res, statusCode, message, options) {
  res.writeHead(statusCode, message, options.headers);
  res.end("<html><body><h1>" + message + "</h1></body></html>");
};

bufferPostData = function(req, callback) {
  var data;
  data = [];
  req.on('data', function(chunk) {
    return data.push(chunk.toString('utf8'));
  });
  return req.on('end', function() {
    data = data.join('');
    return callback(data);
  });
};

transformData = function(req, data) {
  var count, id, key, map, mapKey, maps, match, ofs, regex, val, _ref;
  if (req.headers['content-type'] === 'application/json') {
    _ref = data, ofs = _ref.ofs, data = _ref.data;
    return {
      ofs: ofs,
      json: data
    };
  } else {
    count = parseInt(data.count);
    if (count === 0) {
      return null;
    }
    ofs = parseInt(data.ofs);
    if (isNaN(count || isNaN(ofs))) {
      throw new Error('invalid map data');
    }
    if (!(count === 0 || (count > 0 && (data.ofs != null)))) {
      throw new Error('Invalid maps');
    }
    maps = new Array(count);
    regex = /^req(\d+)_(.+)$/;
    for (key in data) {
      val = data[key];
      match = regex.exec(key);
      if (match) {
        id = match[1];
        mapKey = match[2];
        map = (maps[id] || (maps[id] = {}));
        if (id === 'type' && mapKey === '_badmap') {
          continue;
        }
        map[mapKey] = val;
      }
    }
    return {
      ofs: ofs,
      maps: maps
    };
  }
};

decodeData = function(req, data) {
  if (req.headers['content-type'] === 'application/json') {
    return JSON.parse(data);
  } else {
    return querystring.parse(data, '&', '=', {
      maxKeys: 0
    });
  }
};

order = function(start, playOld) {
  var base, queue;
  base = start;
  queue = new Array(10);
  return function(seq, callback) {
    callback || (callback = function() {});
    if (seq < base) {
      if (playOld) {
        callback();
      }
    } else {
      queue[seq - base] = callback;
      while (queue[0]) {
        callback = queue.shift();
        base++;
        callback();
      }
    }
  };
};

getHostPrefix = function(options) {
  if (options.hostPrefixes) {
    return randomArrayElement(options.hostPrefixes);
  } else {
    return null;
  }
};

clientFile = "" + __dirname + "/../dist/bcsocket.js";

clientStats = fs.statSync(clientFile);

try {
  clientCode = fs.readFileSync(clientFile, 'utf8');
} catch (_error) {
  e = _error;
  console.error('Could not load the client javascript. Run `cake client` to generate it.');
  throw e;
}

if (process.env.NODE_ENV !== 'production') {
  if (process.platform === "win32") {
    fs.watch(clientFile, {
      persistent: false
    }, function(event, filename) {
      if (event === "change") {
        console.log("Reloading client JS");
        clientCode = fs.readFileSync(clientFile, 'utf8');
        return clientStats = curr;
      }
    });
  } else {
    fs.watchFile(clientFile, {
      persistent: false
    }, function(curr, prev) {
      if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        console.log("Reloading client JS");
        clientCode = fs.readFileSync(clientFile, 'utf8');
        return clientStats = curr;
      }
    });
  }
}

BCSession = function(address, query, headers, options) {
  EventEmitter.call(this);
  this.id = hat();
  this.address = address;
  this.headers = headers;
  this.query = query;
  this.options = options;
  this.state = 'init';
  this.appVersion = query.CVER || null;
  this._backChannel = null;
  this._outgoingArrays = [];
  this._lastArrayId = -1;
  this._lastSentArrayId = -1;
  this._heartbeat = null;
  this._sessionTimeout = null;
  this._refreshSessionTimeout();
  this._queueArray(['c', this.id, getHostPrefix(options), 8]);
  this._mapBuffer = order(0, false);
  this._ridBuffer = order(query.RID, true);
};

(function() {
  var method, name, _ref;
  _ref = EventEmitter.prototype;
  for (name in _ref) {
    method = _ref[name];
    BCSession.prototype[name] = method;
  }
})();

BCSession.prototype._changeState = function(newState) {
  var oldState;
  oldState = this.state;
  this.state = newState;
  return this.emit('state changed', this.state, oldState);
};

BackChannel = function(session, res, query) {
  this.res = res;
  this.methods = messagingMethods(session.options, query, res);
  this.chunk = query.CI === '0';
  this.bytesSent = 0;
  this.listener = function() {
    session._backChannel.listener = null;
    return session._clearBackChannel(res);
  };
};

BCSession.prototype._setBackChannel = function(res, query) {
  this._clearBackChannel();
  this._backChannel = new BackChannel(this, res, query);
  res.connection.once('close', this._backChannel.listener);
  this._refreshHeartbeat();
  clearTimeout(this._sessionTimeout);
  if (this._outgoingArrays.length > 0) {
    this._lastSentArrayId = this._outgoingArrays[0].id - 1;
  }
  return this.flush();
};

BCSession.prototype._clearBackChannel = function(res) {
  if (!this._backChannel) {
    return;
  }
  if ((res != null) && res !== this._backChannel.res) {
    return;
  }
  if (this._backChannel.listener) {
    this._backChannel.res.connection.removeListener('close', this._backChannel.listener);
    this._backChannel.listener = null;
  }
  clearTimeout(this._heartbeat);
  this._backChannel.methods.end();
  this._backChannel = null;
  return this._refreshSessionTimeout();
};

BCSession.prototype._refreshHeartbeat = function() {
  var session;
  clearTimeout(this._heartbeat);
  session = this;
  return this._heartbeat = setInterval(function() {
    return session.send(['noop']);
  }, this.options.keepAliveInterval);
};

BCSession.prototype._refreshSessionTimeout = function() {
  var session;
  clearTimeout(this._sessionTimeout);
  session = this;
  return this._sessionTimeout = setTimeout(function() {
    return session.close('Timed out');
  }, this.options.sessionTimeoutInterval);
};

BCSession.prototype._acknowledgeArrays = function(id) {
  var confirmcallback;
  if (typeof id === 'string') {
    id = parseInt(id);
  }
  while (this._outgoingArrays.length > 0 && this._outgoingArrays[0].id <= id) {
    confirmcallback = this._outgoingArrays.shift().confirmcallback;
    if (typeof confirmcallback === "function") {
      confirmcallback();
    }
  }
};

OutgoingArray = function(id, data, sendcallback, confirmcallback) {
  this.id = id;
  this.data = data;
  this.sendcallback = sendcallback;
  this.confirmcallback = confirmcallback;
};

BCSession.prototype._queueArray = function(data, sendcallback, confirmcallback) {
  var id;
  if (this.state === 'closed') {
    return typeof confirmcallback === "function" ? confirmcallback(new Error('closed')) : void 0;
  }
  id = ++this._lastArrayId;
  this._outgoingArrays.push(new OutgoingArray(id, data, sendcallback, confirmcallback));
  return this._lastArrayId;
};

BCSession.prototype.send = function(arr, callback) {
  var id;
  id = this._queueArray(arr, null, callback);
  this.flush();
  return id;
};

BCSession.prototype._receivedData = function(rid, data) {
  var session;
  session = this;
  return this._ridBuffer(rid, function() {
    var id, map, message, _i, _j, _len, _len1, _ref, _ref1;
    if (data === null) {
      return;
    }
    if (!((data.maps != null) || (data.json != null))) {
      throw new Error('Invalid data');
    }
    session._ridBuffer(rid);
    id = data.ofs;
    if (data.maps) {
      _ref = data.maps;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        map = _ref[_i];
        session._mapBuffer(id++, (function(map) {
          return function() {
            var message;
            if (session.state === 'closed') {
              return;
            }
            session.emit('map', map);
            if (map.JSON != null) {
              try {
                message = JSON.parse(map.JSON);
              } catch (_error) {
                e = _error;
                session.close('Invalid JSON');
                return;
              }
              return session.emit('message', message);
            } else if (map._S != null) {
              return session.emit('message', map._S);
            }
          };
        })(map));
      }
    } else {
      _ref1 = data.json;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        message = _ref1[_j];
        session._mapBuffer(id++, (function(map) {
          return function() {
            if (session.state === 'closed') {
              return;
            }
            return session.emit('message', message);
          };
        })(map));
      }
    }
  });
};

BCSession.prototype._disconnectAt = function(rid) {
  var session;
  session = this;
  return this._ridBuffer(rid, function() {
    return session.close('Disconnected');
  });
};

BCSession.prototype._backChannelStatus = function() {
  var a, data, numUnsentArrays, outstandingBytes, unacknowledgedArrays;
  numUnsentArrays = this._lastArrayId - this._lastSentArrayId;
  unacknowledgedArrays = this._outgoingArrays.slice(0, this._outgoingArrays.length - numUnsentArrays);
  outstandingBytes = unacknowledgedArrays.length === 0 ? 0 : (data = (function() {
    var _i, _len, _results;
    _results = [];
    for (_i = 0, _len = unacknowledgedArrays.length; _i < _len; _i++) {
      a = unacknowledgedArrays[_i];
      _results.push(a.data);
    }
    return _results;
  })(), JSON.stringify(data).length);
  return [(this._backChannel ? 1 : 0), this._lastSentArrayId, outstandingBytes];
};

BCSession.prototype.flush = function() {
  var session;
  session = this;
  return process.nextTick(function() {
    return session._flush();
  });
};

BCSession.prototype._flush = function() {
  var a, arrays, bytes, data, id, numUnsentArrays, _i, _len;
  if (!this._backChannel) {
    return;
  }
  numUnsentArrays = this._lastArrayId - this._lastSentArrayId;
  if (numUnsentArrays > 0) {
    arrays = this._outgoingArrays.slice(this._outgoingArrays.length - numUnsentArrays);
    data = (function() {
      var _i, _len, _ref, _results;
      _results = [];
      for (_i = 0, _len = arrays.length; _i < _len; _i++) {
        _ref = arrays[_i], id = _ref.id, data = _ref.data;
        _results.push([id, data]);
      }
      return _results;
    })();
    bytes = JSON.stringify(data) + "\n";
    bytes = bytes.replace(/\u2028/g, "\\u2028");
    bytes = bytes.replace(/\u2029/g, "\\u2029");
    this._backChannel.methods.write(bytes);
    this._backChannel.bytesSent += bytes.length;
    this._lastSentArrayId = this._lastArrayId;
    for (_i = 0, _len = arrays.length; _i < _len; _i++) {
      a = arrays[_i];
      if (a.sendcallback != null) {
        if (typeof a.sendcallback === "function") {
          a.sendcallback();
        }
        delete a.sendcallback;
      }
    }
    if (this._backChannel && (!this._backChannel.chunk || this._backChannel.bytesSent > 10 * 1024)) {
      this._clearBackChannel();
    }
  }
  if (this.state === 'init') {
    return this._changeState('ok');
  }
};

BCSession.prototype.stop = function(callback) {
  if (this.state === 'closed') {
    return;
  }
  this._queueArray(['stop'], callback, null);
  return this.flush();
};

BCSession.prototype.close = function(message) {
  var confirmcallback, _i, _len, _ref;
  if (this.state === 'closed') {
    return;
  }
  this._changeState('closed');
  this.emit('close', message);
  this._clearBackChannel();
  clearTimeout(this._sessionTimeout);
  _ref = this._outgoingArrays;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    confirmcallback = _ref[_i].confirmcallback;
    if (typeof confirmcallback === "function") {
      confirmcallback(new Error(message || 'closed'));
    }
  }
};

module.exports = browserChannel = function(options, onConnect) {
  var base, createSession, h, middleware, option, sessions, value, _base, _ref;
  if (typeof onConnect === 'undefined') {
    onConnect = options;
    options = {};
  }
  options || (options = {});
  for (option in defaultOptions) {
    value = defaultOptions[option];
    if (options[option] == null) {
      options[option] = value;
    }
  }
  if (!options.headers) {
    options.headers = {};
  }
  for (h in standardHeaders) {
    v = standardHeaders[h];
    (_base = options.headers)[h] || (_base[h] = v);
  }
  if (options.cors) {
    options.headers['Access-Control-Allow-Origin'] = options.cors;
  }
  if (options.corsAllowCredentials) {
    options.headers['Access-Control-Allow-Credentials'] = true;
  }
  base = options.base;
  if (base.match(/\/$/)) {
    base = base.slice(0, base.length - 1);
  }
  if (!base.match(/^\//)) {
    base = "/" + base;
  }
  sessions = {};
  createSession = function(address, query, headers) {
    var oldArrayId, oldSession, oldSessionId, session;
    oldSessionId = query.OSID, oldArrayId = query.OAID;
    if ((oldSessionId != null) && (oldSession = sessions[oldSessionId])) {
      oldSession._acknowledgeArrays(oldArrayId);
      oldSession.close('Reconnected');
    }
    session = new BCSession(address, query, headers, options);
    sessions[session.id] = session;
    session.on('close', function() {
      return delete sessions[session.id];
    });
    return session;
  };
  middleware = function(req, res, next) {
    var blockedPrefix, dataError, end, etag, headers, hostPrefix, pathname, processData, query, session, write, writeError, writeHead, writeRaw, _ref, _ref1, _ref2, _ref3;
    _ref = parse(req.url, true), query = _ref.query, pathname = _ref.pathname;
    if (pathname.substring(0, base.length + 1) !== ("" + base + "/")) {
      return next();
    }
    _ref1 = messagingMethods(options, query, res), writeHead = _ref1.writeHead, write = _ref1.write, writeRaw = _ref1.writeRaw, end = _ref1.end, writeError = _ref1.writeError;
    if (pathname === ("" + base + "/bcsocket.js")) {
      etag = "\"" + clientStats.size + "-" + (clientStats.mtime.getTime()) + "\"";
      res.writeHead(200, 'OK', {
        'Content-Type': 'application/javascript',
        'ETag': etag,
        'Content-Length': clientCode.length
      });
      if (req.method === 'HEAD') {
        return res.end();
      } else {
        return res.end(clientCode);
      }
    } else if (pathname === ("" + base + "/test")) {
      if (query.VER !== '8') {
        return sendError(res, 400, 'Version 8 required', options);
      }
      if (query.MODE === 'init' && req.method === 'GET') {
        hostPrefix = getHostPrefix(options);
        blockedPrefix = null;
        headers = {};
        _ref2 = options.headers;
        for (k in _ref2) {
          v = _ref2[k];
          headers[k] = v;
        }
        headers['X-Accept'] = 'application/json; application/x-www-form-urlencoded';
        res.writeHead(200, 'OK', headers);
        return res.end(JSON.stringify([hostPrefix, blockedPrefix]));
      } else {
        writeHead();
        writeRaw('11111');
        return setTimeout((function() {
          writeRaw('2');
          return end();
        }), 2000);
      }
    } else if (pathname === ("" + base + "/bind")) {
      if (query.VER !== '8') {
        return sendError(res, 400, 'Version 8 required', options);
      }
      if (query.SID) {
        session = sessions[query.SID];
        if (!session) {
          return sendError(res, 400, 'Unknown SID', options);
        }
      }
      if ((query.AID != null) && session) {
        session._acknowledgeArrays(query.AID);
      }
      if (req.method === 'POST') {
        if (session === void 0) {
          session = createSession(req.connection.remoteAddress, query, req.headers);
          if (typeof onConnect === "function") {
            onConnect(session, req);
          }
          session.emit('req', req);
        }
        dataError = function(e) {
          console.warn('Error parsing forward channel', e.stack);
          return sendError(res, 400, 'Bad data', options);
        };
        processData = function(data) {
          var response;
          try {
            data = transformData(req, data);
            session._receivedData(query.RID, data);
          } catch (_error) {
            e = _error;
            return dataError(e);
          }
          if (session.state === 'init') {
            res.writeHead(200, 'OK', options.headers);
            session._setBackChannel(res, {
              CI: 1,
              TYPE: 'xmlhttp',
              RID: 'rpc'
            });
            return session.flush();
          } else if (session.state === 'closed') {
            return sendError(res, 403, 'Forbidden', options);
          } else {
            response = JSON.stringify(session._backChannelStatus());
            res.writeHead(200, 'OK', options.headers);
            return res.end("" + response.length + "\n" + response);
          }
        };
        if (req.body) {
          return processData(req.body);
        } else {
          return bufferPostData(req, function(data) {
            try {
              data = decodeData(req, data);
            } catch (_error) {
              e = _error;
              return dataError(e);
            }
            return processData(data);
          });
        }
      } else if (req.method === 'GET') {
        if ((_ref3 = query.TYPE) === 'xmlhttp' || _ref3 === 'html') {
          if (typeof query.SID !== 'string' && query.SID.length < 5) {
            return sendError(res, 400, 'Invalid SID', options);
          }
          if (query.RID !== 'rpc') {
            return sendError(res, 400, 'Expected RPC', options);
          }
          writeHead();
          return session._setBackChannel(res, query);
        } else if (query.TYPE === 'terminate') {
          if (session != null) {
            session._disconnectAt(query.RID);
          }
          res.writeHead(200, 'OK', options.headers);
          return res.end();
        }
      } else {
        res.writeHead(405, 'Method Not Allowed', options.headers);
        return res.end("Method not allowed");
      }
    } else {
      res.writeHead(404, 'Not Found', options.headers);
      return res.end("Not found");
    }
  };
  middleware.close = function() {
    var id, session;
    for (id in sessions) {
      session = sessions[id];
      session.close();
    }
  };
  if ((_ref = options.server) != null) {
    _ref.on('close', middleware.close);
  }
  return middleware;
};

browserChannel._setTimerMethods = function(methods) {
  return setInterval = methods.setInterval, clearInterval = methods.clearInterval, setTimeout = methods.setTimeout, clearTimeout = methods.clearTimeout, Date = methods.Date, methods;
};
