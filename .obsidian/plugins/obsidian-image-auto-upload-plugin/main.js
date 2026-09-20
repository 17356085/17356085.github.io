'use strict';

var obsidian = require('obsidian');
var require$$0 = require('fs');
var process$2 = require('node:process');
var require$$0$1 = require('path');
var require$$0$2 = require('child_process');
var require$$0$3 = require('os');
var require$$0$4 = require('assert');
var require$$2 = require('events');
var require$$0$6 = require('buffer');
var require$$0$5 = require('stream');
var require$$2$1 = require('util');
var node_os = require('node:os');
require('electron');
var node_buffer = require('node:buffer');

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) ; else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

var pathBrowserify = posix;

var execa$2 = {exports: {}};

var crossSpawn$1 = {exports: {}};

var windows;
var hasRequiredWindows;

function requireWindows () {
	if (hasRequiredWindows) return windows;
	hasRequiredWindows = 1;
	windows = isexe;
	isexe.sync = sync;

	var fs = require$$0;

	function checkPathExt (path, options) {
	  var pathext = options.pathExt !== undefined ?
	    options.pathExt : process.env.PATHEXT;

	  if (!pathext) {
	    return true
	  }

	  pathext = pathext.split(';');
	  if (pathext.indexOf('') !== -1) {
	    return true
	  }
	  for (var i = 0; i < pathext.length; i++) {
	    var p = pathext[i].toLowerCase();
	    if (p && path.substr(-p.length).toLowerCase() === p) {
	      return true
	    }
	  }
	  return false
	}

	function checkStat (stat, path, options) {
	  if (!stat.isSymbolicLink() && !stat.isFile()) {
	    return false
	  }
	  return checkPathExt(path, options)
	}

	function isexe (path, options, cb) {
	  fs.stat(path, function (er, stat) {
	    cb(er, er ? false : checkStat(stat, path, options));
	  });
	}

	function sync (path, options) {
	  return checkStat(fs.statSync(path), path, options)
	}
	return windows;
}

var mode;
var hasRequiredMode;

function requireMode () {
	if (hasRequiredMode) return mode;
	hasRequiredMode = 1;
	mode = isexe;
	isexe.sync = sync;

	var fs = require$$0;

	function isexe (path, options, cb) {
	  fs.stat(path, function (er, stat) {
	    cb(er, er ? false : checkStat(stat, options));
	  });
	}

	function sync (path, options) {
	  return checkStat(fs.statSync(path), options)
	}

	function checkStat (stat, options) {
	  return stat.isFile() && checkMode(stat, options)
	}

	function checkMode (stat, options) {
	  var mod = stat.mode;
	  var uid = stat.uid;
	  var gid = stat.gid;

	  var myUid = options.uid !== undefined ?
	    options.uid : process.getuid && process.getuid();
	  var myGid = options.gid !== undefined ?
	    options.gid : process.getgid && process.getgid();

	  var u = parseInt('100', 8);
	  var g = parseInt('010', 8);
	  var o = parseInt('001', 8);
	  var ug = u | g;

	  var ret = (mod & o) ||
	    (mod & g) && gid === myGid ||
	    (mod & u) && uid === myUid ||
	    (mod & ug) && myUid === 0;

	  return ret
	}
	return mode;
}

var core$1;
if (process.platform === 'win32' || commonjsGlobal.TESTING_WINDOWS) {
  core$1 = requireWindows();
} else {
  core$1 = requireMode();
}

var isexe_1 = isexe$1;
isexe$1.sync = sync;

function isexe$1 (path, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  if (!cb) {
    if (typeof Promise !== 'function') {
      throw new TypeError('callback not provided')
    }

    return new Promise(function (resolve, reject) {
      isexe$1(path, options || {}, function (er, is) {
        if (er) {
          reject(er);
        } else {
          resolve(is);
        }
      });
    })
  }

  core$1(path, options || {}, function (er, is) {
    // ignore EACCES because that just means we aren't allowed to run it
    if (er) {
      if (er.code === 'EACCES' || options && options.ignoreErrors) {
        er = null;
        is = false;
      }
    }
    cb(er, is);
  });
}

function sync (path, options) {
  // my kingdom for a filtered catch
  try {
    return core$1.sync(path, options || {})
  } catch (er) {
    if (options && options.ignoreErrors || er.code === 'EACCES') {
      return false
    } else {
      throw er
    }
  }
}

const isWindows = process.platform === 'win32' ||
    process.env.OSTYPE === 'cygwin' ||
    process.env.OSTYPE === 'msys';

const path$3 = require$$0$1;
const COLON = isWindows ? ';' : ':';
const isexe = isexe_1;

const getNotFoundError = (cmd) =>
  Object.assign(new Error(`not found: ${cmd}`), { code: 'ENOENT' });

const getPathInfo = (cmd, opt) => {
  const colon = opt.colon || COLON;

  // If it has a slash, then we don't bother searching the pathenv.
  // just check the file itself, and that's it.
  const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? ['']
    : (
      [
        // windows always checks the cwd first
        ...(isWindows ? [process.cwd()] : []),
        ...(opt.path || process.env.PATH ||
          /* istanbul ignore next: very unusual */ '').split(colon),
      ]
    );
  const pathExtExe = isWindows
    ? opt.pathExt || process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM'
    : '';
  const pathExt = isWindows ? pathExtExe.split(colon) : [''];

  if (isWindows) {
    if (cmd.indexOf('.') !== -1 && pathExt[0] !== '')
      pathExt.unshift('');
  }

  return {
    pathEnv,
    pathExt,
    pathExtExe,
  }
};

const which$1 = (cmd, opt, cb) => {
  if (typeof opt === 'function') {
    cb = opt;
    opt = {};
  }
  if (!opt)
    opt = {};

  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
  const found = [];

  const step = i => new Promise((resolve, reject) => {
    if (i === pathEnv.length)
      return opt.all && found.length ? resolve(found)
        : reject(getNotFoundError(cmd))

    const ppRaw = pathEnv[i];
    const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;

    const pCmd = path$3.join(pathPart, cmd);
    const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd
      : pCmd;

    resolve(subStep(p, i, 0));
  });

  const subStep = (p, i, ii) => new Promise((resolve, reject) => {
    if (ii === pathExt.length)
      return resolve(step(i + 1))
    const ext = pathExt[ii];
    isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
      if (!er && is) {
        if (opt.all)
          found.push(p + ext);
        else
          return resolve(p + ext)
      }
      return resolve(subStep(p, i, ii + 1))
    });
  });

  return cb ? step(0).then(res => cb(null, res), cb) : step(0)
};

const whichSync = (cmd, opt) => {
  opt = opt || {};

  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
  const found = [];

  for (let i = 0; i < pathEnv.length; i ++) {
    const ppRaw = pathEnv[i];
    const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;

    const pCmd = path$3.join(pathPart, cmd);
    const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd
      : pCmd;

    for (let j = 0; j < pathExt.length; j ++) {
      const cur = p + pathExt[j];
      try {
        const is = isexe.sync(cur, { pathExt: pathExtExe });
        if (is) {
          if (opt.all)
            found.push(cur);
          else
            return cur
        }
      } catch (ex) {}
    }
  }

  if (opt.all && found.length)
    return found

  if (opt.nothrow)
    return null

  throw getNotFoundError(cmd)
};

var which_1 = which$1;
which$1.sync = whichSync;

var pathKey$1 = {exports: {}};

const pathKey = (options = {}) => {
	const environment = options.env || process.env;
	const platform = options.platform || process.platform;

	if (platform !== 'win32') {
		return 'PATH';
	}

	return Object.keys(environment).reverse().find(key => key.toUpperCase() === 'PATH') || 'Path';
};

pathKey$1.exports = pathKey;
// TODO: Remove this for the next major release
pathKey$1.exports.default = pathKey;

var pathKeyExports = pathKey$1.exports;

const path$2 = require$$0$1;
const which = which_1;
const getPathKey = pathKeyExports;

function resolveCommandAttempt(parsed, withoutPathExt) {
    const env = parsed.options.env || process.env;
    const cwd = process.cwd();
    const hasCustomCwd = parsed.options.cwd != null;
    // Worker threads do not have process.chdir()
    const shouldSwitchCwd = hasCustomCwd && process.chdir !== undefined && !process.chdir.disabled;

    // If a custom `cwd` was specified, we need to change the process cwd
    // because `which` will do stat calls but does not support a custom cwd
    if (shouldSwitchCwd) {
        try {
            process.chdir(parsed.options.cwd);
        } catch (err) {
            /* Empty */
        }
    }

    let resolved;

    try {
        resolved = which.sync(parsed.command, {
            path: env[getPathKey({ env })],
            pathExt: withoutPathExt ? path$2.delimiter : undefined,
        });
    } catch (e) {
        /* Empty */
    } finally {
        if (shouldSwitchCwd) {
            process.chdir(cwd);
        }
    }

    // If we successfully resolved, ensure that an absolute path is returned
    // Note that when a custom `cwd` was used, we need to resolve to an absolute path based on it
    if (resolved) {
        resolved = path$2.resolve(hasCustomCwd ? parsed.options.cwd : '', resolved);
    }

    return resolved;
}

function resolveCommand$1(parsed) {
    return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
}

var resolveCommand_1 = resolveCommand$1;

var _escape = {};

// See http://www.robvanderwoude.com/escapechars.php
const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;

function escapeCommand(arg) {
    // Escape meta chars
    arg = arg.replace(metaCharsRegExp, '^$1');

    return arg;
}

function escapeArgument(arg, doubleEscapeMetaChars) {
    // Convert to string
    arg = `${arg}`;

    // Algorithm below is based on https://qntm.org/cmd

    // Sequence of backslashes followed by a double quote:
    // double up all the backslashes and escape the double quote
    arg = arg.replace(/(\\*)"/g, '$1$1\\"');

    // Sequence of backslashes followed by the end of the string
    // (which will become a double quote later):
    // double up all the backslashes
    arg = arg.replace(/(\\*)$/, '$1$1');

    // All other backslashes occur literally

    // Quote the whole thing:
    arg = `"${arg}"`;

    // Escape meta chars
    arg = arg.replace(metaCharsRegExp, '^$1');

    // Double escape meta chars if necessary
    if (doubleEscapeMetaChars) {
        arg = arg.replace(metaCharsRegExp, '^$1');
    }

    return arg;
}

_escape.command = escapeCommand;
_escape.argument = escapeArgument;

var shebangRegex$1 = /^#!(.*)/;

const shebangRegex = shebangRegex$1;

var shebangCommand$1 = (string = '') => {
	const match = string.match(shebangRegex);

	if (!match) {
		return null;
	}

	const [path, argument] = match[0].replace(/#! ?/, '').split(' ');
	const binary = path.split('/').pop();

	if (binary === 'env') {
		return argument;
	}

	return argument ? `${binary} ${argument}` : binary;
};

const fs = require$$0;
const shebangCommand = shebangCommand$1;

function readShebang$1(command) {
    // Read the first 150 bytes from the file
    const size = 150;
    const buffer = Buffer.alloc(size);

    let fd;

    try {
        fd = fs.openSync(command, 'r');
        fs.readSync(fd, buffer, 0, size, 0);
        fs.closeSync(fd);
    } catch (e) { /* Empty */ }

    // Attempt to extract shebang (null is returned if not a shebang)
    return shebangCommand(buffer.toString());
}

var readShebang_1 = readShebang$1;

const path$1 = require$$0$1;
const resolveCommand = resolveCommand_1;
const escape = _escape;
const readShebang = readShebang_1;

const isWin$2 = process.platform === 'win32';
const isExecutableRegExp = /\.(?:com|exe)$/i;
const isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;

function detectShebang(parsed) {
    parsed.file = resolveCommand(parsed);

    const shebang = parsed.file && readShebang(parsed.file);

    if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;

        return resolveCommand(parsed);
    }

    return parsed.file;
}

function parseNonShell(parsed) {
    if (!isWin$2) {
        return parsed;
    }

    // Detect & add support for shebangs
    const commandFile = detectShebang(parsed);

    // We don't need a shell if the command filename is an executable
    const needsShell = !isExecutableRegExp.test(commandFile);

    // If a shell is required, use cmd.exe and take care of escaping everything correctly
    // Note that `forceShell` is an hidden option used only in tests
    if (parsed.options.forceShell || needsShell) {
        // Need to double escape meta chars if the command is a cmd-shim located in `node_modules/.bin/`
        // The cmd-shim simply calls execute the package bin file with NodeJS, proxying any argument
        // Because the escape of metachars with ^ gets interpreted when the cmd.exe is first called,
        // we need to double escape them
        const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);

        // Normalize posix paths into OS compatible paths (e.g.: foo/bar -> foo\bar)
        // This is necessary otherwise it will always fail with ENOENT in those cases
        parsed.command = path$1.normalize(parsed.command);

        // Escape command & arguments
        parsed.command = escape.command(parsed.command);
        parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));

        const shellCommand = [parsed.command].concat(parsed.args).join(' ');

        parsed.args = ['/d', '/s', '/c', `"${shellCommand}"`];
        parsed.command = process.env.comspec || 'cmd.exe';
        parsed.options.windowsVerbatimArguments = true; // Tell node's spawn that the arguments are already escaped
    }

    return parsed;
}

function parse$1(command, args, options) {
    // Normalize arguments, similar to nodejs
    if (args && !Array.isArray(args)) {
        options = args;
        args = null;
    }

    args = args ? args.slice(0) : []; // Clone array to avoid changing the original
    options = Object.assign({}, options); // Clone object to avoid changing the original

    // Build our parsed object
    const parsed = {
        command,
        args,
        options,
        file: undefined,
        original: {
            command,
            args,
        },
    };

    // Delegate further parsing to shell or non-shell
    return options.shell ? parsed : parseNonShell(parsed);
}

var parse_1 = parse$1;

const isWin$1 = process.platform === 'win32';

function notFoundError(original, syscall) {
    return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
        code: 'ENOENT',
        errno: 'ENOENT',
        syscall: `${syscall} ${original.command}`,
        path: original.command,
        spawnargs: original.args,
    });
}

function hookChildProcess(cp, parsed) {
    if (!isWin$1) {
        return;
    }

    const originalEmit = cp.emit;

    cp.emit = function (name, arg1) {
        // If emitting "exit" event and exit code is 1, we need to check if
        // the command exists and emit an "error" instead
        // See https://github.com/IndigoUnited/node-cross-spawn/issues/16
        if (name === 'exit') {
            const err = verifyENOENT(arg1, parsed);

            if (err) {
                return originalEmit.call(cp, 'error', err);
            }
        }

        return originalEmit.apply(cp, arguments); // eslint-disable-line prefer-rest-params
    };
}

function verifyENOENT(status, parsed) {
    if (isWin$1 && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, 'spawn');
    }

    return null;
}

function verifyENOENTSync(status, parsed) {
    if (isWin$1 && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, 'spawnSync');
    }

    return null;
}

var enoent$1 = {
    hookChildProcess,
    verifyENOENT,
    verifyENOENTSync,
    notFoundError,
};

const cp = require$$0$2;
const parse = parse_1;
const enoent = enoent$1;

function spawn(command, args, options) {
    // Parse the arguments
    const parsed = parse(command, args, options);

    // Spawn the child process
    const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);

    // Hook into child process "exit" event to emit an error if the command
    // does not exists, see: https://github.com/IndigoUnited/node-cross-spawn/issues/16
    enoent.hookChildProcess(spawned, parsed);

    return spawned;
}

function spawnSync(command, args, options) {
    // Parse the arguments
    const parsed = parse(command, args, options);

    // Spawn the child process
    const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);

    // Analyze if the command does not exist, see: https://github.com/IndigoUnited/node-cross-spawn/issues/16
    result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);

    return result;
}

crossSpawn$1.exports = spawn;
crossSpawn$1.exports.spawn = spawn;
crossSpawn$1.exports.sync = spawnSync;

crossSpawn$1.exports._parse = parse;
crossSpawn$1.exports._enoent = enoent;

var crossSpawnExports = crossSpawn$1.exports;

var stripFinalNewline$1 = input => {
	const LF = typeof input === 'string' ? '\n' : '\n'.charCodeAt();
	const CR = typeof input === 'string' ? '\r' : '\r'.charCodeAt();

	if (input[input.length - 1] === LF) {
		input = input.slice(0, input.length - 1);
	}

	if (input[input.length - 1] === CR) {
		input = input.slice(0, input.length - 1);
	}

	return input;
};

var npmRunPath$1 = {exports: {}};

npmRunPath$1.exports;

(function (module) {
	const path = require$$0$1;
	const pathKey = pathKeyExports;

	const npmRunPath = options => {
		options = {
			cwd: process.cwd(),
			path: process.env[pathKey()],
			execPath: process.execPath,
			...options
		};

		let previous;
		let cwdPath = path.resolve(options.cwd);
		const result = [];

		while (previous !== cwdPath) {
			result.push(path.join(cwdPath, 'node_modules/.bin'));
			previous = cwdPath;
			cwdPath = path.resolve(cwdPath, '..');
		}

		// Ensure the running `node` binary is used
		const execPathDir = path.resolve(options.cwd, options.execPath, '..');
		result.push(execPathDir);

		return result.concat(options.path).join(path.delimiter);
	};

	module.exports = npmRunPath;
	// TODO: Remove this for the next major release
	module.exports.default = npmRunPath;

	module.exports.env = options => {
		options = {
			env: process.env,
			...options
		};

		const env = {...options.env};
		const path = pathKey({env});

		options.path = env[path];
		env[path] = module.exports(options);

		return env;
	};
} (npmRunPath$1));

var npmRunPathExports = npmRunPath$1.exports;

var onetime$2 = {exports: {}};

var mimicFn$2 = {exports: {}};

const mimicFn$1 = (to, from) => {
	for (const prop of Reflect.ownKeys(from)) {
		Object.defineProperty(to, prop, Object.getOwnPropertyDescriptor(from, prop));
	}

	return to;
};

mimicFn$2.exports = mimicFn$1;
// TODO: Remove this for the next major release
mimicFn$2.exports.default = mimicFn$1;

var mimicFnExports = mimicFn$2.exports;

const mimicFn = mimicFnExports;

const calledFunctions = new WeakMap();

const onetime$1 = (function_, options = {}) => {
	if (typeof function_ !== 'function') {
		throw new TypeError('Expected a function');
	}

	let returnValue;
	let callCount = 0;
	const functionName = function_.displayName || function_.name || '<anonymous>';

	const onetime = function (...arguments_) {
		calledFunctions.set(onetime, ++callCount);

		if (callCount === 1) {
			returnValue = function_.apply(this, arguments_);
			function_ = null;
		} else if (options.throw === true) {
			throw new Error(`Function \`${functionName}\` can only be called once`);
		}

		return returnValue;
	};

	mimicFn(onetime, function_);
	calledFunctions.set(onetime, callCount);

	return onetime;
};

onetime$2.exports = onetime$1;
// TODO: Remove this for the next major release
onetime$2.exports.default = onetime$1;

onetime$2.exports.callCount = function_ => {
	if (!calledFunctions.has(function_)) {
		throw new Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
	}

	return calledFunctions.get(function_);
};

var onetimeExports = onetime$2.exports;

var main = {};

var signals$2 = {};

var core = {};

Object.defineProperty(core,"__esModule",{value:true});core.SIGNALS=void 0;

const SIGNALS=[
{
name:"SIGHUP",
number:1,
action:"terminate",
description:"Terminal closed",
standard:"posix"},

{
name:"SIGINT",
number:2,
action:"terminate",
description:"User interruption with CTRL-C",
standard:"ansi"},

{
name:"SIGQUIT",
number:3,
action:"core",
description:"User interruption with CTRL-\\",
standard:"posix"},

{
name:"SIGILL",
number:4,
action:"core",
description:"Invalid machine instruction",
standard:"ansi"},

{
name:"SIGTRAP",
number:5,
action:"core",
description:"Debugger breakpoint",
standard:"posix"},

{
name:"SIGABRT",
number:6,
action:"core",
description:"Aborted",
standard:"ansi"},

{
name:"SIGIOT",
number:6,
action:"core",
description:"Aborted",
standard:"bsd"},

{
name:"SIGBUS",
number:7,
action:"core",
description:
"Bus error due to misaligned, non-existing address or paging error",
standard:"bsd"},

{
name:"SIGEMT",
number:7,
action:"terminate",
description:"Command should be emulated but is not implemented",
standard:"other"},

{
name:"SIGFPE",
number:8,
action:"core",
description:"Floating point arithmetic error",
standard:"ansi"},

{
name:"SIGKILL",
number:9,
action:"terminate",
description:"Forced termination",
standard:"posix",
forced:true},

{
name:"SIGUSR1",
number:10,
action:"terminate",
description:"Application-specific signal",
standard:"posix"},

{
name:"SIGSEGV",
number:11,
action:"core",
description:"Segmentation fault",
standard:"ansi"},

{
name:"SIGUSR2",
number:12,
action:"terminate",
description:"Application-specific signal",
standard:"posix"},

{
name:"SIGPIPE",
number:13,
action:"terminate",
description:"Broken pipe or socket",
standard:"posix"},

{
name:"SIGALRM",
number:14,
action:"terminate",
description:"Timeout or timer",
standard:"posix"},

{
name:"SIGTERM",
number:15,
action:"terminate",
description:"Termination",
standard:"ansi"},

{
name:"SIGSTKFLT",
number:16,
action:"terminate",
description:"Stack is empty or overflowed",
standard:"other"},

{
name:"SIGCHLD",
number:17,
action:"ignore",
description:"Child process terminated, paused or unpaused",
standard:"posix"},

{
name:"SIGCLD",
number:17,
action:"ignore",
description:"Child process terminated, paused or unpaused",
standard:"other"},

{
name:"SIGCONT",
number:18,
action:"unpause",
description:"Unpaused",
standard:"posix",
forced:true},

{
name:"SIGSTOP",
number:19,
action:"pause",
description:"Paused",
standard:"posix",
forced:true},

{
name:"SIGTSTP",
number:20,
action:"pause",
description:"Paused using CTRL-Z or \"suspend\"",
standard:"posix"},

{
name:"SIGTTIN",
number:21,
action:"pause",
description:"Background process cannot read terminal input",
standard:"posix"},

{
name:"SIGBREAK",
number:21,
action:"terminate",
description:"User interruption with CTRL-BREAK",
standard:"other"},

{
name:"SIGTTOU",
number:22,
action:"pause",
description:"Background process cannot write to terminal output",
standard:"posix"},

{
name:"SIGURG",
number:23,
action:"ignore",
description:"Socket received out-of-band data",
standard:"bsd"},

{
name:"SIGXCPU",
number:24,
action:"core",
description:"Process timed out",
standard:"bsd"},

{
name:"SIGXFSZ",
number:25,
action:"core",
description:"File too big",
standard:"bsd"},

{
name:"SIGVTALRM",
number:26,
action:"terminate",
description:"Timeout or timer",
standard:"bsd"},

{
name:"SIGPROF",
number:27,
action:"terminate",
description:"Timeout or timer",
standard:"bsd"},

{
name:"SIGWINCH",
number:28,
action:"ignore",
description:"Terminal window size changed",
standard:"bsd"},

{
name:"SIGIO",
number:29,
action:"terminate",
description:"I/O is available",
standard:"other"},

{
name:"SIGPOLL",
number:29,
action:"terminate",
description:"Watched event",
standard:"other"},

{
name:"SIGINFO",
number:29,
action:"ignore",
description:"Request for process information",
standard:"other"},

{
name:"SIGPWR",
number:30,
action:"terminate",
description:"Device running out of power",
standard:"systemv"},

{
name:"SIGSYS",
number:31,
action:"core",
description:"Invalid system call",
standard:"other"},

{
name:"SIGUNUSED",
number:31,
action:"terminate",
description:"Invalid system call",
standard:"other"}];core.SIGNALS=SIGNALS;

var realtime = {};

Object.defineProperty(realtime,"__esModule",{value:true});realtime.SIGRTMAX=realtime.getRealtimeSignals=void 0;
const getRealtimeSignals=function(){
const length=SIGRTMAX-SIGRTMIN+1;
return Array.from({length},getRealtimeSignal);
};realtime.getRealtimeSignals=getRealtimeSignals;

const getRealtimeSignal=function(value,index){
return {
name:`SIGRT${index+1}`,
number:SIGRTMIN+index,
action:"terminate",
description:"Application-specific signal (realtime)",
standard:"posix"};

};

const SIGRTMIN=34;
const SIGRTMAX=64;realtime.SIGRTMAX=SIGRTMAX;

Object.defineProperty(signals$2,"__esModule",{value:true});signals$2.getSignals=void 0;var _os$1=require$$0$3;

var _core=core;
var _realtime$1=realtime;



const getSignals=function(){
const realtimeSignals=(0, _realtime$1.getRealtimeSignals)();
const signals=[..._core.SIGNALS,...realtimeSignals].map(normalizeSignal);
return signals;
};signals$2.getSignals=getSignals;







const normalizeSignal=function({
name,
number:defaultNumber,
description,
action,
forced=false,
standard})
{
const{
signals:{[name]:constantSignal}}=
_os$1.constants;
const supported=constantSignal!==undefined;
const number=supported?constantSignal:defaultNumber;
return {name,number,description,supported,action,forced,standard};
};

Object.defineProperty(main,"__esModule",{value:true});main.signalsByNumber=main.signalsByName=void 0;var _os=require$$0$3;

var _signals=signals$2;
var _realtime=realtime;



const getSignalsByName=function(){
const signals=(0, _signals.getSignals)();
return signals.reduce(getSignalByName,{});
};

const getSignalByName=function(
signalByNameMemo,
{name,number,description,supported,action,forced,standard})
{
return {
...signalByNameMemo,
[name]:{name,number,description,supported,action,forced,standard}};

};

const signalsByName$1=getSignalsByName();main.signalsByName=signalsByName$1;




const getSignalsByNumber=function(){
const signals=(0, _signals.getSignals)();
const length=_realtime.SIGRTMAX+1;
const signalsA=Array.from({length},(value,number)=>
getSignalByNumber(number,signals));

return Object.assign({},...signalsA);
};

const getSignalByNumber=function(number,signals){
const signal=findSignalByNumber(number,signals);

if(signal===undefined){
return {};
}

const{name,description,supported,action,forced,standard}=signal;
return {
[number]:{
name,
number,
description,
supported,
action,
forced,
standard}};


};



const findSignalByNumber=function(number,signals){
const signal=signals.find(({name})=>_os.constants.signals[name]===number);

if(signal!==undefined){
return signal;
}

return signals.find(signalA=>signalA.number===number);
};

const signalsByNumber=getSignalsByNumber();main.signalsByNumber=signalsByNumber;

const {signalsByName} = main;

const getErrorPrefix = ({timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled}) => {
	if (timedOut) {
		return `timed out after ${timeout} milliseconds`;
	}

	if (isCanceled) {
		return 'was canceled';
	}

	if (errorCode !== undefined) {
		return `failed with ${errorCode}`;
	}

	if (signal !== undefined) {
		return `was killed with ${signal} (${signalDescription})`;
	}

	if (exitCode !== undefined) {
		return `failed with exit code ${exitCode}`;
	}

	return 'failed';
};

const makeError$1 = ({
	stdout,
	stderr,
	all,
	error,
	signal,
	exitCode,
	command,
	escapedCommand,
	timedOut,
	isCanceled,
	killed,
	parsed: {options: {timeout}}
}) => {
	// `signal` and `exitCode` emitted on `spawned.on('exit')` event can be `null`.
	// We normalize them to `undefined`
	exitCode = exitCode === null ? undefined : exitCode;
	signal = signal === null ? undefined : signal;
	const signalDescription = signal === undefined ? undefined : signalsByName[signal].description;

	const errorCode = error && error.code;

	const prefix = getErrorPrefix({timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled});
	const execaMessage = `Command ${prefix}: ${command}`;
	const isError = Object.prototype.toString.call(error) === '[object Error]';
	const shortMessage = isError ? `${execaMessage}\n${error.message}` : execaMessage;
	const message = [shortMessage, stderr, stdout].filter(Boolean).join('\n');

	if (isError) {
		error.originalMessage = error.message;
		error.message = message;
	} else {
		error = new Error(message);
	}

	error.shortMessage = shortMessage;
	error.command = command;
	error.escapedCommand = escapedCommand;
	error.exitCode = exitCode;
	error.signal = signal;
	error.signalDescription = signalDescription;
	error.stdout = stdout;
	error.stderr = stderr;

	if (all !== undefined) {
		error.all = all;
	}

	if ('bufferedData' in error) {
		delete error.bufferedData;
	}

	error.failed = true;
	error.timedOut = Boolean(timedOut);
	error.isCanceled = isCanceled;
	error.killed = killed && !timedOut;

	return error;
};

var error = makeError$1;

var stdio = {exports: {}};

const aliases = ['stdin', 'stdout', 'stderr'];

const hasAlias = options => aliases.some(alias => options[alias] !== undefined);

const normalizeStdio$1 = options => {
	if (!options) {
		return;
	}

	const {stdio} = options;

	if (stdio === undefined) {
		return aliases.map(alias => options[alias]);
	}

	if (hasAlias(options)) {
		throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${aliases.map(alias => `\`${alias}\``).join(', ')}`);
	}

	if (typeof stdio === 'string') {
		return stdio;
	}

	if (!Array.isArray(stdio)) {
		throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio}\``);
	}

	const length = Math.max(stdio.length, aliases.length);
	return Array.from({length}, (value, index) => stdio[index]);
};

stdio.exports = normalizeStdio$1;

// `ipc` is pushed unless it is already present
stdio.exports.node = options => {
	const stdio = normalizeStdio$1(options);

	if (stdio === 'ipc') {
		return 'ipc';
	}

	if (stdio === undefined || typeof stdio === 'string') {
		return [stdio, stdio, stdio, 'ipc'];
	}

	if (stdio.includes('ipc')) {
		return stdio;
	}

	return [...stdio, 'ipc'];
};

var stdioExports = stdio.exports;

var signalExit = {exports: {}};

var signals$1 = {exports: {}};

var hasRequiredSignals;

function requireSignals () {
	if (hasRequiredSignals) return signals$1.exports;
	hasRequiredSignals = 1;
	(function (module) {
		// This is not the set of all possible signals.
		//
		// It IS, however, the set of all signals that trigger
		// an exit on either Linux or BSD systems.  Linux is a
		// superset of the signal names supported on BSD, and
		// the unknown signals just fail to register, so we can
		// catch that easily enough.
		//
		// Don't bother with SIGKILL.  It's uncatchable, which
		// means that we can't fire any callbacks anyway.
		//
		// If a user does happen to register a handler on a non-
		// fatal signal like SIGWINCH or something, and then
		// exit, it'll end up firing `process.emit('exit')`, so
		// the handler will be fired anyway.
		//
		// SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
		// artificially, inherently leave the process in a
		// state from which it is not safe to try and enter JS
		// listeners.
		module.exports = [
		  'SIGABRT',
		  'SIGALRM',
		  'SIGHUP',
		  'SIGINT',
		  'SIGTERM'
		];

		if (process.platform !== 'win32') {
		  module.exports.push(
		    'SIGVTALRM',
		    'SIGXCPU',
		    'SIGXFSZ',
		    'SIGUSR2',
		    'SIGTRAP',
		    'SIGSYS',
		    'SIGQUIT',
		    'SIGIOT'
		    // should detect profiler and enable/disable accordingly.
		    // see #21
		    // 'SIGPROF'
		  );
		}

		if (process.platform === 'linux') {
		  module.exports.push(
		    'SIGIO',
		    'SIGPOLL',
		    'SIGPWR',
		    'SIGSTKFLT',
		    'SIGUNUSED'
		  );
		}
	} (signals$1));
	return signals$1.exports;
}

// Note: since nyc uses this module to output coverage, any lines
// that are in the direct sync flow of nyc's outputCoverage are
// ignored, since we can never get coverage for them.
// grab a reference to node's real process object right away
var process$1 = commonjsGlobal.process;

const processOk = function (process) {
  return process &&
    typeof process === 'object' &&
    typeof process.removeListener === 'function' &&
    typeof process.emit === 'function' &&
    typeof process.reallyExit === 'function' &&
    typeof process.listeners === 'function' &&
    typeof process.kill === 'function' &&
    typeof process.pid === 'number' &&
    typeof process.on === 'function'
};

// some kind of non-node environment, just no-op
/* istanbul ignore if */
if (!processOk(process$1)) {
  signalExit.exports = function () {
    return function () {}
  };
} else {
  var assert = require$$0$4;
  var signals = requireSignals();
  var isWin = /^win/i.test(process$1.platform);

  var EE = require$$2;
  /* istanbul ignore if */
  if (typeof EE !== 'function') {
    EE = EE.EventEmitter;
  }

  var emitter;
  if (process$1.__signal_exit_emitter__) {
    emitter = process$1.__signal_exit_emitter__;
  } else {
    emitter = process$1.__signal_exit_emitter__ = new EE();
    emitter.count = 0;
    emitter.emitted = {};
  }

  // Because this emitter is a global, we have to check to see if a
  // previous version of this library failed to enable infinite listeners.
  // I know what you're about to say.  But literally everything about
  // signal-exit is a compromise with evil.  Get used to it.
  if (!emitter.infinite) {
    emitter.setMaxListeners(Infinity);
    emitter.infinite = true;
  }

  signalExit.exports = function (cb, opts) {
    /* istanbul ignore if */
    if (!processOk(commonjsGlobal.process)) {
      return function () {}
    }
    assert.equal(typeof cb, 'function', 'a callback must be provided for exit handler');

    if (loaded === false) {
      load();
    }

    var ev = 'exit';
    if (opts && opts.alwaysLast) {
      ev = 'afterexit';
    }

    var remove = function () {
      emitter.removeListener(ev, cb);
      if (emitter.listeners('exit').length === 0 &&
          emitter.listeners('afterexit').length === 0) {
        unload();
      }
    };
    emitter.on(ev, cb);

    return remove
  };

  var unload = function unload () {
    if (!loaded || !processOk(commonjsGlobal.process)) {
      return
    }
    loaded = false;

    signals.forEach(function (sig) {
      try {
        process$1.removeListener(sig, sigListeners[sig]);
      } catch (er) {}
    });
    process$1.emit = originalProcessEmit;
    process$1.reallyExit = originalProcessReallyExit;
    emitter.count -= 1;
  };
  signalExit.exports.unload = unload;

  var emit = function emit (event, code, signal) {
    /* istanbul ignore if */
    if (emitter.emitted[event]) {
      return
    }
    emitter.emitted[event] = true;
    emitter.emit(event, code, signal);
  };

  // { <signal>: <listener fn>, ... }
  var sigListeners = {};
  signals.forEach(function (sig) {
    sigListeners[sig] = function listener () {
      /* istanbul ignore if */
      if (!processOk(commonjsGlobal.process)) {
        return
      }
      // If there are no other listeners, an exit is coming!
      // Simplest way: remove us and then re-send the signal.
      // We know that this will kill the process, so we can
      // safely emit now.
      var listeners = process$1.listeners(sig);
      if (listeners.length === emitter.count) {
        unload();
        emit('exit', null, sig);
        /* istanbul ignore next */
        emit('afterexit', null, sig);
        /* istanbul ignore next */
        if (isWin && sig === 'SIGHUP') {
          // "SIGHUP" throws an `ENOSYS` error on Windows,
          // so use a supported signal instead
          sig = 'SIGINT';
        }
        /* istanbul ignore next */
        process$1.kill(process$1.pid, sig);
      }
    };
  });

  signalExit.exports.signals = function () {
    return signals
  };

  var loaded = false;

  var load = function load () {
    if (loaded || !processOk(commonjsGlobal.process)) {
      return
    }
    loaded = true;

    // This is the number of onSignalExit's that are in play.
    // It's important so that we can count the correct number of
    // listeners on signals, and don't wait for the other one to
    // handle it instead of us.
    emitter.count += 1;

    signals = signals.filter(function (sig) {
      try {
        process$1.on(sig, sigListeners[sig]);
        return true
      } catch (er) {
        return false
      }
    });

    process$1.emit = processEmit;
    process$1.reallyExit = processReallyExit;
  };
  signalExit.exports.load = load;

  var originalProcessReallyExit = process$1.reallyExit;
  var processReallyExit = function processReallyExit (code) {
    /* istanbul ignore if */
    if (!processOk(commonjsGlobal.process)) {
      return
    }
    process$1.exitCode = code || /* istanbul ignore next */ 0;
    emit('exit', process$1.exitCode, null);
    /* istanbul ignore next */
    emit('afterexit', process$1.exitCode, null);
    /* istanbul ignore next */
    originalProcessReallyExit.call(process$1, process$1.exitCode);
  };

  var originalProcessEmit = process$1.emit;
  var processEmit = function processEmit (ev, arg) {
    if (ev === 'exit' && processOk(commonjsGlobal.process)) {
      /* istanbul ignore else */
      if (arg !== undefined) {
        process$1.exitCode = arg;
      }
      var ret = originalProcessEmit.apply(this, arguments);
      /* istanbul ignore next */
      emit('exit', process$1.exitCode, null);
      /* istanbul ignore next */
      emit('afterexit', process$1.exitCode, null);
      /* istanbul ignore next */
      return ret
    } else {
      return originalProcessEmit.apply(this, arguments)
    }
  };
}

var signalExitExports = signalExit.exports;

const os = require$$0$3;
const onExit = signalExitExports;

const DEFAULT_FORCE_KILL_TIMEOUT = 1000 * 5;

// Monkey-patches `childProcess.kill()` to add `forceKillAfterTimeout` behavior
const spawnedKill$1 = (kill, signal = 'SIGTERM', options = {}) => {
	const killResult = kill(signal);
	setKillTimeout(kill, signal, options, killResult);
	return killResult;
};

const setKillTimeout = (kill, signal, options, killResult) => {
	if (!shouldForceKill(signal, options, killResult)) {
		return;
	}

	const timeout = getForceKillAfterTimeout(options);
	const t = setTimeout(() => {
		kill('SIGKILL');
	}, timeout);

	// Guarded because there's no `.unref()` when `execa` is used in the renderer
	// process in Electron. This cannot be tested since we don't run tests in
	// Electron.
	// istanbul ignore else
	if (t.unref) {
		t.unref();
	}
};

const shouldForceKill = (signal, {forceKillAfterTimeout}, killResult) => {
	return isSigterm(signal) && forceKillAfterTimeout !== false && killResult;
};

const isSigterm = signal => {
	return signal === os.constants.signals.SIGTERM ||
		(typeof signal === 'string' && signal.toUpperCase() === 'SIGTERM');
};

const getForceKillAfterTimeout = ({forceKillAfterTimeout = true}) => {
	if (forceKillAfterTimeout === true) {
		return DEFAULT_FORCE_KILL_TIMEOUT;
	}

	if (!Number.isFinite(forceKillAfterTimeout) || forceKillAfterTimeout < 0) {
		throw new TypeError(`Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${forceKillAfterTimeout}\` (${typeof forceKillAfterTimeout})`);
	}

	return forceKillAfterTimeout;
};

// `childProcess.cancel()`
const spawnedCancel$1 = (spawned, context) => {
	const killResult = spawned.kill();

	if (killResult) {
		context.isCanceled = true;
	}
};

const timeoutKill = (spawned, signal, reject) => {
	spawned.kill(signal);
	reject(Object.assign(new Error('Timed out'), {timedOut: true, signal}));
};

// `timeout` option handling
const setupTimeout$1 = (spawned, {timeout, killSignal = 'SIGTERM'}, spawnedPromise) => {
	if (timeout === 0 || timeout === undefined) {
		return spawnedPromise;
	}

	let timeoutId;
	const timeoutPromise = new Promise((resolve, reject) => {
		timeoutId = setTimeout(() => {
			timeoutKill(spawned, killSignal, reject);
		}, timeout);
	});

	const safeSpawnedPromise = spawnedPromise.finally(() => {
		clearTimeout(timeoutId);
	});

	return Promise.race([timeoutPromise, safeSpawnedPromise]);
};

const validateTimeout$1 = ({timeout}) => {
	if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0)) {
		throw new TypeError(`Expected the \`timeout\` option to be a non-negative integer, got \`${timeout}\` (${typeof timeout})`);
	}
};

// `cleanup` option handling
const setExitHandler$1 = async (spawned, {cleanup, detached}, timedPromise) => {
	if (!cleanup || detached) {
		return timedPromise;
	}

	const removeExitHandler = onExit(() => {
		spawned.kill();
	});

	return timedPromise.finally(() => {
		removeExitHandler();
	});
};

var kill = {
	spawnedKill: spawnedKill$1,
	spawnedCancel: spawnedCancel$1,
	setupTimeout: setupTimeout$1,
	validateTimeout: validateTimeout$1,
	setExitHandler: setExitHandler$1
};

const isStream$1 = stream =>
	stream !== null &&
	typeof stream === 'object' &&
	typeof stream.pipe === 'function';

isStream$1.writable = stream =>
	isStream$1(stream) &&
	stream.writable !== false &&
	typeof stream._write === 'function' &&
	typeof stream._writableState === 'object';

isStream$1.readable = stream =>
	isStream$1(stream) &&
	stream.readable !== false &&
	typeof stream._read === 'function' &&
	typeof stream._readableState === 'object';

isStream$1.duplex = stream =>
	isStream$1.writable(stream) &&
	isStream$1.readable(stream);

isStream$1.transform = stream =>
	isStream$1.duplex(stream) &&
	typeof stream._transform === 'function';

var isStream_1 = isStream$1;

var getStream$2 = {exports: {}};

const {PassThrough: PassThroughStream} = require$$0$5;

var bufferStream$1 = options => {
	options = {...options};

	const {array} = options;
	let {encoding} = options;
	const isBuffer = encoding === 'buffer';
	let objectMode = false;

	if (array) {
		objectMode = !(encoding || isBuffer);
	} else {
		encoding = encoding || 'utf8';
	}

	if (isBuffer) {
		encoding = null;
	}

	const stream = new PassThroughStream({objectMode});

	if (encoding) {
		stream.setEncoding(encoding);
	}

	let length = 0;
	const chunks = [];

	stream.on('data', chunk => {
		chunks.push(chunk);

		if (objectMode) {
			length = chunks.length;
		} else {
			length += chunk.length;
		}
	});

	stream.getBufferedValue = () => {
		if (array) {
			return chunks;
		}

		return isBuffer ? Buffer.concat(chunks, length) : chunks.join('');
	};

	stream.getBufferedLength = () => length;

	return stream;
};

const {constants: BufferConstants} = require$$0$6;
const stream$1 = require$$0$5;
const {promisify} = require$$2$1;
const bufferStream = bufferStream$1;

const streamPipelinePromisified = promisify(stream$1.pipeline);

class MaxBufferError extends Error {
	constructor() {
		super('maxBuffer exceeded');
		this.name = 'MaxBufferError';
	}
}

async function getStream$1(inputStream, options) {
	if (!inputStream) {
		throw new Error('Expected a stream');
	}

	options = {
		maxBuffer: Infinity,
		...options
	};

	const {maxBuffer} = options;
	const stream = bufferStream(options);

	await new Promise((resolve, reject) => {
		const rejectPromise = error => {
			// Don't retrieve an oversized buffer.
			if (error && stream.getBufferedLength() <= BufferConstants.MAX_LENGTH) {
				error.bufferedData = stream.getBufferedValue();
			}

			reject(error);
		};

		(async () => {
			try {
				await streamPipelinePromisified(inputStream, stream);
				resolve();
			} catch (error) {
				rejectPromise(error);
			}
		})();

		stream.on('data', () => {
			if (stream.getBufferedLength() > maxBuffer) {
				rejectPromise(new MaxBufferError());
			}
		});
	});

	return stream.getBufferedValue();
}

getStream$2.exports = getStream$1;
getStream$2.exports.buffer = (stream, options) => getStream$1(stream, {...options, encoding: 'buffer'});
getStream$2.exports.array = (stream, options) => getStream$1(stream, {...options, array: true});
getStream$2.exports.MaxBufferError = MaxBufferError;

var getStreamExports = getStream$2.exports;

const { PassThrough } = require$$0$5;

var mergeStream$1 = function (/*streams...*/) {
  var sources = [];
  var output  = new PassThrough({objectMode: true});

  output.setMaxListeners(0);

  output.add = add;
  output.isEmpty = isEmpty;

  output.on('unpipe', remove);

  Array.prototype.slice.call(arguments).forEach(add);

  return output

  function add (source) {
    if (Array.isArray(source)) {
      source.forEach(add);
      return this
    }

    sources.push(source);
    source.once('end', remove.bind(null, source));
    source.once('error', output.emit.bind(output, 'error'));
    source.pipe(output, {end: false});
    return this
  }

  function isEmpty () {
    return sources.length == 0;
  }

  function remove (source) {
    sources = sources.filter(function (it) { return it !== source });
    if (!sources.length && output.readable) { output.end(); }
  }
};

const isStream = isStream_1;
const getStream = getStreamExports;
const mergeStream = mergeStream$1;

// `input` option
const handleInput$1 = (spawned, input) => {
	// Checking for stdin is workaround for https://github.com/nodejs/node/issues/26852
	// @todo remove `|| spawned.stdin === undefined` once we drop support for Node.js <=12.2.0
	if (input === undefined || spawned.stdin === undefined) {
		return;
	}

	if (isStream(input)) {
		input.pipe(spawned.stdin);
	} else {
		spawned.stdin.end(input);
	}
};

// `all` interleaves `stdout` and `stderr`
const makeAllStream$1 = (spawned, {all}) => {
	if (!all || (!spawned.stdout && !spawned.stderr)) {
		return;
	}

	const mixed = mergeStream();

	if (spawned.stdout) {
		mixed.add(spawned.stdout);
	}

	if (spawned.stderr) {
		mixed.add(spawned.stderr);
	}

	return mixed;
};

// On failure, `result.stdout|stderr|all` should contain the currently buffered stream
const getBufferedData = async (stream, streamPromise) => {
	if (!stream) {
		return;
	}

	stream.destroy();

	try {
		return await streamPromise;
	} catch (error) {
		return error.bufferedData;
	}
};

const getStreamPromise = (stream, {encoding, buffer, maxBuffer}) => {
	if (!stream || !buffer) {
		return;
	}

	if (encoding) {
		return getStream(stream, {encoding, maxBuffer});
	}

	return getStream.buffer(stream, {maxBuffer});
};

// Retrieve result of child process: exit code, signal, error, streams (stdout/stderr/all)
const getSpawnedResult$1 = async ({stdout, stderr, all}, {encoding, buffer, maxBuffer}, processDone) => {
	const stdoutPromise = getStreamPromise(stdout, {encoding, buffer, maxBuffer});
	const stderrPromise = getStreamPromise(stderr, {encoding, buffer, maxBuffer});
	const allPromise = getStreamPromise(all, {encoding, buffer, maxBuffer: maxBuffer * 2});

	try {
		return await Promise.all([processDone, stdoutPromise, stderrPromise, allPromise]);
	} catch (error) {
		return Promise.all([
			{error, signal: error.signal, timedOut: error.timedOut},
			getBufferedData(stdout, stdoutPromise),
			getBufferedData(stderr, stderrPromise),
			getBufferedData(all, allPromise)
		]);
	}
};

const validateInputSync$1 = ({input}) => {
	if (isStream(input)) {
		throw new TypeError('The `input` option cannot be a stream in sync mode');
	}
};

var stream = {
	handleInput: handleInput$1,
	makeAllStream: makeAllStream$1,
	getSpawnedResult: getSpawnedResult$1,
	validateInputSync: validateInputSync$1
};

const nativePromisePrototype = (async () => {})().constructor.prototype;
const descriptors = ['then', 'catch', 'finally'].map(property => [
	property,
	Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property)
]);

// The return value is a mixin of `childProcess` and `Promise`
const mergePromise$1 = (spawned, promise) => {
	for (const [property, descriptor] of descriptors) {
		// Starting the main `promise` is deferred to avoid consuming streams
		const value = typeof promise === 'function' ?
			(...args) => Reflect.apply(descriptor.value, promise(), args) :
			descriptor.value.bind(promise);

		Reflect.defineProperty(spawned, property, {...descriptor, value});
	}

	return spawned;
};

// Use promises instead of `child_process` events
const getSpawnedPromise$1 = spawned => {
	return new Promise((resolve, reject) => {
		spawned.on('exit', (exitCode, signal) => {
			resolve({exitCode, signal});
		});

		spawned.on('error', error => {
			reject(error);
		});

		if (spawned.stdin) {
			spawned.stdin.on('error', error => {
				reject(error);
			});
		}
	});
};

var promise = {
	mergePromise: mergePromise$1,
	getSpawnedPromise: getSpawnedPromise$1
};

const normalizeArgs = (file, args = []) => {
	if (!Array.isArray(args)) {
		return [file];
	}

	return [file, ...args];
};

const NO_ESCAPE_REGEXP = /^[\w.-]+$/;
const DOUBLE_QUOTES_REGEXP = /"/g;

const escapeArg = arg => {
	if (typeof arg !== 'string' || NO_ESCAPE_REGEXP.test(arg)) {
		return arg;
	}

	return `"${arg.replace(DOUBLE_QUOTES_REGEXP, '\\"')}"`;
};

const joinCommand$1 = (file, args) => {
	return normalizeArgs(file, args).join(' ');
};

const getEscapedCommand$1 = (file, args) => {
	return normalizeArgs(file, args).map(arg => escapeArg(arg)).join(' ');
};

const SPACES_REGEXP = / +/g;

// Handle `execa.command()`
const parseCommand$1 = command => {
	const tokens = [];
	for (const token of command.trim().split(SPACES_REGEXP)) {
		// Allow spaces to be escaped by a backslash if not meant as a delimiter
		const previousToken = tokens[tokens.length - 1];
		if (previousToken && previousToken.endsWith('\\')) {
			// Merge previous token with current one
			tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
		} else {
			tokens.push(token);
		}
	}

	return tokens;
};

var command = {
	joinCommand: joinCommand$1,
	getEscapedCommand: getEscapedCommand$1,
	parseCommand: parseCommand$1
};

const path = require$$0$1;
const childProcess = require$$0$2;
const crossSpawn = crossSpawnExports;
const stripFinalNewline = stripFinalNewline$1;
const npmRunPath = npmRunPathExports;
const onetime = onetimeExports;
const makeError = error;
const normalizeStdio = stdioExports;
const {spawnedKill, spawnedCancel, setupTimeout, validateTimeout, setExitHandler} = kill;
const {handleInput, getSpawnedResult, makeAllStream, validateInputSync} = stream;
const {mergePromise, getSpawnedPromise} = promise;
const {joinCommand, parseCommand, getEscapedCommand} = command;

const DEFAULT_MAX_BUFFER = 1000 * 1000 * 100;

const getEnv = ({env: envOption, extendEnv, preferLocal, localDir, execPath}) => {
	const env = extendEnv ? {...process.env, ...envOption} : envOption;

	if (preferLocal) {
		return npmRunPath.env({env, cwd: localDir, execPath});
	}

	return env;
};

const handleArguments = (file, args, options = {}) => {
	const parsed = crossSpawn._parse(file, args, options);
	file = parsed.command;
	args = parsed.args;
	options = parsed.options;

	options = {
		maxBuffer: DEFAULT_MAX_BUFFER,
		buffer: true,
		stripFinalNewline: true,
		extendEnv: true,
		preferLocal: false,
		localDir: options.cwd || process.cwd(),
		execPath: process.execPath,
		encoding: 'utf8',
		reject: true,
		cleanup: true,
		all: false,
		windowsHide: true,
		...options
	};

	options.env = getEnv(options);

	options.stdio = normalizeStdio(options);

	if (process.platform === 'win32' && path.basename(file, '.exe') === 'cmd') {
		// #116
		args.unshift('/q');
	}

	return {file, args, options, parsed};
};

const handleOutput = (options, value, error) => {
	if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
		// When `execa.sync()` errors, we normalize it to '' to mimic `execa()`
		return error === undefined ? undefined : '';
	}

	if (options.stripFinalNewline) {
		return stripFinalNewline(value);
	}

	return value;
};

const execa = (file, args, options) => {
	const parsed = handleArguments(file, args, options);
	const command = joinCommand(file, args);
	const escapedCommand = getEscapedCommand(file, args);

	validateTimeout(parsed.options);

	let spawned;
	try {
		spawned = childProcess.spawn(parsed.file, parsed.args, parsed.options);
	} catch (error) {
		// Ensure the returned error is always both a promise and a child process
		const dummySpawned = new childProcess.ChildProcess();
		const errorPromise = Promise.reject(makeError({
			error,
			stdout: '',
			stderr: '',
			all: '',
			command,
			escapedCommand,
			parsed,
			timedOut: false,
			isCanceled: false,
			killed: false
		}));
		return mergePromise(dummySpawned, errorPromise);
	}

	const spawnedPromise = getSpawnedPromise(spawned);
	const timedPromise = setupTimeout(spawned, parsed.options, spawnedPromise);
	const processDone = setExitHandler(spawned, parsed.options, timedPromise);

	const context = {isCanceled: false};

	spawned.kill = spawnedKill.bind(null, spawned.kill.bind(spawned));
	spawned.cancel = spawnedCancel.bind(null, spawned, context);

	const handlePromise = async () => {
		const [{error, exitCode, signal, timedOut}, stdoutResult, stderrResult, allResult] = await getSpawnedResult(spawned, parsed.options, processDone);
		const stdout = handleOutput(parsed.options, stdoutResult);
		const stderr = handleOutput(parsed.options, stderrResult);
		const all = handleOutput(parsed.options, allResult);

		if (error || exitCode !== 0 || signal !== null) {
			const returnedError = makeError({
				error,
				exitCode,
				signal,
				stdout,
				stderr,
				all,
				command,
				escapedCommand,
				parsed,
				timedOut,
				isCanceled: context.isCanceled,
				killed: spawned.killed
			});

			if (!parsed.options.reject) {
				return returnedError;
			}

			throw returnedError;
		}

		return {
			command,
			escapedCommand,
			exitCode: 0,
			stdout,
			stderr,
			all,
			failed: false,
			timedOut: false,
			isCanceled: false,
			killed: false
		};
	};

	const handlePromiseOnce = onetime(handlePromise);

	handleInput(spawned, parsed.options.input);

	spawned.all = makeAllStream(spawned, parsed.options);

	return mergePromise(spawned, handlePromiseOnce);
};

execa$2.exports = execa;

execa$2.exports.sync = (file, args, options) => {
	const parsed = handleArguments(file, args, options);
	const command = joinCommand(file, args);
	const escapedCommand = getEscapedCommand(file, args);

	validateInputSync(parsed.options);

	let result;
	try {
		result = childProcess.spawnSync(parsed.file, parsed.args, parsed.options);
	} catch (error) {
		throw makeError({
			error,
			stdout: '',
			stderr: '',
			all: '',
			command,
			escapedCommand,
			parsed,
			timedOut: false,
			isCanceled: false,
			killed: false
		});
	}

	const stdout = handleOutput(parsed.options, result.stdout, result.error);
	const stderr = handleOutput(parsed.options, result.stderr, result.error);

	if (result.error || result.status !== 0 || result.signal !== null) {
		const error = makeError({
			stdout,
			stderr,
			error: result.error,
			signal: result.signal,
			exitCode: result.status,
			command,
			escapedCommand,
			parsed,
			timedOut: result.error && result.error.code === 'ETIMEDOUT',
			isCanceled: false,
			killed: result.signal !== null
		});

		if (!parsed.options.reject) {
			return error;
		}

		throw error;
	}

	return {
		command,
		escapedCommand,
		exitCode: 0,
		stdout,
		stderr,
		failed: false,
		timedOut: false,
		isCanceled: false,
		killed: false
	};
};

execa$2.exports.command = (command, options) => {
	const [file, ...args] = parseCommand(command);
	return execa(file, args, options);
};

execa$2.exports.commandSync = (command, options) => {
	const [file, ...args] = parseCommand(command);
	return execa.sync(file, args, options);
};

execa$2.exports.node = (scriptPath, args, options = {}) => {
	if (args && !Array.isArray(args) && typeof args === 'object') {
		options = args;
		args = [];
	}

	const stdio = normalizeStdio.node(options);
	const defaultExecArgv = process.execArgv.filter(arg => !arg.startsWith('--inspect'));

	const {
		nodePath = process.execPath,
		nodeOptions = defaultExecArgv
	} = options;

	return execa(
		nodePath,
		[
			...nodeOptions,
			scriptPath,
			...(Array.isArray(args) ? args : [])
		],
		{
			...options,
			stdin: undefined,
			stdout: undefined,
			stderr: undefined,
			stdio,
			shell: false
		}
	);
};

var execaExports = execa$2.exports;
var execa$1 = /*@__PURE__*/getDefaultExportFromCjs(execaExports);

function ansiRegex({onlyFirst = false} = {}) {
	// Valid string terminator sequences are BEL, ESC\, and 0x9c
	const ST = '(?:\\u0007|\\u001B\\u005C|\\u009C)';
	const pattern = [
		`[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
		'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
	].join('|');

	return new RegExp(pattern, onlyFirst ? undefined : 'g');
}

const regex = ansiRegex();

function stripAnsi(string) {
	if (typeof string !== 'string') {
		throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
	}

	// Even though the regex is global, we don't need to reset the `.lastIndex`
	// because unlike `.exec()` and `.test()`, `.replace()` does it automatically
	// and doing it manually has a performance penalty.
	return string.replace(regex, '');
}

const detectDefaultShell = () => {
	const {env} = process$2;

	if (process$2.platform === 'win32') {
		return env.COMSPEC || 'cmd.exe';
	}

	try {
		const {shell} = node_os.userInfo();
		if (shell) {
			return shell;
		}
	} catch {}

	if (process$2.platform === 'darwin') {
		return env.SHELL || '/bin/zsh';
	}

	return env.SHELL || '/bin/sh';
};

// Stores default shell when imported.
const defaultShell = detectDefaultShell();

const args = [
	'-ilc',
	'echo -n "_SHELL_ENV_DELIMITER_"; env; echo -n "_SHELL_ENV_DELIMITER_"; exit',
];

const env = {
	// Disables Oh My Zsh auto-update thing that can block the process.
	DISABLE_AUTO_UPDATE: 'true',
};

const parseEnv = env => {
	env = env.split('_SHELL_ENV_DELIMITER_')[1];
	const returnValue = {};

	for (const line of stripAnsi(env).split('\n').filter(line => Boolean(line))) {
		const [key, ...values] = line.split('=');
		returnValue[key] = values.join('=');
	}

	return returnValue;
};

function shellEnvSync(shell) {
	if (process$2.platform === 'win32') {
		return process$2.env;
	}

	try {
		const {stdout} = execa$1.sync(shell || defaultShell, args, {env});
		return parseEnv(stdout);
	} catch (error) {
		if (shell) {
			throw error;
		} else {
			return process$2.env;
		}
	}
}

function shellPathSync() {
	const {PATH} = shellEnvSync();
	return PATH;
}

function fixPath() {
	if (process$2.platform === 'win32') {
		return;
	}

	process$2.env.PATH = shellPathSync() || [
		'./node_modules/.bin',
		'/.nodebrew/current/bin',
		'/usr/local/bin',
		process$2.env.PATH,
	].join(':');
}

const IMAGE_EXT_LIST = [
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".gif",
    ".svg",
    ".tiff",
    ".webp",
    ".avif",
];
function isAnImage(ext) {
    return IMAGE_EXT_LIST.includes(ext.toLowerCase());
}
function isAssetTypeAnImage(path) {
    return isAnImage(pathBrowserify.extname(path));
}
function getOS() {
    const { appVersion } = navigator;
    if (appVersion.indexOf("Win") !== -1) {
        return "Windows";
    }
    else if (appVersion.indexOf("Mac") !== -1) {
        return "MacOS";
    }
    else if (appVersion.indexOf("X11") !== -1) {
        return "Linux";
    }
    else {
        return "Unknown OS";
    }
}
async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    // @ts-ignore
    return Buffer.concat(chunks).toString("utf-8");
}
function getUrlAsset(url) {
    return (url = url.substr(1 + url.lastIndexOf("/")).split("?")[0]).split("#")[0];
}
function getLastImage(list) {
    const reversedList = list.reverse();
    let lastImage;
    reversedList.forEach(item => {
        if (item && item.startsWith("http")) {
            lastImage = item;
            return item;
        }
    });
    return lastImage;
}
function arrayToObject(arr, key) {
    const obj = {};
    arr.forEach(element => {
        obj[element[key]] = element;
    });
    return obj;
}
function bufferToArrayBuffer(buffer) {
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; i++) {
        view[i] = buffer[i];
    }
    return arrayBuffer;
}
function uuid() {
    return Math.random().toString(36).slice(2);
}

// Primitive types
function dv(array) {
    return new DataView(array.buffer, array.byteOffset);
}
/**
 * 8-bit unsigned integer
 */
const UINT8 = {
    len: 1,
    get(array, offset) {
        return dv(array).getUint8(offset);
    },
    put(array, offset, value) {
        dv(array).setUint8(offset, value);
        return offset + 1;
    }
};
/**
 * 16-bit unsigned integer, Little Endian byte order
 */
const UINT16_LE = {
    len: 2,
    get(array, offset) {
        return dv(array).getUint16(offset, true);
    },
    put(array, offset, value) {
        dv(array).setUint16(offset, value, true);
        return offset + 2;
    }
};
/**
 * 16-bit unsigned integer, Big Endian byte order
 */
const UINT16_BE = {
    len: 2,
    get(array, offset) {
        return dv(array).getUint16(offset);
    },
    put(array, offset, value) {
        dv(array).setUint16(offset, value);
        return offset + 2;
    }
};
/**
 * 32-bit unsigned integer, Little Endian byte order
 */
const UINT32_LE = {
    len: 4,
    get(array, offset) {
        return dv(array).getUint32(offset, true);
    },
    put(array, offset, value) {
        dv(array).setUint32(offset, value, true);
        return offset + 4;
    }
};
/**
 * 32-bit unsigned integer, Big Endian byte order
 */
const UINT32_BE = {
    len: 4,
    get(array, offset) {
        return dv(array).getUint32(offset);
    },
    put(array, offset, value) {
        dv(array).setUint32(offset, value);
        return offset + 4;
    }
};
/**
 * 32-bit signed integer, Big Endian byte order
 */
const INT32_BE = {
    len: 4,
    get(array, offset) {
        return dv(array).getInt32(offset);
    },
    put(array, offset, value) {
        dv(array).setInt32(offset, value);
        return offset + 4;
    }
};
/**
 * 64-bit unsigned integer, Little Endian byte order
 */
const UINT64_LE = {
    len: 8,
    get(array, offset) {
        return dv(array).getBigUint64(offset, true);
    },
    put(array, offset, value) {
        dv(array).setBigUint64(offset, value, true);
        return offset + 8;
    }
};
/**
 * Consume a fixed number of bytes from the stream and return a string with a specified encoding.
 */
class StringType {
    constructor(len, encoding) {
        this.len = len;
        this.encoding = encoding;
    }
    get(uint8Array, offset) {
        return node_buffer.Buffer.from(uint8Array).toString(this.encoding, offset, offset + this.len);
    }
}

const defaultMessages = 'End-Of-Stream';
/**
 * Thrown on read operation of the end of file or stream has been reached
 */
class EndOfStreamError extends Error {
    constructor() {
        super(defaultMessages);
    }
}

class Deferred {
    constructor() {
        this.resolve = () => null;
        this.reject = () => null;
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

class AbstractStreamReader {
    constructor() {
        /**
         * Maximum request length on read-stream operation
         */
        this.maxStreamReadSize = 1 * 1024 * 1024;
        this.endOfStream = false;
        /**
         * Store peeked data
         * @type {Array}
         */
        this.peekQueue = [];
    }
    async peek(uint8Array, offset, length) {
        const bytesRead = await this.read(uint8Array, offset, length);
        this.peekQueue.push(uint8Array.subarray(offset, offset + bytesRead)); // Put read data back to peek buffer
        return bytesRead;
    }
    async read(buffer, offset, length) {
        if (length === 0) {
            return 0;
        }
        let bytesRead = this.readFromPeekBuffer(buffer, offset, length);
        bytesRead += await this.readRemainderFromStream(buffer, offset + bytesRead, length - bytesRead);
        if (bytesRead === 0) {
            throw new EndOfStreamError();
        }
        return bytesRead;
    }
    /**
     * Read chunk from stream
     * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
     * @param offset - Offset target
     * @param length - Number of bytes to read
     * @returns Number of bytes read
     */
    readFromPeekBuffer(buffer, offset, length) {
        let remaining = length;
        let bytesRead = 0;
        // consume peeked data first
        while (this.peekQueue.length > 0 && remaining > 0) {
            const peekData = this.peekQueue.pop(); // Front of queue
            if (!peekData)
                throw new Error('peekData should be defined');
            const lenCopy = Math.min(peekData.length, remaining);
            buffer.set(peekData.subarray(0, lenCopy), offset + bytesRead);
            bytesRead += lenCopy;
            remaining -= lenCopy;
            if (lenCopy < peekData.length) {
                // remainder back to queue
                this.peekQueue.push(peekData.subarray(lenCopy));
            }
        }
        return bytesRead;
    }
    async readRemainderFromStream(buffer, offset, initialRemaining) {
        let remaining = initialRemaining;
        let bytesRead = 0;
        // Continue reading from stream if required
        while (remaining > 0 && !this.endOfStream) {
            const reqLen = Math.min(remaining, this.maxStreamReadSize);
            const chunkLen = await this.readFromStream(buffer, offset + bytesRead, reqLen);
            if (chunkLen === 0)
                break;
            bytesRead += chunkLen;
            remaining -= chunkLen;
        }
        return bytesRead;
    }
}

/**
 * Node.js Readable Stream Reader
 * Ref: https://nodejs.org/api/stream.html#readable-streams
 */
class StreamReader extends AbstractStreamReader {
    constructor(s) {
        super();
        this.s = s;
        /**
         * Deferred used for postponed read request (as not data is yet available to read)
         */
        this.deferred = null;
        if (!s.read || !s.once) {
            throw new Error('Expected an instance of stream.Readable');
        }
        this.s.once('end', () => this.reject(new EndOfStreamError()));
        this.s.once('error', err => this.reject(err));
        this.s.once('close', () => this.reject(new Error('Stream closed')));
    }
    /**
     * Read chunk from stream
     * @param buffer Target Uint8Array (or Buffer) to store data read from stream in
     * @param offset Offset target
     * @param length Number of bytes to read
     * @returns Number of bytes read
     */
    async readFromStream(buffer, offset, length) {
        if (this.endOfStream) {
            return 0;
        }
        const readBuffer = this.s.read(length);
        if (readBuffer) {
            buffer.set(readBuffer, offset);
            return readBuffer.length;
        }
        const request = {
            buffer,
            offset,
            length,
            deferred: new Deferred()
        };
        this.deferred = request.deferred;
        this.s.once('readable', () => {
            this.readDeferred(request);
        });
        return request.deferred.promise;
    }
    /**
     * Process deferred read request
     * @param request Deferred read request
     */
    readDeferred(request) {
        const readBuffer = this.s.read(request.length);
        if (readBuffer) {
            request.buffer.set(readBuffer, request.offset);
            request.deferred.resolve(readBuffer.length);
            this.deferred = null;
        }
        else {
            this.s.once('readable', () => {
                this.readDeferred(request);
            });
        }
    }
    reject(err) {
        this.endOfStream = true;
        if (this.deferred) {
            this.deferred.reject(err);
            this.deferred = null;
        }
    }
    async abort() {
        this.s.destroy();
    }
}

/**
 * Core tokenizer
 */
class AbstractTokenizer {
    constructor(fileInfo) {
        /**
         * Tokenizer-stream position
         */
        this.position = 0;
        this.numBuffer = new Uint8Array(8);
        this.fileInfo = fileInfo ? fileInfo : {};
    }
    /**
     * Read a token from the tokenizer-stream
     * @param token - The token to read
     * @param position - If provided, the desired position in the tokenizer-stream
     * @returns Promise with token data
     */
    async readToken(token, position = this.position) {
        const uint8Array = new Uint8Array(token.len);
        const len = await this.readBuffer(uint8Array, { position });
        if (len < token.len)
            throw new EndOfStreamError();
        return token.get(uint8Array, 0);
    }
    /**
     * Peek a token from the tokenizer-stream.
     * @param token - Token to peek from the tokenizer-stream.
     * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
     * @returns Promise with token data
     */
    async peekToken(token, position = this.position) {
        const uint8Array = new Uint8Array(token.len);
        const len = await this.peekBuffer(uint8Array, { position });
        if (len < token.len)
            throw new EndOfStreamError();
        return token.get(uint8Array, 0);
    }
    /**
     * Read a numeric token from the stream
     * @param token - Numeric token
     * @returns Promise with number
     */
    async readNumber(token) {
        const len = await this.readBuffer(this.numBuffer, { length: token.len });
        if (len < token.len)
            throw new EndOfStreamError();
        return token.get(this.numBuffer, 0);
    }
    /**
     * Read a numeric token from the stream
     * @param token - Numeric token
     * @returns Promise with number
     */
    async peekNumber(token) {
        const len = await this.peekBuffer(this.numBuffer, { length: token.len });
        if (len < token.len)
            throw new EndOfStreamError();
        return token.get(this.numBuffer, 0);
    }
    /**
     * Ignore number of bytes, advances the pointer in under tokenizer-stream.
     * @param length - Number of bytes to ignore
     * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
     */
    async ignore(length) {
        if (this.fileInfo.size !== undefined) {
            const bytesLeft = this.fileInfo.size - this.position;
            if (length > bytesLeft) {
                this.position += bytesLeft;
                return bytesLeft;
            }
        }
        this.position += length;
        return length;
    }
    async close() {
        // empty
    }
    normalizeOptions(uint8Array, options) {
        if (options && options.position !== undefined && options.position < this.position) {
            throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
        }
        if (options) {
            return {
                mayBeLess: options.mayBeLess === true,
                offset: options.offset ? options.offset : 0,
                length: options.length ? options.length : (uint8Array.length - (options.offset ? options.offset : 0)),
                position: options.position ? options.position : this.position
            };
        }
        return {
            mayBeLess: false,
            offset: 0,
            length: uint8Array.length,
            position: this.position
        };
    }
}

const maxBufferSize = 256000;
class ReadStreamTokenizer extends AbstractTokenizer {
    constructor(streamReader, fileInfo) {
        super(fileInfo);
        this.streamReader = streamReader;
    }
    /**
     * Get file information, an HTTP-client may implement this doing a HEAD request
     * @return Promise with file information
     */
    async getFileInfo() {
        return this.fileInfo;
    }
    /**
     * Read buffer from tokenizer
     * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
     * @param options - Read behaviour options
     * @returns Promise with number of bytes read
     */
    async readBuffer(uint8Array, options) {
        const normOptions = this.normalizeOptions(uint8Array, options);
        const skipBytes = normOptions.position - this.position;
        if (skipBytes > 0) {
            await this.ignore(skipBytes);
            return this.readBuffer(uint8Array, options);
        }
        else if (skipBytes < 0) {
            throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
        }
        if (normOptions.length === 0) {
            return 0;
        }
        const bytesRead = await this.streamReader.read(uint8Array, normOptions.offset, normOptions.length);
        this.position += bytesRead;
        if ((!options || !options.mayBeLess) && bytesRead < normOptions.length) {
            throw new EndOfStreamError();
        }
        return bytesRead;
    }
    /**
     * Peek (read ahead) buffer from tokenizer
     * @param uint8Array - Uint8Array (or Buffer) to write data to
     * @param options - Read behaviour options
     * @returns Promise with number of bytes peeked
     */
    async peekBuffer(uint8Array, options) {
        const normOptions = this.normalizeOptions(uint8Array, options);
        let bytesRead = 0;
        if (normOptions.position) {
            const skipBytes = normOptions.position - this.position;
            if (skipBytes > 0) {
                const skipBuffer = new Uint8Array(normOptions.length + skipBytes);
                bytesRead = await this.peekBuffer(skipBuffer, { mayBeLess: normOptions.mayBeLess });
                uint8Array.set(skipBuffer.subarray(skipBytes), normOptions.offset);
                return bytesRead - skipBytes;
            }
            else if (skipBytes < 0) {
                throw new Error('Cannot peek from a negative offset in a stream');
            }
        }
        if (normOptions.length > 0) {
            try {
                bytesRead = await this.streamReader.peek(uint8Array, normOptions.offset, normOptions.length);
            }
            catch (err) {
                if (options && options.mayBeLess && err instanceof EndOfStreamError) {
                    return 0;
                }
                throw err;
            }
            if ((!normOptions.mayBeLess) && bytesRead < normOptions.length) {
                throw new EndOfStreamError();
            }
        }
        return bytesRead;
    }
    async ignore(length) {
        // debug(`ignore ${this.position}...${this.position + length - 1}`);
        const bufSize = Math.min(maxBufferSize, length);
        const buf = new Uint8Array(bufSize);
        let totBytesRead = 0;
        while (totBytesRead < length) {
            const remaining = length - totBytesRead;
            const bytesRead = await this.readBuffer(buf, { length: Math.min(bufSize, remaining) });
            if (bytesRead < 0) {
                return bytesRead;
            }
            totBytesRead += bytesRead;
        }
        return totBytesRead;
    }
}

class BufferTokenizer extends AbstractTokenizer {
    /**
     * Construct BufferTokenizer
     * @param uint8Array - Uint8Array to tokenize
     * @param fileInfo - Pass additional file information to the tokenizer
     */
    constructor(uint8Array, fileInfo) {
        super(fileInfo);
        this.uint8Array = uint8Array;
        this.fileInfo.size = this.fileInfo.size ? this.fileInfo.size : uint8Array.length;
    }
    /**
     * Read buffer from tokenizer
     * @param uint8Array - Uint8Array to tokenize
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    async readBuffer(uint8Array, options) {
        if (options && options.position) {
            if (options.position < this.position) {
                throw new Error('`options.position` must be equal or greater than `tokenizer.position`');
            }
            this.position = options.position;
        }
        const bytesRead = await this.peekBuffer(uint8Array, options);
        this.position += bytesRead;
        return bytesRead;
    }
    /**
     * Peek (read ahead) buffer from tokenizer
     * @param uint8Array
     * @param options - Read behaviour options
     * @returns {Promise<number>}
     */
    async peekBuffer(uint8Array, options) {
        const normOptions = this.normalizeOptions(uint8Array, options);
        const bytes2read = Math.min(this.uint8Array.length - normOptions.position, normOptions.length);
        if ((!normOptions.mayBeLess) && bytes2read < normOptions.length) {
            throw new EndOfStreamError();
        }
        else {
            uint8Array.set(this.uint8Array.subarray(normOptions.position, normOptions.position + bytes2read), normOptions.offset);
            return bytes2read;
        }
    }
    async close() {
        // empty
    }
}

/**
 * Construct ReadStreamTokenizer from given Stream.
 * Will set fileSize, if provided given Stream has set the .path property/
 * @param stream - Read from Node.js Stream.Readable
 * @param fileInfo - Pass the file information, like size and MIME-type of the corresponding stream.
 * @returns ReadStreamTokenizer
 */
function fromStream(stream, fileInfo) {
    fileInfo = fileInfo ? fileInfo : {};
    return new ReadStreamTokenizer(new StreamReader(stream), fileInfo);
}
/**
 * Construct ReadStreamTokenizer from given Buffer.
 * @param uint8Array - Uint8Array to tokenize
 * @param fileInfo - Pass additional file information to the tokenizer
 * @returns BufferTokenizer
 */
function fromBuffer(uint8Array, fileInfo) {
    return new BufferTokenizer(uint8Array, fileInfo);
}

function stringToBytes(string) {
	return [...string].map(character => character.charCodeAt(0)); // eslint-disable-line unicorn/prefer-code-point
}

/**
Checks whether the TAR checksum is valid.

@param {Buffer} buffer - The TAR header `[offset ... offset + 512]`.
@param {number} offset - TAR header offset.
@returns {boolean} `true` if the TAR checksum is valid, otherwise `false`.
*/
function tarHeaderChecksumMatches(buffer, offset = 0) {
	const readSum = Number.parseInt(buffer.toString('utf8', 148, 154).replace(/\0.*$/, '').trim(), 8); // Read sum in header
	if (Number.isNaN(readSum)) {
		return false;
	}

	let sum = 8 * 0x20; // Initialize signed bit sum

	for (let index = offset; index < offset + 148; index++) {
		sum += buffer[index];
	}

	for (let index = offset + 156; index < offset + 512; index++) {
		sum += buffer[index];
	}

	return readSum === sum;
}

/**
ID3 UINT32 sync-safe tokenizer token.
28 bits (representing up to 256MB) integer, the msb is 0 to avoid "false syncsignals".
*/
const uint32SyncSafeToken = {
	get: (buffer, offset) => (buffer[offset + 3] & 0x7F) | ((buffer[offset + 2]) << 7) | ((buffer[offset + 1]) << 14) | ((buffer[offset]) << 21),
	len: 4,
};

const extensions = [
	'jpg',
	'png',
	'apng',
	'gif',
	'webp',
	'flif',
	'xcf',
	'cr2',
	'cr3',
	'orf',
	'arw',
	'dng',
	'nef',
	'rw2',
	'raf',
	'tif',
	'bmp',
	'icns',
	'jxr',
	'psd',
	'indd',
	'zip',
	'tar',
	'rar',
	'gz',
	'bz2',
	'7z',
	'dmg',
	'mp4',
	'mid',
	'mkv',
	'webm',
	'mov',
	'avi',
	'mpg',
	'mp2',
	'mp3',
	'm4a',
	'oga',
	'ogg',
	'ogv',
	'opus',
	'flac',
	'wav',
	'spx',
	'amr',
	'pdf',
	'epub',
	'elf',
	'macho',
	'exe',
	'swf',
	'rtf',
	'wasm',
	'woff',
	'woff2',
	'eot',
	'ttf',
	'otf',
	'ico',
	'flv',
	'ps',
	'xz',
	'sqlite',
	'nes',
	'crx',
	'xpi',
	'cab',
	'deb',
	'ar',
	'rpm',
	'Z',
	'lz',
	'cfb',
	'mxf',
	'mts',
	'blend',
	'bpg',
	'docx',
	'pptx',
	'xlsx',
	'3gp',
	'3g2',
	'j2c',
	'jp2',
	'jpm',
	'jpx',
	'mj2',
	'aif',
	'qcp',
	'odt',
	'ods',
	'odp',
	'xml',
	'mobi',
	'heic',
	'cur',
	'ktx',
	'ape',
	'wv',
	'dcm',
	'ics',
	'glb',
	'pcap',
	'dsf',
	'lnk',
	'alias',
	'voc',
	'ac3',
	'm4v',
	'm4p',
	'm4b',
	'f4v',
	'f4p',
	'f4b',
	'f4a',
	'mie',
	'asf',
	'ogm',
	'ogx',
	'mpc',
	'arrow',
	'shp',
	'aac',
	'mp1',
	'it',
	's3m',
	'xm',
	'ai',
	'skp',
	'avif',
	'eps',
	'lzh',
	'pgp',
	'asar',
	'stl',
	'chm',
	'3mf',
	'zst',
	'jxl',
	'vcf',
	'jls',
	'pst',
	'dwg',
	'parquet',
	'class',
	'arj',
	'cpio',
	'ace',
	'avro',
	'icc',
	'fbx',
];

const mimeTypes = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/flif',
	'image/x-xcf',
	'image/x-canon-cr2',
	'image/x-canon-cr3',
	'image/tiff',
	'image/bmp',
	'image/vnd.ms-photo',
	'image/vnd.adobe.photoshop',
	'application/x-indesign',
	'application/epub+zip',
	'application/x-xpinstall',
	'application/vnd.oasis.opendocument.text',
	'application/vnd.oasis.opendocument.spreadsheet',
	'application/vnd.oasis.opendocument.presentation',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/zip',
	'application/x-tar',
	'application/x-rar-compressed',
	'application/gzip',
	'application/x-bzip2',
	'application/x-7z-compressed',
	'application/x-apple-diskimage',
	'application/x-apache-arrow',
	'video/mp4',
	'audio/midi',
	'video/x-matroska',
	'video/webm',
	'video/quicktime',
	'video/vnd.avi',
	'audio/vnd.wave',
	'audio/qcelp',
	'audio/x-ms-asf',
	'video/x-ms-asf',
	'application/vnd.ms-asf',
	'video/mpeg',
	'video/3gpp',
	'audio/mpeg',
	'audio/mp4', // RFC 4337
	'audio/opus',
	'video/ogg',
	'audio/ogg',
	'application/ogg',
	'audio/x-flac',
	'audio/ape',
	'audio/wavpack',
	'audio/amr',
	'application/pdf',
	'application/x-elf',
	'application/x-mach-binary',
	'application/x-msdownload',
	'application/x-shockwave-flash',
	'application/rtf',
	'application/wasm',
	'font/woff',
	'font/woff2',
	'application/vnd.ms-fontobject',
	'font/ttf',
	'font/otf',
	'image/x-icon',
	'video/x-flv',
	'application/postscript',
	'application/eps',
	'application/x-xz',
	'application/x-sqlite3',
	'application/x-nintendo-nes-rom',
	'application/x-google-chrome-extension',
	'application/vnd.ms-cab-compressed',
	'application/x-deb',
	'application/x-unix-archive',
	'application/x-rpm',
	'application/x-compress',
	'application/x-lzip',
	'application/x-cfb',
	'application/x-mie',
	'application/mxf',
	'video/mp2t',
	'application/x-blender',
	'image/bpg',
	'image/j2c',
	'image/jp2',
	'image/jpx',
	'image/jpm',
	'image/mj2',
	'audio/aiff',
	'application/xml',
	'application/x-mobipocket-ebook',
	'image/heif',
	'image/heif-sequence',
	'image/heic',
	'image/heic-sequence',
	'image/icns',
	'image/ktx',
	'application/dicom',
	'audio/x-musepack',
	'text/calendar',
	'text/vcard',
	'model/gltf-binary',
	'application/vnd.tcpdump.pcap',
	'audio/x-dsf', // Non-standard
	'application/x.ms.shortcut', // Invented by us
	'application/x.apple.alias', // Invented by us
	'audio/x-voc',
	'audio/vnd.dolby.dd-raw',
	'audio/x-m4a',
	'image/apng',
	'image/x-olympus-orf',
	'image/x-sony-arw',
	'image/x-adobe-dng',
	'image/x-nikon-nef',
	'image/x-panasonic-rw2',
	'image/x-fujifilm-raf',
	'video/x-m4v',
	'video/3gpp2',
	'application/x-esri-shape',
	'audio/aac',
	'audio/x-it',
	'audio/x-s3m',
	'audio/x-xm',
	'video/MP1S',
	'video/MP2P',
	'application/vnd.sketchup.skp',
	'image/avif',
	'application/x-lzh-compressed',
	'application/pgp-encrypted',
	'application/x-asar',
	'model/stl',
	'application/vnd.ms-htmlhelp',
	'model/3mf',
	'image/jxl',
	'application/zstd',
	'image/jls',
	'application/vnd.ms-outlook',
	'image/vnd.dwg',
	'application/x-parquet',
	'application/java-vm',
	'application/x-arj',
	'application/x-cpio',
	'application/x-ace-compressed',
	'application/avro',
	'application/vnd.iccprofile',
	'application/x.autodesk.fbx', // Invented by us
];

const minimumBytes = 4100; // A fair amount of file-types are detectable within this range.

async function fileTypeFromBuffer(input) {
	return new FileTypeParser().fromBuffer(input);
}

function _check(buffer, headers, options) {
	options = {
		offset: 0,
		...options,
	};

	for (const [index, header] of headers.entries()) {
		// If a bitmask is set
		if (options.mask) {
			// If header doesn't equal `buf` with bits masked off
			if (header !== (options.mask[index] & buffer[index + options.offset])) {
				return false;
			}
		} else if (header !== buffer[index + options.offset]) {
			return false;
		}
	}

	return true;
}

class FileTypeParser {
	constructor(options) {
		this.detectors = options?.customDetectors;

		this.fromTokenizer = this.fromTokenizer.bind(this);
		this.fromBuffer = this.fromBuffer.bind(this);
		this.parse = this.parse.bind(this);
	}

	async fromTokenizer(tokenizer) {
		const initialPosition = tokenizer.position;

		for (const detector of this.detectors || []) {
			const fileType = await detector(tokenizer);
			if (fileType) {
				return fileType;
			}

			if (initialPosition !== tokenizer.position) {
				return undefined; // Cannot proceed scanning of the tokenizer is at an arbitrary position
			}
		}

		return this.parse(tokenizer);
	}

	async fromBuffer(input) {
		if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
			throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`Buffer\` or \`ArrayBuffer\`, got \`${typeof input}\``);
		}

		const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);

		if (!(buffer?.length > 1)) {
			return;
		}

		return this.fromTokenizer(fromBuffer(buffer));
	}

	async fromBlob(blob) {
		const buffer = await blob.arrayBuffer();
		return this.fromBuffer(new Uint8Array(buffer));
	}

	async fromStream(stream) {
		const tokenizer = await fromStream(stream);
		try {
			return await this.fromTokenizer(tokenizer);
		} finally {
			await tokenizer.close();
		}
	}

	async toDetectionStream(readableStream, options = {}) {
		const {default: stream} = await import('node:stream');
		const {sampleSize = minimumBytes} = options;

		return new Promise((resolve, reject) => {
			readableStream.on('error', reject);

			readableStream.once('readable', () => {
				(async () => {
					try {
						// Set up output stream
						const pass = new stream.PassThrough();
						const outputStream = stream.pipeline ? stream.pipeline(readableStream, pass, () => {}) : readableStream.pipe(pass);

						// Read the input stream and detect the filetype
						const chunk = readableStream.read(sampleSize) ?? readableStream.read() ?? node_buffer.Buffer.alloc(0);
						try {
							pass.fileType = await this.fromBuffer(chunk);
						} catch (error) {
							if (error instanceof EndOfStreamError) {
								pass.fileType = undefined;
							} else {
								reject(error);
							}
						}

						resolve(outputStream);
					} catch (error) {
						reject(error);
					}
				})();
			});
		});
	}

	check(header, options) {
		return _check(this.buffer, header, options);
	}

	checkString(header, options) {
		return this.check(stringToBytes(header), options);
	}

	async parse(tokenizer) {
		this.buffer = node_buffer.Buffer.alloc(minimumBytes);

		// Keep reading until EOF if the file size is unknown.
		if (tokenizer.fileInfo.size === undefined) {
			tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER;
		}

		this.tokenizer = tokenizer;

		await tokenizer.peekBuffer(this.buffer, {length: 12, mayBeLess: true});

		// -- 2-byte signatures --

		if (this.check([0x42, 0x4D])) {
			return {
				ext: 'bmp',
				mime: 'image/bmp',
			};
		}

		if (this.check([0x0B, 0x77])) {
			return {
				ext: 'ac3',
				mime: 'audio/vnd.dolby.dd-raw',
			};
		}

		if (this.check([0x78, 0x01])) {
			return {
				ext: 'dmg',
				mime: 'application/x-apple-diskimage',
			};
		}

		if (this.check([0x4D, 0x5A])) {
			return {
				ext: 'exe',
				mime: 'application/x-msdownload',
			};
		}

		if (this.check([0x25, 0x21])) {
			await tokenizer.peekBuffer(this.buffer, {length: 24, mayBeLess: true});

			if (
				this.checkString('PS-Adobe-', {offset: 2})
				&& this.checkString(' EPSF-', {offset: 14})
			) {
				return {
					ext: 'eps',
					mime: 'application/eps',
				};
			}

			return {
				ext: 'ps',
				mime: 'application/postscript',
			};
		}

		if (
			this.check([0x1F, 0xA0])
			|| this.check([0x1F, 0x9D])
		) {
			return {
				ext: 'Z',
				mime: 'application/x-compress',
			};
		}

		if (this.check([0xC7, 0x71])) {
			return {
				ext: 'cpio',
				mime: 'application/x-cpio',
			};
		}

		if (this.check([0x60, 0xEA])) {
			return {
				ext: 'arj',
				mime: 'application/x-arj',
			};
		}

		// -- 3-byte signatures --

		if (this.check([0xEF, 0xBB, 0xBF])) { // UTF-8-BOM
			// Strip off UTF-8-BOM
			this.tokenizer.ignore(3);
			return this.parse(tokenizer);
		}

		if (this.check([0x47, 0x49, 0x46])) {
			return {
				ext: 'gif',
				mime: 'image/gif',
			};
		}

		if (this.check([0x49, 0x49, 0xBC])) {
			return {
				ext: 'jxr',
				mime: 'image/vnd.ms-photo',
			};
		}

		if (this.check([0x1F, 0x8B, 0x8])) {
			return {
				ext: 'gz',
				mime: 'application/gzip',
			};
		}

		if (this.check([0x42, 0x5A, 0x68])) {
			return {
				ext: 'bz2',
				mime: 'application/x-bzip2',
			};
		}

		if (this.checkString('ID3')) {
			await tokenizer.ignore(6); // Skip ID3 header until the header size
			const id3HeaderLength = await tokenizer.readToken(uint32SyncSafeToken);
			if (tokenizer.position + id3HeaderLength > tokenizer.fileInfo.size) {
				// Guess file type based on ID3 header for backward compatibility
				return {
					ext: 'mp3',
					mime: 'audio/mpeg',
				};
			}

			await tokenizer.ignore(id3HeaderLength);
			return this.fromTokenizer(tokenizer); // Skip ID3 header, recursion
		}

		// Musepack, SV7
		if (this.checkString('MP+')) {
			return {
				ext: 'mpc',
				mime: 'audio/x-musepack',
			};
		}

		if (
			(this.buffer[0] === 0x43 || this.buffer[0] === 0x46)
			&& this.check([0x57, 0x53], {offset: 1})
		) {
			return {
				ext: 'swf',
				mime: 'application/x-shockwave-flash',
			};
		}

		// -- 4-byte signatures --

		// Requires a sample size of 4 bytes
		if (this.check([0xFF, 0xD8, 0xFF])) {
			if (this.check([0xF7], {offset: 3})) { // JPG7/SOF55, indicating a ISO/IEC 14495 / JPEG-LS file
				return {
					ext: 'jls',
					mime: 'image/jls',
				};
			}

			return {
				ext: 'jpg',
				mime: 'image/jpeg',
			};
		}

		if (this.check([0x4F, 0x62, 0x6A, 0x01])) {
			return {
				ext: 'avro',
				mime: 'application/avro',
			};
		}

		if (this.checkString('FLIF')) {
			return {
				ext: 'flif',
				mime: 'image/flif',
			};
		}

		if (this.checkString('8BPS')) {
			return {
				ext: 'psd',
				mime: 'image/vnd.adobe.photoshop',
			};
		}

		if (this.checkString('WEBP', {offset: 8})) {
			return {
				ext: 'webp',
				mime: 'image/webp',
			};
		}

		// Musepack, SV8
		if (this.checkString('MPCK')) {
			return {
				ext: 'mpc',
				mime: 'audio/x-musepack',
			};
		}

		if (this.checkString('FORM')) {
			return {
				ext: 'aif',
				mime: 'audio/aiff',
			};
		}

		if (this.checkString('icns', {offset: 0})) {
			return {
				ext: 'icns',
				mime: 'image/icns',
			};
		}

		// Zip-based file formats
		// Need to be before the `zip` check
		if (this.check([0x50, 0x4B, 0x3, 0x4])) { // Local file header signature
			try {
				while (tokenizer.position + 30 < tokenizer.fileInfo.size) {
					await tokenizer.readBuffer(this.buffer, {length: 30});

					// https://en.wikipedia.org/wiki/Zip_(file_format)#File_headers
					const zipHeader = {
						compressedSize: this.buffer.readUInt32LE(18),
						uncompressedSize: this.buffer.readUInt32LE(22),
						filenameLength: this.buffer.readUInt16LE(26),
						extraFieldLength: this.buffer.readUInt16LE(28),
					};

					zipHeader.filename = await tokenizer.readToken(new StringType(zipHeader.filenameLength, 'utf-8'));
					await tokenizer.ignore(zipHeader.extraFieldLength);

					// Assumes signed `.xpi` from addons.mozilla.org
					if (zipHeader.filename === 'META-INF/mozilla.rsa') {
						return {
							ext: 'xpi',
							mime: 'application/x-xpinstall',
						};
					}

					if (zipHeader.filename.endsWith('.rels') || zipHeader.filename.endsWith('.xml')) {
						const type = zipHeader.filename.split('/')[0];
						switch (type) {
							case '_rels':
								break;
							case 'word':
								return {
									ext: 'docx',
									mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
								};
							case 'ppt':
								return {
									ext: 'pptx',
									mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
								};
							case 'xl':
								return {
									ext: 'xlsx',
									mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
								};
							default:
								break;
						}
					}

					if (zipHeader.filename.startsWith('xl/')) {
						return {
							ext: 'xlsx',
							mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						};
					}

					if (zipHeader.filename.startsWith('3D/') && zipHeader.filename.endsWith('.model')) {
						return {
							ext: '3mf',
							mime: 'model/3mf',
						};
					}

					// The docx, xlsx and pptx file types extend the Office Open XML file format:
					// https://en.wikipedia.org/wiki/Office_Open_XML_file_formats
					// We look for:
					// - one entry named '[Content_Types].xml' or '_rels/.rels',
					// - one entry indicating specific type of file.
					// MS Office, OpenOffice and LibreOffice may put the parts in different order, so the check should not rely on it.
					if (zipHeader.filename === 'mimetype' && zipHeader.compressedSize === zipHeader.uncompressedSize) {
						let mimeType = await tokenizer.readToken(new StringType(zipHeader.compressedSize, 'utf-8'));
						mimeType = mimeType.trim();

						switch (mimeType) {
							case 'application/epub+zip':
								return {
									ext: 'epub',
									mime: 'application/epub+zip',
								};
							case 'application/vnd.oasis.opendocument.text':
								return {
									ext: 'odt',
									mime: 'application/vnd.oasis.opendocument.text',
								};
							case 'application/vnd.oasis.opendocument.spreadsheet':
								return {
									ext: 'ods',
									mime: 'application/vnd.oasis.opendocument.spreadsheet',
								};
							case 'application/vnd.oasis.opendocument.presentation':
								return {
									ext: 'odp',
									mime: 'application/vnd.oasis.opendocument.presentation',
								};
							default:
						}
					}

					// Try to find next header manually when current one is corrupted
					if (zipHeader.compressedSize === 0) {
						let nextHeaderIndex = -1;

						while (nextHeaderIndex < 0 && (tokenizer.position < tokenizer.fileInfo.size)) {
							await tokenizer.peekBuffer(this.buffer, {mayBeLess: true});

							nextHeaderIndex = this.buffer.indexOf('504B0304', 0, 'hex');
							// Move position to the next header if found, skip the whole buffer otherwise
							await tokenizer.ignore(nextHeaderIndex >= 0 ? nextHeaderIndex : this.buffer.length);
						}
					} else {
						await tokenizer.ignore(zipHeader.compressedSize);
					}
				}
			} catch (error) {
				if (!(error instanceof EndOfStreamError)) {
					throw error;
				}
			}

			return {
				ext: 'zip',
				mime: 'application/zip',
			};
		}

		if (this.checkString('OggS')) {
			// This is an OGG container
			await tokenizer.ignore(28);
			const type = node_buffer.Buffer.alloc(8);
			await tokenizer.readBuffer(type);

			// Needs to be before `ogg` check
			if (_check(type, [0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64])) {
				return {
					ext: 'opus',
					mime: 'audio/opus',
				};
			}

			// If ' theora' in header.
			if (_check(type, [0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61])) {
				return {
					ext: 'ogv',
					mime: 'video/ogg',
				};
			}

			// If '\x01video' in header.
			if (_check(type, [0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00])) {
				return {
					ext: 'ogm',
					mime: 'video/ogg',
				};
			}

			// If ' FLAC' in header  https://xiph.org/flac/faq.html
			if (_check(type, [0x7F, 0x46, 0x4C, 0x41, 0x43])) {
				return {
					ext: 'oga',
					mime: 'audio/ogg',
				};
			}

			// 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
			if (_check(type, [0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20])) {
				return {
					ext: 'spx',
					mime: 'audio/ogg',
				};
			}

			// If '\x01vorbis' in header
			if (_check(type, [0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73])) {
				return {
					ext: 'ogg',
					mime: 'audio/ogg',
				};
			}

			// Default OGG container https://www.iana.org/assignments/media-types/application/ogg
			return {
				ext: 'ogx',
				mime: 'application/ogg',
			};
		}

		if (
			this.check([0x50, 0x4B])
			&& (this.buffer[2] === 0x3 || this.buffer[2] === 0x5 || this.buffer[2] === 0x7)
			&& (this.buffer[3] === 0x4 || this.buffer[3] === 0x6 || this.buffer[3] === 0x8)
		) {
			return {
				ext: 'zip',
				mime: 'application/zip',
			};
		}

		//

		// File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)
		// It's not required to be first, but it's recommended to be. Almost all ISO base media files start with `ftyp` box.
		// `ftyp` box must contain a brand major identifier, which must consist of ISO 8859-1 printable characters.
		// Here we check for 8859-1 printable characters (for simplicity, it's a mask which also catches one non-printable character).
		if (
			this.checkString('ftyp', {offset: 4})
			&& (this.buffer[8] & 0x60) !== 0x00 // Brand major, first character ASCII?
		) {
			// They all can have MIME `video/mp4` except `application/mp4` special-case which is hard to detect.
			// For some cases, we're specific, everything else falls to `video/mp4` with `mp4` extension.
			const brandMajor = this.buffer.toString('binary', 8, 12).replace('\0', ' ').trim();
			switch (brandMajor) {
				case 'avif':
				case 'avis':
					return {ext: 'avif', mime: 'image/avif'};
				case 'mif1':
					return {ext: 'heic', mime: 'image/heif'};
				case 'msf1':
					return {ext: 'heic', mime: 'image/heif-sequence'};
				case 'heic':
				case 'heix':
					return {ext: 'heic', mime: 'image/heic'};
				case 'hevc':
				case 'hevx':
					return {ext: 'heic', mime: 'image/heic-sequence'};
				case 'qt':
					return {ext: 'mov', mime: 'video/quicktime'};
				case 'M4V':
				case 'M4VH':
				case 'M4VP':
					return {ext: 'm4v', mime: 'video/x-m4v'};
				case 'M4P':
					return {ext: 'm4p', mime: 'video/mp4'};
				case 'M4B':
					return {ext: 'm4b', mime: 'audio/mp4'};
				case 'M4A':
					return {ext: 'm4a', mime: 'audio/x-m4a'};
				case 'F4V':
					return {ext: 'f4v', mime: 'video/mp4'};
				case 'F4P':
					return {ext: 'f4p', mime: 'video/mp4'};
				case 'F4A':
					return {ext: 'f4a', mime: 'audio/mp4'};
				case 'F4B':
					return {ext: 'f4b', mime: 'audio/mp4'};
				case 'crx':
					return {ext: 'cr3', mime: 'image/x-canon-cr3'};
				default:
					if (brandMajor.startsWith('3g')) {
						if (brandMajor.startsWith('3g2')) {
							return {ext: '3g2', mime: 'video/3gpp2'};
						}

						return {ext: '3gp', mime: 'video/3gpp'};
					}

					return {ext: 'mp4', mime: 'video/mp4'};
			}
		}

		if (this.checkString('MThd')) {
			return {
				ext: 'mid',
				mime: 'audio/midi',
			};
		}

		if (
			this.checkString('wOFF')
			&& (
				this.check([0x00, 0x01, 0x00, 0x00], {offset: 4})
				|| this.checkString('OTTO', {offset: 4})
			)
		) {
			return {
				ext: 'woff',
				mime: 'font/woff',
			};
		}

		if (
			this.checkString('wOF2')
			&& (
				this.check([0x00, 0x01, 0x00, 0x00], {offset: 4})
				|| this.checkString('OTTO', {offset: 4})
			)
		) {
			return {
				ext: 'woff2',
				mime: 'font/woff2',
			};
		}

		if (this.check([0xD4, 0xC3, 0xB2, 0xA1]) || this.check([0xA1, 0xB2, 0xC3, 0xD4])) {
			return {
				ext: 'pcap',
				mime: 'application/vnd.tcpdump.pcap',
			};
		}

		// Sony DSD Stream File (DSF)
		if (this.checkString('DSD ')) {
			return {
				ext: 'dsf',
				mime: 'audio/x-dsf', // Non-standard
			};
		}

		if (this.checkString('LZIP')) {
			return {
				ext: 'lz',
				mime: 'application/x-lzip',
			};
		}

		if (this.checkString('fLaC')) {
			return {
				ext: 'flac',
				mime: 'audio/x-flac',
			};
		}

		if (this.check([0x42, 0x50, 0x47, 0xFB])) {
			return {
				ext: 'bpg',
				mime: 'image/bpg',
			};
		}

		if (this.checkString('wvpk')) {
			return {
				ext: 'wv',
				mime: 'audio/wavpack',
			};
		}

		if (this.checkString('%PDF')) {
			try {
				await tokenizer.ignore(1350);
				const maxBufferSize = 10 * 1024 * 1024;
				const buffer = node_buffer.Buffer.alloc(Math.min(maxBufferSize, tokenizer.fileInfo.size));
				await tokenizer.readBuffer(buffer, {mayBeLess: true});

				// Check if this is an Adobe Illustrator file
				if (buffer.includes(node_buffer.Buffer.from('AIPrivateData'))) {
					return {
						ext: 'ai',
						mime: 'application/postscript',
					};
				}
			} catch (error) {
				// Swallow end of stream error if file is too small for the Adobe AI check
				if (!(error instanceof EndOfStreamError)) {
					throw error;
				}
			}

			// Assume this is just a normal PDF
			return {
				ext: 'pdf',
				mime: 'application/pdf',
			};
		}

		if (this.check([0x00, 0x61, 0x73, 0x6D])) {
			return {
				ext: 'wasm',
				mime: 'application/wasm',
			};
		}

		// TIFF, little-endian type
		if (this.check([0x49, 0x49])) {
			const fileType = await this.readTiffHeader(false);
			if (fileType) {
				return fileType;
			}
		}

		// TIFF, big-endian type
		if (this.check([0x4D, 0x4D])) {
			const fileType = await this.readTiffHeader(true);
			if (fileType) {
				return fileType;
			}
		}

		if (this.checkString('MAC ')) {
			return {
				ext: 'ape',
				mime: 'audio/ape',
			};
		}

		// https://github.com/file/file/blob/master/magic/Magdir/matroska
		if (this.check([0x1A, 0x45, 0xDF, 0xA3])) { // Root element: EBML
			async function readField() {
				const msb = await tokenizer.peekNumber(UINT8);
				let mask = 0x80;
				let ic = 0; // 0 = A, 1 = B, 2 = C, 3
				// = D

				while ((msb & mask) === 0 && mask !== 0) {
					++ic;
					mask >>= 1;
				}

				const id = node_buffer.Buffer.alloc(ic + 1);
				await tokenizer.readBuffer(id);
				return id;
			}

			async function readElement() {
				const id = await readField();
				const lengthField = await readField();
				lengthField[0] ^= 0x80 >> (lengthField.length - 1);
				const nrLength = Math.min(6, lengthField.length); // JavaScript can max read 6 bytes integer
				return {
					id: id.readUIntBE(0, id.length),
					len: lengthField.readUIntBE(lengthField.length - nrLength, nrLength),
				};
			}

			async function readChildren(children) {
				while (children > 0) {
					const element = await readElement();
					if (element.id === 0x42_82) {
						const rawValue = await tokenizer.readToken(new StringType(element.len, 'utf-8'));
						return rawValue.replace(/\00.*$/g, ''); // Return DocType
					}

					await tokenizer.ignore(element.len); // ignore payload
					--children;
				}
			}

			const re = await readElement();
			const docType = await readChildren(re.len);

			switch (docType) {
				case 'webm':
					return {
						ext: 'webm',
						mime: 'video/webm',
					};

				case 'matroska':
					return {
						ext: 'mkv',
						mime: 'video/x-matroska',
					};

				default:
					return;
			}
		}

		// RIFF file format which might be AVI, WAV, QCP, etc
		if (this.check([0x52, 0x49, 0x46, 0x46])) {
			if (this.check([0x41, 0x56, 0x49], {offset: 8})) {
				return {
					ext: 'avi',
					mime: 'video/vnd.avi',
				};
			}

			if (this.check([0x57, 0x41, 0x56, 0x45], {offset: 8})) {
				return {
					ext: 'wav',
					mime: 'audio/vnd.wave',
				};
			}

			// QLCM, QCP file
			if (this.check([0x51, 0x4C, 0x43, 0x4D], {offset: 8})) {
				return {
					ext: 'qcp',
					mime: 'audio/qcelp',
				};
			}
		}

		if (this.checkString('SQLi')) {
			return {
				ext: 'sqlite',
				mime: 'application/x-sqlite3',
			};
		}

		if (this.check([0x4E, 0x45, 0x53, 0x1A])) {
			return {
				ext: 'nes',
				mime: 'application/x-nintendo-nes-rom',
			};
		}

		if (this.checkString('Cr24')) {
			return {
				ext: 'crx',
				mime: 'application/x-google-chrome-extension',
			};
		}

		if (
			this.checkString('MSCF')
			|| this.checkString('ISc(')
		) {
			return {
				ext: 'cab',
				mime: 'application/vnd.ms-cab-compressed',
			};
		}

		if (this.check([0xED, 0xAB, 0xEE, 0xDB])) {
			return {
				ext: 'rpm',
				mime: 'application/x-rpm',
			};
		}

		if (this.check([0xC5, 0xD0, 0xD3, 0xC6])) {
			return {
				ext: 'eps',
				mime: 'application/eps',
			};
		}

		if (this.check([0x28, 0xB5, 0x2F, 0xFD])) {
			return {
				ext: 'zst',
				mime: 'application/zstd',
			};
		}

		if (this.check([0x7F, 0x45, 0x4C, 0x46])) {
			return {
				ext: 'elf',
				mime: 'application/x-elf',
			};
		}

		if (this.check([0x21, 0x42, 0x44, 0x4E])) {
			return {
				ext: 'pst',
				mime: 'application/vnd.ms-outlook',
			};
		}

		if (this.checkString('PAR1')) {
			return {
				ext: 'parquet',
				mime: 'application/x-parquet',
			};
		}

		if (this.check([0xCF, 0xFA, 0xED, 0xFE])) {
			return {
				ext: 'macho',
				mime: 'application/x-mach-binary',
			};
		}

		// -- 5-byte signatures --

		if (this.check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
			return {
				ext: 'otf',
				mime: 'font/otf',
			};
		}

		if (this.checkString('#!AMR')) {
			return {
				ext: 'amr',
				mime: 'audio/amr',
			};
		}

		if (this.checkString('{\\rtf')) {
			return {
				ext: 'rtf',
				mime: 'application/rtf',
			};
		}

		if (this.check([0x46, 0x4C, 0x56, 0x01])) {
			return {
				ext: 'flv',
				mime: 'video/x-flv',
			};
		}

		if (this.checkString('IMPM')) {
			return {
				ext: 'it',
				mime: 'audio/x-it',
			};
		}

		if (
			this.checkString('-lh0-', {offset: 2})
			|| this.checkString('-lh1-', {offset: 2})
			|| this.checkString('-lh2-', {offset: 2})
			|| this.checkString('-lh3-', {offset: 2})
			|| this.checkString('-lh4-', {offset: 2})
			|| this.checkString('-lh5-', {offset: 2})
			|| this.checkString('-lh6-', {offset: 2})
			|| this.checkString('-lh7-', {offset: 2})
			|| this.checkString('-lzs-', {offset: 2})
			|| this.checkString('-lz4-', {offset: 2})
			|| this.checkString('-lz5-', {offset: 2})
			|| this.checkString('-lhd-', {offset: 2})
		) {
			return {
				ext: 'lzh',
				mime: 'application/x-lzh-compressed',
			};
		}

		// MPEG program stream (PS or MPEG-PS)
		if (this.check([0x00, 0x00, 0x01, 0xBA])) {
			//  MPEG-PS, MPEG-1 Part 1
			if (this.check([0x21], {offset: 4, mask: [0xF1]})) {
				return {
					ext: 'mpg', // May also be .ps, .mpeg
					mime: 'video/MP1S',
				};
			}

			// MPEG-PS, MPEG-2 Part 1
			if (this.check([0x44], {offset: 4, mask: [0xC4]})) {
				return {
					ext: 'mpg', // May also be .mpg, .m2p, .vob or .sub
					mime: 'video/MP2P',
				};
			}
		}

		if (this.checkString('ITSF')) {
			return {
				ext: 'chm',
				mime: 'application/vnd.ms-htmlhelp',
			};
		}

		if (this.check([0xCA, 0xFE, 0xBA, 0xBE])) {
			return {
				ext: 'class',
				mime: 'application/java-vm',
			};
		}

		// -- 6-byte signatures --

		if (this.check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
			return {
				ext: 'xz',
				mime: 'application/x-xz',
			};
		}

		if (this.checkString('<?xml ')) {
			return {
				ext: 'xml',
				mime: 'application/xml',
			};
		}

		if (this.check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
			return {
				ext: '7z',
				mime: 'application/x-7z-compressed',
			};
		}

		if (
			this.check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7])
			&& (this.buffer[6] === 0x0 || this.buffer[6] === 0x1)
		) {
			return {
				ext: 'rar',
				mime: 'application/x-rar-compressed',
			};
		}

		if (this.checkString('solid ')) {
			return {
				ext: 'stl',
				mime: 'model/stl',
			};
		}

		if (this.checkString('AC')) {
			const version = this.buffer.toString('binary', 2, 6);
			if (version.match('^d*') && version >= 1000 && version <= 1050) {
				return {
					ext: 'dwg',
					mime: 'image/vnd.dwg',
				};
			}
		}

		if (this.checkString('070707')) {
			return {
				ext: 'cpio',
				mime: 'application/x-cpio',
			};
		}

		// -- 7-byte signatures --

		if (this.checkString('BLENDER')) {
			return {
				ext: 'blend',
				mime: 'application/x-blender',
			};
		}

		if (this.checkString('!<arch>')) {
			await tokenizer.ignore(8);
			const string = await tokenizer.readToken(new StringType(13, 'ascii'));
			if (string === 'debian-binary') {
				return {
					ext: 'deb',
					mime: 'application/x-deb',
				};
			}

			return {
				ext: 'ar',
				mime: 'application/x-unix-archive',
			};
		}

		if (this.checkString('**ACE', {offset: 7})) {
			await tokenizer.peekBuffer(this.buffer, {length: 14, mayBeLess: true});
			if (this.checkString('**', {offset: 12})) {
				return {
					ext: 'ace',
					mime: 'application/x-ace-compressed',
				};
			}
		}

		// -- 8-byte signatures --

		if (this.check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
			// APNG format (https://wiki.mozilla.org/APNG_Specification)
			// 1. Find the first IDAT (image data) chunk (49 44 41 54)
			// 2. Check if there is an "acTL" chunk before the IDAT one (61 63 54 4C)

			// Offset calculated as follows:
			// - 8 bytes: PNG signature
			// - 4 (length) + 4 (chunk type) + 13 (chunk data) + 4 (CRC): IHDR chunk

			await tokenizer.ignore(8); // ignore PNG signature

			async function readChunkHeader() {
				return {
					length: await tokenizer.readToken(INT32_BE),
					type: await tokenizer.readToken(new StringType(4, 'binary')),
				};
			}

			do {
				const chunk = await readChunkHeader();
				if (chunk.length < 0) {
					return; // Invalid chunk length
				}

				switch (chunk.type) {
					case 'IDAT':
						return {
							ext: 'png',
							mime: 'image/png',
						};
					case 'acTL':
						return {
							ext: 'apng',
							mime: 'image/apng',
						};
					default:
						await tokenizer.ignore(chunk.length + 4); // Ignore chunk-data + CRC
				}
			} while (tokenizer.position + 8 < tokenizer.fileInfo.size);

			return {
				ext: 'png',
				mime: 'image/png',
			};
		}

		if (this.check([0x41, 0x52, 0x52, 0x4F, 0x57, 0x31, 0x00, 0x00])) {
			return {
				ext: 'arrow',
				mime: 'application/x-apache-arrow',
			};
		}

		if (this.check([0x67, 0x6C, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00])) {
			return {
				ext: 'glb',
				mime: 'model/gltf-binary',
			};
		}

		// `mov` format variants
		if (
			this.check([0x66, 0x72, 0x65, 0x65], {offset: 4}) // `free`
			|| this.check([0x6D, 0x64, 0x61, 0x74], {offset: 4}) // `mdat` MJPEG
			|| this.check([0x6D, 0x6F, 0x6F, 0x76], {offset: 4}) // `moov`
			|| this.check([0x77, 0x69, 0x64, 0x65], {offset: 4}) // `wide`
		) {
			return {
				ext: 'mov',
				mime: 'video/quicktime',
			};
		}

		// -- 9-byte signatures --

		if (this.check([0x49, 0x49, 0x52, 0x4F, 0x08, 0x00, 0x00, 0x00, 0x18])) {
			return {
				ext: 'orf',
				mime: 'image/x-olympus-orf',
			};
		}

		if (this.checkString('gimp xcf ')) {
			return {
				ext: 'xcf',
				mime: 'image/x-xcf',
			};
		}

		// -- 12-byte signatures --

		if (this.check([0x49, 0x49, 0x55, 0x00, 0x18, 0x00, 0x00, 0x00, 0x88, 0xE7, 0x74, 0xD8])) {
			return {
				ext: 'rw2',
				mime: 'image/x-panasonic-rw2',
			};
		}

		// ASF_Header_Object first 80 bytes
		if (this.check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
			async function readHeader() {
				const guid = node_buffer.Buffer.alloc(16);
				await tokenizer.readBuffer(guid);
				return {
					id: guid,
					size: Number(await tokenizer.readToken(UINT64_LE)),
				};
			}

			await tokenizer.ignore(30);
			// Search for header should be in first 1KB of file.
			while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
				const header = await readHeader();
				let payload = header.size - 24;
				if (_check(header.id, [0x91, 0x07, 0xDC, 0xB7, 0xB7, 0xA9, 0xCF, 0x11, 0x8E, 0xE6, 0x00, 0xC0, 0x0C, 0x20, 0x53, 0x65])) {
					// Sync on Stream-Properties-Object (B7DC0791-A9B7-11CF-8EE6-00C00C205365)
					const typeId = node_buffer.Buffer.alloc(16);
					payload -= await tokenizer.readBuffer(typeId);

					if (_check(typeId, [0x40, 0x9E, 0x69, 0xF8, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B])) {
						// Found audio:
						return {
							ext: 'asf',
							mime: 'audio/x-ms-asf',
						};
					}

					if (_check(typeId, [0xC0, 0xEF, 0x19, 0xBC, 0x4D, 0x5B, 0xCF, 0x11, 0xA8, 0xFD, 0x00, 0x80, 0x5F, 0x5C, 0x44, 0x2B])) {
						// Found video:
						return {
							ext: 'asf',
							mime: 'video/x-ms-asf',
						};
					}

					break;
				}

				await tokenizer.ignore(payload);
			}

			// Default to ASF generic extension
			return {
				ext: 'asf',
				mime: 'application/vnd.ms-asf',
			};
		}

		if (this.check([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A])) {
			return {
				ext: 'ktx',
				mime: 'image/ktx',
			};
		}

		if ((this.check([0x7E, 0x10, 0x04]) || this.check([0x7E, 0x18, 0x04])) && this.check([0x30, 0x4D, 0x49, 0x45], {offset: 4})) {
			return {
				ext: 'mie',
				mime: 'application/x-mie',
			};
		}

		if (this.check([0x27, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], {offset: 2})) {
			return {
				ext: 'shp',
				mime: 'application/x-esri-shape',
			};
		}

		if (this.check([0xFF, 0x4F, 0xFF, 0x51])) {
			return {
				ext: 'j2c',
				mime: 'image/j2c',
			};
		}

		if (this.check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
			// JPEG-2000 family

			await tokenizer.ignore(20);
			const type = await tokenizer.readToken(new StringType(4, 'ascii'));
			switch (type) {
				case 'jp2 ':
					return {
						ext: 'jp2',
						mime: 'image/jp2',
					};
				case 'jpx ':
					return {
						ext: 'jpx',
						mime: 'image/jpx',
					};
				case 'jpm ':
					return {
						ext: 'jpm',
						mime: 'image/jpm',
					};
				case 'mjp2':
					return {
						ext: 'mj2',
						mime: 'image/mj2',
					};
				default:
					return;
			}
		}

		if (
			this.check([0xFF, 0x0A])
			|| this.check([0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20, 0x0D, 0x0A, 0x87, 0x0A])
		) {
			return {
				ext: 'jxl',
				mime: 'image/jxl',
			};
		}

		if (this.check([0xFE, 0xFF])) { // UTF-16-BOM-LE
			if (this.check([0, 60, 0, 63, 0, 120, 0, 109, 0, 108], {offset: 2})) {
				return {
					ext: 'xml',
					mime: 'application/xml',
				};
			}

			return undefined; // Some unknown text based format
		}

		// -- Unsafe signatures --

		if (
			this.check([0x0, 0x0, 0x1, 0xBA])
			|| this.check([0x0, 0x0, 0x1, 0xB3])
		) {
			return {
				ext: 'mpg',
				mime: 'video/mpeg',
			};
		}

		if (this.check([0x00, 0x01, 0x00, 0x00, 0x00])) {
			return {
				ext: 'ttf',
				mime: 'font/ttf',
			};
		}

		if (this.check([0x00, 0x00, 0x01, 0x00])) {
			return {
				ext: 'ico',
				mime: 'image/x-icon',
			};
		}

		if (this.check([0x00, 0x00, 0x02, 0x00])) {
			return {
				ext: 'cur',
				mime: 'image/x-icon',
			};
		}

		if (this.check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
			// Detected Microsoft Compound File Binary File (MS-CFB) Format.
			return {
				ext: 'cfb',
				mime: 'application/x-cfb',
			};
		}

		// Increase sample size from 12 to 256.
		await tokenizer.peekBuffer(this.buffer, {length: Math.min(256, tokenizer.fileInfo.size), mayBeLess: true});

		if (this.check([0x61, 0x63, 0x73, 0x70], {offset: 36})) {
			return {
				ext: 'icc',
				mime: 'application/vnd.iccprofile',
			};
		}

		// -- 15-byte signatures --

		if (this.checkString('BEGIN:')) {
			if (this.checkString('VCARD', {offset: 6})) {
				return {
					ext: 'vcf',
					mime: 'text/vcard',
				};
			}

			if (this.checkString('VCALENDAR', {offset: 6})) {
				return {
					ext: 'ics',
					mime: 'text/calendar',
				};
			}
		}

		// `raf` is here just to keep all the raw image detectors together.
		if (this.checkString('FUJIFILMCCD-RAW')) {
			return {
				ext: 'raf',
				mime: 'image/x-fujifilm-raf',
			};
		}

		if (this.checkString('Extended Module:')) {
			return {
				ext: 'xm',
				mime: 'audio/x-xm',
			};
		}

		if (this.checkString('Creative Voice File')) {
			return {
				ext: 'voc',
				mime: 'audio/x-voc',
			};
		}

		if (this.check([0x04, 0x00, 0x00, 0x00]) && this.buffer.length >= 16) { // Rough & quick check Pickle/ASAR
			const jsonSize = this.buffer.readUInt32LE(12);
			if (jsonSize > 12 && this.buffer.length >= jsonSize + 16) {
				try {
					const header = this.buffer.slice(16, jsonSize + 16).toString();
					const json = JSON.parse(header);
					// Check if Pickle is ASAR
					if (json.files) { // Final check, assuring Pickle/ASAR format
						return {
							ext: 'asar',
							mime: 'application/x-asar',
						};
					}
				} catch {}
			}
		}

		if (this.check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
			return {
				ext: 'mxf',
				mime: 'application/mxf',
			};
		}

		if (this.checkString('SCRM', {offset: 44})) {
			return {
				ext: 's3m',
				mime: 'audio/x-s3m',
			};
		}

		// Raw MPEG-2 transport stream (188-byte packets)
		if (this.check([0x47]) && this.check([0x47], {offset: 188})) {
			return {
				ext: 'mts',
				mime: 'video/mp2t',
			};
		}

		// Blu-ray Disc Audio-Video (BDAV) MPEG-2 transport stream has 4-byte TP_extra_header before each 188-byte packet
		if (this.check([0x47], {offset: 4}) && this.check([0x47], {offset: 196})) {
			return {
				ext: 'mts',
				mime: 'video/mp2t',
			};
		}

		if (this.check([0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49], {offset: 60})) {
			return {
				ext: 'mobi',
				mime: 'application/x-mobipocket-ebook',
			};
		}

		if (this.check([0x44, 0x49, 0x43, 0x4D], {offset: 128})) {
			return {
				ext: 'dcm',
				mime: 'application/dicom',
			};
		}

		if (this.check([0x4C, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46])) {
			return {
				ext: 'lnk',
				mime: 'application/x.ms.shortcut', // Invented by us
			};
		}

		if (this.check([0x62, 0x6F, 0x6F, 0x6B, 0x00, 0x00, 0x00, 0x00, 0x6D, 0x61, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x00])) {
			return {
				ext: 'alias',
				mime: 'application/x.apple.alias', // Invented by us
			};
		}

		if (this.checkString('Kaydara FBX Binary  \u0000')) {
			return {
				ext: 'fbx',
				mime: 'application/x.autodesk.fbx', // Invented by us
			};
		}

		if (
			this.check([0x4C, 0x50], {offset: 34})
			&& (
				this.check([0x00, 0x00, 0x01], {offset: 8})
				|| this.check([0x01, 0x00, 0x02], {offset: 8})
				|| this.check([0x02, 0x00, 0x02], {offset: 8})
			)
		) {
			return {
				ext: 'eot',
				mime: 'application/vnd.ms-fontobject',
			};
		}

		if (this.check([0x06, 0x06, 0xED, 0xF5, 0xD8, 0x1D, 0x46, 0xE5, 0xBD, 0x31, 0xEF, 0xE7, 0xFE, 0x74, 0xB7, 0x1D])) {
			return {
				ext: 'indd',
				mime: 'application/x-indesign',
			};
		}

		// Increase sample size from 256 to 512
		await tokenizer.peekBuffer(this.buffer, {length: Math.min(512, tokenizer.fileInfo.size), mayBeLess: true});

		// Requires a buffer size of 512 bytes
		if (tarHeaderChecksumMatches(this.buffer)) {
			return {
				ext: 'tar',
				mime: 'application/x-tar',
			};
		}

		if (this.check([0xFF, 0xFE])) { // UTF-16-BOM-BE
			if (this.check([60, 0, 63, 0, 120, 0, 109, 0, 108, 0], {offset: 2})) {
				return {
					ext: 'xml',
					mime: 'application/xml',
				};
			}

			if (this.check([0xFF, 0x0E, 0x53, 0x00, 0x6B, 0x00, 0x65, 0x00, 0x74, 0x00, 0x63, 0x00, 0x68, 0x00, 0x55, 0x00, 0x70, 0x00, 0x20, 0x00, 0x4D, 0x00, 0x6F, 0x00, 0x64, 0x00, 0x65, 0x00, 0x6C, 0x00], {offset: 2})) {
				return {
					ext: 'skp',
					mime: 'application/vnd.sketchup.skp',
				};
			}

			return undefined; // Some text based format
		}

		if (this.checkString('-----BEGIN PGP MESSAGE-----')) {
			return {
				ext: 'pgp',
				mime: 'application/pgp-encrypted',
			};
		}

		// Check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE)
		if (this.buffer.length >= 2 && this.check([0xFF, 0xE0], {offset: 0, mask: [0xFF, 0xE0]})) {
			if (this.check([0x10], {offset: 1, mask: [0x16]})) {
				// Check for (ADTS) MPEG-2
				if (this.check([0x08], {offset: 1, mask: [0x08]})) {
					return {
						ext: 'aac',
						mime: 'audio/aac',
					};
				}

				// Must be (ADTS) MPEG-4
				return {
					ext: 'aac',
					mime: 'audio/aac',
				};
			}

			// MPEG 1 or 2 Layer 3 header
			// Check for MPEG layer 3
			if (this.check([0x02], {offset: 1, mask: [0x06]})) {
				return {
					ext: 'mp3',
					mime: 'audio/mpeg',
				};
			}

			// Check for MPEG layer 2
			if (this.check([0x04], {offset: 1, mask: [0x06]})) {
				return {
					ext: 'mp2',
					mime: 'audio/mpeg',
				};
			}

			// Check for MPEG layer 1
			if (this.check([0x06], {offset: 1, mask: [0x06]})) {
				return {
					ext: 'mp1',
					mime: 'audio/mpeg',
				};
			}
		}
	}

	async readTiffTag(bigEndian) {
		const tagId = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
		this.tokenizer.ignore(10);
		switch (tagId) {
			case 50_341:
				return {
					ext: 'arw',
					mime: 'image/x-sony-arw',
				};
			case 50_706:
				return {
					ext: 'dng',
					mime: 'image/x-adobe-dng',
				};
		}
	}

	async readTiffIFD(bigEndian) {
		const numberOfTags = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
		for (let n = 0; n < numberOfTags; ++n) {
			const fileType = await this.readTiffTag(bigEndian);
			if (fileType) {
				return fileType;
			}
		}
	}

	async readTiffHeader(bigEndian) {
		const version = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 2);
		const ifdOffset = (bigEndian ? UINT32_BE : UINT32_LE).get(this.buffer, 4);

		if (version === 42) {
			// TIFF file header
			if (ifdOffset >= 6) {
				if (this.checkString('CR', {offset: 8})) {
					return {
						ext: 'cr2',
						mime: 'image/x-canon-cr2',
					};
				}

				if (ifdOffset >= 8 && (this.check([0x1C, 0x00, 0xFE, 0x00], {offset: 8}) || this.check([0x1F, 0x00, 0x0B, 0x00], {offset: 8}))) {
					return {
						ext: 'nef',
						mime: 'image/x-nikon-nef',
					};
				}
			}

			await this.tokenizer.ignore(ifdOffset);
			const fileType = await this.readTiffIFD(bigEndian);
			return fileType ?? {
				ext: 'tif',
				mime: 'image/tiff',
			};
		}

		if (version === 43) {	// Big TIFF file header
			return {
				ext: 'tif',
				mime: 'image/tiff',
			};
		}
	}
}

new Set(extensions);
new Set(mimeTypes);

const imageExtensions = new Set([
	'jpg',
	'png',
	'gif',
	'webp',
	'flif',
	'cr2',
	'tif',
	'bmp',
	'jxr',
	'psd',
	'ico',
	'bpg',
	'jp2',
	'jpm',
	'jpx',
	'heic',
	'cur',
	'dcm',
	'avif',
]);

async function imageType(input) {
	const result = await fileTypeFromBuffer(input);
	return imageExtensions.has(result?.ext) && result;
}

// العربية
var ar = {};

// čeština
var cz = {};

// Dansk
var da = {};

// Deutsch
var de = {};

// English
var en = {
    // setting.ts
    "Plugin Settings": "Plugin Settings",
    "Auto pasted upload": "Auto pasted upload",
    "If you set this value true, when you paste image, it will be auto uploaded(you should set the picGo server rightly)": "If you set this value true, when you paste image, it will be auto uploaded(you should set the picGo server rightly)",
    "Default uploader": "Default uploader",
    "PicGo server": "PicGo server upload route",
    "PicGo server desc": "upload route, use PicList will be able to set picbed and config through query",
    "Please input PicGo server": "Please input upload route",
    "PicGo delete server": "PicGo server delete route(you need to use PicList app)",
    "PicList desc": "Search PicList on Github to download and install",
    "Please input PicGo delete server": "Please input delete server",
    "Delete image using PicList": "Delete image using PicList",
    "PicGo-Core path": "PicGo-Core path",
    "Delete successfully": "Delete successfully",
    "Delete failed": "Delete failed",
    "Image size suffix": "Image size suffix",
    "Image size suffix Description": "like |300 for resize image in ob.",
    "Please input image size suffix": "Please input image size suffix",
    "Error, could not delete": "Error, could not delete",
    "Please input PicGo-Core path, default using environment variables": "Please input PicGo-Core path, default using environment variables",
    "Work on network": "Work on network",
    "Work on network Description": "Allow upload network image by 'Upload all' command.\n Or when you paste, md standard image link in your clipboard will be auto upload.",
    fixPath: "fixPath",
    fixPathWarning: "This option is used to fix PicGo-core upload failures on Linux and Mac. It modifies the PATH variable within Obsidian. If Obsidian encounters any bugs, turn off the option, try again! ",
    "Upload when clipboard has image and text together": "Upload when clipboard has image and text together",
    "When you copy, some application like Excel will image and text to clipboard, you can upload or not.": "When you copy, some application like Excel will image and text to clipboard, you can upload or not.",
    "Network Domain Black List": "Network Domain Black List",
    "Network Domain Black List Description": "Image in the domain list will not be upload,use comma separated",
    "Delete source file after you upload file": "Delete source file after you upload file",
    "Delete source file in ob assets after you upload file.": "Delete source file in ob assets after you upload file.",
    "Image desc": "Image desc",
    reserve: "default",
    "remove all": "none",
    "remove default": "remove image.png",
    "Remote server mode": "Remote server mode",
    "Remote server mode desc": "If you have deployed piclist-core or piclist on the server.",
    "Can not find image file": "Can not find image file",
    "File has been changedd, upload failure": "File has been changedd, upload failure",
    "File has been changedd, download failure": "File has been changedd, download failure",
    "Warning: upload files is different of reciver files from api": "Warning: upload files num is different of reciver files from api",
};

// British English
var enGB = {};

// Español
var es = {};

// français
var fr = {};

// हिन्दी
var hi = {};

// Bahasa Indonesia
var id = {};

// Italiano
var it = {};

// 日本語
var ja = {};

// 한국어
var ko = {};

// Nederlands
var nl = {};

// Norsk
var no = {};

// język polski
var pl = {};

// Português
var pt = {};

// Português do Brasil
// Brazilian Portuguese
var ptBR = {};

// Română
var ro = {};

// русский
var ru = {};

// Türkçe
var tr = {};

// 简体中文
var zhCN = {
    // setting.ts
    "Plugin Settings": "插件设置",
    "Auto pasted upload": "剪切板自动上传",
    "If you set this value true, when you paste image, it will be auto uploaded(you should set the picGo server rightly)": "启用该选项后，黏贴图片时会自动上传（你需要正确配置picgo）",
    "Default uploader": "默认上传器",
    "PicGo server": "PicGo server 上传接口",
    "PicGo server desc": "上传接口，使用PicList时可通过设置URL参数指定图床和配置",
    "Please input PicGo server": "请输入上传接口地址",
    "PicGo delete server": "PicGo server 删除接口(请使用PicList来启用此功能)",
    "PicList desc": "PicList是PicGo二次开发版，请Github搜索PicList下载",
    "Please input PicGo delete server": "请输入删除接口地址",
    "Delete image using PicList": "使用 PicList 删除图片",
    "PicGo-Core path": "PicGo-Core 路径",
    "Delete successfully": "删除成功",
    "Delete failed": "删除失败",
    "Error, could not delete": "错误，无法删除",
    "Image size suffix": "图片大小后缀",
    "Image size suffix Description": "比如：|300 用于调整图片大小",
    "Please input image size suffix": "请输入图片大小后缀",
    "Please input PicGo-Core path, default using environment variables": "请输入 PicGo-Core path，默认使用环境变量",
    "Work on network": "应用网络图片",
    "Work on network Description": "当你上传所有图片时，也会上传网络图片。以及当你进行黏贴时，剪切板中的标准 md 图片会被上传",
    fixPath: "修正PATH变量",
    fixPathWarning: "此选项用于修复Linux和Mac上 PicGo-Core 上传失败的问题。它会修改 Obsidian 内的 PATH 变量，如果 Obsidian 遇到任何BUG，先关闭这个选项试试！",
    "Upload when clipboard has image and text together": "当剪切板同时拥有文本和图片剪切板数据时是否上传图片",
    "When you copy, some application like Excel will image and text to clipboard, you can upload or not.": "当你复制时，某些应用例如 Excel 会在剪切板同时文本和图像数据，确认是否上传。",
    "Network Domain Black List": "网络图片域名黑名单",
    "Network Domain Black List Description": "黑名单域名中的图片将不会被上传，用英文逗号分割",
    "Delete source file after you upload file": "上传文件后移除源文件",
    "Delete source file in ob assets after you upload file.": "上传文件后移除在ob附件文件夹中的文件",
    "Image desc": "图片描述",
    reserve: "默认",
    "remove all": "无",
    "remove default": "移除image.png",
    "Remote server mode": "远程服务器模式",
    "Remote server mode desc": "如果你在服务器部署了piclist-core或者piclist",
    "Can not find image file": "没有解析到图像文件",
    "File has been changedd, upload failure": "当前文件已变更，上传失败",
    "File has been changedd, download failure": "当前文件已变更，下载失败",
    "Warning: upload files is different of reciver files from api": "警告：上传的文件与接口返回的文件数量不一致",
};

// 繁體中文
var zhTW = {};

const localeMap = {
    ar,
    cs: cz,
    da,
    de,
    en,
    'en-gb': enGB,
    es,
    fr,
    hi,
    id,
    it,
    ja,
    ko,
    nl,
    nn: no,
    pl,
    pt,
    'pt-br': ptBR,
    ro,
    ru,
    tr,
    'zh-cn': zhCN,
    'zh-tw': zhTW,
};
const locale = localeMap[obsidian.moment.locale()];
function t(str) {
    return (locale && locale[str]) || en[str];
}

async function downloadAllImageFiles(plugin) {
    const activeFile = plugin.app.workspace.getActiveFile();
    const folderPath = await plugin.app.fileManager.getAvailablePathForAttachment("");
    const fileArray = plugin.helper.getAllFiles();
    if (!(await plugin.app.vault.adapter.exists(folderPath))) {
        await plugin.app.vault.adapter.mkdir(folderPath);
    }
    let imageArray = [];
    for (const file of fileArray) {
        if (!file.path.startsWith("http")) {
            continue;
        }
        const url = file.path;
        const asset = getUrlAsset(url);
        let name = decodeURI(pathBrowserify.parse(asset).name).replaceAll(/[\\\\/:*?\"<>|]/g, "-");
        const response = await download(plugin, url, folderPath, name);
        if (response.ok) {
            const activeFolder = plugin.app.workspace.getActiveFile().parent.path;
            imageArray.push({
                source: file.source,
                name: name,
                path: obsidian.normalizePath(pathBrowserify.relative(obsidian.normalizePath(activeFolder), obsidian.normalizePath(response.path))),
            });
        }
    }
    let value = plugin.helper.getValue();
    imageArray.map(image => {
        let name = plugin.handleName(image.name);
        value = value.replace(image.source, `![${name}](${encodeURI(image.path)})`);
    });
    const currentFile = plugin.app.workspace.getActiveFile();
    if (activeFile.path !== currentFile.path) {
        new obsidian.Notice(t("File has been changedd, download failure"));
        return;
    }
    plugin.helper.setValue(value);
    new obsidian.Notice(`all: ${fileArray.length}\nsuccess: ${imageArray.length}\nfailed: ${fileArray.length - imageArray.length}`);
}
async function download(plugin, url, folderPath, name) {
    const response = await obsidian.requestUrl({ url });
    if (response.status !== 200) {
        return {
            ok: false,
            msg: "error",
        };
    }
    const type = await imageType(new Uint8Array(response.arrayBuffer));
    if (!type) {
        return {
            ok: false,
            msg: "error",
        };
    }
    try {
        let path = obsidian.normalizePath(pathBrowserify.join(folderPath, `${name}.${type.ext}`));
        // 如果文件名已存在，则用随机值替换，不对文件后缀进行判断
        if (await plugin.app.vault.adapter.exists(path)) {
            path = obsidian.normalizePath(pathBrowserify.join(folderPath, `${uuid()}.${type.ext}`));
        }
        plugin.app.vault.adapter.writeBinary(path, response.arrayBuffer);
        return {
            ok: true,
            msg: "ok",
            path: path,
            type,
        };
    }
    catch (err) {
        return {
            ok: false,
            msg: err,
        };
    }
}

class PicGoUploader {
    settings;
    plugin;
    constructor(settings, plugin) {
        this.settings = settings;
        this.plugin = plugin;
    }
    async uploadFiles(fileList) {
        let response;
        let data;
        if (this.settings.remoteServerMode) {
            const files = [];
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const buffer = await new Promise((resolve, reject) => {
                    require$$0.readFile(file, (err, data) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(data);
                    });
                });
                const arrayBuffer = bufferToArrayBuffer(buffer);
                files.push(new File([arrayBuffer], file));
            }
            response = await this.uploadFileByData(files);
            data = await response.json();
        }
        else {
            response = await obsidian.requestUrl({
                url: this.settings.uploadServer,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ list: fileList }),
            });
            data = await response.json;
        }
        // piclist
        if (data.fullResult) {
            const uploadUrlFullResultList = data.fullResult || [];
            this.settings.uploadedImages = [
                ...(this.settings.uploadedImages || []),
                ...uploadUrlFullResultList,
            ];
        }
        return data;
    }
    async uploadFileByData(fileList) {
        const form = new FormData();
        for (let i = 0; i < fileList.length; i++) {
            form.append("list", fileList[i]);
        }
        const options = {
            method: "post",
            body: form,
        };
        const response = await fetch(this.settings.uploadServer, options);
        console.log("response", response);
        return response;
    }
    async uploadFileByClipboard(fileList) {
        let data;
        let res;
        if (this.settings.remoteServerMode) {
            res = await this.uploadFileByData(fileList);
            data = await res.json();
        }
        else {
            res = await obsidian.requestUrl({
                url: this.settings.uploadServer,
                method: "POST",
            });
            data = await res.json;
        }
        if (res.status !== 200) {
            return {
                code: -1,
                msg: data.msg,
                data: "",
            };
        }
        // piclist
        if (data.fullResult) {
            const uploadUrlFullResultList = data.fullResult || [];
            this.settings.uploadedImages = [
                ...(this.settings.uploadedImages || []),
                ...uploadUrlFullResultList,
            ];
            this.plugin.saveSettings();
        }
        return {
            code: 0,
            msg: "success",
            data: typeof data.result == "string" ? data.result : data.result[0],
        };
    }
}
class PicGoCoreUploader {
    settings;
    plugin;
    constructor(settings, plugin) {
        this.settings = settings;
        this.plugin = plugin;
    }
    async uploadFiles(fileList) {
        const length = fileList.length;
        let cli = this.settings.picgoCorePath || "picgo";
        let command = `${cli} upload ${fileList
            .map(item => `"${item}"`)
            .join(" ")}`;
        const res = await this.exec(command);
        const splitList = res.split("\n");
        const splitListLength = splitList.length;
        const data = splitList.splice(splitListLength - 1 - length, length);
        if (res.includes("PicGo ERROR")) {
            console.log(command, res);
            return {
                success: false,
                msg: "失败",
            };
        }
        else {
            return {
                success: true,
                result: data,
            };
        }
        // {success:true,result:[]}
    }
    // PicGo-Core 上传处理
    async uploadFileByClipboard() {
        const res = await this.uploadByClip();
        const splitList = res.split("\n");
        const lastImage = getLastImage(splitList);
        if (lastImage) {
            return {
                code: 0,
                msg: "success",
                data: lastImage,
            };
        }
        else {
            console.log(splitList);
            // new Notice(`"Please check PicGo-Core config"\n${res}`);
            return {
                code: -1,
                msg: `"Please check PicGo-Core config"\n${res}`,
                data: "",
            };
        }
    }
    // PicGo-Core的剪切上传反馈
    async uploadByClip() {
        let command;
        if (this.settings.picgoCorePath) {
            command = `${this.settings.picgoCorePath} upload`;
        }
        else {
            command = `picgo upload`;
        }
        const res = await this.exec(command);
        // const res = await this.spawnChild();
        return res;
    }
    async exec(command) {
        let { stdout } = await require$$0$2.exec(command);
        const res = await streamToString(stdout);
        return res;
    }
    async spawnChild() {
        const { spawn } = require("child_process");
        const child = spawn("picgo", ["upload"], {
            shell: true,
        });
        let data = "";
        for await (const chunk of child.stdout) {
            data += chunk;
        }
        let error = "";
        for await (const chunk of child.stderr) {
            error += chunk;
        }
        const exitCode = await new Promise((resolve, reject) => {
            child.on("close", resolve);
        });
        if (exitCode) {
            throw new Error(`subprocess error exit ${exitCode}, ${error}`);
        }
        return data;
    }
}

class PicGoDeleter {
    plugin;
    constructor(plugin) {
        this.plugin = plugin;
    }
    async deleteImage(configMap) {
        const response = await obsidian.requestUrl({
            url: this.plugin.settings.deleteServer,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                list: configMap,
            }),
        });
        const data = response.json;
        return data;
    }
}

// ![](./dsa/aa.png) local image should has ext, support ![](<./dsa/aa.png>), support ![](image.png "alt")
// ![](https://dasdasda) internet image should not has ext
const REGEX_FILE = /\!\[(.*?)\]\(<(\S+\.\w+)>\)|\!\[(.*?)\]\((\S+\.\w+)(?:\s+"[^"]*")?\)|\!\[(.*?)\]\((https?:\/\/.*?)\)/g;
const REGEX_WIKI_FILE = /\!\[\[(.*?)(\s*?\|.*?)?\]\]/g;
class Helper {
    app;
    constructor(app) {
        this.app = app;
    }
    getFrontmatterValue(key, defaultValue = undefined) {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            return undefined;
        }
        const path = file.path;
        const cache = this.app.metadataCache.getCache(path);
        let value = defaultValue;
        if (cache?.frontmatter && cache.frontmatter.hasOwnProperty(key)) {
            value = cache.frontmatter[key];
        }
        return value;
    }
    getEditor() {
        const mdView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (mdView) {
            return mdView.editor;
        }
        else {
            return null;
        }
    }
    getValue() {
        const editor = this.getEditor();
        return editor.getValue();
    }
    setValue(value) {
        const editor = this.getEditor();
        const { left, top } = editor.getScrollInfo();
        const position = editor.getCursor();
        editor.setValue(value);
        editor.scrollTo(left, top);
        editor.setCursor(position);
    }
    // get all file urls, include local and internet
    getAllFiles() {
        const editor = this.getEditor();
        let value = editor.getValue();
        return this.getImageLink(value);
    }
    getImageLink(value) {
        const matches = value.matchAll(REGEX_FILE);
        const WikiMatches = value.matchAll(REGEX_WIKI_FILE);
        let fileArray = [];
        for (const match of matches) {
            const source = match[0];
            let name = match[1];
            let path = match[2];
            if (name === undefined) {
                name = match[3];
            }
            if (path === undefined) {
                path = match[4];
            }
            fileArray.push({
                path: path,
                name: name,
                source: source,
            });
        }
        for (const match of WikiMatches) {
            let name = pathBrowserify.parse(match[1]).name;
            const path = match[1];
            const source = match[0];
            if (match[2]) {
                name = `${name}${match[2]}`;
            }
            fileArray.push({
                path: path,
                name: name,
                source: source,
            });
        }
        return fileArray;
    }
    hasBlackDomain(src, blackDomains) {
        if (blackDomains.trim() === "") {
            return false;
        }
        const blackDomainList = blackDomains.split(",").filter(item => item !== "");
        let url = new URL(src);
        const domain = url.hostname;
        return blackDomainList.some(blackDomain => domain.includes(blackDomain));
    }
}

const DEFAULT_SETTINGS = {
    uploadByClipSwitch: true,
    uploader: "PicGo",
    uploadServer: "http://127.0.0.1:36677/upload",
    deleteServer: "http://127.0.0.1:36677/delete",
    imageSizeSuffix: "",
    picgoCorePath: "",
    workOnNetWork: false,
    fixPath: false,
    applyImage: true,
    newWorkBlackDomains: "",
    deleteSource: false,
    imageDesc: "origin",
    remoteServerMode: false,
};
class SettingTab extends obsidian.PluginSettingTab {
    plugin;
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        let { containerEl } = this;
        const os = getOS();
        containerEl.empty();
        containerEl.createEl("h2", { text: t("Plugin Settings") });
        new obsidian.Setting(containerEl)
            .setName(t("Auto pasted upload"))
            .setDesc(t("If you set this value true, when you paste image, it will be auto uploaded(you should set the picGo server rightly)"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.uploadByClipSwitch)
            .onChange(async (value) => {
            this.plugin.settings.uploadByClipSwitch = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName(t("Default uploader"))
            .setDesc(t("Default uploader"))
            .addDropdown(cb => cb
            .addOption("PicGo", "PicGo(app)")
            .addOption("PicGo-Core", "PicGo-Core")
            .setValue(this.plugin.settings.uploader)
            .onChange(async (value) => {
            this.plugin.settings.uploader = value;
            this.display();
            await this.plugin.saveSettings();
        }));
        if (this.plugin.settings.uploader === "PicGo") {
            new obsidian.Setting(containerEl)
                .setName(t("PicGo server"))
                .setDesc(t("PicGo server desc"))
                .addText(text => text
                .setPlaceholder(t("Please input PicGo server"))
                .setValue(this.plugin.settings.uploadServer)
                .onChange(async (key) => {
                this.plugin.settings.uploadServer = key;
                await this.plugin.saveSettings();
            }));
            new obsidian.Setting(containerEl)
                .setName(t("PicGo delete server"))
                .setDesc(t("PicList desc"))
                .addText(text => text
                .setPlaceholder(t("Please input PicGo delete server"))
                .setValue(this.plugin.settings.deleteServer)
                .onChange(async (key) => {
                this.plugin.settings.deleteServer = key;
                await this.plugin.saveSettings();
            }));
        }
        new obsidian.Setting(containerEl)
            .setName(t("Remote server mode"))
            .setDesc(t("Remote server mode desc"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.remoteServerMode)
            .onChange(async (value) => {
            this.plugin.settings.remoteServerMode = value;
            if (value) {
                this.plugin.settings.workOnNetWork = false;
            }
            this.display();
            await this.plugin.saveSettings();
        }));
        if (this.plugin.settings.uploader === "PicGo-Core") {
            new obsidian.Setting(containerEl)
                .setName(t("PicGo-Core path"))
                .setDesc(t("Please input PicGo-Core path, default using environment variables"))
                .addText(text => text
                .setPlaceholder("")
                .setValue(this.plugin.settings.picgoCorePath)
                .onChange(async (value) => {
                this.plugin.settings.picgoCorePath = value;
                await this.plugin.saveSettings();
            }));
            if (os !== "Windows") {
                new obsidian.Setting(containerEl)
                    .setName(t("fixPath"))
                    .setDesc(t("fixPathWarning"))
                    .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.fixPath)
                    .onChange(async (value) => {
                    this.plugin.settings.fixPath = value;
                    await this.plugin.saveSettings();
                }));
            }
        }
        // image desc setting
        new obsidian.Setting(containerEl)
            .setName(t("Image desc"))
            .setDesc(t("Image desc"))
            .addDropdown(cb => cb
            .addOption("origin", t("reserve")) // 保留全部
            .addOption("none", t("remove all")) // 移除全部
            .addOption("removeDefault", t("remove default")) // 只移除默认即 image.png
            .setValue(this.plugin.settings.imageDesc)
            .onChange(async (value) => {
            this.plugin.settings.imageDesc = value;
            this.display();
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName(t("Image size suffix"))
            .setDesc(t("Image size suffix Description"))
            .addText(text => text
            .setPlaceholder(t("Please input image size suffix"))
            .setValue(this.plugin.settings.imageSizeSuffix)
            .onChange(async (key) => {
            this.plugin.settings.imageSizeSuffix = key;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName(t("Work on network"))
            .setDesc(t("Work on network Description"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.workOnNetWork)
            .onChange(async (value) => {
            if (this.plugin.settings.remoteServerMode) {
                new obsidian.Notice("Can only work when remote server mode is off.");
                this.plugin.settings.workOnNetWork = false;
            }
            else {
                this.plugin.settings.workOnNetWork = value;
            }
            this.display();
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName(t("Network Domain Black List"))
            .setDesc(t("Network Domain Black List Description"))
            .addTextArea(textArea => textArea
            .setValue(this.plugin.settings.newWorkBlackDomains)
            .onChange(async (value) => {
            this.plugin.settings.newWorkBlackDomains = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName(t("Upload when clipboard has image and text together"))
            .setDesc(t("When you copy, some application like Excel will image and text to clipboard, you can upload or not."))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.applyImage)
            .onChange(async (value) => {
            this.plugin.settings.applyImage = value;
            this.display();
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName(t("Delete source file after you upload file"))
            .setDesc(t("Delete source file in ob assets after you upload file."))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.deleteSource)
            .onChange(async (value) => {
            this.plugin.settings.deleteSource = value;
            this.display();
            await this.plugin.saveSettings();
        }));
    }
}

class imageAutoUploadPlugin extends obsidian.Plugin {
    settings;
    helper;
    editor;
    picGoUploader;
    picGoDeleter;
    picGoCoreUploader;
    uploader;
    async loadSettings() {
        this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    onunload() { }
    async onload() {
        await this.loadSettings();
        this.helper = new Helper(this.app);
        this.picGoUploader = new PicGoUploader(this.settings, this);
        this.picGoDeleter = new PicGoDeleter(this);
        this.picGoCoreUploader = new PicGoCoreUploader(this.settings, this);
        if (this.settings.uploader === "PicGo") {
            this.uploader = this.picGoUploader;
        }
        else if (this.settings.uploader === "PicGo-Core") {
            this.uploader = this.picGoCoreUploader;
            if (this.settings.fixPath) {
                fixPath();
            }
        }
        else {
            new obsidian.Notice("unknown uploader");
        }
        obsidian.addIcon("upload", `<svg t="1636630783429" class="icon" viewBox="0 0 100 100" version="1.1" p-id="4649" xmlns="http://www.w3.org/2000/svg">
      <path d="M 71.638 35.336 L 79.408 35.336 C 83.7 35.336 87.178 38.662 87.178 42.765 L 87.178 84.864 C 87.178 88.969 83.7 92.295 79.408 92.295 L 17.249 92.295 C 12.957 92.295 9.479 88.969 9.479 84.864 L 9.479 42.765 C 9.479 38.662 12.957 35.336 17.249 35.336 L 25.019 35.336 L 25.019 42.765 L 17.249 42.765 L 17.249 84.864 L 79.408 84.864 L 79.408 42.765 L 71.638 42.765 L 71.638 35.336 Z M 49.014 10.179 L 67.326 27.688 L 61.835 32.942 L 52.849 24.352 L 52.849 59.731 L 45.078 59.731 L 45.078 24.455 L 36.194 32.947 L 30.702 27.692 L 49.012 10.181 Z" p-id="4650" fill="#8a8a8a"></path>
    </svg>`);
        this.addSettingTab(new SettingTab(this.app, this));
        this.addCommand({
            id: "Upload all images",
            name: "Upload all images",
            checkCallback: (checking) => {
                let leaf = this.app.workspace.activeLeaf;
                if (leaf) {
                    if (!checking) {
                        this.uploadAllFile();
                    }
                    return true;
                }
                return false;
            },
        });
        this.addCommand({
            id: "Download all images",
            name: "Download all images",
            checkCallback: (checking) => {
                let leaf = this.app.workspace.activeLeaf;
                if (leaf) {
                    if (!checking) {
                        downloadAllImageFiles(this);
                    }
                    return true;
                }
                return false;
            },
        });
        this.setupPasteHandler();
        this.registerFileMenu();
        this.registerSelection();
    }
    registerSelection() {
        this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, info) => {
            if (this.app.workspace.getLeavesOfType("markdown").length === 0) {
                return;
            }
            const selection = editor.getSelection();
            if (selection) {
                const markdownRegex = /!\[.*\]\((.*)\)/g;
                const markdownMatch = markdownRegex.exec(selection);
                if (markdownMatch && markdownMatch.length > 1) {
                    const markdownUrl = markdownMatch[1];
                    if (this.settings.uploadedImages.find((item) => item.imgUrl === markdownUrl)) {
                        this.addMenu(menu, markdownUrl, editor);
                    }
                }
            }
        }));
    }
    addMenu = (menu, imgPath, editor) => {
        menu.addItem((item) => item
            .setIcon("trash-2")
            .setTitle(t("Delete image using PicList"))
            .onClick(async () => {
            try {
                const selectedItem = this.settings.uploadedImages.find((item) => item.imgUrl === imgPath);
                if (selectedItem) {
                    const res = await this.picGoDeleter.deleteImage([selectedItem]);
                    if (res.success) {
                        new obsidian.Notice(t("Delete successfully"));
                        const selection = editor.getSelection();
                        if (selection) {
                            editor.replaceSelection("");
                        }
                        this.settings.uploadedImages =
                            this.settings.uploadedImages.filter((item) => item.imgUrl !== imgPath);
                        this.saveSettings();
                    }
                    else {
                        new obsidian.Notice(t("Delete failed"));
                    }
                }
            }
            catch {
                new obsidian.Notice(t("Error, could not delete"));
            }
        }));
    };
    registerFileMenu() {
        this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
            if (source === "canvas-menu")
                return false;
            if (!isAssetTypeAnImage(file.path))
                return false;
            menu.addItem((item) => {
                item
                    .setTitle("Upload")
                    .setIcon("upload")
                    .onClick(() => {
                    if (!(file instanceof obsidian.TFile)) {
                        return false;
                    }
                    this.fileMenuUpload(file);
                });
            });
        }));
    }
    fileMenuUpload(file) {
        let content = this.helper.getValue();
        const basePath = this.app.vault.adapter.getBasePath();
        let imageList = [];
        const fileArray = this.helper.getAllFiles();
        for (const match of fileArray) {
            const imageName = match.name;
            const encodedUri = match.path;
            const fileName = pathBrowserify.basename(decodeURI(encodedUri));
            if (file && file.name === fileName) {
                const abstractImageFile = pathBrowserify.join(basePath, file.path);
                if (isAssetTypeAnImage(abstractImageFile)) {
                    imageList.push({
                        path: abstractImageFile,
                        name: imageName,
                        source: match.source,
                    });
                }
            }
        }
        if (imageList.length === 0) {
            new obsidian.Notice(t("Can not find image file"));
            return;
        }
        this.uploader.uploadFiles(imageList.map(item => item.path)).then(res => {
            if (res.success) {
                let uploadUrlList = res.result;
                imageList.map(item => {
                    const uploadImage = uploadUrlList.shift();
                    let name = this.handleName(item.name);
                    content = content.replaceAll(item.source, `![${name}](${uploadImage})`);
                });
                this.helper.setValue(content);
                if (this.settings.deleteSource) {
                    imageList.map(image => {
                        if (!image.path.startsWith("http")) {
                            require$$0.unlink(image.path, () => { });
                        }
                    });
                }
            }
            else {
                new obsidian.Notice("Upload error");
            }
        });
    }
    filterFile(fileArray) {
        const imageList = [];
        for (const match of fileArray) {
            if (match.path.startsWith("http")) {
                if (this.settings.workOnNetWork) {
                    if (!this.helper.hasBlackDomain(match.path, this.settings.newWorkBlackDomains)) {
                        imageList.push({
                            path: match.path,
                            name: match.name,
                            source: match.source,
                        });
                    }
                }
            }
            else {
                imageList.push({
                    path: match.path,
                    name: match.name,
                    source: match.source,
                });
            }
        }
        return imageList;
    }
    getFile(fileName, fileMap) {
        if (!fileMap) {
            fileMap = arrayToObject(this.app.vault.getFiles(), "name");
        }
        return fileMap[fileName];
    }
    // uploda all file
    uploadAllFile() {
        let content = this.helper.getValue();
        const basePath = this.app.vault.adapter.getBasePath();
        const activeFile = this.app.workspace.getActiveFile();
        const fileMap = arrayToObject(this.app.vault.getFiles(), "name");
        const filePathMap = arrayToObject(this.app.vault.getFiles(), "path");
        let imageList = [];
        const fileArray = this.filterFile(this.helper.getAllFiles());
        for (const match of fileArray) {
            const imageName = match.name;
            const encodedUri = match.path;
            if (encodedUri.startsWith("http")) {
                imageList.push({
                    path: match.path,
                    name: imageName,
                    source: match.source,
                });
            }
            else {
                const fileName = pathBrowserify.basename(decodeURI(encodedUri));
                let file;
                // 绝对路径
                if (filePathMap[decodeURI(encodedUri)]) {
                    file = filePathMap[decodeURI(encodedUri)];
                }
                // 相对路径
                if ((!file && decodeURI(encodedUri).startsWith("./")) ||
                    decodeURI(encodedUri).startsWith("../")) {
                    const filePath = pathBrowserify.resolve(pathBrowserify.join(basePath, pathBrowserify.dirname(activeFile.path)), decodeURI(encodedUri));
                    if (require$$0.existsSync(filePath)) {
                        const path = obsidian.normalizePath(pathBrowserify.relative(obsidian.normalizePath(basePath), obsidian.normalizePath(pathBrowserify.resolve(pathBrowserify.join(basePath, pathBrowserify.dirname(activeFile.path)), decodeURI(encodedUri)))));
                        file = filePathMap[path];
                    }
                }
                // 尽可能短路径
                if (!file) {
                    file = this.getFile(fileName, fileMap);
                }
                if (file) {
                    const abstractImageFile = pathBrowserify.join(basePath, file.path);
                    if (isAssetTypeAnImage(abstractImageFile)) {
                        imageList.push({
                            path: abstractImageFile,
                            name: imageName,
                            source: match.source,
                        });
                    }
                }
            }
        }
        if (imageList.length === 0) {
            new obsidian.Notice(t("Can not find image file"));
            return;
        }
        else {
            new obsidian.Notice(`共找到${imageList.length}个图像文件，开始上传`);
        }
        this.uploader.uploadFiles(imageList.map(item => item.path)).then(res => {
            if (res.success) {
                let uploadUrlList = res.result;
                if (imageList.length !== uploadUrlList.length) {
                    new obsidian.Notice(t("Warning: upload files is different of reciver files from api"));
                }
                imageList.map(item => {
                    const uploadImage = uploadUrlList.shift();
                    let name = this.handleName(item.name);
                    content = content.replaceAll(item.source, `![${name}](${uploadImage})`);
                });
                const currentFile = this.app.workspace.getActiveFile();
                if (activeFile.path !== currentFile.path) {
                    new obsidian.Notice(t("File has been changedd, upload failure"));
                    return;
                }
                this.helper.setValue(content);
                if (this.settings.deleteSource) {
                    imageList.map(image => {
                        if (!image.path.startsWith("http")) {
                            require$$0.unlink(image.path, () => { });
                        }
                    });
                }
            }
            else {
                new obsidian.Notice("Upload error");
            }
        });
    }
    setupPasteHandler() {
        this.registerEvent(this.app.workspace.on("editor-paste", (evt, editor, markdownView) => {
            const allowUpload = this.helper.getFrontmatterValue("image-auto-upload", this.settings.uploadByClipSwitch);
            evt.clipboardData.files;
            if (!allowUpload) {
                return;
            }
            // 剪贴板内容有md格式的图片时
            if (this.settings.workOnNetWork) {
                const clipboardValue = evt.clipboardData.getData("text/plain");
                const imageList = this.helper
                    .getImageLink(clipboardValue)
                    .filter(image => image.path.startsWith("http"))
                    .filter(image => !this.helper.hasBlackDomain(image.path, this.settings.newWorkBlackDomains));
                if (imageList.length !== 0) {
                    this.uploader
                        .uploadFiles(imageList.map(item => item.path))
                        .then(res => {
                        let value = this.helper.getValue();
                        if (res.success) {
                            let uploadUrlList = res.result;
                            imageList.map(item => {
                                const uploadImage = uploadUrlList.shift();
                                let name = this.handleName(item.name);
                                value = value.replaceAll(item.source, `![${name}](${uploadImage})`);
                            });
                            this.helper.setValue(value);
                        }
                        else {
                            new obsidian.Notice("Upload error");
                        }
                    });
                }
            }
            // 剪贴板中是图片时进行上传
            if (this.canUpload(evt.clipboardData)) {
                this.uploadFileAndEmbedImgurImage(editor, async (editor, pasteId) => {
                    let res;
                    res = await this.uploader.uploadFileByClipboard(evt.clipboardData.files);
                    if (res.code !== 0) {
                        this.handleFailedUpload(editor, pasteId, res.msg);
                        return;
                    }
                    const url = res.data;
                    return url;
                }, evt.clipboardData).catch();
                evt.preventDefault();
            }
        }));
        this.registerEvent(this.app.workspace.on("editor-drop", async (evt, editor, markdownView) => {
            // when ctrl key is pressed, do not upload image, because it is used to set local file
            if (evt.ctrlKey) {
                return;
            }
            const allowUpload = this.helper.getFrontmatterValue("image-auto-upload", this.settings.uploadByClipSwitch);
            let files = evt.dataTransfer.files;
            if (!allowUpload) {
                return;
            }
            if (files.length !== 0 && files[0].type.startsWith("image")) {
                let sendFiles = [];
                let files = evt.dataTransfer.files;
                Array.from(files).forEach((item, index) => {
                    if (item.path) {
                        sendFiles.push(item.path);
                    }
                    else {
                        const { webUtils } = require("electron");
                        const path = webUtils.getPathForFile(item);
                        sendFiles.push(path);
                    }
                });
                evt.preventDefault();
                const data = await this.uploader.uploadFiles(sendFiles);
                if (data.success) {
                    data.result.map((value) => {
                        let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
                        this.insertTemporaryText(editor, pasteId);
                        this.embedMarkDownImage(editor, pasteId, value, files[0].name);
                    });
                }
                else {
                    new obsidian.Notice("Upload error");
                }
            }
        }));
    }
    canUpload(clipboardData) {
        this.settings.applyImage;
        const files = clipboardData.files;
        const text = clipboardData.getData("text");
        const hasImageFile = files.length !== 0 && files[0].type.startsWith("image");
        if (hasImageFile) {
            if (!!text) {
                return this.settings.applyImage;
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }
    async uploadFileAndEmbedImgurImage(editor, callback, clipboardData) {
        let pasteId = (Math.random() + 1).toString(36).substr(2, 5);
        this.insertTemporaryText(editor, pasteId);
        const name = clipboardData.files[0].name;
        try {
            const url = await callback(editor, pasteId);
            this.embedMarkDownImage(editor, pasteId, url, name);
        }
        catch (e) {
            this.handleFailedUpload(editor, pasteId, e);
        }
    }
    insertTemporaryText(editor, pasteId) {
        let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
        editor.replaceSelection(progressText + "\n");
    }
    static progressTextFor(id) {
        return `![Uploading file...${id}]()`;
    }
    embedMarkDownImage(editor, pasteId, imageUrl, name = "") {
        let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
        name = this.handleName(name);
        let markDownImage = `![${name}](${imageUrl})`;
        imageAutoUploadPlugin.replaceFirstOccurrence(editor, progressText, markDownImage);
    }
    handleFailedUpload(editor, pasteId, reason) {
        new obsidian.Notice(reason);
        console.error("Failed request: ", reason);
        let progressText = imageAutoUploadPlugin.progressTextFor(pasteId);
        imageAutoUploadPlugin.replaceFirstOccurrence(editor, progressText, "⚠️upload failed, check dev console");
    }
    handleName(name) {
        const imageSizeSuffix = this.settings.imageSizeSuffix || "";
        if (this.settings.imageDesc === "origin") {
            return `${name}${imageSizeSuffix}`;
        }
        else if (this.settings.imageDesc === "none") {
            return "";
        }
        else if (this.settings.imageDesc === "removeDefault") {
            if (name === "image.png") {
                return "";
            }
            else {
                return `${name}${imageSizeSuffix}`;
            }
        }
        else {
            return `${name}${imageSizeSuffix}`;
        }
    }
    static replaceFirstOccurrence(editor, target, replacement) {
        let lines = editor.getValue().split("\n");
        for (let i = 0; i < lines.length; i++) {
            let ch = lines[i].indexOf(target);
            if (ch != -1) {
                let from = { line: i, ch: ch };
                let to = { line: i, ch: ch + target.length };
                editor.replaceRange(replacement, from, to);
                break;
            }
        }
    }
}

module.exports = imageAutoUploadPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzLy5wbnBtL3BhdGgtYnJvd3NlcmlmeUAxLjAuMS9ub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2lzZXhlQDIuMC4wL25vZGVfbW9kdWxlcy9pc2V4ZS93aW5kb3dzLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2lzZXhlQDIuMC4wL25vZGVfbW9kdWxlcy9pc2V4ZS9tb2RlLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2lzZXhlQDIuMC4wL25vZGVfbW9kdWxlcy9pc2V4ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS93aGljaEAyLjAuMi9ub2RlX21vZHVsZXMvd2hpY2gvd2hpY2guanMiLCJub2RlX21vZHVsZXMvLnBucG0vcGF0aC1rZXlAMy4xLjEvbm9kZV9tb2R1bGVzL3BhdGgta2V5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2Nyb3NzLXNwYXduQDcuMC4zL25vZGVfbW9kdWxlcy9jcm9zcy1zcGF3bi9saWIvdXRpbC9yZXNvbHZlQ29tbWFuZC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9jcm9zcy1zcGF3bkA3LjAuMy9ub2RlX21vZHVsZXMvY3Jvc3Mtc3Bhd24vbGliL3V0aWwvZXNjYXBlLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3NoZWJhbmctcmVnZXhAMy4wLjAvbm9kZV9tb2R1bGVzL3NoZWJhbmctcmVnZXgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vc2hlYmFuZy1jb21tYW5kQDIuMC4wL25vZGVfbW9kdWxlcy9zaGViYW5nLWNvbW1hbmQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vY3Jvc3Mtc3Bhd25ANy4wLjMvbm9kZV9tb2R1bGVzL2Nyb3NzLXNwYXduL2xpYi91dGlsL3JlYWRTaGViYW5nLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2Nyb3NzLXNwYXduQDcuMC4zL25vZGVfbW9kdWxlcy9jcm9zcy1zcGF3bi9saWIvcGFyc2UuanMiLCJub2RlX21vZHVsZXMvLnBucG0vY3Jvc3Mtc3Bhd25ANy4wLjMvbm9kZV9tb2R1bGVzL2Nyb3NzLXNwYXduL2xpYi9lbm9lbnQuanMiLCJub2RlX21vZHVsZXMvLnBucG0vY3Jvc3Mtc3Bhd25ANy4wLjMvbm9kZV9tb2R1bGVzL2Nyb3NzLXNwYXduL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3N0cmlwLWZpbmFsLW5ld2xpbmVAMi4wLjAvbm9kZV9tb2R1bGVzL3N0cmlwLWZpbmFsLW5ld2xpbmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vbnBtLXJ1bi1wYXRoQDQuMC4xL25vZGVfbW9kdWxlcy9ucG0tcnVuLXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vbWltaWMtZm5AMi4xLjAvbm9kZV9tb2R1bGVzL21pbWljLWZuL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL29uZXRpbWVANS4xLjIvbm9kZV9tb2R1bGVzL29uZXRpbWUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vaHVtYW4tc2lnbmFsc0AyLjEuMC9ub2RlX21vZHVsZXMvaHVtYW4tc2lnbmFscy9idWlsZC9zcmMvY29yZS5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9odW1hbi1zaWduYWxzQDIuMS4wL25vZGVfbW9kdWxlcy9odW1hbi1zaWduYWxzL2J1aWxkL3NyYy9yZWFsdGltZS5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9odW1hbi1zaWduYWxzQDIuMS4wL25vZGVfbW9kdWxlcy9odW1hbi1zaWduYWxzL2J1aWxkL3NyYy9zaWduYWxzLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2h1bWFuLXNpZ25hbHNAMi4xLjAvbm9kZV9tb2R1bGVzL2h1bWFuLXNpZ25hbHMvYnVpbGQvc3JjL21haW4uanMiLCJub2RlX21vZHVsZXMvLnBucG0vZXhlY2FANS4xLjEvbm9kZV9tb2R1bGVzL2V4ZWNhL2xpYi9lcnJvci5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9leGVjYUA1LjEuMS9ub2RlX21vZHVsZXMvZXhlY2EvbGliL3N0ZGlvLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3NpZ25hbC1leGl0QDMuMC43L25vZGVfbW9kdWxlcy9zaWduYWwtZXhpdC9zaWduYWxzLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3NpZ25hbC1leGl0QDMuMC43L25vZGVfbW9kdWxlcy9zaWduYWwtZXhpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9leGVjYUA1LjEuMS9ub2RlX21vZHVsZXMvZXhlY2EvbGliL2tpbGwuanMiLCJub2RlX21vZHVsZXMvLnBucG0vaXMtc3RyZWFtQDIuMC4xL25vZGVfbW9kdWxlcy9pcy1zdHJlYW0vaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vZ2V0LXN0cmVhbUA2LjAuMS9ub2RlX21vZHVsZXMvZ2V0LXN0cmVhbS9idWZmZXItc3RyZWFtLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2dldC1zdHJlYW1ANi4wLjEvbm9kZV9tb2R1bGVzL2dldC1zdHJlYW0vaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vbWVyZ2Utc3RyZWFtQDIuMC4wL25vZGVfbW9kdWxlcy9tZXJnZS1zdHJlYW0vaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vZXhlY2FANS4xLjEvbm9kZV9tb2R1bGVzL2V4ZWNhL2xpYi9zdHJlYW0uanMiLCJub2RlX21vZHVsZXMvLnBucG0vZXhlY2FANS4xLjEvbm9kZV9tb2R1bGVzL2V4ZWNhL2xpYi9wcm9taXNlLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2V4ZWNhQDUuMS4xL25vZGVfbW9kdWxlcy9leGVjYS9saWIvY29tbWFuZC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9leGVjYUA1LjEuMS9ub2RlX21vZHVsZXMvZXhlY2EvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vYW5zaS1yZWdleEA2LjEuMC9ub2RlX21vZHVsZXMvYW5zaS1yZWdleC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9zdHJpcC1hbnNpQDcuMS4wL25vZGVfbW9kdWxlcy9zdHJpcC1hbnNpL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2RlZmF1bHQtc2hlbGxAMi4yLjAvbm9kZV9tb2R1bGVzL2RlZmF1bHQtc2hlbGwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vc2hlbGwtZW52QDQuMC4xL25vZGVfbW9kdWxlcy9zaGVsbC1lbnYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvLnBucG0vc2hlbGwtcGF0aEAzLjAuMC9ub2RlX21vZHVsZXMvc2hlbGwtcGF0aC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9maXgtcGF0aEA0LjAuMC9ub2RlX21vZHVsZXMvZml4LXBhdGgvaW5kZXguanMiLCJzcmMvdXRpbHMudHMiLCJub2RlX21vZHVsZXMvLnBucG0vdG9rZW4tdHlwZXNANS4wLjEvbm9kZV9tb2R1bGVzL3Rva2VuLXR5cGVzL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9wZWVrLXJlYWRhYmxlQDUuMy4xL25vZGVfbW9kdWxlcy9wZWVrLXJlYWRhYmxlL2xpYi9FbmRPZlN0cmVhbUVycm9yLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3BlZWstcmVhZGFibGVANS4zLjEvbm9kZV9tb2R1bGVzL3BlZWstcmVhZGFibGUvbGliL0RlZmVycmVkLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3BlZWstcmVhZGFibGVANS4zLjEvbm9kZV9tb2R1bGVzL3BlZWstcmVhZGFibGUvbGliL0Fic3RyYWN0U3RyZWFtUmVhZGVyLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3BlZWstcmVhZGFibGVANS4zLjEvbm9kZV9tb2R1bGVzL3BlZWstcmVhZGFibGUvbGliL1N0cmVhbVJlYWRlci5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9zdHJ0b2szQDcuMS4xL25vZGVfbW9kdWxlcy9zdHJ0b2szL2xpYi9BYnN0cmFjdFRva2VuaXplci5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9zdHJ0b2szQDcuMS4xL25vZGVfbW9kdWxlcy9zdHJ0b2szL2xpYi9SZWFkU3RyZWFtVG9rZW5pemVyLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL3N0cnRvazNANy4xLjEvbm9kZV9tb2R1bGVzL3N0cnRvazMvbGliL0J1ZmZlclRva2VuaXplci5qcyIsIm5vZGVfbW9kdWxlcy8ucG5wbS9zdHJ0b2szQDcuMS4xL25vZGVfbW9kdWxlcy9zdHJ0b2szL2xpYi9jb3JlLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2ZpbGUtdHlwZUAxOC43LjAvbm9kZV9tb2R1bGVzL2ZpbGUtdHlwZS91dGlsLmpzIiwibm9kZV9tb2R1bGVzLy5wbnBtL2ZpbGUtdHlwZUAxOC43LjAvbm9kZV9tb2R1bGVzL2ZpbGUtdHlwZS9zdXBwb3J0ZWQuanMiLCJub2RlX21vZHVsZXMvLnBucG0vZmlsZS10eXBlQDE4LjcuMC9ub2RlX21vZHVsZXMvZmlsZS10eXBlL2NvcmUuanMiLCJub2RlX21vZHVsZXMvLnBucG0vaW1hZ2UtdHlwZUA1LjIuMC9ub2RlX21vZHVsZXMvaW1hZ2UtdHlwZS9pbmRleC5qcyIsInNyYy9sYW5nL2xvY2FsZS9hci50cyIsInNyYy9sYW5nL2xvY2FsZS9jei50cyIsInNyYy9sYW5nL2xvY2FsZS9kYS50cyIsInNyYy9sYW5nL2xvY2FsZS9kZS50cyIsInNyYy9sYW5nL2xvY2FsZS9lbi50cyIsInNyYy9sYW5nL2xvY2FsZS9lbi1nYi50cyIsInNyYy9sYW5nL2xvY2FsZS9lcy50cyIsInNyYy9sYW5nL2xvY2FsZS9mci50cyIsInNyYy9sYW5nL2xvY2FsZS9oaS50cyIsInNyYy9sYW5nL2xvY2FsZS9pZC50cyIsInNyYy9sYW5nL2xvY2FsZS9pdC50cyIsInNyYy9sYW5nL2xvY2FsZS9qYS50cyIsInNyYy9sYW5nL2xvY2FsZS9rby50cyIsInNyYy9sYW5nL2xvY2FsZS9ubC50cyIsInNyYy9sYW5nL2xvY2FsZS9uby50cyIsInNyYy9sYW5nL2xvY2FsZS9wbC50cyIsInNyYy9sYW5nL2xvY2FsZS9wdC50cyIsInNyYy9sYW5nL2xvY2FsZS9wdC1ici50cyIsInNyYy9sYW5nL2xvY2FsZS9yby50cyIsInNyYy9sYW5nL2xvY2FsZS9ydS50cyIsInNyYy9sYW5nL2xvY2FsZS90ci50cyIsInNyYy9sYW5nL2xvY2FsZS96aC1jbi50cyIsInNyYy9sYW5nL2xvY2FsZS96aC10dy50cyIsInNyYy9sYW5nL2hlbHBlcnMudHMiLCJzcmMvZG93bmxvYWQudHMiLCJzcmMvdXBsb2FkZXIudHMiLCJzcmMvZGVsZXRlci50cyIsInNyYy9oZWxwZXIudHMiLCJzcmMvc2V0dGluZy50cyIsInNyYy9tYWluLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vICdwYXRoJyBtb2R1bGUgZXh0cmFjdGVkIGZyb20gTm9kZS5qcyB2OC4xMS4xIChvbmx5IHRoZSBwb3NpeCBwYXJ0KVxuLy8gdHJhbnNwbGl0ZWQgd2l0aCBCYWJlbFxuXG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBhc3NlcnRQYXRoKHBhdGgpIHtcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1BhdGggbXVzdCBiZSBhIHN0cmluZy4gUmVjZWl2ZWQgJyArIEpTT04uc3RyaW5naWZ5KHBhdGgpKTtcbiAgfVxufVxuXG4vLyBSZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggd2l0aCBkaXJlY3RvcnkgbmFtZXNcbmZ1bmN0aW9uIG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHBhdGgsIGFsbG93QWJvdmVSb290KSB7XG4gIHZhciByZXMgPSAnJztcbiAgdmFyIGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcbiAgdmFyIGxhc3RTbGFzaCA9IC0xO1xuICB2YXIgZG90cyA9IDA7XG4gIHZhciBjb2RlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8PSBwYXRoLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGkgPCBwYXRoLmxlbmd0aClcbiAgICAgIGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG4gICAgZWxzZSBpZiAoY29kZSA9PT0gNDcgLyovKi8pXG4gICAgICBicmVhaztcbiAgICBlbHNlXG4gICAgICBjb2RlID0gNDcgLyovKi87XG4gICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICBpZiAobGFzdFNsYXNoID09PSBpIC0gMSB8fCBkb3RzID09PSAxKSB7XG4gICAgICAgIC8vIE5PT1BcbiAgICAgIH0gZWxzZSBpZiAobGFzdFNsYXNoICE9PSBpIC0gMSAmJiBkb3RzID09PSAyKSB7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoIDwgMiB8fCBsYXN0U2VnbWVudExlbmd0aCAhPT0gMiB8fCByZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMSkgIT09IDQ2IC8qLiovIHx8IHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAyKSAhPT0gNDYgLyouKi8pIHtcbiAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBsYXN0U2xhc2hJbmRleCA9IHJlcy5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgaWYgKGxhc3RTbGFzaEluZGV4ICE9PSByZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICBpZiAobGFzdFNsYXNoSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gJyc7XG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5zbGljZSgwLCBsYXN0U2xhc2hJbmRleCk7XG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxhc3RTbGFzaCA9IGk7XG4gICAgICAgICAgICAgIGRvdHMgPSAwO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPT09IDIgfHwgcmVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmVzID0gJyc7XG4gICAgICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG4gICAgICAgICAgICBsYXN0U2xhc2ggPSBpO1xuICAgICAgICAgICAgZG90cyA9IDA7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKVxuICAgICAgICAgICAgcmVzICs9ICcvLi4nO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJlcyA9ICcuLic7XG4gICAgICAgICAgbGFzdFNlZ21lbnRMZW5ndGggPSAyO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApXG4gICAgICAgICAgcmVzICs9ICcvJyArIHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXMgPSBwYXRoLnNsaWNlKGxhc3RTbGFzaCArIDEsIGkpO1xuICAgICAgICBsYXN0U2VnbWVudExlbmd0aCA9IGkgLSBsYXN0U2xhc2ggLSAxO1xuICAgICAgfVxuICAgICAgbGFzdFNsYXNoID0gaTtcbiAgICAgIGRvdHMgPSAwO1xuICAgIH0gZWxzZSBpZiAoY29kZSA9PT0gNDYgLyouKi8gJiYgZG90cyAhPT0gLTEpIHtcbiAgICAgICsrZG90cztcbiAgICB9IGVsc2Uge1xuICAgICAgZG90cyA9IC0xO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5mdW5jdGlvbiBfZm9ybWF0KHNlcCwgcGF0aE9iamVjdCkge1xuICB2YXIgZGlyID0gcGF0aE9iamVjdC5kaXIgfHwgcGF0aE9iamVjdC5yb290O1xuICB2YXIgYmFzZSA9IHBhdGhPYmplY3QuYmFzZSB8fCAocGF0aE9iamVjdC5uYW1lIHx8ICcnKSArIChwYXRoT2JqZWN0LmV4dCB8fCAnJyk7XG4gIGlmICghZGlyKSB7XG4gICAgcmV0dXJuIGJhc2U7XG4gIH1cbiAgaWYgKGRpciA9PT0gcGF0aE9iamVjdC5yb290KSB7XG4gICAgcmV0dXJuIGRpciArIGJhc2U7XG4gIH1cbiAgcmV0dXJuIGRpciArIHNlcCArIGJhc2U7XG59XG5cbnZhciBwb3NpeCA9IHtcbiAgLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuICByZXNvbHZlOiBmdW5jdGlvbiByZXNvbHZlKCkge1xuICAgIHZhciByZXNvbHZlZFBhdGggPSAnJztcbiAgICB2YXIgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuICAgIHZhciBjd2Q7XG5cbiAgICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgICAgdmFyIHBhdGg7XG4gICAgICBpZiAoaSA+PSAwKVxuICAgICAgICBwYXRoID0gYXJndW1lbnRzW2ldO1xuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChjd2QgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgICAgICBwYXRoID0gY3dkO1xuICAgICAgfVxuXG4gICAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgICAvLyBTa2lwIGVtcHR5IGVudHJpZXNcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICAgIH1cblxuICAgIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAgIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICAgIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHJlc29sdmVkUGF0aCwgIXJlc29sdmVkQWJzb2x1dGUpO1xuXG4gICAgaWYgKHJlc29sdmVkQWJzb2x1dGUpIHtcbiAgICAgIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcbiAgICAgICAgcmV0dXJuICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuICcvJztcbiAgICB9IGVsc2UgaWYgKHJlc29sdmVkUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZWRQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJy4nO1xuICAgIH1cbiAgfSxcblxuICBub3JtYWxpemU6IGZ1bmN0aW9uIG5vcm1hbGl6ZShwYXRoKSB7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcuJztcblxuICAgIHZhciBpc0Fic29sdXRlID0gcGF0aC5jaGFyQ29kZUF0KDApID09PSA0NyAvKi8qLztcbiAgICB2YXIgdHJhaWxpbmdTZXBhcmF0b3IgPSBwYXRoLmNoYXJDb2RlQXQocGF0aC5sZW5ndGggLSAxKSA9PT0gNDcgLyovKi87XG5cbiAgICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgICBwYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aCwgIWlzQWJzb2x1dGUpO1xuXG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwICYmICFpc0Fic29sdXRlKSBwYXRoID0gJy4nO1xuICAgIGlmIChwYXRoLmxlbmd0aCA+IDAgJiYgdHJhaWxpbmdTZXBhcmF0b3IpIHBhdGggKz0gJy8nO1xuXG4gICAgaWYgKGlzQWJzb2x1dGUpIHJldHVybiAnLycgKyBwYXRoO1xuICAgIHJldHVybiBwYXRoO1xuICB9LFxuXG4gIGlzQWJzb2x1dGU6IGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgcmV0dXJuIHBhdGgubGVuZ3RoID4gMCAmJiBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuICB9LFxuXG4gIGpvaW46IGZ1bmN0aW9uIGpvaW4oKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gJy4nO1xuICAgIHZhciBqb2luZWQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgICBhc3NlcnRQYXRoKGFyZyk7XG4gICAgICBpZiAoYXJnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIGpvaW5lZCA9IGFyZztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGpvaW5lZCArPSAnLycgKyBhcmc7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChqb2luZWQgPT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiAnLic7XG4gICAgcmV0dXJuIHBvc2l4Lm5vcm1hbGl6ZShqb2luZWQpO1xuICB9LFxuXG4gIHJlbGF0aXZlOiBmdW5jdGlvbiByZWxhdGl2ZShmcm9tLCB0bykge1xuICAgIGFzc2VydFBhdGgoZnJvbSk7XG4gICAgYXNzZXJ0UGF0aCh0byk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiAnJztcblxuICAgIGZyb20gPSBwb3NpeC5yZXNvbHZlKGZyb20pO1xuICAgIHRvID0gcG9zaXgucmVzb2x2ZSh0byk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiAnJztcblxuICAgIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgICB2YXIgZnJvbVN0YXJ0ID0gMTtcbiAgICBmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbS5sZW5ndGg7ICsrZnJvbVN0YXJ0KSB7XG4gICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCkgIT09IDQ3IC8qLyovKVxuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIGZyb21FbmQgPSBmcm9tLmxlbmd0aDtcbiAgICB2YXIgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cbiAgICAvLyBUcmltIGFueSBsZWFkaW5nIGJhY2tzbGFzaGVzXG4gICAgdmFyIHRvU3RhcnQgPSAxO1xuICAgIGZvciAoOyB0b1N0YXJ0IDwgdG8ubGVuZ3RoOyArK3RvU3RhcnQpIHtcbiAgICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpICE9PSA0NyAvKi8qLylcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHZhciB0b0VuZCA9IHRvLmxlbmd0aDtcbiAgICB2YXIgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cbiAgICAvLyBDb21wYXJlIHBhdGhzIHRvIGZpbmQgdGhlIGxvbmdlc3QgY29tbW9uIHBhdGggZnJvbSByb290XG4gICAgdmFyIGxlbmd0aCA9IGZyb21MZW4gPCB0b0xlbiA/IGZyb21MZW4gOiB0b0xlbjtcbiAgICB2YXIgbGFzdENvbW1vblNlcCA9IC0xO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IgKDsgaSA8PSBsZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGkgPT09IGxlbmd0aCkge1xuICAgICAgICBpZiAodG9MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYHRvYC5cbiAgICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPScvZm9vL2Jhcic7IHRvPScvZm9vL2Jhci9iYXonXG4gICAgICAgICAgICByZXR1cm4gdG8uc2xpY2UodG9TdGFydCArIGkgKyAxKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgcm9vdFxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy8nOyB0bz0nL2ZvbydcbiAgICAgICAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGZyb21MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSA0NyAvKi8qLykge1xuICAgICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG4gICAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nL2Zvby9iYXIvYmF6JzsgdG89Jy9mb28vYmFyJ1xuICAgICAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpID09PSAwKSB7XG4gICAgICAgICAgICAvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSByb290LlxuICAgICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209Jy9mb28nOyB0bz0nLydcbiAgICAgICAgICAgIGxhc3RDb21tb25TZXAgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcbiAgICAgIHZhciB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcbiAgICAgIGlmIChmcm9tQ29kZSAhPT0gdG9Db2RlKVxuICAgICAgICBicmVhaztcbiAgICAgIGVsc2UgaWYgKGZyb21Db2RlID09PSA0NyAvKi8qLylcbiAgICAgICAgbGFzdENvbW1vblNlcCA9IGk7XG4gICAgfVxuXG4gICAgdmFyIG91dCA9ICcnO1xuICAgIC8vIEdlbmVyYXRlIHRoZSByZWxhdGl2ZSBwYXRoIGJhc2VkIG9uIHRoZSBwYXRoIGRpZmZlcmVuY2UgYmV0d2VlbiBgdG9gXG4gICAgLy8gYW5kIGBmcm9tYFxuICAgIGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSkge1xuICAgICAgaWYgKGkgPT09IGZyb21FbmQgfHwgZnJvbS5jaGFyQ29kZUF0KGkpID09PSA0NyAvKi8qLykge1xuICAgICAgICBpZiAob3V0Lmxlbmd0aCA9PT0gMClcbiAgICAgICAgICBvdXQgKz0gJy4uJztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG91dCArPSAnLy4uJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMYXN0bHksIGFwcGVuZCB0aGUgcmVzdCBvZiB0aGUgZGVzdGluYXRpb24gKGB0b2ApIHBhdGggdGhhdCBjb21lcyBhZnRlclxuICAgIC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuICAgIGlmIChvdXQubGVuZ3RoID4gMClcbiAgICAgIHJldHVybiBvdXQgKyB0by5zbGljZSh0b1N0YXJ0ICsgbGFzdENvbW1vblNlcCk7XG4gICAgZWxzZSB7XG4gICAgICB0b1N0YXJ0ICs9IGxhc3RDb21tb25TZXA7XG4gICAgICBpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gNDcgLyovKi8pXG4gICAgICAgICsrdG9TdGFydDtcbiAgICAgIHJldHVybiB0by5zbGljZSh0b1N0YXJ0KTtcbiAgICB9XG4gIH0sXG5cbiAgX21ha2VMb25nOiBmdW5jdGlvbiBfbWFrZUxvbmcocGF0aCkge1xuICAgIHJldHVybiBwYXRoO1xuICB9LFxuXG4gIGRpcm5hbWU6IGZ1bmN0aW9uIGRpcm5hbWUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gJy4nO1xuICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KDApO1xuICAgIHZhciBoYXNSb290ID0gY29kZSA9PT0gNDcgLyovKi87XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIGZvciAodmFyIGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMTsgLS1pKSB7XG4gICAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgaWYgKCFtYXRjaGVkU2xhc2gpIHtcbiAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChlbmQgPT09IC0xKSByZXR1cm4gaGFzUm9vdCA/ICcvJyA6ICcuJztcbiAgICBpZiAoaGFzUm9vdCAmJiBlbmQgPT09IDEpIHJldHVybiAnLy8nO1xuICAgIHJldHVybiBwYXRoLnNsaWNlKDAsIGVuZCk7XG4gIH0sXG5cbiAgYmFzZW5hbWU6IGZ1bmN0aW9uIGJhc2VuYW1lKHBhdGgsIGV4dCkge1xuICAgIGlmIChleHQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZXh0ICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJleHRcIiBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgYXNzZXJ0UGF0aChwYXRoKTtcblxuICAgIHZhciBzdGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIHZhciBpO1xuXG4gICAgaWYgKGV4dCAhPT0gdW5kZWZpbmVkICYmIGV4dC5sZW5ndGggPiAwICYmIGV4dC5sZW5ndGggPD0gcGF0aC5sZW5ndGgpIHtcbiAgICAgIGlmIChleHQubGVuZ3RoID09PSBwYXRoLmxlbmd0aCAmJiBleHQgPT09IHBhdGgpIHJldHVybiAnJztcbiAgICAgIHZhciBleHRJZHggPSBleHQubGVuZ3RoIC0gMTtcbiAgICAgIHZhciBmaXJzdE5vblNsYXNoRW5kID0gLTE7XG4gICAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgICBpZiAoY29kZSA9PT0gNDcgLyovKi8pIHtcbiAgICAgICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBwYXRoIHNlcGFyYXRvciB0aGF0IHdhcyBub3QgcGFydCBvZiBhIHNldCBvZiBwYXRoXG4gICAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgICAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGZpcnN0Tm9uU2xhc2hFbmQgPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgcmVtZW1iZXIgdGhpcyBpbmRleCBpbiBjYXNlXG4gICAgICAgICAgICAvLyB3ZSBuZWVkIGl0IGlmIHRoZSBleHRlbnNpb24gZW5kcyB1cCBub3QgbWF0Y2hpbmdcbiAgICAgICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICAgICAgZmlyc3ROb25TbGFzaEVuZCA9IGkgKyAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXh0SWR4ID49IDApIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBtYXRjaCB0aGUgZXhwbGljaXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICBpZiAoY29kZSA9PT0gZXh0LmNoYXJDb2RlQXQoZXh0SWR4KSkge1xuICAgICAgICAgICAgICBpZiAoLS1leHRJZHggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCB0aGUgZXh0ZW5zaW9uLCBzbyBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXIgcGF0aFxuICAgICAgICAgICAgICAgIC8vIGNvbXBvbmVudFxuICAgICAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBkb2VzIG5vdCBtYXRjaCwgc28gb3VyIHJlc3VsdCBpcyB0aGUgZW50aXJlIHBhdGhcbiAgICAgICAgICAgICAgLy8gY29tcG9uZW50XG4gICAgICAgICAgICAgIGV4dElkeCA9IC0xO1xuICAgICAgICAgICAgICBlbmQgPSBmaXJzdE5vblNsYXNoRW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoc3RhcnQgPT09IGVuZCkgZW5kID0gZmlyc3ROb25TbGFzaEVuZDtlbHNlIGlmIChlbmQgPT09IC0xKSBlbmQgPSBwYXRoLmxlbmd0aDtcbiAgICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoaSkgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgICBzdGFydCA9IGkgKyAxO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvciwgbWFyayB0aGlzIGFzIHRoZSBlbmQgb2Ygb3VyXG4gICAgICAgICAgLy8gcGF0aCBjb21wb25lbnRcbiAgICAgICAgICBtYXRjaGVkU2xhc2ggPSBmYWxzZTtcbiAgICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZW5kID09PSAtMSkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIHBhdGguc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgfVxuICB9LFxuXG4gIGV4dG5hbWU6IGZ1bmN0aW9uIGV4dG5hbWUocGF0aCkge1xuICAgIGFzc2VydFBhdGgocGF0aCk7XG4gICAgdmFyIHN0YXJ0RG90ID0gLTE7XG4gICAgdmFyIHN0YXJ0UGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIC8vIFRyYWNrIHRoZSBzdGF0ZSBvZiBjaGFyYWN0ZXJzIChpZiBhbnkpIHdlIHNlZSBiZWZvcmUgb3VyIGZpcnN0IGRvdCBhbmRcbiAgICAvLyBhZnRlciBhbnkgcGF0aCBzZXBhcmF0b3Igd2UgZmluZFxuICAgIHZhciBwcmVEb3RTdGF0ZSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlID09PSA0NiAvKi4qLykge1xuICAgICAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpXG4gICAgICAgICAgICBzdGFydERvdCA9IGk7XG4gICAgICAgICAgZWxzZSBpZiAocHJlRG90U3RhdGUgIT09IDEpXG4gICAgICAgICAgICBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydERvdCA9PT0gLTEgfHwgZW5kID09PSAtMSB8fFxuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGNoYXJhY3RlciBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvdFxuICAgICAgICBwcmVEb3RTdGF0ZSA9PT0gMCB8fFxuICAgICAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgICAgIHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnNsaWNlKHN0YXJ0RG90LCBlbmQpO1xuICB9LFxuXG4gIGZvcm1hdDogZnVuY3Rpb24gZm9ybWF0KHBhdGhPYmplY3QpIHtcbiAgICBpZiAocGF0aE9iamVjdCA9PT0gbnVsbCB8fCB0eXBlb2YgcGF0aE9iamVjdCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcInBhdGhPYmplY3RcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2YgcGF0aE9iamVjdCk7XG4gICAgfVxuICAgIHJldHVybiBfZm9ybWF0KCcvJywgcGF0aE9iamVjdCk7XG4gIH0sXG5cbiAgcGFyc2U6IGZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcbiAgICBhc3NlcnRQYXRoKHBhdGgpO1xuXG4gICAgdmFyIHJldCA9IHsgcm9vdDogJycsIGRpcjogJycsIGJhc2U6ICcnLCBleHQ6ICcnLCBuYW1lOiAnJyB9O1xuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJldDtcbiAgICB2YXIgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcbiAgICB2YXIgaXNBYnNvbHV0ZSA9IGNvZGUgPT09IDQ3IC8qLyovO1xuICAgIHZhciBzdGFydDtcbiAgICBpZiAoaXNBYnNvbHV0ZSkge1xuICAgICAgcmV0LnJvb3QgPSAnLyc7XG4gICAgICBzdGFydCA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0RG90ID0gLTE7XG4gICAgdmFyIHN0YXJ0UGFydCA9IDA7XG4gICAgdmFyIGVuZCA9IC0xO1xuICAgIHZhciBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAgIHZhciBpID0gcGF0aC5sZW5ndGggLSAxO1xuXG4gICAgLy8gVHJhY2sgdGhlIHN0YXRlIG9mIGNoYXJhY3RlcnMgKGlmIGFueSkgd2Ugc2VlIGJlZm9yZSBvdXIgZmlyc3QgZG90IGFuZFxuICAgIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gICAgdmFyIHByZURvdFN0YXRlID0gMDtcblxuICAgIC8vIEdldCBub24tZGlyIGluZm9cbiAgICBmb3IgKDsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgICBjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNvZGUgPT09IDQ3IC8qLyovKSB7XG4gICAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIHBhdGggc2VwYXJhdG9yIHRoYXQgd2FzIG5vdCBwYXJ0IG9mIGEgc2V0IG9mIHBhdGhcbiAgICAgICAgICAvLyBzZXBhcmF0b3JzIGF0IHRoZSBlbmQgb2YgdGhlIHN0cmluZywgc3RvcCBub3dcbiAgICAgICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICAgICAgc3RhcnRQYXJ0ID0gaSArIDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIGlmIChlbmQgPT09IC0xKSB7XG4gICAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgICAgLy8gZXh0ZW5zaW9uXG4gICAgICAgIG1hdGNoZWRTbGFzaCA9IGZhbHNlO1xuICAgICAgICBlbmQgPSBpICsgMTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlID09PSA0NiAvKi4qLykge1xuICAgICAgICAgIC8vIElmIHRoaXMgaXMgb3VyIGZpcnN0IGRvdCwgbWFyayBpdCBhcyB0aGUgc3RhcnQgb2Ygb3VyIGV4dGVuc2lvblxuICAgICAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtlbHNlIGlmIChwcmVEb3RTdGF0ZSAhPT0gMSkgcHJlRG90U3RhdGUgPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXJ0RG90ICE9PSAtMSkge1xuICAgICAgICAvLyBXZSBzYXcgYSBub24tZG90IGFuZCBub24tcGF0aCBzZXBhcmF0b3IgYmVmb3JlIG91ciBkb3QsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgICBwcmVEb3RTdGF0ZSA9IC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdGFydERvdCA9PT0gLTEgfHwgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgcHJlRG90U3RhdGUgPT09IDEgJiYgc3RhcnREb3QgPT09IGVuZCAtIDEgJiYgc3RhcnREb3QgPT09IHN0YXJ0UGFydCArIDEpIHtcbiAgICAgIGlmIChlbmQgIT09IC0xKSB7XG4gICAgICAgIGlmIChzdGFydFBhcnQgPT09IDAgJiYgaXNBYnNvbHV0ZSkgcmV0LmJhc2UgPSByZXQubmFtZSA9IHBhdGguc2xpY2UoMSwgZW5kKTtlbHNlIHJldC5iYXNlID0gcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgZW5kKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXJ0UGFydCA9PT0gMCAmJiBpc0Fic29sdXRlKSB7XG4gICAgICAgIHJldC5uYW1lID0gcGF0aC5zbGljZSgxLCBzdGFydERvdCk7XG4gICAgICAgIHJldC5iYXNlID0gcGF0aC5zbGljZSgxLCBlbmQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0Lm5hbWUgPSBwYXRoLnNsaWNlKHN0YXJ0UGFydCwgc3RhcnREb3QpO1xuICAgICAgICByZXQuYmFzZSA9IHBhdGguc2xpY2Uoc3RhcnRQYXJ0LCBlbmQpO1xuICAgICAgfVxuICAgICAgcmV0LmV4dCA9IHBhdGguc2xpY2Uoc3RhcnREb3QsIGVuZCk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0UGFydCA+IDApIHJldC5kaXIgPSBwYXRoLnNsaWNlKDAsIHN0YXJ0UGFydCAtIDEpO2Vsc2UgaWYgKGlzQWJzb2x1dGUpIHJldC5kaXIgPSAnLyc7XG5cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuXG4gIHNlcDogJy8nLFxuICBkZWxpbWl0ZXI6ICc6JyxcbiAgd2luMzI6IG51bGwsXG4gIHBvc2l4OiBudWxsXG59O1xuXG5wb3NpeC5wb3NpeCA9IHBvc2l4O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBvc2l4O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBpc2V4ZVxuaXNleGUuc3luYyA9IHN5bmNcblxudmFyIGZzID0gcmVxdWlyZSgnZnMnKVxuXG5mdW5jdGlvbiBjaGVja1BhdGhFeHQgKHBhdGgsIG9wdGlvbnMpIHtcbiAgdmFyIHBhdGhleHQgPSBvcHRpb25zLnBhdGhFeHQgIT09IHVuZGVmaW5lZCA/XG4gICAgb3B0aW9ucy5wYXRoRXh0IDogcHJvY2Vzcy5lbnYuUEFUSEVYVFxuXG4gIGlmICghcGF0aGV4dCkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICBwYXRoZXh0ID0gcGF0aGV4dC5zcGxpdCgnOycpXG4gIGlmIChwYXRoZXh0LmluZGV4T2YoJycpICE9PSAtMSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHAgPSBwYXRoZXh0W2ldLnRvTG93ZXJDYXNlKClcbiAgICBpZiAocCAmJiBwYXRoLnN1YnN0cigtcC5sZW5ndGgpLnRvTG93ZXJDYXNlKCkgPT09IHApIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBjaGVja1N0YXQgKHN0YXQsIHBhdGgsIG9wdGlvbnMpIHtcbiAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkgJiYgIXN0YXQuaXNGaWxlKCkpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gY2hlY2tQYXRoRXh0KHBhdGgsIG9wdGlvbnMpXG59XG5cbmZ1bmN0aW9uIGlzZXhlIChwYXRoLCBvcHRpb25zLCBjYikge1xuICBmcy5zdGF0KHBhdGgsIGZ1bmN0aW9uIChlciwgc3RhdCkge1xuICAgIGNiKGVyLCBlciA/IGZhbHNlIDogY2hlY2tTdGF0KHN0YXQsIHBhdGgsIG9wdGlvbnMpKVxuICB9KVxufVxuXG5mdW5jdGlvbiBzeW5jIChwYXRoLCBvcHRpb25zKSB7XG4gIHJldHVybiBjaGVja1N0YXQoZnMuc3RhdFN5bmMocGF0aCksIHBhdGgsIG9wdGlvbnMpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzZXhlXG5pc2V4ZS5zeW5jID0gc3luY1xuXG52YXIgZnMgPSByZXF1aXJlKCdmcycpXG5cbmZ1bmN0aW9uIGlzZXhlIChwYXRoLCBvcHRpb25zLCBjYikge1xuICBmcy5zdGF0KHBhdGgsIGZ1bmN0aW9uIChlciwgc3RhdCkge1xuICAgIGNiKGVyLCBlciA/IGZhbHNlIDogY2hlY2tTdGF0KHN0YXQsIG9wdGlvbnMpKVxuICB9KVxufVxuXG5mdW5jdGlvbiBzeW5jIChwYXRoLCBvcHRpb25zKSB7XG4gIHJldHVybiBjaGVja1N0YXQoZnMuc3RhdFN5bmMocGF0aCksIG9wdGlvbnMpXG59XG5cbmZ1bmN0aW9uIGNoZWNrU3RhdCAoc3RhdCwgb3B0aW9ucykge1xuICByZXR1cm4gc3RhdC5pc0ZpbGUoKSAmJiBjaGVja01vZGUoc3RhdCwgb3B0aW9ucylcbn1cblxuZnVuY3Rpb24gY2hlY2tNb2RlIChzdGF0LCBvcHRpb25zKSB7XG4gIHZhciBtb2QgPSBzdGF0Lm1vZGVcbiAgdmFyIHVpZCA9IHN0YXQudWlkXG4gIHZhciBnaWQgPSBzdGF0LmdpZFxuXG4gIHZhciBteVVpZCA9IG9wdGlvbnMudWlkICE9PSB1bmRlZmluZWQgP1xuICAgIG9wdGlvbnMudWlkIDogcHJvY2Vzcy5nZXR1aWQgJiYgcHJvY2Vzcy5nZXR1aWQoKVxuICB2YXIgbXlHaWQgPSBvcHRpb25zLmdpZCAhPT0gdW5kZWZpbmVkID9cbiAgICBvcHRpb25zLmdpZCA6IHByb2Nlc3MuZ2V0Z2lkICYmIHByb2Nlc3MuZ2V0Z2lkKClcblxuICB2YXIgdSA9IHBhcnNlSW50KCcxMDAnLCA4KVxuICB2YXIgZyA9IHBhcnNlSW50KCcwMTAnLCA4KVxuICB2YXIgbyA9IHBhcnNlSW50KCcwMDEnLCA4KVxuICB2YXIgdWcgPSB1IHwgZ1xuXG4gIHZhciByZXQgPSAobW9kICYgbykgfHxcbiAgICAobW9kICYgZykgJiYgZ2lkID09PSBteUdpZCB8fFxuICAgIChtb2QgJiB1KSAmJiB1aWQgPT09IG15VWlkIHx8XG4gICAgKG1vZCAmIHVnKSAmJiBteVVpZCA9PT0gMFxuXG4gIHJldHVybiByZXRcbn1cbiIsInZhciBmcyA9IHJlcXVpcmUoJ2ZzJylcbnZhciBjb3JlXG5pZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyB8fCBnbG9iYWwuVEVTVElOR19XSU5ET1dTKSB7XG4gIGNvcmUgPSByZXF1aXJlKCcuL3dpbmRvd3MuanMnKVxufSBlbHNlIHtcbiAgY29yZSA9IHJlcXVpcmUoJy4vbW9kZS5qcycpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNleGVcbmlzZXhlLnN5bmMgPSBzeW5jXG5cbmZ1bmN0aW9uIGlzZXhlIChwYXRoLCBvcHRpb25zLCBjYikge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IG9wdGlvbnNcbiAgICBvcHRpb25zID0ge31cbiAgfVxuXG4gIGlmICghY2IpIHtcbiAgICBpZiAodHlwZW9mIFByb21pc2UgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIG5vdCBwcm92aWRlZCcpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlzZXhlKHBhdGgsIG9wdGlvbnMgfHwge30sIGZ1bmN0aW9uIChlciwgaXMpIHtcbiAgICAgICAgaWYgKGVyKSB7XG4gICAgICAgICAgcmVqZWN0KGVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUoaXMpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIGNvcmUocGF0aCwgb3B0aW9ucyB8fCB7fSwgZnVuY3Rpb24gKGVyLCBpcykge1xuICAgIC8vIGlnbm9yZSBFQUNDRVMgYmVjYXVzZSB0aGF0IGp1c3QgbWVhbnMgd2UgYXJlbid0IGFsbG93ZWQgdG8gcnVuIGl0XG4gICAgaWYgKGVyKSB7XG4gICAgICBpZiAoZXIuY29kZSA9PT0gJ0VBQ0NFUycgfHwgb3B0aW9ucyAmJiBvcHRpb25zLmlnbm9yZUVycm9ycykge1xuICAgICAgICBlciA9IG51bGxcbiAgICAgICAgaXMgPSBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgICBjYihlciwgaXMpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIHN5bmMgKHBhdGgsIG9wdGlvbnMpIHtcbiAgLy8gbXkga2luZ2RvbSBmb3IgYSBmaWx0ZXJlZCBjYXRjaFxuICB0cnkge1xuICAgIHJldHVybiBjb3JlLnN5bmMocGF0aCwgb3B0aW9ucyB8fCB7fSlcbiAgfSBjYXRjaCAoZXIpIHtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmlnbm9yZUVycm9ycyB8fCBlci5jb2RlID09PSAnRUFDQ0VTJykge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGVyXG4gICAgfVxuICB9XG59XG4iLCJjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInIHx8XG4gICAgcHJvY2Vzcy5lbnYuT1NUWVBFID09PSAnY3lnd2luJyB8fFxuICAgIHByb2Nlc3MuZW52Lk9TVFlQRSA9PT0gJ21zeXMnXG5cbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IENPTE9OID0gaXNXaW5kb3dzID8gJzsnIDogJzonXG5jb25zdCBpc2V4ZSA9IHJlcXVpcmUoJ2lzZXhlJylcblxuY29uc3QgZ2V0Tm90Rm91bmRFcnJvciA9IChjbWQpID0+XG4gIE9iamVjdC5hc3NpZ24obmV3IEVycm9yKGBub3QgZm91bmQ6ICR7Y21kfWApLCB7IGNvZGU6ICdFTk9FTlQnIH0pXG5cbmNvbnN0IGdldFBhdGhJbmZvID0gKGNtZCwgb3B0KSA9PiB7XG4gIGNvbnN0IGNvbG9uID0gb3B0LmNvbG9uIHx8IENPTE9OXG5cbiAgLy8gSWYgaXQgaGFzIGEgc2xhc2gsIHRoZW4gd2UgZG9uJ3QgYm90aGVyIHNlYXJjaGluZyB0aGUgcGF0aGVudi5cbiAgLy8ganVzdCBjaGVjayB0aGUgZmlsZSBpdHNlbGYsIGFuZCB0aGF0J3MgaXQuXG4gIGNvbnN0IHBhdGhFbnYgPSBjbWQubWF0Y2goL1xcLy8pIHx8IGlzV2luZG93cyAmJiBjbWQubWF0Y2goL1xcXFwvKSA/IFsnJ11cbiAgICA6IChcbiAgICAgIFtcbiAgICAgICAgLy8gd2luZG93cyBhbHdheXMgY2hlY2tzIHRoZSBjd2QgZmlyc3RcbiAgICAgICAgLi4uKGlzV2luZG93cyA/IFtwcm9jZXNzLmN3ZCgpXSA6IFtdKSxcbiAgICAgICAgLi4uKG9wdC5wYXRoIHx8IHByb2Nlc3MuZW52LlBBVEggfHxcbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dDogdmVyeSB1bnVzdWFsICovICcnKS5zcGxpdChjb2xvbiksXG4gICAgICBdXG4gICAgKVxuICBjb25zdCBwYXRoRXh0RXhlID0gaXNXaW5kb3dzXG4gICAgPyBvcHQucGF0aEV4dCB8fCBwcm9jZXNzLmVudi5QQVRIRVhUIHx8ICcuRVhFOy5DTUQ7LkJBVDsuQ09NJ1xuICAgIDogJydcbiAgY29uc3QgcGF0aEV4dCA9IGlzV2luZG93cyA/IHBhdGhFeHRFeGUuc3BsaXQoY29sb24pIDogWycnXVxuXG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBpZiAoY21kLmluZGV4T2YoJy4nKSAhPT0gLTEgJiYgcGF0aEV4dFswXSAhPT0gJycpXG4gICAgICBwYXRoRXh0LnVuc2hpZnQoJycpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHBhdGhFbnYsXG4gICAgcGF0aEV4dCxcbiAgICBwYXRoRXh0RXhlLFxuICB9XG59XG5cbmNvbnN0IHdoaWNoID0gKGNtZCwgb3B0LCBjYikgPT4ge1xuICBpZiAodHlwZW9mIG9wdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gb3B0XG4gICAgb3B0ID0ge31cbiAgfVxuICBpZiAoIW9wdClcbiAgICBvcHQgPSB7fVxuXG4gIGNvbnN0IHsgcGF0aEVudiwgcGF0aEV4dCwgcGF0aEV4dEV4ZSB9ID0gZ2V0UGF0aEluZm8oY21kLCBvcHQpXG4gIGNvbnN0IGZvdW5kID0gW11cblxuICBjb25zdCBzdGVwID0gaSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGkgPT09IHBhdGhFbnYubGVuZ3RoKVxuICAgICAgcmV0dXJuIG9wdC5hbGwgJiYgZm91bmQubGVuZ3RoID8gcmVzb2x2ZShmb3VuZClcbiAgICAgICAgOiByZWplY3QoZ2V0Tm90Rm91bmRFcnJvcihjbWQpKVxuXG4gICAgY29uc3QgcHBSYXcgPSBwYXRoRW52W2ldXG4gICAgY29uc3QgcGF0aFBhcnQgPSAvXlwiLipcIiQvLnRlc3QocHBSYXcpID8gcHBSYXcuc2xpY2UoMSwgLTEpIDogcHBSYXdcblxuICAgIGNvbnN0IHBDbWQgPSBwYXRoLmpvaW4ocGF0aFBhcnQsIGNtZClcbiAgICBjb25zdCBwID0gIXBhdGhQYXJ0ICYmIC9eXFwuW1xcXFxcXC9dLy50ZXN0KGNtZCkgPyBjbWQuc2xpY2UoMCwgMikgKyBwQ21kXG4gICAgICA6IHBDbWRcblxuICAgIHJlc29sdmUoc3ViU3RlcChwLCBpLCAwKSlcbiAgfSlcblxuICBjb25zdCBzdWJTdGVwID0gKHAsIGksIGlpKSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGlpID09PSBwYXRoRXh0Lmxlbmd0aClcbiAgICAgIHJldHVybiByZXNvbHZlKHN0ZXAoaSArIDEpKVxuICAgIGNvbnN0IGV4dCA9IHBhdGhFeHRbaWldXG4gICAgaXNleGUocCArIGV4dCwgeyBwYXRoRXh0OiBwYXRoRXh0RXhlIH0sIChlciwgaXMpID0+IHtcbiAgICAgIGlmICghZXIgJiYgaXMpIHtcbiAgICAgICAgaWYgKG9wdC5hbGwpXG4gICAgICAgICAgZm91bmQucHVzaChwICsgZXh0KVxuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUocCArIGV4dClcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNvbHZlKHN1YlN0ZXAocCwgaSwgaWkgKyAxKSlcbiAgICB9KVxuICB9KVxuXG4gIHJldHVybiBjYiA/IHN0ZXAoMCkudGhlbihyZXMgPT4gY2IobnVsbCwgcmVzKSwgY2IpIDogc3RlcCgwKVxufVxuXG5jb25zdCB3aGljaFN5bmMgPSAoY21kLCBvcHQpID0+IHtcbiAgb3B0ID0gb3B0IHx8IHt9XG5cbiAgY29uc3QgeyBwYXRoRW52LCBwYXRoRXh0LCBwYXRoRXh0RXhlIH0gPSBnZXRQYXRoSW5mbyhjbWQsIG9wdClcbiAgY29uc3QgZm91bmQgPSBbXVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0aEVudi5sZW5ndGg7IGkgKyspIHtcbiAgICBjb25zdCBwcFJhdyA9IHBhdGhFbnZbaV1cbiAgICBjb25zdCBwYXRoUGFydCA9IC9eXCIuKlwiJC8udGVzdChwcFJhdykgPyBwcFJhdy5zbGljZSgxLCAtMSkgOiBwcFJhd1xuXG4gICAgY29uc3QgcENtZCA9IHBhdGguam9pbihwYXRoUGFydCwgY21kKVxuICAgIGNvbnN0IHAgPSAhcGF0aFBhcnQgJiYgL15cXC5bXFxcXFxcL10vLnRlc3QoY21kKSA/IGNtZC5zbGljZSgwLCAyKSArIHBDbWRcbiAgICAgIDogcENtZFxuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBwYXRoRXh0Lmxlbmd0aDsgaiArKykge1xuICAgICAgY29uc3QgY3VyID0gcCArIHBhdGhFeHRbal1cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGlzID0gaXNleGUuc3luYyhjdXIsIHsgcGF0aEV4dDogcGF0aEV4dEV4ZSB9KVxuICAgICAgICBpZiAoaXMpIHtcbiAgICAgICAgICBpZiAob3B0LmFsbClcbiAgICAgICAgICAgIGZvdW5kLnB1c2goY3VyKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBjdXJcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXgpIHt9XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdC5hbGwgJiYgZm91bmQubGVuZ3RoKVxuICAgIHJldHVybiBmb3VuZFxuXG4gIGlmIChvcHQubm90aHJvdylcbiAgICByZXR1cm4gbnVsbFxuXG4gIHRocm93IGdldE5vdEZvdW5kRXJyb3IoY21kKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdoaWNoXG53aGljaC5zeW5jID0gd2hpY2hTeW5jXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHBhdGhLZXkgPSAob3B0aW9ucyA9IHt9KSA9PiB7XG5cdGNvbnN0IGVudmlyb25tZW50ID0gb3B0aW9ucy5lbnYgfHwgcHJvY2Vzcy5lbnY7XG5cdGNvbnN0IHBsYXRmb3JtID0gb3B0aW9ucy5wbGF0Zm9ybSB8fCBwcm9jZXNzLnBsYXRmb3JtO1xuXG5cdGlmIChwbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuXHRcdHJldHVybiAnUEFUSCc7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0LmtleXMoZW52aXJvbm1lbnQpLnJldmVyc2UoKS5maW5kKGtleSA9PiBrZXkudG9VcHBlckNhc2UoKSA9PT0gJ1BBVEgnKSB8fCAnUGF0aCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGhLZXk7XG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBmb3IgdGhlIG5leHQgbWFqb3IgcmVsZWFzZVxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IHBhdGhLZXk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCB3aGljaCA9IHJlcXVpcmUoJ3doaWNoJyk7XG5jb25zdCBnZXRQYXRoS2V5ID0gcmVxdWlyZSgncGF0aC1rZXknKTtcblxuZnVuY3Rpb24gcmVzb2x2ZUNvbW1hbmRBdHRlbXB0KHBhcnNlZCwgd2l0aG91dFBhdGhFeHQpIHtcbiAgICBjb25zdCBlbnYgPSBwYXJzZWQub3B0aW9ucy5lbnYgfHwgcHJvY2Vzcy5lbnY7XG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBjb25zdCBoYXNDdXN0b21Dd2QgPSBwYXJzZWQub3B0aW9ucy5jd2QgIT0gbnVsbDtcbiAgICAvLyBXb3JrZXIgdGhyZWFkcyBkbyBub3QgaGF2ZSBwcm9jZXNzLmNoZGlyKClcbiAgICBjb25zdCBzaG91bGRTd2l0Y2hDd2QgPSBoYXNDdXN0b21Dd2QgJiYgcHJvY2Vzcy5jaGRpciAhPT0gdW5kZWZpbmVkICYmICFwcm9jZXNzLmNoZGlyLmRpc2FibGVkO1xuXG4gICAgLy8gSWYgYSBjdXN0b20gYGN3ZGAgd2FzIHNwZWNpZmllZCwgd2UgbmVlZCB0byBjaGFuZ2UgdGhlIHByb2Nlc3MgY3dkXG4gICAgLy8gYmVjYXVzZSBgd2hpY2hgIHdpbGwgZG8gc3RhdCBjYWxscyBidXQgZG9lcyBub3Qgc3VwcG9ydCBhIGN1c3RvbSBjd2RcbiAgICBpZiAoc2hvdWxkU3dpdGNoQ3dkKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwcm9jZXNzLmNoZGlyKHBhcnNlZC5vcHRpb25zLmN3ZCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgLyogRW1wdHkgKi9cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxldCByZXNvbHZlZDtcblxuICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVkID0gd2hpY2guc3luYyhwYXJzZWQuY29tbWFuZCwge1xuICAgICAgICAgICAgcGF0aDogZW52W2dldFBhdGhLZXkoeyBlbnYgfSldLFxuICAgICAgICAgICAgcGF0aEV4dDogd2l0aG91dFBhdGhFeHQgPyBwYXRoLmRlbGltaXRlciA6IHVuZGVmaW5lZCxcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvKiBFbXB0eSAqL1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChzaG91bGRTd2l0Y2hDd2QpIHtcbiAgICAgICAgICAgIHByb2Nlc3MuY2hkaXIoY3dkKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIHN1Y2Nlc3NmdWxseSByZXNvbHZlZCwgZW5zdXJlIHRoYXQgYW4gYWJzb2x1dGUgcGF0aCBpcyByZXR1cm5lZFxuICAgIC8vIE5vdGUgdGhhdCB3aGVuIGEgY3VzdG9tIGBjd2RgIHdhcyB1c2VkLCB3ZSBuZWVkIHRvIHJlc29sdmUgdG8gYW4gYWJzb2x1dGUgcGF0aCBiYXNlZCBvbiBpdFxuICAgIGlmIChyZXNvbHZlZCkge1xuICAgICAgICByZXNvbHZlZCA9IHBhdGgucmVzb2x2ZShoYXNDdXN0b21Dd2QgPyBwYXJzZWQub3B0aW9ucy5jd2QgOiAnJywgcmVzb2x2ZWQpO1xuICAgIH1cblxuICAgIHJldHVybiByZXNvbHZlZDtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUNvbW1hbmQocGFyc2VkKSB7XG4gICAgcmV0dXJuIHJlc29sdmVDb21tYW5kQXR0ZW1wdChwYXJzZWQpIHx8IHJlc29sdmVDb21tYW5kQXR0ZW1wdChwYXJzZWQsIHRydWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc29sdmVDb21tYW5kO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZWUgaHR0cDovL3d3dy5yb2J2YW5kZXJ3b3VkZS5jb20vZXNjYXBlY2hhcnMucGhwXG5jb25zdCBtZXRhQ2hhcnNSZWdFeHAgPSAvKFsoKVxcXVslIV5cImA8PiZ8OywgKj9dKS9nO1xuXG5mdW5jdGlvbiBlc2NhcGVDb21tYW5kKGFyZykge1xuICAgIC8vIEVzY2FwZSBtZXRhIGNoYXJzXG4gICAgYXJnID0gYXJnLnJlcGxhY2UobWV0YUNoYXJzUmVnRXhwLCAnXiQxJyk7XG5cbiAgICByZXR1cm4gYXJnO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVBcmd1bWVudChhcmcsIGRvdWJsZUVzY2FwZU1ldGFDaGFycykge1xuICAgIC8vIENvbnZlcnQgdG8gc3RyaW5nXG4gICAgYXJnID0gYCR7YXJnfWA7XG5cbiAgICAvLyBBbGdvcml0aG0gYmVsb3cgaXMgYmFzZWQgb24gaHR0cHM6Ly9xbnRtLm9yZy9jbWRcblxuICAgIC8vIFNlcXVlbmNlIG9mIGJhY2tzbGFzaGVzIGZvbGxvd2VkIGJ5IGEgZG91YmxlIHF1b3RlOlxuICAgIC8vIGRvdWJsZSB1cCBhbGwgdGhlIGJhY2tzbGFzaGVzIGFuZCBlc2NhcGUgdGhlIGRvdWJsZSBxdW90ZVxuICAgIGFyZyA9IGFyZy5yZXBsYWNlKC8oXFxcXCopXCIvZywgJyQxJDFcXFxcXCInKTtcblxuICAgIC8vIFNlcXVlbmNlIG9mIGJhY2tzbGFzaGVzIGZvbGxvd2VkIGJ5IHRoZSBlbmQgb2YgdGhlIHN0cmluZ1xuICAgIC8vICh3aGljaCB3aWxsIGJlY29tZSBhIGRvdWJsZSBxdW90ZSBsYXRlcik6XG4gICAgLy8gZG91YmxlIHVwIGFsbCB0aGUgYmFja3NsYXNoZXNcbiAgICBhcmcgPSBhcmcucmVwbGFjZSgvKFxcXFwqKSQvLCAnJDEkMScpO1xuXG4gICAgLy8gQWxsIG90aGVyIGJhY2tzbGFzaGVzIG9jY3VyIGxpdGVyYWxseVxuXG4gICAgLy8gUXVvdGUgdGhlIHdob2xlIHRoaW5nOlxuICAgIGFyZyA9IGBcIiR7YXJnfVwiYDtcblxuICAgIC8vIEVzY2FwZSBtZXRhIGNoYXJzXG4gICAgYXJnID0gYXJnLnJlcGxhY2UobWV0YUNoYXJzUmVnRXhwLCAnXiQxJyk7XG5cbiAgICAvLyBEb3VibGUgZXNjYXBlIG1ldGEgY2hhcnMgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKGRvdWJsZUVzY2FwZU1ldGFDaGFycykge1xuICAgICAgICBhcmcgPSBhcmcucmVwbGFjZShtZXRhQ2hhcnNSZWdFeHAsICdeJDEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJnO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5jb21tYW5kID0gZXNjYXBlQ29tbWFuZDtcbm1vZHVsZS5leHBvcnRzLmFyZ3VtZW50ID0gZXNjYXBlQXJndW1lbnQ7XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IC9eIyEoLiopLztcbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IHNoZWJhbmdSZWdleCA9IHJlcXVpcmUoJ3NoZWJhbmctcmVnZXgnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoc3RyaW5nID0gJycpID0+IHtcblx0Y29uc3QgbWF0Y2ggPSBzdHJpbmcubWF0Y2goc2hlYmFuZ1JlZ2V4KTtcblxuXHRpZiAoIW1hdGNoKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRjb25zdCBbcGF0aCwgYXJndW1lbnRdID0gbWF0Y2hbMF0ucmVwbGFjZSgvIyEgPy8sICcnKS5zcGxpdCgnICcpO1xuXHRjb25zdCBiaW5hcnkgPSBwYXRoLnNwbGl0KCcvJykucG9wKCk7XG5cblx0aWYgKGJpbmFyeSA9PT0gJ2VudicpIHtcblx0XHRyZXR1cm4gYXJndW1lbnQ7XG5cdH1cblxuXHRyZXR1cm4gYXJndW1lbnQgPyBgJHtiaW5hcnl9ICR7YXJndW1lbnR9YCA6IGJpbmFyeTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmNvbnN0IHNoZWJhbmdDb21tYW5kID0gcmVxdWlyZSgnc2hlYmFuZy1jb21tYW5kJyk7XG5cbmZ1bmN0aW9uIHJlYWRTaGViYW5nKGNvbW1hbmQpIHtcbiAgICAvLyBSZWFkIHRoZSBmaXJzdCAxNTAgYnl0ZXMgZnJvbSB0aGUgZmlsZVxuICAgIGNvbnN0IHNpemUgPSAxNTA7XG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmFsbG9jKHNpemUpO1xuXG4gICAgbGV0IGZkO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZmQgPSBmcy5vcGVuU3luYyhjb21tYW5kLCAncicpO1xuICAgICAgICBmcy5yZWFkU3luYyhmZCwgYnVmZmVyLCAwLCBzaXplLCAwKTtcbiAgICAgICAgZnMuY2xvc2VTeW5jKGZkKTtcbiAgICB9IGNhdGNoIChlKSB7IC8qIEVtcHR5ICovIH1cblxuICAgIC8vIEF0dGVtcHQgdG8gZXh0cmFjdCBzaGViYW5nIChudWxsIGlzIHJldHVybmVkIGlmIG5vdCBhIHNoZWJhbmcpXG4gICAgcmV0dXJuIHNoZWJhbmdDb21tYW5kKGJ1ZmZlci50b1N0cmluZygpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZWFkU2hlYmFuZztcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmNvbnN0IHJlc29sdmVDb21tYW5kID0gcmVxdWlyZSgnLi91dGlsL3Jlc29sdmVDb21tYW5kJyk7XG5jb25zdCBlc2NhcGUgPSByZXF1aXJlKCcuL3V0aWwvZXNjYXBlJyk7XG5jb25zdCByZWFkU2hlYmFuZyA9IHJlcXVpcmUoJy4vdXRpbC9yZWFkU2hlYmFuZycpO1xuXG5jb25zdCBpc1dpbiA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5jb25zdCBpc0V4ZWN1dGFibGVSZWdFeHAgPSAvXFwuKD86Y29tfGV4ZSkkL2k7XG5jb25zdCBpc0NtZFNoaW1SZWdFeHAgPSAvbm9kZV9tb2R1bGVzW1xcXFwvXS5iaW5bXFxcXC9dW15cXFxcL10rXFwuY21kJC9pO1xuXG5mdW5jdGlvbiBkZXRlY3RTaGViYW5nKHBhcnNlZCkge1xuICAgIHBhcnNlZC5maWxlID0gcmVzb2x2ZUNvbW1hbmQocGFyc2VkKTtcblxuICAgIGNvbnN0IHNoZWJhbmcgPSBwYXJzZWQuZmlsZSAmJiByZWFkU2hlYmFuZyhwYXJzZWQuZmlsZSk7XG5cbiAgICBpZiAoc2hlYmFuZykge1xuICAgICAgICBwYXJzZWQuYXJncy51bnNoaWZ0KHBhcnNlZC5maWxlKTtcbiAgICAgICAgcGFyc2VkLmNvbW1hbmQgPSBzaGViYW5nO1xuXG4gICAgICAgIHJldHVybiByZXNvbHZlQ29tbWFuZChwYXJzZWQpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZWQuZmlsZTtcbn1cblxuZnVuY3Rpb24gcGFyc2VOb25TaGVsbChwYXJzZWQpIHtcbiAgICBpZiAoIWlzV2luKSB7XG4gICAgICAgIHJldHVybiBwYXJzZWQ7XG4gICAgfVxuXG4gICAgLy8gRGV0ZWN0ICYgYWRkIHN1cHBvcnQgZm9yIHNoZWJhbmdzXG4gICAgY29uc3QgY29tbWFuZEZpbGUgPSBkZXRlY3RTaGViYW5nKHBhcnNlZCk7XG5cbiAgICAvLyBXZSBkb24ndCBuZWVkIGEgc2hlbGwgaWYgdGhlIGNvbW1hbmQgZmlsZW5hbWUgaXMgYW4gZXhlY3V0YWJsZVxuICAgIGNvbnN0IG5lZWRzU2hlbGwgPSAhaXNFeGVjdXRhYmxlUmVnRXhwLnRlc3QoY29tbWFuZEZpbGUpO1xuXG4gICAgLy8gSWYgYSBzaGVsbCBpcyByZXF1aXJlZCwgdXNlIGNtZC5leGUgYW5kIHRha2UgY2FyZSBvZiBlc2NhcGluZyBldmVyeXRoaW5nIGNvcnJlY3RseVxuICAgIC8vIE5vdGUgdGhhdCBgZm9yY2VTaGVsbGAgaXMgYW4gaGlkZGVuIG9wdGlvbiB1c2VkIG9ubHkgaW4gdGVzdHNcbiAgICBpZiAocGFyc2VkLm9wdGlvbnMuZm9yY2VTaGVsbCB8fCBuZWVkc1NoZWxsKSB7XG4gICAgICAgIC8vIE5lZWQgdG8gZG91YmxlIGVzY2FwZSBtZXRhIGNoYXJzIGlmIHRoZSBjb21tYW5kIGlzIGEgY21kLXNoaW0gbG9jYXRlZCBpbiBgbm9kZV9tb2R1bGVzLy5iaW4vYFxuICAgICAgICAvLyBUaGUgY21kLXNoaW0gc2ltcGx5IGNhbGxzIGV4ZWN1dGUgdGhlIHBhY2thZ2UgYmluIGZpbGUgd2l0aCBOb2RlSlMsIHByb3h5aW5nIGFueSBhcmd1bWVudFxuICAgICAgICAvLyBCZWNhdXNlIHRoZSBlc2NhcGUgb2YgbWV0YWNoYXJzIHdpdGggXiBnZXRzIGludGVycHJldGVkIHdoZW4gdGhlIGNtZC5leGUgaXMgZmlyc3QgY2FsbGVkLFxuICAgICAgICAvLyB3ZSBuZWVkIHRvIGRvdWJsZSBlc2NhcGUgdGhlbVxuICAgICAgICBjb25zdCBuZWVkc0RvdWJsZUVzY2FwZU1ldGFDaGFycyA9IGlzQ21kU2hpbVJlZ0V4cC50ZXN0KGNvbW1hbmRGaWxlKTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgcG9zaXggcGF0aHMgaW50byBPUyBjb21wYXRpYmxlIHBhdGhzIChlLmcuOiBmb28vYmFyIC0+IGZvb1xcYmFyKVxuICAgICAgICAvLyBUaGlzIGlzIG5lY2Vzc2FyeSBvdGhlcndpc2UgaXQgd2lsbCBhbHdheXMgZmFpbCB3aXRoIEVOT0VOVCBpbiB0aG9zZSBjYXNlc1xuICAgICAgICBwYXJzZWQuY29tbWFuZCA9IHBhdGgubm9ybWFsaXplKHBhcnNlZC5jb21tYW5kKTtcblxuICAgICAgICAvLyBFc2NhcGUgY29tbWFuZCAmIGFyZ3VtZW50c1xuICAgICAgICBwYXJzZWQuY29tbWFuZCA9IGVzY2FwZS5jb21tYW5kKHBhcnNlZC5jb21tYW5kKTtcbiAgICAgICAgcGFyc2VkLmFyZ3MgPSBwYXJzZWQuYXJncy5tYXAoKGFyZykgPT4gZXNjYXBlLmFyZ3VtZW50KGFyZywgbmVlZHNEb3VibGVFc2NhcGVNZXRhQ2hhcnMpKTtcblxuICAgICAgICBjb25zdCBzaGVsbENvbW1hbmQgPSBbcGFyc2VkLmNvbW1hbmRdLmNvbmNhdChwYXJzZWQuYXJncykuam9pbignICcpO1xuXG4gICAgICAgIHBhcnNlZC5hcmdzID0gWycvZCcsICcvcycsICcvYycsIGBcIiR7c2hlbGxDb21tYW5kfVwiYF07XG4gICAgICAgIHBhcnNlZC5jb21tYW5kID0gcHJvY2Vzcy5lbnYuY29tc3BlYyB8fCAnY21kLmV4ZSc7XG4gICAgICAgIHBhcnNlZC5vcHRpb25zLndpbmRvd3NWZXJiYXRpbUFyZ3VtZW50cyA9IHRydWU7IC8vIFRlbGwgbm9kZSdzIHNwYXduIHRoYXQgdGhlIGFyZ3VtZW50cyBhcmUgYWxyZWFkeSBlc2NhcGVkXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlZDtcbn1cblxuZnVuY3Rpb24gcGFyc2UoY29tbWFuZCwgYXJncywgb3B0aW9ucykge1xuICAgIC8vIE5vcm1hbGl6ZSBhcmd1bWVudHMsIHNpbWlsYXIgdG8gbm9kZWpzXG4gICAgaWYgKGFyZ3MgJiYgIUFycmF5LmlzQXJyYXkoYXJncykpIHtcbiAgICAgICAgb3B0aW9ucyA9IGFyZ3M7XG4gICAgICAgIGFyZ3MgPSBudWxsO1xuICAgIH1cblxuICAgIGFyZ3MgPSBhcmdzID8gYXJncy5zbGljZSgwKSA6IFtdOyAvLyBDbG9uZSBhcnJheSB0byBhdm9pZCBjaGFuZ2luZyB0aGUgb3JpZ2luYWxcbiAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7IC8vIENsb25lIG9iamVjdCB0byBhdm9pZCBjaGFuZ2luZyB0aGUgb3JpZ2luYWxcblxuICAgIC8vIEJ1aWxkIG91ciBwYXJzZWQgb2JqZWN0XG4gICAgY29uc3QgcGFyc2VkID0ge1xuICAgICAgICBjb21tYW5kLFxuICAgICAgICBhcmdzLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgICAgICBjb21tYW5kLFxuICAgICAgICAgICAgYXJncyxcbiAgICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gRGVsZWdhdGUgZnVydGhlciBwYXJzaW5nIHRvIHNoZWxsIG9yIG5vbi1zaGVsbFxuICAgIHJldHVybiBvcHRpb25zLnNoZWxsID8gcGFyc2VkIDogcGFyc2VOb25TaGVsbChwYXJzZWQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBpc1dpbiA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5cbmZ1bmN0aW9uIG5vdEZvdW5kRXJyb3Iob3JpZ2luYWwsIHN5c2NhbGwpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IoYCR7c3lzY2FsbH0gJHtvcmlnaW5hbC5jb21tYW5kfSBFTk9FTlRgKSwge1xuICAgICAgICBjb2RlOiAnRU5PRU5UJyxcbiAgICAgICAgZXJybm86ICdFTk9FTlQnLFxuICAgICAgICBzeXNjYWxsOiBgJHtzeXNjYWxsfSAke29yaWdpbmFsLmNvbW1hbmR9YCxcbiAgICAgICAgcGF0aDogb3JpZ2luYWwuY29tbWFuZCxcbiAgICAgICAgc3Bhd25hcmdzOiBvcmlnaW5hbC5hcmdzLFxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBob29rQ2hpbGRQcm9jZXNzKGNwLCBwYXJzZWQpIHtcbiAgICBpZiAoIWlzV2luKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbEVtaXQgPSBjcC5lbWl0O1xuXG4gICAgY3AuZW1pdCA9IGZ1bmN0aW9uIChuYW1lLCBhcmcxKSB7XG4gICAgICAgIC8vIElmIGVtaXR0aW5nIFwiZXhpdFwiIGV2ZW50IGFuZCBleGl0IGNvZGUgaXMgMSwgd2UgbmVlZCB0byBjaGVjayBpZlxuICAgICAgICAvLyB0aGUgY29tbWFuZCBleGlzdHMgYW5kIGVtaXQgYW4gXCJlcnJvclwiIGluc3RlYWRcbiAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9JbmRpZ29Vbml0ZWQvbm9kZS1jcm9zcy1zcGF3bi9pc3N1ZXMvMTZcbiAgICAgICAgaWYgKG5hbWUgPT09ICdleGl0Jykge1xuICAgICAgICAgICAgY29uc3QgZXJyID0gdmVyaWZ5RU5PRU5UKGFyZzEsIHBhcnNlZCwgJ3NwYXduJyk7XG5cbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxFbWl0LmNhbGwoY3AsICdlcnJvcicsIGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb3JpZ2luYWxFbWl0LmFwcGx5KGNwLCBhcmd1bWVudHMpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHByZWZlci1yZXN0LXBhcmFtc1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHZlcmlmeUVOT0VOVChzdGF0dXMsIHBhcnNlZCkge1xuICAgIGlmIChpc1dpbiAmJiBzdGF0dXMgPT09IDEgJiYgIXBhcnNlZC5maWxlKSB7XG4gICAgICAgIHJldHVybiBub3RGb3VuZEVycm9yKHBhcnNlZC5vcmlnaW5hbCwgJ3NwYXduJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHZlcmlmeUVOT0VOVFN5bmMoc3RhdHVzLCBwYXJzZWQpIHtcbiAgICBpZiAoaXNXaW4gJiYgc3RhdHVzID09PSAxICYmICFwYXJzZWQuZmlsZSkge1xuICAgICAgICByZXR1cm4gbm90Rm91bmRFcnJvcihwYXJzZWQub3JpZ2luYWwsICdzcGF3blN5bmMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgaG9va0NoaWxkUHJvY2VzcyxcbiAgICB2ZXJpZnlFTk9FTlQsXG4gICAgdmVyaWZ5RU5PRU5UU3luYyxcbiAgICBub3RGb3VuZEVycm9yLFxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgY3AgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG5jb25zdCBwYXJzZSA9IHJlcXVpcmUoJy4vbGliL3BhcnNlJyk7XG5jb25zdCBlbm9lbnQgPSByZXF1aXJlKCcuL2xpYi9lbm9lbnQnKTtcblxuZnVuY3Rpb24gc3Bhd24oY29tbWFuZCwgYXJncywgb3B0aW9ucykge1xuICAgIC8vIFBhcnNlIHRoZSBhcmd1bWVudHNcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZShjb21tYW5kLCBhcmdzLCBvcHRpb25zKTtcblxuICAgIC8vIFNwYXduIHRoZSBjaGlsZCBwcm9jZXNzXG4gICAgY29uc3Qgc3Bhd25lZCA9IGNwLnNwYXduKHBhcnNlZC5jb21tYW5kLCBwYXJzZWQuYXJncywgcGFyc2VkLm9wdGlvbnMpO1xuXG4gICAgLy8gSG9vayBpbnRvIGNoaWxkIHByb2Nlc3MgXCJleGl0XCIgZXZlbnQgdG8gZW1pdCBhbiBlcnJvciBpZiB0aGUgY29tbWFuZFxuICAgIC8vIGRvZXMgbm90IGV4aXN0cywgc2VlOiBodHRwczovL2dpdGh1Yi5jb20vSW5kaWdvVW5pdGVkL25vZGUtY3Jvc3Mtc3Bhd24vaXNzdWVzLzE2XG4gICAgZW5vZW50Lmhvb2tDaGlsZFByb2Nlc3Moc3Bhd25lZCwgcGFyc2VkKTtcblxuICAgIHJldHVybiBzcGF3bmVkO1xufVxuXG5mdW5jdGlvbiBzcGF3blN5bmMoY29tbWFuZCwgYXJncywgb3B0aW9ucykge1xuICAgIC8vIFBhcnNlIHRoZSBhcmd1bWVudHNcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZShjb21tYW5kLCBhcmdzLCBvcHRpb25zKTtcblxuICAgIC8vIFNwYXduIHRoZSBjaGlsZCBwcm9jZXNzXG4gICAgY29uc3QgcmVzdWx0ID0gY3Auc3Bhd25TeW5jKHBhcnNlZC5jb21tYW5kLCBwYXJzZWQuYXJncywgcGFyc2VkLm9wdGlvbnMpO1xuXG4gICAgLy8gQW5hbHl6ZSBpZiB0aGUgY29tbWFuZCBkb2VzIG5vdCBleGlzdCwgc2VlOiBodHRwczovL2dpdGh1Yi5jb20vSW5kaWdvVW5pdGVkL25vZGUtY3Jvc3Mtc3Bhd24vaXNzdWVzLzE2XG4gICAgcmVzdWx0LmVycm9yID0gcmVzdWx0LmVycm9yIHx8IGVub2VudC52ZXJpZnlFTk9FTlRTeW5jKHJlc3VsdC5zdGF0dXMsIHBhcnNlZCk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNwYXduO1xubW9kdWxlLmV4cG9ydHMuc3Bhd24gPSBzcGF3bjtcbm1vZHVsZS5leHBvcnRzLnN5bmMgPSBzcGF3blN5bmM7XG5cbm1vZHVsZS5leHBvcnRzLl9wYXJzZSA9IHBhcnNlO1xubW9kdWxlLmV4cG9ydHMuX2Vub2VudCA9IGVub2VudDtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBpbnB1dCA9PiB7XG5cdGNvbnN0IExGID0gdHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/ICdcXG4nIDogJ1xcbicuY2hhckNvZGVBdCgpO1xuXHRjb25zdCBDUiA9IHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgPyAnXFxyJyA6ICdcXHInLmNoYXJDb2RlQXQoKTtcblxuXHRpZiAoaW5wdXRbaW5wdXQubGVuZ3RoIC0gMV0gPT09IExGKSB7XG5cdFx0aW5wdXQgPSBpbnB1dC5zbGljZSgwLCBpbnB1dC5sZW5ndGggLSAxKTtcblx0fVxuXG5cdGlmIChpbnB1dFtpbnB1dC5sZW5ndGggLSAxXSA9PT0gQ1IpIHtcblx0XHRpbnB1dCA9IGlucHV0LnNsaWNlKDAsIGlucHV0Lmxlbmd0aCAtIDEpO1xuXHR9XG5cblx0cmV0dXJuIGlucHV0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5jb25zdCBwYXRoS2V5ID0gcmVxdWlyZSgncGF0aC1rZXknKTtcblxuY29uc3QgbnBtUnVuUGF0aCA9IG9wdGlvbnMgPT4ge1xuXHRvcHRpb25zID0ge1xuXHRcdGN3ZDogcHJvY2Vzcy5jd2QoKSxcblx0XHRwYXRoOiBwcm9jZXNzLmVudltwYXRoS2V5KCldLFxuXHRcdGV4ZWNQYXRoOiBwcm9jZXNzLmV4ZWNQYXRoLFxuXHRcdC4uLm9wdGlvbnNcblx0fTtcblxuXHRsZXQgcHJldmlvdXM7XG5cdGxldCBjd2RQYXRoID0gcGF0aC5yZXNvbHZlKG9wdGlvbnMuY3dkKTtcblx0Y29uc3QgcmVzdWx0ID0gW107XG5cblx0d2hpbGUgKHByZXZpb3VzICE9PSBjd2RQYXRoKSB7XG5cdFx0cmVzdWx0LnB1c2gocGF0aC5qb2luKGN3ZFBhdGgsICdub2RlX21vZHVsZXMvLmJpbicpKTtcblx0XHRwcmV2aW91cyA9IGN3ZFBhdGg7XG5cdFx0Y3dkUGF0aCA9IHBhdGgucmVzb2x2ZShjd2RQYXRoLCAnLi4nKTtcblx0fVxuXG5cdC8vIEVuc3VyZSB0aGUgcnVubmluZyBgbm9kZWAgYmluYXJ5IGlzIHVzZWRcblx0Y29uc3QgZXhlY1BhdGhEaXIgPSBwYXRoLnJlc29sdmUob3B0aW9ucy5jd2QsIG9wdGlvbnMuZXhlY1BhdGgsICcuLicpO1xuXHRyZXN1bHQucHVzaChleGVjUGF0aERpcik7XG5cblx0cmV0dXJuIHJlc3VsdC5jb25jYXQob3B0aW9ucy5wYXRoKS5qb2luKHBhdGguZGVsaW1pdGVyKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbnBtUnVuUGF0aDtcbi8vIFRPRE86IFJlbW92ZSB0aGlzIGZvciB0aGUgbmV4dCBtYWpvciByZWxlYXNlXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbnBtUnVuUGF0aDtcblxubW9kdWxlLmV4cG9ydHMuZW52ID0gb3B0aW9ucyA9PiB7XG5cdG9wdGlvbnMgPSB7XG5cdFx0ZW52OiBwcm9jZXNzLmVudixcblx0XHQuLi5vcHRpb25zXG5cdH07XG5cblx0Y29uc3QgZW52ID0gey4uLm9wdGlvbnMuZW52fTtcblx0Y29uc3QgcGF0aCA9IHBhdGhLZXkoe2Vudn0pO1xuXG5cdG9wdGlvbnMucGF0aCA9IGVudltwYXRoXTtcblx0ZW52W3BhdGhdID0gbW9kdWxlLmV4cG9ydHMob3B0aW9ucyk7XG5cblx0cmV0dXJuIGVudjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IG1pbWljRm4gPSAodG8sIGZyb20pID0+IHtcblx0Zm9yIChjb25zdCBwcm9wIG9mIFJlZmxlY3Qub3duS2V5cyhmcm9tKSkge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0bywgcHJvcCwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmcm9tLCBwcm9wKSk7XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1pbWljRm47XG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBmb3IgdGhlIG5leHQgbWFqb3IgcmVsZWFzZVxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG1pbWljRm47XG4iLCIndXNlIHN0cmljdCc7XG5jb25zdCBtaW1pY0ZuID0gcmVxdWlyZSgnbWltaWMtZm4nKTtcblxuY29uc3QgY2FsbGVkRnVuY3Rpb25zID0gbmV3IFdlYWtNYXAoKTtcblxuY29uc3Qgb25ldGltZSA9IChmdW5jdGlvbl8sIG9wdGlvbnMgPSB7fSkgPT4ge1xuXHRpZiAodHlwZW9mIGZ1bmN0aW9uXyAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgZnVuY3Rpb24nKTtcblx0fVxuXG5cdGxldCByZXR1cm5WYWx1ZTtcblx0bGV0IGNhbGxDb3VudCA9IDA7XG5cdGNvbnN0IGZ1bmN0aW9uTmFtZSA9IGZ1bmN0aW9uXy5kaXNwbGF5TmFtZSB8fCBmdW5jdGlvbl8ubmFtZSB8fCAnPGFub255bW91cz4nO1xuXG5cdGNvbnN0IG9uZXRpbWUgPSBmdW5jdGlvbiAoLi4uYXJndW1lbnRzXykge1xuXHRcdGNhbGxlZEZ1bmN0aW9ucy5zZXQob25ldGltZSwgKytjYWxsQ291bnQpO1xuXG5cdFx0aWYgKGNhbGxDb3VudCA9PT0gMSkge1xuXHRcdFx0cmV0dXJuVmFsdWUgPSBmdW5jdGlvbl8uYXBwbHkodGhpcywgYXJndW1lbnRzXyk7XG5cdFx0XHRmdW5jdGlvbl8gPSBudWxsO1xuXHRcdH0gZWxzZSBpZiAob3B0aW9ucy50aHJvdyA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBGdW5jdGlvbiBcXGAke2Z1bmN0aW9uTmFtZX1cXGAgY2FuIG9ubHkgYmUgY2FsbGVkIG9uY2VgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmV0dXJuVmFsdWU7XG5cdH07XG5cblx0bWltaWNGbihvbmV0aW1lLCBmdW5jdGlvbl8pO1xuXHRjYWxsZWRGdW5jdGlvbnMuc2V0KG9uZXRpbWUsIGNhbGxDb3VudCk7XG5cblx0cmV0dXJuIG9uZXRpbWU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9uZXRpbWU7XG4vLyBUT0RPOiBSZW1vdmUgdGhpcyBmb3IgdGhlIG5leHQgbWFqb3IgcmVsZWFzZVxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG9uZXRpbWU7XG5cbm1vZHVsZS5leHBvcnRzLmNhbGxDb3VudCA9IGZ1bmN0aW9uXyA9PiB7XG5cdGlmICghY2FsbGVkRnVuY3Rpb25zLmhhcyhmdW5jdGlvbl8pKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBUaGUgZ2l2ZW4gZnVuY3Rpb24gXFxgJHtmdW5jdGlvbl8ubmFtZX1cXGAgaXMgbm90IHdyYXBwZWQgYnkgdGhlIFxcYG9uZXRpbWVcXGAgcGFja2FnZWApO1xuXHR9XG5cblx0cmV0dXJuIGNhbGxlZEZ1bmN0aW9ucy5nZXQoZnVuY3Rpb25fKTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cyxcIl9fZXNNb2R1bGVcIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuU0lHTkFMUz12b2lkIDA7XG5cbmNvbnN0IFNJR05BTFM9W1xue1xubmFtZTpcIlNJR0hVUFwiLFxubnVtYmVyOjEsXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiVGVybWluYWwgY2xvc2VkXCIsXG5zdGFuZGFyZDpcInBvc2l4XCJ9LFxuXG57XG5uYW1lOlwiU0lHSU5UXCIsXG5udW1iZXI6MixcbmFjdGlvbjpcInRlcm1pbmF0ZVwiLFxuZGVzY3JpcHRpb246XCJVc2VyIGludGVycnVwdGlvbiB3aXRoIENUUkwtQ1wiLFxuc3RhbmRhcmQ6XCJhbnNpXCJ9LFxuXG57XG5uYW1lOlwiU0lHUVVJVFwiLFxubnVtYmVyOjMsXG5hY3Rpb246XCJjb3JlXCIsXG5kZXNjcmlwdGlvbjpcIlVzZXIgaW50ZXJydXB0aW9uIHdpdGggQ1RSTC1cXFxcXCIsXG5zdGFuZGFyZDpcInBvc2l4XCJ9LFxuXG57XG5uYW1lOlwiU0lHSUxMXCIsXG5udW1iZXI6NCxcbmFjdGlvbjpcImNvcmVcIixcbmRlc2NyaXB0aW9uOlwiSW52YWxpZCBtYWNoaW5lIGluc3RydWN0aW9uXCIsXG5zdGFuZGFyZDpcImFuc2lcIn0sXG5cbntcbm5hbWU6XCJTSUdUUkFQXCIsXG5udW1iZXI6NSxcbmFjdGlvbjpcImNvcmVcIixcbmRlc2NyaXB0aW9uOlwiRGVidWdnZXIgYnJlYWtwb2ludFwiLFxuc3RhbmRhcmQ6XCJwb3NpeFwifSxcblxue1xubmFtZTpcIlNJR0FCUlRcIixcbm51bWJlcjo2LFxuYWN0aW9uOlwiY29yZVwiLFxuZGVzY3JpcHRpb246XCJBYm9ydGVkXCIsXG5zdGFuZGFyZDpcImFuc2lcIn0sXG5cbntcbm5hbWU6XCJTSUdJT1RcIixcbm51bWJlcjo2LFxuYWN0aW9uOlwiY29yZVwiLFxuZGVzY3JpcHRpb246XCJBYm9ydGVkXCIsXG5zdGFuZGFyZDpcImJzZFwifSxcblxue1xubmFtZTpcIlNJR0JVU1wiLFxubnVtYmVyOjcsXG5hY3Rpb246XCJjb3JlXCIsXG5kZXNjcmlwdGlvbjpcblwiQnVzIGVycm9yIGR1ZSB0byBtaXNhbGlnbmVkLCBub24tZXhpc3RpbmcgYWRkcmVzcyBvciBwYWdpbmcgZXJyb3JcIixcbnN0YW5kYXJkOlwiYnNkXCJ9LFxuXG57XG5uYW1lOlwiU0lHRU1UXCIsXG5udW1iZXI6NyxcbmFjdGlvbjpcInRlcm1pbmF0ZVwiLFxuZGVzY3JpcHRpb246XCJDb21tYW5kIHNob3VsZCBiZSBlbXVsYXRlZCBidXQgaXMgbm90IGltcGxlbWVudGVkXCIsXG5zdGFuZGFyZDpcIm90aGVyXCJ9LFxuXG57XG5uYW1lOlwiU0lHRlBFXCIsXG5udW1iZXI6OCxcbmFjdGlvbjpcImNvcmVcIixcbmRlc2NyaXB0aW9uOlwiRmxvYXRpbmcgcG9pbnQgYXJpdGhtZXRpYyBlcnJvclwiLFxuc3RhbmRhcmQ6XCJhbnNpXCJ9LFxuXG57XG5uYW1lOlwiU0lHS0lMTFwiLFxubnVtYmVyOjksXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiRm9yY2VkIHRlcm1pbmF0aW9uXCIsXG5zdGFuZGFyZDpcInBvc2l4XCIsXG5mb3JjZWQ6dHJ1ZX0sXG5cbntcbm5hbWU6XCJTSUdVU1IxXCIsXG5udW1iZXI6MTAsXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiQXBwbGljYXRpb24tc3BlY2lmaWMgc2lnbmFsXCIsXG5zdGFuZGFyZDpcInBvc2l4XCJ9LFxuXG57XG5uYW1lOlwiU0lHU0VHVlwiLFxubnVtYmVyOjExLFxuYWN0aW9uOlwiY29yZVwiLFxuZGVzY3JpcHRpb246XCJTZWdtZW50YXRpb24gZmF1bHRcIixcbnN0YW5kYXJkOlwiYW5zaVwifSxcblxue1xubmFtZTpcIlNJR1VTUjJcIixcbm51bWJlcjoxMixcbmFjdGlvbjpcInRlcm1pbmF0ZVwiLFxuZGVzY3JpcHRpb246XCJBcHBsaWNhdGlvbi1zcGVjaWZpYyBzaWduYWxcIixcbnN0YW5kYXJkOlwicG9zaXhcIn0sXG5cbntcbm5hbWU6XCJTSUdQSVBFXCIsXG5udW1iZXI6MTMsXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiQnJva2VuIHBpcGUgb3Igc29ja2V0XCIsXG5zdGFuZGFyZDpcInBvc2l4XCJ9LFxuXG57XG5uYW1lOlwiU0lHQUxSTVwiLFxubnVtYmVyOjE0LFxuYWN0aW9uOlwidGVybWluYXRlXCIsXG5kZXNjcmlwdGlvbjpcIlRpbWVvdXQgb3IgdGltZXJcIixcbnN0YW5kYXJkOlwicG9zaXhcIn0sXG5cbntcbm5hbWU6XCJTSUdURVJNXCIsXG5udW1iZXI6MTUsXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiVGVybWluYXRpb25cIixcbnN0YW5kYXJkOlwiYW5zaVwifSxcblxue1xubmFtZTpcIlNJR1NUS0ZMVFwiLFxubnVtYmVyOjE2LFxuYWN0aW9uOlwidGVybWluYXRlXCIsXG5kZXNjcmlwdGlvbjpcIlN0YWNrIGlzIGVtcHR5IG9yIG92ZXJmbG93ZWRcIixcbnN0YW5kYXJkOlwib3RoZXJcIn0sXG5cbntcbm5hbWU6XCJTSUdDSExEXCIsXG5udW1iZXI6MTcsXG5hY3Rpb246XCJpZ25vcmVcIixcbmRlc2NyaXB0aW9uOlwiQ2hpbGQgcHJvY2VzcyB0ZXJtaW5hdGVkLCBwYXVzZWQgb3IgdW5wYXVzZWRcIixcbnN0YW5kYXJkOlwicG9zaXhcIn0sXG5cbntcbm5hbWU6XCJTSUdDTERcIixcbm51bWJlcjoxNyxcbmFjdGlvbjpcImlnbm9yZVwiLFxuZGVzY3JpcHRpb246XCJDaGlsZCBwcm9jZXNzIHRlcm1pbmF0ZWQsIHBhdXNlZCBvciB1bnBhdXNlZFwiLFxuc3RhbmRhcmQ6XCJvdGhlclwifSxcblxue1xubmFtZTpcIlNJR0NPTlRcIixcbm51bWJlcjoxOCxcbmFjdGlvbjpcInVucGF1c2VcIixcbmRlc2NyaXB0aW9uOlwiVW5wYXVzZWRcIixcbnN0YW5kYXJkOlwicG9zaXhcIixcbmZvcmNlZDp0cnVlfSxcblxue1xubmFtZTpcIlNJR1NUT1BcIixcbm51bWJlcjoxOSxcbmFjdGlvbjpcInBhdXNlXCIsXG5kZXNjcmlwdGlvbjpcIlBhdXNlZFwiLFxuc3RhbmRhcmQ6XCJwb3NpeFwiLFxuZm9yY2VkOnRydWV9LFxuXG57XG5uYW1lOlwiU0lHVFNUUFwiLFxubnVtYmVyOjIwLFxuYWN0aW9uOlwicGF1c2VcIixcbmRlc2NyaXB0aW9uOlwiUGF1c2VkIHVzaW5nIENUUkwtWiBvciBcXFwic3VzcGVuZFxcXCJcIixcbnN0YW5kYXJkOlwicG9zaXhcIn0sXG5cbntcbm5hbWU6XCJTSUdUVElOXCIsXG5udW1iZXI6MjEsXG5hY3Rpb246XCJwYXVzZVwiLFxuZGVzY3JpcHRpb246XCJCYWNrZ3JvdW5kIHByb2Nlc3MgY2Fubm90IHJlYWQgdGVybWluYWwgaW5wdXRcIixcbnN0YW5kYXJkOlwicG9zaXhcIn0sXG5cbntcbm5hbWU6XCJTSUdCUkVBS1wiLFxubnVtYmVyOjIxLFxuYWN0aW9uOlwidGVybWluYXRlXCIsXG5kZXNjcmlwdGlvbjpcIlVzZXIgaW50ZXJydXB0aW9uIHdpdGggQ1RSTC1CUkVBS1wiLFxuc3RhbmRhcmQ6XCJvdGhlclwifSxcblxue1xubmFtZTpcIlNJR1RUT1VcIixcbm51bWJlcjoyMixcbmFjdGlvbjpcInBhdXNlXCIsXG5kZXNjcmlwdGlvbjpcIkJhY2tncm91bmQgcHJvY2VzcyBjYW5ub3Qgd3JpdGUgdG8gdGVybWluYWwgb3V0cHV0XCIsXG5zdGFuZGFyZDpcInBvc2l4XCJ9LFxuXG57XG5uYW1lOlwiU0lHVVJHXCIsXG5udW1iZXI6MjMsXG5hY3Rpb246XCJpZ25vcmVcIixcbmRlc2NyaXB0aW9uOlwiU29ja2V0IHJlY2VpdmVkIG91dC1vZi1iYW5kIGRhdGFcIixcbnN0YW5kYXJkOlwiYnNkXCJ9LFxuXG57XG5uYW1lOlwiU0lHWENQVVwiLFxubnVtYmVyOjI0LFxuYWN0aW9uOlwiY29yZVwiLFxuZGVzY3JpcHRpb246XCJQcm9jZXNzIHRpbWVkIG91dFwiLFxuc3RhbmRhcmQ6XCJic2RcIn0sXG5cbntcbm5hbWU6XCJTSUdYRlNaXCIsXG5udW1iZXI6MjUsXG5hY3Rpb246XCJjb3JlXCIsXG5kZXNjcmlwdGlvbjpcIkZpbGUgdG9vIGJpZ1wiLFxuc3RhbmRhcmQ6XCJic2RcIn0sXG5cbntcbm5hbWU6XCJTSUdWVEFMUk1cIixcbm51bWJlcjoyNixcbmFjdGlvbjpcInRlcm1pbmF0ZVwiLFxuZGVzY3JpcHRpb246XCJUaW1lb3V0IG9yIHRpbWVyXCIsXG5zdGFuZGFyZDpcImJzZFwifSxcblxue1xubmFtZTpcIlNJR1BST0ZcIixcbm51bWJlcjoyNyxcbmFjdGlvbjpcInRlcm1pbmF0ZVwiLFxuZGVzY3JpcHRpb246XCJUaW1lb3V0IG9yIHRpbWVyXCIsXG5zdGFuZGFyZDpcImJzZFwifSxcblxue1xubmFtZTpcIlNJR1dJTkNIXCIsXG5udW1iZXI6MjgsXG5hY3Rpb246XCJpZ25vcmVcIixcbmRlc2NyaXB0aW9uOlwiVGVybWluYWwgd2luZG93IHNpemUgY2hhbmdlZFwiLFxuc3RhbmRhcmQ6XCJic2RcIn0sXG5cbntcbm5hbWU6XCJTSUdJT1wiLFxubnVtYmVyOjI5LFxuYWN0aW9uOlwidGVybWluYXRlXCIsXG5kZXNjcmlwdGlvbjpcIkkvTyBpcyBhdmFpbGFibGVcIixcbnN0YW5kYXJkOlwib3RoZXJcIn0sXG5cbntcbm5hbWU6XCJTSUdQT0xMXCIsXG5udW1iZXI6MjksXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiV2F0Y2hlZCBldmVudFwiLFxuc3RhbmRhcmQ6XCJvdGhlclwifSxcblxue1xubmFtZTpcIlNJR0lORk9cIixcbm51bWJlcjoyOSxcbmFjdGlvbjpcImlnbm9yZVwiLFxuZGVzY3JpcHRpb246XCJSZXF1ZXN0IGZvciBwcm9jZXNzIGluZm9ybWF0aW9uXCIsXG5zdGFuZGFyZDpcIm90aGVyXCJ9LFxuXG57XG5uYW1lOlwiU0lHUFdSXCIsXG5udW1iZXI6MzAsXG5hY3Rpb246XCJ0ZXJtaW5hdGVcIixcbmRlc2NyaXB0aW9uOlwiRGV2aWNlIHJ1bm5pbmcgb3V0IG9mIHBvd2VyXCIsXG5zdGFuZGFyZDpcInN5c3RlbXZcIn0sXG5cbntcbm5hbWU6XCJTSUdTWVNcIixcbm51bWJlcjozMSxcbmFjdGlvbjpcImNvcmVcIixcbmRlc2NyaXB0aW9uOlwiSW52YWxpZCBzeXN0ZW0gY2FsbFwiLFxuc3RhbmRhcmQ6XCJvdGhlclwifSxcblxue1xubmFtZTpcIlNJR1VOVVNFRFwiLFxubnVtYmVyOjMxLFxuYWN0aW9uOlwidGVybWluYXRlXCIsXG5kZXNjcmlwdGlvbjpcIkludmFsaWQgc3lzdGVtIGNhbGxcIixcbnN0YW5kYXJkOlwib3RoZXJcIn1dO2V4cG9ydHMuU0lHTkFMUz1TSUdOQUxTO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29yZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cyxcIl9fZXNNb2R1bGVcIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuU0lHUlRNQVg9ZXhwb3J0cy5nZXRSZWFsdGltZVNpZ25hbHM9dm9pZCAwO1xuY29uc3QgZ2V0UmVhbHRpbWVTaWduYWxzPWZ1bmN0aW9uKCl7XG5jb25zdCBsZW5ndGg9U0lHUlRNQVgtU0lHUlRNSU4rMTtcbnJldHVybiBBcnJheS5mcm9tKHtsZW5ndGh9LGdldFJlYWx0aW1lU2lnbmFsKTtcbn07ZXhwb3J0cy5nZXRSZWFsdGltZVNpZ25hbHM9Z2V0UmVhbHRpbWVTaWduYWxzO1xuXG5jb25zdCBnZXRSZWFsdGltZVNpZ25hbD1mdW5jdGlvbih2YWx1ZSxpbmRleCl7XG5yZXR1cm57XG5uYW1lOmBTSUdSVCR7aW5kZXgrMX1gLFxubnVtYmVyOlNJR1JUTUlOK2luZGV4LFxuYWN0aW9uOlwidGVybWluYXRlXCIsXG5kZXNjcmlwdGlvbjpcIkFwcGxpY2F0aW9uLXNwZWNpZmljIHNpZ25hbCAocmVhbHRpbWUpXCIsXG5zdGFuZGFyZDpcInBvc2l4XCJ9O1xuXG59O1xuXG5jb25zdCBTSUdSVE1JTj0zNDtcbmNvbnN0IFNJR1JUTUFYPTY0O2V4cG9ydHMuU0lHUlRNQVg9U0lHUlRNQVg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1yZWFsdGltZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cyxcIl9fZXNNb2R1bGVcIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuZ2V0U2lnbmFscz12b2lkIDA7dmFyIF9vcz1yZXF1aXJlKFwib3NcIik7XG5cbnZhciBfY29yZT1yZXF1aXJlKFwiLi9jb3JlLmpzXCIpO1xudmFyIF9yZWFsdGltZT1yZXF1aXJlKFwiLi9yZWFsdGltZS5qc1wiKTtcblxuXG5cbmNvbnN0IGdldFNpZ25hbHM9ZnVuY3Rpb24oKXtcbmNvbnN0IHJlYWx0aW1lU2lnbmFscz0oMCxfcmVhbHRpbWUuZ2V0UmVhbHRpbWVTaWduYWxzKSgpO1xuY29uc3Qgc2lnbmFscz1bLi4uX2NvcmUuU0lHTkFMUywuLi5yZWFsdGltZVNpZ25hbHNdLm1hcChub3JtYWxpemVTaWduYWwpO1xucmV0dXJuIHNpZ25hbHM7XG59O2V4cG9ydHMuZ2V0U2lnbmFscz1nZXRTaWduYWxzO1xuXG5cblxuXG5cblxuXG5jb25zdCBub3JtYWxpemVTaWduYWw9ZnVuY3Rpb24oe1xubmFtZSxcbm51bWJlcjpkZWZhdWx0TnVtYmVyLFxuZGVzY3JpcHRpb24sXG5hY3Rpb24sXG5mb3JjZWQ9ZmFsc2UsXG5zdGFuZGFyZH0pXG57XG5jb25zdHtcbnNpZ25hbHM6e1tuYW1lXTpjb25zdGFudFNpZ25hbH19PVxuX29zLmNvbnN0YW50cztcbmNvbnN0IHN1cHBvcnRlZD1jb25zdGFudFNpZ25hbCE9PXVuZGVmaW5lZDtcbmNvbnN0IG51bWJlcj1zdXBwb3J0ZWQ/Y29uc3RhbnRTaWduYWw6ZGVmYXVsdE51bWJlcjtcbnJldHVybntuYW1lLG51bWJlcixkZXNjcmlwdGlvbixzdXBwb3J0ZWQsYWN0aW9uLGZvcmNlZCxzdGFuZGFyZH07XG59O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2lnbmFscy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cyxcIl9fZXNNb2R1bGVcIix7dmFsdWU6dHJ1ZX0pO2V4cG9ydHMuc2lnbmFsc0J5TnVtYmVyPWV4cG9ydHMuc2lnbmFsc0J5TmFtZT12b2lkIDA7dmFyIF9vcz1yZXF1aXJlKFwib3NcIik7XG5cbnZhciBfc2lnbmFscz1yZXF1aXJlKFwiLi9zaWduYWxzLmpzXCIpO1xudmFyIF9yZWFsdGltZT1yZXF1aXJlKFwiLi9yZWFsdGltZS5qc1wiKTtcblxuXG5cbmNvbnN0IGdldFNpZ25hbHNCeU5hbWU9ZnVuY3Rpb24oKXtcbmNvbnN0IHNpZ25hbHM9KDAsX3NpZ25hbHMuZ2V0U2lnbmFscykoKTtcbnJldHVybiBzaWduYWxzLnJlZHVjZShnZXRTaWduYWxCeU5hbWUse30pO1xufTtcblxuY29uc3QgZ2V0U2lnbmFsQnlOYW1lPWZ1bmN0aW9uKFxuc2lnbmFsQnlOYW1lTWVtbyxcbntuYW1lLG51bWJlcixkZXNjcmlwdGlvbixzdXBwb3J0ZWQsYWN0aW9uLGZvcmNlZCxzdGFuZGFyZH0pXG57XG5yZXR1cm57XG4uLi5zaWduYWxCeU5hbWVNZW1vLFxuW25hbWVdOntuYW1lLG51bWJlcixkZXNjcmlwdGlvbixzdXBwb3J0ZWQsYWN0aW9uLGZvcmNlZCxzdGFuZGFyZH19O1xuXG59O1xuXG5jb25zdCBzaWduYWxzQnlOYW1lPWdldFNpZ25hbHNCeU5hbWUoKTtleHBvcnRzLnNpZ25hbHNCeU5hbWU9c2lnbmFsc0J5TmFtZTtcblxuXG5cblxuY29uc3QgZ2V0U2lnbmFsc0J5TnVtYmVyPWZ1bmN0aW9uKCl7XG5jb25zdCBzaWduYWxzPSgwLF9zaWduYWxzLmdldFNpZ25hbHMpKCk7XG5jb25zdCBsZW5ndGg9X3JlYWx0aW1lLlNJR1JUTUFYKzE7XG5jb25zdCBzaWduYWxzQT1BcnJheS5mcm9tKHtsZW5ndGh9LCh2YWx1ZSxudW1iZXIpPT5cbmdldFNpZ25hbEJ5TnVtYmVyKG51bWJlcixzaWduYWxzKSk7XG5cbnJldHVybiBPYmplY3QuYXNzaWduKHt9LC4uLnNpZ25hbHNBKTtcbn07XG5cbmNvbnN0IGdldFNpZ25hbEJ5TnVtYmVyPWZ1bmN0aW9uKG51bWJlcixzaWduYWxzKXtcbmNvbnN0IHNpZ25hbD1maW5kU2lnbmFsQnlOdW1iZXIobnVtYmVyLHNpZ25hbHMpO1xuXG5pZihzaWduYWw9PT11bmRlZmluZWQpe1xucmV0dXJue307XG59XG5cbmNvbnN0e25hbWUsZGVzY3JpcHRpb24sc3VwcG9ydGVkLGFjdGlvbixmb3JjZWQsc3RhbmRhcmR9PXNpZ25hbDtcbnJldHVybntcbltudW1iZXJdOntcbm5hbWUsXG5udW1iZXIsXG5kZXNjcmlwdGlvbixcbnN1cHBvcnRlZCxcbmFjdGlvbixcbmZvcmNlZCxcbnN0YW5kYXJkfX07XG5cblxufTtcblxuXG5cbmNvbnN0IGZpbmRTaWduYWxCeU51bWJlcj1mdW5jdGlvbihudW1iZXIsc2lnbmFscyl7XG5jb25zdCBzaWduYWw9c2lnbmFscy5maW5kKCh7bmFtZX0pPT5fb3MuY29uc3RhbnRzLnNpZ25hbHNbbmFtZV09PT1udW1iZXIpO1xuXG5pZihzaWduYWwhPT11bmRlZmluZWQpe1xucmV0dXJuIHNpZ25hbDtcbn1cblxucmV0dXJuIHNpZ25hbHMuZmluZChzaWduYWxBPT5zaWduYWxBLm51bWJlcj09PW51bWJlcik7XG59O1xuXG5jb25zdCBzaWduYWxzQnlOdW1iZXI9Z2V0U2lnbmFsc0J5TnVtYmVyKCk7ZXhwb3J0cy5zaWduYWxzQnlOdW1iZXI9c2lnbmFsc0J5TnVtYmVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFpbi5qcy5tYXAiLCIndXNlIHN0cmljdCc7XG5jb25zdCB7c2lnbmFsc0J5TmFtZX0gPSByZXF1aXJlKCdodW1hbi1zaWduYWxzJyk7XG5cbmNvbnN0IGdldEVycm9yUHJlZml4ID0gKHt0aW1lZE91dCwgdGltZW91dCwgZXJyb3JDb2RlLCBzaWduYWwsIHNpZ25hbERlc2NyaXB0aW9uLCBleGl0Q29kZSwgaXNDYW5jZWxlZH0pID0+IHtcblx0aWYgKHRpbWVkT3V0KSB7XG5cdFx0cmV0dXJuIGB0aW1lZCBvdXQgYWZ0ZXIgJHt0aW1lb3V0fSBtaWxsaXNlY29uZHNgO1xuXHR9XG5cblx0aWYgKGlzQ2FuY2VsZWQpIHtcblx0XHRyZXR1cm4gJ3dhcyBjYW5jZWxlZCc7XG5cdH1cblxuXHRpZiAoZXJyb3JDb2RlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gYGZhaWxlZCB3aXRoICR7ZXJyb3JDb2RlfWA7XG5cdH1cblxuXHRpZiAoc2lnbmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gYHdhcyBraWxsZWQgd2l0aCAke3NpZ25hbH0gKCR7c2lnbmFsRGVzY3JpcHRpb259KWA7XG5cdH1cblxuXHRpZiAoZXhpdENvZGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBgZmFpbGVkIHdpdGggZXhpdCBjb2RlICR7ZXhpdENvZGV9YDtcblx0fVxuXG5cdHJldHVybiAnZmFpbGVkJztcbn07XG5cbmNvbnN0IG1ha2VFcnJvciA9ICh7XG5cdHN0ZG91dCxcblx0c3RkZXJyLFxuXHRhbGwsXG5cdGVycm9yLFxuXHRzaWduYWwsXG5cdGV4aXRDb2RlLFxuXHRjb21tYW5kLFxuXHRlc2NhcGVkQ29tbWFuZCxcblx0dGltZWRPdXQsXG5cdGlzQ2FuY2VsZWQsXG5cdGtpbGxlZCxcblx0cGFyc2VkOiB7b3B0aW9uczoge3RpbWVvdXR9fVxufSkgPT4ge1xuXHQvLyBgc2lnbmFsYCBhbmQgYGV4aXRDb2RlYCBlbWl0dGVkIG9uIGBzcGF3bmVkLm9uKCdleGl0JylgIGV2ZW50IGNhbiBiZSBgbnVsbGAuXG5cdC8vIFdlIG5vcm1hbGl6ZSB0aGVtIHRvIGB1bmRlZmluZWRgXG5cdGV4aXRDb2RlID0gZXhpdENvZGUgPT09IG51bGwgPyB1bmRlZmluZWQgOiBleGl0Q29kZTtcblx0c2lnbmFsID0gc2lnbmFsID09PSBudWxsID8gdW5kZWZpbmVkIDogc2lnbmFsO1xuXHRjb25zdCBzaWduYWxEZXNjcmlwdGlvbiA9IHNpZ25hbCA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogc2lnbmFsc0J5TmFtZVtzaWduYWxdLmRlc2NyaXB0aW9uO1xuXG5cdGNvbnN0IGVycm9yQ29kZSA9IGVycm9yICYmIGVycm9yLmNvZGU7XG5cblx0Y29uc3QgcHJlZml4ID0gZ2V0RXJyb3JQcmVmaXgoe3RpbWVkT3V0LCB0aW1lb3V0LCBlcnJvckNvZGUsIHNpZ25hbCwgc2lnbmFsRGVzY3JpcHRpb24sIGV4aXRDb2RlLCBpc0NhbmNlbGVkfSk7XG5cdGNvbnN0IGV4ZWNhTWVzc2FnZSA9IGBDb21tYW5kICR7cHJlZml4fTogJHtjb21tYW5kfWA7XG5cdGNvbnN0IGlzRXJyb3IgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXJyb3IpID09PSAnW29iamVjdCBFcnJvcl0nO1xuXHRjb25zdCBzaG9ydE1lc3NhZ2UgPSBpc0Vycm9yID8gYCR7ZXhlY2FNZXNzYWdlfVxcbiR7ZXJyb3IubWVzc2FnZX1gIDogZXhlY2FNZXNzYWdlO1xuXHRjb25zdCBtZXNzYWdlID0gW3Nob3J0TWVzc2FnZSwgc3RkZXJyLCBzdGRvdXRdLmZpbHRlcihCb29sZWFuKS5qb2luKCdcXG4nKTtcblxuXHRpZiAoaXNFcnJvcikge1xuXHRcdGVycm9yLm9yaWdpbmFsTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG5cdFx0ZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdH0gZWxzZSB7XG5cdFx0ZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG5cdH1cblxuXHRlcnJvci5zaG9ydE1lc3NhZ2UgPSBzaG9ydE1lc3NhZ2U7XG5cdGVycm9yLmNvbW1hbmQgPSBjb21tYW5kO1xuXHRlcnJvci5lc2NhcGVkQ29tbWFuZCA9IGVzY2FwZWRDb21tYW5kO1xuXHRlcnJvci5leGl0Q29kZSA9IGV4aXRDb2RlO1xuXHRlcnJvci5zaWduYWwgPSBzaWduYWw7XG5cdGVycm9yLnNpZ25hbERlc2NyaXB0aW9uID0gc2lnbmFsRGVzY3JpcHRpb247XG5cdGVycm9yLnN0ZG91dCA9IHN0ZG91dDtcblx0ZXJyb3Iuc3RkZXJyID0gc3RkZXJyO1xuXG5cdGlmIChhbGwgIT09IHVuZGVmaW5lZCkge1xuXHRcdGVycm9yLmFsbCA9IGFsbDtcblx0fVxuXG5cdGlmICgnYnVmZmVyZWREYXRhJyBpbiBlcnJvcikge1xuXHRcdGRlbGV0ZSBlcnJvci5idWZmZXJlZERhdGE7XG5cdH1cblxuXHRlcnJvci5mYWlsZWQgPSB0cnVlO1xuXHRlcnJvci50aW1lZE91dCA9IEJvb2xlYW4odGltZWRPdXQpO1xuXHRlcnJvci5pc0NhbmNlbGVkID0gaXNDYW5jZWxlZDtcblx0ZXJyb3Iua2lsbGVkID0ga2lsbGVkICYmICF0aW1lZE91dDtcblxuXHRyZXR1cm4gZXJyb3I7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1ha2VFcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IGFsaWFzZXMgPSBbJ3N0ZGluJywgJ3N0ZG91dCcsICdzdGRlcnInXTtcblxuY29uc3QgaGFzQWxpYXMgPSBvcHRpb25zID0+IGFsaWFzZXMuc29tZShhbGlhcyA9PiBvcHRpb25zW2FsaWFzXSAhPT0gdW5kZWZpbmVkKTtcblxuY29uc3Qgbm9ybWFsaXplU3RkaW8gPSBvcHRpb25zID0+IHtcblx0aWYgKCFvcHRpb25zKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3Qge3N0ZGlvfSA9IG9wdGlvbnM7XG5cblx0aWYgKHN0ZGlvID09PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gYWxpYXNlcy5tYXAoYWxpYXMgPT4gb3B0aW9uc1thbGlhc10pO1xuXHR9XG5cblx0aWYgKGhhc0FsaWFzKG9wdGlvbnMpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKGBJdCdzIG5vdCBwb3NzaWJsZSB0byBwcm92aWRlIFxcYHN0ZGlvXFxgIGluIGNvbWJpbmF0aW9uIHdpdGggb25lIG9mICR7YWxpYXNlcy5tYXAoYWxpYXMgPT4gYFxcYCR7YWxpYXN9XFxgYCkuam9pbignLCAnKX1gKTtcblx0fVxuXG5cdGlmICh0eXBlb2Ygc3RkaW8gPT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIHN0ZGlvO1xuXHR9XG5cblx0aWYgKCFBcnJheS5pc0FycmF5KHN0ZGlvKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFxcYHN0ZGlvXFxgIHRvIGJlIG9mIHR5cGUgXFxgc3RyaW5nXFxgIG9yIFxcYEFycmF5XFxgLCBnb3QgXFxgJHt0eXBlb2Ygc3RkaW99XFxgYCk7XG5cdH1cblxuXHRjb25zdCBsZW5ndGggPSBNYXRoLm1heChzdGRpby5sZW5ndGgsIGFsaWFzZXMubGVuZ3RoKTtcblx0cmV0dXJuIEFycmF5LmZyb20oe2xlbmd0aH0sICh2YWx1ZSwgaW5kZXgpID0+IHN0ZGlvW2luZGV4XSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vcm1hbGl6ZVN0ZGlvO1xuXG4vLyBgaXBjYCBpcyBwdXNoZWQgdW5sZXNzIGl0IGlzIGFscmVhZHkgcHJlc2VudFxubW9kdWxlLmV4cG9ydHMubm9kZSA9IG9wdGlvbnMgPT4ge1xuXHRjb25zdCBzdGRpbyA9IG5vcm1hbGl6ZVN0ZGlvKG9wdGlvbnMpO1xuXG5cdGlmIChzdGRpbyA9PT0gJ2lwYycpIHtcblx0XHRyZXR1cm4gJ2lwYyc7XG5cdH1cblxuXHRpZiAoc3RkaW8gPT09IHVuZGVmaW5lZCB8fCB0eXBlb2Ygc3RkaW8gPT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIFtzdGRpbywgc3RkaW8sIHN0ZGlvLCAnaXBjJ107XG5cdH1cblxuXHRpZiAoc3RkaW8uaW5jbHVkZXMoJ2lwYycpKSB7XG5cdFx0cmV0dXJuIHN0ZGlvO1xuXHR9XG5cblx0cmV0dXJuIFsuLi5zdGRpbywgJ2lwYyddO1xufTtcbiIsIi8vIFRoaXMgaXMgbm90IHRoZSBzZXQgb2YgYWxsIHBvc3NpYmxlIHNpZ25hbHMuXG4vL1xuLy8gSXQgSVMsIGhvd2V2ZXIsIHRoZSBzZXQgb2YgYWxsIHNpZ25hbHMgdGhhdCB0cmlnZ2VyXG4vLyBhbiBleGl0IG9uIGVpdGhlciBMaW51eCBvciBCU0Qgc3lzdGVtcy4gIExpbnV4IGlzIGFcbi8vIHN1cGVyc2V0IG9mIHRoZSBzaWduYWwgbmFtZXMgc3VwcG9ydGVkIG9uIEJTRCwgYW5kXG4vLyB0aGUgdW5rbm93biBzaWduYWxzIGp1c3QgZmFpbCB0byByZWdpc3Rlciwgc28gd2UgY2FuXG4vLyBjYXRjaCB0aGF0IGVhc2lseSBlbm91Z2guXG4vL1xuLy8gRG9uJ3QgYm90aGVyIHdpdGggU0lHS0lMTC4gIEl0J3MgdW5jYXRjaGFibGUsIHdoaWNoXG4vLyBtZWFucyB0aGF0IHdlIGNhbid0IGZpcmUgYW55IGNhbGxiYWNrcyBhbnl3YXkuXG4vL1xuLy8gSWYgYSB1c2VyIGRvZXMgaGFwcGVuIHRvIHJlZ2lzdGVyIGEgaGFuZGxlciBvbiBhIG5vbi1cbi8vIGZhdGFsIHNpZ25hbCBsaWtlIFNJR1dJTkNIIG9yIHNvbWV0aGluZywgYW5kIHRoZW5cbi8vIGV4aXQsIGl0J2xsIGVuZCB1cCBmaXJpbmcgYHByb2Nlc3MuZW1pdCgnZXhpdCcpYCwgc29cbi8vIHRoZSBoYW5kbGVyIHdpbGwgYmUgZmlyZWQgYW55d2F5LlxuLy9cbi8vIFNJR0JVUywgU0lHRlBFLCBTSUdTRUdWIGFuZCBTSUdJTEwsIHdoZW4gbm90IHJhaXNlZFxuLy8gYXJ0aWZpY2lhbGx5LCBpbmhlcmVudGx5IGxlYXZlIHRoZSBwcm9jZXNzIGluIGFcbi8vIHN0YXRlIGZyb20gd2hpY2ggaXQgaXMgbm90IHNhZmUgdG8gdHJ5IGFuZCBlbnRlciBKU1xuLy8gbGlzdGVuZXJzLlxubW9kdWxlLmV4cG9ydHMgPSBbXG4gICdTSUdBQlJUJyxcbiAgJ1NJR0FMUk0nLFxuICAnU0lHSFVQJyxcbiAgJ1NJR0lOVCcsXG4gICdTSUdURVJNJ1xuXVxuXG5pZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuICBtb2R1bGUuZXhwb3J0cy5wdXNoKFxuICAgICdTSUdWVEFMUk0nLFxuICAgICdTSUdYQ1BVJyxcbiAgICAnU0lHWEZTWicsXG4gICAgJ1NJR1VTUjInLFxuICAgICdTSUdUUkFQJyxcbiAgICAnU0lHU1lTJyxcbiAgICAnU0lHUVVJVCcsXG4gICAgJ1NJR0lPVCdcbiAgICAvLyBzaG91bGQgZGV0ZWN0IHByb2ZpbGVyIGFuZCBlbmFibGUvZGlzYWJsZSBhY2NvcmRpbmdseS5cbiAgICAvLyBzZWUgIzIxXG4gICAgLy8gJ1NJR1BST0YnXG4gIClcbn1cblxuaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICdsaW51eCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMucHVzaChcbiAgICAnU0lHSU8nLFxuICAgICdTSUdQT0xMJyxcbiAgICAnU0lHUFdSJyxcbiAgICAnU0lHU1RLRkxUJyxcbiAgICAnU0lHVU5VU0VEJ1xuICApXG59XG4iLCIvLyBOb3RlOiBzaW5jZSBueWMgdXNlcyB0aGlzIG1vZHVsZSB0byBvdXRwdXQgY292ZXJhZ2UsIGFueSBsaW5lc1xuLy8gdGhhdCBhcmUgaW4gdGhlIGRpcmVjdCBzeW5jIGZsb3cgb2YgbnljJ3Mgb3V0cHV0Q292ZXJhZ2UgYXJlXG4vLyBpZ25vcmVkLCBzaW5jZSB3ZSBjYW4gbmV2ZXIgZ2V0IGNvdmVyYWdlIGZvciB0aGVtLlxuLy8gZ3JhYiBhIHJlZmVyZW5jZSB0byBub2RlJ3MgcmVhbCBwcm9jZXNzIG9iamVjdCByaWdodCBhd2F5XG52YXIgcHJvY2VzcyA9IGdsb2JhbC5wcm9jZXNzXG5cbmNvbnN0IHByb2Nlc3NPayA9IGZ1bmN0aW9uIChwcm9jZXNzKSB7XG4gIHJldHVybiBwcm9jZXNzICYmXG4gICAgdHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgICB0eXBlb2YgcHJvY2Vzcy5lbWl0ID09PSAnZnVuY3Rpb24nICYmXG4gICAgdHlwZW9mIHByb2Nlc3MucmVhbGx5RXhpdCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHR5cGVvZiBwcm9jZXNzLmxpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHR5cGVvZiBwcm9jZXNzLmtpbGwgPT09ICdmdW5jdGlvbicgJiZcbiAgICB0eXBlb2YgcHJvY2Vzcy5waWQgPT09ICdudW1iZXInICYmXG4gICAgdHlwZW9mIHByb2Nlc3Mub24gPT09ICdmdW5jdGlvbidcbn1cblxuLy8gc29tZSBraW5kIG9mIG5vbi1ub2RlIGVudmlyb25tZW50LCBqdXN0IG5vLW9wXG4vKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbmlmICghcHJvY2Vzc09rKHByb2Nlc3MpKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7fVxuICB9XG59IGVsc2Uge1xuICB2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbiAgdmFyIHNpZ25hbHMgPSByZXF1aXJlKCcuL3NpZ25hbHMuanMnKVxuICB2YXIgaXNXaW4gPSAvXndpbi9pLnRlc3QocHJvY2Vzcy5wbGF0Zm9ybSlcblxuICB2YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKVxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKHR5cGVvZiBFRSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIEVFID0gRUUuRXZlbnRFbWl0dGVyXG4gIH1cblxuICB2YXIgZW1pdHRlclxuICBpZiAocHJvY2Vzcy5fX3NpZ25hbF9leGl0X2VtaXR0ZXJfXykge1xuICAgIGVtaXR0ZXIgPSBwcm9jZXNzLl9fc2lnbmFsX2V4aXRfZW1pdHRlcl9fXG4gIH0gZWxzZSB7XG4gICAgZW1pdHRlciA9IHByb2Nlc3MuX19zaWduYWxfZXhpdF9lbWl0dGVyX18gPSBuZXcgRUUoKVxuICAgIGVtaXR0ZXIuY291bnQgPSAwXG4gICAgZW1pdHRlci5lbWl0dGVkID0ge31cbiAgfVxuXG4gIC8vIEJlY2F1c2UgdGhpcyBlbWl0dGVyIGlzIGEgZ2xvYmFsLCB3ZSBoYXZlIHRvIGNoZWNrIHRvIHNlZSBpZiBhXG4gIC8vIHByZXZpb3VzIHZlcnNpb24gb2YgdGhpcyBsaWJyYXJ5IGZhaWxlZCB0byBlbmFibGUgaW5maW5pdGUgbGlzdGVuZXJzLlxuICAvLyBJIGtub3cgd2hhdCB5b3UncmUgYWJvdXQgdG8gc2F5LiAgQnV0IGxpdGVyYWxseSBldmVyeXRoaW5nIGFib3V0XG4gIC8vIHNpZ25hbC1leGl0IGlzIGEgY29tcHJvbWlzZSB3aXRoIGV2aWwuICBHZXQgdXNlZCB0byBpdC5cbiAgaWYgKCFlbWl0dGVyLmluZmluaXRlKSB7XG4gICAgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoSW5maW5pdHkpXG4gICAgZW1pdHRlci5pbmZpbml0ZSA9IHRydWVcbiAgfVxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGNiLCBvcHRzKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKCFwcm9jZXNzT2soZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge31cbiAgICB9XG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjYiwgJ2Z1bmN0aW9uJywgJ2EgY2FsbGJhY2sgbXVzdCBiZSBwcm92aWRlZCBmb3IgZXhpdCBoYW5kbGVyJylcblxuICAgIGlmIChsb2FkZWQgPT09IGZhbHNlKSB7XG4gICAgICBsb2FkKClcbiAgICB9XG5cbiAgICB2YXIgZXYgPSAnZXhpdCdcbiAgICBpZiAob3B0cyAmJiBvcHRzLmFsd2F5c0xhc3QpIHtcbiAgICAgIGV2ID0gJ2FmdGVyZXhpdCdcbiAgICB9XG5cbiAgICB2YXIgcmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcihldiwgY2IpXG4gICAgICBpZiAoZW1pdHRlci5saXN0ZW5lcnMoJ2V4aXQnKS5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgICBlbWl0dGVyLmxpc3RlbmVycygnYWZ0ZXJleGl0JykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHVubG9hZCgpXG4gICAgICB9XG4gICAgfVxuICAgIGVtaXR0ZXIub24oZXYsIGNiKVxuXG4gICAgcmV0dXJuIHJlbW92ZVxuICB9XG5cbiAgdmFyIHVubG9hZCA9IGZ1bmN0aW9uIHVubG9hZCAoKSB7XG4gICAgaWYgKCFsb2FkZWQgfHwgIXByb2Nlc3NPayhnbG9iYWwucHJvY2VzcykpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsb2FkZWQgPSBmYWxzZVxuXG4gICAgc2lnbmFscy5mb3JFYWNoKGZ1bmN0aW9uIChzaWcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoc2lnLCBzaWdMaXN0ZW5lcnNbc2lnXSlcbiAgICAgIH0gY2F0Y2ggKGVyKSB7fVxuICAgIH0pXG4gICAgcHJvY2Vzcy5lbWl0ID0gb3JpZ2luYWxQcm9jZXNzRW1pdFxuICAgIHByb2Nlc3MucmVhbGx5RXhpdCA9IG9yaWdpbmFsUHJvY2Vzc1JlYWxseUV4aXRcbiAgICBlbWl0dGVyLmNvdW50IC09IDFcbiAgfVxuICBtb2R1bGUuZXhwb3J0cy51bmxvYWQgPSB1bmxvYWRcblxuICB2YXIgZW1pdCA9IGZ1bmN0aW9uIGVtaXQgKGV2ZW50LCBjb2RlLCBzaWduYWwpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoZW1pdHRlci5lbWl0dGVkW2V2ZW50XSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGVtaXR0ZXIuZW1pdHRlZFtldmVudF0gPSB0cnVlXG4gICAgZW1pdHRlci5lbWl0KGV2ZW50LCBjb2RlLCBzaWduYWwpXG4gIH1cblxuICAvLyB7IDxzaWduYWw+OiA8bGlzdGVuZXIgZm4+LCAuLi4gfVxuICB2YXIgc2lnTGlzdGVuZXJzID0ge31cbiAgc2lnbmFscy5mb3JFYWNoKGZ1bmN0aW9uIChzaWcpIHtcbiAgICBzaWdMaXN0ZW5lcnNbc2lnXSA9IGZ1bmN0aW9uIGxpc3RlbmVyICgpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKCFwcm9jZXNzT2soZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIG90aGVyIGxpc3RlbmVycywgYW4gZXhpdCBpcyBjb21pbmchXG4gICAgICAvLyBTaW1wbGVzdCB3YXk6IHJlbW92ZSB1cyBhbmQgdGhlbiByZS1zZW5kIHRoZSBzaWduYWwuXG4gICAgICAvLyBXZSBrbm93IHRoYXQgdGhpcyB3aWxsIGtpbGwgdGhlIHByb2Nlc3MsIHNvIHdlIGNhblxuICAgICAgLy8gc2FmZWx5IGVtaXQgbm93LlxuICAgICAgdmFyIGxpc3RlbmVycyA9IHByb2Nlc3MubGlzdGVuZXJzKHNpZylcbiAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSBlbWl0dGVyLmNvdW50KSB7XG4gICAgICAgIHVubG9hZCgpXG4gICAgICAgIGVtaXQoJ2V4aXQnLCBudWxsLCBzaWcpXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgIGVtaXQoJ2FmdGVyZXhpdCcsIG51bGwsIHNpZylcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgaWYgKGlzV2luICYmIHNpZyA9PT0gJ1NJR0hVUCcpIHtcbiAgICAgICAgICAvLyBcIlNJR0hVUFwiIHRocm93cyBhbiBgRU5PU1lTYCBlcnJvciBvbiBXaW5kb3dzLFxuICAgICAgICAgIC8vIHNvIHVzZSBhIHN1cHBvcnRlZCBzaWduYWwgaW5zdGVhZFxuICAgICAgICAgIHNpZyA9ICdTSUdJTlQnXG4gICAgICAgIH1cbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCBzaWcpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIG1vZHVsZS5leHBvcnRzLnNpZ25hbHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHNpZ25hbHNcbiAgfVxuXG4gIHZhciBsb2FkZWQgPSBmYWxzZVxuXG4gIHZhciBsb2FkID0gZnVuY3Rpb24gbG9hZCAoKSB7XG4gICAgaWYgKGxvYWRlZCB8fCAhcHJvY2Vzc09rKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxvYWRlZCA9IHRydWVcblxuICAgIC8vIFRoaXMgaXMgdGhlIG51bWJlciBvZiBvblNpZ25hbEV4aXQncyB0aGF0IGFyZSBpbiBwbGF5LlxuICAgIC8vIEl0J3MgaW1wb3J0YW50IHNvIHRoYXQgd2UgY2FuIGNvdW50IHRoZSBjb3JyZWN0IG51bWJlciBvZlxuICAgIC8vIGxpc3RlbmVycyBvbiBzaWduYWxzLCBhbmQgZG9uJ3Qgd2FpdCBmb3IgdGhlIG90aGVyIG9uZSB0b1xuICAgIC8vIGhhbmRsZSBpdCBpbnN0ZWFkIG9mIHVzLlxuICAgIGVtaXR0ZXIuY291bnQgKz0gMVxuXG4gICAgc2lnbmFscyA9IHNpZ25hbHMuZmlsdGVyKGZ1bmN0aW9uIChzaWcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByb2Nlc3Mub24oc2lnLCBzaWdMaXN0ZW5lcnNbc2lnXSlcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2ggKGVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBwcm9jZXNzLmVtaXQgPSBwcm9jZXNzRW1pdFxuICAgIHByb2Nlc3MucmVhbGx5RXhpdCA9IHByb2Nlc3NSZWFsbHlFeGl0XG4gIH1cbiAgbW9kdWxlLmV4cG9ydHMubG9hZCA9IGxvYWRcblxuICB2YXIgb3JpZ2luYWxQcm9jZXNzUmVhbGx5RXhpdCA9IHByb2Nlc3MucmVhbGx5RXhpdFxuICB2YXIgcHJvY2Vzc1JlYWxseUV4aXQgPSBmdW5jdGlvbiBwcm9jZXNzUmVhbGx5RXhpdCAoY29kZSkge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmICghcHJvY2Vzc09rKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHByb2Nlc3MuZXhpdENvZGUgPSBjb2RlIHx8IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIDBcbiAgICBlbWl0KCdleGl0JywgcHJvY2Vzcy5leGl0Q29kZSwgbnVsbClcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIGVtaXQoJ2FmdGVyZXhpdCcsIHByb2Nlc3MuZXhpdENvZGUsIG51bGwpXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICBvcmlnaW5hbFByb2Nlc3NSZWFsbHlFeGl0LmNhbGwocHJvY2VzcywgcHJvY2Vzcy5leGl0Q29kZSlcbiAgfVxuXG4gIHZhciBvcmlnaW5hbFByb2Nlc3NFbWl0ID0gcHJvY2Vzcy5lbWl0XG4gIHZhciBwcm9jZXNzRW1pdCA9IGZ1bmN0aW9uIHByb2Nlc3NFbWl0IChldiwgYXJnKSB7XG4gICAgaWYgKGV2ID09PSAnZXhpdCcgJiYgcHJvY2Vzc09rKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChhcmcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gYXJnXG4gICAgICB9XG4gICAgICB2YXIgcmV0ID0gb3JpZ2luYWxQcm9jZXNzRW1pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgZW1pdCgnZXhpdCcsIHByb2Nlc3MuZXhpdENvZGUsIG51bGwpXG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgZW1pdCgnYWZ0ZXJleGl0JywgcHJvY2Vzcy5leGl0Q29kZSwgbnVsbClcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICByZXR1cm4gcmV0XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcmlnaW5hbFByb2Nlc3NFbWl0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTtcbmNvbnN0IG9uRXhpdCA9IHJlcXVpcmUoJ3NpZ25hbC1leGl0Jyk7XG5cbmNvbnN0IERFRkFVTFRfRk9SQ0VfS0lMTF9USU1FT1VUID0gMTAwMCAqIDU7XG5cbi8vIE1vbmtleS1wYXRjaGVzIGBjaGlsZFByb2Nlc3Mua2lsbCgpYCB0byBhZGQgYGZvcmNlS2lsbEFmdGVyVGltZW91dGAgYmVoYXZpb3JcbmNvbnN0IHNwYXduZWRLaWxsID0gKGtpbGwsIHNpZ25hbCA9ICdTSUdURVJNJywgb3B0aW9ucyA9IHt9KSA9PiB7XG5cdGNvbnN0IGtpbGxSZXN1bHQgPSBraWxsKHNpZ25hbCk7XG5cdHNldEtpbGxUaW1lb3V0KGtpbGwsIHNpZ25hbCwgb3B0aW9ucywga2lsbFJlc3VsdCk7XG5cdHJldHVybiBraWxsUmVzdWx0O1xufTtcblxuY29uc3Qgc2V0S2lsbFRpbWVvdXQgPSAoa2lsbCwgc2lnbmFsLCBvcHRpb25zLCBraWxsUmVzdWx0KSA9PiB7XG5cdGlmICghc2hvdWxkRm9yY2VLaWxsKHNpZ25hbCwgb3B0aW9ucywga2lsbFJlc3VsdCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCB0aW1lb3V0ID0gZ2V0Rm9yY2VLaWxsQWZ0ZXJUaW1lb3V0KG9wdGlvbnMpO1xuXHRjb25zdCB0ID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0a2lsbCgnU0lHS0lMTCcpO1xuXHR9LCB0aW1lb3V0KTtcblxuXHQvLyBHdWFyZGVkIGJlY2F1c2UgdGhlcmUncyBubyBgLnVucmVmKClgIHdoZW4gYGV4ZWNhYCBpcyB1c2VkIGluIHRoZSByZW5kZXJlclxuXHQvLyBwcm9jZXNzIGluIEVsZWN0cm9uLiBUaGlzIGNhbm5vdCBiZSB0ZXN0ZWQgc2luY2Ugd2UgZG9uJ3QgcnVuIHRlc3RzIGluXG5cdC8vIEVsZWN0cm9uLlxuXHQvLyBpc3RhbmJ1bCBpZ25vcmUgZWxzZVxuXHRpZiAodC51bnJlZikge1xuXHRcdHQudW5yZWYoKTtcblx0fVxufTtcblxuY29uc3Qgc2hvdWxkRm9yY2VLaWxsID0gKHNpZ25hbCwge2ZvcmNlS2lsbEFmdGVyVGltZW91dH0sIGtpbGxSZXN1bHQpID0+IHtcblx0cmV0dXJuIGlzU2lndGVybShzaWduYWwpICYmIGZvcmNlS2lsbEFmdGVyVGltZW91dCAhPT0gZmFsc2UgJiYga2lsbFJlc3VsdDtcbn07XG5cbmNvbnN0IGlzU2lndGVybSA9IHNpZ25hbCA9PiB7XG5cdHJldHVybiBzaWduYWwgPT09IG9zLmNvbnN0YW50cy5zaWduYWxzLlNJR1RFUk0gfHxcblx0XHQodHlwZW9mIHNpZ25hbCA9PT0gJ3N0cmluZycgJiYgc2lnbmFsLnRvVXBwZXJDYXNlKCkgPT09ICdTSUdURVJNJyk7XG59O1xuXG5jb25zdCBnZXRGb3JjZUtpbGxBZnRlclRpbWVvdXQgPSAoe2ZvcmNlS2lsbEFmdGVyVGltZW91dCA9IHRydWV9KSA9PiB7XG5cdGlmIChmb3JjZUtpbGxBZnRlclRpbWVvdXQgPT09IHRydWUpIHtcblx0XHRyZXR1cm4gREVGQVVMVF9GT1JDRV9LSUxMX1RJTUVPVVQ7XG5cdH1cblxuXHRpZiAoIU51bWJlci5pc0Zpbml0ZShmb3JjZUtpbGxBZnRlclRpbWVvdXQpIHx8IGZvcmNlS2lsbEFmdGVyVGltZW91dCA8IDApIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCB0aGUgXFxgZm9yY2VLaWxsQWZ0ZXJUaW1lb3V0XFxgIG9wdGlvbiB0byBiZSBhIG5vbi1uZWdhdGl2ZSBpbnRlZ2VyLCBnb3QgXFxgJHtmb3JjZUtpbGxBZnRlclRpbWVvdXR9XFxgICgke3R5cGVvZiBmb3JjZUtpbGxBZnRlclRpbWVvdXR9KWApO1xuXHR9XG5cblx0cmV0dXJuIGZvcmNlS2lsbEFmdGVyVGltZW91dDtcbn07XG5cbi8vIGBjaGlsZFByb2Nlc3MuY2FuY2VsKClgXG5jb25zdCBzcGF3bmVkQ2FuY2VsID0gKHNwYXduZWQsIGNvbnRleHQpID0+IHtcblx0Y29uc3Qga2lsbFJlc3VsdCA9IHNwYXduZWQua2lsbCgpO1xuXG5cdGlmIChraWxsUmVzdWx0KSB7XG5cdFx0Y29udGV4dC5pc0NhbmNlbGVkID0gdHJ1ZTtcblx0fVxufTtcblxuY29uc3QgdGltZW91dEtpbGwgPSAoc3Bhd25lZCwgc2lnbmFsLCByZWplY3QpID0+IHtcblx0c3Bhd25lZC5raWxsKHNpZ25hbCk7XG5cdHJlamVjdChPYmplY3QuYXNzaWduKG5ldyBFcnJvcignVGltZWQgb3V0JyksIHt0aW1lZE91dDogdHJ1ZSwgc2lnbmFsfSkpO1xufTtcblxuLy8gYHRpbWVvdXRgIG9wdGlvbiBoYW5kbGluZ1xuY29uc3Qgc2V0dXBUaW1lb3V0ID0gKHNwYXduZWQsIHt0aW1lb3V0LCBraWxsU2lnbmFsID0gJ1NJR1RFUk0nfSwgc3Bhd25lZFByb21pc2UpID0+IHtcblx0aWYgKHRpbWVvdXQgPT09IDAgfHwgdGltZW91dCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIHNwYXduZWRQcm9taXNlO1xuXHR9XG5cblx0bGV0IHRpbWVvdXRJZDtcblx0Y29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0dGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aW1lb3V0S2lsbChzcGF3bmVkLCBraWxsU2lnbmFsLCByZWplY3QpO1xuXHRcdH0sIHRpbWVvdXQpO1xuXHR9KTtcblxuXHRjb25zdCBzYWZlU3Bhd25lZFByb21pc2UgPSBzcGF3bmVkUHJvbWlzZS5maW5hbGx5KCgpID0+IHtcblx0XHRjbGVhclRpbWVvdXQodGltZW91dElkKTtcblx0fSk7XG5cblx0cmV0dXJuIFByb21pc2UucmFjZShbdGltZW91dFByb21pc2UsIHNhZmVTcGF3bmVkUHJvbWlzZV0pO1xufTtcblxuY29uc3QgdmFsaWRhdGVUaW1lb3V0ID0gKHt0aW1lb3V0fSkgPT4ge1xuXHRpZiAodGltZW91dCAhPT0gdW5kZWZpbmVkICYmICghTnVtYmVyLmlzRmluaXRlKHRpbWVvdXQpIHx8IHRpbWVvdXQgPCAwKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIHRoZSBcXGB0aW1lb3V0XFxgIG9wdGlvbiB0byBiZSBhIG5vbi1uZWdhdGl2ZSBpbnRlZ2VyLCBnb3QgXFxgJHt0aW1lb3V0fVxcYCAoJHt0eXBlb2YgdGltZW91dH0pYCk7XG5cdH1cbn07XG5cbi8vIGBjbGVhbnVwYCBvcHRpb24gaGFuZGxpbmdcbmNvbnN0IHNldEV4aXRIYW5kbGVyID0gYXN5bmMgKHNwYXduZWQsIHtjbGVhbnVwLCBkZXRhY2hlZH0sIHRpbWVkUHJvbWlzZSkgPT4ge1xuXHRpZiAoIWNsZWFudXAgfHwgZGV0YWNoZWQpIHtcblx0XHRyZXR1cm4gdGltZWRQcm9taXNlO1xuXHR9XG5cblx0Y29uc3QgcmVtb3ZlRXhpdEhhbmRsZXIgPSBvbkV4aXQoKCkgPT4ge1xuXHRcdHNwYXduZWQua2lsbCgpO1xuXHR9KTtcblxuXHRyZXR1cm4gdGltZWRQcm9taXNlLmZpbmFsbHkoKCkgPT4ge1xuXHRcdHJlbW92ZUV4aXRIYW5kbGVyKCk7XG5cdH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNwYXduZWRLaWxsLFxuXHRzcGF3bmVkQ2FuY2VsLFxuXHRzZXR1cFRpbWVvdXQsXG5cdHZhbGlkYXRlVGltZW91dCxcblx0c2V0RXhpdEhhbmRsZXJcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IGlzU3RyZWFtID0gc3RyZWFtID0+XG5cdHN0cmVhbSAhPT0gbnVsbCAmJlxuXHR0eXBlb2Ygc3RyZWFtID09PSAnb2JqZWN0JyAmJlxuXHR0eXBlb2Ygc3RyZWFtLnBpcGUgPT09ICdmdW5jdGlvbic7XG5cbmlzU3RyZWFtLndyaXRhYmxlID0gc3RyZWFtID0+XG5cdGlzU3RyZWFtKHN0cmVhbSkgJiZcblx0c3RyZWFtLndyaXRhYmxlICE9PSBmYWxzZSAmJlxuXHR0eXBlb2Ygc3RyZWFtLl93cml0ZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuXHR0eXBlb2Ygc3RyZWFtLl93cml0YWJsZVN0YXRlID09PSAnb2JqZWN0JztcblxuaXNTdHJlYW0ucmVhZGFibGUgPSBzdHJlYW0gPT5cblx0aXNTdHJlYW0oc3RyZWFtKSAmJlxuXHRzdHJlYW0ucmVhZGFibGUgIT09IGZhbHNlICYmXG5cdHR5cGVvZiBzdHJlYW0uX3JlYWQgPT09ICdmdW5jdGlvbicgJiZcblx0dHlwZW9mIHN0cmVhbS5fcmVhZGFibGVTdGF0ZSA9PT0gJ29iamVjdCc7XG5cbmlzU3RyZWFtLmR1cGxleCA9IHN0cmVhbSA9PlxuXHRpc1N0cmVhbS53cml0YWJsZShzdHJlYW0pICYmXG5cdGlzU3RyZWFtLnJlYWRhYmxlKHN0cmVhbSk7XG5cbmlzU3RyZWFtLnRyYW5zZm9ybSA9IHN0cmVhbSA9PlxuXHRpc1N0cmVhbS5kdXBsZXgoc3RyZWFtKSAmJlxuXHR0eXBlb2Ygc3RyZWFtLl90cmFuc2Zvcm0gPT09ICdmdW5jdGlvbic7XG5cbm1vZHVsZS5leHBvcnRzID0gaXNTdHJlYW07XG4iLCIndXNlIHN0cmljdCc7XG5jb25zdCB7UGFzc1Rocm91Z2g6IFBhc3NUaHJvdWdoU3RyZWFtfSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9wdGlvbnMgPT4ge1xuXHRvcHRpb25zID0gey4uLm9wdGlvbnN9O1xuXG5cdGNvbnN0IHthcnJheX0gPSBvcHRpb25zO1xuXHRsZXQge2VuY29kaW5nfSA9IG9wdGlvbnM7XG5cdGNvbnN0IGlzQnVmZmVyID0gZW5jb2RpbmcgPT09ICdidWZmZXInO1xuXHRsZXQgb2JqZWN0TW9kZSA9IGZhbHNlO1xuXG5cdGlmIChhcnJheSkge1xuXHRcdG9iamVjdE1vZGUgPSAhKGVuY29kaW5nIHx8IGlzQnVmZmVyKTtcblx0fSBlbHNlIHtcblx0XHRlbmNvZGluZyA9IGVuY29kaW5nIHx8ICd1dGY4Jztcblx0fVxuXG5cdGlmIChpc0J1ZmZlcikge1xuXHRcdGVuY29kaW5nID0gbnVsbDtcblx0fVxuXG5cdGNvbnN0IHN0cmVhbSA9IG5ldyBQYXNzVGhyb3VnaFN0cmVhbSh7b2JqZWN0TW9kZX0pO1xuXG5cdGlmIChlbmNvZGluZykge1xuXHRcdHN0cmVhbS5zZXRFbmNvZGluZyhlbmNvZGluZyk7XG5cdH1cblxuXHRsZXQgbGVuZ3RoID0gMDtcblx0Y29uc3QgY2h1bmtzID0gW107XG5cblx0c3RyZWFtLm9uKCdkYXRhJywgY2h1bmsgPT4ge1xuXHRcdGNodW5rcy5wdXNoKGNodW5rKTtcblxuXHRcdGlmIChvYmplY3RNb2RlKSB7XG5cdFx0XHRsZW5ndGggPSBjaHVua3MubGVuZ3RoO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRsZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuXHRcdH1cblx0fSk7XG5cblx0c3RyZWFtLmdldEJ1ZmZlcmVkVmFsdWUgPSAoKSA9PiB7XG5cdFx0aWYgKGFycmF5KSB7XG5cdFx0XHRyZXR1cm4gY2h1bmtzO1xuXHRcdH1cblxuXHRcdHJldHVybiBpc0J1ZmZlciA/IEJ1ZmZlci5jb25jYXQoY2h1bmtzLCBsZW5ndGgpIDogY2h1bmtzLmpvaW4oJycpO1xuXHR9O1xuXG5cdHN0cmVhbS5nZXRCdWZmZXJlZExlbmd0aCA9ICgpID0+IGxlbmd0aDtcblxuXHRyZXR1cm4gc3RyZWFtO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IHtjb25zdGFudHM6IEJ1ZmZlckNvbnN0YW50c30gPSByZXF1aXJlKCdidWZmZXInKTtcbmNvbnN0IHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuY29uc3Qge3Byb21pc2lmeX0gPSByZXF1aXJlKCd1dGlsJyk7XG5jb25zdCBidWZmZXJTdHJlYW0gPSByZXF1aXJlKCcuL2J1ZmZlci1zdHJlYW0nKTtcblxuY29uc3Qgc3RyZWFtUGlwZWxpbmVQcm9taXNpZmllZCA9IHByb21pc2lmeShzdHJlYW0ucGlwZWxpbmUpO1xuXG5jbGFzcyBNYXhCdWZmZXJFcnJvciBleHRlbmRzIEVycm9yIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ21heEJ1ZmZlciBleGNlZWRlZCcpO1xuXHRcdHRoaXMubmFtZSA9ICdNYXhCdWZmZXJFcnJvcic7XG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0U3RyZWFtKGlucHV0U3RyZWFtLCBvcHRpb25zKSB7XG5cdGlmICghaW5wdXRTdHJlYW0pIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGEgc3RyZWFtJyk7XG5cdH1cblxuXHRvcHRpb25zID0ge1xuXHRcdG1heEJ1ZmZlcjogSW5maW5pdHksXG5cdFx0Li4ub3B0aW9uc1xuXHR9O1xuXG5cdGNvbnN0IHttYXhCdWZmZXJ9ID0gb3B0aW9ucztcblx0Y29uc3Qgc3RyZWFtID0gYnVmZmVyU3RyZWFtKG9wdGlvbnMpO1xuXG5cdGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRjb25zdCByZWplY3RQcm9taXNlID0gZXJyb3IgPT4ge1xuXHRcdFx0Ly8gRG9uJ3QgcmV0cmlldmUgYW4gb3ZlcnNpemVkIGJ1ZmZlci5cblx0XHRcdGlmIChlcnJvciAmJiBzdHJlYW0uZ2V0QnVmZmVyZWRMZW5ndGgoKSA8PSBCdWZmZXJDb25zdGFudHMuTUFYX0xFTkdUSCkge1xuXHRcdFx0XHRlcnJvci5idWZmZXJlZERhdGEgPSBzdHJlYW0uZ2V0QnVmZmVyZWRWYWx1ZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZWplY3QoZXJyb3IpO1xuXHRcdH07XG5cblx0XHQoYXN5bmMgKCkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0YXdhaXQgc3RyZWFtUGlwZWxpbmVQcm9taXNpZmllZChpbnB1dFN0cmVhbSwgc3RyZWFtKTtcblx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0cmVqZWN0UHJvbWlzZShlcnJvcik7XG5cdFx0XHR9XG5cdFx0fSkoKTtcblxuXHRcdHN0cmVhbS5vbignZGF0YScsICgpID0+IHtcblx0XHRcdGlmIChzdHJlYW0uZ2V0QnVmZmVyZWRMZW5ndGgoKSA+IG1heEJ1ZmZlcikge1xuXHRcdFx0XHRyZWplY3RQcm9taXNlKG5ldyBNYXhCdWZmZXJFcnJvcigpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0cmV0dXJuIHN0cmVhbS5nZXRCdWZmZXJlZFZhbHVlKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U3RyZWFtO1xubW9kdWxlLmV4cG9ydHMuYnVmZmVyID0gKHN0cmVhbSwgb3B0aW9ucykgPT4gZ2V0U3RyZWFtKHN0cmVhbSwgey4uLm9wdGlvbnMsIGVuY29kaW5nOiAnYnVmZmVyJ30pO1xubW9kdWxlLmV4cG9ydHMuYXJyYXkgPSAoc3RyZWFtLCBvcHRpb25zKSA9PiBnZXRTdHJlYW0oc3RyZWFtLCB7Li4ub3B0aW9ucywgYXJyYXk6IHRydWV9KTtcbm1vZHVsZS5leHBvcnRzLk1heEJ1ZmZlckVycm9yID0gTWF4QnVmZmVyRXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgUGFzc1Rocm91Z2ggfSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgvKnN0cmVhbXMuLi4qLykge1xuICB2YXIgc291cmNlcyA9IFtdXG4gIHZhciBvdXRwdXQgID0gbmV3IFBhc3NUaHJvdWdoKHtvYmplY3RNb2RlOiB0cnVlfSlcblxuICBvdXRwdXQuc2V0TWF4TGlzdGVuZXJzKDApXG5cbiAgb3V0cHV0LmFkZCA9IGFkZFxuICBvdXRwdXQuaXNFbXB0eSA9IGlzRW1wdHlcblxuICBvdXRwdXQub24oJ3VucGlwZScsIHJlbW92ZSlcblxuICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLmZvckVhY2goYWRkKVxuXG4gIHJldHVybiBvdXRwdXRcblxuICBmdW5jdGlvbiBhZGQgKHNvdXJjZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgIHNvdXJjZS5mb3JFYWNoKGFkZClcbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuXG4gICAgc291cmNlcy5wdXNoKHNvdXJjZSk7XG4gICAgc291cmNlLm9uY2UoJ2VuZCcsIHJlbW92ZS5iaW5kKG51bGwsIHNvdXJjZSkpXG4gICAgc291cmNlLm9uY2UoJ2Vycm9yJywgb3V0cHV0LmVtaXQuYmluZChvdXRwdXQsICdlcnJvcicpKVxuICAgIHNvdXJjZS5waXBlKG91dHB1dCwge2VuZDogZmFsc2V9KVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5ICgpIHtcbiAgICByZXR1cm4gc291cmNlcy5sZW5ndGggPT0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZSAoc291cmNlKSB7XG4gICAgc291cmNlcyA9IHNvdXJjZXMuZmlsdGVyKGZ1bmN0aW9uIChpdCkgeyByZXR1cm4gaXQgIT09IHNvdXJjZSB9KVxuICAgIGlmICghc291cmNlcy5sZW5ndGggJiYgb3V0cHV0LnJlYWRhYmxlKSB7IG91dHB1dC5lbmQoKSB9XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IGlzU3RyZWFtID0gcmVxdWlyZSgnaXMtc3RyZWFtJyk7XG5jb25zdCBnZXRTdHJlYW0gPSByZXF1aXJlKCdnZXQtc3RyZWFtJyk7XG5jb25zdCBtZXJnZVN0cmVhbSA9IHJlcXVpcmUoJ21lcmdlLXN0cmVhbScpO1xuXG4vLyBgaW5wdXRgIG9wdGlvblxuY29uc3QgaGFuZGxlSW5wdXQgPSAoc3Bhd25lZCwgaW5wdXQpID0+IHtcblx0Ly8gQ2hlY2tpbmcgZm9yIHN0ZGluIGlzIHdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvMjY4NTJcblx0Ly8gQHRvZG8gcmVtb3ZlIGB8fCBzcGF3bmVkLnN0ZGluID09PSB1bmRlZmluZWRgIG9uY2Ugd2UgZHJvcCBzdXBwb3J0IGZvciBOb2RlLmpzIDw9MTIuMi4wXG5cdGlmIChpbnB1dCA9PT0gdW5kZWZpbmVkIHx8IHNwYXduZWQuc3RkaW4gPT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChpc1N0cmVhbShpbnB1dCkpIHtcblx0XHRpbnB1dC5waXBlKHNwYXduZWQuc3RkaW4pO1xuXHR9IGVsc2Uge1xuXHRcdHNwYXduZWQuc3RkaW4uZW5kKGlucHV0KTtcblx0fVxufTtcblxuLy8gYGFsbGAgaW50ZXJsZWF2ZXMgYHN0ZG91dGAgYW5kIGBzdGRlcnJgXG5jb25zdCBtYWtlQWxsU3RyZWFtID0gKHNwYXduZWQsIHthbGx9KSA9PiB7XG5cdGlmICghYWxsIHx8ICghc3Bhd25lZC5zdGRvdXQgJiYgIXNwYXduZWQuc3RkZXJyKSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IG1peGVkID0gbWVyZ2VTdHJlYW0oKTtcblxuXHRpZiAoc3Bhd25lZC5zdGRvdXQpIHtcblx0XHRtaXhlZC5hZGQoc3Bhd25lZC5zdGRvdXQpO1xuXHR9XG5cblx0aWYgKHNwYXduZWQuc3RkZXJyKSB7XG5cdFx0bWl4ZWQuYWRkKHNwYXduZWQuc3RkZXJyKTtcblx0fVxuXG5cdHJldHVybiBtaXhlZDtcbn07XG5cbi8vIE9uIGZhaWx1cmUsIGByZXN1bHQuc3Rkb3V0fHN0ZGVycnxhbGxgIHNob3VsZCBjb250YWluIHRoZSBjdXJyZW50bHkgYnVmZmVyZWQgc3RyZWFtXG5jb25zdCBnZXRCdWZmZXJlZERhdGEgPSBhc3luYyAoc3RyZWFtLCBzdHJlYW1Qcm9taXNlKSA9PiB7XG5cdGlmICghc3RyZWFtKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0c3RyZWFtLmRlc3Ryb3koKTtcblxuXHR0cnkge1xuXHRcdHJldHVybiBhd2FpdCBzdHJlYW1Qcm9taXNlO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHJldHVybiBlcnJvci5idWZmZXJlZERhdGE7XG5cdH1cbn07XG5cbmNvbnN0IGdldFN0cmVhbVByb21pc2UgPSAoc3RyZWFtLCB7ZW5jb2RpbmcsIGJ1ZmZlciwgbWF4QnVmZmVyfSkgPT4ge1xuXHRpZiAoIXN0cmVhbSB8fCAhYnVmZmVyKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKGVuY29kaW5nKSB7XG5cdFx0cmV0dXJuIGdldFN0cmVhbShzdHJlYW0sIHtlbmNvZGluZywgbWF4QnVmZmVyfSk7XG5cdH1cblxuXHRyZXR1cm4gZ2V0U3RyZWFtLmJ1ZmZlcihzdHJlYW0sIHttYXhCdWZmZXJ9KTtcbn07XG5cbi8vIFJldHJpZXZlIHJlc3VsdCBvZiBjaGlsZCBwcm9jZXNzOiBleGl0IGNvZGUsIHNpZ25hbCwgZXJyb3IsIHN0cmVhbXMgKHN0ZG91dC9zdGRlcnIvYWxsKVxuY29uc3QgZ2V0U3Bhd25lZFJlc3VsdCA9IGFzeW5jICh7c3Rkb3V0LCBzdGRlcnIsIGFsbH0sIHtlbmNvZGluZywgYnVmZmVyLCBtYXhCdWZmZXJ9LCBwcm9jZXNzRG9uZSkgPT4ge1xuXHRjb25zdCBzdGRvdXRQcm9taXNlID0gZ2V0U3RyZWFtUHJvbWlzZShzdGRvdXQsIHtlbmNvZGluZywgYnVmZmVyLCBtYXhCdWZmZXJ9KTtcblx0Y29uc3Qgc3RkZXJyUHJvbWlzZSA9IGdldFN0cmVhbVByb21pc2Uoc3RkZXJyLCB7ZW5jb2RpbmcsIGJ1ZmZlciwgbWF4QnVmZmVyfSk7XG5cdGNvbnN0IGFsbFByb21pc2UgPSBnZXRTdHJlYW1Qcm9taXNlKGFsbCwge2VuY29kaW5nLCBidWZmZXIsIG1heEJ1ZmZlcjogbWF4QnVmZmVyICogMn0pO1xuXG5cdHRyeSB7XG5cdFx0cmV0dXJuIGF3YWl0IFByb21pc2UuYWxsKFtwcm9jZXNzRG9uZSwgc3Rkb3V0UHJvbWlzZSwgc3RkZXJyUHJvbWlzZSwgYWxsUHJvbWlzZV0pO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHJldHVybiBQcm9taXNlLmFsbChbXG5cdFx0XHR7ZXJyb3IsIHNpZ25hbDogZXJyb3Iuc2lnbmFsLCB0aW1lZE91dDogZXJyb3IudGltZWRPdXR9LFxuXHRcdFx0Z2V0QnVmZmVyZWREYXRhKHN0ZG91dCwgc3Rkb3V0UHJvbWlzZSksXG5cdFx0XHRnZXRCdWZmZXJlZERhdGEoc3RkZXJyLCBzdGRlcnJQcm9taXNlKSxcblx0XHRcdGdldEJ1ZmZlcmVkRGF0YShhbGwsIGFsbFByb21pc2UpXG5cdFx0XSk7XG5cdH1cbn07XG5cbmNvbnN0IHZhbGlkYXRlSW5wdXRTeW5jID0gKHtpbnB1dH0pID0+IHtcblx0aWYgKGlzU3RyZWFtKGlucHV0KSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBgaW5wdXRgIG9wdGlvbiBjYW5ub3QgYmUgYSBzdHJlYW0gaW4gc3luYyBtb2RlJyk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRoYW5kbGVJbnB1dCxcblx0bWFrZUFsbFN0cmVhbSxcblx0Z2V0U3Bhd25lZFJlc3VsdCxcblx0dmFsaWRhdGVJbnB1dFN5bmNcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgbmF0aXZlUHJvbWlzZVByb3RvdHlwZSA9IChhc3luYyAoKSA9PiB7fSkoKS5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG5jb25zdCBkZXNjcmlwdG9ycyA9IFsndGhlbicsICdjYXRjaCcsICdmaW5hbGx5J10ubWFwKHByb3BlcnR5ID0+IFtcblx0cHJvcGVydHksXG5cdFJlZmxlY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5hdGl2ZVByb21pc2VQcm90b3R5cGUsIHByb3BlcnR5KVxuXSk7XG5cbi8vIFRoZSByZXR1cm4gdmFsdWUgaXMgYSBtaXhpbiBvZiBgY2hpbGRQcm9jZXNzYCBhbmQgYFByb21pc2VgXG5jb25zdCBtZXJnZVByb21pc2UgPSAoc3Bhd25lZCwgcHJvbWlzZSkgPT4ge1xuXHRmb3IgKGNvbnN0IFtwcm9wZXJ0eSwgZGVzY3JpcHRvcl0gb2YgZGVzY3JpcHRvcnMpIHtcblx0XHQvLyBTdGFydGluZyB0aGUgbWFpbiBgcHJvbWlzZWAgaXMgZGVmZXJyZWQgdG8gYXZvaWQgY29uc3VtaW5nIHN0cmVhbXNcblx0XHRjb25zdCB2YWx1ZSA9IHR5cGVvZiBwcm9taXNlID09PSAnZnVuY3Rpb24nID9cblx0XHRcdCguLi5hcmdzKSA9PiBSZWZsZWN0LmFwcGx5KGRlc2NyaXB0b3IudmFsdWUsIHByb21pc2UoKSwgYXJncykgOlxuXHRcdFx0ZGVzY3JpcHRvci52YWx1ZS5iaW5kKHByb21pc2UpO1xuXG5cdFx0UmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShzcGF3bmVkLCBwcm9wZXJ0eSwgey4uLmRlc2NyaXB0b3IsIHZhbHVlfSk7XG5cdH1cblxuXHRyZXR1cm4gc3Bhd25lZDtcbn07XG5cbi8vIFVzZSBwcm9taXNlcyBpbnN0ZWFkIG9mIGBjaGlsZF9wcm9jZXNzYCBldmVudHNcbmNvbnN0IGdldFNwYXduZWRQcm9taXNlID0gc3Bhd25lZCA9PiB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0c3Bhd25lZC5vbignZXhpdCcsIChleGl0Q29kZSwgc2lnbmFsKSA9PiB7XG5cdFx0XHRyZXNvbHZlKHtleGl0Q29kZSwgc2lnbmFsfSk7XG5cdFx0fSk7XG5cblx0XHRzcGF3bmVkLm9uKCdlcnJvcicsIGVycm9yID0+IHtcblx0XHRcdHJlamVjdChlcnJvcik7XG5cdFx0fSk7XG5cblx0XHRpZiAoc3Bhd25lZC5zdGRpbikge1xuXHRcdFx0c3Bhd25lZC5zdGRpbi5vbignZXJyb3InLCBlcnJvciA9PiB7XG5cdFx0XHRcdHJlamVjdChlcnJvcik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdG1lcmdlUHJvbWlzZSxcblx0Z2V0U3Bhd25lZFByb21pc2Vcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcbmNvbnN0IG5vcm1hbGl6ZUFyZ3MgPSAoZmlsZSwgYXJncyA9IFtdKSA9PiB7XG5cdGlmICghQXJyYXkuaXNBcnJheShhcmdzKSkge1xuXHRcdHJldHVybiBbZmlsZV07XG5cdH1cblxuXHRyZXR1cm4gW2ZpbGUsIC4uLmFyZ3NdO1xufTtcblxuY29uc3QgTk9fRVNDQVBFX1JFR0VYUCA9IC9eW1xcdy4tXSskLztcbmNvbnN0IERPVUJMRV9RVU9URVNfUkVHRVhQID0gL1wiL2c7XG5cbmNvbnN0IGVzY2FwZUFyZyA9IGFyZyA9PiB7XG5cdGlmICh0eXBlb2YgYXJnICE9PSAnc3RyaW5nJyB8fCBOT19FU0NBUEVfUkVHRVhQLnRlc3QoYXJnKSkge1xuXHRcdHJldHVybiBhcmc7XG5cdH1cblxuXHRyZXR1cm4gYFwiJHthcmcucmVwbGFjZShET1VCTEVfUVVPVEVTX1JFR0VYUCwgJ1xcXFxcIicpfVwiYDtcbn07XG5cbmNvbnN0IGpvaW5Db21tYW5kID0gKGZpbGUsIGFyZ3MpID0+IHtcblx0cmV0dXJuIG5vcm1hbGl6ZUFyZ3MoZmlsZSwgYXJncykuam9pbignICcpO1xufTtcblxuY29uc3QgZ2V0RXNjYXBlZENvbW1hbmQgPSAoZmlsZSwgYXJncykgPT4ge1xuXHRyZXR1cm4gbm9ybWFsaXplQXJncyhmaWxlLCBhcmdzKS5tYXAoYXJnID0+IGVzY2FwZUFyZyhhcmcpKS5qb2luKCcgJyk7XG59O1xuXG5jb25zdCBTUEFDRVNfUkVHRVhQID0gLyArL2c7XG5cbi8vIEhhbmRsZSBgZXhlY2EuY29tbWFuZCgpYFxuY29uc3QgcGFyc2VDb21tYW5kID0gY29tbWFuZCA9PiB7XG5cdGNvbnN0IHRva2VucyA9IFtdO1xuXHRmb3IgKGNvbnN0IHRva2VuIG9mIGNvbW1hbmQudHJpbSgpLnNwbGl0KFNQQUNFU19SRUdFWFApKSB7XG5cdFx0Ly8gQWxsb3cgc3BhY2VzIHRvIGJlIGVzY2FwZWQgYnkgYSBiYWNrc2xhc2ggaWYgbm90IG1lYW50IGFzIGEgZGVsaW1pdGVyXG5cdFx0Y29uc3QgcHJldmlvdXNUb2tlbiA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV07XG5cdFx0aWYgKHByZXZpb3VzVG9rZW4gJiYgcHJldmlvdXNUb2tlbi5lbmRzV2l0aCgnXFxcXCcpKSB7XG5cdFx0XHQvLyBNZXJnZSBwcmV2aW91cyB0b2tlbiB3aXRoIGN1cnJlbnQgb25lXG5cdFx0XHR0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdID0gYCR7cHJldmlvdXNUb2tlbi5zbGljZSgwLCAtMSl9ICR7dG9rZW59YDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dG9rZW5zLnB1c2godG9rZW4pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0b2tlbnM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0am9pbkNvbW1hbmQsXG5cdGdldEVzY2FwZWRDb21tYW5kLFxuXHRwYXJzZUNvbW1hbmRcbn07XG4iLCIndXNlIHN0cmljdCc7XG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuY29uc3QgY2hpbGRQcm9jZXNzID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpO1xuY29uc3QgY3Jvc3NTcGF3biA9IHJlcXVpcmUoJ2Nyb3NzLXNwYXduJyk7XG5jb25zdCBzdHJpcEZpbmFsTmV3bGluZSA9IHJlcXVpcmUoJ3N0cmlwLWZpbmFsLW5ld2xpbmUnKTtcbmNvbnN0IG5wbVJ1blBhdGggPSByZXF1aXJlKCducG0tcnVuLXBhdGgnKTtcbmNvbnN0IG9uZXRpbWUgPSByZXF1aXJlKCdvbmV0aW1lJyk7XG5jb25zdCBtYWtlRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9lcnJvcicpO1xuY29uc3Qgbm9ybWFsaXplU3RkaW8gPSByZXF1aXJlKCcuL2xpYi9zdGRpbycpO1xuY29uc3Qge3NwYXduZWRLaWxsLCBzcGF3bmVkQ2FuY2VsLCBzZXR1cFRpbWVvdXQsIHZhbGlkYXRlVGltZW91dCwgc2V0RXhpdEhhbmRsZXJ9ID0gcmVxdWlyZSgnLi9saWIva2lsbCcpO1xuY29uc3Qge2hhbmRsZUlucHV0LCBnZXRTcGF3bmVkUmVzdWx0LCBtYWtlQWxsU3RyZWFtLCB2YWxpZGF0ZUlucHV0U3luY30gPSByZXF1aXJlKCcuL2xpYi9zdHJlYW0nKTtcbmNvbnN0IHttZXJnZVByb21pc2UsIGdldFNwYXduZWRQcm9taXNlfSA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UnKTtcbmNvbnN0IHtqb2luQ29tbWFuZCwgcGFyc2VDb21tYW5kLCBnZXRFc2NhcGVkQ29tbWFuZH0gPSByZXF1aXJlKCcuL2xpYi9jb21tYW5kJyk7XG5cbmNvbnN0IERFRkFVTFRfTUFYX0JVRkZFUiA9IDEwMDAgKiAxMDAwICogMTAwO1xuXG5jb25zdCBnZXRFbnYgPSAoe2VudjogZW52T3B0aW9uLCBleHRlbmRFbnYsIHByZWZlckxvY2FsLCBsb2NhbERpciwgZXhlY1BhdGh9KSA9PiB7XG5cdGNvbnN0IGVudiA9IGV4dGVuZEVudiA/IHsuLi5wcm9jZXNzLmVudiwgLi4uZW52T3B0aW9ufSA6IGVudk9wdGlvbjtcblxuXHRpZiAocHJlZmVyTG9jYWwpIHtcblx0XHRyZXR1cm4gbnBtUnVuUGF0aC5lbnYoe2VudiwgY3dkOiBsb2NhbERpciwgZXhlY1BhdGh9KTtcblx0fVxuXG5cdHJldHVybiBlbnY7XG59O1xuXG5jb25zdCBoYW5kbGVBcmd1bWVudHMgPSAoZmlsZSwgYXJncywgb3B0aW9ucyA9IHt9KSA9PiB7XG5cdGNvbnN0IHBhcnNlZCA9IGNyb3NzU3Bhd24uX3BhcnNlKGZpbGUsIGFyZ3MsIG9wdGlvbnMpO1xuXHRmaWxlID0gcGFyc2VkLmNvbW1hbmQ7XG5cdGFyZ3MgPSBwYXJzZWQuYXJncztcblx0b3B0aW9ucyA9IHBhcnNlZC5vcHRpb25zO1xuXG5cdG9wdGlvbnMgPSB7XG5cdFx0bWF4QnVmZmVyOiBERUZBVUxUX01BWF9CVUZGRVIsXG5cdFx0YnVmZmVyOiB0cnVlLFxuXHRcdHN0cmlwRmluYWxOZXdsaW5lOiB0cnVlLFxuXHRcdGV4dGVuZEVudjogdHJ1ZSxcblx0XHRwcmVmZXJMb2NhbDogZmFsc2UsXG5cdFx0bG9jYWxEaXI6IG9wdGlvbnMuY3dkIHx8IHByb2Nlc3MuY3dkKCksXG5cdFx0ZXhlY1BhdGg6IHByb2Nlc3MuZXhlY1BhdGgsXG5cdFx0ZW5jb2Rpbmc6ICd1dGY4Jyxcblx0XHRyZWplY3Q6IHRydWUsXG5cdFx0Y2xlYW51cDogdHJ1ZSxcblx0XHRhbGw6IGZhbHNlLFxuXHRcdHdpbmRvd3NIaWRlOiB0cnVlLFxuXHRcdC4uLm9wdGlvbnNcblx0fTtcblxuXHRvcHRpb25zLmVudiA9IGdldEVudihvcHRpb25zKTtcblxuXHRvcHRpb25zLnN0ZGlvID0gbm9ybWFsaXplU3RkaW8ob3B0aW9ucyk7XG5cblx0aWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicgJiYgcGF0aC5iYXNlbmFtZShmaWxlLCAnLmV4ZScpID09PSAnY21kJykge1xuXHRcdC8vICMxMTZcblx0XHRhcmdzLnVuc2hpZnQoJy9xJyk7XG5cdH1cblxuXHRyZXR1cm4ge2ZpbGUsIGFyZ3MsIG9wdGlvbnMsIHBhcnNlZH07XG59O1xuXG5jb25zdCBoYW5kbGVPdXRwdXQgPSAob3B0aW9ucywgdmFsdWUsIGVycm9yKSA9PiB7XG5cdGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNCdWZmZXIodmFsdWUpKSB7XG5cdFx0Ly8gV2hlbiBgZXhlY2Euc3luYygpYCBlcnJvcnMsIHdlIG5vcm1hbGl6ZSBpdCB0byAnJyB0byBtaW1pYyBgZXhlY2EoKWBcblx0XHRyZXR1cm4gZXJyb3IgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6ICcnO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuc3RyaXBGaW5hbE5ld2xpbmUpIHtcblx0XHRyZXR1cm4gc3RyaXBGaW5hbE5ld2xpbmUodmFsdWUpO1xuXHR9XG5cblx0cmV0dXJuIHZhbHVlO1xufTtcblxuY29uc3QgZXhlY2EgPSAoZmlsZSwgYXJncywgb3B0aW9ucykgPT4ge1xuXHRjb25zdCBwYXJzZWQgPSBoYW5kbGVBcmd1bWVudHMoZmlsZSwgYXJncywgb3B0aW9ucyk7XG5cdGNvbnN0IGNvbW1hbmQgPSBqb2luQ29tbWFuZChmaWxlLCBhcmdzKTtcblx0Y29uc3QgZXNjYXBlZENvbW1hbmQgPSBnZXRFc2NhcGVkQ29tbWFuZChmaWxlLCBhcmdzKTtcblxuXHR2YWxpZGF0ZVRpbWVvdXQocGFyc2VkLm9wdGlvbnMpO1xuXG5cdGxldCBzcGF3bmVkO1xuXHR0cnkge1xuXHRcdHNwYXduZWQgPSBjaGlsZFByb2Nlc3Muc3Bhd24ocGFyc2VkLmZpbGUsIHBhcnNlZC5hcmdzLCBwYXJzZWQub3B0aW9ucyk7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0Ly8gRW5zdXJlIHRoZSByZXR1cm5lZCBlcnJvciBpcyBhbHdheXMgYm90aCBhIHByb21pc2UgYW5kIGEgY2hpbGQgcHJvY2Vzc1xuXHRcdGNvbnN0IGR1bW15U3Bhd25lZCA9IG5ldyBjaGlsZFByb2Nlc3MuQ2hpbGRQcm9jZXNzKCk7XG5cdFx0Y29uc3QgZXJyb3JQcm9taXNlID0gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKHtcblx0XHRcdGVycm9yLFxuXHRcdFx0c3Rkb3V0OiAnJyxcblx0XHRcdHN0ZGVycjogJycsXG5cdFx0XHRhbGw6ICcnLFxuXHRcdFx0Y29tbWFuZCxcblx0XHRcdGVzY2FwZWRDb21tYW5kLFxuXHRcdFx0cGFyc2VkLFxuXHRcdFx0dGltZWRPdXQ6IGZhbHNlLFxuXHRcdFx0aXNDYW5jZWxlZDogZmFsc2UsXG5cdFx0XHRraWxsZWQ6IGZhbHNlXG5cdFx0fSkpO1xuXHRcdHJldHVybiBtZXJnZVByb21pc2UoZHVtbXlTcGF3bmVkLCBlcnJvclByb21pc2UpO1xuXHR9XG5cblx0Y29uc3Qgc3Bhd25lZFByb21pc2UgPSBnZXRTcGF3bmVkUHJvbWlzZShzcGF3bmVkKTtcblx0Y29uc3QgdGltZWRQcm9taXNlID0gc2V0dXBUaW1lb3V0KHNwYXduZWQsIHBhcnNlZC5vcHRpb25zLCBzcGF3bmVkUHJvbWlzZSk7XG5cdGNvbnN0IHByb2Nlc3NEb25lID0gc2V0RXhpdEhhbmRsZXIoc3Bhd25lZCwgcGFyc2VkLm9wdGlvbnMsIHRpbWVkUHJvbWlzZSk7XG5cblx0Y29uc3QgY29udGV4dCA9IHtpc0NhbmNlbGVkOiBmYWxzZX07XG5cblx0c3Bhd25lZC5raWxsID0gc3Bhd25lZEtpbGwuYmluZChudWxsLCBzcGF3bmVkLmtpbGwuYmluZChzcGF3bmVkKSk7XG5cdHNwYXduZWQuY2FuY2VsID0gc3Bhd25lZENhbmNlbC5iaW5kKG51bGwsIHNwYXduZWQsIGNvbnRleHQpO1xuXG5cdGNvbnN0IGhhbmRsZVByb21pc2UgPSBhc3luYyAoKSA9PiB7XG5cdFx0Y29uc3QgW3tlcnJvciwgZXhpdENvZGUsIHNpZ25hbCwgdGltZWRPdXR9LCBzdGRvdXRSZXN1bHQsIHN0ZGVyclJlc3VsdCwgYWxsUmVzdWx0XSA9IGF3YWl0IGdldFNwYXduZWRSZXN1bHQoc3Bhd25lZCwgcGFyc2VkLm9wdGlvbnMsIHByb2Nlc3NEb25lKTtcblx0XHRjb25zdCBzdGRvdXQgPSBoYW5kbGVPdXRwdXQocGFyc2VkLm9wdGlvbnMsIHN0ZG91dFJlc3VsdCk7XG5cdFx0Y29uc3Qgc3RkZXJyID0gaGFuZGxlT3V0cHV0KHBhcnNlZC5vcHRpb25zLCBzdGRlcnJSZXN1bHQpO1xuXHRcdGNvbnN0IGFsbCA9IGhhbmRsZU91dHB1dChwYXJzZWQub3B0aW9ucywgYWxsUmVzdWx0KTtcblxuXHRcdGlmIChlcnJvciB8fCBleGl0Q29kZSAhPT0gMCB8fCBzaWduYWwgIT09IG51bGwpIHtcblx0XHRcdGNvbnN0IHJldHVybmVkRXJyb3IgPSBtYWtlRXJyb3Ioe1xuXHRcdFx0XHRlcnJvcixcblx0XHRcdFx0ZXhpdENvZGUsXG5cdFx0XHRcdHNpZ25hbCxcblx0XHRcdFx0c3Rkb3V0LFxuXHRcdFx0XHRzdGRlcnIsXG5cdFx0XHRcdGFsbCxcblx0XHRcdFx0Y29tbWFuZCxcblx0XHRcdFx0ZXNjYXBlZENvbW1hbmQsXG5cdFx0XHRcdHBhcnNlZCxcblx0XHRcdFx0dGltZWRPdXQsXG5cdFx0XHRcdGlzQ2FuY2VsZWQ6IGNvbnRleHQuaXNDYW5jZWxlZCxcblx0XHRcdFx0a2lsbGVkOiBzcGF3bmVkLmtpbGxlZFxuXHRcdFx0fSk7XG5cblx0XHRcdGlmICghcGFyc2VkLm9wdGlvbnMucmVqZWN0KSB7XG5cdFx0XHRcdHJldHVybiByZXR1cm5lZEVycm9yO1xuXHRcdFx0fVxuXG5cdFx0XHR0aHJvdyByZXR1cm5lZEVycm9yO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRjb21tYW5kLFxuXHRcdFx0ZXNjYXBlZENvbW1hbmQsXG5cdFx0XHRleGl0Q29kZTogMCxcblx0XHRcdHN0ZG91dCxcblx0XHRcdHN0ZGVycixcblx0XHRcdGFsbCxcblx0XHRcdGZhaWxlZDogZmFsc2UsXG5cdFx0XHR0aW1lZE91dDogZmFsc2UsXG5cdFx0XHRpc0NhbmNlbGVkOiBmYWxzZSxcblx0XHRcdGtpbGxlZDogZmFsc2Vcblx0XHR9O1xuXHR9O1xuXG5cdGNvbnN0IGhhbmRsZVByb21pc2VPbmNlID0gb25ldGltZShoYW5kbGVQcm9taXNlKTtcblxuXHRoYW5kbGVJbnB1dChzcGF3bmVkLCBwYXJzZWQub3B0aW9ucy5pbnB1dCk7XG5cblx0c3Bhd25lZC5hbGwgPSBtYWtlQWxsU3RyZWFtKHNwYXduZWQsIHBhcnNlZC5vcHRpb25zKTtcblxuXHRyZXR1cm4gbWVyZ2VQcm9taXNlKHNwYXduZWQsIGhhbmRsZVByb21pc2VPbmNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhlY2E7XG5cbm1vZHVsZS5leHBvcnRzLnN5bmMgPSAoZmlsZSwgYXJncywgb3B0aW9ucykgPT4ge1xuXHRjb25zdCBwYXJzZWQgPSBoYW5kbGVBcmd1bWVudHMoZmlsZSwgYXJncywgb3B0aW9ucyk7XG5cdGNvbnN0IGNvbW1hbmQgPSBqb2luQ29tbWFuZChmaWxlLCBhcmdzKTtcblx0Y29uc3QgZXNjYXBlZENvbW1hbmQgPSBnZXRFc2NhcGVkQ29tbWFuZChmaWxlLCBhcmdzKTtcblxuXHR2YWxpZGF0ZUlucHV0U3luYyhwYXJzZWQub3B0aW9ucyk7XG5cblx0bGV0IHJlc3VsdDtcblx0dHJ5IHtcblx0XHRyZXN1bHQgPSBjaGlsZFByb2Nlc3Muc3Bhd25TeW5jKHBhcnNlZC5maWxlLCBwYXJzZWQuYXJncywgcGFyc2VkLm9wdGlvbnMpO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHRocm93IG1ha2VFcnJvcih7XG5cdFx0XHRlcnJvcixcblx0XHRcdHN0ZG91dDogJycsXG5cdFx0XHRzdGRlcnI6ICcnLFxuXHRcdFx0YWxsOiAnJyxcblx0XHRcdGNvbW1hbmQsXG5cdFx0XHRlc2NhcGVkQ29tbWFuZCxcblx0XHRcdHBhcnNlZCxcblx0XHRcdHRpbWVkT3V0OiBmYWxzZSxcblx0XHRcdGlzQ2FuY2VsZWQ6IGZhbHNlLFxuXHRcdFx0a2lsbGVkOiBmYWxzZVxuXHRcdH0pO1xuXHR9XG5cblx0Y29uc3Qgc3Rkb3V0ID0gaGFuZGxlT3V0cHV0KHBhcnNlZC5vcHRpb25zLCByZXN1bHQuc3Rkb3V0LCByZXN1bHQuZXJyb3IpO1xuXHRjb25zdCBzdGRlcnIgPSBoYW5kbGVPdXRwdXQocGFyc2VkLm9wdGlvbnMsIHJlc3VsdC5zdGRlcnIsIHJlc3VsdC5lcnJvcik7XG5cblx0aWYgKHJlc3VsdC5lcnJvciB8fCByZXN1bHQuc3RhdHVzICE9PSAwIHx8IHJlc3VsdC5zaWduYWwgIT09IG51bGwpIHtcblx0XHRjb25zdCBlcnJvciA9IG1ha2VFcnJvcih7XG5cdFx0XHRzdGRvdXQsXG5cdFx0XHRzdGRlcnIsXG5cdFx0XHRlcnJvcjogcmVzdWx0LmVycm9yLFxuXHRcdFx0c2lnbmFsOiByZXN1bHQuc2lnbmFsLFxuXHRcdFx0ZXhpdENvZGU6IHJlc3VsdC5zdGF0dXMsXG5cdFx0XHRjb21tYW5kLFxuXHRcdFx0ZXNjYXBlZENvbW1hbmQsXG5cdFx0XHRwYXJzZWQsXG5cdFx0XHR0aW1lZE91dDogcmVzdWx0LmVycm9yICYmIHJlc3VsdC5lcnJvci5jb2RlID09PSAnRVRJTUVET1VUJyxcblx0XHRcdGlzQ2FuY2VsZWQ6IGZhbHNlLFxuXHRcdFx0a2lsbGVkOiByZXN1bHQuc2lnbmFsICE9PSBudWxsXG5cdFx0fSk7XG5cblx0XHRpZiAoIXBhcnNlZC5vcHRpb25zLnJlamVjdCkge1xuXHRcdFx0cmV0dXJuIGVycm9yO1xuXHRcdH1cblxuXHRcdHRocm93IGVycm9yO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRjb21tYW5kLFxuXHRcdGVzY2FwZWRDb21tYW5kLFxuXHRcdGV4aXRDb2RlOiAwLFxuXHRcdHN0ZG91dCxcblx0XHRzdGRlcnIsXG5cdFx0ZmFpbGVkOiBmYWxzZSxcblx0XHR0aW1lZE91dDogZmFsc2UsXG5cdFx0aXNDYW5jZWxlZDogZmFsc2UsXG5cdFx0a2lsbGVkOiBmYWxzZVxuXHR9O1xufTtcblxubW9kdWxlLmV4cG9ydHMuY29tbWFuZCA9IChjb21tYW5kLCBvcHRpb25zKSA9PiB7XG5cdGNvbnN0IFtmaWxlLCAuLi5hcmdzXSA9IHBhcnNlQ29tbWFuZChjb21tYW5kKTtcblx0cmV0dXJuIGV4ZWNhKGZpbGUsIGFyZ3MsIG9wdGlvbnMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMuY29tbWFuZFN5bmMgPSAoY29tbWFuZCwgb3B0aW9ucykgPT4ge1xuXHRjb25zdCBbZmlsZSwgLi4uYXJnc10gPSBwYXJzZUNvbW1hbmQoY29tbWFuZCk7XG5cdHJldHVybiBleGVjYS5zeW5jKGZpbGUsIGFyZ3MsIG9wdGlvbnMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMubm9kZSA9IChzY3JpcHRQYXRoLCBhcmdzLCBvcHRpb25zID0ge30pID0+IHtcblx0aWYgKGFyZ3MgJiYgIUFycmF5LmlzQXJyYXkoYXJncykgJiYgdHlwZW9mIGFyZ3MgPT09ICdvYmplY3QnKSB7XG5cdFx0b3B0aW9ucyA9IGFyZ3M7XG5cdFx0YXJncyA9IFtdO1xuXHR9XG5cblx0Y29uc3Qgc3RkaW8gPSBub3JtYWxpemVTdGRpby5ub2RlKG9wdGlvbnMpO1xuXHRjb25zdCBkZWZhdWx0RXhlY0FyZ3YgPSBwcm9jZXNzLmV4ZWNBcmd2LmZpbHRlcihhcmcgPT4gIWFyZy5zdGFydHNXaXRoKCctLWluc3BlY3QnKSk7XG5cblx0Y29uc3Qge1xuXHRcdG5vZGVQYXRoID0gcHJvY2Vzcy5leGVjUGF0aCxcblx0XHRub2RlT3B0aW9ucyA9IGRlZmF1bHRFeGVjQXJndlxuXHR9ID0gb3B0aW9ucztcblxuXHRyZXR1cm4gZXhlY2EoXG5cdFx0bm9kZVBhdGgsXG5cdFx0W1xuXHRcdFx0Li4ubm9kZU9wdGlvbnMsXG5cdFx0XHRzY3JpcHRQYXRoLFxuXHRcdFx0Li4uKEFycmF5LmlzQXJyYXkoYXJncykgPyBhcmdzIDogW10pXG5cdFx0XSxcblx0XHR7XG5cdFx0XHQuLi5vcHRpb25zLFxuXHRcdFx0c3RkaW46IHVuZGVmaW5lZCxcblx0XHRcdHN0ZG91dDogdW5kZWZpbmVkLFxuXHRcdFx0c3RkZXJyOiB1bmRlZmluZWQsXG5cdFx0XHRzdGRpbyxcblx0XHRcdHNoZWxsOiBmYWxzZVxuXHRcdH1cblx0KTtcbn07XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhbnNpUmVnZXgoe29ubHlGaXJzdCA9IGZhbHNlfSA9IHt9KSB7XG5cdC8vIFZhbGlkIHN0cmluZyB0ZXJtaW5hdG9yIHNlcXVlbmNlcyBhcmUgQkVMLCBFU0NcXCwgYW5kIDB4OWNcblx0Y29uc3QgU1QgPSAnKD86XFxcXHUwMDA3fFxcXFx1MDAxQlxcXFx1MDA1Q3xcXFxcdTAwOUMpJztcblx0Y29uc3QgcGF0dGVybiA9IFtcblx0XHRgW1xcXFx1MDAxQlxcXFx1MDA5Ql1bW1xcXFxdKCkjOz9dKig/Oig/Oig/Oig/OjtbLWEtekEtWlxcXFxkXFxcXC8jJi46PT8lQH5fXSspKnxbYS16QS1aXFxcXGRdKyg/OjtbLWEtekEtWlxcXFxkXFxcXC8jJi46PT8lQH5fXSopKik/JHtTVH0pYCxcblx0XHQnKD86KD86XFxcXGR7MSw0fSg/OjtcXFxcZHswLDR9KSopP1tcXFxcZEEtUFItVFpjZi1ucS11eT0+PH5dKSknLFxuXHRdLmpvaW4oJ3wnKTtcblxuXHRyZXR1cm4gbmV3IFJlZ0V4cChwYXR0ZXJuLCBvbmx5Rmlyc3QgPyB1bmRlZmluZWQgOiAnZycpO1xufVxuIiwiaW1wb3J0IGFuc2lSZWdleCBmcm9tICdhbnNpLXJlZ2V4JztcblxuY29uc3QgcmVnZXggPSBhbnNpUmVnZXgoKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RyaXBBbnNpKHN0cmluZykge1xuXHRpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBhIFxcYHN0cmluZ1xcYCwgZ290IFxcYCR7dHlwZW9mIHN0cmluZ31cXGBgKTtcblx0fVxuXG5cdC8vIEV2ZW4gdGhvdWdoIHRoZSByZWdleCBpcyBnbG9iYWwsIHdlIGRvbid0IG5lZWQgdG8gcmVzZXQgdGhlIGAubGFzdEluZGV4YFxuXHQvLyBiZWNhdXNlIHVubGlrZSBgLmV4ZWMoKWAgYW5kIGAudGVzdCgpYCwgYC5yZXBsYWNlKClgIGRvZXMgaXQgYXV0b21hdGljYWxseVxuXHQvLyBhbmQgZG9pbmcgaXQgbWFudWFsbHkgaGFzIGEgcGVyZm9ybWFuY2UgcGVuYWx0eS5cblx0cmV0dXJuIHN0cmluZy5yZXBsYWNlKHJlZ2V4LCAnJyk7XG59XG4iLCJpbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnO1xuaW1wb3J0IHt1c2VySW5mb30gZnJvbSAnbm9kZTpvcyc7XG5cbmV4cG9ydCBjb25zdCBkZXRlY3REZWZhdWx0U2hlbGwgPSAoKSA9PiB7XG5cdGNvbnN0IHtlbnZ9ID0gcHJvY2VzcztcblxuXHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuXHRcdHJldHVybiBlbnYuQ09NU1BFQyB8fCAnY21kLmV4ZSc7XG5cdH1cblxuXHR0cnkge1xuXHRcdGNvbnN0IHtzaGVsbH0gPSB1c2VySW5mbygpO1xuXHRcdGlmIChzaGVsbCkge1xuXHRcdFx0cmV0dXJuIHNoZWxsO1xuXHRcdH1cblx0fSBjYXRjaCB7fVxuXG5cdGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnZGFyd2luJykge1xuXHRcdHJldHVybiBlbnYuU0hFTEwgfHwgJy9iaW4venNoJztcblx0fVxuXG5cdHJldHVybiBlbnYuU0hFTEwgfHwgJy9iaW4vc2gnO1xufTtcblxuLy8gU3RvcmVzIGRlZmF1bHQgc2hlbGwgd2hlbiBpbXBvcnRlZC5cbmNvbnN0IGRlZmF1bHRTaGVsbCA9IGRldGVjdERlZmF1bHRTaGVsbCgpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZhdWx0U2hlbGw7XG4iLCJpbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnO1xuaW1wb3J0IGV4ZWNhIGZyb20gJ2V4ZWNhJztcbmltcG9ydCBzdHJpcEFuc2kgZnJvbSAnc3RyaXAtYW5zaSc7XG5pbXBvcnQgZGVmYXVsdFNoZWxsIGZyb20gJ2RlZmF1bHQtc2hlbGwnO1xuXG5jb25zdCBhcmdzID0gW1xuXHQnLWlsYycsXG5cdCdlY2hvIC1uIFwiX1NIRUxMX0VOVl9ERUxJTUlURVJfXCI7IGVudjsgZWNobyAtbiBcIl9TSEVMTF9FTlZfREVMSU1JVEVSX1wiOyBleGl0Jyxcbl07XG5cbmNvbnN0IGVudiA9IHtcblx0Ly8gRGlzYWJsZXMgT2ggTXkgWnNoIGF1dG8tdXBkYXRlIHRoaW5nIHRoYXQgY2FuIGJsb2NrIHRoZSBwcm9jZXNzLlxuXHRESVNBQkxFX0FVVE9fVVBEQVRFOiAndHJ1ZScsXG59O1xuXG5jb25zdCBwYXJzZUVudiA9IGVudiA9PiB7XG5cdGVudiA9IGVudi5zcGxpdCgnX1NIRUxMX0VOVl9ERUxJTUlURVJfJylbMV07XG5cdGNvbnN0IHJldHVyblZhbHVlID0ge307XG5cblx0Zm9yIChjb25zdCBsaW5lIG9mIHN0cmlwQW5zaShlbnYpLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBCb29sZWFuKGxpbmUpKSkge1xuXHRcdGNvbnN0IFtrZXksIC4uLnZhbHVlc10gPSBsaW5lLnNwbGl0KCc9Jyk7XG5cdFx0cmV0dXJuVmFsdWVba2V5XSA9IHZhbHVlcy5qb2luKCc9Jyk7XG5cdH1cblxuXHRyZXR1cm4gcmV0dXJuVmFsdWU7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2hlbGxFbnYoc2hlbGwpIHtcblx0aWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcblx0XHRyZXR1cm4gcHJvY2Vzcy5lbnY7XG5cdH1cblxuXHR0cnkge1xuXHRcdGNvbnN0IHtzdGRvdXR9ID0gYXdhaXQgZXhlY2Eoc2hlbGwgfHwgZGVmYXVsdFNoZWxsLCBhcmdzLCB7ZW52fSk7XG5cdFx0cmV0dXJuIHBhcnNlRW52KHN0ZG91dCk7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0aWYgKHNoZWxsKSB7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHByb2Nlc3MuZW52O1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hlbGxFbnZTeW5jKHNoZWxsKSB7XG5cdGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG5cdFx0cmV0dXJuIHByb2Nlc3MuZW52O1xuXHR9XG5cblx0dHJ5IHtcblx0XHRjb25zdCB7c3Rkb3V0fSA9IGV4ZWNhLnN5bmMoc2hlbGwgfHwgZGVmYXVsdFNoZWxsLCBhcmdzLCB7ZW52fSk7XG5cdFx0cmV0dXJuIHBhcnNlRW52KHN0ZG91dCk7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0aWYgKHNoZWxsKSB7XG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHByb2Nlc3MuZW52O1xuXHRcdH1cblx0fVxufVxuIiwiaW1wb3J0IHtzaGVsbEVudiwgc2hlbGxFbnZTeW5jfSBmcm9tICdzaGVsbC1lbnYnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2hlbGxQYXRoKCkge1xuXHRjb25zdCB7UEFUSH0gPSBhd2FpdCBzaGVsbEVudigpO1xuXHRyZXR1cm4gUEFUSDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNoZWxsUGF0aFN5bmMoKSB7XG5cdGNvbnN0IHtQQVRIfSA9IHNoZWxsRW52U3luYygpO1xuXHRyZXR1cm4gUEFUSDtcbn1cbiIsImltcG9ydCBwcm9jZXNzIGZyb20gJ25vZGU6cHJvY2Vzcyc7XG5pbXBvcnQge3NoZWxsUGF0aFN5bmN9IGZyb20gJ3NoZWxsLXBhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaXhQYXRoKCkge1xuXHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHByb2Nlc3MuZW52LlBBVEggPSBzaGVsbFBhdGhTeW5jKCkgfHwgW1xuXHRcdCcuL25vZGVfbW9kdWxlcy8uYmluJyxcblx0XHQnLy5ub2RlYnJldy9jdXJyZW50L2JpbicsXG5cdFx0Jy91c3IvbG9jYWwvYmluJyxcblx0XHRwcm9jZXNzLmVudi5QQVRILFxuXHRdLmpvaW4oJzonKTtcbn1cbiIsImltcG9ydCB7IGV4dG5hbWUgfSBmcm9tIFwicGF0aC1icm93c2VyaWZ5XCI7XG5pbXBvcnQgeyBSZWFkYWJsZSB9IGZyb20gXCJzdHJlYW1cIjtcbmltcG9ydCB7IGNsaXBib2FyZCB9IGZyb20gXCJlbGVjdHJvblwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIElTdHJpbmdLZXlNYXA8VD4ge1xuICBba2V5OiBzdHJpbmddOiBUO1xufVxuXG5jb25zdCBJTUFHRV9FWFRfTElTVCA9IFtcbiAgXCIucG5nXCIsXG4gIFwiLmpwZ1wiLFxuICBcIi5qcGVnXCIsXG4gIFwiLmJtcFwiLFxuICBcIi5naWZcIixcbiAgXCIuc3ZnXCIsXG4gIFwiLnRpZmZcIixcbiAgXCIud2VicFwiLFxuICBcIi5hdmlmXCIsXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNBbkltYWdlKGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBJTUFHRV9FWFRfTElTVC5pbmNsdWRlcyhleHQudG9Mb3dlckNhc2UoKSk7XG59XG5leHBvcnQgZnVuY3Rpb24gaXNBc3NldFR5cGVBbkltYWdlKHBhdGg6IHN0cmluZyk6IEJvb2xlYW4ge1xuICByZXR1cm4gaXNBbkltYWdlKGV4dG5hbWUocGF0aCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0T1MoKSB7XG4gIGNvbnN0IHsgYXBwVmVyc2lvbiB9ID0gbmF2aWdhdG9yO1xuICBpZiAoYXBwVmVyc2lvbi5pbmRleE9mKFwiV2luXCIpICE9PSAtMSkge1xuICAgIHJldHVybiBcIldpbmRvd3NcIjtcbiAgfSBlbHNlIGlmIChhcHBWZXJzaW9uLmluZGV4T2YoXCJNYWNcIikgIT09IC0xKSB7XG4gICAgcmV0dXJuIFwiTWFjT1NcIjtcbiAgfSBlbHNlIGlmIChhcHBWZXJzaW9uLmluZGV4T2YoXCJYMTFcIikgIT09IC0xKSB7XG4gICAgcmV0dXJuIFwiTGludXhcIjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gXCJVbmtub3duIE9TXCI7XG4gIH1cbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdHJlYW1Ub1N0cmluZyhzdHJlYW06IFJlYWRhYmxlKSB7XG4gIGNvbnN0IGNodW5rcyA9IFtdO1xuXG4gIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2Ygc3RyZWFtKSB7XG4gICAgY2h1bmtzLnB1c2goQnVmZmVyLmZyb20oY2h1bmspKTtcbiAgfVxuXG4gIC8vIEB0cy1pZ25vcmVcbiAgcmV0dXJuIEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZyhcInV0Zi04XCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXJsQXNzZXQodXJsOiBzdHJpbmcpIHtcbiAgcmV0dXJuICh1cmwgPSB1cmwuc3Vic3RyKDEgKyB1cmwubGFzdEluZGV4T2YoXCIvXCIpKS5zcGxpdChcIj9cIilbMF0pLnNwbGl0KFxuICAgIFwiI1wiXG4gIClbMF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0NvcHlJbWFnZUZpbGUoKSB7XG4gIGxldCBmaWxlUGF0aCA9IFwiXCI7XG4gIGNvbnN0IG9zID0gZ2V0T1MoKTtcblxuICBpZiAob3MgPT09IFwiV2luZG93c1wiKSB7XG4gICAgdmFyIHJhd0ZpbGVQYXRoID0gY2xpcGJvYXJkLnJlYWQoXCJGaWxlTmFtZVdcIik7XG4gICAgZmlsZVBhdGggPSByYXdGaWxlUGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoU3RyaW5nLmZyb21DaGFyQ29kZSgwKSwgXCJnXCIpLCBcIlwiKTtcbiAgfSBlbHNlIGlmIChvcyA9PT0gXCJNYWNPU1wiKSB7XG4gICAgZmlsZVBhdGggPSBjbGlwYm9hcmQucmVhZChcInB1YmxpYy5maWxlLXVybFwiKS5yZXBsYWNlKFwiZmlsZTovL1wiLCBcIlwiKTtcbiAgfSBlbHNlIHtcbiAgICBmaWxlUGF0aCA9IFwiXCI7XG4gIH1cbiAgcmV0dXJuIGlzQXNzZXRUeXBlQW5JbWFnZShmaWxlUGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMYXN0SW1hZ2UobGlzdDogc3RyaW5nW10pIHtcbiAgY29uc3QgcmV2ZXJzZWRMaXN0ID0gbGlzdC5yZXZlcnNlKCk7XG4gIGxldCBsYXN0SW1hZ2U7XG4gIHJldmVyc2VkTGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgIGlmIChpdGVtICYmIGl0ZW0uc3RhcnRzV2l0aChcImh0dHBcIikpIHtcbiAgICAgIGxhc3RJbWFnZSA9IGl0ZW07XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbGFzdEltYWdlO1xufVxuXG5pbnRlcmZhY2UgQW55T2JqIHtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlUb09iamVjdDxUIGV4dGVuZHMgQW55T2JqPihcbiAgYXJyOiBUW10sXG4gIGtleTogc3RyaW5nXG4pOiB7IFtrZXk6IHN0cmluZ106IFQgfSB7XG4gIGNvbnN0IG9iajogeyBba2V5OiBzdHJpbmddOiBUIH0gPSB7fTtcbiAgYXJyLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgb2JqW2VsZW1lbnRba2V5XV0gPSBlbGVtZW50O1xuICB9KTtcbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQXJyYXlCdWZmZXIoYnVmZmVyOiBCdWZmZXIpIHtcbiAgY29uc3QgYXJyYXlCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoYnVmZmVyLmxlbmd0aCk7XG4gIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShhcnJheUJ1ZmZlcik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmlld1tpXSA9IGJ1ZmZlcltpXTtcbiAgfVxuICByZXR1cm4gYXJyYXlCdWZmZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1dWlkKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7XG59XG4iLCJpbXBvcnQgKiBhcyBpZWVlNzU0IGZyb20gJ2llZWU3NTQnO1xuaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSAnbm9kZTpidWZmZXInO1xuLy8gUHJpbWl0aXZlIHR5cGVzXG5mdW5jdGlvbiBkdihhcnJheSkge1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYXJyYXkuYnVmZmVyLCBhcnJheS5ieXRlT2Zmc2V0KTtcbn1cbi8qKlxuICogOC1iaXQgdW5zaWduZWQgaW50ZWdlclxuICovXG5leHBvcnQgY29uc3QgVUlOVDggPSB7XG4gICAgbGVuOiAxLFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBkdihhcnJheSkuZ2V0VWludDgob2Zmc2V0KTtcbiAgICB9LFxuICAgIHB1dChhcnJheSwgb2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICBkdihhcnJheSkuc2V0VWludDgob2Zmc2V0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiBvZmZzZXQgKyAxO1xuICAgIH1cbn07XG4vKipcbiAqIDE2LWJpdCB1bnNpZ25lZCBpbnRlZ2VyLCBMaXR0bGUgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IFVJTlQxNl9MRSA9IHtcbiAgICBsZW46IDIsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGR2KGFycmF5KS5nZXRVaW50MTYob2Zmc2V0LCB0cnVlKTtcbiAgICB9LFxuICAgIHB1dChhcnJheSwgb2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICBkdihhcnJheSkuc2V0VWludDE2KG9mZnNldCwgdmFsdWUsIHRydWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgICB9XG59O1xuLyoqXG4gKiAxNi1iaXQgdW5zaWduZWQgaW50ZWdlciwgQmlnIEVuZGlhbiBieXRlIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBVSU5UMTZfQkUgPSB7XG4gICAgbGVuOiAyLFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBkdihhcnJheSkuZ2V0VWludDE2KG9mZnNldCk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldFVpbnQxNihvZmZzZXQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDI7XG4gICAgfVxufTtcbi8qKlxuICogMjQtYml0IHVuc2lnbmVkIGludGVnZXIsIExpdHRsZSBFbmRpYW4gYnl0ZSBvcmRlclxuICovXG5leHBvcnQgY29uc3QgVUlOVDI0X0xFID0ge1xuICAgIGxlbjogMyxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICBjb25zdCBkYXRhVmlldyA9IGR2KGFycmF5KTtcbiAgICAgICAgcmV0dXJuIGRhdGFWaWV3LmdldFVpbnQ4KG9mZnNldCkgKyAoZGF0YVZpZXcuZ2V0VWludDE2KG9mZnNldCArIDEsIHRydWUpIDw8IDgpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGRhdGFWaWV3ID0gZHYoYXJyYXkpO1xuICAgICAgICBkYXRhVmlldy5zZXRVaW50OChvZmZzZXQsIHZhbHVlICYgMHhmZik7XG4gICAgICAgIGRhdGFWaWV3LnNldFVpbnQxNihvZmZzZXQgKyAxLCB2YWx1ZSA+PiA4LCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDM7XG4gICAgfVxufTtcbi8qKlxuICogMjQtYml0IHVuc2lnbmVkIGludGVnZXIsIEJpZyBFbmRpYW4gYnl0ZSBvcmRlclxuICovXG5leHBvcnQgY29uc3QgVUlOVDI0X0JFID0ge1xuICAgIGxlbjogMyxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICBjb25zdCBkYXRhVmlldyA9IGR2KGFycmF5KTtcbiAgICAgICAgcmV0dXJuIChkYXRhVmlldy5nZXRVaW50MTYob2Zmc2V0KSA8PCA4KSArIGRhdGFWaWV3LmdldFVpbnQ4KG9mZnNldCArIDIpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGRhdGFWaWV3ID0gZHYoYXJyYXkpO1xuICAgICAgICBkYXRhVmlldy5zZXRVaW50MTYob2Zmc2V0LCB2YWx1ZSA+PiA4KTtcbiAgICAgICAgZGF0YVZpZXcuc2V0VWludDgob2Zmc2V0ICsgMiwgdmFsdWUgJiAweGZmKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDM7XG4gICAgfVxufTtcbi8qKlxuICogMzItYml0IHVuc2lnbmVkIGludGVnZXIsIExpdHRsZSBFbmRpYW4gYnl0ZSBvcmRlclxuICovXG5leHBvcnQgY29uc3QgVUlOVDMyX0xFID0ge1xuICAgIGxlbjogNCxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gZHYoYXJyYXkpLmdldFVpbnQzMihvZmZzZXQsIHRydWUpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGR2KGFycmF5KS5zZXRVaW50MzIob2Zmc2V0LCB2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIHJldHVybiBvZmZzZXQgKyA0O1xuICAgIH1cbn07XG4vKipcbiAqIDMyLWJpdCB1bnNpZ25lZCBpbnRlZ2VyLCBCaWcgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IFVJTlQzMl9CRSA9IHtcbiAgICBsZW46IDQsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGR2KGFycmF5KS5nZXRVaW50MzIob2Zmc2V0KTtcbiAgICB9LFxuICAgIHB1dChhcnJheSwgb2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICBkdihhcnJheSkuc2V0VWludDMyKG9mZnNldCwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgNDtcbiAgICB9XG59O1xuLyoqXG4gKiA4LWJpdCBzaWduZWQgaW50ZWdlclxuICovXG5leHBvcnQgY29uc3QgSU5UOCA9IHtcbiAgICBsZW46IDEsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGR2KGFycmF5KS5nZXRJbnQ4KG9mZnNldCk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEludDgob2Zmc2V0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiBvZmZzZXQgKyAxO1xuICAgIH1cbn07XG4vKipcbiAqIDE2LWJpdCBzaWduZWQgaW50ZWdlciwgQmlnIEVuZGlhbiBieXRlIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBJTlQxNl9CRSA9IHtcbiAgICBsZW46IDIsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGR2KGFycmF5KS5nZXRJbnQxNihvZmZzZXQpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGR2KGFycmF5KS5zZXRJbnQxNihvZmZzZXQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDI7XG4gICAgfVxufTtcbi8qKlxuICogMTYtYml0IHNpZ25lZCBpbnRlZ2VyLCBMaXR0bGUgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IElOVDE2X0xFID0ge1xuICAgIGxlbjogMixcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gZHYoYXJyYXkpLmdldEludDE2KG9mZnNldCwgdHJ1ZSk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEludDE2KG9mZnNldCwgdmFsdWUsIHRydWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgMjtcbiAgICB9XG59O1xuLyoqXG4gKiAyNC1iaXQgc2lnbmVkIGludGVnZXIsIExpdHRsZSBFbmRpYW4gYnl0ZSBvcmRlclxuICovXG5leHBvcnQgY29uc3QgSU5UMjRfTEUgPSB7XG4gICAgbGVuOiAzLFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIGNvbnN0IHVuc2lnbmVkID0gVUlOVDI0X0xFLmdldChhcnJheSwgb2Zmc2V0KTtcbiAgICAgICAgcmV0dXJuIHVuc2lnbmVkID4gMHg3ZmZmZmYgPyB1bnNpZ25lZCAtIDB4MTAwMDAwMCA6IHVuc2lnbmVkO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IGRhdGFWaWV3ID0gZHYoYXJyYXkpO1xuICAgICAgICBkYXRhVmlldy5zZXRVaW50OChvZmZzZXQsIHZhbHVlICYgMHhmZik7XG4gICAgICAgIGRhdGFWaWV3LnNldFVpbnQxNihvZmZzZXQgKyAxLCB2YWx1ZSA+PiA4LCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDM7XG4gICAgfVxufTtcbi8qKlxuICogMjQtYml0IHNpZ25lZCBpbnRlZ2VyLCBCaWcgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IElOVDI0X0JFID0ge1xuICAgIGxlbjogMyxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICBjb25zdCB1bnNpZ25lZCA9IFVJTlQyNF9CRS5nZXQoYXJyYXksIG9mZnNldCk7XG4gICAgICAgIHJldHVybiB1bnNpZ25lZCA+IDB4N2ZmZmZmID8gdW5zaWduZWQgLSAweDEwMDAwMDAgOiB1bnNpZ25lZDtcbiAgICB9LFxuICAgIHB1dChhcnJheSwgb2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICBjb25zdCBkYXRhVmlldyA9IGR2KGFycmF5KTtcbiAgICAgICAgZGF0YVZpZXcuc2V0VWludDE2KG9mZnNldCwgdmFsdWUgPj4gOCk7XG4gICAgICAgIGRhdGFWaWV3LnNldFVpbnQ4KG9mZnNldCArIDIsIHZhbHVlICYgMHhmZik7XG4gICAgICAgIHJldHVybiBvZmZzZXQgKyAzO1xuICAgIH1cbn07XG4vKipcbiAqIDMyLWJpdCBzaWduZWQgaW50ZWdlciwgQmlnIEVuZGlhbiBieXRlIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBJTlQzMl9CRSA9IHtcbiAgICBsZW46IDQsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGR2KGFycmF5KS5nZXRJbnQzMihvZmZzZXQpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGR2KGFycmF5KS5zZXRJbnQzMihvZmZzZXQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gICAgfVxufTtcbi8qKlxuICogMzItYml0IHNpZ25lZCBpbnRlZ2VyLCBCaWcgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IElOVDMyX0xFID0ge1xuICAgIGxlbjogNCxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gZHYoYXJyYXkpLmdldEludDMyKG9mZnNldCwgdHJ1ZSk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEludDMyKG9mZnNldCwgdmFsdWUsIHRydWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgNDtcbiAgICB9XG59O1xuLyoqXG4gKiA2NC1iaXQgdW5zaWduZWQgaW50ZWdlciwgTGl0dGxlIEVuZGlhbiBieXRlIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBVSU5UNjRfTEUgPSB7XG4gICAgbGVuOiA4LFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBkdihhcnJheSkuZ2V0QmlnVWludDY0KG9mZnNldCwgdHJ1ZSk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEJpZ1VpbnQ2NChvZmZzZXQsIHZhbHVlLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDg7XG4gICAgfVxufTtcbi8qKlxuICogNjQtYml0IHNpZ25lZCBpbnRlZ2VyLCBMaXR0bGUgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IElOVDY0X0xFID0ge1xuICAgIGxlbjogOCxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gZHYoYXJyYXkpLmdldEJpZ0ludDY0KG9mZnNldCwgdHJ1ZSk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEJpZ0ludDY0KG9mZnNldCwgdmFsdWUsIHRydWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgODtcbiAgICB9XG59O1xuLyoqXG4gKiA2NC1iaXQgdW5zaWduZWQgaW50ZWdlciwgQmlnIEVuZGlhbiBieXRlIG9yZGVyXG4gKi9cbmV4cG9ydCBjb25zdCBVSU5UNjRfQkUgPSB7XG4gICAgbGVuOiA4LFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBkdihhcnJheSkuZ2V0QmlnVWludDY0KG9mZnNldCk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEJpZ1VpbnQ2NChvZmZzZXQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDg7XG4gICAgfVxufTtcbi8qKlxuICogNjQtYml0IHNpZ25lZCBpbnRlZ2VyLCBCaWcgRW5kaWFuIGJ5dGUgb3JkZXJcbiAqL1xuZXhwb3J0IGNvbnN0IElOVDY0X0JFID0ge1xuICAgIGxlbjogOCxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gZHYoYXJyYXkpLmdldEJpZ0ludDY0KG9mZnNldCk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEJpZ0ludDY0KG9mZnNldCwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgODtcbiAgICB9XG59O1xuLyoqXG4gKiBJRUVFIDc1NCAxNi1iaXQgKGhhbGYgcHJlY2lzaW9uKSBmbG9hdCwgYmlnIGVuZGlhblxuICovXG5leHBvcnQgY29uc3QgRmxvYXQxNl9CRSA9IHtcbiAgICBsZW46IDIsXG4gICAgZ2V0KGRhdGFWaWV3LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGllZWU3NTQucmVhZChkYXRhVmlldywgb2Zmc2V0LCBmYWxzZSwgMTAsIHRoaXMubGVuKTtcbiAgICB9LFxuICAgIHB1dChkYXRhVmlldywgb2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICBpZWVlNzU0LndyaXRlKGRhdGFWaWV3LCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgMTAsIHRoaXMubGVuKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIHRoaXMubGVuO1xuICAgIH1cbn07XG4vKipcbiAqIElFRUUgNzU0IDE2LWJpdCAoaGFsZiBwcmVjaXNpb24pIGZsb2F0LCBsaXR0bGUgZW5kaWFuXG4gKi9cbmV4cG9ydCBjb25zdCBGbG9hdDE2X0xFID0ge1xuICAgIGxlbjogMixcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gaWVlZTc1NC5yZWFkKGFycmF5LCBvZmZzZXQsIHRydWUsIDEwLCB0aGlzLmxlbik7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgaWVlZTc1NC53cml0ZShhcnJheSwgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgMTAsIHRoaXMubGVuKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIHRoaXMubGVuO1xuICAgIH1cbn07XG4vKipcbiAqIElFRUUgNzU0IDMyLWJpdCAoc2luZ2xlIHByZWNpc2lvbikgZmxvYXQsIGJpZyBlbmRpYW5cbiAqL1xuZXhwb3J0IGNvbnN0IEZsb2F0MzJfQkUgPSB7XG4gICAgbGVuOiA0LFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBkdihhcnJheSkuZ2V0RmxvYXQzMihvZmZzZXQpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGR2KGFycmF5KS5zZXRGbG9hdDMyKG9mZnNldCwgdmFsdWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgNDtcbiAgICB9XG59O1xuLyoqXG4gKiBJRUVFIDc1NCAzMi1iaXQgKHNpbmdsZSBwcmVjaXNpb24pIGZsb2F0LCBsaXR0bGUgZW5kaWFuXG4gKi9cbmV4cG9ydCBjb25zdCBGbG9hdDMyX0xFID0ge1xuICAgIGxlbjogNCxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gZHYoYXJyYXkpLmdldEZsb2F0MzIob2Zmc2V0LCB0cnVlKTtcbiAgICB9LFxuICAgIHB1dChhcnJheSwgb2Zmc2V0LCB2YWx1ZSkge1xuICAgICAgICBkdihhcnJheSkuc2V0RmxvYXQzMihvZmZzZXQsIHZhbHVlLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIG9mZnNldCArIDQ7XG4gICAgfVxufTtcbi8qKlxuICogSUVFRSA3NTQgNjQtYml0IChkb3VibGUgcHJlY2lzaW9uKSBmbG9hdCwgYmlnIGVuZGlhblxuICovXG5leHBvcnQgY29uc3QgRmxvYXQ2NF9CRSA9IHtcbiAgICBsZW46IDgsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGR2KGFycmF5KS5nZXRGbG9hdDY0KG9mZnNldCk7XG4gICAgfSxcbiAgICBwdXQoYXJyYXksIG9mZnNldCwgdmFsdWUpIHtcbiAgICAgICAgZHYoYXJyYXkpLnNldEZsb2F0NjQob2Zmc2V0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiBvZmZzZXQgKyA4O1xuICAgIH1cbn07XG4vKipcbiAqIElFRUUgNzU0IDY0LWJpdCAoZG91YmxlIHByZWNpc2lvbikgZmxvYXQsIGxpdHRsZSBlbmRpYW5cbiAqL1xuZXhwb3J0IGNvbnN0IEZsb2F0NjRfTEUgPSB7XG4gICAgbGVuOiA4LFxuICAgIGdldChhcnJheSwgb2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiBkdihhcnJheSkuZ2V0RmxvYXQ2NChvZmZzZXQsIHRydWUpO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGR2KGFycmF5KS5zZXRGbG9hdDY0KG9mZnNldCwgdmFsdWUsIHRydWUpO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgODtcbiAgICB9XG59O1xuLyoqXG4gKiBJRUVFIDc1NCA4MC1iaXQgKGV4dGVuZGVkIHByZWNpc2lvbikgZmxvYXQsIGJpZyBlbmRpYW5cbiAqL1xuZXhwb3J0IGNvbnN0IEZsb2F0ODBfQkUgPSB7XG4gICAgbGVuOiAxMCxcbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gaWVlZTc1NC5yZWFkKGFycmF5LCBvZmZzZXQsIGZhbHNlLCA2MywgdGhpcy5sZW4pO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGllZWU3NTQud3JpdGUoYXJyYXksIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCA2MywgdGhpcy5sZW4pO1xuICAgICAgICByZXR1cm4gb2Zmc2V0ICsgdGhpcy5sZW47XG4gICAgfVxufTtcbi8qKlxuICogSUVFRSA3NTQgODAtYml0IChleHRlbmRlZCBwcmVjaXNpb24pIGZsb2F0LCBsaXR0bGUgZW5kaWFuXG4gKi9cbmV4cG9ydCBjb25zdCBGbG9hdDgwX0xFID0ge1xuICAgIGxlbjogMTAsXG4gICAgZ2V0KGFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIGllZWU3NTQucmVhZChhcnJheSwgb2Zmc2V0LCB0cnVlLCA2MywgdGhpcy5sZW4pO1xuICAgIH0sXG4gICAgcHV0KGFycmF5LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgICAgIGllZWU3NTQud3JpdGUoYXJyYXksIHZhbHVlLCBvZmZzZXQsIHRydWUsIDYzLCB0aGlzLmxlbik7XG4gICAgICAgIHJldHVybiBvZmZzZXQgKyB0aGlzLmxlbjtcbiAgICB9XG59O1xuLyoqXG4gKiBJZ25vcmUgYSBnaXZlbiBudW1iZXIgb2YgYnl0ZXNcbiAqL1xuZXhwb3J0IGNsYXNzIElnbm9yZVR5cGUge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSBsZW4gbnVtYmVyIG9mIGJ5dGVzIHRvIGlnbm9yZVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGxlbikge1xuICAgICAgICB0aGlzLmxlbiA9IGxlbjtcbiAgICB9XG4gICAgLy8gVG9EbzogZG9uJ3QgcmVhZCwgYnV0IHNraXAgZGF0YVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZW1wdHktZnVuY3Rpb25cbiAgICBnZXQoYXJyYXksIG9mZikge1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBVaW50OEFycmF5VHlwZSB7XG4gICAgY29uc3RydWN0b3IobGVuKSB7XG4gICAgICAgIHRoaXMubGVuID0gbGVuO1xuICAgIH1cbiAgICBnZXQoYXJyYXksIG9mZnNldCkge1xuICAgICAgICByZXR1cm4gYXJyYXkuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyB0aGlzLmxlbik7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIEJ1ZmZlclR5cGUge1xuICAgIGNvbnN0cnVjdG9yKGxlbikge1xuICAgICAgICB0aGlzLmxlbiA9IGxlbjtcbiAgICB9XG4gICAgZ2V0KHVpbnQ4QXJyYXksIG9mZikge1xuICAgICAgICByZXR1cm4gQnVmZmVyLmZyb20odWludDhBcnJheS5zdWJhcnJheShvZmYsIG9mZiArIHRoaXMubGVuKSk7XG4gICAgfVxufVxuLyoqXG4gKiBDb25zdW1lIGEgZml4ZWQgbnVtYmVyIG9mIGJ5dGVzIGZyb20gdGhlIHN0cmVhbSBhbmQgcmV0dXJuIGEgc3RyaW5nIHdpdGggYSBzcGVjaWZpZWQgZW5jb2RpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBTdHJpbmdUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcihsZW4sIGVuY29kaW5nKSB7XG4gICAgICAgIHRoaXMubGVuID0gbGVuO1xuICAgICAgICB0aGlzLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gICAgfVxuICAgIGdldCh1aW50OEFycmF5LCBvZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIEJ1ZmZlci5mcm9tKHVpbnQ4QXJyYXkpLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsIG9mZnNldCwgb2Zmc2V0ICsgdGhpcy5sZW4pO1xuICAgIH1cbn1cbi8qKlxuICogQU5TSSBMYXRpbiAxIFN0cmluZ1xuICogVXNpbmcgd2luZG93cy0xMjUyIC8gSVNPIDg4NTktMSBkZWNvZGluZ1xuICovXG5leHBvcnQgY2xhc3MgQW5zaVN0cmluZ1R5cGUge1xuICAgIGNvbnN0cnVjdG9yKGxlbikge1xuICAgICAgICB0aGlzLmxlbiA9IGxlbjtcbiAgICB9XG4gICAgc3RhdGljIGRlY29kZShidWZmZXIsIG9mZnNldCwgdW50aWwpIHtcbiAgICAgICAgbGV0IHN0ciA9ICcnO1xuICAgICAgICBmb3IgKGxldCBpID0gb2Zmc2V0OyBpIDwgdW50aWw7ICsraSkge1xuICAgICAgICAgICAgc3RyICs9IEFuc2lTdHJpbmdUeXBlLmNvZGVQb2ludFRvU3RyaW5nKEFuc2lTdHJpbmdUeXBlLnNpbmdsZUJ5dGVEZWNvZGVyKGJ1ZmZlcltpXSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIHN0YXRpYyBpblJhbmdlKGEsIG1pbiwgbWF4KSB7XG4gICAgICAgIHJldHVybiBtaW4gPD0gYSAmJiBhIDw9IG1heDtcbiAgICB9XG4gICAgc3RhdGljIGNvZGVQb2ludFRvU3RyaW5nKGNwKSB7XG4gICAgICAgIGlmIChjcCA8PSAweEZGRkYpIHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNwKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNwIC09IDB4MTAwMDA7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgoY3AgPj4gMTApICsgMHhEODAwLCAoY3AgJiAweDNGRikgKyAweERDMDApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN0YXRpYyBzaW5nbGVCeXRlRGVjb2RlcihiaXRlKSB7XG4gICAgICAgIGlmIChBbnNpU3RyaW5nVHlwZS5pblJhbmdlKGJpdGUsIDB4MDAsIDB4N0YpKSB7XG4gICAgICAgICAgICByZXR1cm4gYml0ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb2RlUG9pbnQgPSBBbnNpU3RyaW5nVHlwZS53aW5kb3dzMTI1MltiaXRlIC0gMHg4MF07XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdpbnZhbGlkaW5nIGVuY29kaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvZGVQb2ludDtcbiAgICB9XG4gICAgZ2V0KGJ1ZmZlciwgb2Zmc2V0ID0gMCkge1xuICAgICAgICByZXR1cm4gQW5zaVN0cmluZ1R5cGUuZGVjb2RlKGJ1ZmZlciwgb2Zmc2V0LCBvZmZzZXQgKyB0aGlzLmxlbik7XG4gICAgfVxufVxuQW5zaVN0cmluZ1R5cGUud2luZG93czEyNTIgPSBbODM2NCwgMTI5LCA4MjE4LCA0MDIsIDgyMjIsIDgyMzAsIDgyMjQsIDgyMjUsIDcxMCwgODI0MCwgMzUyLFxuICAgIDgyNDksIDMzOCwgMTQxLCAzODEsIDE0MywgMTQ0LCA4MjE2LCA4MjE3LCA4MjIwLCA4MjIxLCA4MjI2LCA4MjExLCA4MjEyLCA3MzIsXG4gICAgODQ4MiwgMzUzLCA4MjUwLCAzMzksIDE1NywgMzgyLCAzNzYsIDE2MCwgMTYxLCAxNjIsIDE2MywgMTY0LCAxNjUsIDE2NiwgMTY3LCAxNjgsXG4gICAgMTY5LCAxNzAsIDE3MSwgMTcyLCAxNzMsIDE3NCwgMTc1LCAxNzYsIDE3NywgMTc4LCAxNzksIDE4MCwgMTgxLCAxODIsIDE4MywgMTg0LFxuICAgIDE4NSwgMTg2LCAxODcsIDE4OCwgMTg5LCAxOTAsIDE5MSwgMTkyLCAxOTMsIDE5NCwgMTk1LCAxOTYsIDE5NywgMTk4LCAxOTksIDIwMCxcbiAgICAyMDEsIDIwMiwgMjAzLCAyMDQsIDIwNSwgMjA2LCAyMDcsIDIwOCwgMjA5LCAyMTAsIDIxMSwgMjEyLCAyMTMsIDIxNCwgMjE1LCAyMTYsXG4gICAgMjE3LCAyMTgsIDIxOSwgMjIwLCAyMjEsIDIyMiwgMjIzLCAyMjQsIDIyNSwgMjI2LCAyMjcsIDIyOCwgMjI5LCAyMzAsIDIzMSwgMjMyLFxuICAgIDIzMywgMjM0LCAyMzUsIDIzNiwgMjM3LCAyMzgsIDIzOSwgMjQwLCAyNDEsIDI0MiwgMjQzLCAyNDQsIDI0NSwgMjQ2LCAyNDcsXG4gICAgMjQ4LCAyNDksIDI1MCwgMjUxLCAyNTIsIDI1MywgMjU0LCAyNTVdO1xuIiwiZXhwb3J0IGNvbnN0IGRlZmF1bHRNZXNzYWdlcyA9ICdFbmQtT2YtU3RyZWFtJztcbi8qKlxuICogVGhyb3duIG9uIHJlYWQgb3BlcmF0aW9uIG9mIHRoZSBlbmQgb2YgZmlsZSBvciBzdHJlYW0gaGFzIGJlZW4gcmVhY2hlZFxuICovXG5leHBvcnQgY2xhc3MgRW5kT2ZTdHJlYW1FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoZGVmYXVsdE1lc3NhZ2VzKTtcbiAgICB9XG59XG4iLCJleHBvcnQgY2xhc3MgRGVmZXJyZWQge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnJlc29sdmUgPSAoKSA9PiBudWxsO1xuICAgICAgICB0aGlzLnJlamVjdCA9ICgpID0+IG51bGw7XG4gICAgICAgIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgICAgICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgRW5kT2ZTdHJlYW1FcnJvciB9IGZyb20gXCIuL0VuZE9mU3RyZWFtRXJyb3IuanNcIjtcbmV4cG9ydCBjbGFzcyBBYnN0cmFjdFN0cmVhbVJlYWRlciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYXhpbXVtIHJlcXVlc3QgbGVuZ3RoIG9uIHJlYWQtc3RyZWFtIG9wZXJhdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tYXhTdHJlYW1SZWFkU2l6ZSA9IDEgKiAxMDI0ICogMTAyNDtcbiAgICAgICAgdGhpcy5lbmRPZlN0cmVhbSA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcmUgcGVla2VkIGRhdGFcbiAgICAgICAgICogQHR5cGUge0FycmF5fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5wZWVrUXVldWUgPSBbXTtcbiAgICB9XG4gICAgYXN5bmMgcGVlayh1aW50OEFycmF5LCBvZmZzZXQsIGxlbmd0aCkge1xuICAgICAgICBjb25zdCBieXRlc1JlYWQgPSBhd2FpdCB0aGlzLnJlYWQodWludDhBcnJheSwgb2Zmc2V0LCBsZW5ndGgpO1xuICAgICAgICB0aGlzLnBlZWtRdWV1ZS5wdXNoKHVpbnQ4QXJyYXkuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyBieXRlc1JlYWQpKTsgLy8gUHV0IHJlYWQgZGF0YSBiYWNrIHRvIHBlZWsgYnVmZmVyXG4gICAgICAgIHJldHVybiBieXRlc1JlYWQ7XG4gICAgfVxuICAgIGFzeW5jIHJlYWQoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCkge1xuICAgICAgICBpZiAobGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYnl0ZXNSZWFkID0gdGhpcy5yZWFkRnJvbVBlZWtCdWZmZXIoYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCk7XG4gICAgICAgIGJ5dGVzUmVhZCArPSBhd2FpdCB0aGlzLnJlYWRSZW1haW5kZXJGcm9tU3RyZWFtKGJ1ZmZlciwgb2Zmc2V0ICsgYnl0ZXNSZWFkLCBsZW5ndGggLSBieXRlc1JlYWQpO1xuICAgICAgICBpZiAoYnl0ZXNSZWFkID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRW5kT2ZTdHJlYW1FcnJvcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBieXRlc1JlYWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlYWQgY2h1bmsgZnJvbSBzdHJlYW1cbiAgICAgKiBAcGFyYW0gYnVmZmVyIC0gVGFyZ2V0IFVpbnQ4QXJyYXkgKG9yIEJ1ZmZlcikgdG8gc3RvcmUgZGF0YSByZWFkIGZyb20gc3RyZWFtIGluXG4gICAgICogQHBhcmFtIG9mZnNldCAtIE9mZnNldCB0YXJnZXRcbiAgICAgKiBAcGFyYW0gbGVuZ3RoIC0gTnVtYmVyIG9mIGJ5dGVzIHRvIHJlYWRcbiAgICAgKiBAcmV0dXJucyBOdW1iZXIgb2YgYnl0ZXMgcmVhZFxuICAgICAqL1xuICAgIHJlYWRGcm9tUGVla0J1ZmZlcihidWZmZXIsIG9mZnNldCwgbGVuZ3RoKSB7XG4gICAgICAgIGxldCByZW1haW5pbmcgPSBsZW5ndGg7XG4gICAgICAgIGxldCBieXRlc1JlYWQgPSAwO1xuICAgICAgICAvLyBjb25zdW1lIHBlZWtlZCBkYXRhIGZpcnN0XG4gICAgICAgIHdoaWxlICh0aGlzLnBlZWtRdWV1ZS5sZW5ndGggPiAwICYmIHJlbWFpbmluZyA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHBlZWtEYXRhID0gdGhpcy5wZWVrUXVldWUucG9wKCk7IC8vIEZyb250IG9mIHF1ZXVlXG4gICAgICAgICAgICBpZiAoIXBlZWtEYXRhKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGVla0RhdGEgc2hvdWxkIGJlIGRlZmluZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IGxlbkNvcHkgPSBNYXRoLm1pbihwZWVrRGF0YS5sZW5ndGgsIHJlbWFpbmluZyk7XG4gICAgICAgICAgICBidWZmZXIuc2V0KHBlZWtEYXRhLnN1YmFycmF5KDAsIGxlbkNvcHkpLCBvZmZzZXQgKyBieXRlc1JlYWQpO1xuICAgICAgICAgICAgYnl0ZXNSZWFkICs9IGxlbkNvcHk7XG4gICAgICAgICAgICByZW1haW5pbmcgLT0gbGVuQ29weTtcbiAgICAgICAgICAgIGlmIChsZW5Db3B5IDwgcGVla0RhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVtYWluZGVyIGJhY2sgdG8gcXVldWVcbiAgICAgICAgICAgICAgICB0aGlzLnBlZWtRdWV1ZS5wdXNoKHBlZWtEYXRhLnN1YmFycmF5KGxlbkNvcHkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYnl0ZXNSZWFkO1xuICAgIH1cbiAgICBhc3luYyByZWFkUmVtYWluZGVyRnJvbVN0cmVhbShidWZmZXIsIG9mZnNldCwgaW5pdGlhbFJlbWFpbmluZykge1xuICAgICAgICBsZXQgcmVtYWluaW5nID0gaW5pdGlhbFJlbWFpbmluZztcbiAgICAgICAgbGV0IGJ5dGVzUmVhZCA9IDA7XG4gICAgICAgIC8vIENvbnRpbnVlIHJlYWRpbmcgZnJvbSBzdHJlYW0gaWYgcmVxdWlyZWRcbiAgICAgICAgd2hpbGUgKHJlbWFpbmluZyA+IDAgJiYgIXRoaXMuZW5kT2ZTdHJlYW0pIHtcbiAgICAgICAgICAgIGNvbnN0IHJlcUxlbiA9IE1hdGgubWluKHJlbWFpbmluZywgdGhpcy5tYXhTdHJlYW1SZWFkU2l6ZSk7XG4gICAgICAgICAgICBjb25zdCBjaHVua0xlbiA9IGF3YWl0IHRoaXMucmVhZEZyb21TdHJlYW0oYnVmZmVyLCBvZmZzZXQgKyBieXRlc1JlYWQsIHJlcUxlbik7XG4gICAgICAgICAgICBpZiAoY2h1bmtMZW4gPT09IDApXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBieXRlc1JlYWQgKz0gY2h1bmtMZW47XG4gICAgICAgICAgICByZW1haW5pbmcgLT0gY2h1bmtMZW47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ5dGVzUmVhZDtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBFbmRPZlN0cmVhbUVycm9yIH0gZnJvbSAnLi9FbmRPZlN0cmVhbUVycm9yLmpzJztcbmltcG9ydCB7IERlZmVycmVkIH0gZnJvbSAnLi9EZWZlcnJlZC5qcyc7XG5pbXBvcnQgeyBBYnN0cmFjdFN0cmVhbVJlYWRlciB9IGZyb20gXCIuL0Fic3RyYWN0U3RyZWFtUmVhZGVyLmpzXCI7XG5leHBvcnQgeyBFbmRPZlN0cmVhbUVycm9yIH0gZnJvbSAnLi9FbmRPZlN0cmVhbUVycm9yLmpzJztcbi8qKlxuICogTm9kZS5qcyBSZWFkYWJsZSBTdHJlYW0gUmVhZGVyXG4gKiBSZWY6IGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvc3RyZWFtLmh0bWwjcmVhZGFibGUtc3RyZWFtc1xuICovXG5leHBvcnQgY2xhc3MgU3RyZWFtUmVhZGVyIGV4dGVuZHMgQWJzdHJhY3RTdHJlYW1SZWFkZXIge1xuICAgIGNvbnN0cnVjdG9yKHMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zID0gcztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZmVycmVkIHVzZWQgZm9yIHBvc3Rwb25lZCByZWFkIHJlcXVlc3QgKGFzIG5vdCBkYXRhIGlzIHlldCBhdmFpbGFibGUgdG8gcmVhZClcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVmZXJyZWQgPSBudWxsO1xuICAgICAgICBpZiAoIXMucmVhZCB8fCAhcy5vbmNlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGFuIGluc3RhbmNlIG9mIHN0cmVhbS5SZWFkYWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucy5vbmNlKCdlbmQnLCAoKSA9PiB0aGlzLnJlamVjdChuZXcgRW5kT2ZTdHJlYW1FcnJvcigpKSk7XG4gICAgICAgIHRoaXMucy5vbmNlKCdlcnJvcicsIGVyciA9PiB0aGlzLnJlamVjdChlcnIpKTtcbiAgICAgICAgdGhpcy5zLm9uY2UoJ2Nsb3NlJywgKCkgPT4gdGhpcy5yZWplY3QobmV3IEVycm9yKCdTdHJlYW0gY2xvc2VkJykpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVhZCBjaHVuayBmcm9tIHN0cmVhbVxuICAgICAqIEBwYXJhbSBidWZmZXIgVGFyZ2V0IFVpbnQ4QXJyYXkgKG9yIEJ1ZmZlcikgdG8gc3RvcmUgZGF0YSByZWFkIGZyb20gc3RyZWFtIGluXG4gICAgICogQHBhcmFtIG9mZnNldCBPZmZzZXQgdGFyZ2V0XG4gICAgICogQHBhcmFtIGxlbmd0aCBOdW1iZXIgb2YgYnl0ZXMgdG8gcmVhZFxuICAgICAqIEByZXR1cm5zIE51bWJlciBvZiBieXRlcyByZWFkXG4gICAgICovXG4gICAgYXN5bmMgcmVhZEZyb21TdHJlYW0oYnVmZmVyLCBvZmZzZXQsIGxlbmd0aCkge1xuICAgICAgICBpZiAodGhpcy5lbmRPZlN0cmVhbSkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVhZEJ1ZmZlciA9IHRoaXMucy5yZWFkKGxlbmd0aCk7XG4gICAgICAgIGlmIChyZWFkQnVmZmVyKSB7XG4gICAgICAgICAgICBidWZmZXIuc2V0KHJlYWRCdWZmZXIsIG9mZnNldCk7XG4gICAgICAgICAgICByZXR1cm4gcmVhZEJ1ZmZlci5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIGJ1ZmZlcixcbiAgICAgICAgICAgIG9mZnNldCxcbiAgICAgICAgICAgIGxlbmd0aCxcbiAgICAgICAgICAgIGRlZmVycmVkOiBuZXcgRGVmZXJyZWQoKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlZmVycmVkID0gcmVxdWVzdC5kZWZlcnJlZDtcbiAgICAgICAgdGhpcy5zLm9uY2UoJ3JlYWRhYmxlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWFkRGVmZXJyZWQocmVxdWVzdCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVxdWVzdC5kZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGRlZmVycmVkIHJlYWQgcmVxdWVzdFxuICAgICAqIEBwYXJhbSByZXF1ZXN0IERlZmVycmVkIHJlYWQgcmVxdWVzdFxuICAgICAqL1xuICAgIHJlYWREZWZlcnJlZChyZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IHJlYWRCdWZmZXIgPSB0aGlzLnMucmVhZChyZXF1ZXN0Lmxlbmd0aCk7XG4gICAgICAgIGlmIChyZWFkQnVmZmVyKSB7XG4gICAgICAgICAgICByZXF1ZXN0LmJ1ZmZlci5zZXQocmVhZEJ1ZmZlciwgcmVxdWVzdC5vZmZzZXQpO1xuICAgICAgICAgICAgcmVxdWVzdC5kZWZlcnJlZC5yZXNvbHZlKHJlYWRCdWZmZXIubGVuZ3RoKTtcbiAgICAgICAgICAgIHRoaXMuZGVmZXJyZWQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zLm9uY2UoJ3JlYWRhYmxlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucmVhZERlZmVycmVkKHJlcXVlc3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmVqZWN0KGVycikge1xuICAgICAgICB0aGlzLmVuZE9mU3RyZWFtID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMuZGVmZXJyZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgICAgICB0aGlzLmRlZmVycmVkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBhc3luYyBhYm9ydCgpIHtcbiAgICAgICAgdGhpcy5zLmRlc3Ryb3koKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBFbmRPZlN0cmVhbUVycm9yIH0gZnJvbSAncGVlay1yZWFkYWJsZSc7XG4vKipcbiAqIENvcmUgdG9rZW5pemVyXG4gKi9cbmV4cG9ydCBjbGFzcyBBYnN0cmFjdFRva2VuaXplciB7XG4gICAgY29uc3RydWN0b3IoZmlsZUluZm8pIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRva2VuaXplci1zdHJlYW0gcG9zaXRpb25cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucG9zaXRpb24gPSAwO1xuICAgICAgICB0aGlzLm51bUJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDgpO1xuICAgICAgICB0aGlzLmZpbGVJbmZvID0gZmlsZUluZm8gPyBmaWxlSW5mbyA6IHt9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWFkIGEgdG9rZW4gZnJvbSB0aGUgdG9rZW5pemVyLXN0cmVhbVxuICAgICAqIEBwYXJhbSB0b2tlbiAtIFRoZSB0b2tlbiB0byByZWFkXG4gICAgICogQHBhcmFtIHBvc2l0aW9uIC0gSWYgcHJvdmlkZWQsIHRoZSBkZXNpcmVkIHBvc2l0aW9uIGluIHRoZSB0b2tlbml6ZXItc3RyZWFtXG4gICAgICogQHJldHVybnMgUHJvbWlzZSB3aXRoIHRva2VuIGRhdGFcbiAgICAgKi9cbiAgICBhc3luYyByZWFkVG9rZW4odG9rZW4sIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbikge1xuICAgICAgICBjb25zdCB1aW50OEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkodG9rZW4ubGVuKTtcbiAgICAgICAgY29uc3QgbGVuID0gYXdhaXQgdGhpcy5yZWFkQnVmZmVyKHVpbnQ4QXJyYXksIHsgcG9zaXRpb24gfSk7XG4gICAgICAgIGlmIChsZW4gPCB0b2tlbi5sZW4pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRW5kT2ZTdHJlYW1FcnJvcigpO1xuICAgICAgICByZXR1cm4gdG9rZW4uZ2V0KHVpbnQ4QXJyYXksIDApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQZWVrIGEgdG9rZW4gZnJvbSB0aGUgdG9rZW5pemVyLXN0cmVhbS5cbiAgICAgKiBAcGFyYW0gdG9rZW4gLSBUb2tlbiB0byBwZWVrIGZyb20gdGhlIHRva2VuaXplci1zdHJlYW0uXG4gICAgICogQHBhcmFtIHBvc2l0aW9uIC0gT2Zmc2V0IHdoZXJlIHRvIGJlZ2luIHJlYWRpbmcgd2l0aGluIHRoZSBmaWxlLiBJZiBwb3NpdGlvbiBpcyBudWxsLCBkYXRhIHdpbGwgYmUgcmVhZCBmcm9tIHRoZSBjdXJyZW50IGZpbGUgcG9zaXRpb24uXG4gICAgICogQHJldHVybnMgUHJvbWlzZSB3aXRoIHRva2VuIGRhdGFcbiAgICAgKi9cbiAgICBhc3luYyBwZWVrVG9rZW4odG9rZW4sIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbikge1xuICAgICAgICBjb25zdCB1aW50OEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkodG9rZW4ubGVuKTtcbiAgICAgICAgY29uc3QgbGVuID0gYXdhaXQgdGhpcy5wZWVrQnVmZmVyKHVpbnQ4QXJyYXksIHsgcG9zaXRpb24gfSk7XG4gICAgICAgIGlmIChsZW4gPCB0b2tlbi5sZW4pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRW5kT2ZTdHJlYW1FcnJvcigpO1xuICAgICAgICByZXR1cm4gdG9rZW4uZ2V0KHVpbnQ4QXJyYXksIDApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWFkIGEgbnVtZXJpYyB0b2tlbiBmcm9tIHRoZSBzdHJlYW1cbiAgICAgKiBAcGFyYW0gdG9rZW4gLSBOdW1lcmljIHRva2VuXG4gICAgICogQHJldHVybnMgUHJvbWlzZSB3aXRoIG51bWJlclxuICAgICAqL1xuICAgIGFzeW5jIHJlYWROdW1iZXIodG9rZW4pIHtcbiAgICAgICAgY29uc3QgbGVuID0gYXdhaXQgdGhpcy5yZWFkQnVmZmVyKHRoaXMubnVtQnVmZmVyLCB7IGxlbmd0aDogdG9rZW4ubGVuIH0pO1xuICAgICAgICBpZiAobGVuIDwgdG9rZW4ubGVuKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVuZE9mU3RyZWFtRXJyb3IoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLmdldCh0aGlzLm51bUJ1ZmZlciwgMCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlYWQgYSBudW1lcmljIHRva2VuIGZyb20gdGhlIHN0cmVhbVxuICAgICAqIEBwYXJhbSB0b2tlbiAtIE51bWVyaWMgdG9rZW5cbiAgICAgKiBAcmV0dXJucyBQcm9taXNlIHdpdGggbnVtYmVyXG4gICAgICovXG4gICAgYXN5bmMgcGVla051bWJlcih0b2tlbikge1xuICAgICAgICBjb25zdCBsZW4gPSBhd2FpdCB0aGlzLnBlZWtCdWZmZXIodGhpcy5udW1CdWZmZXIsIHsgbGVuZ3RoOiB0b2tlbi5sZW4gfSk7XG4gICAgICAgIGlmIChsZW4gPCB0b2tlbi5sZW4pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRW5kT2ZTdHJlYW1FcnJvcigpO1xuICAgICAgICByZXR1cm4gdG9rZW4uZ2V0KHRoaXMubnVtQnVmZmVyLCAwKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSWdub3JlIG51bWJlciBvZiBieXRlcywgYWR2YW5jZXMgdGhlIHBvaW50ZXIgaW4gdW5kZXIgdG9rZW5pemVyLXN0cmVhbS5cbiAgICAgKiBAcGFyYW0gbGVuZ3RoIC0gTnVtYmVyIG9mIGJ5dGVzIHRvIGlnbm9yZVxuICAgICAqIEByZXR1cm4gcmVzb2x2ZXMgdGhlIG51bWJlciBvZiBieXRlcyBpZ25vcmVkLCBlcXVhbHMgbGVuZ3RoIGlmIHRoaXMgYXZhaWxhYmxlLCBvdGhlcndpc2UgdGhlIG51bWJlciBvZiBieXRlcyBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBhc3luYyBpZ25vcmUobGVuZ3RoKSB7XG4gICAgICAgIGlmICh0aGlzLmZpbGVJbmZvLnNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYnl0ZXNMZWZ0ID0gdGhpcy5maWxlSW5mby5zaXplIC0gdGhpcy5wb3NpdGlvbjtcbiAgICAgICAgICAgIGlmIChsZW5ndGggPiBieXRlc0xlZnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9uICs9IGJ5dGVzTGVmdDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYnl0ZXNMZWZ0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucG9zaXRpb24gKz0gbGVuZ3RoO1xuICAgICAgICByZXR1cm4gbGVuZ3RoO1xuICAgIH1cbiAgICBhc3luYyBjbG9zZSgpIHtcbiAgICAgICAgLy8gZW1wdHlcbiAgICB9XG4gICAgbm9ybWFsaXplT3B0aW9ucyh1aW50OEFycmF5LCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucG9zaXRpb24gIT09IHVuZGVmaW5lZCAmJiBvcHRpb25zLnBvc2l0aW9uIDwgdGhpcy5wb3NpdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgb3B0aW9ucy5wb3NpdGlvbmAgbXVzdCBiZSBlcXVhbCBvciBncmVhdGVyIHRoYW4gYHRva2VuaXplci5wb3NpdGlvbmAnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBtYXlCZUxlc3M6IG9wdGlvbnMubWF5QmVMZXNzID09PSB0cnVlLFxuICAgICAgICAgICAgICAgIG9mZnNldDogb3B0aW9ucy5vZmZzZXQgPyBvcHRpb25zLm9mZnNldCA6IDAsXG4gICAgICAgICAgICAgICAgbGVuZ3RoOiBvcHRpb25zLmxlbmd0aCA/IG9wdGlvbnMubGVuZ3RoIDogKHVpbnQ4QXJyYXkubGVuZ3RoIC0gKG9wdGlvbnMub2Zmc2V0ID8gb3B0aW9ucy5vZmZzZXQgOiAwKSksXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IG9wdGlvbnMucG9zaXRpb24gPyBvcHRpb25zLnBvc2l0aW9uIDogdGhpcy5wb3NpdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbWF5QmVMZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIG9mZnNldDogMCxcbiAgICAgICAgICAgIGxlbmd0aDogdWludDhBcnJheS5sZW5ndGgsXG4gICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5wb3NpdGlvblxuICAgICAgICB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEFic3RyYWN0VG9rZW5pemVyIH0gZnJvbSAnLi9BYnN0cmFjdFRva2VuaXplci5qcyc7XG5pbXBvcnQgeyBFbmRPZlN0cmVhbUVycm9yIH0gZnJvbSAncGVlay1yZWFkYWJsZSc7XG5jb25zdCBtYXhCdWZmZXJTaXplID0gMjU2MDAwO1xuZXhwb3J0IGNsYXNzIFJlYWRTdHJlYW1Ub2tlbml6ZXIgZXh0ZW5kcyBBYnN0cmFjdFRva2VuaXplciB7XG4gICAgY29uc3RydWN0b3Ioc3RyZWFtUmVhZGVyLCBmaWxlSW5mbykge1xuICAgICAgICBzdXBlcihmaWxlSW5mbyk7XG4gICAgICAgIHRoaXMuc3RyZWFtUmVhZGVyID0gc3RyZWFtUmVhZGVyO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsZSBpbmZvcm1hdGlvbiwgYW4gSFRUUC1jbGllbnQgbWF5IGltcGxlbWVudCB0aGlzIGRvaW5nIGEgSEVBRCByZXF1ZXN0XG4gICAgICogQHJldHVybiBQcm9taXNlIHdpdGggZmlsZSBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGFzeW5jIGdldEZpbGVJbmZvKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5maWxlSW5mbztcbiAgICB9XG4gICAgLyoqXG4gICAgICogUmVhZCBidWZmZXIgZnJvbSB0b2tlbml6ZXJcbiAgICAgKiBAcGFyYW0gdWludDhBcnJheSAtIFRhcmdldCBVaW50OEFycmF5IHRvIGZpbGwgd2l0aCBkYXRhIHJlYWQgZnJvbSB0aGUgdG9rZW5pemVyLXN0cmVhbVxuICAgICAqIEBwYXJhbSBvcHRpb25zIC0gUmVhZCBiZWhhdmlvdXIgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIFByb21pc2Ugd2l0aCBudW1iZXIgb2YgYnl0ZXMgcmVhZFxuICAgICAqL1xuICAgIGFzeW5jIHJlYWRCdWZmZXIodWludDhBcnJheSwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBub3JtT3B0aW9ucyA9IHRoaXMubm9ybWFsaXplT3B0aW9ucyh1aW50OEFycmF5LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3Qgc2tpcEJ5dGVzID0gbm9ybU9wdGlvbnMucG9zaXRpb24gLSB0aGlzLnBvc2l0aW9uO1xuICAgICAgICBpZiAoc2tpcEJ5dGVzID4gMCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pZ25vcmUoc2tpcEJ5dGVzKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRCdWZmZXIodWludDhBcnJheSwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2tpcEJ5dGVzIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgb3B0aW9ucy5wb3NpdGlvbmAgbXVzdCBiZSBlcXVhbCBvciBncmVhdGVyIHRoYW4gYHRva2VuaXplci5wb3NpdGlvbmAnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9ybU9wdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBieXRlc1JlYWQgPSBhd2FpdCB0aGlzLnN0cmVhbVJlYWRlci5yZWFkKHVpbnQ4QXJyYXksIG5vcm1PcHRpb25zLm9mZnNldCwgbm9ybU9wdGlvbnMubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiArPSBieXRlc1JlYWQ7XG4gICAgICAgIGlmICgoIW9wdGlvbnMgfHwgIW9wdGlvbnMubWF5QmVMZXNzKSAmJiBieXRlc1JlYWQgPCBub3JtT3B0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFbmRPZlN0cmVhbUVycm9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ5dGVzUmVhZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogUGVlayAocmVhZCBhaGVhZCkgYnVmZmVyIGZyb20gdG9rZW5pemVyXG4gICAgICogQHBhcmFtIHVpbnQ4QXJyYXkgLSBVaW50OEFycmF5IChvciBCdWZmZXIpIHRvIHdyaXRlIGRhdGEgdG9cbiAgICAgKiBAcGFyYW0gb3B0aW9ucyAtIFJlYWQgYmVoYXZpb3VyIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyBQcm9taXNlIHdpdGggbnVtYmVyIG9mIGJ5dGVzIHBlZWtlZFxuICAgICAqL1xuICAgIGFzeW5jIHBlZWtCdWZmZXIodWludDhBcnJheSwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBub3JtT3B0aW9ucyA9IHRoaXMubm9ybWFsaXplT3B0aW9ucyh1aW50OEFycmF5LCBvcHRpb25zKTtcbiAgICAgICAgbGV0IGJ5dGVzUmVhZCA9IDA7XG4gICAgICAgIGlmIChub3JtT3B0aW9ucy5wb3NpdGlvbikge1xuICAgICAgICAgICAgY29uc3Qgc2tpcEJ5dGVzID0gbm9ybU9wdGlvbnMucG9zaXRpb24gLSB0aGlzLnBvc2l0aW9uO1xuICAgICAgICAgICAgaWYgKHNraXBCeXRlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBza2lwQnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobm9ybU9wdGlvbnMubGVuZ3RoICsgc2tpcEJ5dGVzKTtcbiAgICAgICAgICAgICAgICBieXRlc1JlYWQgPSBhd2FpdCB0aGlzLnBlZWtCdWZmZXIoc2tpcEJ1ZmZlciwgeyBtYXlCZUxlc3M6IG5vcm1PcHRpb25zLm1heUJlTGVzcyB9KTtcbiAgICAgICAgICAgICAgICB1aW50OEFycmF5LnNldChza2lwQnVmZmVyLnN1YmFycmF5KHNraXBCeXRlcyksIG5vcm1PcHRpb25zLm9mZnNldCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ5dGVzUmVhZCAtIHNraXBCeXRlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHNraXBCeXRlcyA8IDApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBwZWVrIGZyb20gYSBuZWdhdGl2ZSBvZmZzZXQgaW4gYSBzdHJlYW0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobm9ybU9wdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBieXRlc1JlYWQgPSBhd2FpdCB0aGlzLnN0cmVhbVJlYWRlci5wZWVrKHVpbnQ4QXJyYXksIG5vcm1PcHRpb25zLm9mZnNldCwgbm9ybU9wdGlvbnMubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1heUJlTGVzcyAmJiBlcnIgaW5zdGFuY2VvZiBFbmRPZlN0cmVhbUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKCFub3JtT3B0aW9ucy5tYXlCZUxlc3MpICYmIGJ5dGVzUmVhZCA8IG5vcm1PcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFbmRPZlN0cmVhbUVycm9yKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJ5dGVzUmVhZDtcbiAgICB9XG4gICAgYXN5bmMgaWdub3JlKGxlbmd0aCkge1xuICAgICAgICAvLyBkZWJ1ZyhgaWdub3JlICR7dGhpcy5wb3NpdGlvbn0uLi4ke3RoaXMucG9zaXRpb24gKyBsZW5ndGggLSAxfWApO1xuICAgICAgICBjb25zdCBidWZTaXplID0gTWF0aC5taW4obWF4QnVmZmVyU2l6ZSwgbGVuZ3RoKTtcbiAgICAgICAgY29uc3QgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYnVmU2l6ZSk7XG4gICAgICAgIGxldCB0b3RCeXRlc1JlYWQgPSAwO1xuICAgICAgICB3aGlsZSAodG90Qnl0ZXNSZWFkIDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCByZW1haW5pbmcgPSBsZW5ndGggLSB0b3RCeXRlc1JlYWQ7XG4gICAgICAgICAgICBjb25zdCBieXRlc1JlYWQgPSBhd2FpdCB0aGlzLnJlYWRCdWZmZXIoYnVmLCB7IGxlbmd0aDogTWF0aC5taW4oYnVmU2l6ZSwgcmVtYWluaW5nKSB9KTtcbiAgICAgICAgICAgIGlmIChieXRlc1JlYWQgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ5dGVzUmVhZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRvdEJ5dGVzUmVhZCArPSBieXRlc1JlYWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvdEJ5dGVzUmVhZDtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBFbmRPZlN0cmVhbUVycm9yIH0gZnJvbSAncGVlay1yZWFkYWJsZSc7XG5pbXBvcnQgeyBBYnN0cmFjdFRva2VuaXplciB9IGZyb20gJy4vQWJzdHJhY3RUb2tlbml6ZXIuanMnO1xuZXhwb3J0IGNsYXNzIEJ1ZmZlclRva2VuaXplciBleHRlbmRzIEFic3RyYWN0VG9rZW5pemVyIHtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3QgQnVmZmVyVG9rZW5pemVyXG4gICAgICogQHBhcmFtIHVpbnQ4QXJyYXkgLSBVaW50OEFycmF5IHRvIHRva2VuaXplXG4gICAgICogQHBhcmFtIGZpbGVJbmZvIC0gUGFzcyBhZGRpdGlvbmFsIGZpbGUgaW5mb3JtYXRpb24gdG8gdGhlIHRva2VuaXplclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHVpbnQ4QXJyYXksIGZpbGVJbmZvKSB7XG4gICAgICAgIHN1cGVyKGZpbGVJbmZvKTtcbiAgICAgICAgdGhpcy51aW50OEFycmF5ID0gdWludDhBcnJheTtcbiAgICAgICAgdGhpcy5maWxlSW5mby5zaXplID0gdGhpcy5maWxlSW5mby5zaXplID8gdGhpcy5maWxlSW5mby5zaXplIDogdWludDhBcnJheS5sZW5ndGg7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlYWQgYnVmZmVyIGZyb20gdG9rZW5pemVyXG4gICAgICogQHBhcmFtIHVpbnQ4QXJyYXkgLSBVaW50OEFycmF5IHRvIHRva2VuaXplXG4gICAgICogQHBhcmFtIG9wdGlvbnMgLSBSZWFkIGJlaGF2aW91ciBvcHRpb25zXG4gICAgICogQHJldHVybnMge1Byb21pc2U8bnVtYmVyPn1cbiAgICAgKi9cbiAgICBhc3luYyByZWFkQnVmZmVyKHVpbnQ4QXJyYXksIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5wb3NpdGlvbikge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMucG9zaXRpb24gPCB0aGlzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdgb3B0aW9ucy5wb3NpdGlvbmAgbXVzdCBiZSBlcXVhbCBvciBncmVhdGVyIHRoYW4gYHRva2VuaXplci5wb3NpdGlvbmAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBvcHRpb25zLnBvc2l0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJ5dGVzUmVhZCA9IGF3YWl0IHRoaXMucGVla0J1ZmZlcih1aW50OEFycmF5LCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5wb3NpdGlvbiArPSBieXRlc1JlYWQ7XG4gICAgICAgIHJldHVybiBieXRlc1JlYWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBlZWsgKHJlYWQgYWhlYWQpIGJ1ZmZlciBmcm9tIHRva2VuaXplclxuICAgICAqIEBwYXJhbSB1aW50OEFycmF5XG4gICAgICogQHBhcmFtIG9wdGlvbnMgLSBSZWFkIGJlaGF2aW91ciBvcHRpb25zXG4gICAgICogQHJldHVybnMge1Byb21pc2U8bnVtYmVyPn1cbiAgICAgKi9cbiAgICBhc3luYyBwZWVrQnVmZmVyKHVpbnQ4QXJyYXksIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3Qgbm9ybU9wdGlvbnMgPSB0aGlzLm5vcm1hbGl6ZU9wdGlvbnModWludDhBcnJheSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGJ5dGVzMnJlYWQgPSBNYXRoLm1pbih0aGlzLnVpbnQ4QXJyYXkubGVuZ3RoIC0gbm9ybU9wdGlvbnMucG9zaXRpb24sIG5vcm1PcHRpb25zLmxlbmd0aCk7XG4gICAgICAgIGlmICgoIW5vcm1PcHRpb25zLm1heUJlTGVzcykgJiYgYnl0ZXMycmVhZCA8IG5vcm1PcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVuZE9mU3RyZWFtRXJyb3IoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVpbnQ4QXJyYXkuc2V0KHRoaXMudWludDhBcnJheS5zdWJhcnJheShub3JtT3B0aW9ucy5wb3NpdGlvbiwgbm9ybU9wdGlvbnMucG9zaXRpb24gKyBieXRlczJyZWFkKSwgbm9ybU9wdGlvbnMub2Zmc2V0KTtcbiAgICAgICAgICAgIHJldHVybiBieXRlczJyZWFkO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFzeW5jIGNsb3NlKCkge1xuICAgICAgICAvLyBlbXB0eVxuICAgIH1cbn1cbiIsImltcG9ydCB7IFJlYWRTdHJlYW1Ub2tlbml6ZXIgfSBmcm9tICcuL1JlYWRTdHJlYW1Ub2tlbml6ZXIuanMnO1xuaW1wb3J0IHsgQnVmZmVyVG9rZW5pemVyIH0gZnJvbSAnLi9CdWZmZXJUb2tlbml6ZXIuanMnO1xuaW1wb3J0IHsgU3RyZWFtUmVhZGVyLCBXZWJTdHJlYW1SZWFkZXIgfSBmcm9tICdwZWVrLXJlYWRhYmxlJztcbmV4cG9ydCB7IEVuZE9mU3RyZWFtRXJyb3IgfSBmcm9tICdwZWVrLXJlYWRhYmxlJztcbi8qKlxuICogQ29uc3RydWN0IFJlYWRTdHJlYW1Ub2tlbml6ZXIgZnJvbSBnaXZlbiBTdHJlYW0uXG4gKiBXaWxsIHNldCBmaWxlU2l6ZSwgaWYgcHJvdmlkZWQgZ2l2ZW4gU3RyZWFtIGhhcyBzZXQgdGhlIC5wYXRoIHByb3BlcnR5L1xuICogQHBhcmFtIHN0cmVhbSAtIFJlYWQgZnJvbSBOb2RlLmpzIFN0cmVhbS5SZWFkYWJsZVxuICogQHBhcmFtIGZpbGVJbmZvIC0gUGFzcyB0aGUgZmlsZSBpbmZvcm1hdGlvbiwgbGlrZSBzaXplIGFuZCBNSU1FLXR5cGUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgc3RyZWFtLlxuICogQHJldHVybnMgUmVhZFN0cmVhbVRva2VuaXplclxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVN0cmVhbShzdHJlYW0sIGZpbGVJbmZvKSB7XG4gICAgZmlsZUluZm8gPSBmaWxlSW5mbyA/IGZpbGVJbmZvIDoge307XG4gICAgcmV0dXJuIG5ldyBSZWFkU3RyZWFtVG9rZW5pemVyKG5ldyBTdHJlYW1SZWFkZXIoc3RyZWFtKSwgZmlsZUluZm8pO1xufVxuLyoqXG4gKiBDb25zdHJ1Y3QgUmVhZFN0cmVhbVRva2VuaXplciBmcm9tIGdpdmVuIFJlYWRhYmxlU3RyZWFtIChXZWJTdHJlYW0gQVBJKS5cbiAqIFdpbGwgc2V0IGZpbGVTaXplLCBpZiBwcm92aWRlZCBnaXZlbiBTdHJlYW0gaGFzIHNldCB0aGUgLnBhdGggcHJvcGVydHkvXG4gKiBAcGFyYW0gd2ViU3RyZWFtIC0gUmVhZCBmcm9tIE5vZGUuanMgU3RyZWFtLlJlYWRhYmxlXG4gKiBAcGFyYW0gZmlsZUluZm8gLSBQYXNzIHRoZSBmaWxlIGluZm9ybWF0aW9uLCBsaWtlIHNpemUgYW5kIE1JTUUtdHlwZSBvZiB0aGUgY29ycmVzcG9uZGluZyBzdHJlYW0uXG4gKiBAcmV0dXJucyBSZWFkU3RyZWFtVG9rZW5pemVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tV2ViU3RyZWFtKHdlYlN0cmVhbSwgZmlsZUluZm8pIHtcbiAgICBmaWxlSW5mbyA9IGZpbGVJbmZvID8gZmlsZUluZm8gOiB7fTtcbiAgICByZXR1cm4gbmV3IFJlYWRTdHJlYW1Ub2tlbml6ZXIobmV3IFdlYlN0cmVhbVJlYWRlcih3ZWJTdHJlYW0pLCBmaWxlSW5mbyk7XG59XG4vKipcbiAqIENvbnN0cnVjdCBSZWFkU3RyZWFtVG9rZW5pemVyIGZyb20gZ2l2ZW4gQnVmZmVyLlxuICogQHBhcmFtIHVpbnQ4QXJyYXkgLSBVaW50OEFycmF5IHRvIHRva2VuaXplXG4gKiBAcGFyYW0gZmlsZUluZm8gLSBQYXNzIGFkZGl0aW9uYWwgZmlsZSBpbmZvcm1hdGlvbiB0byB0aGUgdG9rZW5pemVyXG4gKiBAcmV0dXJucyBCdWZmZXJUb2tlbml6ZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21CdWZmZXIodWludDhBcnJheSwgZmlsZUluZm8pIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlclRva2VuaXplcih1aW50OEFycmF5LCBmaWxlSW5mbyk7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gc3RyaW5nVG9CeXRlcyhzdHJpbmcpIHtcblx0cmV0dXJuIFsuLi5zdHJpbmddLm1hcChjaGFyYWN0ZXIgPT4gY2hhcmFjdGVyLmNoYXJDb2RlQXQoMCkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIHVuaWNvcm4vcHJlZmVyLWNvZGUtcG9pbnRcbn1cblxuLyoqXG5DaGVja3Mgd2hldGhlciB0aGUgVEFSIGNoZWNrc3VtIGlzIHZhbGlkLlxuXG5AcGFyYW0ge0J1ZmZlcn0gYnVmZmVyIC0gVGhlIFRBUiBoZWFkZXIgYFtvZmZzZXQgLi4uIG9mZnNldCArIDUxMl1gLlxuQHBhcmFtIHtudW1iZXJ9IG9mZnNldCAtIFRBUiBoZWFkZXIgb2Zmc2V0LlxuQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgVEFSIGNoZWNrc3VtIGlzIHZhbGlkLCBvdGhlcndpc2UgYGZhbHNlYC5cbiovXG5leHBvcnQgZnVuY3Rpb24gdGFySGVhZGVyQ2hlY2tzdW1NYXRjaGVzKGJ1ZmZlciwgb2Zmc2V0ID0gMCkge1xuXHRjb25zdCByZWFkU3VtID0gTnVtYmVyLnBhcnNlSW50KGJ1ZmZlci50b1N0cmluZygndXRmOCcsIDE0OCwgMTU0KS5yZXBsYWNlKC9cXDAuKiQvLCAnJykudHJpbSgpLCA4KTsgLy8gUmVhZCBzdW0gaW4gaGVhZGVyXG5cdGlmIChOdW1iZXIuaXNOYU4ocmVhZFN1bSkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRsZXQgc3VtID0gOCAqIDB4MjA7IC8vIEluaXRpYWxpemUgc2lnbmVkIGJpdCBzdW1cblxuXHRmb3IgKGxldCBpbmRleCA9IG9mZnNldDsgaW5kZXggPCBvZmZzZXQgKyAxNDg7IGluZGV4KyspIHtcblx0XHRzdW0gKz0gYnVmZmVyW2luZGV4XTtcblx0fVxuXG5cdGZvciAobGV0IGluZGV4ID0gb2Zmc2V0ICsgMTU2OyBpbmRleCA8IG9mZnNldCArIDUxMjsgaW5kZXgrKykge1xuXHRcdHN1bSArPSBidWZmZXJbaW5kZXhdO1xuXHR9XG5cblx0cmV0dXJuIHJlYWRTdW0gPT09IHN1bTtcbn1cblxuLyoqXG5JRDMgVUlOVDMyIHN5bmMtc2FmZSB0b2tlbml6ZXIgdG9rZW4uXG4yOCBiaXRzIChyZXByZXNlbnRpbmcgdXAgdG8gMjU2TUIpIGludGVnZXIsIHRoZSBtc2IgaXMgMCB0byBhdm9pZCBcImZhbHNlIHN5bmNzaWduYWxzXCIuXG4qL1xuZXhwb3J0IGNvbnN0IHVpbnQzMlN5bmNTYWZlVG9rZW4gPSB7XG5cdGdldDogKGJ1ZmZlciwgb2Zmc2V0KSA9PiAoYnVmZmVyW29mZnNldCArIDNdICYgMHg3RikgfCAoKGJ1ZmZlcltvZmZzZXQgKyAyXSkgPDwgNykgfCAoKGJ1ZmZlcltvZmZzZXQgKyAxXSkgPDwgMTQpIHwgKChidWZmZXJbb2Zmc2V0XSkgPDwgMjEpLFxuXHRsZW46IDQsXG59O1xuIiwiZXhwb3J0IGNvbnN0IGV4dGVuc2lvbnMgPSBbXG5cdCdqcGcnLFxuXHQncG5nJyxcblx0J2FwbmcnLFxuXHQnZ2lmJyxcblx0J3dlYnAnLFxuXHQnZmxpZicsXG5cdCd4Y2YnLFxuXHQnY3IyJyxcblx0J2NyMycsXG5cdCdvcmYnLFxuXHQnYXJ3Jyxcblx0J2RuZycsXG5cdCduZWYnLFxuXHQncncyJyxcblx0J3JhZicsXG5cdCd0aWYnLFxuXHQnYm1wJyxcblx0J2ljbnMnLFxuXHQnanhyJyxcblx0J3BzZCcsXG5cdCdpbmRkJyxcblx0J3ppcCcsXG5cdCd0YXInLFxuXHQncmFyJyxcblx0J2d6Jyxcblx0J2J6MicsXG5cdCc3eicsXG5cdCdkbWcnLFxuXHQnbXA0Jyxcblx0J21pZCcsXG5cdCdta3YnLFxuXHQnd2VibScsXG5cdCdtb3YnLFxuXHQnYXZpJyxcblx0J21wZycsXG5cdCdtcDInLFxuXHQnbXAzJyxcblx0J200YScsXG5cdCdvZ2EnLFxuXHQnb2dnJyxcblx0J29ndicsXG5cdCdvcHVzJyxcblx0J2ZsYWMnLFxuXHQnd2F2Jyxcblx0J3NweCcsXG5cdCdhbXInLFxuXHQncGRmJyxcblx0J2VwdWInLFxuXHQnZWxmJyxcblx0J21hY2hvJyxcblx0J2V4ZScsXG5cdCdzd2YnLFxuXHQncnRmJyxcblx0J3dhc20nLFxuXHQnd29mZicsXG5cdCd3b2ZmMicsXG5cdCdlb3QnLFxuXHQndHRmJyxcblx0J290ZicsXG5cdCdpY28nLFxuXHQnZmx2Jyxcblx0J3BzJyxcblx0J3h6Jyxcblx0J3NxbGl0ZScsXG5cdCduZXMnLFxuXHQnY3J4Jyxcblx0J3hwaScsXG5cdCdjYWInLFxuXHQnZGViJyxcblx0J2FyJyxcblx0J3JwbScsXG5cdCdaJyxcblx0J2x6Jyxcblx0J2NmYicsXG5cdCdteGYnLFxuXHQnbXRzJyxcblx0J2JsZW5kJyxcblx0J2JwZycsXG5cdCdkb2N4Jyxcblx0J3BwdHgnLFxuXHQneGxzeCcsXG5cdCczZ3AnLFxuXHQnM2cyJyxcblx0J2oyYycsXG5cdCdqcDInLFxuXHQnanBtJyxcblx0J2pweCcsXG5cdCdtajInLFxuXHQnYWlmJyxcblx0J3FjcCcsXG5cdCdvZHQnLFxuXHQnb2RzJyxcblx0J29kcCcsXG5cdCd4bWwnLFxuXHQnbW9iaScsXG5cdCdoZWljJyxcblx0J2N1cicsXG5cdCdrdHgnLFxuXHQnYXBlJyxcblx0J3d2Jyxcblx0J2RjbScsXG5cdCdpY3MnLFxuXHQnZ2xiJyxcblx0J3BjYXAnLFxuXHQnZHNmJyxcblx0J2xuaycsXG5cdCdhbGlhcycsXG5cdCd2b2MnLFxuXHQnYWMzJyxcblx0J200dicsXG5cdCdtNHAnLFxuXHQnbTRiJyxcblx0J2Y0dicsXG5cdCdmNHAnLFxuXHQnZjRiJyxcblx0J2Y0YScsXG5cdCdtaWUnLFxuXHQnYXNmJyxcblx0J29nbScsXG5cdCdvZ3gnLFxuXHQnbXBjJyxcblx0J2Fycm93Jyxcblx0J3NocCcsXG5cdCdhYWMnLFxuXHQnbXAxJyxcblx0J2l0Jyxcblx0J3MzbScsXG5cdCd4bScsXG5cdCdhaScsXG5cdCdza3AnLFxuXHQnYXZpZicsXG5cdCdlcHMnLFxuXHQnbHpoJyxcblx0J3BncCcsXG5cdCdhc2FyJyxcblx0J3N0bCcsXG5cdCdjaG0nLFxuXHQnM21mJyxcblx0J3pzdCcsXG5cdCdqeGwnLFxuXHQndmNmJyxcblx0J2pscycsXG5cdCdwc3QnLFxuXHQnZHdnJyxcblx0J3BhcnF1ZXQnLFxuXHQnY2xhc3MnLFxuXHQnYXJqJyxcblx0J2NwaW8nLFxuXHQnYWNlJyxcblx0J2F2cm8nLFxuXHQnaWNjJyxcblx0J2ZieCcsXG5dO1xuXG5leHBvcnQgY29uc3QgbWltZVR5cGVzID0gW1xuXHQnaW1hZ2UvanBlZycsXG5cdCdpbWFnZS9wbmcnLFxuXHQnaW1hZ2UvZ2lmJyxcblx0J2ltYWdlL3dlYnAnLFxuXHQnaW1hZ2UvZmxpZicsXG5cdCdpbWFnZS94LXhjZicsXG5cdCdpbWFnZS94LWNhbm9uLWNyMicsXG5cdCdpbWFnZS94LWNhbm9uLWNyMycsXG5cdCdpbWFnZS90aWZmJyxcblx0J2ltYWdlL2JtcCcsXG5cdCdpbWFnZS92bmQubXMtcGhvdG8nLFxuXHQnaW1hZ2Uvdm5kLmFkb2JlLnBob3Rvc2hvcCcsXG5cdCdhcHBsaWNhdGlvbi94LWluZGVzaWduJyxcblx0J2FwcGxpY2F0aW9uL2VwdWIremlwJyxcblx0J2FwcGxpY2F0aW9uL3gteHBpbnN0YWxsJyxcblx0J2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQudGV4dCcsXG5cdCdhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnNwcmVhZHNoZWV0Jyxcblx0J2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQucHJlc2VudGF0aW9uJyxcblx0J2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmRvY3VtZW50Jyxcblx0J2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5wcmVzZW50YXRpb24nLFxuXHQnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQnLFxuXHQnYXBwbGljYXRpb24vemlwJyxcblx0J2FwcGxpY2F0aW9uL3gtdGFyJyxcblx0J2FwcGxpY2F0aW9uL3gtcmFyLWNvbXByZXNzZWQnLFxuXHQnYXBwbGljYXRpb24vZ3ppcCcsXG5cdCdhcHBsaWNhdGlvbi94LWJ6aXAyJyxcblx0J2FwcGxpY2F0aW9uL3gtN3otY29tcHJlc3NlZCcsXG5cdCdhcHBsaWNhdGlvbi94LWFwcGxlLWRpc2tpbWFnZScsXG5cdCdhcHBsaWNhdGlvbi94LWFwYWNoZS1hcnJvdycsXG5cdCd2aWRlby9tcDQnLFxuXHQnYXVkaW8vbWlkaScsXG5cdCd2aWRlby94LW1hdHJvc2thJyxcblx0J3ZpZGVvL3dlYm0nLFxuXHQndmlkZW8vcXVpY2t0aW1lJyxcblx0J3ZpZGVvL3ZuZC5hdmknLFxuXHQnYXVkaW8vdm5kLndhdmUnLFxuXHQnYXVkaW8vcWNlbHAnLFxuXHQnYXVkaW8veC1tcy1hc2YnLFxuXHQndmlkZW8veC1tcy1hc2YnLFxuXHQnYXBwbGljYXRpb24vdm5kLm1zLWFzZicsXG5cdCd2aWRlby9tcGVnJyxcblx0J3ZpZGVvLzNncHAnLFxuXHQnYXVkaW8vbXBlZycsXG5cdCdhdWRpby9tcDQnLCAvLyBSRkMgNDMzN1xuXHQnYXVkaW8vb3B1cycsXG5cdCd2aWRlby9vZ2cnLFxuXHQnYXVkaW8vb2dnJyxcblx0J2FwcGxpY2F0aW9uL29nZycsXG5cdCdhdWRpby94LWZsYWMnLFxuXHQnYXVkaW8vYXBlJyxcblx0J2F1ZGlvL3dhdnBhY2snLFxuXHQnYXVkaW8vYW1yJyxcblx0J2FwcGxpY2F0aW9uL3BkZicsXG5cdCdhcHBsaWNhdGlvbi94LWVsZicsXG5cdCdhcHBsaWNhdGlvbi94LW1hY2gtYmluYXJ5Jyxcblx0J2FwcGxpY2F0aW9uL3gtbXNkb3dubG9hZCcsXG5cdCdhcHBsaWNhdGlvbi94LXNob2Nrd2F2ZS1mbGFzaCcsXG5cdCdhcHBsaWNhdGlvbi9ydGYnLFxuXHQnYXBwbGljYXRpb24vd2FzbScsXG5cdCdmb250L3dvZmYnLFxuXHQnZm9udC93b2ZmMicsXG5cdCdhcHBsaWNhdGlvbi92bmQubXMtZm9udG9iamVjdCcsXG5cdCdmb250L3R0ZicsXG5cdCdmb250L290ZicsXG5cdCdpbWFnZS94LWljb24nLFxuXHQndmlkZW8veC1mbHYnLFxuXHQnYXBwbGljYXRpb24vcG9zdHNjcmlwdCcsXG5cdCdhcHBsaWNhdGlvbi9lcHMnLFxuXHQnYXBwbGljYXRpb24veC14eicsXG5cdCdhcHBsaWNhdGlvbi94LXNxbGl0ZTMnLFxuXHQnYXBwbGljYXRpb24veC1uaW50ZW5kby1uZXMtcm9tJyxcblx0J2FwcGxpY2F0aW9uL3gtZ29vZ2xlLWNocm9tZS1leHRlbnNpb24nLFxuXHQnYXBwbGljYXRpb24vdm5kLm1zLWNhYi1jb21wcmVzc2VkJyxcblx0J2FwcGxpY2F0aW9uL3gtZGViJyxcblx0J2FwcGxpY2F0aW9uL3gtdW5peC1hcmNoaXZlJyxcblx0J2FwcGxpY2F0aW9uL3gtcnBtJyxcblx0J2FwcGxpY2F0aW9uL3gtY29tcHJlc3MnLFxuXHQnYXBwbGljYXRpb24veC1semlwJyxcblx0J2FwcGxpY2F0aW9uL3gtY2ZiJyxcblx0J2FwcGxpY2F0aW9uL3gtbWllJyxcblx0J2FwcGxpY2F0aW9uL214ZicsXG5cdCd2aWRlby9tcDJ0Jyxcblx0J2FwcGxpY2F0aW9uL3gtYmxlbmRlcicsXG5cdCdpbWFnZS9icGcnLFxuXHQnaW1hZ2UvajJjJyxcblx0J2ltYWdlL2pwMicsXG5cdCdpbWFnZS9qcHgnLFxuXHQnaW1hZ2UvanBtJyxcblx0J2ltYWdlL21qMicsXG5cdCdhdWRpby9haWZmJyxcblx0J2FwcGxpY2F0aW9uL3htbCcsXG5cdCdhcHBsaWNhdGlvbi94LW1vYmlwb2NrZXQtZWJvb2snLFxuXHQnaW1hZ2UvaGVpZicsXG5cdCdpbWFnZS9oZWlmLXNlcXVlbmNlJyxcblx0J2ltYWdlL2hlaWMnLFxuXHQnaW1hZ2UvaGVpYy1zZXF1ZW5jZScsXG5cdCdpbWFnZS9pY25zJyxcblx0J2ltYWdlL2t0eCcsXG5cdCdhcHBsaWNhdGlvbi9kaWNvbScsXG5cdCdhdWRpby94LW11c2VwYWNrJyxcblx0J3RleHQvY2FsZW5kYXInLFxuXHQndGV4dC92Y2FyZCcsXG5cdCdtb2RlbC9nbHRmLWJpbmFyeScsXG5cdCdhcHBsaWNhdGlvbi92bmQudGNwZHVtcC5wY2FwJyxcblx0J2F1ZGlvL3gtZHNmJywgLy8gTm9uLXN0YW5kYXJkXG5cdCdhcHBsaWNhdGlvbi94Lm1zLnNob3J0Y3V0JywgLy8gSW52ZW50ZWQgYnkgdXNcblx0J2FwcGxpY2F0aW9uL3guYXBwbGUuYWxpYXMnLCAvLyBJbnZlbnRlZCBieSB1c1xuXHQnYXVkaW8veC12b2MnLFxuXHQnYXVkaW8vdm5kLmRvbGJ5LmRkLXJhdycsXG5cdCdhdWRpby94LW00YScsXG5cdCdpbWFnZS9hcG5nJyxcblx0J2ltYWdlL3gtb2x5bXB1cy1vcmYnLFxuXHQnaW1hZ2UveC1zb255LWFydycsXG5cdCdpbWFnZS94LWFkb2JlLWRuZycsXG5cdCdpbWFnZS94LW5pa29uLW5lZicsXG5cdCdpbWFnZS94LXBhbmFzb25pYy1ydzInLFxuXHQnaW1hZ2UveC1mdWppZmlsbS1yYWYnLFxuXHQndmlkZW8veC1tNHYnLFxuXHQndmlkZW8vM2dwcDInLFxuXHQnYXBwbGljYXRpb24veC1lc3JpLXNoYXBlJyxcblx0J2F1ZGlvL2FhYycsXG5cdCdhdWRpby94LWl0Jyxcblx0J2F1ZGlvL3gtczNtJyxcblx0J2F1ZGlvL3gteG0nLFxuXHQndmlkZW8vTVAxUycsXG5cdCd2aWRlby9NUDJQJyxcblx0J2FwcGxpY2F0aW9uL3ZuZC5za2V0Y2h1cC5za3AnLFxuXHQnaW1hZ2UvYXZpZicsXG5cdCdhcHBsaWNhdGlvbi94LWx6aC1jb21wcmVzc2VkJyxcblx0J2FwcGxpY2F0aW9uL3BncC1lbmNyeXB0ZWQnLFxuXHQnYXBwbGljYXRpb24veC1hc2FyJyxcblx0J21vZGVsL3N0bCcsXG5cdCdhcHBsaWNhdGlvbi92bmQubXMtaHRtbGhlbHAnLFxuXHQnbW9kZWwvM21mJyxcblx0J2ltYWdlL2p4bCcsXG5cdCdhcHBsaWNhdGlvbi96c3RkJyxcblx0J2ltYWdlL2pscycsXG5cdCdhcHBsaWNhdGlvbi92bmQubXMtb3V0bG9vaycsXG5cdCdpbWFnZS92bmQuZHdnJyxcblx0J2FwcGxpY2F0aW9uL3gtcGFycXVldCcsXG5cdCdhcHBsaWNhdGlvbi9qYXZhLXZtJyxcblx0J2FwcGxpY2F0aW9uL3gtYXJqJyxcblx0J2FwcGxpY2F0aW9uL3gtY3BpbycsXG5cdCdhcHBsaWNhdGlvbi94LWFjZS1jb21wcmVzc2VkJyxcblx0J2FwcGxpY2F0aW9uL2F2cm8nLFxuXHQnYXBwbGljYXRpb24vdm5kLmljY3Byb2ZpbGUnLFxuXHQnYXBwbGljYXRpb24veC5hdXRvZGVzay5mYngnLCAvLyBJbnZlbnRlZCBieSB1c1xuXTtcbiIsImltcG9ydCB7QnVmZmVyfSBmcm9tICdub2RlOmJ1ZmZlcic7XG5pbXBvcnQgKiBhcyBUb2tlbiBmcm9tICd0b2tlbi10eXBlcyc7XG5pbXBvcnQgKiBhcyBzdHJ0b2szIGZyb20gJ3N0cnRvazMvY29yZSc7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbi9maWxlLWV4dGVuc2lvbi1pbi1pbXBvcnRcbmltcG9ydCB7XG5cdHN0cmluZ1RvQnl0ZXMsXG5cdHRhckhlYWRlckNoZWNrc3VtTWF0Y2hlcyxcblx0dWludDMyU3luY1NhZmVUb2tlbixcbn0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7ZXh0ZW5zaW9ucywgbWltZVR5cGVzfSBmcm9tICcuL3N1cHBvcnRlZC5qcyc7XG5cbmNvbnN0IG1pbmltdW1CeXRlcyA9IDQxMDA7IC8vIEEgZmFpciBhbW91bnQgb2YgZmlsZS10eXBlcyBhcmUgZGV0ZWN0YWJsZSB3aXRoaW4gdGhpcyByYW5nZS5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbGVUeXBlRnJvbVN0cmVhbShzdHJlYW0pIHtcblx0cmV0dXJuIG5ldyBGaWxlVHlwZVBhcnNlcigpLmZyb21TdHJlYW0oc3RyZWFtKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbGVUeXBlRnJvbUJ1ZmZlcihpbnB1dCkge1xuXHRyZXR1cm4gbmV3IEZpbGVUeXBlUGFyc2VyKCkuZnJvbUJ1ZmZlcihpbnB1dCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaWxlVHlwZUZyb21CbG9iKGJsb2IpIHtcblx0cmV0dXJuIG5ldyBGaWxlVHlwZVBhcnNlcigpLmZyb21CbG9iKGJsb2IpO1xufVxuXG5mdW5jdGlvbiBfY2hlY2soYnVmZmVyLCBoZWFkZXJzLCBvcHRpb25zKSB7XG5cdG9wdGlvbnMgPSB7XG5cdFx0b2Zmc2V0OiAwLFxuXHRcdC4uLm9wdGlvbnMsXG5cdH07XG5cblx0Zm9yIChjb25zdCBbaW5kZXgsIGhlYWRlcl0gb2YgaGVhZGVycy5lbnRyaWVzKCkpIHtcblx0XHQvLyBJZiBhIGJpdG1hc2sgaXMgc2V0XG5cdFx0aWYgKG9wdGlvbnMubWFzaykge1xuXHRcdFx0Ly8gSWYgaGVhZGVyIGRvZXNuJ3QgZXF1YWwgYGJ1ZmAgd2l0aCBiaXRzIG1hc2tlZCBvZmZcblx0XHRcdGlmIChoZWFkZXIgIT09IChvcHRpb25zLm1hc2tbaW5kZXhdICYgYnVmZmVyW2luZGV4ICsgb3B0aW9ucy5vZmZzZXRdKSkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmIChoZWFkZXIgIT09IGJ1ZmZlcltpbmRleCArIG9wdGlvbnMub2Zmc2V0XSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlsZVR5cGVGcm9tVG9rZW5pemVyKHRva2VuaXplcikge1xuXHRyZXR1cm4gbmV3IEZpbGVUeXBlUGFyc2VyKCkuZnJvbVRva2VuaXplcih0b2tlbml6ZXIpO1xufVxuXG5leHBvcnQgY2xhc3MgRmlsZVR5cGVQYXJzZXIge1xuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0dGhpcy5kZXRlY3RvcnMgPSBvcHRpb25zPy5jdXN0b21EZXRlY3RvcnM7XG5cblx0XHR0aGlzLmZyb21Ub2tlbml6ZXIgPSB0aGlzLmZyb21Ub2tlbml6ZXIuYmluZCh0aGlzKTtcblx0XHR0aGlzLmZyb21CdWZmZXIgPSB0aGlzLmZyb21CdWZmZXIuYmluZCh0aGlzKTtcblx0XHR0aGlzLnBhcnNlID0gdGhpcy5wYXJzZS5iaW5kKHRoaXMpO1xuXHR9XG5cblx0YXN5bmMgZnJvbVRva2VuaXplcih0b2tlbml6ZXIpIHtcblx0XHRjb25zdCBpbml0aWFsUG9zaXRpb24gPSB0b2tlbml6ZXIucG9zaXRpb247XG5cblx0XHRmb3IgKGNvbnN0IGRldGVjdG9yIG9mIHRoaXMuZGV0ZWN0b3JzIHx8IFtdKSB7XG5cdFx0XHRjb25zdCBmaWxlVHlwZSA9IGF3YWl0IGRldGVjdG9yKHRva2VuaXplcik7XG5cdFx0XHRpZiAoZmlsZVR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVUeXBlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaW5pdGlhbFBvc2l0aW9uICE9PSB0b2tlbml6ZXIucG9zaXRpb24pIHtcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDsgLy8gQ2Fubm90IHByb2NlZWQgc2Nhbm5pbmcgb2YgdGhlIHRva2VuaXplciBpcyBhdCBhbiBhcmJpdHJhcnkgcG9zaXRpb25cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5wYXJzZSh0b2tlbml6ZXIpO1xuXHR9XG5cblx0YXN5bmMgZnJvbUJ1ZmZlcihpbnB1dCkge1xuXHRcdGlmICghKGlucHV0IGluc3RhbmNlb2YgVWludDhBcnJheSB8fCBpbnB1dCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSkge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihgRXhwZWN0ZWQgdGhlIFxcYGlucHV0XFxgIGFyZ3VtZW50IHRvIGJlIG9mIHR5cGUgXFxgVWludDhBcnJheVxcYCBvciBcXGBCdWZmZXJcXGAgb3IgXFxgQXJyYXlCdWZmZXJcXGAsIGdvdCBcXGAke3R5cGVvZiBpbnB1dH1cXGBgKTtcblx0XHR9XG5cblx0XHRjb25zdCBidWZmZXIgPSBpbnB1dCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgPyBpbnB1dCA6IG5ldyBVaW50OEFycmF5KGlucHV0KTtcblxuXHRcdGlmICghKGJ1ZmZlcj8ubGVuZ3RoID4gMSkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5mcm9tVG9rZW5pemVyKHN0cnRvazMuZnJvbUJ1ZmZlcihidWZmZXIpKTtcblx0fVxuXG5cdGFzeW5jIGZyb21CbG9iKGJsb2IpIHtcblx0XHRjb25zdCBidWZmZXIgPSBhd2FpdCBibG9iLmFycmF5QnVmZmVyKCk7XG5cdFx0cmV0dXJuIHRoaXMuZnJvbUJ1ZmZlcihuZXcgVWludDhBcnJheShidWZmZXIpKTtcblx0fVxuXG5cdGFzeW5jIGZyb21TdHJlYW0oc3RyZWFtKSB7XG5cdFx0Y29uc3QgdG9rZW5pemVyID0gYXdhaXQgc3RydG9rMy5mcm9tU3RyZWFtKHN0cmVhbSk7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmZyb21Ub2tlbml6ZXIodG9rZW5pemVyKTtcblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0YXdhaXQgdG9rZW5pemVyLmNsb3NlKCk7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgdG9EZXRlY3Rpb25TdHJlYW0ocmVhZGFibGVTdHJlYW0sIG9wdGlvbnMgPSB7fSkge1xuXHRcdGNvbnN0IHtkZWZhdWx0OiBzdHJlYW19ID0gYXdhaXQgaW1wb3J0KCdub2RlOnN0cmVhbScpO1xuXHRcdGNvbnN0IHtzYW1wbGVTaXplID0gbWluaW11bUJ5dGVzfSA9IG9wdGlvbnM7XG5cblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0cmVhZGFibGVTdHJlYW0ub24oJ2Vycm9yJywgcmVqZWN0KTtcblxuXHRcdFx0cmVhZGFibGVTdHJlYW0ub25jZSgncmVhZGFibGUnLCAoKSA9PiB7XG5cdFx0XHRcdChhc3luYyAoKSA9PiB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdC8vIFNldCB1cCBvdXRwdXQgc3RyZWFtXG5cdFx0XHRcdFx0XHRjb25zdCBwYXNzID0gbmV3IHN0cmVhbS5QYXNzVGhyb3VnaCgpO1xuXHRcdFx0XHRcdFx0Y29uc3Qgb3V0cHV0U3RyZWFtID0gc3RyZWFtLnBpcGVsaW5lID8gc3RyZWFtLnBpcGVsaW5lKHJlYWRhYmxlU3RyZWFtLCBwYXNzLCAoKSA9PiB7fSkgOiByZWFkYWJsZVN0cmVhbS5waXBlKHBhc3MpO1xuXG5cdFx0XHRcdFx0XHQvLyBSZWFkIHRoZSBpbnB1dCBzdHJlYW0gYW5kIGRldGVjdCB0aGUgZmlsZXR5cGVcblx0XHRcdFx0XHRcdGNvbnN0IGNodW5rID0gcmVhZGFibGVTdHJlYW0ucmVhZChzYW1wbGVTaXplKSA/PyByZWFkYWJsZVN0cmVhbS5yZWFkKCkgPz8gQnVmZmVyLmFsbG9jKDApO1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0cGFzcy5maWxlVHlwZSA9IGF3YWl0IHRoaXMuZnJvbUJ1ZmZlcihjaHVuayk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRcdFx0XHRpZiAoZXJyb3IgaW5zdGFuY2VvZiBzdHJ0b2szLkVuZE9mU3RyZWFtRXJyb3IpIHtcblx0XHRcdFx0XHRcdFx0XHRwYXNzLmZpbGVUeXBlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJlamVjdChlcnJvcik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmVzb2x2ZShvdXRwdXRTdHJlYW0pO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRyZWplY3QoZXJyb3IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSkoKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Y2hlY2soaGVhZGVyLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIF9jaGVjayh0aGlzLmJ1ZmZlciwgaGVhZGVyLCBvcHRpb25zKTtcblx0fVxuXG5cdGNoZWNrU3RyaW5nKGhlYWRlciwgb3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmNoZWNrKHN0cmluZ1RvQnl0ZXMoaGVhZGVyKSwgb3B0aW9ucyk7XG5cdH1cblxuXHRhc3luYyBwYXJzZSh0b2tlbml6ZXIpIHtcblx0XHR0aGlzLmJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhtaW5pbXVtQnl0ZXMpO1xuXG5cdFx0Ly8gS2VlcCByZWFkaW5nIHVudGlsIEVPRiBpZiB0aGUgZmlsZSBzaXplIGlzIHVua25vd24uXG5cdFx0aWYgKHRva2VuaXplci5maWxlSW5mby5zaXplID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHRva2VuaXplci5maWxlSW5mby5zaXplID0gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVI7XG5cdFx0fVxuXG5cdFx0dGhpcy50b2tlbml6ZXIgPSB0b2tlbml6ZXI7XG5cblx0XHRhd2FpdCB0b2tlbml6ZXIucGVla0J1ZmZlcih0aGlzLmJ1ZmZlciwge2xlbmd0aDogMTIsIG1heUJlTGVzczogdHJ1ZX0pO1xuXG5cdFx0Ly8gLS0gMi1ieXRlIHNpZ25hdHVyZXMgLS1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDQyLCAweDREXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2JtcCcsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS9ibXAnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHgwQiwgMHg3N10pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdhYzMnLFxuXHRcdFx0XHRtaW1lOiAnYXVkaW8vdm5kLmRvbGJ5LmRkLXJhdycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDc4LCAweDAxXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2RtZycsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWFwcGxlLWRpc2tpbWFnZScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDRELCAweDVBXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2V4ZScsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LW1zZG93bmxvYWQnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHgyNSwgMHgyMV0pKSB7XG5cdFx0XHRhd2FpdCB0b2tlbml6ZXIucGVla0J1ZmZlcih0aGlzLmJ1ZmZlciwge2xlbmd0aDogMjQsIG1heUJlTGVzczogdHJ1ZX0pO1xuXG5cdFx0XHRpZiAoXG5cdFx0XHRcdHRoaXMuY2hlY2tTdHJpbmcoJ1BTLUFkb2JlLScsIHtvZmZzZXQ6IDJ9KVxuXHRcdFx0XHQmJiB0aGlzLmNoZWNrU3RyaW5nKCcgRVBTRi0nLCB7b2Zmc2V0OiAxNH0pXG5cdFx0XHQpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdlcHMnLFxuXHRcdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9lcHMnLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdwcycsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wb3N0c2NyaXB0Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKFxuXHRcdFx0dGhpcy5jaGVjayhbMHgxRiwgMHhBMF0pXG5cdFx0XHR8fCB0aGlzLmNoZWNrKFsweDFGLCAweDlEXSlcblx0XHQpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ1onLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1jb21wcmVzcycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEM3LCAweDcxXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2NwaW8nLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1jcGlvJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NjAsIDB4RUFdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnYXJqJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYXJqJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gLS0gMy1ieXRlIHNpZ25hdHVyZXMgLS1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEVGLCAweEJCLCAweEJGXSkpIHsgLy8gVVRGLTgtQk9NXG5cdFx0XHQvLyBTdHJpcCBvZmYgVVRGLTgtQk9NXG5cdFx0XHR0aGlzLnRva2VuaXplci5pZ25vcmUoMyk7XG5cdFx0XHRyZXR1cm4gdGhpcy5wYXJzZSh0b2tlbml6ZXIpO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDQ3LCAweDQ5LCAweDQ2XSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2dpZicsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS9naWYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg0OSwgMHg0OSwgMHhCQ10pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdqeHInLFxuXHRcdFx0XHRtaW1lOiAnaW1hZ2Uvdm5kLm1zLXBob3RvJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4MUYsIDB4OEIsIDB4OF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdneicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9nemlwJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NDIsIDB4NUEsIDB4NjhdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnYnoyJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYnppcDInLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnSUQzJykpIHtcblx0XHRcdGF3YWl0IHRva2VuaXplci5pZ25vcmUoNik7IC8vIFNraXAgSUQzIGhlYWRlciB1bnRpbCB0aGUgaGVhZGVyIHNpemVcblx0XHRcdGNvbnN0IGlkM0hlYWRlckxlbmd0aCA9IGF3YWl0IHRva2VuaXplci5yZWFkVG9rZW4odWludDMyU3luY1NhZmVUb2tlbik7XG5cdFx0XHRpZiAodG9rZW5pemVyLnBvc2l0aW9uICsgaWQzSGVhZGVyTGVuZ3RoID4gdG9rZW5pemVyLmZpbGVJbmZvLnNpemUpIHtcblx0XHRcdFx0Ly8gR3Vlc3MgZmlsZSB0eXBlIGJhc2VkIG9uIElEMyBoZWFkZXIgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdtcDMnLFxuXHRcdFx0XHRcdG1pbWU6ICdhdWRpby9tcGVnJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0YXdhaXQgdG9rZW5pemVyLmlnbm9yZShpZDNIZWFkZXJMZW5ndGgpO1xuXHRcdFx0cmV0dXJuIHRoaXMuZnJvbVRva2VuaXplcih0b2tlbml6ZXIpOyAvLyBTa2lwIElEMyBoZWFkZXIsIHJlY3Vyc2lvblxuXHRcdH1cblxuXHRcdC8vIE11c2VwYWNrLCBTVjdcblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnTVArJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ21wYycsXG5cdFx0XHRcdG1pbWU6ICdhdWRpby94LW11c2VwYWNrJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKFxuXHRcdFx0KHRoaXMuYnVmZmVyWzBdID09PSAweDQzIHx8IHRoaXMuYnVmZmVyWzBdID09PSAweDQ2KVxuXHRcdFx0JiYgdGhpcy5jaGVjayhbMHg1NywgMHg1M10sIHtvZmZzZXQ6IDF9KVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnc3dmJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gLS0gNC1ieXRlIHNpZ25hdHVyZXMgLS1cblxuXHRcdC8vIFJlcXVpcmVzIGEgc2FtcGxlIHNpemUgb2YgNCBieXRlc1xuXHRcdGlmICh0aGlzLmNoZWNrKFsweEZGLCAweEQ4LCAweEZGXSkpIHtcblx0XHRcdGlmICh0aGlzLmNoZWNrKFsweEY3XSwge29mZnNldDogM30pKSB7IC8vIEpQRzcvU09GNTUsIGluZGljYXRpbmcgYSBJU08vSUVDIDE0NDk1IC8gSlBFRy1MUyBmaWxlXG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnamxzJyxcblx0XHRcdFx0XHRtaW1lOiAnaW1hZ2UvamxzJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnanBnJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL2pwZWcnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg0RiwgMHg2MiwgMHg2QSwgMHgwMV0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdhdnJvJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2F2cm8nLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnRkxJRicpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdmbGlmJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL2ZsaWYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnOEJQUycpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdwc2QnLFxuXHRcdFx0XHRtaW1lOiAnaW1hZ2Uvdm5kLmFkb2JlLnBob3Rvc2hvcCcsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdXRUJQJywge29mZnNldDogOH0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd3ZWJwJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL3dlYnAnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBNdXNlcGFjaywgU1Y4XG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ01QQ0snKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnbXBjJyxcblx0XHRcdFx0bWltZTogJ2F1ZGlvL3gtbXVzZXBhY2snLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnRk9STScpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdhaWYnLFxuXHRcdFx0XHRtaW1lOiAnYXVkaW8vYWlmZicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdpY25zJywge29mZnNldDogMH0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdpY25zJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL2ljbnMnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBaaXAtYmFzZWQgZmlsZSBmb3JtYXRzXG5cdFx0Ly8gTmVlZCB0byBiZSBiZWZvcmUgdGhlIGB6aXBgIGNoZWNrXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NTAsIDB4NEIsIDB4MywgMHg0XSkpIHsgLy8gTG9jYWwgZmlsZSBoZWFkZXIgc2lnbmF0dXJlXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR3aGlsZSAodG9rZW5pemVyLnBvc2l0aW9uICsgMzAgPCB0b2tlbml6ZXIuZmlsZUluZm8uc2l6ZSkge1xuXHRcdFx0XHRcdGF3YWl0IHRva2VuaXplci5yZWFkQnVmZmVyKHRoaXMuYnVmZmVyLCB7bGVuZ3RoOiAzMH0pO1xuXG5cdFx0XHRcdFx0Ly8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvWmlwXyhmaWxlX2Zvcm1hdCkjRmlsZV9oZWFkZXJzXG5cdFx0XHRcdFx0Y29uc3QgemlwSGVhZGVyID0ge1xuXHRcdFx0XHRcdFx0Y29tcHJlc3NlZFNpemU6IHRoaXMuYnVmZmVyLnJlYWRVSW50MzJMRSgxOCksXG5cdFx0XHRcdFx0XHR1bmNvbXByZXNzZWRTaXplOiB0aGlzLmJ1ZmZlci5yZWFkVUludDMyTEUoMjIpLFxuXHRcdFx0XHRcdFx0ZmlsZW5hbWVMZW5ndGg6IHRoaXMuYnVmZmVyLnJlYWRVSW50MTZMRSgyNiksXG5cdFx0XHRcdFx0XHRleHRyYUZpZWxkTGVuZ3RoOiB0aGlzLmJ1ZmZlci5yZWFkVUludDE2TEUoMjgpLFxuXHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHR6aXBIZWFkZXIuZmlsZW5hbWUgPSBhd2FpdCB0b2tlbml6ZXIucmVhZFRva2VuKG5ldyBUb2tlbi5TdHJpbmdUeXBlKHppcEhlYWRlci5maWxlbmFtZUxlbmd0aCwgJ3V0Zi04JykpO1xuXHRcdFx0XHRcdGF3YWl0IHRva2VuaXplci5pZ25vcmUoemlwSGVhZGVyLmV4dHJhRmllbGRMZW5ndGgpO1xuXG5cdFx0XHRcdFx0Ly8gQXNzdW1lcyBzaWduZWQgYC54cGlgIGZyb20gYWRkb25zLm1vemlsbGEub3JnXG5cdFx0XHRcdFx0aWYgKHppcEhlYWRlci5maWxlbmFtZSA9PT0gJ01FVEEtSU5GL21vemlsbGEucnNhJykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0ZXh0OiAneHBpJyxcblx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gteHBpbnN0YWxsJyxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHppcEhlYWRlci5maWxlbmFtZS5lbmRzV2l0aCgnLnJlbHMnKSB8fCB6aXBIZWFkZXIuZmlsZW5hbWUuZW5kc1dpdGgoJy54bWwnKSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdHlwZSA9IHppcEhlYWRlci5maWxlbmFtZS5zcGxpdCgnLycpWzBdO1xuXHRcdFx0XHRcdFx0c3dpdGNoICh0eXBlKSB7XG5cdFx0XHRcdFx0XHRcdGNhc2UgJ19yZWxzJzpcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0Y2FzZSAnd29yZCc6XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRcdGV4dDogJ2RvY3gnLFxuXHRcdFx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmRvY3VtZW50Jyxcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRjYXNlICdwcHQnOlxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRleHQ6ICdwcHR4Jyxcblx0XHRcdFx0XHRcdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwucHJlc2VudGF0aW9uJyxcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRjYXNlICd4bCc6XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRcdGV4dDogJ3hsc3gnLFxuXHRcdFx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0Jyxcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICh6aXBIZWFkZXIuZmlsZW5hbWUuc3RhcnRzV2l0aCgneGwvJykpIHtcblx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdGV4dDogJ3hsc3gnLFxuXHRcdFx0XHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQnLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoemlwSGVhZGVyLmZpbGVuYW1lLnN0YXJ0c1dpdGgoJzNELycpICYmIHppcEhlYWRlci5maWxlbmFtZS5lbmRzV2l0aCgnLm1vZGVsJykpIHtcblx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdGV4dDogJzNtZicsXG5cdFx0XHRcdFx0XHRcdG1pbWU6ICdtb2RlbC8zbWYnLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBUaGUgZG9jeCwgeGxzeCBhbmQgcHB0eCBmaWxlIHR5cGVzIGV4dGVuZCB0aGUgT2ZmaWNlIE9wZW4gWE1MIGZpbGUgZm9ybWF0OlxuXHRcdFx0XHRcdC8vIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL09mZmljZV9PcGVuX1hNTF9maWxlX2Zvcm1hdHNcblx0XHRcdFx0XHQvLyBXZSBsb29rIGZvcjpcblx0XHRcdFx0XHQvLyAtIG9uZSBlbnRyeSBuYW1lZCAnW0NvbnRlbnRfVHlwZXNdLnhtbCcgb3IgJ19yZWxzLy5yZWxzJyxcblx0XHRcdFx0XHQvLyAtIG9uZSBlbnRyeSBpbmRpY2F0aW5nIHNwZWNpZmljIHR5cGUgb2YgZmlsZS5cblx0XHRcdFx0XHQvLyBNUyBPZmZpY2UsIE9wZW5PZmZpY2UgYW5kIExpYnJlT2ZmaWNlIG1heSBwdXQgdGhlIHBhcnRzIGluIGRpZmZlcmVudCBvcmRlciwgc28gdGhlIGNoZWNrIHNob3VsZCBub3QgcmVseSBvbiBpdC5cblx0XHRcdFx0XHRpZiAoemlwSGVhZGVyLmZpbGVuYW1lID09PSAnbWltZXR5cGUnICYmIHppcEhlYWRlci5jb21wcmVzc2VkU2l6ZSA9PT0gemlwSGVhZGVyLnVuY29tcHJlc3NlZFNpemUpIHtcblx0XHRcdFx0XHRcdGxldCBtaW1lVHlwZSA9IGF3YWl0IHRva2VuaXplci5yZWFkVG9rZW4obmV3IFRva2VuLlN0cmluZ1R5cGUoemlwSGVhZGVyLmNvbXByZXNzZWRTaXplLCAndXRmLTgnKSk7XG5cdFx0XHRcdFx0XHRtaW1lVHlwZSA9IG1pbWVUeXBlLnRyaW0oKTtcblxuXHRcdFx0XHRcdFx0c3dpdGNoIChtaW1lVHlwZSkge1xuXHRcdFx0XHRcdFx0XHRjYXNlICdhcHBsaWNhdGlvbi9lcHViK3ppcCc6XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRcdGV4dDogJ2VwdWInLFxuXHRcdFx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2VwdWIremlwJyxcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRjYXNlICdhcHBsaWNhdGlvbi92bmQub2FzaXMub3BlbmRvY3VtZW50LnRleHQnOlxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRleHQ6ICdvZHQnLFxuXHRcdFx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQudGV4dCcsXG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0Y2FzZSAnYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5zcHJlYWRzaGVldCc6XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRcdGV4dDogJ29kcycsXG5cdFx0XHRcdFx0XHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5zcHJlYWRzaGVldCcsXG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0Y2FzZSAnYXBwbGljYXRpb24vdm5kLm9hc2lzLm9wZW5kb2N1bWVudC5wcmVzZW50YXRpb24nOlxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRleHQ6ICdvZHAnLFxuXHRcdFx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQucHJlc2VudGF0aW9uJyxcblx0XHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFRyeSB0byBmaW5kIG5leHQgaGVhZGVyIG1hbnVhbGx5IHdoZW4gY3VycmVudCBvbmUgaXMgY29ycnVwdGVkXG5cdFx0XHRcdFx0aWYgKHppcEhlYWRlci5jb21wcmVzc2VkU2l6ZSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0bGV0IG5leHRIZWFkZXJJbmRleCA9IC0xO1xuXG5cdFx0XHRcdFx0XHR3aGlsZSAobmV4dEhlYWRlckluZGV4IDwgMCAmJiAodG9rZW5pemVyLnBvc2l0aW9uIDwgdG9rZW5pemVyLmZpbGVJbmZvLnNpemUpKSB7XG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRva2VuaXplci5wZWVrQnVmZmVyKHRoaXMuYnVmZmVyLCB7bWF5QmVMZXNzOiB0cnVlfSk7XG5cblx0XHRcdFx0XHRcdFx0bmV4dEhlYWRlckluZGV4ID0gdGhpcy5idWZmZXIuaW5kZXhPZignNTA0QjAzMDQnLCAwLCAnaGV4Jyk7XG5cdFx0XHRcdFx0XHRcdC8vIE1vdmUgcG9zaXRpb24gdG8gdGhlIG5leHQgaGVhZGVyIGlmIGZvdW5kLCBza2lwIHRoZSB3aG9sZSBidWZmZXIgb3RoZXJ3aXNlXG5cdFx0XHRcdFx0XHRcdGF3YWl0IHRva2VuaXplci5pZ25vcmUobmV4dEhlYWRlckluZGV4ID49IDAgPyBuZXh0SGVhZGVySW5kZXggOiB0aGlzLmJ1ZmZlci5sZW5ndGgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhd2FpdCB0b2tlbml6ZXIuaWdub3JlKHppcEhlYWRlci5jb21wcmVzc2VkU2l6ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRpZiAoIShlcnJvciBpbnN0YW5jZW9mIHN0cnRvazMuRW5kT2ZTdHJlYW1FcnJvcikpIHtcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd6aXAnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vemlwJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ09nZ1MnKSkge1xuXHRcdFx0Ly8gVGhpcyBpcyBhbiBPR0cgY29udGFpbmVyXG5cdFx0XHRhd2FpdCB0b2tlbml6ZXIuaWdub3JlKDI4KTtcblx0XHRcdGNvbnN0IHR5cGUgPSBCdWZmZXIuYWxsb2MoOCk7XG5cdFx0XHRhd2FpdCB0b2tlbml6ZXIucmVhZEJ1ZmZlcih0eXBlKTtcblxuXHRcdFx0Ly8gTmVlZHMgdG8gYmUgYmVmb3JlIGBvZ2dgIGNoZWNrXG5cdFx0XHRpZiAoX2NoZWNrKHR5cGUsIFsweDRGLCAweDcwLCAweDc1LCAweDczLCAweDQ4LCAweDY1LCAweDYxLCAweDY0XSkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdvcHVzJyxcblx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vb3B1cycsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmICcgdGhlb3JhJyBpbiBoZWFkZXIuXG5cdFx0XHRpZiAoX2NoZWNrKHR5cGUsIFsweDgwLCAweDc0LCAweDY4LCAweDY1LCAweDZGLCAweDcyLCAweDYxXSkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdvZ3YnLFxuXHRcdFx0XHRcdG1pbWU6ICd2aWRlby9vZ2cnLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiAnXFx4MDF2aWRlbycgaW4gaGVhZGVyLlxuXHRcdFx0aWYgKF9jaGVjayh0eXBlLCBbMHgwMSwgMHg3NiwgMHg2OSwgMHg2NCwgMHg2NSwgMHg2RiwgMHgwMF0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnb2dtJyxcblx0XHRcdFx0XHRtaW1lOiAndmlkZW8vb2dnJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgJyBGTEFDJyBpbiBoZWFkZXIgIGh0dHBzOi8veGlwaC5vcmcvZmxhYy9mYXEuaHRtbFxuXHRcdFx0aWYgKF9jaGVjayh0eXBlLCBbMHg3RiwgMHg0NiwgMHg0QywgMHg0MSwgMHg0M10pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnb2dhJyxcblx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vb2dnJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gJ1NwZWV4ICAnIGluIGhlYWRlciBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TcGVleFxuXHRcdFx0aWYgKF9jaGVjayh0eXBlLCBbMHg1MywgMHg3MCwgMHg2NSwgMHg2NSwgMHg3OCwgMHgyMCwgMHgyMF0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnc3B4Jyxcblx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vb2dnJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgJ1xceDAxdm9yYmlzJyBpbiBoZWFkZXJcblx0XHRcdGlmIChfY2hlY2sodHlwZSwgWzB4MDEsIDB4NzYsIDB4NkYsIDB4NzIsIDB4NjIsIDB4NjksIDB4NzNdKSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ29nZycsXG5cdFx0XHRcdFx0bWltZTogJ2F1ZGlvL29nZycsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdC8vIERlZmF1bHQgT0dHIGNvbnRhaW5lciBodHRwczovL3d3dy5pYW5hLm9yZy9hc3NpZ25tZW50cy9tZWRpYS10eXBlcy9hcHBsaWNhdGlvbi9vZ2dcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ29neCcsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9vZ2cnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAoXG5cdFx0XHR0aGlzLmNoZWNrKFsweDUwLCAweDRCXSlcblx0XHRcdCYmICh0aGlzLmJ1ZmZlclsyXSA9PT0gMHgzIHx8IHRoaXMuYnVmZmVyWzJdID09PSAweDUgfHwgdGhpcy5idWZmZXJbMl0gPT09IDB4Nylcblx0XHRcdCYmICh0aGlzLmJ1ZmZlclszXSA9PT0gMHg0IHx8IHRoaXMuYnVmZmVyWzNdID09PSAweDYgfHwgdGhpcy5idWZmZXJbM10gPT09IDB4OClcblx0XHQpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3ppcCcsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi96aXAnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvL1xuXG5cdFx0Ly8gRmlsZSBUeXBlIEJveCAoaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSVNPX2Jhc2VfbWVkaWFfZmlsZV9mb3JtYXQpXG5cdFx0Ly8gSXQncyBub3QgcmVxdWlyZWQgdG8gYmUgZmlyc3QsIGJ1dCBpdCdzIHJlY29tbWVuZGVkIHRvIGJlLiBBbG1vc3QgYWxsIElTTyBiYXNlIG1lZGlhIGZpbGVzIHN0YXJ0IHdpdGggYGZ0eXBgIGJveC5cblx0XHQvLyBgZnR5cGAgYm94IG11c3QgY29udGFpbiBhIGJyYW5kIG1ham9yIGlkZW50aWZpZXIsIHdoaWNoIG11c3QgY29uc2lzdCBvZiBJU08gODg1OS0xIHByaW50YWJsZSBjaGFyYWN0ZXJzLlxuXHRcdC8vIEhlcmUgd2UgY2hlY2sgZm9yIDg4NTktMSBwcmludGFibGUgY2hhcmFjdGVycyAoZm9yIHNpbXBsaWNpdHksIGl0J3MgYSBtYXNrIHdoaWNoIGFsc28gY2F0Y2hlcyBvbmUgbm9uLXByaW50YWJsZSBjaGFyYWN0ZXIpLlxuXHRcdGlmIChcblx0XHRcdHRoaXMuY2hlY2tTdHJpbmcoJ2Z0eXAnLCB7b2Zmc2V0OiA0fSlcblx0XHRcdCYmICh0aGlzLmJ1ZmZlcls4XSAmIDB4NjApICE9PSAweDAwIC8vIEJyYW5kIG1ham9yLCBmaXJzdCBjaGFyYWN0ZXIgQVNDSUk/XG5cdFx0KSB7XG5cdFx0XHQvLyBUaGV5IGFsbCBjYW4gaGF2ZSBNSU1FIGB2aWRlby9tcDRgIGV4Y2VwdCBgYXBwbGljYXRpb24vbXA0YCBzcGVjaWFsLWNhc2Ugd2hpY2ggaXMgaGFyZCB0byBkZXRlY3QuXG5cdFx0XHQvLyBGb3Igc29tZSBjYXNlcywgd2UncmUgc3BlY2lmaWMsIGV2ZXJ5dGhpbmcgZWxzZSBmYWxscyB0byBgdmlkZW8vbXA0YCB3aXRoIGBtcDRgIGV4dGVuc2lvbi5cblx0XHRcdGNvbnN0IGJyYW5kTWFqb3IgPSB0aGlzLmJ1ZmZlci50b1N0cmluZygnYmluYXJ5JywgOCwgMTIpLnJlcGxhY2UoJ1xcMCcsICcgJykudHJpbSgpO1xuXHRcdFx0c3dpdGNoIChicmFuZE1ham9yKSB7XG5cdFx0XHRcdGNhc2UgJ2F2aWYnOlxuXHRcdFx0XHRjYXNlICdhdmlzJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2F2aWYnLCBtaW1lOiAnaW1hZ2UvYXZpZid9O1xuXHRcdFx0XHRjYXNlICdtaWYxJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2hlaWMnLCBtaW1lOiAnaW1hZ2UvaGVpZid9O1xuXHRcdFx0XHRjYXNlICdtc2YxJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2hlaWMnLCBtaW1lOiAnaW1hZ2UvaGVpZi1zZXF1ZW5jZSd9O1xuXHRcdFx0XHRjYXNlICdoZWljJzpcblx0XHRcdFx0Y2FzZSAnaGVpeCc6XG5cdFx0XHRcdFx0cmV0dXJuIHtleHQ6ICdoZWljJywgbWltZTogJ2ltYWdlL2hlaWMnfTtcblx0XHRcdFx0Y2FzZSAnaGV2Yyc6XG5cdFx0XHRcdGNhc2UgJ2hldngnOlxuXHRcdFx0XHRcdHJldHVybiB7ZXh0OiAnaGVpYycsIG1pbWU6ICdpbWFnZS9oZWljLXNlcXVlbmNlJ307XG5cdFx0XHRcdGNhc2UgJ3F0Jzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ21vdicsIG1pbWU6ICd2aWRlby9xdWlja3RpbWUnfTtcblx0XHRcdFx0Y2FzZSAnTTRWJzpcblx0XHRcdFx0Y2FzZSAnTTRWSCc6XG5cdFx0XHRcdGNhc2UgJ000VlAnOlxuXHRcdFx0XHRcdHJldHVybiB7ZXh0OiAnbTR2JywgbWltZTogJ3ZpZGVvL3gtbTR2J307XG5cdFx0XHRcdGNhc2UgJ000UCc6XG5cdFx0XHRcdFx0cmV0dXJuIHtleHQ6ICdtNHAnLCBtaW1lOiAndmlkZW8vbXA0J307XG5cdFx0XHRcdGNhc2UgJ000Qic6XG5cdFx0XHRcdFx0cmV0dXJuIHtleHQ6ICdtNGInLCBtaW1lOiAnYXVkaW8vbXA0J307XG5cdFx0XHRcdGNhc2UgJ000QSc6XG5cdFx0XHRcdFx0cmV0dXJuIHtleHQ6ICdtNGEnLCBtaW1lOiAnYXVkaW8veC1tNGEnfTtcblx0XHRcdFx0Y2FzZSAnRjRWJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2Y0dicsIG1pbWU6ICd2aWRlby9tcDQnfTtcblx0XHRcdFx0Y2FzZSAnRjRQJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2Y0cCcsIG1pbWU6ICd2aWRlby9tcDQnfTtcblx0XHRcdFx0Y2FzZSAnRjRBJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2Y0YScsIG1pbWU6ICdhdWRpby9tcDQnfTtcblx0XHRcdFx0Y2FzZSAnRjRCJzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2Y0YicsIG1pbWU6ICdhdWRpby9tcDQnfTtcblx0XHRcdFx0Y2FzZSAnY3J4Jzpcblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ2NyMycsIG1pbWU6ICdpbWFnZS94LWNhbm9uLWNyMyd9O1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdGlmIChicmFuZE1ham9yLnN0YXJ0c1dpdGgoJzNnJykpIHtcblx0XHRcdFx0XHRcdGlmIChicmFuZE1ham9yLnN0YXJ0c1dpdGgoJzNnMicpKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB7ZXh0OiAnM2cyJywgbWltZTogJ3ZpZGVvLzNncHAyJ307XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHJldHVybiB7ZXh0OiAnM2dwJywgbWltZTogJ3ZpZGVvLzNncHAnfTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4ge2V4dDogJ21wNCcsIG1pbWU6ICd2aWRlby9tcDQnfTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnTVRoZCcpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdtaWQnLFxuXHRcdFx0XHRtaW1lOiAnYXVkaW8vbWlkaScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmIChcblx0XHRcdHRoaXMuY2hlY2tTdHJpbmcoJ3dPRkYnKVxuXHRcdFx0JiYgKFxuXHRcdFx0XHR0aGlzLmNoZWNrKFsweDAwLCAweDAxLCAweDAwLCAweDAwXSwge29mZnNldDogNH0pXG5cdFx0XHRcdHx8IHRoaXMuY2hlY2tTdHJpbmcoJ09UVE8nLCB7b2Zmc2V0OiA0fSlcblx0XHRcdClcblx0XHQpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3dvZmYnLFxuXHRcdFx0XHRtaW1lOiAnZm9udC93b2ZmJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKFxuXHRcdFx0dGhpcy5jaGVja1N0cmluZygnd09GMicpXG5cdFx0XHQmJiAoXG5cdFx0XHRcdHRoaXMuY2hlY2soWzB4MDAsIDB4MDEsIDB4MDAsIDB4MDBdLCB7b2Zmc2V0OiA0fSlcblx0XHRcdFx0fHwgdGhpcy5jaGVja1N0cmluZygnT1RUTycsIHtvZmZzZXQ6IDR9KVxuXHRcdFx0KVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnd29mZjInLFxuXHRcdFx0XHRtaW1lOiAnZm9udC93b2ZmMicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEQ0LCAweEMzLCAweEIyLCAweEExXSkgfHwgdGhpcy5jaGVjayhbMHhBMSwgMHhCMiwgMHhDMywgMHhENF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdwY2FwJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC50Y3BkdW1wLnBjYXAnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBTb255IERTRCBTdHJlYW0gRmlsZSAoRFNGKVxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdEU0QgJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2RzZicsXG5cdFx0XHRcdG1pbWU6ICdhdWRpby94LWRzZicsIC8vIE5vbi1zdGFuZGFyZFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnTFpJUCcpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdseicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWx6aXAnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnZkxhQycpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdmbGFjJyxcblx0XHRcdFx0bWltZTogJ2F1ZGlvL3gtZmxhYycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDQyLCAweDUwLCAweDQ3LCAweEZCXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2JwZycsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS9icGcnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnd3ZwaycpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd3dicsXG5cdFx0XHRcdG1pbWU6ICdhdWRpby93YXZwYWNrJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJyVQREYnKSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0YXdhaXQgdG9rZW5pemVyLmlnbm9yZSgxMzUwKTtcblx0XHRcdFx0Y29uc3QgbWF4QnVmZmVyU2l6ZSA9IDEwICogMTAyNCAqIDEwMjQ7XG5cdFx0XHRcdGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyhNYXRoLm1pbihtYXhCdWZmZXJTaXplLCB0b2tlbml6ZXIuZmlsZUluZm8uc2l6ZSkpO1xuXHRcdFx0XHRhd2FpdCB0b2tlbml6ZXIucmVhZEJ1ZmZlcihidWZmZXIsIHttYXlCZUxlc3M6IHRydWV9KTtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGFuIEFkb2JlIElsbHVzdHJhdG9yIGZpbGVcblx0XHRcdFx0aWYgKGJ1ZmZlci5pbmNsdWRlcyhCdWZmZXIuZnJvbSgnQUlQcml2YXRlRGF0YScpKSkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRleHQ6ICdhaScsXG5cdFx0XHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vcG9zdHNjcmlwdCcsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0Ly8gU3dhbGxvdyBlbmQgb2Ygc3RyZWFtIGVycm9yIGlmIGZpbGUgaXMgdG9vIHNtYWxsIGZvciB0aGUgQWRvYmUgQUkgY2hlY2tcblx0XHRcdFx0aWYgKCEoZXJyb3IgaW5zdGFuY2VvZiBzdHJ0b2szLkVuZE9mU3RyZWFtRXJyb3IpKSB7XG5cdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gQXNzdW1lIHRoaXMgaXMganVzdCBhIG5vcm1hbCBQREZcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3BkZicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wZGYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHgwMCwgMHg2MSwgMHg3MywgMHg2RF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd3YXNtJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3dhc20nLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBUSUZGLCBsaXR0bGUtZW5kaWFuIHR5cGVcblx0XHRpZiAodGhpcy5jaGVjayhbMHg0OSwgMHg0OV0pKSB7XG5cdFx0XHRjb25zdCBmaWxlVHlwZSA9IGF3YWl0IHRoaXMucmVhZFRpZmZIZWFkZXIoZmFsc2UpO1xuXHRcdFx0aWYgKGZpbGVUeXBlKSB7XG5cdFx0XHRcdHJldHVybiBmaWxlVHlwZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBUSUZGLCBiaWctZW5kaWFuIHR5cGVcblx0XHRpZiAodGhpcy5jaGVjayhbMHg0RCwgMHg0RF0pKSB7XG5cdFx0XHRjb25zdCBmaWxlVHlwZSA9IGF3YWl0IHRoaXMucmVhZFRpZmZIZWFkZXIodHJ1ZSk7XG5cdFx0XHRpZiAoZmlsZVR5cGUpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVUeXBlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdNQUMgJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2FwZScsXG5cdFx0XHRcdG1pbWU6ICdhdWRpby9hcGUnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vZmlsZS9maWxlL2Jsb2IvbWFzdGVyL21hZ2ljL01hZ2Rpci9tYXRyb3NrYVxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDFBLCAweDQ1LCAweERGLCAweEEzXSkpIHsgLy8gUm9vdCBlbGVtZW50OiBFQk1MXG5cdFx0XHRhc3luYyBmdW5jdGlvbiByZWFkRmllbGQoKSB7XG5cdFx0XHRcdGNvbnN0IG1zYiA9IGF3YWl0IHRva2VuaXplci5wZWVrTnVtYmVyKFRva2VuLlVJTlQ4KTtcblx0XHRcdFx0bGV0IG1hc2sgPSAweDgwO1xuXHRcdFx0XHRsZXQgaWMgPSAwOyAvLyAwID0gQSwgMSA9IEIsIDIgPSBDLCAzXG5cdFx0XHRcdC8vID0gRFxuXG5cdFx0XHRcdHdoaWxlICgobXNiICYgbWFzaykgPT09IDAgJiYgbWFzayAhPT0gMCkge1xuXHRcdFx0XHRcdCsraWM7XG5cdFx0XHRcdFx0bWFzayA+Pj0gMTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGlkID0gQnVmZmVyLmFsbG9jKGljICsgMSk7XG5cdFx0XHRcdGF3YWl0IHRva2VuaXplci5yZWFkQnVmZmVyKGlkKTtcblx0XHRcdFx0cmV0dXJuIGlkO1xuXHRcdFx0fVxuXG5cdFx0XHRhc3luYyBmdW5jdGlvbiByZWFkRWxlbWVudCgpIHtcblx0XHRcdFx0Y29uc3QgaWQgPSBhd2FpdCByZWFkRmllbGQoKTtcblx0XHRcdFx0Y29uc3QgbGVuZ3RoRmllbGQgPSBhd2FpdCByZWFkRmllbGQoKTtcblx0XHRcdFx0bGVuZ3RoRmllbGRbMF0gXj0gMHg4MCA+PiAobGVuZ3RoRmllbGQubGVuZ3RoIC0gMSk7XG5cdFx0XHRcdGNvbnN0IG5yTGVuZ3RoID0gTWF0aC5taW4oNiwgbGVuZ3RoRmllbGQubGVuZ3RoKTsgLy8gSmF2YVNjcmlwdCBjYW4gbWF4IHJlYWQgNiBieXRlcyBpbnRlZ2VyXG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0aWQ6IGlkLnJlYWRVSW50QkUoMCwgaWQubGVuZ3RoKSxcblx0XHRcdFx0XHRsZW46IGxlbmd0aEZpZWxkLnJlYWRVSW50QkUobGVuZ3RoRmllbGQubGVuZ3RoIC0gbnJMZW5ndGgsIG5yTGVuZ3RoKSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gcmVhZENoaWxkcmVuKGNoaWxkcmVuKSB7XG5cdFx0XHRcdHdoaWxlIChjaGlsZHJlbiA+IDApIHtcblx0XHRcdFx0XHRjb25zdCBlbGVtZW50ID0gYXdhaXQgcmVhZEVsZW1lbnQoKTtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5pZCA9PT0gMHg0Ml84Mikge1xuXHRcdFx0XHRcdFx0Y29uc3QgcmF3VmFsdWUgPSBhd2FpdCB0b2tlbml6ZXIucmVhZFRva2VuKG5ldyBUb2tlbi5TdHJpbmdUeXBlKGVsZW1lbnQubGVuLCAndXRmLTgnKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gcmF3VmFsdWUucmVwbGFjZSgvXFwwMC4qJC9nLCAnJyk7IC8vIFJldHVybiBEb2NUeXBlXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0YXdhaXQgdG9rZW5pemVyLmlnbm9yZShlbGVtZW50Lmxlbik7IC8vIGlnbm9yZSBwYXlsb2FkXG5cdFx0XHRcdFx0LS1jaGlsZHJlbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCByZSA9IGF3YWl0IHJlYWRFbGVtZW50KCk7XG5cdFx0XHRjb25zdCBkb2NUeXBlID0gYXdhaXQgcmVhZENoaWxkcmVuKHJlLmxlbik7XG5cblx0XHRcdHN3aXRjaCAoZG9jVHlwZSkge1xuXHRcdFx0XHRjYXNlICd3ZWJtJzpcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0ZXh0OiAnd2VibScsXG5cdFx0XHRcdFx0XHRtaW1lOiAndmlkZW8vd2VibScsXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRjYXNlICdtYXRyb3NrYSc6XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGV4dDogJ21rdicsXG5cdFx0XHRcdFx0XHRtaW1lOiAndmlkZW8veC1tYXRyb3NrYScsXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBSSUZGIGZpbGUgZm9ybWF0IHdoaWNoIG1pZ2h0IGJlIEFWSSwgV0FWLCBRQ1AsIGV0Y1xuXHRcdGlmICh0aGlzLmNoZWNrKFsweDUyLCAweDQ5LCAweDQ2LCAweDQ2XSkpIHtcblx0XHRcdGlmICh0aGlzLmNoZWNrKFsweDQxLCAweDU2LCAweDQ5XSwge29mZnNldDogOH0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnYXZpJyxcblx0XHRcdFx0XHRtaW1lOiAndmlkZW8vdm5kLmF2aScsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLmNoZWNrKFsweDU3LCAweDQxLCAweDU2LCAweDQ1XSwge29mZnNldDogOH0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnd2F2Jyxcblx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vdm5kLndhdmUnLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBRTENNLCBRQ1AgZmlsZVxuXHRcdFx0aWYgKHRoaXMuY2hlY2soWzB4NTEsIDB4NEMsIDB4NDMsIDB4NERdLCB7b2Zmc2V0OiA4fSkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdxY3AnLFxuXHRcdFx0XHRcdG1pbWU6ICdhdWRpby9xY2VscCcsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ1NRTGknKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnc3FsaXRlJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtc3FsaXRlMycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDRFLCAweDQ1LCAweDUzLCAweDFBXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ25lcycsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LW5pbnRlbmRvLW5lcy1yb20nLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnQ3IyNCcpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdjcngnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1nb29nbGUtY2hyb21lLWV4dGVuc2lvbicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmIChcblx0XHRcdHRoaXMuY2hlY2tTdHJpbmcoJ01TQ0YnKVxuXHRcdFx0fHwgdGhpcy5jaGVja1N0cmluZygnSVNjKCcpXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdjYWInLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLm1zLWNhYi1jb21wcmVzc2VkJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4RUQsIDB4QUIsIDB4RUUsIDB4REJdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAncnBtJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtcnBtJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4QzUsIDB4RDAsIDB4RDMsIDB4QzZdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnZXBzJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2VwcycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDI4LCAweEI1LCAweDJGLCAweEZEXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3pzdCcsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi96c3RkJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4N0YsIDB4NDUsIDB4NEMsIDB4NDZdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnZWxmJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtZWxmJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4MjEsIDB4NDIsIDB4NDQsIDB4NEVdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAncHN0Jyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC5tcy1vdXRsb29rJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ1BBUjEnKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAncGFycXVldCcsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXBhcnF1ZXQnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHhDRiwgMHhGQSwgMHhFRCwgMHhGRV0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdtYWNobycsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LW1hY2gtYmluYXJ5Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gLS0gNS1ieXRlIHNpZ25hdHVyZXMgLS1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDRGLCAweDU0LCAweDU0LCAweDRGLCAweDAwXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ290ZicsXG5cdFx0XHRcdG1pbWU6ICdmb250L290ZicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCcjIUFNUicpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdhbXInLFxuXHRcdFx0XHRtaW1lOiAnYXVkaW8vYW1yJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ3tcXFxccnRmJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3J0ZicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9ydGYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg0NiwgMHg0QywgMHg1NiwgMHgwMV0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdmbHYnLFxuXHRcdFx0XHRtaW1lOiAndmlkZW8veC1mbHYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnSU1QTScpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdpdCcsXG5cdFx0XHRcdG1pbWU6ICdhdWRpby94LWl0Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKFxuXHRcdFx0dGhpcy5jaGVja1N0cmluZygnLWxoMC0nLCB7b2Zmc2V0OiAyfSlcblx0XHRcdHx8IHRoaXMuY2hlY2tTdHJpbmcoJy1saDEtJywge29mZnNldDogMn0pXG5cdFx0XHR8fCB0aGlzLmNoZWNrU3RyaW5nKCctbGgyLScsIHtvZmZzZXQ6IDJ9KVxuXHRcdFx0fHwgdGhpcy5jaGVja1N0cmluZygnLWxoMy0nLCB7b2Zmc2V0OiAyfSlcblx0XHRcdHx8IHRoaXMuY2hlY2tTdHJpbmcoJy1saDQtJywge29mZnNldDogMn0pXG5cdFx0XHR8fCB0aGlzLmNoZWNrU3RyaW5nKCctbGg1LScsIHtvZmZzZXQ6IDJ9KVxuXHRcdFx0fHwgdGhpcy5jaGVja1N0cmluZygnLWxoNi0nLCB7b2Zmc2V0OiAyfSlcblx0XHRcdHx8IHRoaXMuY2hlY2tTdHJpbmcoJy1saDctJywge29mZnNldDogMn0pXG5cdFx0XHR8fCB0aGlzLmNoZWNrU3RyaW5nKCctbHpzLScsIHtvZmZzZXQ6IDJ9KVxuXHRcdFx0fHwgdGhpcy5jaGVja1N0cmluZygnLWx6NC0nLCB7b2Zmc2V0OiAyfSlcblx0XHRcdHx8IHRoaXMuY2hlY2tTdHJpbmcoJy1sejUtJywge29mZnNldDogMn0pXG5cdFx0XHR8fCB0aGlzLmNoZWNrU3RyaW5nKCctbGhkLScsIHtvZmZzZXQ6IDJ9KVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnbHpoJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtbHpoLWNvbXByZXNzZWQnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBNUEVHIHByb2dyYW0gc3RyZWFtIChQUyBvciBNUEVHLVBTKVxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDAwLCAweDAwLCAweDAxLCAweEJBXSkpIHtcblx0XHRcdC8vICBNUEVHLVBTLCBNUEVHLTEgUGFydCAxXG5cdFx0XHRpZiAodGhpcy5jaGVjayhbMHgyMV0sIHtvZmZzZXQ6IDQsIG1hc2s6IFsweEYxXX0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnbXBnJywgLy8gTWF5IGFsc28gYmUgLnBzLCAubXBlZ1xuXHRcdFx0XHRcdG1pbWU6ICd2aWRlby9NUDFTJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTVBFRy1QUywgTVBFRy0yIFBhcnQgMVxuXHRcdFx0aWYgKHRoaXMuY2hlY2soWzB4NDRdLCB7b2Zmc2V0OiA0LCBtYXNrOiBbMHhDNF19KSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ21wZycsIC8vIE1heSBhbHNvIGJlIC5tcGcsIC5tMnAsIC52b2Igb3IgLnN1YlxuXHRcdFx0XHRcdG1pbWU6ICd2aWRlby9NUDJQJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnSVRTRicpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdjaG0nLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLm1zLWh0bWxoZWxwJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4Q0EsIDB4RkUsIDB4QkEsIDB4QkVdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnY2xhc3MnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vamF2YS12bScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIC0tIDYtYnl0ZSBzaWduYXR1cmVzIC0tXG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHhGRCwgMHgzNywgMHg3QSwgMHg1OCwgMHg1QSwgMHgwMF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd4eicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXh6Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJzw/eG1sICcpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd4bWwnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veG1sJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4MzcsIDB4N0EsIDB4QkMsIDB4QUYsIDB4MjcsIDB4MUNdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnN3onLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC03ei1jb21wcmVzc2VkJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKFxuXHRcdFx0dGhpcy5jaGVjayhbMHg1MiwgMHg2MSwgMHg3MiwgMHgyMSwgMHgxQSwgMHg3XSlcblx0XHRcdCYmICh0aGlzLmJ1ZmZlcls2XSA9PT0gMHgwIHx8IHRoaXMuYnVmZmVyWzZdID09PSAweDEpXG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdyYXInLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1yYXItY29tcHJlc3NlZCcsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdzb2xpZCAnKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnc3RsJyxcblx0XHRcdFx0bWltZTogJ21vZGVsL3N0bCcsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdBQycpKSB7XG5cdFx0XHRjb25zdCB2ZXJzaW9uID0gdGhpcy5idWZmZXIudG9TdHJpbmcoJ2JpbmFyeScsIDIsIDYpO1xuXHRcdFx0aWYgKHZlcnNpb24ubWF0Y2goJ15kKicpICYmIHZlcnNpb24gPj0gMTAwMCAmJiB2ZXJzaW9uIDw9IDEwNTApIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdkd2cnLFxuXHRcdFx0XHRcdG1pbWU6ICdpbWFnZS92bmQuZHdnJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnMDcwNzA3JykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2NwaW8nLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1jcGlvJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gLS0gNy1ieXRlIHNpZ25hdHVyZXMgLS1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdCTEVOREVSJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2JsZW5kJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYmxlbmRlcicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCchPGFyY2g+JykpIHtcblx0XHRcdGF3YWl0IHRva2VuaXplci5pZ25vcmUoOCk7XG5cdFx0XHRjb25zdCBzdHJpbmcgPSBhd2FpdCB0b2tlbml6ZXIucmVhZFRva2VuKG5ldyBUb2tlbi5TdHJpbmdUeXBlKDEzLCAnYXNjaWknKSk7XG5cdFx0XHRpZiAoc3RyaW5nID09PSAnZGViaWFuLWJpbmFyeScpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdkZWInLFxuXHRcdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWRlYicsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2FyJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtdW5peC1hcmNoaXZlJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJyoqQUNFJywge29mZnNldDogN30pKSB7XG5cdFx0XHRhd2FpdCB0b2tlbml6ZXIucGVla0J1ZmZlcih0aGlzLmJ1ZmZlciwge2xlbmd0aDogMTQsIG1heUJlTGVzczogdHJ1ZX0pO1xuXHRcdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJyoqJywge29mZnNldDogMTJ9KSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ2FjZScsXG5cdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYWNlLWNvbXByZXNzZWQnLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIC0tIDgtYnl0ZSBzaWduYXR1cmVzIC0tXG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg4OSwgMHg1MCwgMHg0RSwgMHg0NywgMHgwRCwgMHgwQSwgMHgxQSwgMHgwQV0pKSB7XG5cdFx0XHQvLyBBUE5HIGZvcm1hdCAoaHR0cHM6Ly93aWtpLm1vemlsbGEub3JnL0FQTkdfU3BlY2lmaWNhdGlvbilcblx0XHRcdC8vIDEuIEZpbmQgdGhlIGZpcnN0IElEQVQgKGltYWdlIGRhdGEpIGNodW5rICg0OSA0NCA0MSA1NClcblx0XHRcdC8vIDIuIENoZWNrIGlmIHRoZXJlIGlzIGFuIFwiYWNUTFwiIGNodW5rIGJlZm9yZSB0aGUgSURBVCBvbmUgKDYxIDYzIDU0IDRDKVxuXG5cdFx0XHQvLyBPZmZzZXQgY2FsY3VsYXRlZCBhcyBmb2xsb3dzOlxuXHRcdFx0Ly8gLSA4IGJ5dGVzOiBQTkcgc2lnbmF0dXJlXG5cdFx0XHQvLyAtIDQgKGxlbmd0aCkgKyA0IChjaHVuayB0eXBlKSArIDEzIChjaHVuayBkYXRhKSArIDQgKENSQyk6IElIRFIgY2h1bmtcblxuXHRcdFx0YXdhaXQgdG9rZW5pemVyLmlnbm9yZSg4KTsgLy8gaWdub3JlIFBORyBzaWduYXR1cmVcblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gcmVhZENodW5rSGVhZGVyKCkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGxlbmd0aDogYXdhaXQgdG9rZW5pemVyLnJlYWRUb2tlbihUb2tlbi5JTlQzMl9CRSksXG5cdFx0XHRcdFx0dHlwZTogYXdhaXQgdG9rZW5pemVyLnJlYWRUb2tlbihuZXcgVG9rZW4uU3RyaW5nVHlwZSg0LCAnYmluYXJ5JykpLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRkbyB7XG5cdFx0XHRcdGNvbnN0IGNodW5rID0gYXdhaXQgcmVhZENodW5rSGVhZGVyKCk7XG5cdFx0XHRcdGlmIChjaHVuay5sZW5ndGggPCAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuOyAvLyBJbnZhbGlkIGNodW5rIGxlbmd0aFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c3dpdGNoIChjaHVuay50eXBlKSB7XG5cdFx0XHRcdFx0Y2FzZSAnSURBVCc6XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRleHQ6ICdwbmcnLFxuXHRcdFx0XHRcdFx0XHRtaW1lOiAnaW1hZ2UvcG5nJyxcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0Y2FzZSAnYWNUTCc6XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRleHQ6ICdhcG5nJyxcblx0XHRcdFx0XHRcdFx0bWltZTogJ2ltYWdlL2FwbmcnLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0YXdhaXQgdG9rZW5pemVyLmlnbm9yZShjaHVuay5sZW5ndGggKyA0KTsgLy8gSWdub3JlIGNodW5rLWRhdGEgKyBDUkNcblx0XHRcdFx0fVxuXHRcdFx0fSB3aGlsZSAodG9rZW5pemVyLnBvc2l0aW9uICsgOCA8IHRva2VuaXplci5maWxlSW5mby5zaXplKTtcblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAncG5nJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL3BuZycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDQxLCAweDUyLCAweDUyLCAweDRGLCAweDU3LCAweDMxLCAweDAwLCAweDAwXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2Fycm93Jyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYXBhY2hlLWFycm93Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NjcsIDB4NkMsIDB4NTQsIDB4NDYsIDB4MDIsIDB4MDAsIDB4MDAsIDB4MDBdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnZ2xiJyxcblx0XHRcdFx0bWltZTogJ21vZGVsL2dsdGYtYmluYXJ5Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gYG1vdmAgZm9ybWF0IHZhcmlhbnRzXG5cdFx0aWYgKFxuXHRcdFx0dGhpcy5jaGVjayhbMHg2NiwgMHg3MiwgMHg2NSwgMHg2NV0sIHtvZmZzZXQ6IDR9KSAvLyBgZnJlZWBcblx0XHRcdHx8IHRoaXMuY2hlY2soWzB4NkQsIDB4NjQsIDB4NjEsIDB4NzRdLCB7b2Zmc2V0OiA0fSkgLy8gYG1kYXRgIE1KUEVHXG5cdFx0XHR8fCB0aGlzLmNoZWNrKFsweDZELCAweDZGLCAweDZGLCAweDc2XSwge29mZnNldDogNH0pIC8vIGBtb292YFxuXHRcdFx0fHwgdGhpcy5jaGVjayhbMHg3NywgMHg2OSwgMHg2NCwgMHg2NV0sIHtvZmZzZXQ6IDR9KSAvLyBgd2lkZWBcblx0XHQpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ21vdicsXG5cdFx0XHRcdG1pbWU6ICd2aWRlby9xdWlja3RpbWUnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyAtLSA5LWJ5dGUgc2lnbmF0dXJlcyAtLVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NDksIDB4NDksIDB4NTIsIDB4NEYsIDB4MDgsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MThdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnb3JmJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL3gtb2x5bXB1cy1vcmYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnZ2ltcCB4Y2YgJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3hjZicsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS94LXhjZicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIC0tIDEyLWJ5dGUgc2lnbmF0dXJlcyAtLVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NDksIDB4NDksIDB4NTUsIDB4MDAsIDB4MTgsIDB4MDAsIDB4MDAsIDB4MDAsIDB4ODgsIDB4RTcsIDB4NzQsIDB4RDhdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAncncyJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL3gtcGFuYXNvbmljLXJ3MicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIEFTRl9IZWFkZXJfT2JqZWN0IGZpcnN0IDgwIGJ5dGVzXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4MzAsIDB4MjYsIDB4QjIsIDB4NzUsIDB4OEUsIDB4NjYsIDB4Q0YsIDB4MTEsIDB4QTYsIDB4RDldKSkge1xuXHRcdFx0YXN5bmMgZnVuY3Rpb24gcmVhZEhlYWRlcigpIHtcblx0XHRcdFx0Y29uc3QgZ3VpZCA9IEJ1ZmZlci5hbGxvYygxNik7XG5cdFx0XHRcdGF3YWl0IHRva2VuaXplci5yZWFkQnVmZmVyKGd1aWQpO1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGlkOiBndWlkLFxuXHRcdFx0XHRcdHNpemU6IE51bWJlcihhd2FpdCB0b2tlbml6ZXIucmVhZFRva2VuKFRva2VuLlVJTlQ2NF9MRSkpLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRhd2FpdCB0b2tlbml6ZXIuaWdub3JlKDMwKTtcblx0XHRcdC8vIFNlYXJjaCBmb3IgaGVhZGVyIHNob3VsZCBiZSBpbiBmaXJzdCAxS0Igb2YgZmlsZS5cblx0XHRcdHdoaWxlICh0b2tlbml6ZXIucG9zaXRpb24gKyAyNCA8IHRva2VuaXplci5maWxlSW5mby5zaXplKSB7XG5cdFx0XHRcdGNvbnN0IGhlYWRlciA9IGF3YWl0IHJlYWRIZWFkZXIoKTtcblx0XHRcdFx0bGV0IHBheWxvYWQgPSBoZWFkZXIuc2l6ZSAtIDI0O1xuXHRcdFx0XHRpZiAoX2NoZWNrKGhlYWRlci5pZCwgWzB4OTEsIDB4MDcsIDB4REMsIDB4QjcsIDB4QjcsIDB4QTksIDB4Q0YsIDB4MTEsIDB4OEUsIDB4RTYsIDB4MDAsIDB4QzAsIDB4MEMsIDB4MjAsIDB4NTMsIDB4NjVdKSkge1xuXHRcdFx0XHRcdC8vIFN5bmMgb24gU3RyZWFtLVByb3BlcnRpZXMtT2JqZWN0IChCN0RDMDc5MS1BOUI3LTExQ0YtOEVFNi0wMEMwMEMyMDUzNjUpXG5cdFx0XHRcdFx0Y29uc3QgdHlwZUlkID0gQnVmZmVyLmFsbG9jKDE2KTtcblx0XHRcdFx0XHRwYXlsb2FkIC09IGF3YWl0IHRva2VuaXplci5yZWFkQnVmZmVyKHR5cGVJZCk7XG5cblx0XHRcdFx0XHRpZiAoX2NoZWNrKHR5cGVJZCwgWzB4NDAsIDB4OUUsIDB4NjksIDB4RjgsIDB4NEQsIDB4NUIsIDB4Q0YsIDB4MTEsIDB4QTgsIDB4RkQsIDB4MDAsIDB4ODAsIDB4NUYsIDB4NUMsIDB4NDQsIDB4MkJdKSkge1xuXHRcdFx0XHRcdFx0Ly8gRm91bmQgYXVkaW86XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRleHQ6ICdhc2YnLFxuXHRcdFx0XHRcdFx0XHRtaW1lOiAnYXVkaW8veC1tcy1hc2YnLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX2NoZWNrKHR5cGVJZCwgWzB4QzAsIDB4RUYsIDB4MTksIDB4QkMsIDB4NEQsIDB4NUIsIDB4Q0YsIDB4MTEsIDB4QTgsIDB4RkQsIDB4MDAsIDB4ODAsIDB4NUYsIDB4NUMsIDB4NDQsIDB4MkJdKSkge1xuXHRcdFx0XHRcdFx0Ly8gRm91bmQgdmlkZW86XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRleHQ6ICdhc2YnLFxuXHRcdFx0XHRcdFx0XHRtaW1lOiAndmlkZW8veC1tcy1hc2YnLFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGF3YWl0IHRva2VuaXplci5pZ25vcmUocGF5bG9hZCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIERlZmF1bHQgdG8gQVNGIGdlbmVyaWMgZXh0ZW5zaW9uXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdhc2YnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLm1zLWFzZicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEFCLCAweDRCLCAweDU0LCAweDU4LCAweDIwLCAweDMxLCAweDMxLCAweEJCLCAweDBELCAweDBBLCAweDFBLCAweDBBXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2t0eCcsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS9rdHgnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAoKHRoaXMuY2hlY2soWzB4N0UsIDB4MTAsIDB4MDRdKSB8fCB0aGlzLmNoZWNrKFsweDdFLCAweDE4LCAweDA0XSkpICYmIHRoaXMuY2hlY2soWzB4MzAsIDB4NEQsIDB4NDksIDB4NDVdLCB7b2Zmc2V0OiA0fSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ21pZScsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LW1pZScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDI3LCAweDBBLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwLCAweDAwXSwge29mZnNldDogMn0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdzaHAnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1lc3JpLXNoYXBlJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4RkYsIDB4NEYsIDB4RkYsIDB4NTFdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnajJjJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL2oyYycsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDAwLCAweDAwLCAweDAwLCAweDBDLCAweDZBLCAweDUwLCAweDIwLCAweDIwLCAweDBELCAweDBBLCAweDg3LCAweDBBXSkpIHtcblx0XHRcdC8vIEpQRUctMjAwMCBmYW1pbHlcblxuXHRcdFx0YXdhaXQgdG9rZW5pemVyLmlnbm9yZSgyMCk7XG5cdFx0XHRjb25zdCB0eXBlID0gYXdhaXQgdG9rZW5pemVyLnJlYWRUb2tlbihuZXcgVG9rZW4uU3RyaW5nVHlwZSg0LCAnYXNjaWknKSk7XG5cdFx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdFx0Y2FzZSAnanAyICc6XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGV4dDogJ2pwMicsXG5cdFx0XHRcdFx0XHRtaW1lOiAnaW1hZ2UvanAyJyxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRjYXNlICdqcHggJzpcblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0ZXh0OiAnanB4Jyxcblx0XHRcdFx0XHRcdG1pbWU6ICdpbWFnZS9qcHgnLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdGNhc2UgJ2pwbSAnOlxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRleHQ6ICdqcG0nLFxuXHRcdFx0XHRcdFx0bWltZTogJ2ltYWdlL2pwbScsXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0Y2FzZSAnbWpwMic6XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGV4dDogJ21qMicsXG5cdFx0XHRcdFx0XHRtaW1lOiAnaW1hZ2UvbWoyJyxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoXG5cdFx0XHR0aGlzLmNoZWNrKFsweEZGLCAweDBBXSlcblx0XHRcdHx8IHRoaXMuY2hlY2soWzB4MDAsIDB4MDAsIDB4MDAsIDB4MEMsIDB4NEEsIDB4NTgsIDB4NEMsIDB4MjAsIDB4MEQsIDB4MEEsIDB4ODcsIDB4MEFdKVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnanhsJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL2p4bCcsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEZFLCAweEZGXSkpIHsgLy8gVVRGLTE2LUJPTS1MRVxuXHRcdFx0aWYgKHRoaXMuY2hlY2soWzAsIDYwLCAwLCA2MywgMCwgMTIwLCAwLCAxMDksIDAsIDEwOF0sIHtvZmZzZXQ6IDJ9KSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ3htbCcsXG5cdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3htbCcsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB1bmRlZmluZWQ7IC8vIFNvbWUgdW5rbm93biB0ZXh0IGJhc2VkIGZvcm1hdFxuXHRcdH1cblxuXHRcdC8vIC0tIFVuc2FmZSBzaWduYXR1cmVzIC0tXG5cblx0XHRpZiAoXG5cdFx0XHR0aGlzLmNoZWNrKFsweDAsIDB4MCwgMHgxLCAweEJBXSlcblx0XHRcdHx8IHRoaXMuY2hlY2soWzB4MCwgMHgwLCAweDEsIDB4QjNdKVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnbXBnJyxcblx0XHRcdFx0bWltZTogJ3ZpZGVvL21wZWcnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHgwMCwgMHgwMSwgMHgwMCwgMHgwMCwgMHgwMF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd0dGYnLFxuXHRcdFx0XHRtaW1lOiAnZm9udC90dGYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHgwMCwgMHgwMCwgMHgwMSwgMHgwMF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdpY28nLFxuXHRcdFx0XHRtaW1lOiAnaW1hZ2UveC1pY29uJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4MDAsIDB4MDAsIDB4MDIsIDB4MDBdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnY3VyJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL3gtaWNvbicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEQwLCAweENGLCAweDExLCAweEUwLCAweEExLCAweEIxLCAweDFBLCAweEUxXSkpIHtcblx0XHRcdC8vIERldGVjdGVkIE1pY3Jvc29mdCBDb21wb3VuZCBGaWxlIEJpbmFyeSBGaWxlIChNUy1DRkIpIEZvcm1hdC5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2NmYicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWNmYicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIEluY3JlYXNlIHNhbXBsZSBzaXplIGZyb20gMTIgdG8gMjU2LlxuXHRcdGF3YWl0IHRva2VuaXplci5wZWVrQnVmZmVyKHRoaXMuYnVmZmVyLCB7bGVuZ3RoOiBNYXRoLm1pbigyNTYsIHRva2VuaXplci5maWxlSW5mby5zaXplKSwgbWF5QmVMZXNzOiB0cnVlfSk7XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg2MSwgMHg2MywgMHg3MywgMHg3MF0sIHtvZmZzZXQ6IDM2fSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ2ljYycsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi92bmQuaWNjcHJvZmlsZScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIC0tIDE1LWJ5dGUgc2lnbmF0dXJlcyAtLVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ0JFR0lOOicpKSB7XG5cdFx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnVkNBUkQnLCB7b2Zmc2V0OiA2fSkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICd2Y2YnLFxuXHRcdFx0XHRcdG1pbWU6ICd0ZXh0L3ZjYXJkJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ1ZDQUxFTkRBUicsIHtvZmZzZXQ6IDZ9KSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ2ljcycsXG5cdFx0XHRcdFx0bWltZTogJ3RleHQvY2FsZW5kYXInLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGByYWZgIGlzIGhlcmUganVzdCB0byBrZWVwIGFsbCB0aGUgcmF3IGltYWdlIGRldGVjdG9ycyB0b2dldGhlci5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnRlVKSUZJTE1DQ0QtUkFXJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3JhZicsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS94LWZ1amlmaWxtLXJhZicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdFeHRlbmRlZCBNb2R1bGU6JykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3htJyxcblx0XHRcdFx0bWltZTogJ2F1ZGlvL3gteG0nLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnQ3JlYXRpdmUgVm9pY2UgRmlsZScpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICd2b2MnLFxuXHRcdFx0XHRtaW1lOiAnYXVkaW8veC12b2MnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHgwNCwgMHgwMCwgMHgwMCwgMHgwMF0pICYmIHRoaXMuYnVmZmVyLmxlbmd0aCA+PSAxNikgeyAvLyBSb3VnaCAmIHF1aWNrIGNoZWNrIFBpY2tsZS9BU0FSXG5cdFx0XHRjb25zdCBqc29uU2l6ZSA9IHRoaXMuYnVmZmVyLnJlYWRVSW50MzJMRSgxMik7XG5cdFx0XHRpZiAoanNvblNpemUgPiAxMiAmJiB0aGlzLmJ1ZmZlci5sZW5ndGggPj0ganNvblNpemUgKyAxNikge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IGhlYWRlciA9IHRoaXMuYnVmZmVyLnNsaWNlKDE2LCBqc29uU2l6ZSArIDE2KS50b1N0cmluZygpO1xuXHRcdFx0XHRcdGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGhlYWRlcik7XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgUGlja2xlIGlzIEFTQVJcblx0XHRcdFx0XHRpZiAoanNvbi5maWxlcykgeyAvLyBGaW5hbCBjaGVjaywgYXNzdXJpbmcgUGlja2xlL0FTQVIgZm9ybWF0XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRleHQ6ICdhc2FyJyxcblx0XHRcdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gtYXNhcicsXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBjYXRjaCB7fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDA2LCAweDBFLCAweDJCLCAweDM0LCAweDAyLCAweDA1LCAweDAxLCAweDAxLCAweDBELCAweDAxLCAweDAyLCAweDAxLCAweDAxLCAweDAyXSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ214ZicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9teGYnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnU0NSTScsIHtvZmZzZXQ6IDQ0fSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3MzbScsXG5cdFx0XHRcdG1pbWU6ICdhdWRpby94LXMzbScsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIFJhdyBNUEVHLTIgdHJhbnNwb3J0IHN0cmVhbSAoMTg4LWJ5dGUgcGFja2V0cylcblx0XHRpZiAodGhpcy5jaGVjayhbMHg0N10pICYmIHRoaXMuY2hlY2soWzB4NDddLCB7b2Zmc2V0OiAxODh9KSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnbXRzJyxcblx0XHRcdFx0bWltZTogJ3ZpZGVvL21wMnQnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBCbHUtcmF5IERpc2MgQXVkaW8tVmlkZW8gKEJEQVYpIE1QRUctMiB0cmFuc3BvcnQgc3RyZWFtIGhhcyA0LWJ5dGUgVFBfZXh0cmFfaGVhZGVyIGJlZm9yZSBlYWNoIDE4OC1ieXRlIHBhY2tldFxuXHRcdGlmICh0aGlzLmNoZWNrKFsweDQ3XSwge29mZnNldDogNH0pICYmIHRoaXMuY2hlY2soWzB4NDddLCB7b2Zmc2V0OiAxOTZ9KSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnbXRzJyxcblx0XHRcdFx0bWltZTogJ3ZpZGVvL21wMnQnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg0MiwgMHg0RiwgMHg0RiwgMHg0QiwgMHg0RCwgMHg0RiwgMHg0MiwgMHg0OV0sIHtvZmZzZXQ6IDYwfSkpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ21vYmknLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC1tb2JpcG9ja2V0LWVib29rJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NDQsIDB4NDksIDB4NDMsIDB4NERdLCB7b2Zmc2V0OiAxMjh9KSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnZGNtJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL2RpY29tJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4NEMsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDEsIDB4MTQsIDB4MDIsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4QzAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4MDAsIDB4NDZdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnbG5rJyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3gubXMuc2hvcnRjdXQnLCAvLyBJbnZlbnRlZCBieSB1c1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVjayhbMHg2MiwgMHg2RiwgMHg2RiwgMHg2QiwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMCwgMHg2RCwgMHg2MSwgMHg3MiwgMHg2QiwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMF0pKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdhbGlhcycsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LmFwcGxlLmFsaWFzJywgLy8gSW52ZW50ZWQgYnkgdXNcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2tTdHJpbmcoJ0theWRhcmEgRkJYIEJpbmFyeSAgXFx1MDAwMCcpKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRleHQ6ICdmYngnLFxuXHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24veC5hdXRvZGVzay5mYngnLCAvLyBJbnZlbnRlZCBieSB1c1xuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRpZiAoXG5cdFx0XHR0aGlzLmNoZWNrKFsweDRDLCAweDUwXSwge29mZnNldDogMzR9KVxuXHRcdFx0JiYgKFxuXHRcdFx0XHR0aGlzLmNoZWNrKFsweDAwLCAweDAwLCAweDAxXSwge29mZnNldDogOH0pXG5cdFx0XHRcdHx8IHRoaXMuY2hlY2soWzB4MDEsIDB4MDAsIDB4MDJdLCB7b2Zmc2V0OiA4fSlcblx0XHRcdFx0fHwgdGhpcy5jaGVjayhbMHgwMiwgMHgwMCwgMHgwMl0sIHtvZmZzZXQ6IDh9KVxuXHRcdFx0KVxuXHRcdCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnZW90Jyxcblx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3ZuZC5tcy1mb250b2JqZWN0Jyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY2hlY2soWzB4MDYsIDB4MDYsIDB4RUQsIDB4RjUsIDB4RDgsIDB4MUQsIDB4NDYsIDB4RTUsIDB4QkQsIDB4MzEsIDB4RUYsIDB4RTcsIDB4RkUsIDB4NzQsIDB4QjcsIDB4MURdKSkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAnaW5kZCcsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LWluZGVzaWduJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gSW5jcmVhc2Ugc2FtcGxlIHNpemUgZnJvbSAyNTYgdG8gNTEyXG5cdFx0YXdhaXQgdG9rZW5pemVyLnBlZWtCdWZmZXIodGhpcy5idWZmZXIsIHtsZW5ndGg6IE1hdGgubWluKDUxMiwgdG9rZW5pemVyLmZpbGVJbmZvLnNpemUpLCBtYXlCZUxlc3M6IHRydWV9KTtcblxuXHRcdC8vIFJlcXVpcmVzIGEgYnVmZmVyIHNpemUgb2YgNTEyIGJ5dGVzXG5cdFx0aWYgKHRhckhlYWRlckNoZWNrc3VtTWF0Y2hlcyh0aGlzLmJ1ZmZlcikpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3RhcicsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi94LXRhcicsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmNoZWNrKFsweEZGLCAweEZFXSkpIHsgLy8gVVRGLTE2LUJPTS1CRVxuXHRcdFx0aWYgKHRoaXMuY2hlY2soWzYwLCAwLCA2MywgMCwgMTIwLCAwLCAxMDksIDAsIDEwOCwgMF0sIHtvZmZzZXQ6IDJ9KSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ3htbCcsXG5cdFx0XHRcdFx0bWltZTogJ2FwcGxpY2F0aW9uL3htbCcsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLmNoZWNrKFsweEZGLCAweDBFLCAweDUzLCAweDAwLCAweDZCLCAweDAwLCAweDY1LCAweDAwLCAweDc0LCAweDAwLCAweDYzLCAweDAwLCAweDY4LCAweDAwLCAweDU1LCAweDAwLCAweDcwLCAweDAwLCAweDIwLCAweDAwLCAweDRELCAweDAwLCAweDZGLCAweDAwLCAweDY0LCAweDAwLCAweDY1LCAweDAwLCAweDZDLCAweDAwXSwge29mZnNldDogMn0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnc2twJyxcblx0XHRcdFx0XHRtaW1lOiAnYXBwbGljYXRpb24vdm5kLnNrZXRjaHVwLnNrcCcsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB1bmRlZmluZWQ7IC8vIFNvbWUgdGV4dCBiYXNlZCBmb3JtYXRcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jaGVja1N0cmluZygnLS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tJykpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV4dDogJ3BncCcsXG5cdFx0XHRcdG1pbWU6ICdhcHBsaWNhdGlvbi9wZ3AtZW5jcnlwdGVkJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgTVBFRyAxIG9yIDIgTGF5ZXIgMyBoZWFkZXIsIG9yICdsYXllciAwJyBmb3IgQURUUyAoTVBFRyBzeW5jLXdvcmQgMHhGRkUpXG5cdFx0aWYgKHRoaXMuYnVmZmVyLmxlbmd0aCA+PSAyICYmIHRoaXMuY2hlY2soWzB4RkYsIDB4RTBdLCB7b2Zmc2V0OiAwLCBtYXNrOiBbMHhGRiwgMHhFMF19KSkge1xuXHRcdFx0aWYgKHRoaXMuY2hlY2soWzB4MTBdLCB7b2Zmc2V0OiAxLCBtYXNrOiBbMHgxNl19KSkge1xuXHRcdFx0XHQvLyBDaGVjayBmb3IgKEFEVFMpIE1QRUctMlxuXHRcdFx0XHRpZiAodGhpcy5jaGVjayhbMHgwOF0sIHtvZmZzZXQ6IDEsIG1hc2s6IFsweDA4XX0pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGV4dDogJ2FhYycsXG5cdFx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vYWFjJyxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gTXVzdCBiZSAoQURUUykgTVBFRy00XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnYWFjJyxcblx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vYWFjJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTVBFRyAxIG9yIDIgTGF5ZXIgMyBoZWFkZXJcblx0XHRcdC8vIENoZWNrIGZvciBNUEVHIGxheWVyIDNcblx0XHRcdGlmICh0aGlzLmNoZWNrKFsweDAyXSwge29mZnNldDogMSwgbWFzazogWzB4MDZdfSkpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRleHQ6ICdtcDMnLFxuXHRcdFx0XHRcdG1pbWU6ICdhdWRpby9tcGVnJyxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2hlY2sgZm9yIE1QRUcgbGF5ZXIgMlxuXHRcdFx0aWYgKHRoaXMuY2hlY2soWzB4MDRdLCB7b2Zmc2V0OiAxLCBtYXNrOiBbMHgwNl19KSkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ21wMicsXG5cdFx0XHRcdFx0bWltZTogJ2F1ZGlvL21wZWcnLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDaGVjayBmb3IgTVBFRyBsYXllciAxXG5cdFx0XHRpZiAodGhpcy5jaGVjayhbMHgwNl0sIHtvZmZzZXQ6IDEsIG1hc2s6IFsweDA2XX0pKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnbXAxJyxcblx0XHRcdFx0XHRtaW1lOiAnYXVkaW8vbXBlZycsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgcmVhZFRpZmZUYWcoYmlnRW5kaWFuKSB7XG5cdFx0Y29uc3QgdGFnSWQgPSBhd2FpdCB0aGlzLnRva2VuaXplci5yZWFkVG9rZW4oYmlnRW5kaWFuID8gVG9rZW4uVUlOVDE2X0JFIDogVG9rZW4uVUlOVDE2X0xFKTtcblx0XHR0aGlzLnRva2VuaXplci5pZ25vcmUoMTApO1xuXHRcdHN3aXRjaCAodGFnSWQpIHtcblx0XHRcdGNhc2UgNTBfMzQxOlxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGV4dDogJ2FydycsXG5cdFx0XHRcdFx0bWltZTogJ2ltYWdlL3gtc29ueS1hcncnLFxuXHRcdFx0XHR9O1xuXHRcdFx0Y2FzZSA1MF83MDY6XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZXh0OiAnZG5nJyxcblx0XHRcdFx0XHRtaW1lOiAnaW1hZ2UveC1hZG9iZS1kbmcnLFxuXHRcdFx0XHR9O1xuXHRcdFx0ZGVmYXVsdDpcblx0XHR9XG5cdH1cblxuXHRhc3luYyByZWFkVGlmZklGRChiaWdFbmRpYW4pIHtcblx0XHRjb25zdCBudW1iZXJPZlRhZ3MgPSBhd2FpdCB0aGlzLnRva2VuaXplci5yZWFkVG9rZW4oYmlnRW5kaWFuID8gVG9rZW4uVUlOVDE2X0JFIDogVG9rZW4uVUlOVDE2X0xFKTtcblx0XHRmb3IgKGxldCBuID0gMDsgbiA8IG51bWJlck9mVGFnczsgKytuKSB7XG5cdFx0XHRjb25zdCBmaWxlVHlwZSA9IGF3YWl0IHRoaXMucmVhZFRpZmZUYWcoYmlnRW5kaWFuKTtcblx0XHRcdGlmIChmaWxlVHlwZSkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZVR5cGU7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgcmVhZFRpZmZIZWFkZXIoYmlnRW5kaWFuKSB7XG5cdFx0Y29uc3QgdmVyc2lvbiA9IChiaWdFbmRpYW4gPyBUb2tlbi5VSU5UMTZfQkUgOiBUb2tlbi5VSU5UMTZfTEUpLmdldCh0aGlzLmJ1ZmZlciwgMik7XG5cdFx0Y29uc3QgaWZkT2Zmc2V0ID0gKGJpZ0VuZGlhbiA/IFRva2VuLlVJTlQzMl9CRSA6IFRva2VuLlVJTlQzMl9MRSkuZ2V0KHRoaXMuYnVmZmVyLCA0KTtcblxuXHRcdGlmICh2ZXJzaW9uID09PSA0Mikge1xuXHRcdFx0Ly8gVElGRiBmaWxlIGhlYWRlclxuXHRcdFx0aWYgKGlmZE9mZnNldCA+PSA2KSB7XG5cdFx0XHRcdGlmICh0aGlzLmNoZWNrU3RyaW5nKCdDUicsIHtvZmZzZXQ6IDh9KSkge1xuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRleHQ6ICdjcjInLFxuXHRcdFx0XHRcdFx0bWltZTogJ2ltYWdlL3gtY2Fub24tY3IyJyxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGlmZE9mZnNldCA+PSA4ICYmICh0aGlzLmNoZWNrKFsweDFDLCAweDAwLCAweEZFLCAweDAwXSwge29mZnNldDogOH0pIHx8IHRoaXMuY2hlY2soWzB4MUYsIDB4MDAsIDB4MEIsIDB4MDBdLCB7b2Zmc2V0OiA4fSkpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGV4dDogJ25lZicsXG5cdFx0XHRcdFx0XHRtaW1lOiAnaW1hZ2UveC1uaWtvbi1uZWYnLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0YXdhaXQgdGhpcy50b2tlbml6ZXIuaWdub3JlKGlmZE9mZnNldCk7XG5cdFx0XHRjb25zdCBmaWxlVHlwZSA9IGF3YWl0IHRoaXMucmVhZFRpZmZJRkQoYmlnRW5kaWFuKTtcblx0XHRcdHJldHVybiBmaWxlVHlwZSA/PyB7XG5cdFx0XHRcdGV4dDogJ3RpZicsXG5cdFx0XHRcdG1pbWU6ICdpbWFnZS90aWZmJyxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0aWYgKHZlcnNpb24gPT09IDQzKSB7XHQvLyBCaWcgVElGRiBmaWxlIGhlYWRlclxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0ZXh0OiAndGlmJyxcblx0XHRcdFx0bWltZTogJ2ltYWdlL3RpZmYnLFxuXHRcdFx0fTtcblx0XHR9XG5cdH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbGVUeXBlU3RyZWFtKHJlYWRhYmxlU3RyZWFtLCBvcHRpb25zID0ge30pIHtcblx0cmV0dXJuIG5ldyBGaWxlVHlwZVBhcnNlcigpLnRvRGV0ZWN0aW9uU3RyZWFtKHJlYWRhYmxlU3RyZWFtLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZEV4dGVuc2lvbnMgPSBuZXcgU2V0KGV4dGVuc2lvbnMpO1xuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZE1pbWVUeXBlcyA9IG5ldyBTZXQobWltZVR5cGVzKTtcbiIsImltcG9ydCB7ZmlsZVR5cGVGcm9tQnVmZmVyfSBmcm9tICdmaWxlLXR5cGUnO1xuXG5jb25zdCBpbWFnZUV4dGVuc2lvbnMgPSBuZXcgU2V0KFtcblx0J2pwZycsXG5cdCdwbmcnLFxuXHQnZ2lmJyxcblx0J3dlYnAnLFxuXHQnZmxpZicsXG5cdCdjcjInLFxuXHQndGlmJyxcblx0J2JtcCcsXG5cdCdqeHInLFxuXHQncHNkJyxcblx0J2ljbycsXG5cdCdicGcnLFxuXHQnanAyJyxcblx0J2pwbScsXG5cdCdqcHgnLFxuXHQnaGVpYycsXG5cdCdjdXInLFxuXHQnZGNtJyxcblx0J2F2aWYnLFxuXSk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGltYWdlVHlwZShpbnB1dCkge1xuXHRjb25zdCByZXN1bHQgPSBhd2FpdCBmaWxlVHlwZUZyb21CdWZmZXIoaW5wdXQpO1xuXHRyZXR1cm4gaW1hZ2VFeHRlbnNpb25zLmhhcyhyZXN1bHQ/LmV4dCkgJiYgcmVzdWx0O1xufVxuXG5leHBvcnQgY29uc3QgbWluaW11bUJ5dGVzID0gNDEwMDtcbiIsIi8vINin2YTYudix2KjZitipXG5cbmV4cG9ydCBkZWZhdWx0IHt9O1xuIiwiLy8gxI1lxaF0aW5hXG5cbmV4cG9ydCBkZWZhdWx0IHt9O1xuIiwiLy8gRGFuc2tcblxuZXhwb3J0IGRlZmF1bHQge307XG4iLCIvLyBEZXV0c2NoXG5cbmV4cG9ydCBkZWZhdWx0IHt9OyIsIi8vIEVuZ2xpc2hcblxuZXhwb3J0IGRlZmF1bHQge1xuICAvLyBzZXR0aW5nLnRzXG4gIFwiUGx1Z2luIFNldHRpbmdzXCI6IFwiUGx1Z2luIFNldHRpbmdzXCIsXG4gIFwiQXV0byBwYXN0ZWQgdXBsb2FkXCI6IFwiQXV0byBwYXN0ZWQgdXBsb2FkXCIsXG4gIFwiSWYgeW91IHNldCB0aGlzIHZhbHVlIHRydWUsIHdoZW4geW91IHBhc3RlIGltYWdlLCBpdCB3aWxsIGJlIGF1dG8gdXBsb2FkZWQoeW91IHNob3VsZCBzZXQgdGhlIHBpY0dvIHNlcnZlciByaWdodGx5KVwiOlxuICAgIFwiSWYgeW91IHNldCB0aGlzIHZhbHVlIHRydWUsIHdoZW4geW91IHBhc3RlIGltYWdlLCBpdCB3aWxsIGJlIGF1dG8gdXBsb2FkZWQoeW91IHNob3VsZCBzZXQgdGhlIHBpY0dvIHNlcnZlciByaWdodGx5KVwiLFxuICBcIkRlZmF1bHQgdXBsb2FkZXJcIjogXCJEZWZhdWx0IHVwbG9hZGVyXCIsXG4gIFwiUGljR28gc2VydmVyXCI6IFwiUGljR28gc2VydmVyIHVwbG9hZCByb3V0ZVwiLFxuICBcIlBpY0dvIHNlcnZlciBkZXNjXCI6XG4gICAgXCJ1cGxvYWQgcm91dGUsIHVzZSBQaWNMaXN0IHdpbGwgYmUgYWJsZSB0byBzZXQgcGljYmVkIGFuZCBjb25maWcgdGhyb3VnaCBxdWVyeVwiLFxuICBcIlBsZWFzZSBpbnB1dCBQaWNHbyBzZXJ2ZXJcIjogXCJQbGVhc2UgaW5wdXQgdXBsb2FkIHJvdXRlXCIsXG4gIFwiUGljR28gZGVsZXRlIHNlcnZlclwiOlxuICAgIFwiUGljR28gc2VydmVyIGRlbGV0ZSByb3V0ZSh5b3UgbmVlZCB0byB1c2UgUGljTGlzdCBhcHApXCIsXG4gIFwiUGljTGlzdCBkZXNjXCI6IFwiU2VhcmNoIFBpY0xpc3Qgb24gR2l0aHViIHRvIGRvd25sb2FkIGFuZCBpbnN0YWxsXCIsXG4gIFwiUGxlYXNlIGlucHV0IFBpY0dvIGRlbGV0ZSBzZXJ2ZXJcIjogXCJQbGVhc2UgaW5wdXQgZGVsZXRlIHNlcnZlclwiLFxuICBcIkRlbGV0ZSBpbWFnZSB1c2luZyBQaWNMaXN0XCI6IFwiRGVsZXRlIGltYWdlIHVzaW5nIFBpY0xpc3RcIixcbiAgXCJQaWNHby1Db3JlIHBhdGhcIjogXCJQaWNHby1Db3JlIHBhdGhcIixcbiAgXCJEZWxldGUgc3VjY2Vzc2Z1bGx5XCI6IFwiRGVsZXRlIHN1Y2Nlc3NmdWxseVwiLFxuICBcIkRlbGV0ZSBmYWlsZWRcIjogXCJEZWxldGUgZmFpbGVkXCIsXG4gIFwiSW1hZ2Ugc2l6ZSBzdWZmaXhcIjogXCJJbWFnZSBzaXplIHN1ZmZpeFwiLFxuICBcIkltYWdlIHNpemUgc3VmZml4IERlc2NyaXB0aW9uXCI6IFwibGlrZSB8MzAwIGZvciByZXNpemUgaW1hZ2UgaW4gb2IuXCIsXG4gIFwiUGxlYXNlIGlucHV0IGltYWdlIHNpemUgc3VmZml4XCI6IFwiUGxlYXNlIGlucHV0IGltYWdlIHNpemUgc3VmZml4XCIsXG4gIFwiRXJyb3IsIGNvdWxkIG5vdCBkZWxldGVcIjogXCJFcnJvciwgY291bGQgbm90IGRlbGV0ZVwiLFxuICBcIlBsZWFzZSBpbnB1dCBQaWNHby1Db3JlIHBhdGgsIGRlZmF1bHQgdXNpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzXCI6XG4gICAgXCJQbGVhc2UgaW5wdXQgUGljR28tQ29yZSBwYXRoLCBkZWZhdWx0IHVzaW5nIGVudmlyb25tZW50IHZhcmlhYmxlc1wiLFxuICBcIldvcmsgb24gbmV0d29ya1wiOiBcIldvcmsgb24gbmV0d29ya1wiLFxuICBcIldvcmsgb24gbmV0d29yayBEZXNjcmlwdGlvblwiOlxuICAgIFwiQWxsb3cgdXBsb2FkIG5ldHdvcmsgaW1hZ2UgYnkgJ1VwbG9hZCBhbGwnIGNvbW1hbmQuXFxuIE9yIHdoZW4geW91IHBhc3RlLCBtZCBzdGFuZGFyZCBpbWFnZSBsaW5rIGluIHlvdXIgY2xpcGJvYXJkIHdpbGwgYmUgYXV0byB1cGxvYWQuXCIsXG4gIGZpeFBhdGg6IFwiZml4UGF0aFwiLFxuICBmaXhQYXRoV2FybmluZzpcbiAgICBcIlRoaXMgb3B0aW9uIGlzIHVzZWQgdG8gZml4IFBpY0dvLWNvcmUgdXBsb2FkIGZhaWx1cmVzIG9uIExpbnV4IGFuZCBNYWMuIEl0IG1vZGlmaWVzIHRoZSBQQVRIIHZhcmlhYmxlIHdpdGhpbiBPYnNpZGlhbi4gSWYgT2JzaWRpYW4gZW5jb3VudGVycyBhbnkgYnVncywgdHVybiBvZmYgdGhlIG9wdGlvbiwgdHJ5IGFnYWluISBcIixcbiAgXCJVcGxvYWQgd2hlbiBjbGlwYm9hcmQgaGFzIGltYWdlIGFuZCB0ZXh0IHRvZ2V0aGVyXCI6XG4gICAgXCJVcGxvYWQgd2hlbiBjbGlwYm9hcmQgaGFzIGltYWdlIGFuZCB0ZXh0IHRvZ2V0aGVyXCIsXG4gIFwiV2hlbiB5b3UgY29weSwgc29tZSBhcHBsaWNhdGlvbiBsaWtlIEV4Y2VsIHdpbGwgaW1hZ2UgYW5kIHRleHQgdG8gY2xpcGJvYXJkLCB5b3UgY2FuIHVwbG9hZCBvciBub3QuXCI6XG4gICAgXCJXaGVuIHlvdSBjb3B5LCBzb21lIGFwcGxpY2F0aW9uIGxpa2UgRXhjZWwgd2lsbCBpbWFnZSBhbmQgdGV4dCB0byBjbGlwYm9hcmQsIHlvdSBjYW4gdXBsb2FkIG9yIG5vdC5cIixcbiAgXCJOZXR3b3JrIERvbWFpbiBCbGFjayBMaXN0XCI6IFwiTmV0d29yayBEb21haW4gQmxhY2sgTGlzdFwiLFxuICBcIk5ldHdvcmsgRG9tYWluIEJsYWNrIExpc3QgRGVzY3JpcHRpb25cIjpcbiAgICBcIkltYWdlIGluIHRoZSBkb21haW4gbGlzdCB3aWxsIG5vdCBiZSB1cGxvYWQsdXNlIGNvbW1hIHNlcGFyYXRlZFwiLFxuICBcIkRlbGV0ZSBzb3VyY2UgZmlsZSBhZnRlciB5b3UgdXBsb2FkIGZpbGVcIjpcbiAgICBcIkRlbGV0ZSBzb3VyY2UgZmlsZSBhZnRlciB5b3UgdXBsb2FkIGZpbGVcIixcbiAgXCJEZWxldGUgc291cmNlIGZpbGUgaW4gb2IgYXNzZXRzIGFmdGVyIHlvdSB1cGxvYWQgZmlsZS5cIjpcbiAgICBcIkRlbGV0ZSBzb3VyY2UgZmlsZSBpbiBvYiBhc3NldHMgYWZ0ZXIgeW91IHVwbG9hZCBmaWxlLlwiLFxuICBcIkltYWdlIGRlc2NcIjogXCJJbWFnZSBkZXNjXCIsXG4gIHJlc2VydmU6IFwiZGVmYXVsdFwiLFxuICBcInJlbW92ZSBhbGxcIjogXCJub25lXCIsXG4gIFwicmVtb3ZlIGRlZmF1bHRcIjogXCJyZW1vdmUgaW1hZ2UucG5nXCIsXG4gIFwiUmVtb3RlIHNlcnZlciBtb2RlXCI6IFwiUmVtb3RlIHNlcnZlciBtb2RlXCIsXG4gIFwiUmVtb3RlIHNlcnZlciBtb2RlIGRlc2NcIjpcbiAgICBcIklmIHlvdSBoYXZlIGRlcGxveWVkIHBpY2xpc3QtY29yZSBvciBwaWNsaXN0IG9uIHRoZSBzZXJ2ZXIuXCIsXG4gIFwiQ2FuIG5vdCBmaW5kIGltYWdlIGZpbGVcIjogXCJDYW4gbm90IGZpbmQgaW1hZ2UgZmlsZVwiLFxuICBcIkZpbGUgaGFzIGJlZW4gY2hhbmdlZGQsIHVwbG9hZCBmYWlsdXJlXCI6XG4gICAgXCJGaWxlIGhhcyBiZWVuIGNoYW5nZWRkLCB1cGxvYWQgZmFpbHVyZVwiLFxuICBcIkZpbGUgaGFzIGJlZW4gY2hhbmdlZGQsIGRvd25sb2FkIGZhaWx1cmVcIjpcbiAgICBcIkZpbGUgaGFzIGJlZW4gY2hhbmdlZGQsIGRvd25sb2FkIGZhaWx1cmVcIixcbiAgXCJXYXJuaW5nOiB1cGxvYWQgZmlsZXMgaXMgZGlmZmVyZW50IG9mIHJlY2l2ZXIgZmlsZXMgZnJvbSBhcGlcIjpcbiAgICBcIldhcm5pbmc6IHVwbG9hZCBmaWxlcyBudW0gaXMgZGlmZmVyZW50IG9mIHJlY2l2ZXIgZmlsZXMgZnJvbSBhcGlcIixcbn07XG4iLCIvLyBCcml0aXNoIEVuZ2xpc2hcblxuZXhwb3J0IGRlZmF1bHQge307XG4iLCIvLyBFc3Bhw7FvbFxuXG5leHBvcnQgZGVmYXVsdCB7fTtcbiIsIi8vIGZyYW7Dp2Fpc1xuXG5leHBvcnQgZGVmYXVsdCB7fTtcbiIsIi8vIOCkueCkv+CkqOCljeCkpuClgFxuXG5leHBvcnQgZGVmYXVsdCB7fTtcbiIsIi8vIEJhaGFzYSBJbmRvbmVzaWFcblxuZXhwb3J0IGRlZmF1bHQge307XG4iLCIvLyBJdGFsaWFub1xuXG5leHBvcnQgZGVmYXVsdCB7fTtcbiIsIi8vIOaXpeacrOiqnlxuXG5leHBvcnQgZGVmYXVsdCB7fTsiLCIvLyDtlZzqta3slrRcblxuZXhwb3J0IGRlZmF1bHQge307XG4iLCIvLyBOZWRlcmxhbmRzXG5cbmV4cG9ydCBkZWZhdWx0IHt9O1xuIiwiLy8gTm9yc2tcblxuZXhwb3J0IGRlZmF1bHQge307XG4iLCIvLyBqxJl6eWsgcG9sc2tpXG5cbmV4cG9ydCBkZWZhdWx0IHt9O1xuIiwiLy8gUG9ydHVndcOqc1xuXG5leHBvcnQgZGVmYXVsdCB7fTtcbiIsIi8vIFBvcnR1Z3XDqnMgZG8gQnJhc2lsXG4vLyBCcmF6aWxpYW4gUG9ydHVndWVzZVxuXG5leHBvcnQgZGVmYXVsdCB7fTsiLCIvLyBSb23Dom7Eg1xuXG5leHBvcnQgZGVmYXVsdCB7fTtcbiIsIi8vINGA0YPRgdGB0LrQuNC5XG5cbmV4cG9ydCBkZWZhdWx0IHt9O1xuIiwiLy8gVMO8cmvDp2VcblxuZXhwb3J0IGRlZmF1bHQge307XG4iLCIvLyDnroDkvZPkuK3mlodcblxuZXhwb3J0IGRlZmF1bHQge1xuICAvLyBzZXR0aW5nLnRzXG4gIFwiUGx1Z2luIFNldHRpbmdzXCI6IFwi5o+S5Lu26K6+572uXCIsXG4gIFwiQXV0byBwYXN0ZWQgdXBsb2FkXCI6IFwi5Ymq5YiH5p2/6Ieq5Yqo5LiK5LygXCIsXG4gIFwiSWYgeW91IHNldCB0aGlzIHZhbHVlIHRydWUsIHdoZW4geW91IHBhc3RlIGltYWdlLCBpdCB3aWxsIGJlIGF1dG8gdXBsb2FkZWQoeW91IHNob3VsZCBzZXQgdGhlIHBpY0dvIHNlcnZlciByaWdodGx5KVwiOlxuICAgIFwi5ZCv55So6K+l6YCJ6aG55ZCO77yM6buP6LS05Zu+54mH5pe25Lya6Ieq5Yqo5LiK5Lyg77yI5L2g6ZyA6KaB5q2j56Gu6YWN572ucGljZ2/vvIlcIixcbiAgXCJEZWZhdWx0IHVwbG9hZGVyXCI6IFwi6buY6K6k5LiK5Lyg5ZmoXCIsXG4gIFwiUGljR28gc2VydmVyXCI6IFwiUGljR28gc2VydmVyIOS4iuS8oOaOpeWPo1wiLFxuICBcIlBpY0dvIHNlcnZlciBkZXNjXCI6IFwi5LiK5Lyg5o6l5Y+j77yM5L2/55SoUGljTGlzdOaXtuWPr+mAmui/h+iuvue9rlVSTOWPguaVsOaMh+WumuWbvuW6iuWSjOmFjee9rlwiLFxuICBcIlBsZWFzZSBpbnB1dCBQaWNHbyBzZXJ2ZXJcIjogXCLor7fovpPlhaXkuIrkvKDmjqXlj6PlnLDlnYBcIixcbiAgXCJQaWNHbyBkZWxldGUgc2VydmVyXCI6IFwiUGljR28gc2VydmVyIOWIoOmZpOaOpeWPoyjor7fkvb/nlKhQaWNMaXN05p2l5ZCv55So5q2k5Yqf6IO9KVwiLFxuICBcIlBpY0xpc3QgZGVzY1wiOiBcIlBpY0xpc3TmmK9QaWNHb+S6jOasoeW8gOWPkeeJiO+8jOivt0dpdGh1YuaQnOe0olBpY0xpc3TkuIvovb1cIixcbiAgXCJQbGVhc2UgaW5wdXQgUGljR28gZGVsZXRlIHNlcnZlclwiOiBcIuivt+i+k+WFpeWIoOmZpOaOpeWPo+WcsOWdgFwiLFxuICBcIkRlbGV0ZSBpbWFnZSB1c2luZyBQaWNMaXN0XCI6IFwi5L2/55SoIFBpY0xpc3Qg5Yig6Zmk5Zu+54mHXCIsXG4gIFwiUGljR28tQ29yZSBwYXRoXCI6IFwiUGljR28tQ29yZSDot6/lvoRcIixcbiAgXCJEZWxldGUgc3VjY2Vzc2Z1bGx5XCI6IFwi5Yig6Zmk5oiQ5YqfXCIsXG4gIFwiRGVsZXRlIGZhaWxlZFwiOiBcIuWIoOmZpOWksei0pVwiLFxuICBcIkVycm9yLCBjb3VsZCBub3QgZGVsZXRlXCI6IFwi6ZSZ6K+v77yM5peg5rOV5Yig6ZmkXCIsXG4gIFwiSW1hZ2Ugc2l6ZSBzdWZmaXhcIjogXCLlm77niYflpKflsI/lkI7nvIBcIixcbiAgXCJJbWFnZSBzaXplIHN1ZmZpeCBEZXNjcmlwdGlvblwiOiBcIuavlOWmgu+8mnwzMDAg55So5LqO6LCD5pW05Zu+54mH5aSn5bCPXCIsXG4gIFwiUGxlYXNlIGlucHV0IGltYWdlIHNpemUgc3VmZml4XCI6IFwi6K+36L6T5YWl5Zu+54mH5aSn5bCP5ZCO57yAXCIsXG4gIFwiUGxlYXNlIGlucHV0IFBpY0dvLUNvcmUgcGF0aCwgZGVmYXVsdCB1c2luZyBlbnZpcm9ubWVudCB2YXJpYWJsZXNcIjpcbiAgICBcIuivt+i+k+WFpSBQaWNHby1Db3JlIHBhdGjvvIzpu5jorqTkvb/nlKjnjq/looPlj5jph49cIixcbiAgXCJXb3JrIG9uIG5ldHdvcmtcIjogXCLlupTnlKjnvZHnu5zlm77niYdcIixcbiAgXCJXb3JrIG9uIG5ldHdvcmsgRGVzY3JpcHRpb25cIjpcbiAgICBcIuW9k+S9oOS4iuS8oOaJgOacieWbvueJh+aXtu+8jOS5n+S8muS4iuS8oOe9kee7nOWbvueJh+OAguS7peWPiuW9k+S9oOi/m+ihjOm7j+i0tOaXtu+8jOWJquWIh+adv+S4reeahOagh+WHhiBtZCDlm77niYfkvJrooqvkuIrkvKBcIixcbiAgZml4UGF0aDogXCLkv67mraNQQVRI5Y+Y6YePXCIsXG4gIGZpeFBhdGhXYXJuaW5nOlxuICAgIFwi5q2k6YCJ6aG555So5LqO5L+u5aSNTGludXjlkoxNYWPkuIogUGljR28tQ29yZSDkuIrkvKDlpLHotKXnmoTpl67popjjgILlroPkvJrkv67mlLkgT2JzaWRpYW4g5YaF55qEIFBBVEgg5Y+Y6YeP77yM5aaC5p6cIE9ic2lkaWFuIOmBh+WIsOS7u+S9lUJVR++8jOWFiOWFs+mXrei/meS4qumAiemhueivleivle+8gVwiLFxuICBcIlVwbG9hZCB3aGVuIGNsaXBib2FyZCBoYXMgaW1hZ2UgYW5kIHRleHQgdG9nZXRoZXJcIjpcbiAgICBcIuW9k+WJquWIh+adv+WQjOaXtuaLpeacieaWh+acrOWSjOWbvueJh+WJquWIh+adv+aVsOaNruaXtuaYr+WQpuS4iuS8oOWbvueJh1wiLFxuICBcIldoZW4geW91IGNvcHksIHNvbWUgYXBwbGljYXRpb24gbGlrZSBFeGNlbCB3aWxsIGltYWdlIGFuZCB0ZXh0IHRvIGNsaXBib2FyZCwgeW91IGNhbiB1cGxvYWQgb3Igbm90LlwiOlxuICAgIFwi5b2T5L2g5aSN5Yi25pe277yM5p+Q5Lqb5bqU55So5L6L5aaCIEV4Y2VsIOS8muWcqOWJquWIh+adv+WQjOaXtuaWh+acrOWSjOWbvuWDj+aVsOaNru+8jOehruiupOaYr+WQpuS4iuS8oOOAglwiLFxuICBcIk5ldHdvcmsgRG9tYWluIEJsYWNrIExpc3RcIjogXCLnvZHnu5zlm77niYfln5/lkI3pu5HlkI3ljZVcIixcbiAgXCJOZXR3b3JrIERvbWFpbiBCbGFjayBMaXN0IERlc2NyaXB0aW9uXCI6XG4gICAgXCLpu5HlkI3ljZXln5/lkI3kuK3nmoTlm77niYflsIbkuI3kvJrooqvkuIrkvKDvvIznlKjoi7HmlofpgJflj7fliIblibJcIixcbiAgXCJEZWxldGUgc291cmNlIGZpbGUgYWZ0ZXIgeW91IHVwbG9hZCBmaWxlXCI6IFwi5LiK5Lyg5paH5Lu25ZCO56e76Zmk5rqQ5paH5Lu2XCIsXG4gIFwiRGVsZXRlIHNvdXJjZSBmaWxlIGluIG9iIGFzc2V0cyBhZnRlciB5b3UgdXBsb2FkIGZpbGUuXCI6XG4gICAgXCLkuIrkvKDmlofku7blkI7np7vpmaTlnKhvYumZhOS7tuaWh+S7tuWkueS4reeahOaWh+S7tlwiLFxuICBcIkltYWdlIGRlc2NcIjogXCLlm77niYfmj4/ov7BcIixcbiAgcmVzZXJ2ZTogXCLpu5jorqRcIixcbiAgXCJyZW1vdmUgYWxsXCI6IFwi5pegXCIsXG4gIFwicmVtb3ZlIGRlZmF1bHRcIjogXCLnp7vpmaRpbWFnZS5wbmdcIixcbiAgXCJSZW1vdGUgc2VydmVyIG1vZGVcIjogXCLov5znqIvmnI3liqHlmajmqKHlvI9cIixcbiAgXCJSZW1vdGUgc2VydmVyIG1vZGUgZGVzY1wiOiBcIuWmguaenOS9oOWcqOacjeWKoeWZqOmDqOe9suS6hnBpY2xpc3QtY29yZeaIluiAhXBpY2xpc3RcIixcbiAgXCJDYW4gbm90IGZpbmQgaW1hZ2UgZmlsZVwiOiBcIuayoeacieino+aekOWIsOWbvuWDj+aWh+S7tlwiLFxuICBcIkZpbGUgaGFzIGJlZW4gY2hhbmdlZGQsIHVwbG9hZCBmYWlsdXJlXCI6IFwi5b2T5YmN5paH5Lu25bey5Y+Y5pu077yM5LiK5Lyg5aSx6LSlXCIsXG4gIFwiRmlsZSBoYXMgYmVlbiBjaGFuZ2VkZCwgZG93bmxvYWQgZmFpbHVyZVwiOiBcIuW9k+WJjeaWh+S7tuW3suWPmOabtO+8jOS4i+i9veWksei0pVwiLFxuICBcIldhcm5pbmc6IHVwbG9hZCBmaWxlcyBpcyBkaWZmZXJlbnQgb2YgcmVjaXZlciBmaWxlcyBmcm9tIGFwaVwiOlxuICAgIFwi6K2m5ZGK77ya5LiK5Lyg55qE5paH5Lu25LiO5o6l5Y+j6L+U5Zue55qE5paH5Lu25pWw6YeP5LiN5LiA6Ie0XCIsXG59O1xuIiwiLy8g57mB6auU5Lit5paHXG5cbmV4cG9ydCBkZWZhdWx0IHt9O1xuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuXG5pbXBvcnQgYXIgZnJvbSAnLi9sb2NhbGUvYXInO1xuaW1wb3J0IGN6IGZyb20gJy4vbG9jYWxlL2N6JztcbmltcG9ydCBkYSBmcm9tICcuL2xvY2FsZS9kYSc7XG5pbXBvcnQgZGUgZnJvbSAnLi9sb2NhbGUvZGUnO1xuaW1wb3J0IGVuIGZyb20gJy4vbG9jYWxlL2VuJztcbmltcG9ydCBlbkdCIGZyb20gJy4vbG9jYWxlL2VuLWdiJztcbmltcG9ydCBlcyBmcm9tICcuL2xvY2FsZS9lcyc7XG5pbXBvcnQgZnIgZnJvbSAnLi9sb2NhbGUvZnInO1xuaW1wb3J0IGhpIGZyb20gJy4vbG9jYWxlL2hpJztcbmltcG9ydCBpZCBmcm9tICcuL2xvY2FsZS9pZCc7XG5pbXBvcnQgaXQgZnJvbSAnLi9sb2NhbGUvaXQnO1xuaW1wb3J0IGphIGZyb20gJy4vbG9jYWxlL2phJztcbmltcG9ydCBrbyBmcm9tICcuL2xvY2FsZS9rbyc7XG5pbXBvcnQgbmwgZnJvbSAnLi9sb2NhbGUvbmwnO1xuaW1wb3J0IG5vIGZyb20gJy4vbG9jYWxlL25vJztcbmltcG9ydCBwbCBmcm9tICcuL2xvY2FsZS9wbCc7XG5pbXBvcnQgcHQgZnJvbSAnLi9sb2NhbGUvcHQnO1xuaW1wb3J0IHB0QlIgZnJvbSAnLi9sb2NhbGUvcHQtYnInO1xuaW1wb3J0IHJvIGZyb20gJy4vbG9jYWxlL3JvJztcbmltcG9ydCBydSBmcm9tICcuL2xvY2FsZS9ydSc7XG5pbXBvcnQgdHIgZnJvbSAnLi9sb2NhbGUvdHInO1xuaW1wb3J0IHpoQ04gZnJvbSAnLi9sb2NhbGUvemgtY24nO1xuaW1wb3J0IHpoVFcgZnJvbSAnLi9sb2NhbGUvemgtdHcnO1xuXG5jb25zdCBsb2NhbGVNYXA6IHsgW2s6IHN0cmluZ106IFBhcnRpYWw8dHlwZW9mIGVuPiB9ID0ge1xuICBhcixcbiAgY3M6IGN6LFxuICBkYSxcbiAgZGUsXG4gIGVuLFxuICAnZW4tZ2InOiBlbkdCLFxuICBlcyxcbiAgZnIsXG4gIGhpLFxuICBpZCxcbiAgaXQsXG4gIGphLFxuICBrbyxcbiAgbmwsXG4gIG5uOiBubyxcbiAgcGwsXG4gIHB0LFxuICAncHQtYnInOiBwdEJSLFxuICBybyxcbiAgcnUsXG4gIHRyLFxuICAnemgtY24nOiB6aENOLFxuICAnemgtdHcnOiB6aFRXLFxufTtcblxuY29uc3QgbG9jYWxlID0gbG9jYWxlTWFwW21vbWVudC5sb2NhbGUoKV07XG5cbmV4cG9ydCBmdW5jdGlvbiB0KHN0cjoga2V5b2YgdHlwZW9mIGVuKTogc3RyaW5nIHtcbiAgcmV0dXJuIChsb2NhbGUgJiYgbG9jYWxlW3N0cl0pIHx8IGVuW3N0cl07XG59XG4iLCJpbXBvcnQgeyBub3JtYWxpemVQYXRoLCBOb3RpY2UsIHJlcXVlc3RVcmwgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuaW1wb3J0IHsgcmVsYXRpdmUsIGpvaW4sIHBhcnNlIH0gZnJvbSBcInBhdGgtYnJvd3NlcmlmeVwiO1xuaW1wb3J0IGltYWdlVHlwZSBmcm9tIFwiaW1hZ2UtdHlwZVwiO1xuXG5pbXBvcnQgeyBnZXRVcmxBc3NldCwgdXVpZCB9IGZyb20gXCIuL3V0aWxzXCI7XG5pbXBvcnQgeyB0IH0gZnJvbSBcIi4vbGFuZy9oZWxwZXJzXCI7XG5pbXBvcnQgdHlwZSBpbWFnZUF1dG9VcGxvYWRQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRBbGxJbWFnZUZpbGVzKHBsdWdpbjogaW1hZ2VBdXRvVXBsb2FkUGx1Z2luKSB7XG4gIGNvbnN0IGFjdGl2ZUZpbGUgPSBwbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gIGNvbnN0IGZvbGRlclBhdGggPSBhd2FpdCBwbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLmdldEF2YWlsYWJsZVBhdGhGb3JBdHRhY2htZW50KFxuICAgIFwiXCJcbiAgKTtcblxuICBjb25zdCBmaWxlQXJyYXkgPSBwbHVnaW4uaGVscGVyLmdldEFsbEZpbGVzKCk7XG5cbiAgaWYgKCEoYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhmb2xkZXJQYXRoKSkpIHtcbiAgICBhd2FpdCBwbHVnaW4uYXBwLnZhdWx0LmFkYXB0ZXIubWtkaXIoZm9sZGVyUGF0aCk7XG4gIH1cblxuICBsZXQgaW1hZ2VBcnJheSA9IFtdO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZUFycmF5KSB7XG4gICAgaWYgKCFmaWxlLnBhdGguc3RhcnRzV2l0aChcImh0dHBcIikpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHVybCA9IGZpbGUucGF0aDtcbiAgICBjb25zdCBhc3NldCA9IGdldFVybEFzc2V0KHVybCk7XG4gICAgbGV0IG5hbWUgPSBkZWNvZGVVUkkocGFyc2UoYXNzZXQpLm5hbWUpLnJlcGxhY2VBbGwoL1tcXFxcXFxcXC86Kj9cXFwiPD58XS9nLCBcIi1cIik7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGRvd25sb2FkKHBsdWdpbiwgdXJsLCBmb2xkZXJQYXRoLCBuYW1lKTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnN0IGFjdGl2ZUZvbGRlciA9IHBsdWdpbi5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKS5wYXJlbnQucGF0aDtcblxuICAgICAgaW1hZ2VBcnJheS5wdXNoKHtcbiAgICAgICAgc291cmNlOiBmaWxlLnNvdXJjZSxcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgcGF0aDogbm9ybWFsaXplUGF0aChcbiAgICAgICAgICByZWxhdGl2ZShub3JtYWxpemVQYXRoKGFjdGl2ZUZvbGRlciksIG5vcm1hbGl6ZVBhdGgocmVzcG9uc2UucGF0aCkpXG4gICAgICAgICksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBsZXQgdmFsdWUgPSBwbHVnaW4uaGVscGVyLmdldFZhbHVlKCk7XG4gIGltYWdlQXJyYXkubWFwKGltYWdlID0+IHtcbiAgICBsZXQgbmFtZSA9IHBsdWdpbi5oYW5kbGVOYW1lKGltYWdlLm5hbWUpO1xuXG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKGltYWdlLnNvdXJjZSwgYCFbJHtuYW1lfV0oJHtlbmNvZGVVUkkoaW1hZ2UucGF0aCl9KWApO1xuICB9KTtcblxuICBjb25zdCBjdXJyZW50RmlsZSA9IHBsdWdpbi5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgaWYgKGFjdGl2ZUZpbGUucGF0aCAhPT0gY3VycmVudEZpbGUucGF0aCkge1xuICAgIG5ldyBOb3RpY2UodChcIkZpbGUgaGFzIGJlZW4gY2hhbmdlZGQsIGRvd25sb2FkIGZhaWx1cmVcIikpO1xuICAgIHJldHVybjtcbiAgfVxuICBwbHVnaW4uaGVscGVyLnNldFZhbHVlKHZhbHVlKTtcblxuICBuZXcgTm90aWNlKFxuICAgIGBhbGw6ICR7ZmlsZUFycmF5Lmxlbmd0aH1cXG5zdWNjZXNzOiAke2ltYWdlQXJyYXkubGVuZ3RofVxcbmZhaWxlZDogJHtcbiAgICAgIGZpbGVBcnJheS5sZW5ndGggLSBpbWFnZUFycmF5Lmxlbmd0aFxuICAgIH1gXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkKFxuICBwbHVnaW46IGltYWdlQXV0b1VwbG9hZFBsdWdpbixcbiAgdXJsOiBzdHJpbmcsXG4gIGZvbGRlclBhdGg6IHN0cmluZyxcbiAgbmFtZTogc3RyaW5nXG4pIHtcbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHsgdXJsIH0pO1xuXG4gIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBtc2c6IFwiZXJyb3JcIixcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgdHlwZSA9IGF3YWl0IGltYWdlVHlwZShuZXcgVWludDhBcnJheShyZXNwb25zZS5hcnJheUJ1ZmZlcikpO1xuICBpZiAoIXR5cGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IGZhbHNlLFxuICAgICAgbXNnOiBcImVycm9yXCIsXG4gICAgfTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgbGV0IHBhdGggPSBub3JtYWxpemVQYXRoKGpvaW4oZm9sZGVyUGF0aCwgYCR7bmFtZX0uJHt0eXBlLmV4dH1gKSk7XG5cbiAgICAvLyDlpoLmnpzmlofku7blkI3lt7LlrZjlnKjvvIzliJnnlKjpmo/mnLrlgLzmm7/mjaLvvIzkuI3lr7nmlofku7blkI7nvIDov5vooYzliKTmlq1cbiAgICBpZiAoYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhwYXRoKSkge1xuICAgICAgcGF0aCA9IG5vcm1hbGl6ZVBhdGgoam9pbihmb2xkZXJQYXRoLCBgJHt1dWlkKCl9LiR7dHlwZS5leHR9YCkpO1xuICAgIH1cblxuICAgIHBsdWdpbi5hcHAudmF1bHQuYWRhcHRlci53cml0ZUJpbmFyeShwYXRoLCByZXNwb25zZS5hcnJheUJ1ZmZlcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgbXNnOiBcIm9rXCIsXG4gICAgICBwYXRoOiBwYXRoLFxuICAgICAgdHlwZSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IGZhbHNlLFxuICAgICAgbXNnOiBlcnIsXG4gICAgfTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tIFwiZnNcIjtcblxuaW1wb3J0IHsgUGx1Z2luU2V0dGluZ3MgfSBmcm9tIFwiLi9zZXR0aW5nXCI7XG5pbXBvcnQgeyBzdHJlYW1Ub1N0cmluZywgZ2V0TGFzdEltYWdlLCBidWZmZXJUb0FycmF5QnVmZmVyIH0gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCB7IGV4ZWMgfSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgcmVxdWVzdFVybCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IGltYWdlQXV0b1VwbG9hZFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGljR29SZXNwb25zZSB7XG4gIG1zZzogc3RyaW5nO1xuICByZXN1bHQ6IHN0cmluZ1tdO1xuICBmdWxsUmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+W107XG59XG5cbmV4cG9ydCBjbGFzcyBQaWNHb1VwbG9hZGVyIHtcbiAgc2V0dGluZ3M6IFBsdWdpblNldHRpbmdzO1xuICBwbHVnaW46IGltYWdlQXV0b1VwbG9hZFBsdWdpbjtcblxuICBjb25zdHJ1Y3RvcihzZXR0aW5nczogUGx1Z2luU2V0dGluZ3MsIHBsdWdpbjogaW1hZ2VBdXRvVXBsb2FkUGx1Z2luKSB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkRmlsZXMoZmlsZUxpc3Q6IEFycmF5PHN0cmluZz4pOiBQcm9taXNlPGFueT4ge1xuICAgIGxldCByZXNwb25zZTogYW55O1xuICAgIGxldCBkYXRhOiBQaWNHb1Jlc3BvbnNlO1xuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmVtb3RlU2VydmVyTW9kZSkge1xuICAgICAgY29uc3QgZmlsZXMgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVMaXN0W2ldO1xuICAgICAgICBjb25zdCBidWZmZXI6IEJ1ZmZlciA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICByZWFkRmlsZShmaWxlLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0gYnVmZmVyVG9BcnJheUJ1ZmZlcihidWZmZXIpO1xuICAgICAgICBmaWxlcy5wdXNoKG5ldyBGaWxlKFthcnJheUJ1ZmZlcl0sIGZpbGUpKTtcbiAgICAgIH1cbiAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy51cGxvYWRGaWxlQnlEYXRhKGZpbGVzKTtcbiAgICAgIGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogdGhpcy5zZXR0aW5ncy51cGxvYWRTZXJ2ZXIsXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBsaXN0OiBmaWxlTGlzdCB9KSxcbiAgICAgIH0pO1xuICAgICAgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb247XG4gICAgfVxuXG4gICAgLy8gcGljbGlzdFxuICAgIGlmIChkYXRhLmZ1bGxSZXN1bHQpIHtcbiAgICAgIGNvbnN0IHVwbG9hZFVybEZ1bGxSZXN1bHRMaXN0ID0gZGF0YS5mdWxsUmVzdWx0IHx8IFtdO1xuICAgICAgdGhpcy5zZXR0aW5ncy51cGxvYWRlZEltYWdlcyA9IFtcbiAgICAgICAgLi4uKHRoaXMuc2V0dGluZ3MudXBsb2FkZWRJbWFnZXMgfHwgW10pLFxuICAgICAgICAuLi51cGxvYWRVcmxGdWxsUmVzdWx0TGlzdCxcbiAgICAgIF07XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICBhc3luYyB1cGxvYWRGaWxlQnlEYXRhKGZpbGVMaXN0OiBGaWxlTGlzdCB8IEZpbGVbXSk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGZvcm0uYXBwZW5kKFwibGlzdFwiLCBmaWxlTGlzdFtpXSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIG1ldGhvZDogXCJwb3N0XCIsXG4gICAgICBib2R5OiBmb3JtLFxuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHRoaXMuc2V0dGluZ3MudXBsb2FkU2VydmVyLCBvcHRpb25zKTtcbiAgICBjb25zb2xlLmxvZyhcInJlc3BvbnNlXCIsIHJlc3BvbnNlKTtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH1cblxuICBhc3luYyB1cGxvYWRGaWxlQnlDbGlwYm9hcmQoZmlsZUxpc3Q/OiBGaWxlTGlzdCk6IFByb21pc2U8YW55PiB7XG4gICAgbGV0IGRhdGE6IFBpY0dvUmVzcG9uc2U7XG4gICAgbGV0IHJlczogYW55O1xuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucmVtb3RlU2VydmVyTW9kZSkge1xuICAgICAgcmVzID0gYXdhaXQgdGhpcy51cGxvYWRGaWxlQnlEYXRhKGZpbGVMaXN0KTtcbiAgICAgIGRhdGEgPSBhd2FpdCByZXMuanNvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXMgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiB0aGlzLnNldHRpbmdzLnVwbG9hZFNlcnZlcixcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIH0pO1xuXG4gICAgICBkYXRhID0gYXdhaXQgcmVzLmpzb247XG4gICAgfVxuXG4gICAgaWYgKHJlcy5zdGF0dXMgIT09IDIwMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29kZTogLTEsXG4gICAgICAgIG1zZzogZGF0YS5tc2csXG4gICAgICAgIGRhdGE6IFwiXCIsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHBpY2xpc3RcbiAgICBpZiAoZGF0YS5mdWxsUmVzdWx0KSB7XG4gICAgICBjb25zdCB1cGxvYWRVcmxGdWxsUmVzdWx0TGlzdCA9IGRhdGEuZnVsbFJlc3VsdCB8fCBbXTtcbiAgICAgIHRoaXMuc2V0dGluZ3MudXBsb2FkZWRJbWFnZXMgPSBbXG4gICAgICAgIC4uLih0aGlzLnNldHRpbmdzLnVwbG9hZGVkSW1hZ2VzIHx8IFtdKSxcbiAgICAgICAgLi4udXBsb2FkVXJsRnVsbFJlc3VsdExpc3QsXG4gICAgICBdO1xuICAgICAgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IDAsXG4gICAgICBtc2c6IFwic3VjY2Vzc1wiLFxuICAgICAgZGF0YTogdHlwZW9mIGRhdGEucmVzdWx0ID09IFwic3RyaW5nXCIgPyBkYXRhLnJlc3VsdCA6IGRhdGEucmVzdWx0WzBdLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBpY0dvQ29yZVVwbG9hZGVyIHtcbiAgc2V0dGluZ3M6IFBsdWdpblNldHRpbmdzO1xuICBwbHVnaW46IGltYWdlQXV0b1VwbG9hZFBsdWdpbjtcblxuICBjb25zdHJ1Y3RvcihzZXR0aW5nczogUGx1Z2luU2V0dGluZ3MsIHBsdWdpbjogaW1hZ2VBdXRvVXBsb2FkUGx1Z2luKSB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkRmlsZXMoZmlsZUxpc3Q6IEFycmF5PFN0cmluZz4pOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGxlbmd0aCA9IGZpbGVMaXN0Lmxlbmd0aDtcbiAgICBsZXQgY2xpID0gdGhpcy5zZXR0aW5ncy5waWNnb0NvcmVQYXRoIHx8IFwicGljZ29cIjtcbiAgICBsZXQgY29tbWFuZCA9IGAke2NsaX0gdXBsb2FkICR7ZmlsZUxpc3RcbiAgICAgIC5tYXAoaXRlbSA9PiBgXCIke2l0ZW19XCJgKVxuICAgICAgLmpvaW4oXCIgXCIpfWA7XG5cbiAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLmV4ZWMoY29tbWFuZCk7XG4gICAgY29uc3Qgc3BsaXRMaXN0ID0gcmVzLnNwbGl0KFwiXFxuXCIpO1xuICAgIGNvbnN0IHNwbGl0TGlzdExlbmd0aCA9IHNwbGl0TGlzdC5sZW5ndGg7XG5cbiAgICBjb25zdCBkYXRhID0gc3BsaXRMaXN0LnNwbGljZShzcGxpdExpc3RMZW5ndGggLSAxIC0gbGVuZ3RoLCBsZW5ndGgpO1xuXG4gICAgaWYgKHJlcy5pbmNsdWRlcyhcIlBpY0dvIEVSUk9SXCIpKSB7XG4gICAgICBjb25zb2xlLmxvZyhjb21tYW5kLCByZXMpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbXNnOiBcIuWksei0pVwiLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgcmVzdWx0OiBkYXRhLFxuICAgICAgfTtcbiAgICB9XG4gICAgLy8ge3N1Y2Nlc3M6dHJ1ZSxyZXN1bHQ6W119XG4gIH1cblxuICAvLyBQaWNHby1Db3JlIOS4iuS8oOWkhOeQhlxuICBhc3luYyB1cGxvYWRGaWxlQnlDbGlwYm9hcmQoKSB7XG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy51cGxvYWRCeUNsaXAoKTtcbiAgICBjb25zdCBzcGxpdExpc3QgPSByZXMuc3BsaXQoXCJcXG5cIik7XG4gICAgY29uc3QgbGFzdEltYWdlID0gZ2V0TGFzdEltYWdlKHNwbGl0TGlzdCk7XG5cbiAgICBpZiAobGFzdEltYWdlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb2RlOiAwLFxuICAgICAgICBtc2c6IFwic3VjY2Vzc1wiLFxuICAgICAgICBkYXRhOiBsYXN0SW1hZ2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhzcGxpdExpc3QpO1xuXG4gICAgICAvLyBuZXcgTm90aWNlKGBcIlBsZWFzZSBjaGVjayBQaWNHby1Db3JlIGNvbmZpZ1wiXFxuJHtyZXN9YCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb2RlOiAtMSxcbiAgICAgICAgbXNnOiBgXCJQbGVhc2UgY2hlY2sgUGljR28tQ29yZSBjb25maWdcIlxcbiR7cmVzfWAsXG4gICAgICAgIGRhdGE6IFwiXCIsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFBpY0dvLUNvcmXnmoTliarliIfkuIrkvKDlj43ppohcbiAgYXN5bmMgdXBsb2FkQnlDbGlwKCkge1xuICAgIGxldCBjb21tYW5kO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLnBpY2dvQ29yZVBhdGgpIHtcbiAgICAgIGNvbW1hbmQgPSBgJHt0aGlzLnNldHRpbmdzLnBpY2dvQ29yZVBhdGh9IHVwbG9hZGA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbW1hbmQgPSBgcGljZ28gdXBsb2FkYDtcbiAgICB9XG4gICAgY29uc3QgcmVzID0gYXdhaXQgdGhpcy5leGVjKGNvbW1hbmQpO1xuICAgIC8vIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuc3Bhd25DaGlsZCgpO1xuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGFzeW5jIGV4ZWMoY29tbWFuZDogc3RyaW5nKSB7XG4gICAgbGV0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjKGNvbW1hbmQpO1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IHN0cmVhbVRvU3RyaW5nKHN0ZG91dCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGFzeW5jIHNwYXduQ2hpbGQoKSB7XG4gICAgY29uc3QgeyBzcGF3biB9ID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7XG4gICAgY29uc3QgY2hpbGQgPSBzcGF3bihcInBpY2dvXCIsIFtcInVwbG9hZFwiXSwge1xuICAgICAgc2hlbGw6IHRydWUsXG4gICAgfSk7XG5cbiAgICBsZXQgZGF0YSA9IFwiXCI7XG4gICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiBjaGlsZC5zdGRvdXQpIHtcbiAgICAgIGRhdGEgKz0gY2h1bms7XG4gICAgfVxuICAgIGxldCBlcnJvciA9IFwiXCI7XG4gICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiBjaGlsZC5zdGRlcnIpIHtcbiAgICAgIGVycm9yICs9IGNodW5rO1xuICAgIH1cbiAgICBjb25zdCBleGl0Q29kZSA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgcmVzb2x2ZSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZXhpdENvZGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgc3VicHJvY2VzcyBlcnJvciBleGl0ICR7ZXhpdENvZGV9LCAke2Vycm9yfWApO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgSVN0cmluZ0tleU1hcCB9IGZyb20gXCIuL3V0aWxzXCI7XG5pbXBvcnQgeyBBcHAsIHJlcXVlc3RVcmwgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCBpbWFnZUF1dG9VcGxvYWRQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuXG5leHBvcnQgY2xhc3MgUGljR29EZWxldGVyIHtcbiAgcGx1Z2luOiBpbWFnZUF1dG9VcGxvYWRQbHVnaW47XG5cbiAgY29uc3RydWN0b3IocGx1Z2luOiBpbWFnZUF1dG9VcGxvYWRQbHVnaW4pIHtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZUltYWdlKGNvbmZpZ01hcDogSVN0cmluZ0tleU1hcDxhbnk+W10pIHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWxldGVTZXJ2ZXIsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBsaXN0OiBjb25maWdNYXAsXG4gICAgICB9KSxcbiAgICB9KTtcbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgTWFya2Rvd25WaWV3LCBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSBcInBhdGgtYnJvd3NlcmlmeVwiO1xuXG5pbnRlcmZhY2UgSW1hZ2Uge1xuICBwYXRoOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgc291cmNlOiBzdHJpbmc7XG59XG4vLyAhW10oLi9kc2EvYWEucG5nKSBsb2NhbCBpbWFnZSBzaG91bGQgaGFzIGV4dCwgc3VwcG9ydCAhW10oPC4vZHNhL2FhLnBuZz4pLCBzdXBwb3J0ICFbXShpbWFnZS5wbmcgXCJhbHRcIilcbi8vICFbXShodHRwczovL2Rhc2Rhc2RhKSBpbnRlcm5ldCBpbWFnZSBzaG91bGQgbm90IGhhcyBleHRcbmNvbnN0IFJFR0VYX0ZJTEUgPVxuICAvXFwhXFxbKC4qPylcXF1cXCg8KFxcUytcXC5cXHcrKT5cXCl8XFwhXFxbKC4qPylcXF1cXCgoXFxTK1xcLlxcdyspKD86XFxzK1wiW15cIl0qXCIpP1xcKXxcXCFcXFsoLio/KVxcXVxcKChodHRwcz86XFwvXFwvLio/KVxcKS9nO1xuY29uc3QgUkVHRVhfV0lLSV9GSUxFID0gL1xcIVxcW1xcWyguKj8pKFxccyo/XFx8Lio/KT9cXF1cXF0vZztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSGVscGVyIHtcbiAgYXBwOiBBcHA7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHApIHtcbiAgICB0aGlzLmFwcCA9IGFwcDtcbiAgfVxuXG4gIGdldEZyb250bWF0dGVyVmFsdWUoa2V5OiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogYW55ID0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBwYXRoID0gZmlsZS5wYXRoO1xuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRDYWNoZShwYXRoKTtcblxuICAgIGxldCB2YWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyICYmIGNhY2hlLmZyb250bWF0dGVyLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHZhbHVlID0gY2FjaGUuZnJvbnRtYXR0ZXJba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgZ2V0RWRpdG9yKCkge1xuICAgIGNvbnN0IG1kVmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG4gICAgaWYgKG1kVmlldykge1xuICAgICAgcmV0dXJuIG1kVmlldy5lZGl0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIGdldFZhbHVlKCkge1xuICAgIGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0RWRpdG9yKCk7XG4gICAgcmV0dXJuIGVkaXRvci5nZXRWYWx1ZSgpO1xuICB9XG5cbiAgc2V0VmFsdWUodmFsdWU6IHN0cmluZykge1xuICAgIGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0RWRpdG9yKCk7XG4gICAgY29uc3QgeyBsZWZ0LCB0b3AgfSA9IGVkaXRvci5nZXRTY3JvbGxJbmZvKCk7XG4gICAgY29uc3QgcG9zaXRpb24gPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XG5cbiAgICBlZGl0b3Iuc2V0VmFsdWUodmFsdWUpO1xuICAgIGVkaXRvci5zY3JvbGxUbyhsZWZ0LCB0b3ApO1xuICAgIGVkaXRvci5zZXRDdXJzb3IocG9zaXRpb24pO1xuICB9XG5cbiAgLy8gZ2V0IGFsbCBmaWxlIHVybHMsIGluY2x1ZGUgbG9jYWwgYW5kIGludGVybmV0XG4gIGdldEFsbEZpbGVzKCk6IEltYWdlW10ge1xuICAgIGNvbnN0IGVkaXRvciA9IHRoaXMuZ2V0RWRpdG9yKCk7XG4gICAgbGV0IHZhbHVlID0gZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgcmV0dXJuIHRoaXMuZ2V0SW1hZ2VMaW5rKHZhbHVlKTtcbiAgfVxuXG4gIGdldEltYWdlTGluayh2YWx1ZTogc3RyaW5nKTogSW1hZ2VbXSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IHZhbHVlLm1hdGNoQWxsKFJFR0VYX0ZJTEUpO1xuICAgIGNvbnN0IFdpa2lNYXRjaGVzID0gdmFsdWUubWF0Y2hBbGwoUkVHRVhfV0lLSV9GSUxFKTtcblxuICAgIGxldCBmaWxlQXJyYXk6IEltYWdlW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbWF0Y2hlcykge1xuICAgICAgY29uc3Qgc291cmNlID0gbWF0Y2hbMF07XG5cbiAgICAgIGxldCBuYW1lID0gbWF0Y2hbMV07XG4gICAgICBsZXQgcGF0aCA9IG1hdGNoWzJdO1xuICAgICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBuYW1lID0gbWF0Y2hbM107XG4gICAgICB9XG4gICAgICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhdGggPSBtYXRjaFs0XTtcbiAgICAgIH1cblxuICAgICAgZmlsZUFycmF5LnB1c2goe1xuICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgV2lraU1hdGNoZXMpIHtcbiAgICAgIGxldCBuYW1lID0gcGFyc2UobWF0Y2hbMV0pLm5hbWU7XG4gICAgICBjb25zdCBwYXRoID0gbWF0Y2hbMV07XG4gICAgICBjb25zdCBzb3VyY2UgPSBtYXRjaFswXTtcbiAgICAgIGlmIChtYXRjaFsyXSkge1xuICAgICAgICBuYW1lID0gYCR7bmFtZX0ke21hdGNoWzJdfWA7XG4gICAgICB9XG4gICAgICBmaWxlQXJyYXkucHVzaCh7XG4gICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpbGVBcnJheTtcbiAgfVxuXG4gIGhhc0JsYWNrRG9tYWluKHNyYzogc3RyaW5nLCBibGFja0RvbWFpbnM6IHN0cmluZykge1xuICAgIGlmIChibGFja0RvbWFpbnMudHJpbSgpID09PSBcIlwiKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IGJsYWNrRG9tYWluTGlzdCA9IGJsYWNrRG9tYWlucy5zcGxpdChcIixcIikuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPT0gXCJcIik7XG4gICAgbGV0IHVybCA9IG5ldyBVUkwoc3JjKTtcbiAgICBjb25zdCBkb21haW4gPSB1cmwuaG9zdG5hbWU7XG5cbiAgICByZXR1cm4gYmxhY2tEb21haW5MaXN0LnNvbWUoYmxhY2tEb21haW4gPT4gZG9tYWluLmluY2x1ZGVzKGJsYWNrRG9tYWluKSk7XG4gIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgaW1hZ2VBdXRvVXBsb2FkUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB7IHQgfSBmcm9tIFwiLi9sYW5nL2hlbHBlcnNcIjtcbmltcG9ydCB7IGdldE9TIH0gZnJvbSBcIi4vdXRpbHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBQbHVnaW5TZXR0aW5ncyB7XG4gIHVwbG9hZEJ5Q2xpcFN3aXRjaDogYm9vbGVhbjtcbiAgdXBsb2FkU2VydmVyOiBzdHJpbmc7XG4gIGRlbGV0ZVNlcnZlcjogc3RyaW5nO1xuICBpbWFnZVNpemVTdWZmaXg6IHN0cmluZztcbiAgdXBsb2FkZXI6IHN0cmluZztcbiAgcGljZ29Db3JlUGF0aDogc3RyaW5nO1xuICB3b3JrT25OZXRXb3JrOiBib29sZWFuO1xuICBuZXdXb3JrQmxhY2tEb21haW5zOiBzdHJpbmc7XG4gIGZpeFBhdGg6IGJvb2xlYW47XG4gIGFwcGx5SW1hZ2U6IGJvb2xlYW47XG4gIGRlbGV0ZVNvdXJjZTogYm9vbGVhbjtcbiAgaW1hZ2VEZXNjOiBcIm9yaWdpblwiIHwgXCJub25lXCIgfCBcInJlbW92ZURlZmF1bHRcIjtcbiAgcmVtb3RlU2VydmVyTW9kZTogYm9vbGVhbjtcbiAgW3Byb3BOYW1lOiBzdHJpbmddOiBhbnk7XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBQbHVnaW5TZXR0aW5ncyA9IHtcbiAgdXBsb2FkQnlDbGlwU3dpdGNoOiB0cnVlLFxuICB1cGxvYWRlcjogXCJQaWNHb1wiLFxuICB1cGxvYWRTZXJ2ZXI6IFwiaHR0cDovLzEyNy4wLjAuMTozNjY3Ny91cGxvYWRcIixcbiAgZGVsZXRlU2VydmVyOiBcImh0dHA6Ly8xMjcuMC4wLjE6MzY2NzcvZGVsZXRlXCIsXG4gIGltYWdlU2l6ZVN1ZmZpeDogXCJcIixcbiAgcGljZ29Db3JlUGF0aDogXCJcIixcbiAgd29ya09uTmV0V29yazogZmFsc2UsXG4gIGZpeFBhdGg6IGZhbHNlLFxuICBhcHBseUltYWdlOiB0cnVlLFxuICBuZXdXb3JrQmxhY2tEb21haW5zOiBcIlwiLFxuICBkZWxldGVTb3VyY2U6IGZhbHNlLFxuICBpbWFnZURlc2M6IFwib3JpZ2luXCIsXG4gIHJlbW90ZVNlcnZlck1vZGU6IGZhbHNlLFxufTtcblxuZXhwb3J0IGNsYXNzIFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBpbWFnZUF1dG9VcGxvYWRQbHVnaW47XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogaW1hZ2VBdXRvVXBsb2FkUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBsZXQgeyBjb250YWluZXJFbCB9ID0gdGhpcztcblxuICAgIGNvbnN0IG9zID0gZ2V0T1MoKTtcblxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IHQoXCJQbHVnaW4gU2V0dGluZ3NcIikgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSh0KFwiQXV0byBwYXN0ZWQgdXBsb2FkXCIpKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIHQoXG4gICAgICAgICAgXCJJZiB5b3Ugc2V0IHRoaXMgdmFsdWUgdHJ1ZSwgd2hlbiB5b3UgcGFzdGUgaW1hZ2UsIGl0IHdpbGwgYmUgYXV0byB1cGxvYWRlZCh5b3Ugc2hvdWxkIHNldCB0aGUgcGljR28gc2VydmVyIHJpZ2h0bHkpXCJcbiAgICAgICAgKVxuICAgICAgKVxuICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnVwbG9hZEJ5Q2xpcFN3aXRjaClcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudXBsb2FkQnlDbGlwU3dpdGNoID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUodChcIkRlZmF1bHQgdXBsb2FkZXJcIikpXG4gICAgICAuc2V0RGVzYyh0KFwiRGVmYXVsdCB1cGxvYWRlclwiKSlcbiAgICAgIC5hZGREcm9wZG93bihjYiA9PlxuICAgICAgICBjYlxuICAgICAgICAgIC5hZGRPcHRpb24oXCJQaWNHb1wiLCBcIlBpY0dvKGFwcClcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiUGljR28tQ29yZVwiLCBcIlBpY0dvLUNvcmVcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXBsb2FkZXIpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHZhbHVlID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVwbG9hZGVyID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnVwbG9hZGVyID09PSBcIlBpY0dvXCIpIHtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZSh0KFwiUGljR28gc2VydmVyXCIpKVxuICAgICAgICAuc2V0RGVzYyh0KFwiUGljR28gc2VydmVyIGRlc2NcIikpXG4gICAgICAgIC5hZGRUZXh0KHRleHQgPT5cbiAgICAgICAgICB0ZXh0XG4gICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIodChcIlBsZWFzZSBpbnB1dCBQaWNHbyBzZXJ2ZXJcIikpXG4gICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudXBsb2FkU2VydmVyKVxuICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIGtleSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnVwbG9hZFNlcnZlciA9IGtleTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuXG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUodChcIlBpY0dvIGRlbGV0ZSBzZXJ2ZXJcIikpXG4gICAgICAgIC5zZXREZXNjKHQoXCJQaWNMaXN0IGRlc2NcIikpXG4gICAgICAgIC5hZGRUZXh0KHRleHQgPT5cbiAgICAgICAgICB0ZXh0XG4gICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIodChcIlBsZWFzZSBpbnB1dCBQaWNHbyBkZWxldGUgc2VydmVyXCIpKVxuICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlbGV0ZVNlcnZlcilcbiAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyBrZXkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWxldGVTZXJ2ZXIgPSBrZXk7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKHQoXCJSZW1vdGUgc2VydmVyIG1vZGVcIikpXG4gICAgICAuc2V0RGVzYyh0KFwiUmVtb3RlIHNlcnZlciBtb2RlIGRlc2NcIikpXG4gICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVtb3RlU2VydmVyTW9kZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVtb3RlU2VydmVyTW9kZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndvcmtPbk5ldFdvcmsgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MudXBsb2FkZXIgPT09IFwiUGljR28tQ29yZVwiKSB7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUodChcIlBpY0dvLUNvcmUgcGF0aFwiKSlcbiAgICAgICAgLnNldERlc2MoXG4gICAgICAgICAgdChcIlBsZWFzZSBpbnB1dCBQaWNHby1Db3JlIHBhdGgsIGRlZmF1bHQgdXNpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzXCIpXG4gICAgICAgIClcbiAgICAgICAgLmFkZFRleHQodGV4dCA9PlxuICAgICAgICAgIHRleHRcbiAgICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcIlwiKVxuICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnBpY2dvQ29yZVBhdGgpXG4gICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5waWNnb0NvcmVQYXRoID0gdmFsdWU7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcblxuICAgICAgaWYgKG9zICE9PSBcIldpbmRvd3NcIikge1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgICAuc2V0TmFtZSh0KFwiZml4UGF0aFwiKSlcbiAgICAgICAgICAuc2V0RGVzYyh0KFwiZml4UGF0aFdhcm5pbmdcIikpXG4gICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT5cbiAgICAgICAgICAgIHRvZ2dsZVxuICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZml4UGF0aClcbiAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maXhQYXRoID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpbWFnZSBkZXNjIHNldHRpbmdcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKHQoXCJJbWFnZSBkZXNjXCIpKVxuICAgICAgLnNldERlc2ModChcIkltYWdlIGRlc2NcIikpXG4gICAgICAuYWRkRHJvcGRvd24oY2IgPT5cbiAgICAgICAgY2JcbiAgICAgICAgICAuYWRkT3B0aW9uKFwib3JpZ2luXCIsIHQoXCJyZXNlcnZlXCIpKSAvLyDkv53nlZnlhajpg6hcbiAgICAgICAgICAuYWRkT3B0aW9uKFwibm9uZVwiLCB0KFwicmVtb3ZlIGFsbFwiKSkgLy8g56e76Zmk5YWo6YOoXG4gICAgICAgICAgLmFkZE9wdGlvbihcInJlbW92ZURlZmF1bHRcIiwgdChcInJlbW92ZSBkZWZhdWx0XCIpKSAvLyDlj6rnp7vpmaTpu5jorqTljbMgaW1hZ2UucG5nXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmltYWdlRGVzYylcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlOiBcIm9yaWdpblwiIHwgXCJub25lXCIgfCBcInJlbW92ZURlZmF1bHRcIikgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW1hZ2VEZXNjID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZSh0KFwiSW1hZ2Ugc2l6ZSBzdWZmaXhcIikpXG4gICAgICAuc2V0RGVzYyh0KFwiSW1hZ2Ugc2l6ZSBzdWZmaXggRGVzY3JpcHRpb25cIikpXG4gICAgICAuYWRkVGV4dCh0ZXh0ID0+XG4gICAgICAgIHRleHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIodChcIlBsZWFzZSBpbnB1dCBpbWFnZSBzaXplIHN1ZmZpeFwiKSlcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaW1hZ2VTaXplU3VmZml4KVxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyBrZXkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW1hZ2VTaXplU3VmZml4ID0ga2V5O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKHQoXCJXb3JrIG9uIG5ldHdvcmtcIikpXG4gICAgICAuc2V0RGVzYyh0KFwiV29yayBvbiBuZXR3b3JrIERlc2NyaXB0aW9uXCIpKVxuICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLndvcmtPbk5ldFdvcmspXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jIHZhbHVlID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZW1vdGVTZXJ2ZXJNb2RlKSB7XG4gICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJDYW4gb25seSB3b3JrIHdoZW4gcmVtb3RlIHNlcnZlciBtb2RlIGlzIG9mZi5cIik7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndvcmtPbk5ldFdvcmsgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndvcmtPbk5ldFdvcmsgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKHQoXCJOZXR3b3JrIERvbWFpbiBCbGFjayBMaXN0XCIpKVxuICAgICAgLnNldERlc2ModChcIk5ldHdvcmsgRG9tYWluIEJsYWNrIExpc3QgRGVzY3JpcHRpb25cIikpXG4gICAgICAuYWRkVGV4dEFyZWEodGV4dEFyZWEgPT5cbiAgICAgICAgdGV4dEFyZWFcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubmV3V29ya0JsYWNrRG9tYWlucylcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubmV3V29ya0JsYWNrRG9tYWlucyA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKHQoXCJVcGxvYWQgd2hlbiBjbGlwYm9hcmQgaGFzIGltYWdlIGFuZCB0ZXh0IHRvZ2V0aGVyXCIpKVxuICAgICAgLnNldERlc2MoXG4gICAgICAgIHQoXG4gICAgICAgICAgXCJXaGVuIHlvdSBjb3B5LCBzb21lIGFwcGxpY2F0aW9uIGxpa2UgRXhjZWwgd2lsbCBpbWFnZSBhbmQgdGV4dCB0byBjbGlwYm9hcmQsIHlvdSBjYW4gdXBsb2FkIG9yIG5vdC5cIlxuICAgICAgICApXG4gICAgICApXG4gICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PlxuICAgICAgICB0b2dnbGVcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBwbHlJbWFnZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBwbHlJbWFnZSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KVxuICAgICAgKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUodChcIkRlbGV0ZSBzb3VyY2UgZmlsZSBhZnRlciB5b3UgdXBsb2FkIGZpbGVcIikpXG4gICAgICAuc2V0RGVzYyh0KFwiRGVsZXRlIHNvdXJjZSBmaWxlIGluIG9iIGFzc2V0cyBhZnRlciB5b3UgdXBsb2FkIGZpbGUuXCIpKVxuICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT5cbiAgICAgICAgdG9nZ2xlXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlbGV0ZVNvdXJjZSlcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVsZXRlU291cmNlID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pXG4gICAgICApO1xuICB9XG59XG4iLCJpbXBvcnQge1xuICBNYXJrZG93blZpZXcsXG4gIFBsdWdpbixcbiAgRmlsZVN5c3RlbUFkYXB0ZXIsXG4gIEVkaXRvcixcbiAgTWVudSxcbiAgTWVudUl0ZW0sXG4gIFRGaWxlLFxuICBub3JtYWxpemVQYXRoLFxuICBOb3RpY2UsXG4gIGFkZEljb24sXG4gIE1hcmtkb3duRmlsZUluZm8sXG59IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgcmVzb2x2ZSwgcmVsYXRpdmUsIGpvaW4sIGJhc2VuYW1lLCBkaXJuYW1lIH0gZnJvbSBcInBhdGgtYnJvd3NlcmlmeVwiO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgdW5saW5rIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgZml4UGF0aCBmcm9tIFwiZml4LXBhdGhcIjtcblxuaW1wb3J0IHsgaXNBc3NldFR5cGVBbkltYWdlLCBhcnJheVRvT2JqZWN0IH0gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCB7IGRvd25sb2FkQWxsSW1hZ2VGaWxlcyB9IGZyb20gXCIuL2Rvd25sb2FkXCI7XG5pbXBvcnQgeyBQaWNHb1VwbG9hZGVyLCBQaWNHb0NvcmVVcGxvYWRlciB9IGZyb20gXCIuL3VwbG9hZGVyXCI7XG5pbXBvcnQgeyBQaWNHb0RlbGV0ZXIgfSBmcm9tIFwiLi9kZWxldGVyXCI7XG5pbXBvcnQgSGVscGVyIGZyb20gXCIuL2hlbHBlclwiO1xuaW1wb3J0IHsgdCB9IGZyb20gXCIuL2xhbmcvaGVscGVyc1wiO1xuXG5pbXBvcnQgeyBTZXR0aW5nVGFiLCBQbHVnaW5TZXR0aW5ncywgREVGQVVMVF9TRVRUSU5HUyB9IGZyb20gXCIuL3NldHRpbmdcIjtcblxuaW50ZXJmYWNlIEltYWdlIHtcbiAgcGF0aDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHNvdXJjZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBpbWFnZUF1dG9VcGxvYWRQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogUGx1Z2luU2V0dGluZ3M7XG4gIGhlbHBlcjogSGVscGVyO1xuICBlZGl0b3I6IEVkaXRvcjtcbiAgcGljR29VcGxvYWRlcjogUGljR29VcGxvYWRlcjtcbiAgcGljR29EZWxldGVyOiBQaWNHb0RlbGV0ZXI7XG4gIHBpY0dvQ29yZVVwbG9hZGVyOiBQaWNHb0NvcmVVcGxvYWRlcjtcbiAgdXBsb2FkZXI6IFBpY0dvVXBsb2FkZXIgfCBQaWNHb0NvcmVVcGxvYWRlcjtcblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgb251bmxvYWQoKSB7fVxuXG4gIGFzeW5jIG9ubG9hZCgpIHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuXG4gICAgdGhpcy5oZWxwZXIgPSBuZXcgSGVscGVyKHRoaXMuYXBwKTtcbiAgICB0aGlzLnBpY0dvVXBsb2FkZXIgPSBuZXcgUGljR29VcGxvYWRlcih0aGlzLnNldHRpbmdzLCB0aGlzKTtcbiAgICB0aGlzLnBpY0dvRGVsZXRlciA9IG5ldyBQaWNHb0RlbGV0ZXIodGhpcyk7XG4gICAgdGhpcy5waWNHb0NvcmVVcGxvYWRlciA9IG5ldyBQaWNHb0NvcmVVcGxvYWRlcih0aGlzLnNldHRpbmdzLCB0aGlzKTtcblxuICAgIGlmICh0aGlzLnNldHRpbmdzLnVwbG9hZGVyID09PSBcIlBpY0dvXCIpIHtcbiAgICAgIHRoaXMudXBsb2FkZXIgPSB0aGlzLnBpY0dvVXBsb2FkZXI7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNldHRpbmdzLnVwbG9hZGVyID09PSBcIlBpY0dvLUNvcmVcIikge1xuICAgICAgdGhpcy51cGxvYWRlciA9IHRoaXMucGljR29Db3JlVXBsb2FkZXI7XG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5maXhQYXRoKSB7XG4gICAgICAgIGZpeFBhdGgoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IE5vdGljZShcInVua25vd24gdXBsb2FkZXJcIik7XG4gICAgfVxuXG4gICAgYWRkSWNvbihcbiAgICAgIFwidXBsb2FkXCIsXG4gICAgICBgPHN2ZyB0PVwiMTYzNjYzMDc4MzQyOVwiIGNsYXNzPVwiaWNvblwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHZlcnNpb249XCIxLjFcIiBwLWlkPVwiNDY0OVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAgICAgIDxwYXRoIGQ9XCJNIDcxLjYzOCAzNS4zMzYgTCA3OS40MDggMzUuMzM2IEMgODMuNyAzNS4zMzYgODcuMTc4IDM4LjY2MiA4Ny4xNzggNDIuNzY1IEwgODcuMTc4IDg0Ljg2NCBDIDg3LjE3OCA4OC45NjkgODMuNyA5Mi4yOTUgNzkuNDA4IDkyLjI5NSBMIDE3LjI0OSA5Mi4yOTUgQyAxMi45NTcgOTIuMjk1IDkuNDc5IDg4Ljk2OSA5LjQ3OSA4NC44NjQgTCA5LjQ3OSA0Mi43NjUgQyA5LjQ3OSAzOC42NjIgMTIuOTU3IDM1LjMzNiAxNy4yNDkgMzUuMzM2IEwgMjUuMDE5IDM1LjMzNiBMIDI1LjAxOSA0Mi43NjUgTCAxNy4yNDkgNDIuNzY1IEwgMTcuMjQ5IDg0Ljg2NCBMIDc5LjQwOCA4NC44NjQgTCA3OS40MDggNDIuNzY1IEwgNzEuNjM4IDQyLjc2NSBMIDcxLjYzOCAzNS4zMzYgWiBNIDQ5LjAxNCAxMC4xNzkgTCA2Ny4zMjYgMjcuNjg4IEwgNjEuODM1IDMyLjk0MiBMIDUyLjg0OSAyNC4zNTIgTCA1Mi44NDkgNTkuNzMxIEwgNDUuMDc4IDU5LjczMSBMIDQ1LjA3OCAyNC40NTUgTCAzNi4xOTQgMzIuOTQ3IEwgMzAuNzAyIDI3LjY5MiBMIDQ5LjAxMiAxMC4xODEgWlwiIHAtaWQ9XCI0NjUwXCIgZmlsbD1cIiM4YThhOGFcIj48L3BhdGg+XG4gICAgPC9zdmc+YFxuICAgICk7XG5cbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJVcGxvYWQgYWxsIGltYWdlc1wiLFxuICAgICAgbmFtZTogXCJVcGxvYWQgYWxsIGltYWdlc1wiLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nOiBib29sZWFuKSA9PiB7XG4gICAgICAgIGxldCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmFjdGl2ZUxlYWY7XG4gICAgICAgIGlmIChsZWFmKSB7XG4gICAgICAgICAgaWYgKCFjaGVja2luZykge1xuICAgICAgICAgICAgdGhpcy51cGxvYWRBbGxGaWxlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcIkRvd25sb2FkIGFsbCBpbWFnZXNcIixcbiAgICAgIG5hbWU6IFwiRG93bmxvYWQgYWxsIGltYWdlc1wiLFxuICAgICAgY2hlY2tDYWxsYmFjazogKGNoZWNraW5nOiBib29sZWFuKSA9PiB7XG4gICAgICAgIGxldCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmFjdGl2ZUxlYWY7XG4gICAgICAgIGlmIChsZWFmKSB7XG4gICAgICAgICAgaWYgKCFjaGVja2luZykge1xuICAgICAgICAgICAgZG93bmxvYWRBbGxJbWFnZUZpbGVzKHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5zZXR1cFBhc3RlSGFuZGxlcigpO1xuICAgIHRoaXMucmVnaXN0ZXJGaWxlTWVudSgpO1xuXG4gICAgdGhpcy5yZWdpc3RlclNlbGVjdGlvbigpO1xuICB9XG5cbiAgcmVnaXN0ZXJTZWxlY3Rpb24oKSB7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKFxuICAgICAgICBcImVkaXRvci1tZW51XCIsXG4gICAgICAgIChtZW51OiBNZW51LCBlZGl0b3I6IEVkaXRvciwgaW5mbzogTWFya2Rvd25WaWV3IHwgTWFya2Rvd25GaWxlSW5mbykgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFwibWFya2Rvd25cIikubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgICBpZiAoc2VsZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBtYXJrZG93blJlZ2V4ID0gLyFcXFsuKlxcXVxcKCguKilcXCkvZztcbiAgICAgICAgICAgIGNvbnN0IG1hcmtkb3duTWF0Y2ggPSBtYXJrZG93blJlZ2V4LmV4ZWMoc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIGlmIChtYXJrZG93bk1hdGNoICYmIG1hcmtkb3duTWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICBjb25zdCBtYXJrZG93blVybCA9IG1hcmtkb3duTWF0Y2hbMV07XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnVwbG9hZGVkSW1hZ2VzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAoaXRlbTogeyBpbWdVcmw6IHN0cmluZyB9KSA9PiBpdGVtLmltZ1VybCA9PT0gbWFya2Rvd25VcmxcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkTWVudShtZW51LCBtYXJrZG93blVybCwgZWRpdG9yKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuICBhZGRNZW51ID0gKG1lbnU6IE1lbnUsIGltZ1BhdGg6IHN0cmluZywgZWRpdG9yOiBFZGl0b3IpID0+IHtcbiAgICBtZW51LmFkZEl0ZW0oKGl0ZW06IE1lbnVJdGVtKSA9PlxuICAgICAgaXRlbVxuICAgICAgICAuc2V0SWNvbihcInRyYXNoLTJcIilcbiAgICAgICAgLnNldFRpdGxlKHQoXCJEZWxldGUgaW1hZ2UgdXNpbmcgUGljTGlzdFwiKSlcbiAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSB0aGlzLnNldHRpbmdzLnVwbG9hZGVkSW1hZ2VzLmZpbmQoXG4gICAgICAgICAgICAgIChpdGVtOiB7IGltZ1VybDogc3RyaW5nIH0pID0+IGl0ZW0uaW1nVXJsID09PSBpbWdQYXRoXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLnBpY0dvRGVsZXRlci5kZWxldGVJbWFnZShbc2VsZWN0ZWRJdGVtXSk7XG4gICAgICAgICAgICAgIGlmIChyZXMuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UodChcIkRlbGV0ZSBzdWNjZXNzZnVsbHlcIikpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICBlZGl0b3IucmVwbGFjZVNlbGVjdGlvbihcIlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy51cGxvYWRlZEltYWdlcyA9XG4gICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnVwbG9hZGVkSW1hZ2VzLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgKGl0ZW06IHsgaW1nVXJsOiBzdHJpbmcgfSkgPT4gaXRlbS5pbWdVcmwgIT09IGltZ1BhdGhcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKHQoXCJEZWxldGUgZmFpbGVkXCIpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgbmV3IE5vdGljZSh0KFwiRXJyb3IsIGNvdWxkIG5vdCBkZWxldGVcIikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICApO1xuICB9O1xuXG4gIHJlZ2lzdGVyRmlsZU1lbnUoKSB7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKFxuICAgICAgICBcImZpbGUtbWVudVwiLFxuICAgICAgICAobWVudTogTWVudSwgZmlsZTogVEZpbGUsIHNvdXJjZTogc3RyaW5nLCBsZWFmKSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZSA9PT0gXCJjYW52YXMtbWVudVwiKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgaWYgKCFpc0Fzc2V0VHlwZUFuSW1hZ2UoZmlsZS5wYXRoKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtOiBNZW51SXRlbSkgPT4ge1xuICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAuc2V0VGl0bGUoXCJVcGxvYWRcIilcbiAgICAgICAgICAgICAgLnNldEljb24oXCJ1cGxvYWRcIilcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5maWxlTWVudVVwbG9hZChmaWxlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgZmlsZU1lbnVVcGxvYWQoZmlsZTogVEZpbGUpIHtcbiAgICBsZXQgY29udGVudCA9IHRoaXMuaGVscGVyLmdldFZhbHVlKCk7XG5cbiAgICBjb25zdCBiYXNlUGF0aCA9IChcbiAgICAgIHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgRmlsZVN5c3RlbUFkYXB0ZXJcbiAgICApLmdldEJhc2VQYXRoKCk7XG4gICAgbGV0IGltYWdlTGlzdDogSW1hZ2VbXSA9IFtdO1xuICAgIGNvbnN0IGZpbGVBcnJheSA9IHRoaXMuaGVscGVyLmdldEFsbEZpbGVzKCk7XG5cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGZpbGVBcnJheSkge1xuICAgICAgY29uc3QgaW1hZ2VOYW1lID0gbWF0Y2gubmFtZTtcbiAgICAgIGNvbnN0IGVuY29kZWRVcmkgPSBtYXRjaC5wYXRoO1xuXG4gICAgICBjb25zdCBmaWxlTmFtZSA9IGJhc2VuYW1lKGRlY29kZVVSSShlbmNvZGVkVXJpKSk7XG5cbiAgICAgIGlmIChmaWxlICYmIGZpbGUubmFtZSA9PT0gZmlsZU5hbWUpIHtcbiAgICAgICAgY29uc3QgYWJzdHJhY3RJbWFnZUZpbGUgPSBqb2luKGJhc2VQYXRoLCBmaWxlLnBhdGgpO1xuXG4gICAgICAgIGlmIChpc0Fzc2V0VHlwZUFuSW1hZ2UoYWJzdHJhY3RJbWFnZUZpbGUpKSB7XG4gICAgICAgICAgaW1hZ2VMaXN0LnB1c2goe1xuICAgICAgICAgICAgcGF0aDogYWJzdHJhY3RJbWFnZUZpbGUsXG4gICAgICAgICAgICBuYW1lOiBpbWFnZU5hbWUsXG4gICAgICAgICAgICBzb3VyY2U6IG1hdGNoLnNvdXJjZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpbWFnZUxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICBuZXcgTm90aWNlKHQoXCJDYW4gbm90IGZpbmQgaW1hZ2UgZmlsZVwiKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy51cGxvYWRlci51cGxvYWRGaWxlcyhpbWFnZUxpc3QubWFwKGl0ZW0gPT4gaXRlbS5wYXRoKSkudGhlbihyZXMgPT4ge1xuICAgICAgaWYgKHJlcy5zdWNjZXNzKSB7XG4gICAgICAgIGxldCB1cGxvYWRVcmxMaXN0ID0gcmVzLnJlc3VsdDtcbiAgICAgICAgaW1hZ2VMaXN0Lm1hcChpdGVtID0+IHtcbiAgICAgICAgICBjb25zdCB1cGxvYWRJbWFnZSA9IHVwbG9hZFVybExpc3Quc2hpZnQoKTtcbiAgICAgICAgICBsZXQgbmFtZSA9IHRoaXMuaGFuZGxlTmFtZShpdGVtLm5hbWUpO1xuXG4gICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZUFsbChcbiAgICAgICAgICAgIGl0ZW0uc291cmNlLFxuICAgICAgICAgICAgYCFbJHtuYW1lfV0oJHt1cGxvYWRJbWFnZX0pYFxuICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmhlbHBlci5zZXRWYWx1ZShjb250ZW50KTtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kZWxldGVTb3VyY2UpIHtcbiAgICAgICAgICBpbWFnZUxpc3QubWFwKGltYWdlID0+IHtcbiAgICAgICAgICAgIGlmICghaW1hZ2UucGF0aC5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgICAgICAgICAgICB1bmxpbmsoaW1hZ2UucGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXcgTm90aWNlKFwiVXBsb2FkIGVycm9yXCIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZmlsdGVyRmlsZShmaWxlQXJyYXk6IEltYWdlW10pIHtcbiAgICBjb25zdCBpbWFnZUxpc3Q6IEltYWdlW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgZmlsZUFycmF5KSB7XG4gICAgICBpZiAobWF0Y2gucGF0aC5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy53b3JrT25OZXRXb3JrKSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgIXRoaXMuaGVscGVyLmhhc0JsYWNrRG9tYWluKFxuICAgICAgICAgICAgICBtYXRjaC5wYXRoLFxuICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLm5ld1dvcmtCbGFja0RvbWFpbnNcbiAgICAgICAgICAgIClcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGltYWdlTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgcGF0aDogbWF0Y2gucGF0aCxcbiAgICAgICAgICAgICAgbmFtZTogbWF0Y2gubmFtZSxcbiAgICAgICAgICAgICAgc291cmNlOiBtYXRjaC5zb3VyY2UsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGltYWdlTGlzdC5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBtYXRjaC5wYXRoLFxuICAgICAgICAgIG5hbWU6IG1hdGNoLm5hbWUsXG4gICAgICAgICAgc291cmNlOiBtYXRjaC5zb3VyY2UsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbWFnZUxpc3Q7XG4gIH1cbiAgZ2V0RmlsZShmaWxlTmFtZTogc3RyaW5nLCBmaWxlTWFwOiBhbnkpIHtcbiAgICBpZiAoIWZpbGVNYXApIHtcbiAgICAgIGZpbGVNYXAgPSBhcnJheVRvT2JqZWN0KHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCksIFwibmFtZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVNYXBbZmlsZU5hbWVdO1xuICB9XG4gIC8vIHVwbG9kYSBhbGwgZmlsZVxuICB1cGxvYWRBbGxGaWxlKCkge1xuICAgIGxldCBjb250ZW50ID0gdGhpcy5oZWxwZXIuZ2V0VmFsdWUoKTtcblxuICAgIGNvbnN0IGJhc2VQYXRoID0gKFxuICAgICAgdGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyBGaWxlU3lzdGVtQWRhcHRlclxuICAgICkuZ2V0QmFzZVBhdGgoKTtcbiAgICBjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBjb25zdCBmaWxlTWFwID0gYXJyYXlUb09iamVjdCh0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpLCBcIm5hbWVcIik7XG4gICAgY29uc3QgZmlsZVBhdGhNYXAgPSBhcnJheVRvT2JqZWN0KHRoaXMuYXBwLnZhdWx0LmdldEZpbGVzKCksIFwicGF0aFwiKTtcbiAgICBsZXQgaW1hZ2VMaXN0OiBJbWFnZVtdID0gW107XG4gICAgY29uc3QgZmlsZUFycmF5ID0gdGhpcy5maWx0ZXJGaWxlKHRoaXMuaGVscGVyLmdldEFsbEZpbGVzKCkpO1xuXG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBmaWxlQXJyYXkpIHtcbiAgICAgIGNvbnN0IGltYWdlTmFtZSA9IG1hdGNoLm5hbWU7XG4gICAgICBjb25zdCBlbmNvZGVkVXJpID0gbWF0Y2gucGF0aDtcblxuICAgICAgaWYgKGVuY29kZWRVcmkuc3RhcnRzV2l0aChcImh0dHBcIikpIHtcbiAgICAgICAgaW1hZ2VMaXN0LnB1c2goe1xuICAgICAgICAgIHBhdGg6IG1hdGNoLnBhdGgsXG4gICAgICAgICAgbmFtZTogaW1hZ2VOYW1lLFxuICAgICAgICAgIHNvdXJjZTogbWF0Y2guc291cmNlLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gYmFzZW5hbWUoZGVjb2RlVVJJKGVuY29kZWRVcmkpKTtcbiAgICAgICAgbGV0IGZpbGU7XG4gICAgICAgIC8vIOe7neWvuei3r+W+hFxuICAgICAgICBpZiAoZmlsZVBhdGhNYXBbZGVjb2RlVVJJKGVuY29kZWRVcmkpXSkge1xuICAgICAgICAgIGZpbGUgPSBmaWxlUGF0aE1hcFtkZWNvZGVVUkkoZW5jb2RlZFVyaSldO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g55u45a+56Lev5b6EXG4gICAgICAgIGlmIChcbiAgICAgICAgICAoIWZpbGUgJiYgZGVjb2RlVVJJKGVuY29kZWRVcmkpLnN0YXJ0c1dpdGgoXCIuL1wiKSkgfHxcbiAgICAgICAgICBkZWNvZGVVUkkoZW5jb2RlZFVyaSkuc3RhcnRzV2l0aChcIi4uL1wiKVxuICAgICAgICApIHtcbiAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHJlc29sdmUoXG4gICAgICAgICAgICBqb2luKGJhc2VQYXRoLCBkaXJuYW1lKGFjdGl2ZUZpbGUucGF0aCkpLFxuICAgICAgICAgICAgZGVjb2RlVVJJKGVuY29kZWRVcmkpXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChleGlzdHNTeW5jKGZpbGVQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IG5vcm1hbGl6ZVBhdGgoXG4gICAgICAgICAgICAgIHJlbGF0aXZlKFxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZVBhdGgoYmFzZVBhdGgpLFxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZVBhdGgoXG4gICAgICAgICAgICAgICAgICByZXNvbHZlKFxuICAgICAgICAgICAgICAgICAgICBqb2luKGJhc2VQYXRoLCBkaXJuYW1lKGFjdGl2ZUZpbGUucGF0aCkpLFxuICAgICAgICAgICAgICAgICAgICBkZWNvZGVVUkkoZW5jb2RlZFVyaSlcbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGZpbGUgPSBmaWxlUGF0aE1hcFtwYXRoXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8g5bC95Y+v6IO955+t6Lev5b6EXG4gICAgICAgIGlmICghZmlsZSkge1xuICAgICAgICAgIGZpbGUgPSB0aGlzLmdldEZpbGUoZmlsZU5hbWUsIGZpbGVNYXApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICBjb25zdCBhYnN0cmFjdEltYWdlRmlsZSA9IGpvaW4oYmFzZVBhdGgsIGZpbGUucGF0aCk7XG5cbiAgICAgICAgICBpZiAoaXNBc3NldFR5cGVBbkltYWdlKGFic3RyYWN0SW1hZ2VGaWxlKSkge1xuICAgICAgICAgICAgaW1hZ2VMaXN0LnB1c2goe1xuICAgICAgICAgICAgICBwYXRoOiBhYnN0cmFjdEltYWdlRmlsZSxcbiAgICAgICAgICAgICAgbmFtZTogaW1hZ2VOYW1lLFxuICAgICAgICAgICAgICBzb3VyY2U6IG1hdGNoLnNvdXJjZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpbWFnZUxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICBuZXcgTm90aWNlKHQoXCJDYW4gbm90IGZpbmQgaW1hZ2UgZmlsZVwiKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBOb3RpY2UoYOWFseaJvuWIsCR7aW1hZ2VMaXN0Lmxlbmd0aH3kuKrlm77lg4/mlofku7bvvIzlvIDlp4vkuIrkvKBgKTtcbiAgICB9XG5cbiAgICB0aGlzLnVwbG9hZGVyLnVwbG9hZEZpbGVzKGltYWdlTGlzdC5tYXAoaXRlbSA9PiBpdGVtLnBhdGgpKS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAocmVzLnN1Y2Nlc3MpIHtcbiAgICAgICAgbGV0IHVwbG9hZFVybExpc3QgPSByZXMucmVzdWx0O1xuXG4gICAgICAgIGlmIChpbWFnZUxpc3QubGVuZ3RoICE9PSB1cGxvYWRVcmxMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgICAgICB0KFwiV2FybmluZzogdXBsb2FkIGZpbGVzIGlzIGRpZmZlcmVudCBvZiByZWNpdmVyIGZpbGVzIGZyb20gYXBpXCIpXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGltYWdlTGlzdC5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgY29uc3QgdXBsb2FkSW1hZ2UgPSB1cGxvYWRVcmxMaXN0LnNoaWZ0KCk7XG5cbiAgICAgICAgICBsZXQgbmFtZSA9IHRoaXMuaGFuZGxlTmFtZShpdGVtLm5hbWUpO1xuICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2VBbGwoXG4gICAgICAgICAgICBpdGVtLnNvdXJjZSxcbiAgICAgICAgICAgIGAhWyR7bmFtZX1dKCR7dXBsb2FkSW1hZ2V9KWBcbiAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgY3VycmVudEZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgICBpZiAoYWN0aXZlRmlsZS5wYXRoICE9PSBjdXJyZW50RmlsZS5wYXRoKSB7XG4gICAgICAgICAgbmV3IE5vdGljZSh0KFwiRmlsZSBoYXMgYmVlbiBjaGFuZ2VkZCwgdXBsb2FkIGZhaWx1cmVcIikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhlbHBlci5zZXRWYWx1ZShjb250ZW50KTtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kZWxldGVTb3VyY2UpIHtcbiAgICAgICAgICBpbWFnZUxpc3QubWFwKGltYWdlID0+IHtcbiAgICAgICAgICAgIGlmICghaW1hZ2UucGF0aC5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgICAgICAgICAgICB1bmxpbmsoaW1hZ2UucGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXcgTm90aWNlKFwiVXBsb2FkIGVycm9yXCIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgc2V0dXBQYXN0ZUhhbmRsZXIoKSB7XG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9uKFxuICAgICAgICBcImVkaXRvci1wYXN0ZVwiLFxuICAgICAgICAoZXZ0OiBDbGlwYm9hcmRFdmVudCwgZWRpdG9yOiBFZGl0b3IsIG1hcmtkb3duVmlldzogTWFya2Rvd25WaWV3KSA9PiB7XG4gICAgICAgICAgY29uc3QgYWxsb3dVcGxvYWQgPSB0aGlzLmhlbHBlci5nZXRGcm9udG1hdHRlclZhbHVlKFxuICAgICAgICAgICAgXCJpbWFnZS1hdXRvLXVwbG9hZFwiLFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy51cGxvYWRCeUNsaXBTd2l0Y2hcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgbGV0IGZpbGVzID0gZXZ0LmNsaXBib2FyZERhdGEuZmlsZXM7XG4gICAgICAgICAgaWYgKCFhbGxvd1VwbG9hZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIOWJqui0tOadv+WGheWuueaciW1k5qC85byP55qE5Zu+54mH5pe2XG4gICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Mud29ya09uTmV0V29yaykge1xuICAgICAgICAgICAgY29uc3QgY2xpcGJvYXJkVmFsdWUgPSBldnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKFwidGV4dC9wbGFpblwiKTtcbiAgICAgICAgICAgIGNvbnN0IGltYWdlTGlzdCA9IHRoaXMuaGVscGVyXG4gICAgICAgICAgICAgIC5nZXRJbWFnZUxpbmsoY2xpcGJvYXJkVmFsdWUpXG4gICAgICAgICAgICAgIC5maWx0ZXIoaW1hZ2UgPT4gaW1hZ2UucGF0aC5zdGFydHNXaXRoKFwiaHR0cFwiKSlcbiAgICAgICAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAgICAgICBpbWFnZSA9PlxuICAgICAgICAgICAgICAgICAgIXRoaXMuaGVscGVyLmhhc0JsYWNrRG9tYWluKFxuICAgICAgICAgICAgICAgICAgICBpbWFnZS5wYXRoLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLm5ld1dvcmtCbGFja0RvbWFpbnNcbiAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKGltYWdlTGlzdC5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgdGhpcy51cGxvYWRlclxuICAgICAgICAgICAgICAgIC51cGxvYWRGaWxlcyhpbWFnZUxpc3QubWFwKGl0ZW0gPT4gaXRlbS5wYXRoKSlcbiAgICAgICAgICAgICAgICAudGhlbihyZXMgPT4ge1xuICAgICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gdGhpcy5oZWxwZXIuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgIGlmIChyZXMuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdXBsb2FkVXJsTGlzdCA9IHJlcy5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGltYWdlTGlzdC5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBsb2FkSW1hZ2UgPSB1cGxvYWRVcmxMaXN0LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgbGV0IG5hbWUgPSB0aGlzLmhhbmRsZU5hbWUoaXRlbS5uYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZUFsbChcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYCFbJHtuYW1lfV0oJHt1cGxvYWRJbWFnZX0pYFxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhlbHBlci5zZXRWYWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiVXBsb2FkIGVycm9yXCIpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIOWJqui0tOadv+S4reaYr+WbvueJh+aXtui/m+ihjOS4iuS8oFxuICAgICAgICAgIGlmICh0aGlzLmNhblVwbG9hZChldnQuY2xpcGJvYXJkRGF0YSkpIHtcbiAgICAgICAgICAgIHRoaXMudXBsb2FkRmlsZUFuZEVtYmVkSW1ndXJJbWFnZShcbiAgICAgICAgICAgICAgZWRpdG9yLFxuICAgICAgICAgICAgICBhc3luYyAoZWRpdG9yOiBFZGl0b3IsIHBhc3RlSWQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZXM6IGFueTtcbiAgICAgICAgICAgICAgICByZXMgPSBhd2FpdCB0aGlzLnVwbG9hZGVyLnVwbG9hZEZpbGVCeUNsaXBib2FyZChcbiAgICAgICAgICAgICAgICAgIGV2dC5jbGlwYm9hcmREYXRhLmZpbGVzXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXMuY29kZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGYWlsZWRVcGxvYWQoZWRpdG9yLCBwYXN0ZUlkLCByZXMubXNnKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gcmVzLmRhdGE7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBldnQuY2xpcGJvYXJkRGF0YVxuICAgICAgICAgICAgKS5jYXRjaCgpO1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICApXG4gICAgKTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oXG4gICAgICAgIFwiZWRpdG9yLWRyb3BcIixcbiAgICAgICAgYXN5bmMgKGV2dDogRHJhZ0V2ZW50LCBlZGl0b3I6IEVkaXRvciwgbWFya2Rvd25WaWV3OiBNYXJrZG93blZpZXcpID0+IHtcbiAgICAgICAgICAvLyB3aGVuIGN0cmwga2V5IGlzIHByZXNzZWQsIGRvIG5vdCB1cGxvYWQgaW1hZ2UsIGJlY2F1c2UgaXQgaXMgdXNlZCB0byBzZXQgbG9jYWwgZmlsZVxuICAgICAgICAgIGlmIChldnQuY3RybEtleSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhbGxvd1VwbG9hZCA9IHRoaXMuaGVscGVyLmdldEZyb250bWF0dGVyVmFsdWUoXG4gICAgICAgICAgICBcImltYWdlLWF1dG8tdXBsb2FkXCIsXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnVwbG9hZEJ5Q2xpcFN3aXRjaFxuICAgICAgICAgICk7XG4gICAgICAgICAgbGV0IGZpbGVzID0gZXZ0LmRhdGFUcmFuc2Zlci5maWxlcztcblxuICAgICAgICAgIGlmICghYWxsb3dVcGxvYWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZmlsZXMubGVuZ3RoICE9PSAwICYmIGZpbGVzWzBdLnR5cGUuc3RhcnRzV2l0aChcImltYWdlXCIpKSB7XG4gICAgICAgICAgICBsZXQgc2VuZEZpbGVzOiBBcnJheTxzdHJpbmc+ID0gW107XG4gICAgICAgICAgICBsZXQgZmlsZXMgPSBldnQuZGF0YVRyYW5zZmVyLmZpbGVzO1xuICAgICAgICAgICAgQXJyYXkuZnJvbShmaWxlcykuZm9yRWFjaCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGl0ZW0ucGF0aCkge1xuICAgICAgICAgICAgICAgIHNlbmRGaWxlcy5wdXNoKGl0ZW0ucGF0aCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyB3ZWJVdGlscyB9ID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSB3ZWJVdGlscy5nZXRQYXRoRm9yRmlsZShpdGVtKTtcbiAgICAgICAgICAgICAgICBzZW5kRmlsZXMucHVzaChwYXRoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMudXBsb2FkZXIudXBsb2FkRmlsZXMoc2VuZEZpbGVzKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEuc3VjY2Vzcykge1xuICAgICAgICAgICAgICBkYXRhLnJlc3VsdC5tYXAoKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcGFzdGVJZCA9IChNYXRoLnJhbmRvbSgpICsgMSkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA1KTtcbiAgICAgICAgICAgICAgICB0aGlzLmluc2VydFRlbXBvcmFyeVRleHQoZWRpdG9yLCBwYXN0ZUlkKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtYmVkTWFya0Rvd25JbWFnZShlZGl0b3IsIHBhc3RlSWQsIHZhbHVlLCBmaWxlc1swXS5uYW1lKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiVXBsb2FkIGVycm9yXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuICBjYW5VcGxvYWQoY2xpcGJvYXJkRGF0YTogRGF0YVRyYW5zZmVyKSB7XG4gICAgdGhpcy5zZXR0aW5ncy5hcHBseUltYWdlO1xuICAgIGNvbnN0IGZpbGVzID0gY2xpcGJvYXJkRGF0YS5maWxlcztcbiAgICBjb25zdCB0ZXh0ID0gY2xpcGJvYXJkRGF0YS5nZXREYXRhKFwidGV4dFwiKTtcblxuICAgIGNvbnN0IGhhc0ltYWdlRmlsZSA9XG4gICAgICBmaWxlcy5sZW5ndGggIT09IDAgJiYgZmlsZXNbMF0udHlwZS5zdGFydHNXaXRoKFwiaW1hZ2VcIik7XG4gICAgaWYgKGhhc0ltYWdlRmlsZSkge1xuICAgICAgaWYgKCEhdGV4dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5hcHBseUltYWdlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB1cGxvYWRGaWxlQW5kRW1iZWRJbWd1ckltYWdlKFxuICAgIGVkaXRvcjogRWRpdG9yLFxuICAgIGNhbGxiYWNrOiBGdW5jdGlvbixcbiAgICBjbGlwYm9hcmREYXRhOiBEYXRhVHJhbnNmZXJcbiAgKSB7XG4gICAgbGV0IHBhc3RlSWQgPSAoTWF0aC5yYW5kb20oKSArIDEpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgNSk7XG4gICAgdGhpcy5pbnNlcnRUZW1wb3JhcnlUZXh0KGVkaXRvciwgcGFzdGVJZCk7XG4gICAgY29uc3QgbmFtZSA9IGNsaXBib2FyZERhdGEuZmlsZXNbMF0ubmFtZTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cmwgPSBhd2FpdCBjYWxsYmFjayhlZGl0b3IsIHBhc3RlSWQpO1xuICAgICAgdGhpcy5lbWJlZE1hcmtEb3duSW1hZ2UoZWRpdG9yLCBwYXN0ZUlkLCB1cmwsIG5hbWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuaGFuZGxlRmFpbGVkVXBsb2FkKGVkaXRvciwgcGFzdGVJZCwgZSk7XG4gICAgfVxuICB9XG5cbiAgaW5zZXJ0VGVtcG9yYXJ5VGV4dChlZGl0b3I6IEVkaXRvciwgcGFzdGVJZDogc3RyaW5nKSB7XG4gICAgbGV0IHByb2dyZXNzVGV4dCA9IGltYWdlQXV0b1VwbG9hZFBsdWdpbi5wcm9ncmVzc1RleHRGb3IocGFzdGVJZCk7XG4gICAgZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24ocHJvZ3Jlc3NUZXh0ICsgXCJcXG5cIik7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBwcm9ncmVzc1RleHRGb3IoaWQ6IHN0cmluZykge1xuICAgIHJldHVybiBgIVtVcGxvYWRpbmcgZmlsZS4uLiR7aWR9XSgpYDtcbiAgfVxuXG4gIGVtYmVkTWFya0Rvd25JbWFnZShcbiAgICBlZGl0b3I6IEVkaXRvcixcbiAgICBwYXN0ZUlkOiBzdHJpbmcsXG4gICAgaW1hZ2VVcmw6IGFueSxcbiAgICBuYW1lOiBzdHJpbmcgPSBcIlwiXG4gICkge1xuICAgIGxldCBwcm9ncmVzc1RleHQgPSBpbWFnZUF1dG9VcGxvYWRQbHVnaW4ucHJvZ3Jlc3NUZXh0Rm9yKHBhc3RlSWQpO1xuICAgIG5hbWUgPSB0aGlzLmhhbmRsZU5hbWUobmFtZSk7XG5cbiAgICBsZXQgbWFya0Rvd25JbWFnZSA9IGAhWyR7bmFtZX1dKCR7aW1hZ2VVcmx9KWA7XG5cbiAgICBpbWFnZUF1dG9VcGxvYWRQbHVnaW4ucmVwbGFjZUZpcnN0T2NjdXJyZW5jZShcbiAgICAgIGVkaXRvcixcbiAgICAgIHByb2dyZXNzVGV4dCxcbiAgICAgIG1hcmtEb3duSW1hZ2VcbiAgICApO1xuICB9XG5cbiAgaGFuZGxlRmFpbGVkVXBsb2FkKGVkaXRvcjogRWRpdG9yLCBwYXN0ZUlkOiBzdHJpbmcsIHJlYXNvbjogYW55KSB7XG4gICAgbmV3IE5vdGljZShyZWFzb24pO1xuICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgcmVxdWVzdDogXCIsIHJlYXNvbik7XG4gICAgbGV0IHByb2dyZXNzVGV4dCA9IGltYWdlQXV0b1VwbG9hZFBsdWdpbi5wcm9ncmVzc1RleHRGb3IocGFzdGVJZCk7XG4gICAgaW1hZ2VBdXRvVXBsb2FkUGx1Z2luLnJlcGxhY2VGaXJzdE9jY3VycmVuY2UoXG4gICAgICBlZGl0b3IsXG4gICAgICBwcm9ncmVzc1RleHQsXG4gICAgICBcIuKaoO+4j3VwbG9hZCBmYWlsZWQsIGNoZWNrIGRldiBjb25zb2xlXCJcbiAgICApO1xuICB9XG5cbiAgaGFuZGxlTmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpbWFnZVNpemVTdWZmaXggPSB0aGlzLnNldHRpbmdzLmltYWdlU2l6ZVN1ZmZpeCB8fCBcIlwiO1xuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuaW1hZ2VEZXNjID09PSBcIm9yaWdpblwiKSB7XG4gICAgICByZXR1cm4gYCR7bmFtZX0ke2ltYWdlU2l6ZVN1ZmZpeH1gO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zZXR0aW5ncy5pbWFnZURlc2MgPT09IFwibm9uZVwiKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MuaW1hZ2VEZXNjID09PSBcInJlbW92ZURlZmF1bHRcIikge1xuICAgICAgaWYgKG5hbWUgPT09IFwiaW1hZ2UucG5nXCIpIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYCR7bmFtZX0ke2ltYWdlU2l6ZVN1ZmZpeH1gO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYCR7bmFtZX0ke2ltYWdlU2l6ZVN1ZmZpeH1gO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyByZXBsYWNlRmlyc3RPY2N1cnJlbmNlKFxuICAgIGVkaXRvcjogRWRpdG9yLFxuICAgIHRhcmdldDogc3RyaW5nLFxuICAgIHJlcGxhY2VtZW50OiBzdHJpbmdcbiAgKSB7XG4gICAgbGV0IGxpbmVzID0gZWRpdG9yLmdldFZhbHVlKCkuc3BsaXQoXCJcXG5cIik7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGNoID0gbGluZXNbaV0uaW5kZXhPZih0YXJnZXQpO1xuICAgICAgaWYgKGNoICE9IC0xKSB7XG4gICAgICAgIGxldCBmcm9tID0geyBsaW5lOiBpLCBjaDogY2ggfTtcbiAgICAgICAgbGV0IHRvID0geyBsaW5lOiBpLCBjaDogY2ggKyB0YXJnZXQubGVuZ3RoIH07XG4gICAgICAgIGVkaXRvci5yZXBsYWNlUmFuZ2UocmVwbGFjZW1lbnQsIGZyb20sIHRvKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXSwibmFtZXMiOlsiY29yZSIsImdsb2JhbCIsInJlcXVpcmUkJDEiLCJyZXF1aXJlJCQyIiwiaXNleGUiLCJwYXRoIiwicmVxdWlyZSQkMCIsIndoaWNoIiwicGF0aEtleU1vZHVsZSIsInJlc29sdmVDb21tYW5kIiwic2hlYmFuZ1JlZ2V4Iiwic2hlYmFuZ0NvbW1hbmQiLCJyZWFkU2hlYmFuZyIsInJlcXVpcmUkJDMiLCJpc1dpbiIsInBhcnNlIiwiZW5vZW50IiwiY3Jvc3NTcGF3bk1vZHVsZSIsInN0cmlwRmluYWxOZXdsaW5lIiwibWltaWNGbiIsIm1pbWljRm5Nb2R1bGUiLCJvbmV0aW1lIiwib25ldGltZU1vZHVsZSIsInNpZ25hbHMiLCJfb3MiLCJfcmVhbHRpbWUiLCJzaWduYWxzQnlOYW1lIiwibWFrZUVycm9yIiwibm9ybWFsaXplU3RkaW8iLCJzdGRpb01vZHVsZSIsInByb2Nlc3MiLCJzaWduYWxFeGl0TW9kdWxlIiwic3Bhd25lZEtpbGwiLCJzcGF3bmVkQ2FuY2VsIiwic2V0dXBUaW1lb3V0IiwidmFsaWRhdGVUaW1lb3V0Iiwic2V0RXhpdEhhbmRsZXIiLCJpc1N0cmVhbSIsImJ1ZmZlclN0cmVhbSIsInN0cmVhbSIsImdldFN0cmVhbSIsImdldFN0cmVhbU1vZHVsZSIsIm1lcmdlU3RyZWFtIiwiaGFuZGxlSW5wdXQiLCJtYWtlQWxsU3RyZWFtIiwiZ2V0U3Bhd25lZFJlc3VsdCIsInZhbGlkYXRlSW5wdXRTeW5jIiwibWVyZ2VQcm9taXNlIiwiZ2V0U3Bhd25lZFByb21pc2UiLCJqb2luQ29tbWFuZCIsImdldEVzY2FwZWRDb21tYW5kIiwicGFyc2VDb21tYW5kIiwicmVxdWlyZSQkNCIsInJlcXVpcmUkJDUiLCJyZXF1aXJlJCQ2IiwicmVxdWlyZSQkNyIsInJlcXVpcmUkJDgiLCJyZXF1aXJlJCQ5IiwicmVxdWlyZSQkMTAiLCJyZXF1aXJlJCQxMSIsImV4ZWNhTW9kdWxlIiwidXNlckluZm8iLCJleGVjYSIsImV4dG5hbWUiLCJCdWZmZXIiLCJzdHJ0b2szLmZyb21CdWZmZXIiLCJzdHJ0b2szLmZyb21TdHJlYW0iLCJzdHJ0b2szLkVuZE9mU3RyZWFtRXJyb3IiLCJUb2tlbi5TdHJpbmdUeXBlIiwiVG9rZW4uVUlOVDgiLCJUb2tlbi5JTlQzMl9CRSIsIlRva2VuLlVJTlQ2NF9MRSIsIlRva2VuLlVJTlQxNl9CRSIsIlRva2VuLlVJTlQxNl9MRSIsIlRva2VuLlVJTlQzMl9CRSIsIlRva2VuLlVJTlQzMl9MRSIsIm1vbWVudCIsIm5vcm1hbGl6ZVBhdGgiLCJyZWxhdGl2ZSIsIk5vdGljZSIsInJlcXVlc3RVcmwiLCJqb2luIiwicmVhZEZpbGUiLCJleGVjIiwiTWFya2Rvd25WaWV3IiwiUGx1Z2luU2V0dGluZ1RhYiIsIlNldHRpbmciLCJQbHVnaW4iLCJhZGRJY29uIiwiVEZpbGUiLCJiYXNlbmFtZSIsInVubGluayIsInJlc29sdmUiLCJkaXJuYW1lIiwiZXhpc3RzU3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEwQkEsU0FBUyxVQUFVLENBQUMsSUFBSSxFQUFFO0FBQzFCLEVBQUUsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7QUFDaEMsSUFBSSxNQUFNLElBQUksU0FBUyxDQUFDLGtDQUFrQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNuRixHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0E7QUFDQSxTQUFTLG9CQUFvQixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7QUFDcEQsRUFBRSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDZixFQUFFLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLEVBQUUsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDckIsRUFBRSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFDZixFQUFFLElBQUksSUFBSSxDQUFDO0FBQ1gsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRTtBQUN6QyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNO0FBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsU0FBUyxJQUFJLElBQUksS0FBSyxFQUFFO0FBQ3hCLE1BQU0sTUFBTTtBQUNaO0FBQ0EsTUFBTSxJQUFJLEdBQUcsRUFBRSxPQUFPO0FBQ3RCLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRSxRQUFRO0FBQzNCLE1BQU0sSUFBSSxTQUFTLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBRXRDLE1BQU0s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QUM7O0FDckNNLE1BQU0sVUFBVSxHQUFHO0FBQzFCLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsSUFBSTtBQUNMLENBQUMsS0FBSztBQUNOLENBQUMsSUFBSTtBQUNMLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsT0FBTztBQUNSLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsTUFBTTtBQUNQLENBQUMsT0FBTztBQUNSLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsSUFBSTtBQUNMLENBQUMsSUFBSTtBQUNMLENBQUMsUUFBUTtBQUNULENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsSUFBSTtBQUNMLENBQUMsS0FBSztBQUNOLENBQUMsR0FBRztBQUNKLENBQUMsSUFBSTtBQUNMLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsT0FBTztBQUNSLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsTUFBTTtBQUNQLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsSUFBSTtBQUNMLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsTUFBTTtBQUNQLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsT0FBTztBQUNSLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNOLENBQUMsS0FBSztBQUNO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SUFBSSxDQUFDO0FBQ0wsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQzVDLEdBQUcsT0FBTztBQUNWLElBQUksR0FBRyxFQUFFLEtBQUs7QUFDZCxJQUFJLElBQUksRUFBRSxtQkFBbUI7QUFDN0IsSUFBSSxDQUFDO0FBQ0wsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQzVDLEdBQUcsT0FBTztBQUNWLElBQUksR0FBRyxFQUFFLEtBQUs7QUFDZCxJQUFJLElBQUksRUFBRSxpQkFBaUI7QUFDM0IsSUFBSSxDQUFDO0FBQ0wsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQzVDLEdBQUcsT0FBTztBQUNWLElBQUksR0FBRyxFQUFFLEtBQUs7QUFDZCxJQUFJLElBQUksRUFBRSxrQkFBa0I7QUFDNUIsSUFBSSxDQUFDO0FBQ0wsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQzVDLEdBQUcsT0FBTztBQUNWLElBQUksR0FBRyxFQUFFLEtBQUs7QUFDZCxJQUFJLElBQUksRUFBRSxtQkFBbUI7QUFDN0IsSUFBSSxDQUFDO0FBQ0wsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQzVDLEdBQUcsT0FBTztBQUNWLElBQUksR0FB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QUM7QUFDTCxHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUM5QyxHQUFHLE9BQU87QUFDVixJQUFJLEdBQUcsRUFBRSxLQUFLO0FBQ2QsSUFBSSxJQUFJLEVBQUUsYUFBYTtBQUN2QixJQUFJLENBQUM7QUFDTCxHQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUMvRCxHQUFHLE9BQU87QUFDVixJQUFJLEdBQUcsRUFBRSxLQUFLO0FBQ2QsSUFBSSxJQUFJLEVBQUUsWUFBWTtBQUN0QixJQUFJLENBQUM7QUFDTCxHQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUM1RSxHQUFHLE9BQU87QUFDVixJQUFJLEdBQUcsRUFBRSxLQUFLO0FBQ2QsSUFBSSxJQUFJLEVBQUUsWUFBWTtBQUN0QixJQUFJLENBQUM7QUFDTCxHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ2xGLEdBQUcsT0FBTztBQUNWLElBQUksR0FBRyxFQUFFLE1BQU07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LFFBQVEsRUFBRTtBQUN4QyxZQUFBLE9BQU8sQ0FBRyxFQUFBLElBQUksQ0FBRyxFQUFBLGVBQWUsRUFBRSxDQUFDO1NBQ3BDO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxNQUFNLEVBQUU7QUFDN0MsWUFBQSxPQUFPLEVBQUUsQ0FBQztTQUNYO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsS0FBSyxlQUFlLEVBQUU7QUFDdEQsWUFBQSxJQUFJLElBQUksS0FBSyxXQUFXLEVBQUU7QUFDeEIsZ0JBQUEsT0FBTyxFQUFFLENBQUM7YUFDWDtpQkFBTTtBQUNMLGdCQUFBLE9BQU8sQ0FBRyxFQUFBLElBQUksQ0FBRyxFQUFBLGVBQWUsRUFBRSxDQUFDO2FBQ3BDO1NBQ0Y7YUFBTTtBQUNMLFlBQUEsT0FBTyxDQUFHLEVBQUEsSUFBSSxDQUFHLEVBQUEsZUFBZSxFQUFFLENBQUM7U0FDcEM7S0FDRjtBQUVELElBQUEsT0FBTyxzQkFBc0IsQ0FDM0IsTUFBYyxFQUNkLE1BQWMsRUFDZCxXQUFtQixFQUFBO1FBRW5CLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUMsUUFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNyQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xDLFlBQUEsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQ1osSUFBSSxJQUFJLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUMvQixnQkFBQSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDM0MsTUFBTTthQUNQO1NBQ0Y7S0FDRjtBQUNGOzs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5LDIwLDIxLDIyLDIzLDI0LDI1LDI2LDI3LDI4LDI5LDMwLDMxLDMyLDMzLDM0LDM1LDM2LDM3LDM4LDM5LDQwLDQyLDQzLDQ0LDQ1LDQ2LDQ3LDQ4LDQ5LDUwLDUxLDUyLDUzLDU0XX0=
