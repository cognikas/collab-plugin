import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER: EMPTY_BUFFER2 } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER2;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER: EMPTY_BUFFER2,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER2;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER2);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER: EMPTY_BUFFER2, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER2;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http2 = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER: EMPTY_BUFFER2,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER2;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER2, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER2, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER2, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http2.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../node_modules/.pnpm/ws@8.21.3/node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http2 = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http2.createServer((req, res) => {
            const body = http2.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http2.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http2.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// src/daemon.ts
import crypto from "node:crypto";
import http from "node:http";
import fs4 from "node:fs";
import path3 from "node:path";

// ../node_modules/.pnpm/ws@8.21.3/node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);
var wrapper_default = import_websocket.default;

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/names.js
function protoCamelCase(snakeCase) {
  let capNext = false;
  const b = [];
  for (let i = 0; i < snakeCase.length; i++) {
    let c = snakeCase.charAt(i);
    switch (c) {
      case "_":
        capNext = true;
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        b.push(c);
        capNext = false;
        break;
      default:
        if (capNext) {
          capNext = false;
          c = c.toUpperCase();
        }
        b.push(c);
        break;
    }
  }
  return b.join("");
}
function protoSnakeCase(lowerCamelCase) {
  return lowerCamelCase.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
}
var reservedObjectProperties = /* @__PURE__ */ new Set([
  // names reserved by JavaScript
  "constructor",
  "toString",
  "toJSON",
  "valueOf"
]);
function safeObjectProperty(name) {
  return reservedObjectProperties.has(name) ? name + "$" : name;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wire/varint.js
function varint64read() {
  const buf = this.buf;
  let pos = this.pos;
  let lo = 0;
  let hi = 0;
  for (let shift = 0; shift < 28; shift += 7) {
    const b = buf[pos++];
    lo |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.pos = pos;
      this.assertBounds();
      this.varint64Lo = lo;
      this.varint64Hi = hi;
      return;
    }
  }
  const middleByte = buf[pos++];
  lo |= (middleByte & 15) << 28;
  hi = (middleByte & 112) >> 4;
  if ((middleByte & 128) == 0) {
    this.pos = pos;
    this.assertBounds();
    this.varint64Lo = lo;
    this.varint64Hi = hi;
    return;
  }
  for (let shift = 3; shift <= 31; shift += 7) {
    const b = buf[pos++];
    hi |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.pos = pos;
      this.assertBounds();
      this.varint64Lo = lo;
      this.varint64Hi = hi;
      return;
    }
  }
  throw new Error("invalid varint");
}
var TWO_PWR_32_DBL = 4294967296;
function int64FromString(dec) {
  const minus = dec[0] === "-";
  if (minus) {
    dec = dec.slice(1);
  }
  const base = 1e6;
  let lowBits = 0;
  let highBits = 0;
  function add1e6digit(begin, end) {
    const digit1e6 = Number(dec.slice(begin, end));
    highBits *= base;
    lowBits = lowBits * base + digit1e6;
    if (lowBits >= TWO_PWR_32_DBL) {
      highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
      lowBits = lowBits % TWO_PWR_32_DBL;
    }
  }
  add1e6digit(-24, -18);
  add1e6digit(-18, -12);
  add1e6digit(-12, -6);
  add1e6digit(-6);
  return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}
function int64ToString(lo, hi) {
  let bits = newBits(lo, hi);
  const negative = bits.hi & 2147483648;
  if (negative) {
    bits = negate(bits.lo, bits.hi);
  }
  const result = uInt64ToString(bits.lo, bits.hi);
  return negative ? "-" + result : result;
}
function uInt64ToString(lo, hi) {
  ({ lo, hi } = toUnsigned(lo, hi));
  if (hi <= 2097151) {
    return String(TWO_PWR_32_DBL * hi + lo);
  }
  const low = lo & 16777215;
  const mid = (lo >>> 24 | hi << 8) & 16777215;
  const high = hi >> 16 & 65535;
  let digitA = low + mid * 6777216 + high * 6710656;
  let digitB = mid + high * 8147497;
  let digitC = high * 2;
  const base = 1e7;
  if (digitA >= base) {
    digitB += Math.floor(digitA / base);
    digitA %= base;
  }
  if (digitB >= base) {
    digitC += Math.floor(digitB / base);
    digitB %= base;
  }
  return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA);
}
function toUnsigned(lo, hi) {
  return { lo: lo >>> 0, hi: hi >>> 0 };
}
function newBits(lo, hi) {
  return { lo: lo | 0, hi: hi | 0 };
}
function negate(lowBits, highBits) {
  highBits = ~highBits;
  if (lowBits) {
    lowBits = ~lowBits + 1;
  } else {
    highBits += 1;
  }
  return newBits(lowBits, highBits);
}
var decimalFrom1e7WithLeadingZeros = (digit1e7) => {
  const partial = String(digit1e7);
  return "0000000".slice(partial.length) + partial;
};
function varint32write(value, bytes) {
  if (value >>> 0 < 128) {
    bytes.push(value);
    return;
  }
  if (value >= 0) {
    while (value > 127) {
      bytes.push(value & 127 | 128);
      value = value >>> 7;
    }
    bytes.push(value);
  } else {
    for (let i = 0; i < 9; i++) {
      bytes.push(value & 127 | 128);
      value = value >> 7;
    }
    bytes.push(1);
  }
}
function varint32read() {
  let b = this.buf[this.pos++];
  if ((b & 128) === 0) {
    this.assertBounds();
    return b;
  }
  let result = b & 127;
  b = this.buf[this.pos++];
  result |= (b & 127) << 7;
  if ((b & 128) === 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 14;
  if ((b & 128) === 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 21;
  if ((b & 128) === 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 15) << 28;
  for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++)
    b = this.buf[this.pos++];
  if ((b & 128) !== 0)
    throw new Error("invalid varint");
  this.assertBounds();
  return result >>> 0;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/proto-int64.js
var protoInt64 = /* @__PURE__ */ makeInt64Support();
function makeInt64Support() {
  const dv = new DataView(new ArrayBuffer(8));
  const ok = typeof BigInt === "function" && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function" && (!!globalThis.Deno || !!globalThis.Bun || typeof process != "object" || typeof process.env != "object" || process.env.BUF_BIGINT_DISABLE !== "1");
  if (ok) {
    const MIN = BigInt("-9223372036854775808");
    const MAX = BigInt("9223372036854775807");
    const UMIN = BigInt("0");
    const UMAX = BigInt("18446744073709551615");
    return {
      zero: BigInt(0),
      supported: true,
      parse(value) {
        const bi = typeof value == "bigint" ? value : BigInt(value);
        if (bi > MAX || bi < MIN) {
          throw new Error(`invalid int64: ${value}`);
        }
        return bi;
      },
      uParse(value) {
        const bi = typeof value == "bigint" ? value : BigInt(value);
        if (bi > UMAX || bi < UMIN) {
          throw new Error(`invalid uint64: ${value}`);
        }
        return bi;
      },
      enc(value) {
        dv.setBigInt64(0, this.parse(value), true);
        return {
          lo: dv.getInt32(0, true),
          hi: dv.getInt32(4, true)
        };
      },
      uEnc(value) {
        dv.setBigInt64(0, this.uParse(value), true);
        return {
          lo: dv.getInt32(0, true),
          hi: dv.getInt32(4, true)
        };
      },
      dec(lo, hi) {
        dv.setInt32(0, lo, true);
        dv.setInt32(4, hi, true);
        return dv.getBigInt64(0, true);
      },
      uDec(lo, hi) {
        dv.setInt32(0, lo, true);
        dv.setInt32(4, hi, true);
        return dv.getBigUint64(0, true);
      }
    };
  }
  return {
    zero: "0",
    supported: false,
    parse(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertInt64String(value);
      return value;
    },
    uParse(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertUInt64String(value);
      return value;
    },
    enc(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertInt64String(value);
      return int64FromString(value);
    },
    uEnc(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertUInt64String(value);
      return int64FromString(value);
    },
    dec(lo, hi) {
      return int64ToString(lo, hi);
    },
    uDec(lo, hi) {
      return uInt64ToString(lo, hi);
    }
  };
}
function assertInt64String(value) {
  if (!/^-?[0-9]+$/.test(value)) {
    throw new Error("invalid int64: " + value);
  }
}
function assertUInt64String(value) {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error("invalid uint64: " + value);
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/descriptors.js
var ScalarType;
(function(ScalarType2) {
  ScalarType2[ScalarType2["DOUBLE"] = 1] = "DOUBLE";
  ScalarType2[ScalarType2["FLOAT"] = 2] = "FLOAT";
  ScalarType2[ScalarType2["INT64"] = 3] = "INT64";
  ScalarType2[ScalarType2["UINT64"] = 4] = "UINT64";
  ScalarType2[ScalarType2["INT32"] = 5] = "INT32";
  ScalarType2[ScalarType2["FIXED64"] = 6] = "FIXED64";
  ScalarType2[ScalarType2["FIXED32"] = 7] = "FIXED32";
  ScalarType2[ScalarType2["BOOL"] = 8] = "BOOL";
  ScalarType2[ScalarType2["STRING"] = 9] = "STRING";
  ScalarType2[ScalarType2["BYTES"] = 12] = "BYTES";
  ScalarType2[ScalarType2["UINT32"] = 13] = "UINT32";
  ScalarType2[ScalarType2["SFIXED32"] = 15] = "SFIXED32";
  ScalarType2[ScalarType2["SFIXED64"] = 16] = "SFIXED64";
  ScalarType2[ScalarType2["SINT32"] = 17] = "SINT32";
  ScalarType2[ScalarType2["SINT64"] = 18] = "SINT64";
})(ScalarType || (ScalarType = {}));

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/scalar.js
function scalarZeroValue(type, longAsString) {
  switch (type) {
    case ScalarType.STRING:
      return "";
    case ScalarType.BOOL:
      return false;
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return 0;
    case ScalarType.INT64:
    case ScalarType.UINT64:
    case ScalarType.SFIXED64:
    case ScalarType.FIXED64:
    case ScalarType.SINT64:
      return longAsString ? "0" : protoInt64.zero;
    case ScalarType.BYTES:
      return new Uint8Array(0);
    default:
      return 0;
  }
}
function isScalarZeroValue(type, value) {
  switch (type) {
    case ScalarType.BOOL:
      return value === false;
    case ScalarType.STRING:
      return value === "";
    case ScalarType.BYTES:
      return value instanceof Uint8Array && !value.byteLength;
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return Object.is(value, 0);
    default:
      return value == 0;
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/unsafe.js
var IMPLICIT = 2;
var unsafeLocal = /* @__PURE__ */ Symbol.for("reflect unsafe local");
function unsafeOneofCase(target, oneof) {
  const c = target[oneof.localName].case;
  if (c === void 0) {
    return c;
  }
  return oneof.fields.find((f) => f.localName === c);
}
function unsafeIsSet(target, field) {
  const name = field.localName;
  if (field.oneof) {
    return target[field.oneof.localName].case === name;
  }
  if (field.presence != IMPLICIT) {
    return target[name] !== void 0 && Object.prototype.hasOwnProperty.call(target, name);
  }
  switch (field.fieldKind) {
    case "list":
      return target[name].length > 0;
    case "map":
      return Object.keys(target[name]).length > 0;
    case "scalar":
      return !isScalarZeroValue(field.scalar, target[name]);
    case "enum":
      return target[name] !== field.enum.values[0].number;
  }
  throw new Error("message field with implicit presence");
}
function unsafeIsSetExplicit(target, localName) {
  return Object.prototype.hasOwnProperty.call(target, localName) && target[localName] !== void 0;
}
function unsafeGet(target, field) {
  if (field.oneof) {
    const oneof = target[field.oneof.localName];
    if (oneof.case === field.localName) {
      return oneof.value;
    }
    return void 0;
  }
  return target[field.localName];
}
function unsafeSet(target, field, value) {
  if (field.oneof) {
    target[field.oneof.localName] = {
      case: field.localName,
      value
    };
  } else {
    target[field.localName] = value;
  }
}
function unsafeClear(target, field) {
  const name = field.localName;
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    if (target[oneofLocalName].case === name) {
      target[oneofLocalName] = { case: void 0 };
    }
  } else if (field.presence != IMPLICIT) {
    delete target[name];
  } else {
    switch (field.fieldKind) {
      case "map":
        target[name] = {};
        break;
      case "list":
        target[name] = [];
        break;
      case "enum":
        target[name] = field.enum.values[0].number;
        break;
      case "scalar":
        target[name] = scalarZeroValue(field.scalar, field.longAsString);
        break;
    }
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/restore-json-names.js
function restoreJsonNames(message) {
  for (const f of message.field) {
    if (!unsafeIsSetExplicit(f, "jsonName")) {
      f.jsonName = protoCamelCase(f.name);
    }
  }
  message.nestedType.forEach(restoreJsonNames);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wire/text-format.js
function parseTextFormatEnumValue(descEnum, value) {
  const enumValue = descEnum.values.find((v) => v.name === value);
  if (!enumValue) {
    throw new Error(`cannot parse ${descEnum} default value: ${value}`);
  }
  return enumValue.number;
}
function parseTextFormatScalarValue(type, value) {
  switch (type) {
    case ScalarType.STRING:
      return value;
    case ScalarType.BYTES: {
      const u = unescapeBytesDefaultValue(value);
      if (u === false) {
        throw new Error(`cannot parse ${ScalarType[type]} default value: ${value}`);
      }
      return u;
    }
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      return protoInt64.parse(value);
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return protoInt64.uParse(value);
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      switch (value) {
        case "inf":
          return Number.POSITIVE_INFINITY;
        case "-inf":
          return Number.NEGATIVE_INFINITY;
        case "nan":
          return Number.NaN;
        default:
          return parseFloat(value);
      }
    case ScalarType.BOOL:
      return value === "true";
    case ScalarType.INT32:
    case ScalarType.UINT32:
    case ScalarType.SINT32:
    case ScalarType.FIXED32:
    case ScalarType.SFIXED32:
      return parseInt(value, 10);
  }
}
function unescapeBytesDefaultValue(str) {
  const b = [];
  const input = {
    tail: str,
    c: "",
    next() {
      if (this.tail.length == 0) {
        return false;
      }
      this.c = this.tail[0];
      this.tail = this.tail.substring(1);
      return true;
    },
    take(n) {
      if (this.tail.length >= n) {
        const r = this.tail.substring(0, n);
        this.tail = this.tail.substring(n);
        return r;
      }
      return false;
    }
  };
  while (input.next()) {
    switch (input.c) {
      case "\\":
        if (input.next()) {
          switch (input.c) {
            case "\\":
              b.push(input.c.charCodeAt(0));
              break;
            case "b":
              b.push(8);
              break;
            case "f":
              b.push(12);
              break;
            case "n":
              b.push(10);
              break;
            case "r":
              b.push(13);
              break;
            case "t":
              b.push(9);
              break;
            case "v":
              b.push(11);
              break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7": {
              const s = input.c;
              const t = input.take(2);
              if (t === false) {
                return false;
              }
              const n = parseInt(s + t, 8);
              if (Number.isNaN(n)) {
                return false;
              }
              b.push(n);
              break;
            }
            case "x": {
              const s = input.c;
              const t = input.take(2);
              if (t === false) {
                return false;
              }
              const n = parseInt(s + t, 16);
              if (Number.isNaN(n)) {
                return false;
              }
              b.push(n);
              break;
            }
            case "u": {
              const s = input.c;
              const t = input.take(4);
              if (t === false) {
                return false;
              }
              const n = parseInt(s + t, 16);
              if (Number.isNaN(n)) {
                return false;
              }
              const chunk = new Uint8Array(4);
              const view = new DataView(chunk.buffer);
              view.setInt32(0, n, true);
              b.push(chunk[0], chunk[1], chunk[2], chunk[3]);
              break;
            }
            case "U": {
              const s = input.c;
              const t = input.take(8);
              if (t === false) {
                return false;
              }
              const tc = protoInt64.uEnc(s + t);
              const chunk = new Uint8Array(8);
              const view = new DataView(chunk.buffer);
              view.setInt32(0, tc.lo, true);
              view.setInt32(4, tc.hi, true);
              b.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
              break;
            }
          }
        }
        break;
      default:
        b.push(input.c.charCodeAt(0));
    }
  }
  return new Uint8Array(b);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/nested-types.js
function* nestedTypes(desc) {
  switch (desc.kind) {
    case "file":
      for (const message of desc.messages) {
        yield message;
        yield* nestedTypes(message);
      }
      yield* desc.enums;
      yield* desc.services;
      yield* desc.extensions;
      break;
    case "message":
      for (const message of desc.nestedMessages) {
        yield message;
        yield* nestedTypes(message);
      }
      yield* desc.nestedEnums;
      yield* desc.nestedExtensions;
      break;
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/registry.js
function createFileRegistry(...args) {
  const registry = createBaseRegistry();
  if (!args.length) {
    return registry;
  }
  if ("$typeName" in args[0] && args[0].$typeName == "google.protobuf.FileDescriptorSet") {
    for (const file2 of args[0].file) {
      addFile(file2, registry);
    }
    return registry;
  }
  if ("$typeName" in args[0]) {
    let recurseDeps = function(file2) {
      const deps = [];
      for (const protoFileName of file2.dependency) {
        if (registry.getFile(protoFileName) != void 0) {
          continue;
        }
        if (seen.has(protoFileName)) {
          continue;
        }
        const dep = resolve(protoFileName);
        if (!dep) {
          throw new Error(`Unable to resolve ${protoFileName}, imported by ${file2.name}`);
        }
        if ("kind" in dep) {
          registry.addFile(dep, false, true);
        } else {
          seen.add(dep.name);
          deps.push(dep);
        }
      }
      return deps.concat(...deps.map(recurseDeps));
    };
    const input = args[0];
    const resolve = args[1];
    const seen = /* @__PURE__ */ new Set();
    for (const file2 of [input, ...recurseDeps(input)].reverse()) {
      addFile(file2, registry);
    }
  } else {
    for (const fileReg of args) {
      for (const file2 of fileReg.files) {
        registry.addFile(file2);
      }
    }
  }
  return registry;
}
function createBaseRegistry() {
  const types = /* @__PURE__ */ new Map();
  const extendees = /* @__PURE__ */ new Map();
  const files = /* @__PURE__ */ new Map();
  return {
    kind: "registry",
    types,
    extendees,
    [Symbol.iterator]() {
      return types.values();
    },
    get files() {
      return files.values();
    },
    addFile(file2, skipTypes, withDeps) {
      files.set(file2.proto.name, file2);
      if (!skipTypes) {
        for (const type of nestedTypes(file2)) {
          this.add(type);
        }
      }
      if (withDeps) {
        for (const f of file2.dependencies) {
          this.addFile(f, skipTypes, withDeps);
        }
      }
    },
    add(desc) {
      if (desc.kind == "extension") {
        let numberToExt = extendees.get(desc.extendee.typeName);
        if (!numberToExt) {
          extendees.set(
            desc.extendee.typeName,
            // biome-ignore lint/suspicious/noAssignInExpressions: no
            numberToExt = /* @__PURE__ */ new Map()
          );
        }
        numberToExt.set(desc.number, desc);
      }
      types.set(desc.typeName, desc);
    },
    get(typeName) {
      return types.get(typeName);
    },
    getFile(fileName) {
      return files.get(fileName);
    },
    getMessage(typeName) {
      const t = types.get(typeName);
      return (t === null || t === void 0 ? void 0 : t.kind) == "message" ? t : void 0;
    },
    getEnum(typeName) {
      const t = types.get(typeName);
      return (t === null || t === void 0 ? void 0 : t.kind) == "enum" ? t : void 0;
    },
    getExtension(typeName) {
      const t = types.get(typeName);
      return (t === null || t === void 0 ? void 0 : t.kind) == "extension" ? t : void 0;
    },
    getExtensionFor(extendee, no) {
      var _a;
      return (_a = extendees.get(extendee.typeName)) === null || _a === void 0 ? void 0 : _a.get(no);
    },
    getService(typeName) {
      const t = types.get(typeName);
      return (t === null || t === void 0 ? void 0 : t.kind) == "service" ? t : void 0;
    }
  };
}
var EDITION_PROTO2 = 998;
var EDITION_PROTO3 = 999;
var EDITION_UNSTABLE = 9999;
var TYPE_STRING = 9;
var TYPE_GROUP = 10;
var TYPE_MESSAGE = 11;
var TYPE_BYTES = 12;
var TYPE_ENUM = 14;
var LABEL_REPEATED = 3;
var LABEL_REQUIRED = 2;
var JS_STRING = 1;
var IDEMPOTENCY_UNKNOWN = 0;
var EXPLICIT = 1;
var IMPLICIT2 = 2;
var LEGACY_REQUIRED = 3;
var PACKED = 1;
var DELIMITED = 2;
var OPEN = 1;
var VERIFY = 2;
var maximumEdition = 1001;
var featureDefaults = {
  // EDITION_PROTO2
  998: {
    fieldPresence: 1,
    // EXPLICIT,
    enumType: 2,
    // CLOSED,
    repeatedFieldEncoding: 2,
    // EXPANDED,
    utf8Validation: 3,
    // NONE,
    messageEncoding: 1,
    // LENGTH_PREFIXED,
    jsonFormat: 2,
    // LEGACY_BEST_EFFORT,
    enforceNamingStyle: 2,
    // STYLE_LEGACY,
    defaultSymbolVisibility: 1
    // EXPORT_ALL,
  },
  // EDITION_PROTO3
  999: {
    fieldPresence: 2,
    // IMPLICIT,
    enumType: 1,
    // OPEN,
    repeatedFieldEncoding: 1,
    // PACKED,
    utf8Validation: 2,
    // VERIFY,
    messageEncoding: 1,
    // LENGTH_PREFIXED,
    jsonFormat: 1,
    // ALLOW,
    enforceNamingStyle: 2,
    // STYLE_LEGACY,
    defaultSymbolVisibility: 1
    // EXPORT_ALL,
  },
  // EDITION_2023
  1e3: {
    fieldPresence: 1,
    // EXPLICIT,
    enumType: 1,
    // OPEN,
    repeatedFieldEncoding: 1,
    // PACKED,
    utf8Validation: 2,
    // VERIFY,
    messageEncoding: 1,
    // LENGTH_PREFIXED,
    jsonFormat: 1,
    // ALLOW,
    enforceNamingStyle: 2,
    // STYLE_LEGACY,
    defaultSymbolVisibility: 1
    // EXPORT_ALL,
  },
  // EDITION_2024
  1001: {
    fieldPresence: 1,
    // EXPLICIT,
    enumType: 1,
    // OPEN,
    repeatedFieldEncoding: 1,
    // PACKED,
    utf8Validation: 2,
    // VERIFY,
    messageEncoding: 1,
    // LENGTH_PREFIXED,
    jsonFormat: 1,
    // ALLOW,
    enforceNamingStyle: 1,
    // STYLE2024,
    defaultSymbolVisibility: 2
    // EXPORT_TOP_LEVEL,
  }
};
function addFile(proto, reg) {
  var _a, _b;
  const file2 = {
    kind: "file",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
    edition: getFileEdition(proto),
    name: proto.name.replace(/\.proto$/, ""),
    dependencies: findFileDependencies(proto, reg),
    enums: [],
    messages: [],
    extensions: [],
    services: [],
    toString() {
      return `file ${proto.name}`;
    }
  };
  const mapEntriesStore = /* @__PURE__ */ new Map();
  const mapEntries = {
    get(typeName) {
      return mapEntriesStore.get(typeName);
    },
    add(desc) {
      var _a2;
      assert(((_a2 = desc.proto.options) === null || _a2 === void 0 ? void 0 : _a2.mapEntry) === true);
      mapEntriesStore.set(desc.typeName, desc);
    }
  };
  for (const enumProto of proto.enumType) {
    addEnum(enumProto, file2, void 0, reg);
  }
  for (const messageProto of proto.messageType) {
    addMessage(messageProto, file2, void 0, reg, mapEntries);
  }
  for (const serviceProto of proto.service) {
    addService(serviceProto, file2, reg);
  }
  addExtensions(file2, reg);
  for (const mapEntry of mapEntriesStore.values()) {
    addFields(mapEntry, reg, mapEntries);
  }
  for (const message of file2.messages) {
    addFields(message, reg, mapEntries);
    addExtensions(message, reg);
  }
  reg.addFile(file2, true);
}
function addExtensions(desc, reg) {
  switch (desc.kind) {
    case "file":
      for (const proto of desc.proto.extension) {
        const ext = newField(proto, desc, reg);
        desc.extensions.push(ext);
        reg.add(ext);
      }
      break;
    case "message":
      for (const proto of desc.proto.extension) {
        const ext = newField(proto, desc, reg);
        desc.nestedExtensions.push(ext);
        reg.add(ext);
      }
      for (const message of desc.nestedMessages) {
        addExtensions(message, reg);
      }
      break;
  }
}
function addFields(message, reg, mapEntries) {
  const allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message));
  const oneofsSeen = /* @__PURE__ */ new Set();
  for (const proto of message.proto.field) {
    const oneof = findOneof(proto, allOneofs);
    const field = newField(proto, message, reg, oneof, mapEntries);
    message.fields.push(field);
    message.field[field.localName] = field;
    if (oneof === void 0) {
      message.members.push(field);
    } else {
      oneof.fields.push(field);
      if (!oneofsSeen.has(oneof)) {
        oneofsSeen.add(oneof);
        message.members.push(oneof);
      }
    }
  }
  for (const oneof of allOneofs.filter((o) => oneofsSeen.has(o))) {
    message.oneofs.push(oneof);
  }
  for (const child of message.nestedMessages) {
    addFields(child, reg, mapEntries);
  }
}
function addEnum(proto, file2, parent, reg) {
  var _a, _b, _c, _d, _e;
  const sharedPrefix = findEnumSharedPrefix(proto.name, proto.value);
  const desc = {
    kind: "enum",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
    file: file2,
    parent,
    open: true,
    name: proto.name,
    typeName: makeTypeName(proto, parent, file2),
    value: {},
    values: [],
    sharedPrefix,
    toString() {
      return `enum ${this.typeName}`;
    }
  };
  desc.open = isEnumOpen(desc);
  reg.add(desc);
  for (const p of proto.value) {
    const name = p.name;
    desc.values.push(
      // biome-ignore lint/suspicious/noAssignInExpressions: no
      desc.value[p.number] = {
        kind: "enum_value",
        proto: p,
        deprecated: (_d = (_c = p.options) === null || _c === void 0 ? void 0 : _c.deprecated) !== null && _d !== void 0 ? _d : false,
        parent: desc,
        name,
        localName: safeObjectProperty(sharedPrefix == void 0 ? name : name.substring(sharedPrefix.length)),
        number: p.number,
        toString() {
          return `enum value ${desc.typeName}.${name}`;
        }
      }
    );
  }
  ((_e = parent === null || parent === void 0 ? void 0 : parent.nestedEnums) !== null && _e !== void 0 ? _e : file2.enums).push(desc);
}
function addMessage(proto, file2, parent, reg, mapEntries) {
  var _a, _b, _c, _d;
  const desc = {
    kind: "message",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
    file: file2,
    parent,
    name: proto.name,
    typeName: makeTypeName(proto, parent, file2),
    fields: [],
    field: {},
    oneofs: [],
    members: [],
    nestedEnums: [],
    nestedMessages: [],
    nestedExtensions: [],
    toString() {
      return `message ${this.typeName}`;
    }
  };
  if (((_c = proto.options) === null || _c === void 0 ? void 0 : _c.mapEntry) === true) {
    mapEntries.add(desc);
  } else {
    ((_d = parent === null || parent === void 0 ? void 0 : parent.nestedMessages) !== null && _d !== void 0 ? _d : file2.messages).push(desc);
    reg.add(desc);
  }
  for (const enumProto of proto.enumType) {
    addEnum(enumProto, file2, desc, reg);
  }
  for (const messageProto of proto.nestedType) {
    addMessage(messageProto, file2, desc, reg, mapEntries);
  }
}
function addService(proto, file2, reg) {
  var _a, _b;
  const desc = {
    kind: "service",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
    file: file2,
    name: proto.name,
    typeName: makeTypeName(proto, void 0, file2),
    methods: [],
    method: {},
    toString() {
      return `service ${this.typeName}`;
    }
  };
  file2.services.push(desc);
  reg.add(desc);
  for (const methodProto of proto.method) {
    const method = newMethod(methodProto, desc, reg);
    desc.methods.push(method);
    desc.method[method.localName] = method;
  }
}
function newMethod(proto, parent, reg) {
  var _a, _b, _c, _d;
  let methodKind;
  if (proto.clientStreaming && proto.serverStreaming) {
    methodKind = "bidi_streaming";
  } else if (proto.clientStreaming) {
    methodKind = "client_streaming";
  } else if (proto.serverStreaming) {
    methodKind = "server_streaming";
  } else {
    methodKind = "unary";
  }
  const input = reg.getMessage(trimLeadingDot(proto.inputType));
  const output = reg.getMessage(trimLeadingDot(proto.outputType));
  assert(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
  assert(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
  const name = proto.name;
  return {
    kind: "rpc",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
    parent,
    name,
    localName: safeObjectProperty(name.length ? safeObjectProperty(name[0].toLowerCase() + name.substring(1)) : name),
    methodKind,
    input,
    output,
    idempotency: (_d = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.idempotencyLevel) !== null && _d !== void 0 ? _d : IDEMPOTENCY_UNKNOWN,
    toString() {
      return `rpc ${parent.typeName}.${name}`;
    }
  };
}
function newOneof(proto, parent) {
  return {
    kind: "oneof",
    proto,
    deprecated: false,
    parent,
    fields: [],
    name: proto.name,
    localName: safeObjectProperty(protoCamelCase(proto.name)),
    toString() {
      return `oneof ${parent.typeName}.${this.name}`;
    }
  };
}
function newField(proto, parentOrFile, reg, oneof, mapEntries) {
  var _a, _b, _c;
  const isExtension = mapEntries === void 0;
  const field = {
    kind: "field",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
    name: proto.name,
    number: proto.number,
    scalar: void 0,
    message: void 0,
    enum: void 0,
    presence: getFieldPresence(proto, oneof, isExtension, parentOrFile),
    utf8Validation: isUtf8Validated(proto, parentOrFile),
    listKind: void 0,
    mapKind: void 0,
    mapKey: void 0,
    delimitedEncoding: void 0,
    packed: void 0,
    longAsString: false,
    getDefaultValue: void 0
  };
  let toStr;
  if (isExtension) {
    const file2 = parentOrFile.kind == "file" ? parentOrFile : parentOrFile.file;
    const parent = parentOrFile.kind == "file" ? void 0 : parentOrFile;
    const typeName = makeTypeName(proto, parent, file2);
    field.kind = "extension";
    field.file = file2;
    field.parent = parent;
    field.oneof = void 0;
    field.typeName = typeName;
    field.jsonName = `[${typeName}]`;
    toStr = () => `extension ${typeName}`;
    const extendee = reg.getMessage(trimLeadingDot(proto.extendee));
    assert(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
    field.extendee = extendee;
  } else {
    const parent = parentOrFile;
    assert(parent.kind == "message");
    field.parent = parent;
    field.oneof = oneof;
    field.localName = oneof ? protoCamelCase(proto.name) : safeObjectProperty(protoCamelCase(proto.name));
    field.jsonName = proto.jsonName;
    toStr = () => `field ${parent.typeName}.${proto.name}`;
  }
  Object.defineProperty(field, "toString", {
    value: toStr,
    writable: true,
    enumerable: true,
    configurable: true
  });
  const label = proto.label;
  const type = proto.type;
  const jstype = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.jstype;
  if (label === LABEL_REPEATED) {
    const mapEntry = type == TYPE_MESSAGE ? mapEntries === null || mapEntries === void 0 ? void 0 : mapEntries.get(trimLeadingDot(proto.typeName)) : void 0;
    if (mapEntry) {
      field.fieldKind = "map";
      const { key, value } = findMapEntryFields(mapEntry);
      field.mapKey = key.scalar;
      field.mapKind = value.fieldKind;
      field.message = value.message;
      field.delimitedEncoding = false;
      field.enum = value.enum;
      field.scalar = value.scalar;
      return field;
    }
    field.fieldKind = "list";
    switch (type) {
      case TYPE_MESSAGE:
      case TYPE_GROUP:
        field.listKind = "message";
        field.message = reg.getMessage(trimLeadingDot(proto.typeName));
        assert(field.message);
        field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
        break;
      case TYPE_ENUM:
        field.listKind = "enum";
        field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
        assert(field.enum);
        break;
      default:
        field.listKind = "scalar";
        field.scalar = type;
        field.longAsString = jstype == JS_STRING;
        break;
    }
    field.packed = isPackedField(proto, parentOrFile);
    return field;
  }
  switch (type) {
    case TYPE_MESSAGE:
    case TYPE_GROUP:
      field.fieldKind = "message";
      field.message = reg.getMessage(trimLeadingDot(proto.typeName));
      assert(field.message, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
      field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
      field.getDefaultValue = () => void 0;
      break;
    case TYPE_ENUM: {
      const enumeration = reg.getEnum(trimLeadingDot(proto.typeName));
      assert(enumeration !== void 0, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
      field.fieldKind = "enum";
      field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
      field.getDefaultValue = () => {
        return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatEnumValue(enumeration, proto.defaultValue) : void 0;
      };
      break;
    }
    default: {
      field.fieldKind = "scalar";
      field.scalar = type;
      field.longAsString = jstype == JS_STRING;
      field.getDefaultValue = () => {
        return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatScalarValue(type, proto.defaultValue) : void 0;
      };
      break;
    }
  }
  return field;
}
function getFileEdition(proto) {
  switch (proto.syntax) {
    case "":
    case "proto2":
      return EDITION_PROTO2;
    case "proto3":
      return EDITION_PROTO3;
    case "editions":
      if (proto.edition === EDITION_UNSTABLE) {
        return maximumEdition;
      }
      if (proto.edition in featureDefaults) {
        return proto.edition;
      }
      throw new Error(`${proto.name}: unsupported edition`);
    default:
      throw new Error(`${proto.name}: unsupported syntax "${proto.syntax}"`);
  }
}
function findFileDependencies(proto, reg) {
  return proto.dependency.map((wantName) => {
    const dep = reg.getFile(wantName);
    if (!dep) {
      throw new Error(`Cannot find ${wantName}, imported by ${proto.name}`);
    }
    return dep;
  });
}
function findEnumSharedPrefix(enumName, values) {
  const prefix = camelToSnakeCase(enumName) + "_";
  for (const value of values) {
    if (!value.name.toLowerCase().startsWith(prefix)) {
      return void 0;
    }
    const shortName = value.name.substring(prefix.length);
    if (shortName.length == 0) {
      return void 0;
    }
    if (/^\d/.test(shortName)) {
      return void 0;
    }
  }
  return prefix;
}
function camelToSnakeCase(camel) {
  return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
}
function makeTypeName(proto, parent, file2) {
  let typeName;
  if (parent) {
    typeName = `${parent.typeName}.${proto.name}`;
  } else if (file2.proto.package.length > 0) {
    typeName = `${file2.proto.package}.${proto.name}`;
  } else {
    typeName = `${proto.name}`;
  }
  return typeName;
}
function trimLeadingDot(typeName) {
  return typeName.startsWith(".") ? typeName.substring(1) : typeName;
}
function findOneof(proto, allOneofs) {
  if (!unsafeIsSetExplicit(proto, "oneofIndex")) {
    return void 0;
  }
  if (proto.proto3Optional) {
    return void 0;
  }
  const oneof = allOneofs[proto.oneofIndex];
  assert(oneof, `invalid FieldDescriptorProto: oneof #${proto.oneofIndex} for field #${proto.number} not found`);
  return oneof;
}
function getFieldPresence(proto, oneof, isExtension, parent) {
  if (proto.label == LABEL_REQUIRED) {
    return LEGACY_REQUIRED;
  }
  if (proto.label == LABEL_REPEATED) {
    return IMPLICIT2;
  }
  if (!!oneof || proto.proto3Optional) {
    return EXPLICIT;
  }
  if (isExtension) {
    return EXPLICIT;
  }
  const resolved = resolveFeature("fieldPresence", { proto, parent });
  if (resolved == IMPLICIT2 && (proto.type == TYPE_MESSAGE || proto.type == TYPE_GROUP)) {
    return EXPLICIT;
  }
  return resolved;
}
function isPackedField(proto, parent) {
  if (proto.label != LABEL_REPEATED) {
    return false;
  }
  switch (proto.type) {
    case TYPE_STRING:
    case TYPE_BYTES:
    case TYPE_GROUP:
    case TYPE_MESSAGE:
      return false;
  }
  const o = proto.options;
  if (o && unsafeIsSetExplicit(o, "packed")) {
    return o.packed;
  }
  return PACKED == resolveFeature("repeatedFieldEncoding", {
    proto,
    parent
  });
}
function findMapEntryFields(mapEntry) {
  const key = mapEntry.fields.find((f) => f.number === 1);
  const value = mapEntry.fields.find((f) => f.number === 2);
  assert(key && key.fieldKind == "scalar" && key.scalar != ScalarType.BYTES && key.scalar != ScalarType.FLOAT && key.scalar != ScalarType.DOUBLE && value && value.fieldKind != "list" && value.fieldKind != "map");
  return { key, value };
}
function isEnumOpen(desc) {
  var _a;
  return OPEN == resolveFeature("enumType", {
    proto: desc.proto,
    parent: (_a = desc.parent) !== null && _a !== void 0 ? _a : desc.file
  });
}
function isDelimitedEncoding(proto, parent) {
  if (proto.type == TYPE_GROUP) {
    return true;
  }
  return DELIMITED == resolveFeature("messageEncoding", {
    proto,
    parent
  });
}
function isUtf8Validated(proto, parent) {
  return VERIFY == resolveFeature("utf8Validation", {
    proto,
    parent
  });
}
function resolveFeature(name, ref) {
  var _a, _b;
  const featureSet = (_a = ref.proto.options) === null || _a === void 0 ? void 0 : _a.features;
  if (featureSet) {
    const val = featureSet[name];
    if (val != 0) {
      return val;
    }
  }
  if ("kind" in ref) {
    if (ref.kind == "message") {
      return resolveFeature(name, (_b = ref.parent) !== null && _b !== void 0 ? _b : ref.file);
    }
    const editionDefaults = featureDefaults[ref.edition];
    if (!editionDefaults) {
      throw new Error(`feature default for edition ${ref.edition} not found`);
    }
    return editionDefaults[name];
  }
  return resolveFeature(name, ref.parent);
}
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/boot.js
function boot(boot2) {
  const root = bootFileDescriptorProto(boot2);
  root.messageType.forEach(restoreJsonNames);
  const reg = createFileRegistry(root, () => void 0);
  return reg.getFile(root.name);
}
function bootFileDescriptorProto(init) {
  const proto = /* @__PURE__ */ Object.create({
    syntax: "",
    edition: 0
  });
  return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FileDescriptorProto", dependency: [], publicDependency: [], weakDependency: [], optionDependency: [], service: [], extension: [] }, init), { messageType: init.messageType.map(bootDescriptorProto), enumType: init.enumType.map(bootEnumDescriptorProto) }));
}
function bootDescriptorProto(init) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const proto = /* @__PURE__ */ Object.create({
    visibility: 0
  });
  return Object.assign(proto, {
    $typeName: "google.protobuf.DescriptorProto",
    name: init.name,
    field: (_b = (_a = init.field) === null || _a === void 0 ? void 0 : _a.map(bootFieldDescriptorProto)) !== null && _b !== void 0 ? _b : [],
    extension: [],
    nestedType: (_d = (_c = init.nestedType) === null || _c === void 0 ? void 0 : _c.map(bootDescriptorProto)) !== null && _d !== void 0 ? _d : [],
    enumType: (_f = (_e = init.enumType) === null || _e === void 0 ? void 0 : _e.map(bootEnumDescriptorProto)) !== null && _f !== void 0 ? _f : [],
    extensionRange: (_h = (_g = init.extensionRange) === null || _g === void 0 ? void 0 : _g.map((e) => Object.assign({ $typeName: "google.protobuf.DescriptorProto.ExtensionRange" }, e))) !== null && _h !== void 0 ? _h : [],
    oneofDecl: [],
    reservedRange: [],
    reservedName: []
  });
}
function bootFieldDescriptorProto(init) {
  const proto = /* @__PURE__ */ Object.create({
    label: 1,
    typeName: "",
    extendee: "",
    defaultValue: "",
    oneofIndex: 0,
    jsonName: "",
    proto3Optional: false
  });
  return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldDescriptorProto" }, init), { options: init.options ? bootFieldOptions(init.options) : void 0 }));
}
function bootFieldOptions(init) {
  var _a, _b, _c;
  const proto = /* @__PURE__ */ Object.create({
    ctype: 0,
    packed: false,
    jstype: 0,
    lazy: false,
    unverifiedLazy: false,
    deprecated: false,
    weak: false,
    debugRedact: false,
    retention: 0
  });
  return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldOptions" }, init), { targets: (_a = init.targets) !== null && _a !== void 0 ? _a : [], editionDefaults: (_c = (_b = init.editionDefaults) === null || _b === void 0 ? void 0 : _b.map((e) => Object.assign({ $typeName: "google.protobuf.FieldOptions.EditionDefault" }, e))) !== null && _c !== void 0 ? _c : [], uninterpretedOption: [] }));
}
function bootEnumDescriptorProto(init) {
  const proto = /* @__PURE__ */ Object.create({
    visibility: 0
  });
  return Object.assign(proto, {
    $typeName: "google.protobuf.EnumDescriptorProto",
    name: init.name,
    reservedName: [],
    reservedRange: [],
    value: init.value.map((e) => Object.assign({ $typeName: "google.protobuf.EnumValueDescriptorProto" }, e))
  });
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wire/base64-encoding.js
var nativeSetFromBase64 = Uint8Array.prototype.setFromBase64;
function base64Decode(base64Str) {
  const len = base64Str.length;
  let size = len - (len + 3 >> 2);
  if ((len & 3) == 0 && base64Str[len - 1] == "=") {
    size -= base64Str[len - 2] == "=" ? 2 : 1;
  }
  const bytes = new Uint8Array(size);
  let written = -1;
  if (nativeSetFromBase64) {
    try {
      const result = nativeSetFromBase64.call(bytes, base64Str);
      if (result.read == len) {
        written = result.written;
      }
    } catch (_a) {
    }
  }
  if (written < 0) {
    written = setFromBase64(bytes, base64Str);
  }
  return written == size ? bytes : bytes.subarray(0, written);
}
function setFromBase64(bytes, base64Str) {
  const table = getDecodeTable();
  let bytePos = 0, groupPos = 0, b, p = 0;
  for (let i = 0; i < base64Str.length; i++) {
    b = table[base64Str.charCodeAt(i)];
    if (b === void 0) {
      switch (base64Str[i]) {
        // @ts-ignore TS7029: Fallthrough case in switch -- ignore instead of expect-error for compiler settings without noFallthroughCasesInSwitch: true
        case "=":
          groupPos = 0;
        // reset state when padding found
        case "\n":
        case "\r":
        case "	":
        case " ":
          continue;
        // skip white-space, and padding
        default:
          throw Error("invalid base64 string");
      }
    }
    switch (groupPos) {
      case 0:
        p = b;
        groupPos = 1;
        break;
      case 1:
        bytes[bytePos++] = p << 2 | (b & 48) >> 4;
        p = b;
        groupPos = 2;
        break;
      case 2:
        bytes[bytePos++] = (p & 15) << 4 | (b & 60) >> 2;
        p = b;
        groupPos = 3;
        break;
      case 3:
        bytes[bytePos++] = (p & 3) << 6 | b;
        groupPos = 0;
        break;
    }
  }
  if (groupPos == 1)
    throw Error("invalid base64 string");
  return bytePos;
}
var nativeToBase64 = Uint8Array.prototype.toBase64;
var toBase64OptionsMap = {
  std: { alphabet: "base64", omitPadding: false },
  std_raw: { alphabet: "base64", omitPadding: true },
  url: { alphabet: "base64url", omitPadding: true }
};
function base64Encode(bytes, encoding = "std") {
  if (nativeToBase64) {
    return nativeToBase64.call(bytes, toBase64OptionsMap[encoding]);
  }
  const table = getEncodeTable(encoding);
  const pad = encoding == "std";
  let base64 = "", groupPos = 0, b, p = 0;
  for (let i = 0; i < bytes.length; i++) {
    b = bytes[i];
    switch (groupPos) {
      case 0:
        base64 += table[b >> 2];
        p = (b & 3) << 4;
        groupPos = 1;
        break;
      case 1:
        base64 += table[p | b >> 4];
        p = (b & 15) << 2;
        groupPos = 2;
        break;
      case 2:
        base64 += table[p | b >> 6];
        base64 += table[b & 63];
        groupPos = 0;
        break;
    }
  }
  if (groupPos) {
    base64 += table[p];
    if (pad) {
      base64 += "=";
      if (groupPos == 1)
        base64 += "=";
    }
  }
  return base64;
}
var encodeTableStd;
var encodeTableUrl;
var decodeTable;
function getEncodeTable(encoding) {
  if (!encodeTableStd) {
    encodeTableStd = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
    encodeTableUrl = encodeTableStd.slice(0, -2).concat("-", "_");
  }
  return encoding == "url" ? (
    // biome-ignore lint/style/noNonNullAssertion: TS fails to narrow down
    encodeTableUrl
  ) : encodeTableStd;
}
function getDecodeTable() {
  if (!decodeTable) {
    decodeTable = [];
    const encodeTable = getEncodeTable("std");
    for (let i = 0; i < encodeTable.length; i++)
      decodeTable[encodeTable[i].charCodeAt(0)] = i;
    decodeTable["-".charCodeAt(0)] = encodeTable.indexOf("+");
    decodeTable["_".charCodeAt(0)] = encodeTable.indexOf("/");
  }
  return decodeTable;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wire/text-encoding.js
var te;
function configureTextEncoding(textEncoding) {
  var _a;
  te = Object.assign(Object.assign({}, textEncoding), { encodeUtf8Into: (_a = textEncoding.encodeUtf8Into) !== null && _a !== void 0 ? _a : emulateEncodeInto(textEncoding.encodeUtf8.bind(textEncoding)) });
}
function getTextEncoding() {
  if (!te) {
    const globals = globalThis;
    if (!globals.TextEncoder || !globals.TextDecoder) {
      throw new Error("encoding API missing: install TextEncoder and TextDecoder on globalThis");
    }
    const textEncoder = new globals.TextEncoder();
    const textDecoder = new globals.TextDecoder();
    let textDecoderStrict;
    const config = {
      encodeUtf8(text) {
        return textEncoder.encode(text);
      },
      decodeUtf8(bytes, strict) {
        if (strict) {
          if (!textDecoderStrict) {
            textDecoderStrict = new globals.TextDecoder("utf-8", {
              fatal: true
            });
          }
          return textDecoderStrict.decode(bytes);
        }
        return textDecoder.decode(bytes);
      },
      checkUtf8(text) {
        try {
          encodeURIComponent(text);
          return true;
        } catch (_) {
          return false;
        }
      }
    };
    if (textEncoder.encodeInto) {
      config.encodeUtf8Into = textEncoder.encodeInto.bind(textEncoder);
    }
    const nativeStringIsWellFormed = String.prototype.isWellFormed;
    if (nativeStringIsWellFormed) {
      config.checkUtf8 = (text) => {
        return nativeStringIsWellFormed.call(text);
      };
    }
    configureTextEncoding(config);
  }
  return te;
}
function emulateEncodeInto(encodeUtf8) {
  return (text, dest) => {
    const bytes = encodeUtf8(text);
    dest.set(bytes);
    return { written: bytes.byteLength };
  };
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wire/binary-encoding.js
var WireType;
(function(WireType2) {
  WireType2[WireType2["Varint"] = 0] = "Varint";
  WireType2[WireType2["Bit64"] = 1] = "Bit64";
  WireType2[WireType2["LengthDelimited"] = 2] = "LengthDelimited";
  WireType2[WireType2["StartGroup"] = 3] = "StartGroup";
  WireType2[WireType2["EndGroup"] = 4] = "EndGroup";
  WireType2[WireType2["Bit32"] = 5] = "Bit32";
})(WireType || (WireType = {}));
var FLOAT32_MAX = 34028234663852886e22;
var FLOAT32_MIN = -34028234663852886e22;
var UINT32_MAX = 4294967295;
var INT32_MAX = 2147483647;
var INT32_MIN = -2147483648;
var BinaryWriter = class {
  constructor(encodeUtf8) {
    this.stackPos = [];
    this.encodeUtf8Into = encodeUtf8 ? emulateEncodeInto(encodeUtf8) : getTextEncoding().encodeUtf8Into;
    this.buffer = EMPTY_BUFFER;
    this.viewCache = EMPTY_VIEW;
    this.pos = 0;
  }
  ensureCapacity(size) {
    const required = this.pos + size;
    if (required > this.buffer.length) {
      let newLen = this.buffer.length || INITIAL_SIZE;
      while (newLen < required)
        newLen *= 2;
      const newBuf = new Uint8Array(newLen);
      if (this.pos > 0)
        newBuf.set(this.buffer);
      this.buffer = newBuf;
    }
  }
  /**
   * The DataView over `buffer`, rebuilt only if the buffer has grown since it
   * was last used.
   */
  view() {
    const bytes = this.buffer;
    const view = this.viewCache;
    if (view.byteLength === bytes.byteLength)
      return view;
    const newView = new DataView(bytes.buffer);
    this.viewCache = newView;
    return newView;
  }
  /**
   * Return all bytes written and reset this writer.
   */
  finish() {
    const result = this.buffer.slice(0, this.pos);
    this.pos = 0;
    this.stackPos = [];
    return result;
  }
  /**
   * Start a new fork for length-delimited data like a message
   * or a packed repeated field.
   *
   * Must be joined later with `join()`.
   */
  fork() {
    this.stackPos.push(this.pos);
    this.ensureCapacity(DEFAULT_LEN_PREFIX_SIZE);
    this.buffer[this.pos++] = 0;
    return this;
  }
  /**
   * Join the last fork. Write its length and bytes, then
   * return to the previous state.
   */
  join() {
    const forkPos = this.stackPos.pop();
    if (forkPos === void 0)
      throw new Error("invalid state, fork stack empty");
    const len = this.pos - forkPos - DEFAULT_LEN_PREFIX_SIZE;
    const lenPrefixSize = varint32Size(len);
    if (lenPrefixSize > DEFAULT_LEN_PREFIX_SIZE) {
      this.ensureCapacity(lenPrefixSize - DEFAULT_LEN_PREFIX_SIZE);
      this.buffer.copyWithin(forkPos + lenPrefixSize, forkPos + DEFAULT_LEN_PREFIX_SIZE, this.pos);
    }
    this.pos = forkPos;
    this.uint32(len);
    this.pos += len;
    return this;
  }
  /**
   * Writes a tag (field number and wire type).
   *
   * Equivalent to `uint32( (fieldNo << 3 | type) >>> 0 )`.
   *
   * Generated code should compute the tag ahead of time and call `uint32()`.
   */
  tag(fieldNo, type) {
    return this.uint32((fieldNo << 3 | type) >>> 0);
  }
  /**
   * Write a chunk of raw bytes.
   */
  raw(chunk) {
    this.ensureCapacity(chunk.length);
    this.buffer.set(chunk, this.pos);
    this.pos += chunk.length;
    return this;
  }
  /**
   * Write a `uint32` value, an unsigned 32 bit varint.
   */
  uint32(value) {
    assertUInt32(value);
    this.ensureCapacity(5);
    if (value < 128) {
      this.buffer[this.pos++] = value;
      return this;
    }
    while (value > 127) {
      this.buffer[this.pos++] = value & 127 | 128;
      value >>>= 7;
    }
    this.buffer[this.pos++] = value;
    return this;
  }
  /**
   * Write a `int32` value, a signed 32 bit varint.
   */
  int32(value) {
    assertInt32(value);
    if (value >= 0) {
      return this.uint32(value);
    }
    this.ensureCapacity(10);
    for (let i = 0; i < 9; i++) {
      this.buffer[this.pos++] = value & 127 | 128;
      value >>= 7;
    }
    this.buffer[this.pos++] = 1;
    return this;
  }
  /**
   * Write a `bool` value, a varint.
   */
  bool(value) {
    this.ensureCapacity(1);
    this.buffer[this.pos++] = value ? 1 : 0;
    return this;
  }
  /**
   * Write a `bytes` value, length-delimited arbitrary data.
   */
  bytes(value) {
    this.uint32(value.byteLength);
    return this.raw(value);
  }
  /**
   * Write a `string` value, length-delimited data converted to UTF-8 text.
   */
  string(value) {
    if (typeof value !== "string") {
      value = String(value);
    }
    const len = value.length;
    if (len <= ASCII_MAX_LENGTH) {
      this.ensureCapacity(len + 1);
      const ascii = this.buffer;
      let pos = this.pos;
      ascii[pos++] = len;
      let i = 0;
      for (; i < len; i++) {
        const code = value.charCodeAt(i);
        if (code > 127)
          break;
        ascii[pos++] = code;
      }
      if (i == len) {
        this.pos = pos;
        return this;
      }
    }
    this.ensureCapacity(len * 3 + 5);
    const lenPrefixSizeGuess = varint32Size(len);
    const buf = this.buffer;
    const start = this.pos;
    const { written } = this.encodeUtf8Into(value, buf.subarray(start + lenPrefixSizeGuess));
    const lenPrefixSize = varint32Size(written);
    if (lenPrefixSize != lenPrefixSizeGuess) {
      buf.copyWithin(start + lenPrefixSize, start + lenPrefixSizeGuess, start + lenPrefixSizeGuess + written);
    }
    this.uint32(written);
    this.pos += written;
    return this;
  }
  /**
   * Write a `float` value, 32-bit floating point number.
   */
  float(value) {
    assertFloat32(value);
    this.ensureCapacity(4);
    this.view().setFloat32(this.pos, value, true);
    this.pos += 4;
    return this;
  }
  /**
   * Write a `double` value, a 64-bit floating point number.
   */
  double(value) {
    this.ensureCapacity(8);
    this.view().setFloat64(this.pos, value, true);
    this.pos += 8;
    return this;
  }
  /**
   * Write a `fixed32` value, an unsigned, fixed-length 32-bit integer.
   */
  fixed32(value) {
    assertUInt32(value);
    this.ensureCapacity(4);
    this.view().setUint32(this.pos, value, true);
    this.pos += 4;
    return this;
  }
  /**
   * Write a `sfixed32` value, a signed, fixed-length 32-bit integer.
   */
  sfixed32(value) {
    assertInt32(value);
    this.ensureCapacity(4);
    this.view().setInt32(this.pos, value, true);
    this.pos += 4;
    return this;
  }
  /**
   * Write a `sint32` value, a signed, zigzag-encoded 32-bit varint.
   */
  sint32(value) {
    assertInt32(value);
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
  }
  /**
   * Write a `sfixed64` value, a signed, fixed-length 64-bit integer.
   */
  sfixed64(value) {
    const tc = protoInt64.enc(value);
    this.ensureCapacity(8);
    const view = this.view();
    view.setInt32(this.pos, tc.lo, true);
    view.setInt32(this.pos + 4, tc.hi, true);
    this.pos += 8;
    return this;
  }
  /**
   * Write a `fixed64` value, an unsigned, fixed-length 64 bit integer.
   */
  fixed64(value) {
    const tc = protoInt64.uEnc(value);
    this.ensureCapacity(8);
    const view = this.view();
    view.setInt32(this.pos, tc.lo, true);
    view.setInt32(this.pos + 4, tc.hi, true);
    this.pos += 8;
    return this;
  }
  /**
   * Write a `int64` value, a signed 64-bit varint.
   */
  int64(value) {
    const tc = protoInt64.enc(value);
    return this.writeVarint64(tc.lo, tc.hi);
  }
  /**
   * Write a `sint64` value, a signed, zig-zag-encoded 64-bit varint.
   */
  sint64(value) {
    const tc = protoInt64.enc(value), sign = tc.hi >> 31, lo = tc.lo << 1 ^ sign, hi = (tc.hi << 1 | tc.lo >>> 31) ^ sign;
    return this.writeVarint64(lo, hi);
  }
  /**
   * Write a `uint64` value, an unsigned 64-bit varint.
   */
  uint64(value) {
    const tc = protoInt64.uEnc(value);
    return this.writeVarint64(tc.lo, tc.hi);
  }
  /**
   * Write a 64-bit varint directly into the buffer. Accepts the value as
   * split low/high 32-bit words.
   *
   * Ported from varint64write() to avoid the intermediate number[] buffer.
   * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/writer.js#L344
   */
  writeVarint64(lo, hi) {
    this.ensureCapacity(10);
    const buf = this.buffer;
    let pos = this.pos;
    for (let i = 0; i < 28; i = i + 7) {
      const shift = lo >>> i;
      const hasNext = !(shift >>> 7 == 0 && hi == 0);
      buf[pos++] = (hasNext ? shift | 128 : shift) & 255;
      if (!hasNext) {
        this.pos = pos;
        return this;
      }
    }
    const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
    const hasMoreBits = !(hi >> 3 == 0);
    buf[pos++] = (hasMoreBits ? splitBits | 128 : splitBits) & 255;
    if (!hasMoreBits) {
      this.pos = pos;
      return this;
    }
    for (let i = 3; i < 31; i = i + 7) {
      const shift = hi >>> i;
      const hasNext = !(shift >>> 7 == 0);
      buf[pos++] = (hasNext ? shift | 128 : shift) & 255;
      if (!hasNext) {
        this.pos = pos;
        return this;
      }
    }
    buf[pos++] = hi >>> 31 & 1;
    this.pos = pos;
    return this;
  }
};
var INITIAL_SIZE = 128;
var DEFAULT_LEN_PREFIX_SIZE = 1;
var EMPTY_BUFFER = new Uint8Array(0);
var EMPTY_VIEW = new DataView(EMPTY_BUFFER.buffer);
var ASCII_MAX_LENGTH = 32;
function varint32Size(value) {
  if (value < 128)
    return 1;
  if (value < 16384)
    return 2;
  if (value < 2097152)
    return 3;
  if (value < 268435456)
    return 4;
  return 5;
}
var BinaryReader = class {
  constructor(buf, decodeUtf8 = getTextEncoding().decodeUtf8) {
    this.decodeUtf8 = decodeUtf8;
    this.varint64Lo = 0;
    this.varint64Hi = 0;
    this.varint64 = varint64read;
    this.uint32 = varint32read;
    this.buf = buf;
    this.len = buf.length;
    this.pos = 0;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  /**
   * Reads a tag - field number and wire type. Tags are uint32 varints; values
   * that do not fit in uint32 are rejected.
   */
  tag() {
    const start = this.pos;
    const tag = this.uint32();
    const bytesRead = this.pos - start;
    if (bytesRead > 5 || bytesRead == 5 && this.buf[this.pos - 1] > 15) {
      throw new Error("illegal tag: varint overflows uint32");
    }
    const fieldNo = tag >>> 3;
    const wireType = tag & 7;
    if (fieldNo <= 0 || wireType > 5) {
      throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
    }
    return [fieldNo, wireType];
  }
  /**
   * Skip one element and return the skipped data.
   *
   * When skipping StartGroup, provide the tags field number to check for
   * matching field number in the EndGroup tag. Recursion into nested groups
   * is guarded by the `recursionLimit` argument: When the limit is reached,
   * this method throws.
   */
  skip(wireType, fieldNo, recursionLimit = 100) {
    let start = this.pos;
    switch (wireType) {
      case WireType.Varint:
        while (this.buf[this.pos++] & 128) {
        }
        break;
      // @ts-ignore TS7029: Fallthrough case in switch -- ignore instead of expect-error for compiler settings without noFallthroughCasesInSwitch: true
      case WireType.Bit64:
        this.pos += 4;
      case WireType.Bit32:
        this.pos += 4;
        break;
      case WireType.LengthDelimited:
        let len = this.uint32();
        this.pos += len;
        break;
      case WireType.StartGroup:
        if (recursionLimit <= 0) {
          throw new Error("maximum recursion depth reached");
        }
        for (; ; ) {
          const [fn, wt] = this.tag();
          if (wt === WireType.EndGroup) {
            if (fieldNo !== void 0 && fn !== fieldNo) {
              throw new Error("invalid end group tag");
            }
            break;
          }
          this.skip(wt, fn, recursionLimit - 1);
        }
        break;
      default:
        throw new Error("cant skip wire type " + wireType);
    }
    this.assertBounds();
    return this.buf.subarray(start, this.pos);
  }
  /**
   * Throws error if position in byte array is out of range.
   */
  assertBounds() {
    if (this.pos > this.len)
      throw new RangeError("premature EOF");
  }
  /**
   * Read a `int32` field, a signed 32 bit varint.
   */
  int32() {
    return this.uint32() | 0;
  }
  /**
   * Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
   */
  sint32() {
    let zze = this.uint32();
    return zze >>> 1 ^ -(zze & 1);
  }
  /**
   * Read a `int64` field, a signed 64-bit varint.
   */
  int64() {
    this.varint64();
    return protoInt64.dec(this.varint64Lo, this.varint64Hi);
  }
  /**
   * Read a `uint64` field, an unsigned 64-bit varint.
   */
  uint64() {
    this.varint64();
    return protoInt64.uDec(this.varint64Lo, this.varint64Hi);
  }
  /**
   * Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
   */
  sint64() {
    this.varint64();
    let lo = this.varint64Lo;
    let hi = this.varint64Hi;
    let s = -(lo & 1);
    lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
    hi = hi >>> 1 ^ s;
    return protoInt64.dec(lo, hi);
  }
  /**
   * Read a `bool` field, a variant.
   */
  bool() {
    const b = this.buf[this.pos];
    if (b < 128) {
      this.pos++;
      return b !== 0;
    }
    this.varint64();
    return this.varint64Lo !== 0 || this.varint64Hi !== 0;
  }
  /**
   * Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
   */
  fixed32() {
    return this.view.getUint32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
   */
  sfixed32() {
    return this.view.getInt32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
   */
  fixed64() {
    return protoInt64.uDec(this.sfixed32(), this.sfixed32());
  }
  /**
   * Read a `fixed64` field, a signed, fixed-length 64-bit integer.
   */
  sfixed64() {
    return protoInt64.dec(this.sfixed32(), this.sfixed32());
  }
  /**
   * Read a `float` field, 32-bit floating point number.
   */
  float() {
    return this.view.getFloat32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `double` field, a 64-bit floating point number.
   */
  double() {
    return this.view.getFloat64((this.pos += 8) - 8, true);
  }
  /**
   * Read a `bytes` field, length-delimited arbitrary data.
   */
  bytes() {
    let len = this.uint32(), start = this.pos;
    this.pos += len;
    this.assertBounds();
    return this.buf.subarray(start, start + len);
  }
  /**
   * Read a `string` field, length-delimited data converted to UTF-8 text. If
   * `strict` is true, throw on invalid UTF-8 instead of substituting U+FFFD.
   */
  string(strict) {
    const bytes = this.bytes();
    const len = bytes.length;
    if (len <= ASCII_MAX_LENGTH) {
      const codes = new Array(len);
      for (let i = 0; i < len; i++) {
        const byte = bytes[i];
        if (byte > 127) {
          return this.decodeUtf8(bytes, strict);
        }
        codes[i] = byte;
      }
      return String.fromCharCode.apply(String, codes);
    }
    return this.decodeUtf8(bytes, strict);
  }
};
function assertInt32(arg) {
  if (typeof arg == "string") {
    arg = Number(arg);
  } else if (typeof arg != "number") {
    throw new Error("invalid int32: " + typeof arg);
  }
  if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
    throw new Error("invalid int32: " + arg);
}
function assertUInt32(arg) {
  if (typeof arg == "string") {
    arg = Number(arg);
  } else if (typeof arg != "number") {
    throw new Error("invalid uint32: " + typeof arg);
  }
  if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
    throw new Error("invalid uint32: " + arg);
}
function assertFloat32(arg) {
  if (typeof arg == "string") {
    const o = arg;
    arg = Number(arg);
    if (Number.isNaN(arg) && o !== "NaN") {
      throw new Error("invalid float32: " + o);
    }
  } else if (typeof arg != "number") {
    throw new Error("invalid float32: " + typeof arg);
  }
  if (Number.isFinite(arg) && (arg > FLOAT32_MAX || arg < FLOAT32_MIN))
    throw new Error("invalid float32: " + arg);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/error.js
var errorNames = [
  "FieldValueInvalidError",
  "FieldListRangeError",
  "ForeignFieldError"
];
var FieldError = class extends Error {
  constructor(fieldOrOneof, message, name = "FieldValueInvalidError") {
    super(message);
    this.name = name;
    this.field = () => fieldOrOneof;
  }
};
function isFieldError(arg) {
  return arg instanceof Error && errorNames.includes(arg.name) && "field" in arg && typeof arg.field == "function";
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/is-message.js
function isMessage(arg, schema) {
  const isMessage2 = arg !== null && typeof arg == "object" && "$typeName" in arg && typeof arg.$typeName == "string";
  if (!isMessage2) {
    return false;
  }
  if (schema === void 0) {
    return true;
  }
  return schema.typeName === arg.$typeName;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/guard.js
function isObject(arg) {
  return arg !== null && typeof arg == "object" && !Array.isArray(arg);
}
function isReflectList(arg, field) {
  var _a, _b, _c, _d;
  if (isObject(arg) && unsafeLocal in arg && "add" in arg && "field" in arg && typeof arg.field == "function") {
    if (field !== void 0) {
      const a = field;
      const b = arg.field();
      return a.listKind == b.listKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) && ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName);
    }
    return true;
  }
  return false;
}
function isReflectMap(arg, field) {
  var _a, _b, _c, _d;
  if (isObject(arg) && unsafeLocal in arg && "has" in arg && "field" in arg && typeof arg.field == "function") {
    if (field !== void 0) {
      const a = field, b = arg.field();
      return a.mapKey === b.mapKey && a.mapKind == b.mapKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) && ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName);
    }
    return true;
  }
  return false;
}
function isReflectMessage(arg, messageDesc2) {
  return isObject(arg) && unsafeLocal in arg && "desc" in arg && isObject(arg.desc) && arg.desc.kind === "message" && (messageDesc2 === void 0 || arg.desc.typeName == messageDesc2.typeName);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/wrappers.js
function isWrapper(arg) {
  return isWrapperTypeName(arg.$typeName);
}
function isWrapperDesc(messageDesc2) {
  const f = messageDesc2.fields[0];
  return isWrapperTypeName(messageDesc2.typeName) && f !== void 0 && f.fieldKind == "scalar" && f.name == "value" && f.number == 1;
}
function hasCustomJsonRepresentation(desc) {
  switch (desc.typeName) {
    case "google.protobuf.Any":
    case "google.protobuf.Timestamp":
    case "google.protobuf.Duration":
    case "google.protobuf.FieldMask":
    case "google.protobuf.Struct":
    case "google.protobuf.Value":
    case "google.protobuf.ListValue":
      return true;
    default:
      return isWrapperDesc(desc);
  }
}
var wrapperTypeNames = /* @__PURE__ */ new Set([
  "google.protobuf.DoubleValue",
  "google.protobuf.FloatValue",
  "google.protobuf.Int64Value",
  "google.protobuf.UInt64Value",
  "google.protobuf.Int32Value",
  "google.protobuf.UInt32Value",
  "google.protobuf.BoolValue",
  "google.protobuf.StringValue",
  "google.protobuf.BytesValue"
]);
function isWrapperTypeName(name) {
  return wrapperTypeNames.has(name);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/create.js
var EDITION_PROTO32 = 999;
var EDITION_PROTO22 = 998;
var IMPLICIT3 = 2;
function create(schema, init) {
  if (isMessage(init, schema)) {
    return init;
  }
  return compiledCreate(schema)(init);
}
var compiledCreates = /* @__PURE__ */ new WeakMap();
function compiledCreate(desc) {
  let compiled = compiledCreates.get(desc);
  if (compiled === void 0) {
    compiled = compileCreate(desc);
    compiledCreates.set(desc, compiled);
  }
  return compiled;
}
var INIT_SINGULAR = 0;
var INIT_LIST = 1;
var INIT_MAP = 2;
var INIT_ONEOF = 3;
function compileCreate(desc) {
  const typeName = desc.typeName;
  const { properties, prototype } = compileInitMessage(desc);
  return (init) => {
    let message;
    if (prototype !== void 0) {
      message = Object.create(prototype);
      message.$typeName = typeName;
    } else {
      message = { $typeName: typeName };
    }
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const name = property.name;
      const initValue = init === null || init === void 0 ? void 0 : init[name];
      switch (property.kind) {
        case INIT_SINGULAR:
          if (initValue != null) {
            message[name] = property.convert !== void 0 ? property.convert(initValue) : initValue;
          } else if (property.constant !== void 0) {
            message[name] = property.constant;
          }
          break;
        case INIT_LIST:
          message[name] = property.convert !== void 0 && Array.isArray(initValue) ? initValue.map(property.convert) : initValue !== null && initValue !== void 0 ? initValue : [];
          break;
        case INIT_MAP:
          if (property.convert === void 0 || !isObject(initValue)) {
            message[name] = initValue !== null && initValue !== void 0 ? initValue : {};
          } else {
            const converted = {};
            const keys = Object.keys(initValue);
            for (let k = 0; k < keys.length; k++) {
              converted[keys[k]] = property.convert(initValue[keys[k]]);
            }
            message[name] = converted;
          }
          break;
        case INIT_ONEOF: {
          const oneofValue = initValue;
          if ((oneofValue === null || oneofValue === void 0 ? void 0 : oneofValue.case) != null) {
            const convert = property.convert.get(oneofValue.case);
            if (convert !== void 0) {
              message[name] = {
                case: oneofValue.case,
                value: convert(oneofValue.value)
              };
              break;
            }
          }
          message[name] = { case: void 0 };
          break;
        }
      }
    }
    return message;
  };
}
function compileInitMessage(desc) {
  var _a, _b;
  const properties = [];
  const prototype = {};
  const usePrototype = needsPrototypeChain(desc);
  for (const member of desc.members) {
    const name = member.localName;
    if (member.kind == "oneof") {
      properties.push({
        name,
        kind: INIT_ONEOF,
        constant: void 0,
        convert: compileConvertOneof(member)
      });
      continue;
    }
    switch (member.fieldKind) {
      case "message": {
        properties.push({
          name,
          kind: INIT_SINGULAR,
          constant: void 0,
          convert: compileConvertMessage(member)
        });
        break;
      }
      case "list": {
        properties.push({
          name,
          kind: INIT_LIST,
          constant: void 0,
          convert: member.listKind == "message" ? (_a = compileConvertMessage(member)) !== null && _a !== void 0 ? _a : ((value) => value) : member.scalar == ScalarType.BYTES ? toU8Arr : void 0
        });
        break;
      }
      case "map": {
        properties.push({
          name,
          kind: INIT_MAP,
          constant: void 0,
          convert: member.mapKind == "message" ? (_b = compileConvertMessage(member)) !== null && _b !== void 0 ? _b : ((value) => value) : member.scalar == ScalarType.BYTES ? toU8Arr : void 0
        });
        break;
      }
      default: {
        const zeroValue = createZeroValue(member);
        properties.push({
          name,
          kind: INIT_SINGULAR,
          constant: member.presence == IMPLICIT3 ? zeroValue : void 0,
          convert: member.fieldKind == "scalar" && member.scalar == ScalarType.BYTES ? toU8Arr : void 0
        });
        if (usePrototype) {
          prototype[name] = zeroValue;
        }
        break;
      }
    }
  }
  return {
    properties,
    prototype: usePrototype ? prototype : void 0
  };
}
function compileConvertOneof(oneof) {
  const converters = /* @__PURE__ */ new Map();
  for (const field of oneof.fields) {
    let convert;
    if (field.fieldKind == "message") {
      convert = compileConvertMessage(field);
    } else if (field.fieldKind == "scalar" && field.scalar == ScalarType.BYTES) {
      convert = toU8Arr;
    }
    converters.set(field.localName, convert !== null && convert !== void 0 ? convert : ((value) => value));
  }
  return converters;
}
function compileConvertMessage(field) {
  if (field.fieldKind == "message" && !field.oneof && isWrapperDesc(field.message)) {
    return field.message.fields[0].scalar == ScalarType.BYTES ? toU8Arr : void 0;
  }
  if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName !== "google.protobuf.Value") {
    return void 0;
  }
  const messageDesc2 = field.message;
  let compiled;
  return (value) => {
    if (!isObject(value) || isMessage(value, messageDesc2)) {
      return value;
    }
    compiled !== null && compiled !== void 0 ? compiled : compiled = compiledCreate(messageDesc2);
    return compiled(value);
  };
}
function toU8Arr(value) {
  return Array.isArray(value) ? new Uint8Array(value) : value;
}
function needsPrototypeChain(desc) {
  switch (desc.file.edition) {
    case EDITION_PROTO32:
      return false;
    case EDITION_PROTO22:
      return true;
    default:
      return desc.fields.some((f) => f.presence != IMPLICIT3 && f.fieldKind != "message" && !f.oneof);
  }
}
function createZeroValue(field) {
  const defaultValue = field.getDefaultValue();
  if (defaultValue !== void 0) {
    return field.fieldKind == "scalar" && field.longAsString ? defaultValue.toString() : defaultValue;
  }
  return field.fieldKind == "scalar" ? scalarZeroValue(field.scalar, field.longAsString) : field.enum.values[0].number;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/message.js
var NULL_VALUE = 0;
function localMessageMapper(field) {
  if (usesJsonRepresentation(field)) {
    return {
      toMessage: (local) => wktStructToReflect(local),
      toLocal: (message) => wktStructToLocal(message)
    };
  }
  if (field.fieldKind == "message" && !field.oneof && isWrapperDesc(field.message)) {
    const wrapperDesc = field.message;
    const valueLocalName = wrapperDesc.fields[0].localName;
    return {
      toMessage: (local) => {
        const message = create(wrapperDesc);
        if (local !== void 0) {
          message[valueLocalName] = local;
        }
        return message;
      },
      toLocal: (message) => message[valueLocalName]
    };
  }
  const childDesc = field.message;
  return {
    toMessage: (local) => local === void 0 ? create(childDesc) : local,
    toLocal: (message) => message
  };
}
function usesJsonRepresentation(field) {
  return field.message.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value";
}
function wktStructToReflect(json) {
  const struct = {
    $typeName: "google.protobuf.Struct",
    fields: {}
  };
  if (isObject(json)) {
    for (const k of Object.keys(json)) {
      struct.fields[k] = wktValueToReflect(json[k]);
    }
  }
  return struct;
}
function wktStructToLocal(val) {
  const json = {};
  for (const k of Object.keys(val.fields)) {
    json[k] = wktValueToLocal(val.fields[k]);
  }
  return json;
}
function wktValueToLocal(val) {
  switch (val.kind.case) {
    case "structValue":
      return wktStructToLocal(val.kind.value);
    case "listValue":
      return val.kind.value.values.map(wktValueToLocal);
    case "nullValue":
    case void 0:
      return null;
    default:
      return val.kind.value;
  }
}
function wktValueToReflect(json) {
  const value = {
    $typeName: "google.protobuf.Value",
    kind: { case: void 0 }
  };
  switch (typeof json) {
    case "number":
      value.kind = { case: "numberValue", value: json };
      break;
    case "string":
      value.kind = { case: "stringValue", value: json };
      break;
    case "boolean":
      value.kind = { case: "boolValue", value: json };
      break;
    case "object":
      if (json === null) {
        value.kind = { case: "nullValue", value: NULL_VALUE };
      } else if (Array.isArray(json)) {
        const listValue = {
          $typeName: "google.protobuf.ListValue",
          values: []
        };
        if (Array.isArray(json)) {
          for (const e of json) {
            listValue.values.push(wktValueToReflect(e));
          }
        }
        value.kind = {
          case: "listValue",
          value: listValue
        };
      } else {
        value.kind = {
          case: "structValue",
          value: wktStructToReflect(json)
        };
      }
      break;
  }
  return value;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/to-binary.js
var IMPLICIT4 = 2;
var LEGACY_REQUIRED2 = 3;
var writeDefaults = {
  writeUnknownFields: true
};
function makeWriteOptions(options) {
  return options ? Object.assign(Object.assign({}, writeDefaults), options) : writeDefaults;
}
function toBinary(schema, message, options) {
  const writer = new BinaryWriter();
  compiledWriter(schema)(writer, makeWriteOptions(options), message);
  return writer.finish();
}
var compiledWriters = /* @__PURE__ */ new WeakMap();
function compiledWriter(desc) {
  let compiled = compiledWriters.get(desc);
  if (compiled === void 0) {
    compiled = compileMessage(desc);
  }
  return compiled;
}
function compileMessage(desc) {
  const typeName = desc.typeName;
  const sortedFields = desc.fields.concat().sort((a, b) => a.number - b.number);
  const foreignField = sortedFields[0];
  const fieldWriters = [];
  const compiled = (writer, opts, message) => {
    if (message.$typeName !== typeName && foreignField !== void 0) {
      throw new FieldError(foreignField, `cannot use ${foreignField} with message ${message.$typeName}`, "ForeignFieldError");
    }
    for (let i = 0; i < fieldWriters.length; i++) {
      fieldWriters[i](writer, opts, message);
    }
    const unknown = message.$unknown;
    if (unknown !== void 0 && opts.writeUnknownFields) {
      for (let i = 0; i < unknown.length; i++) {
        const { no, wireType, data } = unknown[i];
        writer.tag(no, wireType).raw(data);
      }
    }
  };
  compiledWriters.set(desc, compiled);
  for (const field of sortedFields) {
    fieldWriters.push(compileField(field));
  }
  return compiled;
}
function compileField(field) {
  switch (field.fieldKind) {
    case "message":
    case "scalar":
    case "enum":
      return compileSingularField(field);
    case "list":
      return compileListField(field);
    case "map":
      return compileMapField(field);
  }
}
function compileSingularField(field) {
  const writeValue = compileSingularValue(field);
  const localName = field.localName;
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (writer, opts, message) => {
      const oneof = message[oneofLocalName];
      if (oneof.case === localName) {
        writeValue(writer, opts, oneof.value);
      }
    };
  }
  if (field.presence != IMPLICIT4) {
    const requiredError = field.presence == LEGACY_REQUIRED2 ? `cannot encode ${field} to binary: required field not set` : void 0;
    return (writer, opts, message) => {
      const value = message[localName];
      if (value !== void 0 && Object.prototype.hasOwnProperty.call(message, localName)) {
        writeValue(writer, opts, value);
      } else if (requiredError !== void 0) {
        throw new Error(requiredError);
      }
    };
  }
  if (field.fieldKind == "enum") {
    const zero = field.enum.values[0].number;
    return (writer, opts, message) => {
      const value = message[localName];
      if (value !== zero) {
        writeValue(writer, opts, value);
      }
    };
  }
  switch (field.scalar) {
    case ScalarType.BOOL:
      return (writer, opts, message) => {
        const value = message[localName];
        if (value !== false) {
          writeValue(writer, opts, value);
        }
      };
    case ScalarType.STRING:
      return (writer, opts, message) => {
        const value = message[localName];
        if (value !== "") {
          writeValue(writer, opts, value);
        }
      };
    case ScalarType.BYTES:
      return (writer, opts, message) => {
        const value = message[localName];
        if (!(value instanceof Uint8Array) || value.byteLength > 0) {
          writeValue(writer, opts, value);
        }
      };
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return (writer, opts, message) => {
        const value = message[localName];
        if (!Object.is(value, 0)) {
          writeValue(writer, opts, value);
        }
      };
    default:
      return (writer, opts, message) => {
        const value = message[localName];
        if (value != 0) {
          writeValue(writer, opts, value);
        }
      };
  }
}
function compileSingularValue(field) {
  switch (field.fieldKind) {
    case "message": {
      const { toMessage: toMessage2 } = localMessageMapper(field);
      const writeChild = compileChildWriter(field);
      return (writer, opts, value) => {
        writeChild(writer, opts, toMessage2(value));
      };
    }
    case "scalar":
    case "enum": {
      const scalarType = field.fieldKind == "enum" ? ScalarType.INT32 : field.scalar;
      const fieldNo = field.number;
      const wireType = writeTypeOfScalar(scalarType);
      const writeScalar = compileScalarValue(scalarType, field.parent.typeName, field.name);
      return (writer, opts, value) => {
        writer.tag(fieldNo, wireType);
        writeScalar(writer, value);
      };
    }
  }
}
function compileListField(field) {
  const localName = field.localName;
  const fieldNo = field.number;
  switch (field.listKind) {
    case "message": {
      const { toMessage: toMessage2 } = localMessageMapper(field);
      const writeChild = compileChildWriter(field);
      return (writer, opts, message) => {
        const items = message[localName];
        for (let i = 0; i < items.length; i++) {
          writeChild(writer, opts, toMessage2(items[i]));
        }
      };
    }
    case "scalar":
    case "enum": {
      const scalarType = field.listKind == "enum" ? ScalarType.INT32 : field.scalar;
      const writeScalar = compileScalarValue(scalarType, field.parent.typeName, field.name);
      if (field.packed) {
        return (writer, opts, message) => {
          const items = message[localName];
          if (items.length == 0) {
            return;
          }
          writer.tag(fieldNo, WireType.LengthDelimited).fork();
          for (let i = 0; i < items.length; i++) {
            writeScalar(writer, items[i]);
          }
          writer.join();
        };
      }
      const wireType = writeTypeOfScalar(scalarType);
      return (writer, opts, message) => {
        const items = message[localName];
        for (let i = 0; i < items.length; i++) {
          writer.tag(fieldNo, wireType);
          writeScalar(writer, items[i]);
        }
      };
    }
  }
}
function compileMapField(field) {
  const localName = field.localName;
  const fieldNo = field.number;
  const writeKey = compileMapKey(field);
  if (field.mapKind == "message") {
    const { toMessage: toMessage2 } = localMessageMapper(field);
    const writeMessage = compiledWriter(field.message);
    return (writer, opts, message) => {
      const record = message[localName];
      const keys = Object.keys(record);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        writer.tag(fieldNo, WireType.LengthDelimited).fork();
        writeKey(writer, key);
        writer.tag(2, WireType.LengthDelimited).fork();
        writeMessage(writer, opts, toMessage2(record[key]));
        writer.join();
        writer.join();
      }
    };
  }
  const scalarType = field.mapKind == "enum" ? ScalarType.INT32 : field.scalar;
  const valueWireType = writeTypeOfScalar(scalarType);
  const writeScalar = compileScalarValue(scalarType, field.parent.typeName, field.name);
  return (writer, opts, message) => {
    const record = message[localName];
    const keys = Object.keys(record);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      writer.tag(fieldNo, WireType.LengthDelimited).fork();
      writeKey(writer, key);
      writer.tag(2, valueWireType);
      writeScalar(writer, record[key]);
      writer.join();
    }
  };
}
function compileMapKey(field) {
  const wireType = writeTypeOfScalar(field.mapKey);
  const writeScalar = compileScalarValue(field.mapKey, field.parent.typeName, field.name);
  const convertKey = compileMapKeyConverter(field.mapKey);
  return (writer, key) => {
    writer.tag(1, wireType);
    writeScalar(writer, convertKey(key));
  };
}
function compileMapKeyConverter(type) {
  switch (type) {
    case ScalarType.STRING:
      return (key) => key;
    case ScalarType.BOOL:
      return (key) => key === "true" ? true : key === "false" ? false : key;
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return (key) => {
        try {
          return protoInt64.uParse(key);
        } catch (_a) {
          return key;
        }
      };
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      return (key) => {
        try {
          return protoInt64.parse(key);
        } catch (_a) {
          return key;
        }
      };
    default:
      return (key) => {
        const n = Number.parseInt(key);
        return Number.isFinite(n) ? n : key;
      };
  }
}
function compileScalarValue(type, messageName, fieldName) {
  const writeScalar = compileScalarWrite(type);
  return (writer, value) => {
    try {
      writeScalar(writer, value);
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`cannot encode field ${messageName}.${fieldName} to binary: ${e.message}`);
      }
      throw e;
    }
  };
}
function compileScalarWrite(type) {
  switch (type) {
    case ScalarType.STRING:
      return (writer, value) => writer.string(value);
    case ScalarType.BOOL:
      return (writer, value) => writer.bool(value);
    case ScalarType.DOUBLE:
      return (writer, value) => writer.double(value);
    case ScalarType.FLOAT:
      return (writer, value) => writer.float(value);
    case ScalarType.INT32:
      return (writer, value) => writer.int32(value);
    case ScalarType.INT64:
      return (writer, value) => writer.int64(value);
    case ScalarType.UINT64:
      return (writer, value) => writer.uint64(value);
    case ScalarType.FIXED64:
      return (writer, value) => writer.fixed64(value);
    case ScalarType.BYTES:
      return (writer, value) => writer.bytes(value);
    case ScalarType.FIXED32:
      return (writer, value) => writer.fixed32(value);
    case ScalarType.SFIXED32:
      return (writer, value) => writer.sfixed32(value);
    case ScalarType.SFIXED64:
      return (writer, value) => writer.sfixed64(value);
    case ScalarType.SINT64:
      return (writer, value) => writer.sint64(value);
    case ScalarType.UINT32:
      return (writer, value) => writer.uint32(value);
    case ScalarType.SINT32:
      return (writer, value) => writer.sint32(value);
  }
}
function writeField(writer, opts, msg, field) {
  compileField(field)(writer, opts, msg[unsafeLocal]);
}
function compileChildWriter(field) {
  const fieldNo = field.number;
  const writeMessage = compiledWriter(field.message);
  if (field.delimitedEncoding) {
    return (writer, opts, child) => {
      writer.tag(fieldNo, WireType.StartGroup);
      writeMessage(writer, opts, child);
      writer.tag(fieldNo, WireType.EndGroup);
    };
  }
  return (writer, opts, child) => {
    writer.tag(fieldNo, WireType.LengthDelimited).fork();
    writeMessage(writer, opts, child);
    writer.join();
  };
}
function writeTypeOfScalar(type) {
  switch (type) {
    case ScalarType.BYTES:
    case ScalarType.STRING:
      return WireType.LengthDelimited;
    case ScalarType.DOUBLE:
    case ScalarType.FIXED64:
    case ScalarType.SFIXED64:
      return WireType.Bit64;
    case ScalarType.FIXED32:
    case ScalarType.SFIXED32:
    case ScalarType.FLOAT:
      return WireType.Bit32;
    default:
      return WireType.Varint;
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/reflect-check.js
function checkField(field, value) {
  const check = field.fieldKind == "list" ? isReflectList(value, field) : field.fieldKind == "map" ? isReflectMap(value, field) : checkSingular(field, value);
  if (check === true) {
    return void 0;
  }
  let reason;
  switch (field.fieldKind) {
    case "list":
      reason = `expected ${formatReflectList(field)}, got ${formatVal(value)}`;
      break;
    case "map":
      reason = `expected ${formatReflectMap(field)}, got ${formatVal(value)}`;
      break;
    default: {
      reason = reasonSingular(field, value, check);
    }
  }
  return new FieldError(field, reason);
}
function checkListItem(field, index, value) {
  const check = checkSingular(field, value);
  if (check !== true) {
    return new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
  }
  return void 0;
}
function checkMapEntry(field, key, value) {
  const checkKey = checkScalarValue(field.mapKey)(key);
  if (checkKey !== true) {
    return new FieldError(field, `invalid map key: ${reasonSingular({ scalar: field.mapKey }, key, checkKey)}`);
  }
  const checkVal = checkSingular(field, value);
  if (checkVal !== true) {
    return new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, checkVal)}`);
  }
  return void 0;
}
function checkSingular(field, value) {
  if (field.scalar !== void 0) {
    return checkScalarValue(field.scalar)(value);
  }
  if (field.enum !== void 0) {
    if (field.enum.open) {
      return checkScalarValue(ScalarType.INT32)(value);
    }
    return field.enum.values.some((v) => v.number === value);
  }
  return isReflectMessage(value, field.message);
}
function checkScalarValue(scalar) {
  switch (scalar) {
    case ScalarType.DOUBLE:
      return (value) => typeof value == "number";
    case ScalarType.FLOAT:
      return (value) => {
        if (typeof value != "number") {
          return false;
        }
        if (Number.isNaN(value) || !Number.isFinite(value)) {
          return true;
        }
        if (value > FLOAT32_MAX || value < FLOAT32_MIN) {
          return `${value.toFixed()} out of range`;
        }
        return true;
      };
    case ScalarType.INT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
      return (value) => {
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return false;
        }
        if (value > INT32_MAX || value < INT32_MIN) {
          return `${value.toFixed()} out of range`;
        }
        return true;
      };
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
      return (value) => {
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return false;
        }
        if (value > UINT32_MAX || value < 0) {
          return `${value.toFixed()} out of range`;
        }
        return true;
      };
    case ScalarType.BOOL:
      return (value) => typeof value == "boolean";
    case ScalarType.STRING:
      return (value) => {
        if (typeof value != "string") {
          return false;
        }
        return getTextEncoding().checkUtf8(value) || "invalid UTF8";
      };
    case ScalarType.BYTES:
      return (value) => value instanceof Uint8Array;
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      return (value) => {
        if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) {
          try {
            protoInt64.parse(value);
            return true;
          } catch (_) {
            return `${value} out of range`;
          }
        }
        return false;
      };
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      return (value) => {
        if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) {
          try {
            protoInt64.uParse(value);
            return true;
          } catch (_) {
            return `${value} out of range`;
          }
        }
        return false;
      };
  }
}
function reasonSingular(field, val, details) {
  details = typeof details == "string" ? `: ${details}` : `, got ${formatVal(val)}`;
  if (field.scalar !== void 0) {
    return `expected ${scalarTypeDescription(field.scalar)}` + details;
  }
  if (field.enum !== void 0) {
    return `expected ${field.enum.toString()}` + details;
  }
  return `expected ${formatReflectMessage(field.message)}` + details;
}
function formatVal(val) {
  switch (typeof val) {
    case "object":
      if (val === null) {
        return "null";
      }
      if (val instanceof Uint8Array) {
        return `Uint8Array(${val.length})`;
      }
      if (Array.isArray(val)) {
        return `Array(${val.length})`;
      }
      if (isReflectList(val)) {
        return formatReflectList(val.field());
      }
      if (isReflectMap(val)) {
        return formatReflectMap(val.field());
      }
      if (isReflectMessage(val)) {
        return formatReflectMessage(val.desc);
      }
      if (isMessage(val)) {
        return `message ${val.$typeName}`;
      }
      return "object";
    case "string":
      return val.length > 30 ? "string" : `"${val.split('"').join('\\"')}"`;
    case "boolean":
      return String(val);
    case "number":
      return String(val);
    case "bigint":
      return String(val) + "n";
    default:
      return typeof val;
  }
}
function formatReflectMessage(desc) {
  return `ReflectMessage (${desc.typeName})`;
}
function formatReflectList(field) {
  switch (field.listKind) {
    case "message":
      return `ReflectList (${field.message.toString()})`;
    case "enum":
      return `ReflectList (${field.enum.toString()})`;
    case "scalar":
      return `ReflectList (${ScalarType[field.scalar]})`;
  }
}
function formatReflectMap(field) {
  switch (field.mapKind) {
    case "message":
      return `ReflectMap (${ScalarType[field.mapKey]}, ${field.message.toString()})`;
    case "enum":
      return `ReflectMap (${ScalarType[field.mapKey]}, ${field.enum.toString()})`;
    case "scalar":
      return `ReflectMap (${ScalarType[field.mapKey]}, ${ScalarType[field.scalar]})`;
  }
}
function scalarTypeDescription(scalar) {
  switch (scalar) {
    case ScalarType.STRING:
      return "string";
    case ScalarType.BOOL:
      return "boolean";
    case ScalarType.INT64:
    case ScalarType.SINT64:
    case ScalarType.SFIXED64:
      return "bigint (int64)";
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return "bigint (uint64)";
    case ScalarType.BYTES:
      return "Uint8Array";
    case ScalarType.DOUBLE:
      return "number (float64)";
    case ScalarType.FLOAT:
      return "number (float32)";
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
      return "number (uint32)";
    case ScalarType.INT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
      return "number (int32)";
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/reflect/reflect.js
function reflect(messageDesc2, message, check = true) {
  return new ReflectMessageImpl(messageDesc2, message, check);
}
var messageSortedFields = /* @__PURE__ */ new WeakMap();
var ReflectMessageImpl = class {
  get sortedFields() {
    const cached = messageSortedFields.get(this.desc);
    if (cached) {
      return cached;
    }
    const sortedFields = this.desc.fields.concat().sort((a, b) => a.number - b.number);
    messageSortedFields.set(this.desc, sortedFields);
    return sortedFields;
  }
  constructor(messageDesc2, message, check = true) {
    this.lists = /* @__PURE__ */ new Map();
    this.maps = /* @__PURE__ */ new Map();
    this.check = check;
    this.desc = messageDesc2;
    this.message = this[unsafeLocal] = message !== null && message !== void 0 ? message : create(messageDesc2);
    this.fields = messageDesc2.fields;
    this.oneofs = messageDesc2.oneofs;
    this.members = messageDesc2.members;
  }
  findNumber(number) {
    if (!this._fieldsByNumber) {
      this._fieldsByNumber = new Map(this.desc.fields.map((f) => [f.number, f]));
    }
    return this._fieldsByNumber.get(number);
  }
  oneofCase(oneof) {
    assertOwn(this.message, oneof);
    return unsafeOneofCase(this.message, oneof);
  }
  isSet(field) {
    assertOwn(this.message, field);
    return unsafeIsSet(this.message, field);
  }
  clear(field) {
    assertOwn(this.message, field);
    unsafeClear(this.message, field);
  }
  get(field) {
    assertOwn(this.message, field);
    const value = unsafeGet(this.message, field);
    switch (field.fieldKind) {
      case "list":
        let list = this.lists.get(field);
        if (!list || list[unsafeLocal] !== value) {
          this.lists.set(
            field,
            // biome-ignore lint/suspicious/noAssignInExpressions: no
            list = new ReflectListImpl(field, value, this.check)
          );
        }
        return list;
      case "map":
        let map = this.maps.get(field);
        if (!map || map[unsafeLocal] !== value) {
          this.maps.set(
            field,
            // biome-ignore lint/suspicious/noAssignInExpressions: no
            map = new ReflectMapImpl(field, value, this.check)
          );
        }
        return map;
      case "message":
        return messageToReflect(field, value, this.check);
      case "scalar":
        return value === void 0 ? scalarZeroValue(field.scalar, false) : longToReflect(field, value);
      case "enum":
        return value !== null && value !== void 0 ? value : field.enum.values[0].number;
    }
  }
  set(field, value) {
    assertOwn(this.message, field);
    if (this.check) {
      const err = checkField(field, value);
      if (err) {
        throw err;
      }
    }
    let local;
    if (field.fieldKind == "message") {
      local = messageToLocal(field, value);
    } else if (isReflectMap(value) || isReflectList(value)) {
      local = value[unsafeLocal];
    } else {
      local = longToLocal(field, value);
    }
    unsafeSet(this.message, field, local);
  }
  getUnknown() {
    return this.message.$unknown;
  }
  setUnknown(value) {
    this.message.$unknown = value;
  }
};
function assertOwn(owner, member) {
  if (member.parent.typeName !== owner.$typeName) {
    throw new FieldError(member, `cannot use ${member.toString()} with message ${owner.$typeName}`, "ForeignFieldError");
  }
}
var ReflectListImpl = class {
  field() {
    return this._field;
  }
  get size() {
    return this._arr.length;
  }
  constructor(field, unsafeInput, check) {
    this._field = field;
    this._arr = this[unsafeLocal] = unsafeInput;
    this.check = check;
  }
  get(index) {
    const item = this._arr[index];
    return item === void 0 ? void 0 : listItemToReflect(this._field, item, this.check);
  }
  set(index, item) {
    if (index < 0 || index >= this._arr.length) {
      throw new FieldError(this._field, `list item #${index + 1}: out of range`);
    }
    if (this.check) {
      const err = checkListItem(this._field, index, item);
      if (err) {
        throw err;
      }
    }
    this._arr[index] = listItemToLocal(this._field, item);
  }
  add(item) {
    if (this.check) {
      const err = checkListItem(this._field, this._arr.length, item);
      if (err) {
        throw err;
      }
    }
    this._arr.push(listItemToLocal(this._field, item));
    return void 0;
  }
  clear() {
    this._arr.splice(0, this._arr.length);
  }
  [Symbol.iterator]() {
    return this.values();
  }
  keys() {
    return this._arr.keys();
  }
  *values() {
    for (const item of this._arr) {
      yield listItemToReflect(this._field, item, this.check);
    }
  }
  *entries() {
    for (let i = 0; i < this._arr.length; i++) {
      yield [i, listItemToReflect(this._field, this._arr[i], this.check)];
    }
  }
};
var ReflectMapImpl = class {
  constructor(field, unsafeInput, check = true) {
    this.obj = this[unsafeLocal] = unsafeInput !== null && unsafeInput !== void 0 ? unsafeInput : {};
    this.check = check;
    this._field = field;
  }
  field() {
    return this._field;
  }
  set(key, value) {
    if (this.check) {
      const err = checkMapEntry(this._field, key, value);
      if (err) {
        throw err;
      }
    }
    this.obj[mapKeyToLocal(key)] = mapValueToLocal(this._field, value);
    return this;
  }
  delete(key) {
    const k = mapKeyToLocal(key);
    const has = Object.prototype.hasOwnProperty.call(this.obj, k);
    if (has) {
      delete this.obj[k];
    }
    return has;
  }
  clear() {
    for (const key of Object.keys(this.obj)) {
      delete this.obj[key];
    }
  }
  get(key) {
    let val = this.obj[mapKeyToLocal(key)];
    if (val !== void 0) {
      val = mapValueToReflect(this._field, val, this.check);
    }
    return val;
  }
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.obj, mapKeyToLocal(key));
  }
  *keys() {
    for (const objKey of Object.keys(this.obj)) {
      yield mapKeyToReflect(objKey, this._field.mapKey);
    }
  }
  *entries() {
    for (const objEntry of Object.entries(this.obj)) {
      yield [
        mapKeyToReflect(objEntry[0], this._field.mapKey),
        mapValueToReflect(this._field, objEntry[1], this.check)
      ];
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  get size() {
    return Object.keys(this.obj).length;
  }
  *values() {
    for (const val of Object.values(this.obj)) {
      yield mapValueToReflect(this._field, val, this.check);
    }
  }
  forEach(callbackfn, thisArg) {
    for (const mapEntry of this.entries()) {
      callbackfn.call(thisArg, mapEntry[1], mapEntry[0], this);
    }
  }
};
function messageToLocal(field, value) {
  if (!isReflectMessage(value)) {
    return value;
  }
  if (isWrapper(value.message) && !field.oneof && field.fieldKind == "message") {
    return value.message.value;
  }
  if (value.desc.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value") {
    return wktStructToLocal(value.message);
  }
  return value.message;
}
function messageToReflect(field, value, check) {
  if (value !== void 0) {
    if (isWrapperDesc(field.message) && !field.oneof && field.fieldKind == "message") {
      value = {
        $typeName: field.message.typeName,
        value: longToReflect(field.message.fields[0], value)
      };
    } else if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value" && isObject(value)) {
      value = wktStructToReflect(value);
    }
  }
  return new ReflectMessageImpl(field.message, value, check);
}
function listItemToLocal(field, value) {
  if (field.listKind == "message") {
    return messageToLocal(field, value);
  }
  return longToLocal(field, value);
}
function listItemToReflect(field, value, check) {
  if (field.listKind == "message") {
    return messageToReflect(field, value, check);
  }
  return longToReflect(field, value);
}
function mapValueToLocal(field, value) {
  if (field.mapKind == "message") {
    return messageToLocal(field, value);
  }
  return longToLocal(field, value);
}
function mapValueToReflect(field, value, check) {
  if (field.mapKind == "message") {
    return messageToReflect(field, value, check);
  }
  return value;
}
function mapKeyToLocal(key) {
  return typeof key == "string" || typeof key == "number" ? key : String(key);
}
function mapKeyToReflect(key, type) {
  switch (type) {
    case ScalarType.STRING:
      return key;
    case ScalarType.INT32:
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32: {
      const n = Number.parseInt(key);
      if (Number.isFinite(n)) {
        return n;
      }
      break;
    }
    case ScalarType.BOOL:
      switch (key) {
        case "true":
          return true;
        case "false":
          return false;
      }
      break;
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      try {
        return protoInt64.uParse(key);
      } catch (_a) {
      }
      break;
    default:
      try {
        return protoInt64.parse(key);
      } catch (_b) {
      }
      break;
  }
  return key;
}
function longToReflect(field, value) {
  switch (field.scalar) {
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      if ("longAsString" in field && field.longAsString && typeof value == "string") {
        value = protoInt64.parse(value);
      }
      break;
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      if ("longAsString" in field && field.longAsString && typeof value == "string") {
        value = protoInt64.uParse(value);
      }
      break;
  }
  return value;
}
function longToLocal(field, value) {
  switch (field.scalar) {
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      if ("longAsString" in field && field.longAsString) {
        value = String(value);
      } else if (typeof value == "string" || typeof value == "number") {
        value = protoInt64.parse(value);
      }
      break;
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      if ("longAsString" in field && field.longAsString) {
        value = String(value);
      } else if (typeof value == "string" || typeof value == "number") {
        value = protoInt64.uParse(value);
      }
      break;
  }
  return value;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/message.js
function messageDesc(file2, path4, ...paths) {
  return paths.reduce((acc, cur) => acc.nestedMessages[cur], file2.messages[path4]);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/gen/google/protobuf/descriptor_pb.js
var file_google_protobuf_descriptor = /* @__PURE__ */ boot({ "name": "google/protobuf/descriptor.proto", "package": "google.protobuf", "messageType": [{ "name": "FileDescriptorSet", "field": [{ "name": "file", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.FileDescriptorProto" }], "extensionRange": [{ "start": 536e6, "end": 536000001 }] }, { "name": "FileDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "package", "number": 2, "type": 9, "label": 1 }, { "name": "dependency", "number": 3, "type": 9, "label": 3 }, { "name": "public_dependency", "number": 10, "type": 5, "label": 3 }, { "name": "weak_dependency", "number": 11, "type": 5, "label": 3 }, { "name": "option_dependency", "number": 15, "type": 9, "label": 3 }, { "name": "message_type", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto" }, { "name": "enum_type", "number": 5, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto" }, { "name": "service", "number": 6, "type": 11, "label": 3, "typeName": ".google.protobuf.ServiceDescriptorProto" }, { "name": "extension", "number": 7, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "options", "number": 8, "type": 11, "label": 1, "typeName": ".google.protobuf.FileOptions" }, { "name": "source_code_info", "number": 9, "type": 11, "label": 1, "typeName": ".google.protobuf.SourceCodeInfo" }, { "name": "syntax", "number": 12, "type": 9, "label": 1 }, { "name": "edition", "number": 14, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }] }, { "name": "DescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "field", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "extension", "number": 6, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "nested_type", "number": 3, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto" }, { "name": "enum_type", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto" }, { "name": "extension_range", "number": 5, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto.ExtensionRange" }, { "name": "oneof_decl", "number": 8, "type": 11, "label": 3, "typeName": ".google.protobuf.OneofDescriptorProto" }, { "name": "options", "number": 7, "type": 11, "label": 1, "typeName": ".google.protobuf.MessageOptions" }, { "name": "reserved_range", "number": 9, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto.ReservedRange" }, { "name": "reserved_name", "number": 10, "type": 9, "label": 3 }, { "name": "visibility", "number": 11, "type": 14, "label": 1, "typeName": ".google.protobuf.SymbolVisibility" }], "nestedType": [{ "name": "ExtensionRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.ExtensionRangeOptions" }] }, { "name": "ReservedRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }] }] }, { "name": "ExtensionRangeOptions", "field": [{ "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }, { "name": "declaration", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.ExtensionRangeOptions.Declaration", "options": { "retention": 2 } }, { "name": "features", "number": 50, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "verification", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.ExtensionRangeOptions.VerificationState", "defaultValue": "UNVERIFIED", "options": { "retention": 2 } }], "nestedType": [{ "name": "Declaration", "field": [{ "name": "number", "number": 1, "type": 5, "label": 1 }, { "name": "full_name", "number": 2, "type": 9, "label": 1 }, { "name": "type", "number": 3, "type": 9, "label": 1 }, { "name": "reserved", "number": 5, "type": 8, "label": 1 }, { "name": "repeated", "number": 6, "type": 8, "label": 1 }] }], "enumType": [{ "name": "VerificationState", "value": [{ "name": "DECLARATION", "number": 0 }, { "name": "UNVERIFIED", "number": 1 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "FieldDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "number", "number": 3, "type": 5, "label": 1 }, { "name": "label", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldDescriptorProto.Label" }, { "name": "type", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldDescriptorProto.Type" }, { "name": "type_name", "number": 6, "type": 9, "label": 1 }, { "name": "extendee", "number": 2, "type": 9, "label": 1 }, { "name": "default_value", "number": 7, "type": 9, "label": 1 }, { "name": "oneof_index", "number": 9, "type": 5, "label": 1 }, { "name": "json_name", "number": 10, "type": 9, "label": 1 }, { "name": "options", "number": 8, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions" }, { "name": "proto3_optional", "number": 17, "type": 8, "label": 1 }], "enumType": [{ "name": "Type", "value": [{ "name": "TYPE_DOUBLE", "number": 1 }, { "name": "TYPE_FLOAT", "number": 2 }, { "name": "TYPE_INT64", "number": 3 }, { "name": "TYPE_UINT64", "number": 4 }, { "name": "TYPE_INT32", "number": 5 }, { "name": "TYPE_FIXED64", "number": 6 }, { "name": "TYPE_FIXED32", "number": 7 }, { "name": "TYPE_BOOL", "number": 8 }, { "name": "TYPE_STRING", "number": 9 }, { "name": "TYPE_GROUP", "number": 10 }, { "name": "TYPE_MESSAGE", "number": 11 }, { "name": "TYPE_BYTES", "number": 12 }, { "name": "TYPE_UINT32", "number": 13 }, { "name": "TYPE_ENUM", "number": 14 }, { "name": "TYPE_SFIXED32", "number": 15 }, { "name": "TYPE_SFIXED64", "number": 16 }, { "name": "TYPE_SINT32", "number": 17 }, { "name": "TYPE_SINT64", "number": 18 }] }, { "name": "Label", "value": [{ "name": "LABEL_OPTIONAL", "number": 1 }, { "name": "LABEL_REPEATED", "number": 3 }, { "name": "LABEL_REQUIRED", "number": 2 }] }] }, { "name": "OneofDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "options", "number": 2, "type": 11, "label": 1, "typeName": ".google.protobuf.OneofOptions" }] }, { "name": "EnumDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "value", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumValueDescriptorProto" }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.EnumOptions" }, { "name": "reserved_range", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto.EnumReservedRange" }, { "name": "reserved_name", "number": 5, "type": 9, "label": 3 }, { "name": "visibility", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.SymbolVisibility" }], "nestedType": [{ "name": "EnumReservedRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }] }] }, { "name": "EnumValueDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "number", "number": 2, "type": 5, "label": 1 }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.EnumValueOptions" }] }, { "name": "ServiceDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "method", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.MethodDescriptorProto" }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.ServiceOptions" }] }, { "name": "MethodDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "input_type", "number": 2, "type": 9, "label": 1 }, { "name": "output_type", "number": 3, "type": 9, "label": 1 }, { "name": "options", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.MethodOptions" }, { "name": "client_streaming", "number": 5, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "server_streaming", "number": 6, "type": 8, "label": 1, "defaultValue": "false" }] }, { "name": "FileOptions", "field": [{ "name": "java_package", "number": 1, "type": 9, "label": 1 }, { "name": "java_outer_classname", "number": 8, "type": 9, "label": 1 }, { "name": "java_multiple_files", "number": 10, "type": 8, "label": 1, "defaultValue": "false", "options": {} }, { "name": "java_generate_equals_and_hash", "number": 20, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "java_string_check_utf8", "number": 27, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "optimize_for", "number": 9, "type": 14, "label": 1, "typeName": ".google.protobuf.FileOptions.OptimizeMode", "defaultValue": "SPEED" }, { "name": "go_package", "number": 11, "type": 9, "label": 1 }, { "name": "cc_generic_services", "number": 16, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "java_generic_services", "number": 17, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "py_generic_services", "number": 18, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 23, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "cc_enable_arenas", "number": 31, "type": 8, "label": 1, "defaultValue": "true" }, { "name": "objc_class_prefix", "number": 36, "type": 9, "label": 1 }, { "name": "csharp_namespace", "number": 37, "type": 9, "label": 1 }, { "name": "swift_prefix", "number": 39, "type": 9, "label": 1 }, { "name": "php_class_prefix", "number": 40, "type": 9, "label": 1 }, { "name": "php_namespace", "number": 41, "type": 9, "label": 1 }, { "name": "php_metadata_namespace", "number": 44, "type": 9, "label": 1 }, { "name": "ruby_package", "number": 45, "type": 9, "label": 1 }, { "name": "features", "number": 50, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "enumType": [{ "name": "OptimizeMode", "value": [{ "name": "SPEED", "number": 1 }, { "name": "CODE_SIZE", "number": 2 }, { "name": "LITE_RUNTIME", "number": 3 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "MessageOptions", "field": [{ "name": "message_set_wire_format", "number": 1, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "no_standard_descriptor_accessor", "number": 2, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "map_entry", "number": 7, "type": 8, "label": 1 }, { "name": "deprecated_legacy_json_field_conflicts", "number": 11, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "features", "number": 12, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "FieldOptions", "field": [{ "name": "ctype", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.CType", "defaultValue": "STRING" }, { "name": "packed", "number": 2, "type": 8, "label": 1 }, { "name": "jstype", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.JSType", "defaultValue": "JS_NORMAL" }, { "name": "lazy", "number": 5, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "unverified_lazy", "number": 15, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "weak", "number": 10, "type": 8, "label": 1, "defaultValue": "false", "options": { "deprecated": true } }, { "name": "debug_redact", "number": 16, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "retention", "number": 17, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.OptionRetention" }, { "name": "targets", "number": 19, "type": 14, "label": 3, "typeName": ".google.protobuf.FieldOptions.OptionTargetType" }, { "name": "edition_defaults", "number": 20, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldOptions.EditionDefault" }, { "name": "features", "number": 21, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "feature_support", "number": 22, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions.FeatureSupport" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "nestedType": [{ "name": "EditionDefault", "field": [{ "name": "edition", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "value", "number": 2, "type": 9, "label": 1 }] }, { "name": "FeatureSupport", "field": [{ "name": "edition_introduced", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "edition_deprecated", "number": 2, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "deprecation_warning", "number": 3, "type": 9, "label": 1 }, { "name": "edition_removed", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "removal_error", "number": 5, "type": 9, "label": 1 }] }], "enumType": [{ "name": "CType", "value": [{ "name": "STRING", "number": 0 }, { "name": "CORD", "number": 1 }, { "name": "STRING_PIECE", "number": 2 }] }, { "name": "JSType", "value": [{ "name": "JS_NORMAL", "number": 0 }, { "name": "JS_STRING", "number": 1 }, { "name": "JS_NUMBER", "number": 2 }] }, { "name": "OptionRetention", "value": [{ "name": "RETENTION_UNKNOWN", "number": 0 }, { "name": "RETENTION_RUNTIME", "number": 1 }, { "name": "RETENTION_SOURCE", "number": 2 }] }, { "name": "OptionTargetType", "value": [{ "name": "TARGET_TYPE_UNKNOWN", "number": 0 }, { "name": "TARGET_TYPE_FILE", "number": 1 }, { "name": "TARGET_TYPE_EXTENSION_RANGE", "number": 2 }, { "name": "TARGET_TYPE_MESSAGE", "number": 3 }, { "name": "TARGET_TYPE_FIELD", "number": 4 }, { "name": "TARGET_TYPE_ONEOF", "number": 5 }, { "name": "TARGET_TYPE_ENUM", "number": 6 }, { "name": "TARGET_TYPE_ENUM_ENTRY", "number": 7 }, { "name": "TARGET_TYPE_SERVICE", "number": 8 }, { "name": "TARGET_TYPE_METHOD", "number": 9 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "OneofOptions", "field": [{ "name": "features", "number": 1, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "EnumOptions", "field": [{ "name": "allow_alias", "number": 2, "type": 8, "label": 1 }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated_legacy_json_field_conflicts", "number": 6, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "features", "number": 7, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "EnumValueOptions", "field": [{ "name": "deprecated", "number": 1, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "features", "number": 2, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "debug_redact", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "feature_support", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions.FeatureSupport" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "ServiceOptions", "field": [{ "name": "features", "number": 34, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "deprecated", "number": 33, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "MethodOptions", "field": [{ "name": "deprecated", "number": 33, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "idempotency_level", "number": 34, "type": 14, "label": 1, "typeName": ".google.protobuf.MethodOptions.IdempotencyLevel", "defaultValue": "IDEMPOTENCY_UNKNOWN" }, { "name": "features", "number": 35, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "enumType": [{ "name": "IdempotencyLevel", "value": [{ "name": "IDEMPOTENCY_UNKNOWN", "number": 0 }, { "name": "NO_SIDE_EFFECTS", "number": 1 }, { "name": "IDEMPOTENT", "number": 2 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "UninterpretedOption", "field": [{ "name": "name", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption.NamePart" }, { "name": "identifier_value", "number": 3, "type": 9, "label": 1 }, { "name": "positive_int_value", "number": 4, "type": 4, "label": 1 }, { "name": "negative_int_value", "number": 5, "type": 3, "label": 1 }, { "name": "double_value", "number": 6, "type": 1, "label": 1 }, { "name": "string_value", "number": 7, "type": 12, "label": 1 }, { "name": "aggregate_value", "number": 8, "type": 9, "label": 1 }], "nestedType": [{ "name": "NamePart", "field": [{ "name": "name_part", "number": 1, "type": 9, "label": 2 }, { "name": "is_extension", "number": 2, "type": 8, "label": 2 }] }] }, { "name": "FeatureSet", "field": [{ "name": "field_presence", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.FieldPresence", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "EXPLICIT", "edition": 900 }, { "value": "IMPLICIT", "edition": 999 }, { "value": "EXPLICIT", "edition": 1e3 }] } }, { "name": "enum_type", "number": 2, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.EnumType", "options": { "retention": 1, "targets": [6, 1], "editionDefaults": [{ "value": "CLOSED", "edition": 900 }, { "value": "OPEN", "edition": 999 }] } }, { "name": "repeated_field_encoding", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.RepeatedFieldEncoding", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "EXPANDED", "edition": 900 }, { "value": "PACKED", "edition": 999 }] } }, { "name": "utf8_validation", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.Utf8Validation", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "NONE", "edition": 900 }, { "value": "VERIFY", "edition": 999 }] } }, { "name": "message_encoding", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.MessageEncoding", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "LENGTH_PREFIXED", "edition": 900 }] } }, { "name": "json_format", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.JsonFormat", "options": { "retention": 1, "targets": [3, 6, 1], "editionDefaults": [{ "value": "LEGACY_BEST_EFFORT", "edition": 900 }, { "value": "ALLOW", "edition": 999 }] } }, { "name": "enforce_naming_style", "number": 7, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.EnforceNamingStyle", "options": { "retention": 2, "targets": [1, 2, 3, 4, 5, 6, 7, 8, 9], "editionDefaults": [{ "value": "STYLE_LEGACY", "edition": 900 }, { "value": "STYLE2024", "edition": 1001 }] } }, { "name": "default_symbol_visibility", "number": 8, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.VisibilityFeature.DefaultSymbolVisibility", "options": { "retention": 2, "targets": [1], "editionDefaults": [{ "value": "EXPORT_ALL", "edition": 900 }, { "value": "EXPORT_TOP_LEVEL", "edition": 1001 }] } }], "nestedType": [{ "name": "VisibilityFeature", "enumType": [{ "name": "DefaultSymbolVisibility", "value": [{ "name": "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN", "number": 0 }, { "name": "EXPORT_ALL", "number": 1 }, { "name": "EXPORT_TOP_LEVEL", "number": 2 }, { "name": "LOCAL_ALL", "number": 3 }, { "name": "STRICT", "number": 4 }] }] }], "enumType": [{ "name": "FieldPresence", "value": [{ "name": "FIELD_PRESENCE_UNKNOWN", "number": 0 }, { "name": "EXPLICIT", "number": 1 }, { "name": "IMPLICIT", "number": 2 }, { "name": "LEGACY_REQUIRED", "number": 3 }] }, { "name": "EnumType", "value": [{ "name": "ENUM_TYPE_UNKNOWN", "number": 0 }, { "name": "OPEN", "number": 1 }, { "name": "CLOSED", "number": 2 }] }, { "name": "RepeatedFieldEncoding", "value": [{ "name": "REPEATED_FIELD_ENCODING_UNKNOWN", "number": 0 }, { "name": "PACKED", "number": 1 }, { "name": "EXPANDED", "number": 2 }] }, { "name": "Utf8Validation", "value": [{ "name": "UTF8_VALIDATION_UNKNOWN", "number": 0 }, { "name": "VERIFY", "number": 2 }, { "name": "NONE", "number": 3 }] }, { "name": "MessageEncoding", "value": [{ "name": "MESSAGE_ENCODING_UNKNOWN", "number": 0 }, { "name": "LENGTH_PREFIXED", "number": 1 }, { "name": "DELIMITED", "number": 2 }] }, { "name": "JsonFormat", "value": [{ "name": "JSON_FORMAT_UNKNOWN", "number": 0 }, { "name": "ALLOW", "number": 1 }, { "name": "LEGACY_BEST_EFFORT", "number": 2 }] }, { "name": "EnforceNamingStyle", "value": [{ "name": "ENFORCE_NAMING_STYLE_UNKNOWN", "number": 0 }, { "name": "STYLE2024", "number": 1 }, { "name": "STYLE_LEGACY", "number": 2 }] }], "extensionRange": [{ "start": 1e3, "end": 9995 }, { "start": 9995, "end": 1e4 }, { "start": 1e4, "end": 10001 }] }, { "name": "FeatureSetDefaults", "field": [{ "name": "defaults", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault" }, { "name": "minimum_edition", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "maximum_edition", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }], "nestedType": [{ "name": "FeatureSetEditionDefault", "field": [{ "name": "edition", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "overridable_features", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "fixed_features", "number": 5, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }] }] }, { "name": "SourceCodeInfo", "field": [{ "name": "location", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.SourceCodeInfo.Location" }], "nestedType": [{ "name": "Location", "field": [{ "name": "path", "number": 1, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "span", "number": 2, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "leading_comments", "number": 3, "type": 9, "label": 1 }, { "name": "trailing_comments", "number": 4, "type": 9, "label": 1 }, { "name": "leading_detached_comments", "number": 6, "type": 9, "label": 3 }] }], "extensionRange": [{ "start": 536e6, "end": 536000001 }] }, { "name": "GeneratedCodeInfo", "field": [{ "name": "annotation", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.GeneratedCodeInfo.Annotation" }], "nestedType": [{ "name": "Annotation", "field": [{ "name": "path", "number": 1, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "source_file", "number": 2, "type": 9, "label": 1 }, { "name": "begin", "number": 3, "type": 5, "label": 1 }, { "name": "end", "number": 4, "type": 5, "label": 1 }, { "name": "semantic", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.GeneratedCodeInfo.Annotation.Semantic" }], "enumType": [{ "name": "Semantic", "value": [{ "name": "NONE", "number": 0 }, { "name": "SET", "number": 1 }, { "name": "ALIAS", "number": 2 }] }] }] }], "enumType": [{ "name": "Edition", "value": [{ "name": "EDITION_UNKNOWN", "number": 0 }, { "name": "EDITION_LEGACY", "number": 900 }, { "name": "EDITION_PROTO2", "number": 998 }, { "name": "EDITION_PROTO3", "number": 999 }, { "name": "EDITION_2023", "number": 1e3 }, { "name": "EDITION_2024", "number": 1001 }, { "name": "EDITION_UNSTABLE", "number": 9999 }, { "name": "EDITION_1_TEST_ONLY", "number": 1 }, { "name": "EDITION_2_TEST_ONLY", "number": 2 }, { "name": "EDITION_99997_TEST_ONLY", "number": 99997 }, { "name": "EDITION_99998_TEST_ONLY", "number": 99998 }, { "name": "EDITION_99999_TEST_ONLY", "number": 99999 }, { "name": "EDITION_MAX", "number": 2147483647 }] }, { "name": "SymbolVisibility", "value": [{ "name": "VISIBILITY_UNSET", "number": 0 }, { "name": "VISIBILITY_LOCAL", "number": 1 }, { "name": "VISIBILITY_EXPORT", "number": 2 }] }] });
var FileDescriptorProtoSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_descriptor, 1);
var ExtensionRangeOptions_VerificationState;
(function(ExtensionRangeOptions_VerificationState2) {
  ExtensionRangeOptions_VerificationState2[ExtensionRangeOptions_VerificationState2["DECLARATION"] = 0] = "DECLARATION";
  ExtensionRangeOptions_VerificationState2[ExtensionRangeOptions_VerificationState2["UNVERIFIED"] = 1] = "UNVERIFIED";
})(ExtensionRangeOptions_VerificationState || (ExtensionRangeOptions_VerificationState = {}));
var FieldDescriptorProto_Type;
(function(FieldDescriptorProto_Type2) {
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["DOUBLE"] = 1] = "DOUBLE";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FLOAT"] = 2] = "FLOAT";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["INT64"] = 3] = "INT64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["UINT64"] = 4] = "UINT64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["INT32"] = 5] = "INT32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FIXED64"] = 6] = "FIXED64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FIXED32"] = 7] = "FIXED32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["BOOL"] = 8] = "BOOL";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["STRING"] = 9] = "STRING";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["GROUP"] = 10] = "GROUP";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["MESSAGE"] = 11] = "MESSAGE";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["BYTES"] = 12] = "BYTES";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["UINT32"] = 13] = "UINT32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["ENUM"] = 14] = "ENUM";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SFIXED32"] = 15] = "SFIXED32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SFIXED64"] = 16] = "SFIXED64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SINT32"] = 17] = "SINT32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SINT64"] = 18] = "SINT64";
})(FieldDescriptorProto_Type || (FieldDescriptorProto_Type = {}));
var FieldDescriptorProto_Label;
(function(FieldDescriptorProto_Label2) {
  FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["OPTIONAL"] = 1] = "OPTIONAL";
  FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["REPEATED"] = 3] = "REPEATED";
  FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["REQUIRED"] = 2] = "REQUIRED";
})(FieldDescriptorProto_Label || (FieldDescriptorProto_Label = {}));
var FileOptions_OptimizeMode;
(function(FileOptions_OptimizeMode2) {
  FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["SPEED"] = 1] = "SPEED";
  FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["CODE_SIZE"] = 2] = "CODE_SIZE";
  FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["LITE_RUNTIME"] = 3] = "LITE_RUNTIME";
})(FileOptions_OptimizeMode || (FileOptions_OptimizeMode = {}));
var FieldOptions_CType;
(function(FieldOptions_CType2) {
  FieldOptions_CType2[FieldOptions_CType2["STRING"] = 0] = "STRING";
  FieldOptions_CType2[FieldOptions_CType2["CORD"] = 1] = "CORD";
  FieldOptions_CType2[FieldOptions_CType2["STRING_PIECE"] = 2] = "STRING_PIECE";
})(FieldOptions_CType || (FieldOptions_CType = {}));
var FieldOptions_JSType;
(function(FieldOptions_JSType2) {
  FieldOptions_JSType2[FieldOptions_JSType2["JS_NORMAL"] = 0] = "JS_NORMAL";
  FieldOptions_JSType2[FieldOptions_JSType2["JS_STRING"] = 1] = "JS_STRING";
  FieldOptions_JSType2[FieldOptions_JSType2["JS_NUMBER"] = 2] = "JS_NUMBER";
})(FieldOptions_JSType || (FieldOptions_JSType = {}));
var FieldOptions_OptionRetention;
(function(FieldOptions_OptionRetention2) {
  FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_UNKNOWN"] = 0] = "RETENTION_UNKNOWN";
  FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_RUNTIME"] = 1] = "RETENTION_RUNTIME";
  FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_SOURCE"] = 2] = "RETENTION_SOURCE";
})(FieldOptions_OptionRetention || (FieldOptions_OptionRetention = {}));
var FieldOptions_OptionTargetType;
(function(FieldOptions_OptionTargetType2) {
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_UNKNOWN"] = 0] = "TARGET_TYPE_UNKNOWN";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_FILE"] = 1] = "TARGET_TYPE_FILE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_EXTENSION_RANGE"] = 2] = "TARGET_TYPE_EXTENSION_RANGE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_MESSAGE"] = 3] = "TARGET_TYPE_MESSAGE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_FIELD"] = 4] = "TARGET_TYPE_FIELD";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ONEOF"] = 5] = "TARGET_TYPE_ONEOF";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ENUM"] = 6] = "TARGET_TYPE_ENUM";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ENUM_ENTRY"] = 7] = "TARGET_TYPE_ENUM_ENTRY";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_SERVICE"] = 8] = "TARGET_TYPE_SERVICE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_METHOD"] = 9] = "TARGET_TYPE_METHOD";
})(FieldOptions_OptionTargetType || (FieldOptions_OptionTargetType = {}));
var MethodOptions_IdempotencyLevel;
(function(MethodOptions_IdempotencyLevel2) {
  MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["IDEMPOTENCY_UNKNOWN"] = 0] = "IDEMPOTENCY_UNKNOWN";
  MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["NO_SIDE_EFFECTS"] = 1] = "NO_SIDE_EFFECTS";
  MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["IDEMPOTENT"] = 2] = "IDEMPOTENT";
})(MethodOptions_IdempotencyLevel || (MethodOptions_IdempotencyLevel = {}));
var FeatureSet_VisibilityFeature_DefaultSymbolVisibility;
(function(FeatureSet_VisibilityFeature_DefaultSymbolVisibility2) {
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["DEFAULT_SYMBOL_VISIBILITY_UNKNOWN"] = 0] = "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["EXPORT_ALL"] = 1] = "EXPORT_ALL";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["EXPORT_TOP_LEVEL"] = 2] = "EXPORT_TOP_LEVEL";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["LOCAL_ALL"] = 3] = "LOCAL_ALL";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["STRICT"] = 4] = "STRICT";
})(FeatureSet_VisibilityFeature_DefaultSymbolVisibility || (FeatureSet_VisibilityFeature_DefaultSymbolVisibility = {}));
var FeatureSet_FieldPresence;
(function(FeatureSet_FieldPresence2) {
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["FIELD_PRESENCE_UNKNOWN"] = 0] = "FIELD_PRESENCE_UNKNOWN";
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["EXPLICIT"] = 1] = "EXPLICIT";
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["IMPLICIT"] = 2] = "IMPLICIT";
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["LEGACY_REQUIRED"] = 3] = "LEGACY_REQUIRED";
})(FeatureSet_FieldPresence || (FeatureSet_FieldPresence = {}));
var FeatureSet_EnumType;
(function(FeatureSet_EnumType2) {
  FeatureSet_EnumType2[FeatureSet_EnumType2["ENUM_TYPE_UNKNOWN"] = 0] = "ENUM_TYPE_UNKNOWN";
  FeatureSet_EnumType2[FeatureSet_EnumType2["OPEN"] = 1] = "OPEN";
  FeatureSet_EnumType2[FeatureSet_EnumType2["CLOSED"] = 2] = "CLOSED";
})(FeatureSet_EnumType || (FeatureSet_EnumType = {}));
var FeatureSet_RepeatedFieldEncoding;
(function(FeatureSet_RepeatedFieldEncoding2) {
  FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["REPEATED_FIELD_ENCODING_UNKNOWN"] = 0] = "REPEATED_FIELD_ENCODING_UNKNOWN";
  FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["PACKED"] = 1] = "PACKED";
  FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["EXPANDED"] = 2] = "EXPANDED";
})(FeatureSet_RepeatedFieldEncoding || (FeatureSet_RepeatedFieldEncoding = {}));
var FeatureSet_Utf8Validation;
(function(FeatureSet_Utf8Validation2) {
  FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["UTF8_VALIDATION_UNKNOWN"] = 0] = "UTF8_VALIDATION_UNKNOWN";
  FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["VERIFY"] = 2] = "VERIFY";
  FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["NONE"] = 3] = "NONE";
})(FeatureSet_Utf8Validation || (FeatureSet_Utf8Validation = {}));
var FeatureSet_MessageEncoding;
(function(FeatureSet_MessageEncoding2) {
  FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["MESSAGE_ENCODING_UNKNOWN"] = 0] = "MESSAGE_ENCODING_UNKNOWN";
  FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["LENGTH_PREFIXED"] = 1] = "LENGTH_PREFIXED";
  FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["DELIMITED"] = 2] = "DELIMITED";
})(FeatureSet_MessageEncoding || (FeatureSet_MessageEncoding = {}));
var FeatureSet_JsonFormat;
(function(FeatureSet_JsonFormat2) {
  FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["JSON_FORMAT_UNKNOWN"] = 0] = "JSON_FORMAT_UNKNOWN";
  FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["ALLOW"] = 1] = "ALLOW";
  FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["LEGACY_BEST_EFFORT"] = 2] = "LEGACY_BEST_EFFORT";
})(FeatureSet_JsonFormat || (FeatureSet_JsonFormat = {}));
var FeatureSet_EnforceNamingStyle;
(function(FeatureSet_EnforceNamingStyle2) {
  FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["ENFORCE_NAMING_STYLE_UNKNOWN"] = 0] = "ENFORCE_NAMING_STYLE_UNKNOWN";
  FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["STYLE2024"] = 1] = "STYLE2024";
  FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["STYLE_LEGACY"] = 2] = "STYLE_LEGACY";
})(FeatureSet_EnforceNamingStyle || (FeatureSet_EnforceNamingStyle = {}));
var GeneratedCodeInfo_Annotation_Semantic;
(function(GeneratedCodeInfo_Annotation_Semantic2) {
  GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["NONE"] = 0] = "NONE";
  GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["SET"] = 1] = "SET";
  GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["ALIAS"] = 2] = "ALIAS";
})(GeneratedCodeInfo_Annotation_Semantic || (GeneratedCodeInfo_Annotation_Semantic = {}));
var Edition;
(function(Edition2) {
  Edition2[Edition2["EDITION_UNKNOWN"] = 0] = "EDITION_UNKNOWN";
  Edition2[Edition2["EDITION_LEGACY"] = 900] = "EDITION_LEGACY";
  Edition2[Edition2["EDITION_PROTO2"] = 998] = "EDITION_PROTO2";
  Edition2[Edition2["EDITION_PROTO3"] = 999] = "EDITION_PROTO3";
  Edition2[Edition2["EDITION_2023"] = 1e3] = "EDITION_2023";
  Edition2[Edition2["EDITION_2024"] = 1001] = "EDITION_2024";
  Edition2[Edition2["EDITION_UNSTABLE"] = 9999] = "EDITION_UNSTABLE";
  Edition2[Edition2["EDITION_1_TEST_ONLY"] = 1] = "EDITION_1_TEST_ONLY";
  Edition2[Edition2["EDITION_2_TEST_ONLY"] = 2] = "EDITION_2_TEST_ONLY";
  Edition2[Edition2["EDITION_99997_TEST_ONLY"] = 99997] = "EDITION_99997_TEST_ONLY";
  Edition2[Edition2["EDITION_99998_TEST_ONLY"] = 99998] = "EDITION_99998_TEST_ONLY";
  Edition2[Edition2["EDITION_99999_TEST_ONLY"] = 99999] = "EDITION_99999_TEST_ONLY";
  Edition2[Edition2["EDITION_MAX"] = 2147483647] = "EDITION_MAX";
})(Edition || (Edition = {}));
var SymbolVisibility;
(function(SymbolVisibility2) {
  SymbolVisibility2[SymbolVisibility2["VISIBILITY_UNSET"] = 0] = "VISIBILITY_UNSET";
  SymbolVisibility2[SymbolVisibility2["VISIBILITY_LOCAL"] = 1] = "VISIBILITY_LOCAL";
  SymbolVisibility2[SymbolVisibility2["VISIBILITY_EXPORT"] = 2] = "VISIBILITY_EXPORT";
})(SymbolVisibility || (SymbolVisibility = {}));

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/from-binary.js
function makeReadContext(options) {
  return Object.assign(Object.assign({ readUnknownFields: true, recursionLimit: 100 }, options), { depth: 0 });
}
function fromBinary(schema, bytes, options) {
  const message = create(schema);
  compiledReader(schema).read(message, new BinaryReader(bytes), makeReadContext(options), bytes.byteLength);
  return message;
}
var compiledReaders = /* @__PURE__ */ new WeakMap();
function compiledReader(desc) {
  let compiled = compiledReaders.get(desc);
  if (compiled === void 0) {
    compiled = compileMessage2(desc);
  }
  return compiled;
}
function compileMessage2(desc) {
  const descString = String(desc);
  const fieldReaders = /* @__PURE__ */ new Map();
  const compiled = {
    read: compileMessageReader(descString, fieldReaders),
    readGroup: compileGroupReader(descString, fieldReaders)
  };
  compiledReaders.set(desc, compiled);
  for (const field of desc.fields) {
    fieldReaders.set(field.number, compileFieldReader(field));
  }
  return compiled;
}
function compileMessageReader(descString, fieldReaders) {
  return (message, reader, ctx, length) => {
    var _a;
    if (++ctx.depth > ctx.recursionLimit) {
      throw new Error(`cannot decode ${descString} from binary: maximum recursion depth of ${ctx.recursionLimit} reached`);
    }
    const end = reader.pos + length;
    const unknownFields = (_a = message.$unknown) !== null && _a !== void 0 ? _a : [];
    while (reader.pos < end) {
      const [fieldNo, wireType] = reader.tag();
      const fieldReader = fieldReaders.get(fieldNo);
      if (fieldReader === void 0) {
        const data = reader.skip(wireType, fieldNo, ctx.recursionLimit - ctx.depth);
        if (ctx.readUnknownFields) {
          unknownFields.push({ no: fieldNo, wireType, data });
        }
        continue;
      }
      fieldReader(message, reader, ctx, wireType);
    }
    if (unknownFields.length > 0) {
      message.$unknown = unknownFields;
    }
    ctx.depth--;
  };
}
function compileGroupReader(descString, fieldReaders) {
  return (message, reader, ctx, fieldNo) => {
    var _a;
    if (++ctx.depth > ctx.recursionLimit) {
      throw new Error(`cannot decode ${descString} from binary: maximum recursion depth of ${ctx.recursionLimit} reached`);
    }
    let recordFieldNo;
    let wireType;
    const unknownFields = (_a = message.$unknown) !== null && _a !== void 0 ? _a : [];
    while (reader.pos < reader.len) {
      [recordFieldNo, wireType] = reader.tag();
      if (wireType == WireType.EndGroup) {
        break;
      }
      const fieldReader = fieldReaders.get(recordFieldNo);
      if (fieldReader === void 0) {
        const data = reader.skip(wireType, recordFieldNo, ctx.recursionLimit - ctx.depth);
        if (ctx.readUnknownFields) {
          unknownFields.push({ no: recordFieldNo, wireType, data });
        }
        continue;
      }
      fieldReader(message, reader, ctx, wireType);
    }
    if (wireType != WireType.EndGroup || recordFieldNo !== fieldNo) {
      throw new Error("invalid end group tag");
    }
    if (unknownFields.length > 0) {
      message.$unknown = unknownFields;
    }
    ctx.depth--;
  };
}
function readField(message, reader, field, wireType, ctx) {
  compileFieldReader(field)(message[unsafeLocal], reader, ctx, wireType);
}
function compileFieldReader(field) {
  switch (field.fieldKind) {
    case "scalar":
      return compileScalarFieldReader(field);
    case "enum":
      return compileEnumFieldReader(field);
    case "message":
      return compileMessageFieldReader(field);
    case "list":
      return compileListFieldReader(field);
    case "map":
      return compileMapFieldReader(field);
  }
}
function compileScalarFieldReader(field) {
  const readScalar = compileScalarReader(field.scalar, field.utf8Validation, field.longAsString);
  const localName = field.localName;
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (message, reader) => {
      message[oneofLocalName] = {
        case: localName,
        value: readScalar(reader)
      };
    };
  }
  return (message, reader) => {
    message[localName] = readScalar(reader);
  };
}
function compileEnumFieldReader(field) {
  var _a;
  const localName = field.localName;
  const oneofLocalName = (_a = field.oneof) === null || _a === void 0 ? void 0 : _a.localName;
  if (field.enum.open) {
    if (oneofLocalName !== void 0) {
      return (message, reader) => {
        message[oneofLocalName] = { case: localName, value: reader.int32() };
      };
    }
    return (message, reader) => {
      message[localName] = reader.int32();
    };
  }
  const values = field.enum.values;
  const fieldNo = field.number;
  return (message, reader, ctx, wireType) => {
    var _a2;
    const val = reader.int32();
    if (values.some((v) => v.number === val)) {
      if (oneofLocalName !== void 0) {
        message[oneofLocalName] = { case: localName, value: val };
      } else {
        message[localName] = val;
      }
    } else if (ctx.readUnknownFields) {
      const bytes = [];
      varint32write(val, bytes);
      const unknownFields = (_a2 = message.$unknown) !== null && _a2 !== void 0 ? _a2 : [];
      unknownFields.push({
        no: fieldNo,
        wireType,
        data: new Uint8Array(bytes)
      });
      message.$unknown = unknownFields;
    }
  };
}
function compileMessageFieldReader(field) {
  const localName = field.localName;
  const { toMessage: toMessage2, toLocal } = localMessageMapper(field);
  const readChild = compileChildReader(field);
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (message, reader, ctx) => {
      const oneof = message[oneofLocalName];
      const child = toMessage2(oneof.case === localName ? oneof.value : void 0);
      readChild(child, reader, ctx);
      message[oneofLocalName] = { case: localName, value: toLocal(child) };
    };
  }
  return (message, reader, ctx) => {
    const child = toMessage2(message[localName]);
    readChild(child, reader, ctx);
    message[localName] = toLocal(child);
  };
}
function compileChildReader(field) {
  const compiledChild = compiledReader(field.message);
  if (field.delimitedEncoding) {
    const fieldNo = field.number;
    return (child, reader, ctx) => compiledChild.readGroup(child, reader, ctx, fieldNo);
  }
  return (child, reader, ctx) => compiledChild.read(child, reader, ctx, reader.uint32());
}
function compileListFieldReader(field) {
  const localName = field.localName;
  if (field.listKind == "message") {
    const { toMessage: toMessage2, toLocal } = localMessageMapper(field);
    const readChild = compileChildReader(field);
    return (message, reader, ctx) => {
      const child = toMessage2(void 0);
      readChild(child, reader, ctx);
      message[localName].push(toLocal(child));
    };
  }
  const scalarType = field.listKind == "enum" ? ScalarType.INT32 : field.scalar;
  const longAsString = field.listKind == "scalar" ? field.longAsString : false;
  const readScalar = compileScalarReader(scalarType, field.utf8Validation, longAsString);
  const packedPossible = scalarType != ScalarType.STRING && scalarType != ScalarType.BYTES;
  return (message, reader, ctx, wireType) => {
    const items = message[localName];
    if (wireType == WireType.LengthDelimited && packedPossible) {
      const end = reader.uint32() + reader.pos;
      while (reader.pos < end) {
        items.push(readScalar(reader));
      }
    } else {
      items.push(readScalar(reader));
    }
  };
}
function compileMapFieldReader(field) {
  const localName = field.localName;
  const readKey = compileScalarReader(field.mapKey, field.utf8Validation, false);
  const keyZero = scalarZeroValue(field.mapKey, false);
  let readValue;
  let valueDefault;
  switch (field.mapKind) {
    case "scalar": {
      const scalar = field.scalar;
      const readScalar = compileScalarReader(scalar, field.utf8Validation, false);
      readValue = (reader) => readScalar(reader);
      if (scalar == ScalarType.BYTES) {
        valueDefault = () => new Uint8Array(0);
      } else {
        const zero = scalarZeroValue(scalar, false);
        valueDefault = () => zero;
      }
      break;
    }
    case "enum": {
      const zero = field.enum.values[0].number;
      readValue = (reader) => reader.int32();
      valueDefault = () => zero;
      break;
    }
    case "message": {
      const { toMessage: toMessage2, toLocal } = localMessageMapper(field);
      const readChild = compiledReader(field.message).read;
      readValue = (reader, ctx) => {
        const child = toMessage2(void 0);
        readChild(child, reader, ctx, reader.uint32());
        return toLocal(child);
      };
      valueDefault = () => toLocal(toMessage2(void 0));
      break;
    }
  }
  return (message, reader, ctx) => {
    const record = message[localName];
    let key;
    let val;
    const len = reader.uint32();
    const end = reader.pos + len;
    while (reader.pos < end) {
      const [fieldNo] = reader.tag();
      switch (fieldNo) {
        case 1:
          key = readKey(reader);
          break;
        case 2:
          val = readValue(reader, ctx);
          break;
      }
    }
    if (key === void 0) {
      key = keyZero;
    }
    if (val === void 0) {
      val = valueDefault();
    }
    record[key] = val;
  };
}
function compileScalarReader(type, utf8Validation, longAsString) {
  switch (type) {
    case ScalarType.STRING:
      return (reader) => reader.string(utf8Validation);
    case ScalarType.BOOL:
      return (reader) => reader.bool();
    case ScalarType.DOUBLE:
      return (reader) => reader.double();
    case ScalarType.FLOAT:
      return (reader) => reader.float();
    case ScalarType.INT32:
      return (reader) => reader.int32();
    case ScalarType.INT64:
      if (longAsString) {
        return (reader) => String(reader.int64());
      }
      return (reader) => reader.int64();
    case ScalarType.UINT64:
      if (longAsString) {
        return (reader) => String(reader.uint64());
      }
      return (reader) => reader.uint64();
    case ScalarType.FIXED64:
      if (longAsString) {
        return (reader) => String(reader.fixed64());
      }
      return (reader) => reader.fixed64();
    case ScalarType.BYTES:
      return (reader) => reader.bytes();
    case ScalarType.FIXED32:
      return (reader) => reader.fixed32();
    case ScalarType.SFIXED32:
      return (reader) => reader.sfixed32();
    case ScalarType.SFIXED64:
      if (longAsString) {
        return (reader) => String(reader.sfixed64());
      }
      return (reader) => reader.sfixed64();
    case ScalarType.SINT64:
      if (longAsString) {
        return (reader) => String(reader.sint64());
      }
      return (reader) => reader.sint64();
    case ScalarType.UINT32:
      return (reader) => reader.uint32();
    case ScalarType.SINT32:
      return (reader) => reader.sint32();
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/file.js
function fileDesc(b64, imports) {
  var _a;
  const root = fromBinary(FileDescriptorProtoSchema, base64Decode(b64));
  root.messageType.forEach(restoreJsonNames);
  root.dependency = (_a = imports === null || imports === void 0 ? void 0 : imports.map((f) => f.proto.name)) !== null && _a !== void 0 ? _a : [];
  const reg = createFileRegistry(root, (protoFileName) => imports === null || imports === void 0 ? void 0 : imports.find((f) => f.proto.name === protoFileName));
  return reg.getFile(root.name);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/codegenv2/service.js
function serviceDesc(file2, path4, ...paths) {
  if (paths.length > 0) {
    throw new Error();
  }
  return file2.services[path4];
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/gen/google/protobuf/timestamp_pb.js
var file_google_protobuf_timestamp = /* @__PURE__ */ fileDesc("Ch9nb29nbGUvcHJvdG9idWYvdGltZXN0YW1wLnByb3RvEg9nb29nbGUucHJvdG9idWYiKwoJVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAVChQEKE2NvbS5nb29nbGUucHJvdG9idWZCDlRpbWVzdGFtcFByb3RvUAFaMmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3RpbWVzdGFtcHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/timestamp.js
function timestampMs(timestamp) {
  return Number(timestamp.seconds) * 1e3 + Math.round(timestamp.nanos / 1e6);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/gen/google/protobuf/any_pb.js
var file_google_protobuf_any = /* @__PURE__ */ fileDesc("Chlnb29nbGUvcHJvdG9idWYvYW55LnByb3RvEg9nb29nbGUucHJvdG9idWYiJgoDQW55EhAKCHR5cGVfdXJsGAEgASgJEg0KBXZhbHVlGAIgASgMQnYKE2NvbS5nb29nbGUucHJvdG9idWZCCEFueVByb3RvUAFaLGdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2FueXBiogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
var AnySchema = /* @__PURE__ */ messageDesc(file_google_protobuf_any, 0);

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/any.js
function anyPack(schema, message, into) {
  let ret = false;
  if (!into) {
    into = create(AnySchema);
    ret = true;
  }
  into.value = toBinary(schema, message);
  into.typeUrl = typeNameToUrl(message.$typeName);
  return ret ? into : void 0;
}
function anyIs(any, descOrTypeName) {
  if (any.typeUrl === "") {
    return false;
  }
  const want = typeof descOrTypeName == "string" ? descOrTypeName : descOrTypeName.typeName;
  const got = typeUrlToName(any.typeUrl);
  return want === got;
}
function anyUnpack(any, registryOrMessageDesc) {
  if (any.typeUrl === "") {
    return void 0;
  }
  const desc = registryOrMessageDesc.kind == "message" ? registryOrMessageDesc : registryOrMessageDesc.getMessage(typeUrlToName(any.typeUrl));
  if (!desc || !anyIs(any, desc)) {
    return void 0;
  }
  return fromBinary(desc, any.value);
}
function typeNameToUrl(name) {
  return `type.googleapis.com/${name}`;
}
function typeUrlToName(url) {
  const slash = url.lastIndexOf("/");
  const name = slash >= 0 ? url.substring(slash + 1) : url;
  if (!name.length) {
    throw new Error(`invalid type url: ${url}`);
  }
  return name;
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/gen/google/protobuf/struct_pb.js
var file_google_protobuf_struct = /* @__PURE__ */ fileDesc("Chxnb29nbGUvcHJvdG9idWYvc3RydWN0LnByb3RvEg9nb29nbGUucHJvdG9idWYihAEKBlN0cnVjdBIzCgZmaWVsZHMYASADKAsyIy5nb29nbGUucHJvdG9idWYuU3RydWN0LkZpZWxkc0VudHJ5GkUKC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIlCgV2YWx1ZRgCIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZToCOAEi6gEKBVZhbHVlEjAKCm51bGxfdmFsdWUYASABKA4yGi5nb29nbGUucHJvdG9idWYuTnVsbFZhbHVlSAASFgoMbnVtYmVyX3ZhbHVlGAIgASgBSAASFgoMc3RyaW5nX3ZhbHVlGAMgASgJSAASFAoKYm9vbF92YWx1ZRgEIAEoCEgAEi8KDHN0cnVjdF92YWx1ZRgFIAEoCzIXLmdvb2dsZS5wcm90b2J1Zi5TdHJ1Y3RIABIwCgpsaXN0X3ZhbHVlGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLkxpc3RWYWx1ZUgAQgYKBGtpbmQiMwoJTGlzdFZhbHVlEiYKBnZhbHVlcxgBIAMoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZSobCglOdWxsVmFsdWUSDgoKTlVMTF9WQUxVRRAAQn8KE2NvbS5nb29nbGUucHJvdG9idWZCC1N0cnVjdFByb3RvUAFaL2dvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3N0cnVjdHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
var StructSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_struct, 0);
var ValueSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_struct, 1);
var ListValueSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_struct, 2);
var NullValue;
(function(NullValue2) {
  NullValue2[NullValue2["NULL_VALUE"] = 0] = "NULL_VALUE";
})(NullValue || (NullValue = {}));

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/gen/collab/v1/model_pb.js
var file_collab_v1_model = /* @__PURE__ */ fileDesc("ChVjb2xsYWIvdjEvbW9kZWwucHJvdG8SCWNvbGxhYi52MSJFCglSZWNpcGllbnQSDgoGaGFuZGxlGAEgASgJEg0KBXRvcGljGAIgASgJEhkKEWNsaWVudF9zZXNzaW9uX2lkGAMgASgJInAKCUFkZHJlc3NlZRIRCgltZW1iZXJfaWQYASABKAkSDgoGaGFuZGxlGAIgASgJEg0KBXRvcGljGAMgASgJEhkKEWNsaWVudF9zZXNzaW9uX2lkGAQgASgJEhYKDmluY2x1ZGVfc2VuZGVyGAUgASgIIrIECgdNZXNzYWdlEgsKA3NlcRgBIAEoDRIPCgdjaGFubmVsGAIgASgJEhYKDmZyb21fbWVtYmVyX2lkGAMgASgJEhEKCWZyb21fbmFtZRgEIAEoCRITCgtmcm9tX2hhbmRsZRgFIAEoCRISCgpmcm9tX3RvcGljGAYgASgJEiAKAnRvGAcgASgLMhQuY29sbGFiLnYxLkFkZHJlc3NlZRIkCgR0eXBlGAggASgOMhYuY29sbGFiLnYxLk1lc3NhZ2VUeXBlEgwKBHRleHQYCSABKAkSIwoHdXJnZW5jeRgKIAEoDjISLmNvbGxhYi52MS5VcmdlbmN5EgwKBHJlZnMYCyADKAkSKwoHc2VudF9hdBgMIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXASHgoWZnJvbV9jbGllbnRfc2Vzc2lvbl9pZBgNIAEoCRImCgRkb25lGBQgASgLMhYuY29sbGFiLnYxLkRvbmVQYXlsb2FkSAASKAoFY2xhaW0YFSABKAsyFy5jb2xsYWIudjEuQ2xhaW1QYXlsb2FkSAASLAoHcmVsZWFzZRgWIAEoCzIZLmNvbGxhYi52MS5SZWxlYXNlUGF5bG9hZEgAEiwKB2NvbnRleHQYFyABKAsyGS5jb2xsYWIudjEuQ29udGV4dFBheWxvYWRIABImCgR0YXNrGBggASgLMhYuY29sbGFiLnYxLlRhc2tQYXlsb2FkSABCCQoHcGF5bG9hZCIuCgtEb25lUGF5bG9hZBIMCgR0YXNrGAEgASgJEhEKCWF1dG9tYXRpYxgCIAEoCCJQCgxDbGFpbVBheWxvYWQSEAoIY2xhaW1faWQYASABKAkSLgoKZXhwaXJlc19hdBgCIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXAiIgoOUmVsZWFzZVBheWxvYWQSEAoIY2xhaW1faWQYASABKAkiLgoOQ29udGV4dFBheWxvYWQSCwoDa2V5GAEgASgJEg8KB3ZlcnNpb24YAiABKA0ihAEKC1Rhc2tQYXlsb2FkEiEKBGxpc3QYASABKAsyEy5jb2xsYWIudjEuVGFza0xpc3QSDwoHbnVtYmVycxgCIAMoDRIjCgVldmVudBgDIAEoDjIULmNvbGxhYi52MS5UYXNrRXZlbnQSHAoUcHJldmlvdXNfaG9sZGVyX25hbWUYBCABKAkiiwIKBk1lbWJlchIRCgltZW1iZXJfaWQYASABKAkSFAoMZGlzcGxheV9uYW1lGAIgASgJEg4KBmhhbmRsZRgDIAEoCRInCgZzdGF0dXMYBCABKA4yFy5jb2xsYWIudjEuTWVtYmVyU3RhdHVzEgwKBHJlcG8YBSABKAkSDgoGYnJhbmNoGAYgASgJEhMKC2Nvbm5lY3Rpb25zGAcgASgNEg4KBnRvcGljcxgIIAMoCRIwCgxsYXN0X3NlZW5fYXQYCSABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEioKCHNlc3Npb25zGAogAygLMhguY29sbGFiLnYxLk1lbWJlclNlc3Npb24iiQEKDU1lbWJlclNlc3Npb24SGQoRY2xpZW50X3Nlc3Npb25faWQYASABKAkSDQoFdG9waWMYAiABKAkSDAoEcmVwbxgDIAEoCRIOCgZicmFuY2gYBCABKAkSMAoMY29ubmVjdGVkX2F0GAUgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCLSAQoFQ2xhaW0SEAoIY2xhaW1faWQYASABKAkSFwoPb3duZXJfbWVtYmVyX2lkGAIgASgJEhIKCm93bmVyX25hbWUYAyABKAkSDQoFdG9waWMYBCABKAkSDQoFcGF0aHMYBSADKAkSDAoEbm90ZRgGIAEoCRIuCgpjcmVhdGVkX2F0GAcgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcBIuCgpleHBpcmVzX2F0GAggASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCK5AQoMQ29udGV4dEVudHJ5EgsKA2tleRgBIAEoCRIPCgd2ZXJzaW9uGAIgASgNEg0KBXRpdGxlGAMgASgJEg8KB3N1bW1hcnkYBCABKAkSDAoEYm9keRgFIAEoCRIYChBhdXRob3JfbWVtYmVyX2lkGAYgASgJEhMKC2F1dGhvcl9uYW1lGAcgASgJEi4KCmNyZWF0ZWRfYXQYCCABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wIpMBCg5Db250ZXh0U3VtbWFyeRILCgNrZXkYASABKAkSDwoHdmVyc2lvbhgCIAEoDRINCgV0aXRsZRgDIAEoCRIPCgdzdW1tYXJ5GAQgASgJEhMKC2F1dGhvcl9uYW1lGAUgASgJEi4KCmNyZWF0ZWRfYXQYBiABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wIpACCghUYXNrTGlzdBILCgNrZXkYASABKAkSDQoFdG9waWMYAiABKAkSDQoFdGl0bGUYAyABKAkSHAoUY3JlYXRlZF9ieV9tZW1iZXJfaWQYBCABKAkSFwoPY3JlYXRlZF9ieV9uYW1lGAUgASgJEi4KCmNyZWF0ZWRfYXQYBiABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEi4KCnVwZGF0ZWRfYXQYByABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEgwKBG9wZW4YCCABKA0SEwoLaW5fcHJvZ3Jlc3MYCSABKA0SDAoEZG9uZRgKIAEoDRIRCglkaXNtaXNzZWQYCyABKA0igwEKClRhc2tIb2xkZXISEQoJbWVtYmVyX2lkGAEgASgJEg4KBmhhbmRsZRgCIAEoCRIMCgRuYW1lGAMgASgJEhkKEWNsaWVudF9zZXNzaW9uX2lkGAQgASgJEikKBXNpbmNlGAUgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCJ3CghUYXNrTm90ZRIMCgR0ZXh0GAEgASgJEhQKB3BlcmNlbnQYAiABKA1IAIgBARITCgthdXRob3JfbmFtZRgDIAEoCRImCgJhdBgEIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXBCCgoIX3BlcmNlbnQi8QMKBFRhc2sSDAoEbGlzdBgBIAEoCRINCgV0b3BpYxgCIAEoCRIOCgZudW1iZXIYAyABKA0SDQoFdGl0bGUYBCABKAkSDAoEcmVmcxgFIAMoCRIlCgZzdGF0dXMYBiABKA4yFS5jb2xsYWIudjEuVGFza1N0YXR1cxIcChRjcmVhdGVkX2J5X21lbWJlcl9pZBgHIAEoCRIXCg9jcmVhdGVkX2J5X25hbWUYCCABKAkSLgoKY3JlYXRlZF9hdBgJIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXASJQoGaG9sZGVyGAogASgLMhUuY29sbGFiLnYxLlRhc2tIb2xkZXISKgoNbGFzdF9wcm9ncmVzcxgLIAEoCzITLmNvbGxhYi52MS5UYXNrTm90ZRIWCg5wcm9ncmVzc19jb3VudBgMIAEoDRIbChNjbG9zZWRfYnlfbWVtYmVyX2lkGA0gASgJEhYKDmNsb3NlZF9ieV9uYW1lGA4gASgJEi0KCWNsb3NlZF9hdBgPIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXASEgoKcmVzb2x1dGlvbhgQIAEoCRIuCgp1cGRhdGVkX2F0GBEgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCLBAgoMQ2hhbm5lbFN0YXRlEg8KB2NoYW5uZWwYASABKAkSFgoOc2VsZl9tZW1iZXJfaWQYAiABKAkSDgoGaGFuZGxlGAMgASgJEg0KBXRvcGljGAQgASgJEiIKB21lbWJlcnMYBSADKAsyES5jb2xsYWIudjEuTWVtYmVyEiAKBmNsYWltcxgGIAMoCzIQLmNvbGxhYi52MS5DbGFpbRIwCg1jb250ZXh0X2luZGV4GAcgAygLMhkuY29sbGFiLnYxLkNvbnRleHRTdW1tYXJ5EiQKCG1lc3NhZ2VzGAggAygLMhIuY29sbGFiLnYxLk1lc3NhZ2USDgoGY3Vyc29yGAkgASgNEhIKCmxhdGVzdF9zZXEYCiABKA0SJwoKdGFza19saXN0cxgLIAMoCzITLmNvbGxhYi52MS5UYXNrTGlzdCIvCg9Qcm90b2NvbFZlcnNpb24SDQoFbWFqb3IYASABKA0SDQoFbWlub3IYAiABKA0ibwoKQ2xpZW50SW5mbxIMCgRuYW1lGAEgASgJEg8KB3ZlcnNpb24YAiABKAkSLAoIcHJvdG9jb2wYAyABKAsyGi5jb2xsYWIudjEuUHJvdG9jb2xWZXJzaW9uEhQKDGNhcGFiaWxpdGllcxgEIAMoCSpZCgdVcmdlbmN5EhcKE1VSR0VOQ1lfVU5TUEVDSUZJRUQQABIPCgtVUkdFTkNZX0xPVxABEhIKDlVSR0VOQ1lfTk9STUFMEAISEAoMVVJHRU5DWV9ISUdIEAMq1wEKC01lc3NhZ2VUeXBlEhwKGE1FU1NBR0VfVFlQRV9VTlNQRUNJRklFRBAAEhUKEU1FU1NBR0VfVFlQRV9OT1RFEAESGQoVTUVTU0FHRV9UWVBFX1FVRVNUSU9OEAISFQoRTUVTU0FHRV9UWVBFX0RPTkUQAxIWChJNRVNTQUdFX1RZUEVfQ0xBSU0QBBIYChRNRVNTQUdFX1RZUEVfUkVMRUFTRRAFEhgKFE1FU1NBR0VfVFlQRV9DT05URVhUEAYSFQoRTUVTU0FHRV9UWVBFX1RBU0sQByp6CgxNZW1iZXJTdGF0dXMSHQoZTUVNQkVSX1NUQVRVU19VTlNQRUNJRklFRBAAEhgKFE1FTUJFUl9TVEFUVVNfT05MSU5FEAESFgoSTUVNQkVSX1NUQVRVU19JRExFEAISGQoVTUVNQkVSX1NUQVRVU19PRkZMSU5FEAMqjQEKClRhc2tTdGF0dXMSGwoXVEFTS19TVEFUVVNfVU5TUEVDSUZJRUQQABIUChBUQVNLX1NUQVRVU19PUEVOEAESGwoXVEFTS19TVEFUVVNfSU5fUFJPR1JFU1MQAhIUChBUQVNLX1NUQVRVU19ET05FEAMSGQoVVEFTS19TVEFUVVNfRElTTUlTU0VEEAQqugEKCVRhc2tFdmVudBIaChZUQVNLX0VWRU5UX1VOU1BFQ0lGSUVEEAASFAoQVEFTS19FVkVOVF9BRERFRBABEhoKFlRBU0tfRVZFTlRfQ0hFQ0tFRF9PVVQQAhIXChNUQVNLX0VWRU5UX1BST0dSRVNTEAMSFwoTVEFTS19FVkVOVF9SRUxFQVNFRBAEEhMKD1RBU0tfRVZFTlRfRE9ORRAFEhgKFFRBU0tfRVZFTlRfRElTTUlTU0VEEAZiBnByb3RvMw", [file_google_protobuf_timestamp]);
var DonePayloadSchema = /* @__PURE__ */ messageDesc(file_collab_v1_model, 3);
var ProtocolVersionSchema = /* @__PURE__ */ messageDesc(file_collab_v1_model, 18);
var Urgency;
(function(Urgency2) {
  Urgency2[Urgency2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  Urgency2[Urgency2["LOW"] = 1] = "LOW";
  Urgency2[Urgency2["NORMAL"] = 2] = "NORMAL";
  Urgency2[Urgency2["HIGH"] = 3] = "HIGH";
})(Urgency || (Urgency = {}));
var MessageType;
(function(MessageType2) {
  MessageType2[MessageType2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  MessageType2[MessageType2["NOTE"] = 1] = "NOTE";
  MessageType2[MessageType2["QUESTION"] = 2] = "QUESTION";
  MessageType2[MessageType2["DONE"] = 3] = "DONE";
  MessageType2[MessageType2["CLAIM"] = 4] = "CLAIM";
  MessageType2[MessageType2["RELEASE"] = 5] = "RELEASE";
  MessageType2[MessageType2["CONTEXT"] = 6] = "CONTEXT";
  MessageType2[MessageType2["TASK"] = 7] = "TASK";
})(MessageType || (MessageType = {}));
var MemberStatus;
(function(MemberStatus2) {
  MemberStatus2[MemberStatus2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  MemberStatus2[MemberStatus2["ONLINE"] = 1] = "ONLINE";
  MemberStatus2[MemberStatus2["IDLE"] = 2] = "IDLE";
  MemberStatus2[MemberStatus2["OFFLINE"] = 3] = "OFFLINE";
})(MemberStatus || (MemberStatus = {}));
var TaskStatus;
(function(TaskStatus2) {
  TaskStatus2[TaskStatus2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  TaskStatus2[TaskStatus2["OPEN"] = 1] = "OPEN";
  TaskStatus2[TaskStatus2["IN_PROGRESS"] = 2] = "IN_PROGRESS";
  TaskStatus2[TaskStatus2["DONE"] = 3] = "DONE";
  TaskStatus2[TaskStatus2["DISMISSED"] = 4] = "DISMISSED";
})(TaskStatus || (TaskStatus = {}));
var TaskEvent;
(function(TaskEvent2) {
  TaskEvent2[TaskEvent2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  TaskEvent2[TaskEvent2["ADDED"] = 1] = "ADDED";
  TaskEvent2[TaskEvent2["CHECKED_OUT"] = 2] = "CHECKED_OUT";
  TaskEvent2[TaskEvent2["PROGRESS"] = 3] = "PROGRESS";
  TaskEvent2[TaskEvent2["RELEASED"] = 4] = "RELEASED";
  TaskEvent2[TaskEvent2["DONE"] = 5] = "DONE";
  TaskEvent2[TaskEvent2["DISMISSED"] = 6] = "DISMISSED";
})(TaskEvent || (TaskEvent = {}));

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/gen/collab/v1/errors_pb.js
var file_collab_v1_errors = /* @__PURE__ */ fileDesc("ChZjb2xsYWIvdjEvZXJyb3JzLnByb3RvEgljb2xsYWIudjEiVgoLRXJyb3JEZXRhaWwSIgoEY29kZRgBIAEoDjIULmNvbGxhYi52MS5FcnJvckNvZGUSDwoHbWVzc2FnZRgCIAEoCRISCgpyZXF1ZXN0X2lkGAMgASgJKtMGCglFcnJvckNvZGUSGgoWRVJST1JfQ09ERV9VTlNQRUNJRklFRBAAEhcKE0VSUk9SX0NPREVfSU5URVJOQUwQARIaChZFUlJPUl9DT0RFX0JBRF9SRVFVRVNUEAISGAoURVJST1JfQ09ERV9OT1RfRk9VTkQQAxIeChpFUlJPUl9DT0RFX1VOQVVUSEVOVElDQVRFRBAEEhYKEkVSUk9SX0NPREVfUkVWT0tFRBAFEiMKH0VSUk9SX0NPREVfVU5TVVBQT1JURURfUFJPVE9DT0wQBhIhCh1FUlJPUl9DT0RFX1VOS05PV05fQ09OTkVDVElPThAHEh0KGUVSUk9SX0NPREVfSU5WQUxJRF9JTlZJVEUQCBIbChdFUlJPUl9DT0RFX0lOVkFMSURfTkFNRRAJEhkKFUVSUk9SX0NPREVfTkFNRV9UQUtFThAKEh4KGkVSUk9SX0NPREVfSU5WQUxJRF9DSEFOTkVMEAsSHAoYRVJST1JfQ09ERV9JTlZBTElEX1RPUElDEAwSJQohRVJST1JfQ09ERV9JTlZBTElEX0NMSUVOVF9TRVNTSU9OEA0SHQoZRVJST1JfQ09ERV9JTlZBTElEX01FTUJFUhAOEhsKF0VSUk9SX0NPREVfTk9fUkVDSVBJRU5UEA8SHQoZRVJST1JfQ09ERV9VTktOT1dOX0hBTkRMRRAQEhwKGEVSUk9SX0NPREVfRU1QVFlfTUVTU0FHRRAREh8KG0VSUk9SX0NPREVfTUVTU0FHRV9UT09fTE9ORxASEhsKF0VSUk9SX0NPREVfSU5WQUxJRF9UWVBFEBMSFwoTRVJST1JfQ09ERV9OT19QQVRIUxAUEh0KGUVSUk9SX0NPREVfVE9PX01BTllfUEFUSFMQFRIaChZFUlJPUl9DT0RFX0lOVkFMSURfS0VZEBYSIAocRVJST1JfQ09ERV9DT05URVhUX1RPT19MQVJHRRAXEhsKF0VSUk9SX0NPREVfSU5WQUxJRF9UQVNLEBgSGQoVRVJST1JfQ09ERV9UQVNLX1RBS0VOEBkSGgoWRVJST1JfQ09ERV9UQVNLX0NMT1NFRBAaEh4KGkVSUk9SX0NPREVfTk9UX1RBU0tfSE9MREVSEBtiBnByb3RvMw");
var ErrorDetailSchema = /* @__PURE__ */ messageDesc(file_collab_v1_errors, 0);
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  ErrorCode2[ErrorCode2["INTERNAL"] = 1] = "INTERNAL";
  ErrorCode2[ErrorCode2["BAD_REQUEST"] = 2] = "BAD_REQUEST";
  ErrorCode2[ErrorCode2["NOT_FOUND"] = 3] = "NOT_FOUND";
  ErrorCode2[ErrorCode2["UNAUTHENTICATED"] = 4] = "UNAUTHENTICATED";
  ErrorCode2[ErrorCode2["REVOKED"] = 5] = "REVOKED";
  ErrorCode2[ErrorCode2["UNSUPPORTED_PROTOCOL"] = 6] = "UNSUPPORTED_PROTOCOL";
  ErrorCode2[ErrorCode2["UNKNOWN_CONNECTION"] = 7] = "UNKNOWN_CONNECTION";
  ErrorCode2[ErrorCode2["INVALID_INVITE"] = 8] = "INVALID_INVITE";
  ErrorCode2[ErrorCode2["INVALID_NAME"] = 9] = "INVALID_NAME";
  ErrorCode2[ErrorCode2["NAME_TAKEN"] = 10] = "NAME_TAKEN";
  ErrorCode2[ErrorCode2["INVALID_CHANNEL"] = 11] = "INVALID_CHANNEL";
  ErrorCode2[ErrorCode2["INVALID_TOPIC"] = 12] = "INVALID_TOPIC";
  ErrorCode2[ErrorCode2["INVALID_CLIENT_SESSION"] = 13] = "INVALID_CLIENT_SESSION";
  ErrorCode2[ErrorCode2["INVALID_MEMBER"] = 14] = "INVALID_MEMBER";
  ErrorCode2[ErrorCode2["NO_RECIPIENT"] = 15] = "NO_RECIPIENT";
  ErrorCode2[ErrorCode2["UNKNOWN_HANDLE"] = 16] = "UNKNOWN_HANDLE";
  ErrorCode2[ErrorCode2["EMPTY_MESSAGE"] = 17] = "EMPTY_MESSAGE";
  ErrorCode2[ErrorCode2["MESSAGE_TOO_LONG"] = 18] = "MESSAGE_TOO_LONG";
  ErrorCode2[ErrorCode2["INVALID_TYPE"] = 19] = "INVALID_TYPE";
  ErrorCode2[ErrorCode2["NO_PATHS"] = 20] = "NO_PATHS";
  ErrorCode2[ErrorCode2["TOO_MANY_PATHS"] = 21] = "TOO_MANY_PATHS";
  ErrorCode2[ErrorCode2["INVALID_KEY"] = 22] = "INVALID_KEY";
  ErrorCode2[ErrorCode2["CONTEXT_TOO_LARGE"] = 23] = "CONTEXT_TOO_LARGE";
  ErrorCode2[ErrorCode2["INVALID_TASK"] = 24] = "INVALID_TASK";
  ErrorCode2[ErrorCode2["TASK_TAKEN"] = 25] = "TASK_TAKEN";
  ErrorCode2[ErrorCode2["TASK_CLOSED"] = 26] = "TASK_CLOSED";
  ErrorCode2[ErrorCode2["NOT_TASK_HOLDER"] = 27] = "NOT_TASK_HOLDER";
})(ErrorCode || (ErrorCode = {}));

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/gen/collab/v1/channel_pb.js
var file_collab_v1_channel = /* @__PURE__ */ fileDesc("Chdjb2xsYWIvdjEvY2hhbm5lbC5wcm90bxIJY29sbGFiLnYxInUKEFN1YnNjcmliZVJlcXVlc3QSJQoGY2xpZW50GAEgASgLMhUuY29sbGFiLnYxLkNsaWVudEluZm8SEgoFc2luY2UYAiABKA1IAIgBARIMCgRyZXBvGAMgASgJEg4KBmJyYW5jaBgEIAEoCUIICgZfc2luY2Ui8QEKEVN1YnNjcmliZVJlc3BvbnNlEiYKBWhlbGxvGAEgASgLMhUuY29sbGFiLnYxLkhlbGxvRXZlbnRIABIlCgdtZXNzYWdlGAIgASgLMhIuY29sbGFiLnYxLk1lc3NhZ2VIABIsCghwcmVzZW5jZRgDIAEoCzIYLmNvbGxhYi52MS5QcmVzZW5jZUV2ZW50SAASKAoGY2xhaW1zGAQgASgLMhYuY29sbGFiLnYxLkNsYWltc0V2ZW50SAASLAoHY29udGV4dBgFIAEoCzIZLmNvbGxhYi52MS5Db250ZXh0U3VtbWFyeUgAQgcKBWV2ZW50IpABCgpIZWxsb0V2ZW50EiYKBXN0YXRlGAEgASgLMhcuY29sbGFiLnYxLkNoYW5uZWxTdGF0ZRIsCghwcm90b2NvbBgCIAEoCzIaLmNvbGxhYi52MS5Qcm90b2NvbFZlcnNpb24SFAoMY2FwYWJpbGl0aWVzGAMgAygJEhYKDnNlcnZlcl92ZXJzaW9uGAQgASgJIjMKDVByZXNlbmNlRXZlbnQSIgoHbWVtYmVycxgBIAMoCzIRLmNvbGxhYi52MS5NZW1iZXIiPgoLQ2xhaW1zRXZlbnQSDQoFdG9waWMYASABKAkSIAoGY2xhaW1zGAIgAygLMhAuY29sbGFiLnYxLkNsYWltIj4KD0dldFN0YXRlUmVxdWVzdBISCgVzaW5jZRgBIAEoDUgAiAEBEg0KBWxpbWl0GAIgASgNQggKBl9zaW5jZSI6ChBHZXRTdGF0ZVJlc3BvbnNlEiYKBXN0YXRlGAEgASgLMhcuY29sbGFiLnYxLkNoYW5uZWxTdGF0ZSK8AQoLU2VuZFJlcXVlc3QSJAoEdHlwZRgBIAEoDjIWLmNvbGxhYi52MS5NZXNzYWdlVHlwZRIMCgR0ZXh0GAIgASgJEiAKAnRvGAMgASgLMhQuY29sbGFiLnYxLlJlY2lwaWVudBIjCgd1cmdlbmN5GAQgASgOMhIuY29sbGFiLnYxLlVyZ2VuY3kSDAoEcmVmcxgFIAMoCRIkCgRkb25lGAYgASgLMhYuY29sbGFiLnYxLkRvbmVQYXlsb2FkIkkKDFNlbmRSZXNwb25zZRILCgNzZXEYASABKA0SEQoJZGVsaXZlcmVkGAIgASgNEhkKEWRlbGl2ZXJlZF9vZmZsaW5lGAMgASgIIhwKCkFja1JlcXVlc3QSDgoGY3Vyc29yGAEgASgNIg0KC0Fja1Jlc3BvbnNlIkAKDENsYWltUmVxdWVzdBINCgVwYXRocxgBIAMoCRIMCgRub3RlGAIgASgJEhMKC3R0bF9zZWNvbmRzGAMgASgNIjAKDUNsYWltUmVzcG9uc2USHwoFY2xhaW0YASABKAsyEC5jb2xsYWIudjEuQ2xhaW0iIgoOUmVsZWFzZVJlcXVlc3QSEAoIY2xhaW1faWQYASABKAkiIwoPUmVsZWFzZVJlc3BvbnNlEhAKCHJlbGVhc2VkGAEgASgIIk4KEVB1dENvbnRleHRSZXF1ZXN0EgsKA2tleRgBIAEoCRINCgV0aXRsZRgCIAEoCRIPCgdzdW1tYXJ5GAMgASgJEgwKBGJvZHkYBCABKAkiPAoSUHV0Q29udGV4dFJlc3BvbnNlEiYKBWVudHJ5GAEgASgLMhcuY29sbGFiLnYxLkNvbnRleHRFbnRyeSJRChFHZXRDb250ZXh0UmVxdWVzdBILCgNrZXkYASABKAkSFAoHdmVyc2lvbhgCIAEoDUgAiAEBEg0KBXRvcGljGAMgASgJQgoKCF92ZXJzaW9uIjwKEkdldENvbnRleHRSZXNwb25zZRImCgVlbnRyeRgBIAEoCzIXLmNvbGxhYi52MS5Db250ZXh0RW50cnkiWwoSU2V0UHJlc2VuY2VSZXF1ZXN0EicKBnN0YXR1cxgBIAEoDjIXLmNvbGxhYi52MS5NZW1iZXJTdGF0dXMSDAoEcmVwbxgCIAEoCRIOCgZicmFuY2gYAyABKAkiFQoTU2V0UHJlc2VuY2VSZXNwb25zZSIuCg5IaXN0b3J5UmVxdWVzdBINCgVzaW5jZRgBIAEoDRINCgVsaW1pdBgCIAEoDSI3Cg9IaXN0b3J5UmVzcG9uc2USJAoIbWVzc2FnZXMYASADKAsyEi5jb2xsYWIudjEuTWVzc2FnZSISChBIZWFydGJlYXRSZXF1ZXN0IkQKEUhlYXJ0YmVhdFJlc3BvbnNlEi8KC3NlcnZlcl90aW1lGAEgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCIzChVDcmVhdGVUYXNrTGlzdFJlcXVlc3QSCwoDa2V5GAEgASgJEg0KBXRpdGxlGAIgASgJIkwKFkNyZWF0ZVRhc2tMaXN0UmVzcG9uc2USIQoEbGlzdBgBIAEoCzITLmNvbGxhYi52MS5UYXNrTGlzdBIPCgdjcmVhdGVkGAIgASgIIiYKB05ld1Rhc2sSDQoFdGl0bGUYASABKAkSDAoEcmVmcxgCIAMoCSJCCg9BZGRUYXNrc1JlcXVlc3QSDAoEbGlzdBgBIAEoCRIhCgV0YXNrcxgCIAMoCzISLmNvbGxhYi52MS5OZXdUYXNrIlUKEEFkZFRhc2tzUmVzcG9uc2USHgoFdGFza3MYASADKAsyDy5jb2xsYWIudjEuVGFzaxIhCgRsaXN0GAIgASgLMhMuY29sbGFiLnYxLlRhc2tMaXN0IiAKDFRhc2tDaGVja291dBIQCgh0YWtlb3ZlchgBIAEoCCI+CgxUYXNrUHJvZ3Jlc3MSDAoEdGV4dBgBIAEoCRIUCgdwZXJjZW50GAIgASgNSACIAQFCCgoIX3BlcmNlbnQiGwoLVGFza1JlbGVhc2USDAoEbm90ZRgBIAEoCSIdCgpUYXNrRmluaXNoEg8KB3N1bW1hcnkYASABKAkiHQoLVGFza0Rpc21pc3MSDgoGcmVhc29uGAEgASgJIqMCChFVcGRhdGVUYXNrUmVxdWVzdBINCgV0b3BpYxgBIAEoCRIMCgRsaXN0GAIgASgJEg4KBm51bWJlchgDIAEoDRIrCghjaGVja291dBgKIAEoCzIXLmNvbGxhYi52MS5UYXNrQ2hlY2tvdXRIABIrCghwcm9ncmVzcxgLIAEoCzIXLmNvbGxhYi52MS5UYXNrUHJvZ3Jlc3NIABIpCgdyZWxlYXNlGAwgASgLMhYuY29sbGFiLnYxLlRhc2tSZWxlYXNlSAASJwoGZmluaXNoGA0gASgLMhUuY29sbGFiLnYxLlRhc2tGaW5pc2hIABIpCgdkaXNtaXNzGA4gASgLMhYuY29sbGFiLnYxLlRhc2tEaXNtaXNzSABCCAoGY2hhbmdlIlYKElVwZGF0ZVRhc2tSZXNwb25zZRIdCgR0YXNrGAEgASgLMg8uY29sbGFiLnYxLlRhc2sSIQoEbGlzdBgCIAEoCzITLmNvbGxhYi52MS5UYXNrTGlzdCJlChBMaXN0VGFza3NSZXF1ZXN0Eg0KBXRvcGljGAEgASgJEgwKBGxpc3QYAiABKAkSJQoGZmlsdGVyGAMgASgOMhUuY29sbGFiLnYxLlRhc2tGaWx0ZXISDQoFbGltaXQYBCABKA0iagoRTGlzdFRhc2tzUmVzcG9uc2USIgoFbGlzdHMYASADKAsyEy5jb2xsYWIudjEuVGFza0xpc3QSHgoFdGFza3MYAiADKAsyDy5jb2xsYWIudjEuVGFzaxIRCgl0cnVuY2F0ZWQYAyABKAgqbAoKVGFza0ZpbHRlchIbChdUQVNLX0ZJTFRFUl9VTlNQRUNJRklFRBAAEhQKEFRBU0tfRklMVEVSX09QRU4QARIWChJUQVNLX0ZJTFRFUl9DTE9TRUQQAhITCg9UQVNLX0ZJTFRFUl9BTEwQAzKpCAoOQ2hhbm5lbFNlcnZpY2USSAoJU3Vic2NyaWJlEhsuY29sbGFiLnYxLlN1YnNjcmliZVJlcXVlc3QaHC5jb2xsYWIudjEuU3Vic2NyaWJlUmVzcG9uc2UwARJDCghHZXRTdGF0ZRIaLmNvbGxhYi52MS5HZXRTdGF0ZVJlcXVlc3QaGy5jb2xsYWIudjEuR2V0U3RhdGVSZXNwb25zZRI3CgRTZW5kEhYuY29sbGFiLnYxLlNlbmRSZXF1ZXN0GhcuY29sbGFiLnYxLlNlbmRSZXNwb25zZRI0CgNBY2sSFS5jb2xsYWIudjEuQWNrUmVxdWVzdBoWLmNvbGxhYi52MS5BY2tSZXNwb25zZRI6CgVDbGFpbRIXLmNvbGxhYi52MS5DbGFpbVJlcXVlc3QaGC5jb2xsYWIudjEuQ2xhaW1SZXNwb25zZRJACgdSZWxlYXNlEhkuY29sbGFiLnYxLlJlbGVhc2VSZXF1ZXN0GhouY29sbGFiLnYxLlJlbGVhc2VSZXNwb25zZRJJCgpQdXRDb250ZXh0EhwuY29sbGFiLnYxLlB1dENvbnRleHRSZXF1ZXN0Gh0uY29sbGFiLnYxLlB1dENvbnRleHRSZXNwb25zZRJJCgpHZXRDb250ZXh0EhwuY29sbGFiLnYxLkdldENvbnRleHRSZXF1ZXN0Gh0uY29sbGFiLnYxLkdldENvbnRleHRSZXNwb25zZRJMCgtTZXRQcmVzZW5jZRIdLmNvbGxhYi52MS5TZXRQcmVzZW5jZVJlcXVlc3QaHi5jb2xsYWIudjEuU2V0UHJlc2VuY2VSZXNwb25zZRJACgdIaXN0b3J5EhkuY29sbGFiLnYxLkhpc3RvcnlSZXF1ZXN0GhouY29sbGFiLnYxLkhpc3RvcnlSZXNwb25zZRJGCglIZWFydGJlYXQSGy5jb2xsYWIudjEuSGVhcnRiZWF0UmVxdWVzdBocLmNvbGxhYi52MS5IZWFydGJlYXRSZXNwb25zZRJVCg5DcmVhdGVUYXNrTGlzdBIgLmNvbGxhYi52MS5DcmVhdGVUYXNrTGlzdFJlcXVlc3QaIS5jb2xsYWIudjEuQ3JlYXRlVGFza0xpc3RSZXNwb25zZRJDCghBZGRUYXNrcxIaLmNvbGxhYi52MS5BZGRUYXNrc1JlcXVlc3QaGy5jb2xsYWIudjEuQWRkVGFza3NSZXNwb25zZRJJCgpVcGRhdGVUYXNrEhwuY29sbGFiLnYxLlVwZGF0ZVRhc2tSZXF1ZXN0Gh0uY29sbGFiLnYxLlVwZGF0ZVRhc2tSZXNwb25zZRJGCglMaXN0VGFza3MSGy5jb2xsYWIudjEuTGlzdFRhc2tzUmVxdWVzdBocLmNvbGxhYi52MS5MaXN0VGFza3NSZXNwb25zZWIGcHJvdG8z", [file_collab_v1_model, file_google_protobuf_timestamp]);
var SendRequestSchema = /* @__PURE__ */ messageDesc(file_collab_v1_channel, 7);
var TaskFilter;
(function(TaskFilter2) {
  TaskFilter2[TaskFilter2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  TaskFilter2[TaskFilter2["OPEN"] = 1] = "OPEN";
  TaskFilter2[TaskFilter2["CLOSED"] = 2] = "CLOSED";
  TaskFilter2[TaskFilter2["ALL"] = 3] = "ALL";
})(TaskFilter || (TaskFilter = {}));
var ChannelService = /* @__PURE__ */ serviceDesc(file_collab_v1_channel, 0);

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/gen/collab/v1/membership_pb.js
var file_collab_v1_membership = /* @__PURE__ */ fileDesc("Chpjb2xsYWIvdjEvbWVtYmVyc2hpcC5wcm90bxIJY29sbGFiLnYxIjMKC0pvaW5SZXF1ZXN0Eg4KBmludml0ZRgBIAEoCRIUCgxkaXNwbGF5X25hbWUYAiABKAkifQoMSm9pblJlc3BvbnNlEhEKCW1lbWJlcl9pZBgBIAEoCRIOCgZzZWNyZXQYAiABKAkSDwoHY2hhbm5lbBgDIAEoCRIUCgxkaXNwbGF5X25hbWUYBCABKAkSDgoGaGFuZGxlGAUgASgJEhMKC3dzX2VuZHBvaW50GAYgASgJMkwKEU1lbWJlcnNoaXBTZXJ2aWNlEjcKBEpvaW4SFi5jb2xsYWIudjEuSm9pblJlcXVlc3QaFy5jb2xsYWIudjEuSm9pblJlc3BvbnNlYgZwcm90bzM");
var MembershipService = /* @__PURE__ */ serviceDesc(file_collab_v1_membership, 0);

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/gen/collab/v1/websocket_pb.js
var file_collab_v1_websocket = /* @__PURE__ */ fileDesc("Chljb2xsYWIvdjEvd2Vic29ja2V0LnByb3RvEgljb2xsYWIudjEiFAoSSXNzdWVUaWNrZXRSZXF1ZXN0ImoKE0lzc3VlVGlja2V0UmVzcG9uc2USDgoGdGlja2V0GAEgASgJEhMKC3dzX2VuZHBvaW50GAIgASgJEi4KCmV4cGlyZXNfYXQYAyABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wIqkFCgtDbGllbnRGcmFtZRISCgpyZXF1ZXN0X2lkGAEgASgJEjAKCXN1YnNjcmliZRgKIAEoCzIbLmNvbGxhYi52MS5TdWJzY3JpYmVSZXF1ZXN0SAASJgoEc2VuZBgLIAEoCzIWLmNvbGxhYi52MS5TZW5kUmVxdWVzdEgAEiQKA2FjaxgMIAEoCzIVLmNvbGxhYi52MS5BY2tSZXF1ZXN0SAASKAoFY2xhaW0YDSABKAsyFy5jb2xsYWIudjEuQ2xhaW1SZXF1ZXN0SAASLAoHcmVsZWFzZRgOIAEoCzIZLmNvbGxhYi52MS5SZWxlYXNlUmVxdWVzdEgAEjMKC3B1dF9jb250ZXh0GA8gASgLMhwuY29sbGFiLnYxLlB1dENvbnRleHRSZXF1ZXN0SAASMwoLZ2V0X2NvbnRleHQYECABKAsyHC5jb2xsYWIudjEuR2V0Q29udGV4dFJlcXVlc3RIABI1CgxzZXRfcHJlc2VuY2UYESABKAsyHS5jb2xsYWIudjEuU2V0UHJlc2VuY2VSZXF1ZXN0SAASLAoHaGlzdG9yeRgSIAEoCzIZLmNvbGxhYi52MS5IaXN0b3J5UmVxdWVzdEgAEjAKCWhlYXJ0YmVhdBgTIAEoCzIbLmNvbGxhYi52MS5IZWFydGJlYXRSZXF1ZXN0SAASPAoQY3JlYXRlX3Rhc2tfbGlzdBgUIAEoCzIgLmNvbGxhYi52MS5DcmVhdGVUYXNrTGlzdFJlcXVlc3RIABIvCglhZGRfdGFza3MYFSABKAsyGi5jb2xsYWIudjEuQWRkVGFza3NSZXF1ZXN0SAASMwoLdXBkYXRlX3Rhc2sYFiABKAsyHC5jb2xsYWIudjEuVXBkYXRlVGFza1JlcXVlc3RIAEIJCgdyZXF1ZXN0IrkCCgtTZXJ2ZXJGcmFtZRImCgVoZWxsbxgBIAEoCzIVLmNvbGxhYi52MS5IZWxsb0V2ZW50SAASJQoHbWVzc2FnZRgCIAEoCzISLmNvbGxhYi52MS5NZXNzYWdlSAASLAoIcHJlc2VuY2UYAyABKAsyGC5jb2xsYWIudjEuUHJlc2VuY2VFdmVudEgAEigKBmNsYWltcxgEIAEoCzIWLmNvbGxhYi52MS5DbGFpbXNFdmVudEgAEiwKB2NvbnRleHQYBSABKAsyGS5jb2xsYWIudjEuQ29udGV4dFN1bW1hcnlIABIjCgZyZXN1bHQYBiABKAsyES5jb2xsYWIudjEuUmVzdWx0SAASJwoFZXJyb3IYByABKAsyFi5jb2xsYWIudjEuRXJyb3JEZXRhaWxIAEIHCgVmcmFtZSL/BAoGUmVzdWx0EhIKCnJlcXVlc3RfaWQYASABKAkSJwoEc2VuZBgLIAEoCzIXLmNvbGxhYi52MS5TZW5kUmVzcG9uc2VIABIlCgNhY2sYDCABKAsyFi5jb2xsYWIudjEuQWNrUmVzcG9uc2VIABIpCgVjbGFpbRgNIAEoCzIYLmNvbGxhYi52MS5DbGFpbVJlc3BvbnNlSAASLQoHcmVsZWFzZRgOIAEoCzIaLmNvbGxhYi52MS5SZWxlYXNlUmVzcG9uc2VIABI0CgtwdXRfY29udGV4dBgPIAEoCzIdLmNvbGxhYi52MS5QdXRDb250ZXh0UmVzcG9uc2VIABI0CgtnZXRfY29udGV4dBgQIAEoCzIdLmNvbGxhYi52MS5HZXRDb250ZXh0UmVzcG9uc2VIABI2CgxzZXRfcHJlc2VuY2UYESABKAsyHi5jb2xsYWIudjEuU2V0UHJlc2VuY2VSZXNwb25zZUgAEi0KB2hpc3RvcnkYEiABKAsyGi5jb2xsYWIudjEuSGlzdG9yeVJlc3BvbnNlSAASMQoJaGVhcnRiZWF0GBMgASgLMhwuY29sbGFiLnYxLkhlYXJ0YmVhdFJlc3BvbnNlSAASPQoQY3JlYXRlX3Rhc2tfbGlzdBgUIAEoCzIhLmNvbGxhYi52MS5DcmVhdGVUYXNrTGlzdFJlc3BvbnNlSAASMAoJYWRkX3Rhc2tzGBUgASgLMhsuY29sbGFiLnYxLkFkZFRhc2tzUmVzcG9uc2VIABI0Cgt1cGRhdGVfdGFzaxgWIAEoCzIdLmNvbGxhYi52MS5VcGRhdGVUYXNrUmVzcG9uc2VIAEIKCghyZXNwb25zZTJgChBXZWJTb2NrZXRTZXJ2aWNlEkwKC0lzc3VlVGlja2V0Eh0uY29sbGFiLnYxLklzc3VlVGlja2V0UmVxdWVzdBoeLmNvbGxhYi52MS5Jc3N1ZVRpY2tldFJlc3BvbnNlYgZwcm90bzM", [file_collab_v1_channel, file_collab_v1_errors, file_collab_v1_model, file_google_protobuf_timestamp]);
var ClientFrameSchema = /* @__PURE__ */ messageDesc(file_collab_v1_websocket, 2);
var ServerFrameSchema = /* @__PURE__ */ messageDesc(file_collab_v1_websocket, 3);
var WebSocketService = /* @__PURE__ */ serviceDesc(file_collab_v1_websocket, 0);

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/names.js
var MAX_NAME_CHARS = 64;
function slug(value, max = MAX_NAME_CHARS) {
  if (typeof value !== "string")
    return "";
  return value.normalize("NFKD").replace(new RegExp("\\p{M}+", "gu"), "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[._-]+/, "").slice(0, max).replace(/-+$/, "");
}

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/limits.js
var MESSAGE_TTL_SECONDS = 30 * 24 * 60 * 60;
var CONTEXT_TTL_SECONDS = 180 * 24 * 60 * 60;
var INVITE_TTL_SECONDS = 24 * 60 * 60;
var MAX_INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;
var CLAIM_DEFAULT_TTL_SECONDS = 2 * 60 * 60;
var CLAIM_MAX_TTL_SECONDS = 24 * 60 * 60;
var HEARTBEAT_SECONDS = 30;
var TASK_STALE_SECONDS = 2 * 60 * 60;

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/extensions.js
function getExtension(message, extension2, options) {
  assertExtendee(extension2, message);
  const ufs = filterUnknownFields(message.$unknown, extension2);
  const [container, field, get] = createExtensionContainer(extension2);
  const ctx = makeReadContext(options);
  for (const uf of ufs) {
    readField(container, new BinaryReader(uf.data), field, uf.wireType, ctx);
  }
  return get();
}
function setExtension(message, extension2, value) {
  var _a;
  assertExtendee(extension2, message);
  const ufs = ((_a = message.$unknown) !== null && _a !== void 0 ? _a : []).filter((uf) => uf.no !== extension2.number);
  const [container, field] = createExtensionContainer(extension2, value);
  const writer = new BinaryWriter();
  writeField(writer, { writeUnknownFields: true }, container, field);
  const reader = new BinaryReader(writer.finish());
  while (reader.pos < reader.len) {
    const [no, wireType] = reader.tag();
    const data = reader.skip(wireType, no);
    ufs.push({ no, wireType, data });
  }
  message.$unknown = ufs;
}
function filterUnknownFields(unknownFields, extension2) {
  if (unknownFields === void 0)
    return [];
  if (extension2.fieldKind === "enum" || extension2.fieldKind === "scalar") {
    for (let i = unknownFields.length - 1; i >= 0; --i) {
      if (unknownFields[i].no == extension2.number) {
        return [unknownFields[i]];
      }
    }
    return [];
  }
  return unknownFields.filter((uf) => uf.no === extension2.number);
}
function createExtensionContainer(extension2, value) {
  const localName = extension2.typeName;
  const field = Object.assign(Object.assign({}, extension2), { kind: "field", parent: extension2.extendee, localName });
  const desc = Object.assign(Object.assign({}, extension2.extendee), { fields: [field], members: [field], oneofs: [] });
  const container = create(desc, value !== void 0 ? { [localName]: value } : void 0);
  return [
    reflect(desc, container),
    field,
    () => {
      const value2 = container[localName];
      if (value2 === void 0) {
        const desc2 = extension2.message;
        if (isWrapperDesc(desc2)) {
          return scalarZeroValue(desc2.fields[0].scalar, desc2.fields[0].longAsString);
        }
        return create(desc2);
      }
      return value2;
    }
  ];
}
function assertExtendee(extension2, message) {
  if (extension2.extendee.typeName != message.$typeName) {
    throw new Error(`extension ${extension2.typeName} can only be applied to message ${extension2.extendee.typeName}`);
  }
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/wkt/json.js
var timestampMsMin = /* @__PURE__ */ Date.parse("0001-01-01T00:00:00Z");
var timestampMsMax = /* @__PURE__ */ Date.parse("9999-12-31T23:59:59Z");
var durationSecondsMin = -315576e6;
var durationSecondsMax = 315576e6;

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/to-json.js
var LEGACY_REQUIRED3 = 3;
var IMPLICIT5 = 2;
var jsonWriteDefaults = {
  alwaysEmitImplicit: false,
  enumAsInteger: false,
  useProtoFieldName: false
};
function makeWriteOptions2(options) {
  return options ? Object.assign(Object.assign({}, jsonWriteDefaults), options) : jsonWriteDefaults;
}
function toJson(schema, message, options) {
  return compiledWriter2(schema)(makeWriteOptions2(options), message);
}
function toJsonString(schema, message, options) {
  var _a;
  const jsonValue = toJson(schema, message, options);
  return JSON.stringify(jsonValue, null, (_a = options === null || options === void 0 ? void 0 : options.prettySpaces) !== null && _a !== void 0 ? _a : 0);
}
var compiledWriters2 = /* @__PURE__ */ new WeakMap();
function compiledWriter2(desc) {
  let compiled = compiledWriters2.get(desc);
  if (compiled === void 0) {
    compiled = compileMessage3(desc);
  }
  return compiled;
}
function compileMessage3(desc) {
  const typeName = desc.typeName;
  const writeWkt = compileWkt(desc);
  if (writeWkt !== void 0) {
    const foreignField2 = desc.fields[0];
    const compiledWriter4 = (opts, message) => {
      if (message.$typeName !== typeName && foreignField2 !== void 0) {
        throw new FieldError(foreignField2, `cannot use ${foreignField2} with message ${message.$typeName}`, "ForeignFieldError");
      }
      return writeWkt(opts, message);
    };
    compiledWriters2.set(desc, compiledWriter4);
    return compiledWriter4;
  }
  const sortedFields = desc.fields.concat().sort((a, b) => a.number - b.number);
  const foreignField = sortedFields[0];
  const fieldWriters = [];
  const compiledWriter3 = (opts, message) => {
    if (message.$typeName !== typeName && foreignField !== void 0) {
      throw new FieldError(foreignField, `cannot use ${foreignField} with message ${message.$typeName}`, "ForeignFieldError");
    }
    const json = {};
    for (let i = 0; i < fieldWriters.length; i++) {
      fieldWriters[i](opts, message, json);
    }
    if (opts.registry) {
      writeExtensions(json, opts, opts.registry, message, desc);
    }
    return json;
  };
  compiledWriters2.set(desc, compiledWriter3);
  for (const field of sortedFields) {
    fieldWriters.push(compileField2(field));
  }
  return compiledWriter3;
}
function compileWkt(desc) {
  if (!desc.typeName.startsWith("google.protobuf.")) {
    return void 0;
  }
  switch (desc.typeName) {
    case "google.protobuf.Any":
      return (opts, message) => anyToJson(message, opts);
    case "google.protobuf.Timestamp":
      return (opts, message) => timestampToJson(message);
    case "google.protobuf.Duration":
      return (opts, message) => durationToJson(message);
    case "google.protobuf.FieldMask":
      return (opts, message) => fieldMaskToJson(message);
    case "google.protobuf.Struct":
      return (opts, message) => structToJson(message);
    case "google.protobuf.Value":
      return (opts, message) => valueToJson(message);
    case "google.protobuf.ListValue":
      return (opts, message) => listValueToJson(message);
    default:
      if (isWrapperDesc(desc)) {
        const valueField = desc.fields[0];
        const localName = valueField.localName;
        const zero = scalarZeroValue(valueField.scalar, false);
        const writeScalar = compileScalarValue2(valueField);
        return (opts, message) => {
          const value = message[localName];
          return writeScalar(opts, value === void 0 ? zero : value);
        };
      }
      return void 0;
  }
}
function compileField2(field) {
  switch (field.fieldKind) {
    case "scalar":
    case "enum":
    case "message":
      return compileSingularField2(field);
    case "list":
    case "map": {
      const writeValue = field.fieldKind == "list" ? compileListValue(field) : compileMapValue(field);
      const protoName = field.name;
      const jsonKey = field.jsonName;
      const localName = field.localName;
      return (opts, message, json) => {
        const value = writeValue(opts, message[localName]);
        if (value !== void 0) {
          json[opts.useProtoFieldName ? protoName : jsonKey] = value;
        }
      };
    }
  }
}
function compileSingularField2(field) {
  const writeValue = compileSingularValue2(field);
  const protoName = field.name;
  const jsonKey = field.jsonName;
  const localName = field.localName;
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (opts, message, json) => {
      const oneof = message[oneofLocalName];
      if (oneof.case === localName) {
        json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, oneof.value);
      }
    };
  }
  if (field.presence != IMPLICIT5) {
    const requiredError = field.presence == LEGACY_REQUIRED3 ? `cannot encode ${field} to JSON: required field not set` : void 0;
    return (opts, message, json) => {
      const value = message[localName];
      if (value !== void 0 && Object.prototype.hasOwnProperty.call(message, localName)) {
        json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
      } else if (requiredError !== void 0) {
        throw new Error(requiredError);
      }
    };
  }
  if (field.fieldKind == "enum") {
    const zero = field.enum.values[0].number;
    return (opts, message, json) => {
      const value = message[localName];
      if (value !== zero || opts.alwaysEmitImplicit) {
        json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
      }
    };
  }
  switch (field.scalar) {
    case ScalarType.BOOL:
      return (opts, message, json) => {
        const value = message[localName];
        if (value !== false || opts.alwaysEmitImplicit) {
          json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
        }
      };
    case ScalarType.STRING:
      return (opts, message, json) => {
        const value = message[localName];
        if (value !== "" || opts.alwaysEmitImplicit) {
          json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
        }
      };
    case ScalarType.BYTES:
      return (opts, message, json) => {
        const value = message[localName];
        if (!(value instanceof Uint8Array) || value.byteLength > 0 || opts.alwaysEmitImplicit) {
          json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
        }
      };
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return (opts, message, json) => {
        const value = message[localName];
        if (!Object.is(value, 0) || opts.alwaysEmitImplicit) {
          json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
        }
      };
    default:
      return (opts, message, json) => {
        const value = message[localName];
        if (value != 0 || opts.alwaysEmitImplicit) {
          json[opts.useProtoFieldName ? protoName : jsonKey] = writeValue(opts, value);
        }
      };
  }
}
function compileFieldValue(field) {
  switch (field.fieldKind) {
    case "scalar":
    case "enum":
    case "message":
      return compileSingularValue2(field);
    case "list":
      return compileListValue(field);
    case "map":
      return compileMapValue(field);
  }
}
function compileSingularValue2(field) {
  switch (field.fieldKind) {
    case "scalar":
      return compileScalarValue2(field);
    case "enum":
      return compileEnumValue(field);
    case "message":
      return compileMessageValue(field);
  }
}
function compileMessageValue(field) {
  const { toMessage: toMessage2 } = localMessageMapper(field);
  const writeMessage = compiledWriter2(field.message);
  return (opts, value) => writeMessage(opts, toMessage2(value));
}
function compileListValue(field) {
  const writeItem = compileListItemValue(field);
  return (opts, value) => {
    const items = value;
    if (items.length == 0 && !opts.alwaysEmitImplicit) {
      return void 0;
    }
    const jsonArray = [];
    for (let i = 0; i < items.length; i++) {
      jsonArray.push(writeItem(opts, items[i]));
    }
    return jsonArray;
  };
}
function compileListItemValue(field) {
  switch (field.listKind) {
    case "scalar":
      return compileScalarValue2(field);
    case "enum":
      return compileEnumValue(field);
    case "message":
      return compileMessageValue(field);
  }
}
function compileMapValue(field) {
  const writeMapValue = compileMapEntryValue(field);
  return (opts, value) => {
    const record = value;
    const keys = Object.keys(record);
    if (keys.length == 0 && !opts.alwaysEmitImplicit) {
      return void 0;
    }
    const jsonObject = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      jsonObject[key] = writeMapValue(opts, record[key]);
    }
    return jsonObject;
  };
}
function compileMapEntryValue(field) {
  switch (field.mapKind) {
    case "scalar":
      return compileScalarValue2(field);
    case "enum":
      return compileEnumValue(field);
    case "message":
      return compileMessageValue(field);
  }
}
function compileEnumValue(field) {
  const desc = field.enum;
  if (desc.typeName == "google.protobuf.NullValue") {
    return (opts, value) => {
      if (typeof value != "number") {
        throw errorEnumValue(desc, value);
      }
      return null;
    };
  }
  return (opts, value) => {
    var _a, _b;
    if (typeof value != "number") {
      throw errorEnumValue(desc, value);
    }
    if (opts.enumAsInteger) {
      return value;
    }
    return (_b = (_a = desc.value[value]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : value;
  };
}
function errorEnumValue(desc, value) {
  return new Error(`cannot encode ${desc} to JSON: expected number, got ${formatVal(value)}`);
}
function compileScalarValue2(field) {
  switch (field.scalar) {
    // int32, fixed32, uint32: JSON value will be a decimal number. Either numbers or strings are accepted.
    case ScalarType.INT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
      return (opts, value) => {
        if (typeof value != "number") {
          throw errorScalarValue(field, value);
        }
        return value;
      };
    // float, double: JSON value will be a number or one of the special string values "NaN", "Infinity", and "-Infinity".
    // Either numbers or strings are accepted. Exponent notation is also accepted.
    case ScalarType.FLOAT:
    case ScalarType.DOUBLE:
      return (opts, value) => {
        if (typeof value != "number") {
          throw errorScalarValue(field, value);
        }
        if (Number.isNaN(value))
          return "NaN";
        if (value === Number.POSITIVE_INFINITY)
          return "Infinity";
        if (value === Number.NEGATIVE_INFINITY)
          return "-Infinity";
        return value;
      };
    // string:
    case ScalarType.STRING:
      return (opts, value) => {
        if (typeof value != "string") {
          throw errorScalarValue(field, value);
        }
        return value;
      };
    // bool:
    case ScalarType.BOOL:
      return (opts, value) => {
        if (typeof value != "boolean") {
          throw errorScalarValue(field, value);
        }
        return value;
      };
    // JSON value will be a decimal string. Either numbers or strings are accepted.
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      return (opts, value) => {
        if (typeof value == "bigint" || typeof value == "string" || typeof value == "number" && Number.isInteger(value)) {
          return value.toString();
        }
        throw errorScalarValue(field, value);
      };
    // bytes: JSON value will be the data encoded as a string using standard base64 encoding with paddings.
    // Either standard or URL-safe base64 encoding with/without paddings are accepted.
    case ScalarType.BYTES:
      return (opts, value) => {
        if (value instanceof Uint8Array) {
          return base64Encode(value);
        }
        throw errorScalarValue(field, value);
      };
  }
}
function errorScalarValue(field, value) {
  var _a;
  return new Error(`cannot encode ${field} to JSON: ${(_a = checkField(field, value)) === null || _a === void 0 ? void 0 : _a.message}`);
}
function writeExtensions(json, opts, registry, message, desc) {
  const unknown = message.$unknown;
  if (unknown === void 0) {
    return;
  }
  const tagSeen = /* @__PURE__ */ new Set();
  for (let i = 0; i < unknown.length; i++) {
    const { no } = unknown[i];
    if (!tagSeen.has(no)) {
      tagSeen.add(no);
      const extension2 = registry.getExtensionFor(desc, no);
      if (!extension2) {
        continue;
      }
      const value = getExtension(message, extension2);
      const [container, field] = createExtensionContainer(extension2, value);
      const local = container[unsafeLocal];
      const jsonValue = compileFieldValue(field)(opts, local[field.localName]);
      if (jsonValue !== void 0) {
        json[extension2.jsonName] = jsonValue;
      }
    }
  }
}
function anyToJson(val, opts) {
  if (val.typeUrl === "") {
    return {};
  }
  const { registry } = opts;
  let message;
  let desc;
  if (registry) {
    message = anyUnpack(val, registry);
    if (message) {
      desc = registry.getMessage(message.$typeName);
    }
  }
  if (!desc || !message) {
    throw new Error(`cannot encode message ${val.$typeName} to JSON: "${val.typeUrl}" is not in the type registry`);
  }
  const json = hasCustomJsonRepresentation(desc) ? {
    value: compiledWriter2(desc)(opts, message)
  } : compiledWriter2(desc)(opts, message);
  json["@type"] = val.typeUrl;
  return json;
}
function durationToJson(val) {
  const seconds = Number(val.seconds);
  const nanos = val.nanos;
  if (seconds > durationSecondsMax || seconds < durationSecondsMin) {
    throw new Error(`cannot encode message ${val.$typeName} to JSON: value out of range`);
  }
  if (seconds > 0 && nanos < 0 || seconds < 0 && nanos > 0) {
    throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos sign must match seconds sign`);
  }
  let text = val.seconds.toString();
  if (nanos !== 0) {
    let nanosStr = Math.abs(nanos).toString();
    nanosStr = "0".repeat(9 - nanosStr.length) + nanosStr;
    if (nanosStr.substring(3) === "000000") {
      nanosStr = nanosStr.substring(0, 3);
    } else if (nanosStr.substring(6) === "000") {
      nanosStr = nanosStr.substring(0, 6);
    }
    text += "." + nanosStr;
    if (nanos < 0 && seconds == 0) {
      text = "-" + text;
    }
  }
  return text + "s";
}
function fieldMaskToJson(val) {
  return val.paths.map((p) => {
    if (protoSnakeCase(protoCamelCase(p)) !== p) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: lowerCamelCase of path name "${p}" is irreversible`);
    }
    return protoCamelCase(p);
  }).join(",");
}
function structToJson(val) {
  const json = {};
  const keys = Object.keys(val.fields);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    json[key] = valueToJson(val.fields[key]);
  }
  return json;
}
function valueToJson(val) {
  switch (val.kind.case) {
    case "nullValue":
      return null;
    case "numberValue":
      if (!Number.isFinite(val.kind.value)) {
        throw new Error(`${val.$typeName} cannot be NaN or Infinity`);
      }
      return val.kind.value;
    case "boolValue":
      return val.kind.value;
    case "stringValue":
      return val.kind.value;
    case "structValue":
      return structToJson(val.kind.value);
    case "listValue":
      return listValueToJson(val.kind.value);
    default:
      throw new Error(`${val.$typeName} must have a value`);
  }
}
function listValueToJson(val) {
  return val.values.map(valueToJson);
}
function timestampToJson(val) {
  const ms2 = Number(val.seconds) * 1e3;
  if (ms2 < timestampMsMin || ms2 > timestampMsMax) {
    throw new Error(`cannot encode message ${val.$typeName} to JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
  }
  if (val.nanos < 0) {
    throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be negative`);
  }
  if (val.nanos > 999999999) {
    throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be greater than 99999999`);
  }
  let z = "Z";
  if (val.nanos > 0) {
    const nanosStr = (val.nanos + 1e9).toString().substring(1);
    if (nanosStr.substring(3) === "000000") {
      z = "." + nanosStr.substring(0, 3) + "Z";
    } else if (nanosStr.substring(6) === "000") {
      z = "." + nanosStr.substring(0, 6) + "Z";
    } else {
      z = "." + nanosStr + "Z";
    }
  }
  return new Date(ms2).toISOString().replace(".000Z", z);
}

// ../node_modules/.pnpm/@bufbuild+protobuf@2.15.0/node_modules/@bufbuild/protobuf/dist/esm/from-json.js
var IMPLICIT6 = 2;
function makeReadContext2(options) {
  return Object.assign(Object.assign({ ignoreUnknownFields: false, recursionLimit: 100 }, options), { depth: 0 });
}
function fromJsonString(schema, json, options) {
  return fromJson(schema, parseJsonString(json, schema.typeName), options);
}
function fromJson(schema, json, options) {
  const message = create(schema);
  readMessage(schema, message, json, options);
  return message;
}
function readMessage(schema, message, json, options) {
  try {
    compiledReader2(schema)(message, json, makeReadContext2(options));
  } catch (e) {
    if (isFieldError(e)) {
      throw new Error(`cannot decode ${e.field()} from JSON: ${e.message}`, {
        cause: e
      });
    }
    throw e;
  }
}
var compiledReaders2 = /* @__PURE__ */ new WeakMap();
function compiledReader2(desc) {
  let compiled = compiledReaders2.get(desc);
  if (compiled === void 0) {
    compiled = compileMessage4(desc);
  }
  return compiled;
}
function compileMessage4(desc) {
  const descString = String(desc);
  const readWkt = compileWkt2(desc);
  if (readWkt !== void 0) {
    const compiled2 = (message, json, ctx) => {
      if (++ctx.depth > ctx.recursionLimit) {
        throw new Error(`cannot decode ${descString} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
      }
      readWkt(message, json, ctx);
      ctx.depth--;
    };
    compiledReaders2.set(desc, compiled2);
    return compiled2;
  }
  const typeName = desc.typeName;
  const fieldsByJsonKey = /* @__PURE__ */ new Map();
  const compiled = (message, json, ctx) => {
    var _a;
    if (++ctx.depth > ctx.recursionLimit) {
      throw new Error(`cannot decode ${descString} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
    }
    if (json == null || Array.isArray(json) || typeof json != "object") {
      throw new Error(`cannot decode ${descString} from JSON: ${formatVal(json)}`);
    }
    const oneofSeen = /* @__PURE__ */ new Map();
    const fieldSeen = /* @__PURE__ */ new Set();
    const jsonKeys = Object.keys(json);
    for (let i = 0; i < jsonKeys.length; i++) {
      const jsonKey = jsonKeys[i];
      const jsonValue = json[jsonKey];
      const entry = fieldsByJsonKey.get(jsonKey);
      if (entry !== void 0) {
        const field = entry.field;
        if (fieldSeen.has(field)) {
          throw new FieldError(field, "set multiple times");
        }
        fieldSeen.add(field);
        if (entry.oneofScalarNullSkip && jsonValue === null) {
          continue;
        }
        if (entry.oneof) {
          const seen = oneofSeen.get(entry.oneof);
          if (seen !== void 0) {
            throw new FieldError(entry.oneof, `oneof set multiple times by ${seen.name} and ${field.name}`);
          }
          oneofSeen.set(entry.oneof, field);
        }
        entry.read(message, jsonValue, ctx);
      } else {
        const extension2 = jsonKey.startsWith("[") && jsonKey.endsWith("]") ? (_a = ctx.registry) === null || _a === void 0 ? void 0 : _a.getExtension(jsonKey.substring(1, jsonKey.length - 1)) : void 0;
        if ((extension2 === null || extension2 === void 0 ? void 0 : extension2.extendee.typeName) == typeName) {
          const [container, field, get] = createExtensionContainer(extension2);
          compileFieldReader2(field)(container[unsafeLocal], jsonValue, ctx);
          setExtension(message, extension2, get());
        }
        if (extension2 === void 0 && !ctx.ignoreUnknownFields) {
          throw new Error(`cannot decode ${descString} from JSON: key "${jsonKey}" is unknown`);
        }
      }
    }
    ctx.depth--;
  };
  compiledReaders2.set(desc, compiled);
  for (const field of desc.fields) {
    const entry = {
      read: compileFieldReader2(field),
      field,
      oneof: field.oneof,
      oneofScalarNullSkip: field.oneof !== void 0 && field.fieldKind == "scalar"
    };
    fieldsByJsonKey.set(field.name, entry).set(field.jsonName, entry);
  }
  return compiled;
}
function compileWkt2(desc) {
  if (!desc.typeName.startsWith("google.protobuf.")) {
    return void 0;
  }
  switch (desc.typeName) {
    case "google.protobuf.Any":
      return (message, json, ctx) => anyFromJson(message, json, ctx);
    case "google.protobuf.Timestamp":
      return (message, json) => timestampFromJson(message, json);
    case "google.protobuf.Duration":
      return (message, json) => durationFromJson(message, json);
    case "google.protobuf.FieldMask":
      return (message, json) => fieldMaskFromJson(message, json);
    case "google.protobuf.Struct":
      return (message, json, ctx) => structFromJson(message, json, ctx);
    case "google.protobuf.Value":
      return (message, json, ctx) => valueFromJson(message, json, ctx);
    case "google.protobuf.ListValue":
      return (message, json, ctx) => listValueFromJson(message, json, ctx);
    default:
      if (isWrapperDesc(desc)) {
        const valueField = desc.fields[0];
        const localName = valueField.localName;
        const scalar = valueField.scalar;
        const longAsString = valueField.longAsString;
        const readScalar = compileScalarConverter(valueField);
        return (message, json) => {
          if (json === null) {
            message[localName] = scalarZeroValue(scalar, longAsString);
          } else {
            message[localName] = readScalar(json);
          }
        };
      }
      return void 0;
  }
}
function compileFieldReader2(field) {
  switch (field.fieldKind) {
    case "scalar":
      return compileScalarFieldReader2(field);
    case "enum":
      return compileEnumFieldReader2(field);
    case "message":
      return compileMessageFieldReader2(field);
    case "list":
      return compileListFieldReader2(field);
    case "map":
      return compileMapFieldReader2(field);
  }
}
function compileScalarFieldReader2(field) {
  const readScalar = compileScalarConverter(field);
  const localName = field.localName;
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (message, json) => {
      message[oneofLocalName] = {
        case: localName,
        value: readScalar(json)
      };
    };
  }
  const clear = compileClear(field);
  return (message, json) => {
    if (json === null) {
      clear(message);
    } else {
      message[localName] = readScalar(json);
    }
  };
}
function compileClear(field) {
  const localName = field.localName;
  if (field.presence != IMPLICIT6) {
    return (message) => {
      delete message[localName];
    };
  }
  if (field.fieldKind == "enum") {
    const zero = field.enum.values[0].number;
    return (message) => {
      message[localName] = zero;
    };
  }
  const scalar = field.scalar;
  const longAsString = field.longAsString;
  return (message) => {
    message[localName] = scalarZeroValue(scalar, longAsString);
  };
}
function compileEnumFieldReader2(field) {
  const readEnumValue = compileEnumConverter(field.enum);
  const checkEnum = compileEnumCheck(field.enum);
  const localName = field.localName;
  const nullResets = field.enum.typeName != "google.protobuf.NullValue";
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (message, json, ctx) => {
      if (json === null && nullResets) {
        const oneof = message[oneofLocalName];
        if (oneof.case === localName) {
          message[oneofLocalName] = { case: void 0 };
        }
        return;
      }
      const value = readEnumValue(json, ctx.ignoreUnknownFields);
      if (value === tokenIgnoredUnknownEnum) {
        return;
      }
      const check = checkEnum(value);
      if (check !== true) {
        throw new FieldError(field, reasonSingular(field, value, check));
      }
      message[oneofLocalName] = { case: localName, value };
    };
  }
  const clear = compileClear(field);
  return (message, json, ctx) => {
    if (json === null && nullResets) {
      clear(message);
      return;
    }
    const value = readEnumValue(json, ctx.ignoreUnknownFields);
    if (value === tokenIgnoredUnknownEnum) {
      return;
    }
    const check = checkEnum(value);
    if (check !== true) {
      throw new FieldError(field, reasonSingular(field, value, check));
    }
    message[localName] = value;
  };
}
function compileMessageFieldReader2(field) {
  const localName = field.localName;
  const { toMessage: toMessage2, toLocal } = localMessageMapper(field);
  const readChild = compiledReader2(field.message);
  const nullResets = field.message.typeName != "google.protobuf.Value";
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    return (message, json, ctx) => {
      const oneof = message[oneofLocalName];
      if (json === null && nullResets) {
        if (oneof.case === localName) {
          message[oneofLocalName] = { case: void 0 };
        }
        return;
      }
      const child = toMessage2(oneof.case === localName ? oneof.value : void 0);
      readChild(child, json, ctx);
      message[oneofLocalName] = { case: localName, value: toLocal(child) };
    };
  }
  return (message, json, ctx) => {
    if (json === null && nullResets) {
      delete message[localName];
      return;
    }
    const child = toMessage2(message[localName]);
    readChild(child, json, ctx);
    message[localName] = toLocal(child);
  };
}
function compileListFieldReader2(field) {
  const localName = field.localName;
  const readItem = compileListItemReader(field);
  return (message, json, ctx) => {
    if (json === null) {
      return;
    }
    if (!Array.isArray(json)) {
      throw new FieldError(field, "expected Array, got " + formatVal(json));
    }
    const items = message[localName];
    for (let i = 0; i < json.length; i++) {
      const value = readItem(json[i], ctx, items.length);
      if (value !== tokenIgnoredUnknownEnum) {
        items.push(value);
      }
    }
  };
}
function compileListItemReader(field) {
  switch (field.listKind) {
    case "scalar": {
      const parseScalar = compileScalarParse(field);
      const checkValue = checkScalarValue(field.scalar);
      const toLocal = compileScalarToLocal(field);
      return (json, ctx, index) => {
        if (json === null) {
          throw new FieldError(field, "list item must not be null");
        }
        const value = parseScalar(json);
        const check = checkValue(value);
        if (check !== true) {
          throw new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
        }
        return toLocal(value);
      };
    }
    case "enum": {
      const readEnumValue = compileEnumConverter(field.enum);
      const checkEnum = compileEnumCheck(field.enum);
      const nullResets = field.enum.typeName != "google.protobuf.NullValue";
      return (json, ctx, index) => {
        if (json === null && nullResets) {
          throw new FieldError(field, "list item must not be null");
        }
        const value = readEnumValue(json, ctx.ignoreUnknownFields);
        if (value === tokenIgnoredUnknownEnum) {
          return value;
        }
        const check = checkEnum(value);
        if (check !== true) {
          throw new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
        }
        return value;
      };
    }
    case "message": {
      const { toMessage: toMessage2, toLocal } = localMessageMapper(field);
      const readChild = compiledReader2(field.message);
      const nullResets = field.message.typeName != "google.protobuf.Value";
      return (json, ctx) => {
        if (json === null && nullResets) {
          throw new FieldError(field, "list item must not be null");
        }
        const child = toMessage2(void 0);
        readChild(child, json, ctx);
        return toLocal(child);
      };
    }
  }
}
function compileMapFieldReader2(field) {
  const localName = field.localName;
  const mapKey = field.mapKey;
  const parseMapKey = compileMapKeyParse(mapKey);
  const checkMapKey = checkScalarValue(mapKey);
  let parseValue;
  let checkValue;
  let toLocalValue = (value) => value;
  let nullResets = true;
  switch (field.mapKind) {
    case "scalar": {
      parseValue = compileScalarParse(field);
      checkValue = checkScalarValue(field.scalar);
      toLocalValue = compileScalarToLocal(field);
      break;
    }
    case "enum": {
      const readEnumValue = compileEnumConverter(field.enum);
      parseValue = (json, ctx) => readEnumValue(json, ctx.ignoreUnknownFields);
      checkValue = compileEnumCheck(field.enum);
      nullResets = field.enum.typeName != "google.protobuf.NullValue";
      break;
    }
    case "message": {
      const { toMessage: toMessage2, toLocal } = localMessageMapper(field);
      const readChild = compiledReader2(field.message);
      nullResets = field.message.typeName != "google.protobuf.Value";
      parseValue = (json, ctx) => {
        const child = toMessage2(void 0);
        readChild(child, json, ctx);
        return toLocal(child);
      };
      break;
    }
  }
  return (message, json, ctx) => {
    if (json === null) {
      return;
    }
    if (typeof json != "object" || Array.isArray(json)) {
      throw new FieldError(field, "expected object, got " + formatVal(json));
    }
    const record = message[localName];
    const seen = /* @__PURE__ */ new Set();
    const jsonMapKeys = Object.keys(json);
    for (let i = 0; i < jsonMapKeys.length; i++) {
      const jsonMapKey = jsonMapKeys[i];
      const jsonMapValue = json[jsonMapKey];
      const key = parseMapKey(jsonMapKey);
      if (seen.has(key)) {
        throw new FieldError(field, `duplicate map key "${jsonMapKey}"`);
      }
      seen.add(key);
      if (jsonMapValue === null && nullResets) {
        throw new FieldError(field, "map value must not be null");
      }
      const value = parseValue(jsonMapValue, ctx);
      if (value === tokenIgnoredUnknownEnum) {
        continue;
      }
      const checkKey = checkMapKey(key);
      if (checkKey !== true) {
        throw new FieldError(field, `invalid map key: ${reasonSingular({ scalar: mapKey }, key, checkKey)}`);
      }
      if (checkValue !== void 0) {
        const check = checkValue(value);
        if (check !== true) {
          throw new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, check)}`);
        }
      }
      record[key] = toLocalValue(value);
    }
  };
}
var tokenIgnoredUnknownEnum = /* @__PURE__ */ Symbol();
function compileEnumConverter(desc) {
  const zero = desc.values[0].number;
  const values = desc.values;
  return (json, ignoreUnknownFields) => {
    if (json === null) {
      return zero;
    }
    switch (typeof json) {
      case "number":
        if (Number.isInteger(json)) {
          return json;
        }
        break;
      case "string": {
        const value = values.find((ev) => ev.name === json);
        if (value !== void 0) {
          return value.number;
        }
        if (ignoreUnknownFields) {
          return tokenIgnoredUnknownEnum;
        }
        break;
      }
    }
    throw new Error(`cannot decode ${desc} from JSON: ${formatVal(json)}`);
  };
}
function compileEnumCheck(desc) {
  if (desc.open) {
    return checkScalarValue(ScalarType.INT32);
  }
  const values = desc.values;
  return (value) => values.some((v) => v.number === value);
}
function compileScalarConverter(field) {
  const parseScalar = compileScalarParse(field);
  const checkValue = checkScalarValue(field.scalar);
  const toLocal = compileScalarToLocal(field);
  return (json) => {
    const value = parseScalar(json);
    const check = checkValue(value);
    if (check !== true) {
      throw new FieldError(field, reasonSingular(field, value, check));
    }
    return toLocal(value);
  };
}
function compileScalarParse(field) {
  switch (field.scalar) {
    // float, double: JSON value will be a number or one of the special string values "NaN", "Infinity", and "-Infinity".
    // Either numbers or strings are accepted. Exponent notation is also accepted.
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return (json) => {
        if (json === "NaN")
          return NaN;
        if (json === "Infinity")
          return Number.POSITIVE_INFINITY;
        if (json === "-Infinity")
          return Number.NEGATIVE_INFINITY;
        if (typeof json == "number") {
          if (Number.isNaN(json)) {
            throw new FieldError(field, "unexpected NaN number");
          }
          if (!Number.isFinite(json)) {
            throw new FieldError(field, "unexpected infinite number");
          }
          return json;
        }
        if (typeof json == "string") {
          if (json === "") {
            return json;
          }
          if (json.trim().length !== json.length) {
            return json;
          }
          const float = Number(json);
          if (!Number.isFinite(float)) {
            return json;
          }
          return float;
        }
        return json;
      };
    // int32, fixed32, uint32: JSON value will be a decimal number. Either numbers or strings are accepted.
    case ScalarType.INT32:
    case ScalarType.FIXED32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
    case ScalarType.UINT32:
      return int32FromJson;
    // bytes: JSON value will be the data encoded as a string using standard base64 encoding with paddings.
    // Either standard or URL-safe base64 encoding with/without paddings are accepted.
    case ScalarType.BYTES:
      return (json) => {
        if (typeof json == "string") {
          if (json === "") {
            return new Uint8Array(0);
          }
          try {
            return base64Decode(json);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new FieldError(field, message);
          }
        }
        return json;
      };
    // int64, sfixed64, sint64, fixed64, uint64: The validation step accepts
    // string and number. string, bool: no conversion.
    default:
      return (json) => json;
  }
}
function compileScalarToLocal(field) {
  const longAsString = field.fieldKind !== "map" && field.longAsString;
  switch (field.scalar) {
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      if (longAsString) {
        return (value) => String(value);
      }
      return (value) => typeof value == "string" || typeof value == "number" ? protoInt64.parse(value) : value;
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      if (longAsString) {
        return (value) => String(value);
      }
      return (value) => typeof value == "string" || typeof value == "number" ? protoInt64.uParse(value) : value;
    default:
      return (value) => value;
  }
}
function compileMapKeyParse(type) {
  switch (type) {
    case ScalarType.BOOL:
      return (jsonString) => {
        switch (jsonString) {
          case "true":
            return true;
          case "false":
            return false;
        }
        return jsonString;
      };
    case ScalarType.INT32:
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
      return int32FromJson;
    case ScalarType.INT64:
    case ScalarType.SINT64:
    case ScalarType.SFIXED64:
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return (jsonString) => /^-?0+$/.test(jsonString) ? "0" : jsonString.replace(/^(-?)0+(?=\d)/, "$1");
    default:
      return (jsonString) => jsonString;
  }
}
function int32FromJson(json) {
  if (typeof json == "string") {
    if (json === "") {
      return json;
    }
    if (json.trim().length !== json.length) {
      return json;
    }
    const num = Number(json);
    if (Number.isNaN(num)) {
      return json;
    }
    return num;
  }
  return json;
}
function parseJsonString(jsonString, typeName) {
  let json;
  try {
    json = JSON.parse(jsonString);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(
      `cannot decode message ${typeName} from JSON: ${message}`,
      // @ts-expect-error we use the ES2022 error CTOR option "cause" for better stack traces
      { cause: e }
    );
  }
  checkDuplicateKeys(jsonString, typeName);
  return json;
}
function checkDuplicateKeys(jsonString, typeName) {
  const stack = [];
  let expectKey = false;
  let i = 0;
  while (i < jsonString.length) {
    switch (jsonString[i]) {
      case "{":
        stack.push(/* @__PURE__ */ new Set());
        expectKey = true;
        i++;
        break;
      case "[":
        stack.push(null);
        expectKey = false;
        i++;
        break;
      case "}":
      case "]":
        stack.pop();
        expectKey = false;
        i++;
        break;
      case ",":
        expectKey = stack[stack.length - 1] != null;
        i++;
        break;
      case ":":
        expectKey = false;
        i++;
        break;
      case '"': {
        const open = i++;
        let escaped = false;
        while (i < jsonString.length) {
          if (jsonString[i] == "\\") {
            escaped = true;
            i += 2;
            continue;
          }
          if (jsonString[i] == '"') {
            break;
          }
          i++;
        }
        const close = i++;
        const seen = stack[stack.length - 1];
        if (expectKey && seen) {
          const name = escaped ? JSON.parse(jsonString.substring(open, close + 1)) : jsonString.substring(open + 1, close);
          if (seen.has(name)) {
            throw new Error(`cannot decode message ${typeName} from JSON: duplicate object key "${name}"`);
          }
          seen.add(name);
        }
        expectKey = false;
        break;
      }
      default:
        i++;
        break;
    }
  }
}
function anyFromJson(any, json, ctx) {
  var _a;
  if (json === null || Array.isArray(json) || typeof json != "object") {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: expected object but got ${formatVal(json)}`);
  }
  if (Object.keys(json).length == 0) {
    return;
  }
  const typeUrl = json["@type"];
  if (typeof typeUrl != "string" || typeUrl == "") {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is empty`);
  }
  const typeName = typeUrl.includes("/") ? typeUrl.substring(typeUrl.lastIndexOf("/") + 1) : typeUrl;
  if (!typeName.length) {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is invalid`);
  }
  const desc = (_a = ctx.registry) === null || _a === void 0 ? void 0 : _a.getMessage(typeName);
  if (!desc) {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: ${typeUrl} is not in the type registry`);
  }
  const message = create(desc);
  if (hasCustomJsonRepresentation(desc) && Object.prototype.hasOwnProperty.call(json, "value")) {
    compiledReader2(desc)(message, json.value, ctx);
  } else {
    const copy = Object.assign({}, json);
    delete copy["@type"];
    compiledReader2(desc)(message, copy, ctx);
  }
  anyPack(desc, message, any);
}
function timestampFromJson(timestamp, json) {
  if (typeof json !== "string") {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: ${formatVal(json)}`);
  }
  const matches = json.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(?:Z|([+-][0-9][0-9]:[0-9][0-9]))$/);
  if (!matches) {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
  }
  const ms2 = Date.parse(
    // biome-ignore format: want this to read well
    matches[1] + "-" + matches[2] + "-" + matches[3] + "T" + matches[4] + ":" + matches[5] + ":" + matches[6] + (matches[8] ? matches[8] : "Z")
  );
  if (Number.isNaN(ms2)) {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
  }
  if (ms2 < timestampMsMin || ms2 > timestampMsMax) {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
  }
  timestamp.seconds = protoInt64.parse(ms2 / 1e3);
  timestamp.nanos = 0;
  if (matches[7]) {
    timestamp.nanos = parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1e9;
  }
}
function durationFromJson(duration, json) {
  if (typeof json !== "string") {
    throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
  }
  const match = json.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
  if (match === null) {
    throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
  }
  const longSeconds = Number(match[1]);
  if (longSeconds > durationSecondsMax || longSeconds < durationSecondsMin) {
    throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
  }
  duration.seconds = protoInt64.parse(longSeconds);
  if (typeof match[2] !== "string") {
    return;
  }
  const nanosStr = match[2] + "0".repeat(9 - match[2].length);
  duration.nanos = parseInt(nanosStr);
  if (longSeconds < 0 || Object.is(longSeconds, -0)) {
    duration.nanos = -duration.nanos;
  }
}
function fieldMaskFromJson(fieldMask, json) {
  if (typeof json !== "string") {
    throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: ${formatVal(json)}`);
  }
  if (json === "") {
    return;
  }
  fieldMask.paths = json.split(",").map((path4) => {
    if (path4.includes("_")) {
      throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: path names must be lowerCamelCase`);
    }
    return protoSnakeCase(path4);
  });
}
function structFromJson(struct, json, ctx) {
  if (typeof json != "object" || json == null || Array.isArray(json)) {
    throw new Error(`cannot decode message ${struct.$typeName} from JSON ${formatVal(json)}`);
  }
  const keys = Object.keys(json);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const parsedValue = create(ValueSchema);
    valueFromJson(parsedValue, json[key], ctx);
    struct.fields[key] = parsedValue;
  }
}
function valueFromJson(value, json, ctx) {
  if (++ctx.depth > ctx.recursionLimit) {
    throw new Error(`cannot decode ${value.$typeName} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
  }
  switch (typeof json) {
    case "number":
      value.kind = { case: "numberValue", value: json };
      break;
    case "string":
      value.kind = { case: "stringValue", value: json };
      break;
    case "boolean":
      value.kind = { case: "boolValue", value: json };
      break;
    case "object":
      if (json === null) {
        value.kind = { case: "nullValue", value: NullValue.NULL_VALUE };
      } else if (Array.isArray(json)) {
        const listValue = create(ListValueSchema);
        listValueFromJson(listValue, json, ctx);
        value.kind = { case: "listValue", value: listValue };
      } else {
        const struct = create(StructSchema);
        structFromJson(struct, json, ctx);
        value.kind = { case: "structValue", value: struct };
      }
      break;
    default:
      throw new Error(`cannot decode message ${value.$typeName} from JSON ${formatVal(json)}`);
  }
  ctx.depth--;
  return value;
}
function listValueFromJson(listValue, json, ctx) {
  if (!Array.isArray(json)) {
    throw new Error(`cannot decode message ${listValue.$typeName} from JSON ${formatVal(json)}`);
  }
  for (let i = 0; i < json.length; i++) {
    const value = create(ValueSchema);
    valueFromJson(value, json[i], ctx);
    listValue.values.push(value);
  }
}

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/version.js
var PROTOCOL_MAJOR = 1;
var PROTOCOL_MINOR = 0;
var PROTOCOL = create(ProtocolVersionSchema, { major: PROTOCOL_MAJOR, minor: PROTOCOL_MINOR });
function formatVersion(version) {
  return `${version.major}.${version.minor}`;
}

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/json.js
var READ = { ignoreUnknownFields: true };
function encode(schema, message) {
  return toJsonString(schema, message);
}
function decode(schema, text) {
  return fromJsonString(schema, text, READ);
}

// ../node_modules/.pnpm/@collab+protocol@git+https+++github.com+cognikas+collab-protocol.git+ad2de364e6acd34807f41ffc07020d6be2faa01b&path++ts/node_modules/@collab/protocol/dist/http.js
function rpcPath(method) {
  return `/${method.parent.typeName}/${method.name}`;
}
var HEADER_MEMBER_ID = "x-collab-member";
var HEADER_MEMBER_SECRET = "x-collab-secret";
var HEADER_TOPIC = "x-collab-topic";
var HEADER_CLIENT_SESSION = "x-collab-client-session";
var HEADER_PROTOCOL = "x-collab-protocol";

// src/lib/api.ts
var ApiError = class extends Error {
  constructor(status, code, message) {
    super(`${ErrorCode[code] ?? "INTERNAL"}: ${message}`);
    this.status = status;
    this.code = code;
  }
  status;
  code;
};
async function call(endpoint, method, input, headers = {}) {
  const res = await fetch(`${endpoint}${rpcPath(method)}`, {
    method: "POST",
    headers: { "content-type": "application/json", [HEADER_PROTOCOL]: formatVersion(PROTOCOL), ...headers },
    body: encode(method.input, create(method.input, input)),
    signal: AbortSignal.timeout(15e3)
  });
  const text = await res.text();
  if (!res.ok) {
    let code = ErrorCode.INTERNAL;
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const detail = decode(ErrorDetailSchema, text);
      if (detail.code !== ErrorCode.UNSPECIFIED) code = detail.code;
      if (detail.message) message = detail.message;
    } catch {
      if (text) message = text.slice(0, 300);
    }
    throw new ApiError(res.status, code, message);
  }
  return decode(method.output, text || "{}");
}
function memberHeaders(creds, origin) {
  return {
    [HEADER_MEMBER_ID]: creds.memberId,
    [HEADER_MEMBER_SECRET]: creds.secret,
    [HEADER_TOPIC]: origin.topic,
    [HEADER_CLIENT_SESSION]: origin.clientSessionId
  };
}
function join(apiEndpoint, invite, displayName) {
  return call(apiEndpoint, MembershipService.method.join, { invite, displayName });
}
function issueTicket(creds, origin) {
  return call(creds.apiEndpoint, WebSocketService.method.issueTicket, {}, memberHeaders(creds, origin));
}
async function fetchState(creds, origin, since) {
  const response = await call(
    creds.apiEndpoint,
    ChannelService.method.getState,
    since === void 0 ? {} : { since },
    memberHeaders(creds, origin)
  );
  if (!response.state) throw new ApiError(500, ErrorCode.INTERNAL, "GetState returned no state");
  return response.state;
}
function sendViaHttp(creds, origin, request) {
  return call(creds.apiEndpoint, ChannelService.method.send, request, memberHeaders(creds, origin));
}
async function ackViaHttp(creds, origin, cursor) {
  await call(creds.apiEndpoint, ChannelService.method.ack, { cursor }, memberHeaders(creds, origin));
}
async function channelViaHttp(creds, origin, request) {
  const headers = memberHeaders(creds, origin);
  const endpoint = creds.apiEndpoint;
  const m = ChannelService.method;
  switch (request.case) {
    case "send":
      return { case: "send", value: await call(endpoint, m.send, request.value, headers) };
    case "ack":
      return { case: "ack", value: await call(endpoint, m.ack, request.value, headers) };
    case "claim":
      return { case: "claim", value: await call(endpoint, m.claim, request.value, headers) };
    case "release":
      return { case: "release", value: await call(endpoint, m.release, request.value, headers) };
    case "putContext":
      return { case: "putContext", value: await call(endpoint, m.putContext, request.value, headers) };
    case "getContext":
      return { case: "getContext", value: await call(endpoint, m.getContext, request.value, headers) };
    case "setPresence":
      return { case: "setPresence", value: await call(endpoint, m.setPresence, request.value, headers) };
    case "history":
      return { case: "history", value: await call(endpoint, m.history, request.value, headers) };
    case "heartbeat":
      return { case: "heartbeat", value: await call(endpoint, m.heartbeat, request.value, headers) };
    case "createTaskList":
      return { case: "createTaskList", value: await call(endpoint, m.createTaskList, request.value, headers) };
    case "addTasks":
      return { case: "addTasks", value: await call(endpoint, m.addTasks, request.value, headers) };
    case "updateTask":
      return { case: "updateTask", value: await call(endpoint, m.updateTask, request.value, headers) };
  }
}
function listTasksViaHttp(creds, origin, request) {
  return call(creds.apiEndpoint, ChannelService.method.listTasks, request, memberHeaders(creds, origin));
}

// src/lib/config.ts
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import fs from "node:fs";
function dataDir() {
  return path.join(process.env.CLAUDE_PLUGIN_DATA ?? path.join(homedir(), ".claude", "collab-channel"), "v1");
}
function credentialsPath() {
  return path.join(dataDir(), "credentials.json");
}
function sessionsRoot() {
  return path.join(dataDir(), "sessions");
}
function sessionDir(clientSessionId2) {
  return path.join(sessionsRoot(), sanitize(clientSessionId2));
}
function sanitize(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80) || "default";
}
function bool(value, fallback) {
  if (value === void 0 || value === "") return fallback;
  return !["false", "0", "no", "off"].includes(value.toLowerCase());
}
function oneOf(value, allowed, fallback) {
  const found = allowed.find((a) => a === value?.toLowerCase());
  return found ?? fallback;
}
function optional(value) {
  return value && !value.startsWith("${") ? value : void 0;
}
function readConfig() {
  const e = process.env;
  return {
    apiEndpoint: (optional(e.CLAUDE_PLUGIN_OPTION_API_ENDPOINT) ?? optional(e.COLLAB_API_ENDPOINT) ?? "").replace(/\/+$/, ""),
    inviteCode: optional(e.CLAUDE_PLUGIN_OPTION_INVITE_CODE) ?? optional(e.COLLAB_INVITE_CODE),
    displayName: optional(e.CLAUDE_PLUGIN_OPTION_DISPLAY_NAME) ?? optional(e.COLLAB_DISPLAY_NAME) ?? e.USERNAME ?? e.USER ?? "unnamed",
    deliveryMode: oneOf(e.CLAUDE_PLUGIN_OPTION_DELIVERY_MODE, ["stop", "prompt", "manual", "all", "channel"], "stop"),
    stopMinUrgency: oneOf(e.CLAUDE_PLUGIN_OPTION_STOP_MIN_URGENCY, ["low", "normal", "high"], "normal"),
    midTurnMinUrgency: oneOf(e.CLAUDE_PLUGIN_OPTION_MIDTURN_MIN_URGENCY, ["off", "low", "normal", "high"], "high"),
    desktopNotifications: bool(e.CLAUDE_PLUGIN_OPTION_DESKTOP_NOTIFICATIONS, true),
    claimWarnings: bool(e.CLAUDE_PLUGIN_OPTION_CLAIM_WARNINGS, true),
    // The environment first: `env` in a project's .claude/settings.local.json is per project.
    topic: optional(e.COLLAB_TOPIC) || optional(e.CLAUDE_PLUGIN_OPTION_TOPIC),
    memberId: optional(e.CLAUDE_PLUGIN_OPTION_MEMBER_ID),
    memberSecret: optional(e.CLAUDE_PLUGIN_OPTION_MEMBER_SECRET)
  };
}
var runGit = (cwd, args) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2e3,
      windowsHide: true
    }).trim() || void 0;
  } catch {
    return void 0;
  }
};
function repoName(cwd, git = runGit) {
  const top = git(cwd, ["rev-parse", "--show-toplevel"]);
  if (!top) return path.basename(cwd);
  const common = git(top, ["rev-parse", "--git-common-dir"]);
  const commonDir = common ? path.resolve(top, common) : "";
  return commonDir && path.basename(commonDir) === ".git" ? path.basename(path.dirname(commonDir)) : path.basename(top);
}
function resolveTopic(config, cwd, git = runGit, saved = "") {
  return slug(config.topic) || slug(saved) || slug(repoName(cwd, git)) || "general";
}
function gitBranch(cwd, git = runGit) {
  return git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
}
function readCredentials() {
  try {
    return JSON.parse(fs.readFileSync(credentialsPath(), "utf8"));
  } catch {
    return void 0;
  }
}
function writeCredentials(creds) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const file2 = credentialsPath();
  fs.writeFileSync(file2, JSON.stringify(creds, null, 2), { mode: 384 });
  restrictToCurrentUser(file2);
}
function restrictToCurrentUser(file2) {
  if (process.platform !== "win32") return;
  try {
    const { execFileSync: execFileSync2 } = __require("node:child_process");
    execFileSync2("icacls", [file2, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:F`], {
      stdio: "ignore"
    });
  } catch {
  }
}
function resolveCredentials(config = readConfig()) {
  const file2 = readCredentials();
  const stored = file2?.memberId && (!config.apiEndpoint || file2.apiEndpoint === config.apiEndpoint) ? file2 : void 0;
  if (config.memberId && config.memberSecret) {
    return {
      apiEndpoint: config.apiEndpoint || stored?.apiEndpoint || "",
      wsEndpoint: stored?.wsEndpoint ?? "",
      memberId: config.memberId,
      secret: config.memberSecret,
      channel: stored?.channel ?? "",
      displayName: config.displayName,
      handle: stored?.handle,
      joinedAt: stored?.joinedAt ?? Date.now()
    };
  }
  return stored;
}

// src/lib/state.ts
import fs2 from "node:fs";
import path2 from "node:path";

// src/lib/model.ts
var URGENCY_RANK = { low: 0, normal: 1, high: 2 };

// src/lib/state.ts
var EMPTY_STATE = {
  connected: false,
  channel: "",
  self: "",
  handle: "",
  topic: "",
  members: [],
  claims: [],
  contextIndex: [],
  taskLists: [],
  latestSeq: 0,
  updatedAt: 0
};
var EMPTY_CURSOR = { delivered: 0, acked: 0, lastBlockAt: 0 };
function file(clientSessionId2, name) {
  return path2.join(sessionDir(clientSessionId2), name);
}
function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs2.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJsonAtomic(filePath, value) {
  fs2.mkdirSync(path2.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs2.writeFileSync(tmp, JSON.stringify(value, null, 2));
  for (let attempt = 1; ; attempt++) {
    try {
      fs2.renameSync(tmp, filePath);
      return;
    } catch (err) {
      const code = err.code ?? "";
      if (attempt >= 5 || !["EPERM", "EACCES", "EBUSY"].includes(code)) {
        try {
          fs2.unlinkSync(tmp);
        } catch {
        }
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * attempt);
    }
  }
}
function writeDaemonInfo(info) {
  writeJsonAtomic(file(info.clientSessionId, "daemon.json"), info);
}
function clearDaemonInfo(clientSessionId2, pid) {
  const target = file(clientSessionId2, "daemon.json");
  if (pid !== void 0 && readJson(target, void 0)?.pid !== pid) return;
  try {
    fs2.unlinkSync(target);
  } catch {
  }
}
function mcpRoot() {
  return path2.join(dataDir(), "mcp");
}
function unregisterMcpServer(pid) {
  try {
    fs2.unlinkSync(path2.join(mcpRoot(), `${pid}.json`));
  } catch {
  }
}
function liveMcpServers(claudePid2) {
  let entries;
  try {
    entries = fs2.readdirSync(mcpRoot());
  } catch {
    return [];
  }
  const live = [];
  for (const entry of entries.filter((name) => name.endsWith(".json"))) {
    const info = readJson(path2.join(mcpRoot(), entry), void 0);
    if (!info) continue;
    if (!isAlive(info.pid)) unregisterMcpServer(info.pid);
    else if (info.claudePid === claudePid2) live.push(info);
  }
  return live;
}
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
}
function appendInbox(clientSessionId2, message) {
  const target = file(clientSessionId2, "inbox.jsonl");
  fs2.mkdirSync(path2.dirname(target), { recursive: true });
  fs2.appendFileSync(target, `${JSON.stringify(message)}
`);
}
function readInbox(clientSessionId2, sinceSeq = 0) {
  let raw;
  try {
    raw = fs2.readFileSync(file(clientSessionId2, "inbox.jsonl"), "utf8");
  } catch {
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const messages = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const message = JSON.parse(line);
      if (message.seq > sinceSeq && !seen.has(message.seq)) {
        seen.add(message.seq);
        messages.push(message);
      }
    } catch {
    }
  }
  return messages.sort((a, b) => a.seq - b.seq);
}
function truncateInbox(clientSessionId2, keepLast = 500) {
  const messages = readInbox(clientSessionId2, 0);
  if (messages.length <= keepLast) return;
  const target = file(clientSessionId2, "inbox.jsonl");
  const kept = messages.slice(-keepLast).map((m) => JSON.stringify(m)).join("\n");
  fs2.writeFileSync(`${target}.tmp`, `${kept}
`);
  fs2.renameSync(`${target}.tmp`, target);
}
function readCursor(clientSessionId2) {
  return { ...EMPTY_CURSOR, ...readJson(file(clientSessionId2, "cursor.json"), {}) };
}
function writeCursor(clientSessionId2, patch) {
  const next = { ...readCursor(clientSessionId2), ...patch };
  writeJsonAtomic(file(clientSessionId2, "cursor.json"), next);
  return next;
}
function readLocalState(clientSessionId2) {
  return { ...EMPTY_STATE, ...readJson(file(clientSessionId2, "state.json"), {}) };
}
function writeLocalState(clientSessionId2, patch) {
  const next = { ...readLocalState(clientSessionId2), ...patch, updatedAt: Date.now() };
  writeJsonAtomic(file(clientSessionId2, "state.json"), next);
  return next;
}
function applyTaskList(clientSessionId2, list) {
  const state = readLocalState(clientSessionId2);
  if (state.topic && list.topic !== state.topic) return;
  const known = state.taskLists.find((l) => l.key === list.key);
  if (known && known.updatedAt > list.updatedAt) return;
  const others = state.taskLists.filter((l) => l.key !== list.key);
  const kept = list.open + list.inProgress > 0 ? [list, ...others] : others;
  writeLocalState(clientSessionId2, { taskLists: kept.sort((a, b) => b.updatedAt - a.updatedAt) });
}
var isOpen = (task) => task.status === "open" || task.status === "in_progress";
function applyTasks(clientSessionId2, tasks, list) {
  const state = readLocalState(clientSessionId2);
  const read = tasks.filter((t) => (!state.topic || t.topic === state.topic) && isOpen(t));
  const kept = list === void 0 ? [] : (state.tasks ?? []).filter((t) => t.list !== list);
  writeLocalState(clientSessionId2, { tasks: [...kept, ...read], tasksStale: false });
}
function applyTask(clientSessionId2, task) {
  const state = readLocalState(clientSessionId2);
  if (state.topic && task.topic !== state.topic) return;
  const tasks = state.tasks ?? [];
  const same = (t) => t.list === task.list && t.number === task.number;
  const known = tasks.find(same);
  if (known && known.updatedAt > task.updatedAt) return;
  const others = tasks.filter((t) => !same(t));
  writeLocalState(clientSessionId2, { tasks: isOpen(task) ? [...others, task] : others });
}
function messagesSince(clientSessionId2, since, filter = {}) {
  const threshold = URGENCY_RANK[filter.minUrgency ?? "low"];
  const types = filter.types ?? [];
  const messages = readInbox(clientSessionId2, since);
  const trigger = messages.find((message) => URGENCY_RANK[message.urgency] >= threshold && (types.length === 0 || types.includes(message.type)));
  return { messages, trigger };
}

// src/lib/channel.ts
var PLUGIN_NAME = "collab-channel";
var BUSY_STALE_MS = 10 * 60 * 1e3;
var CONFIRM_WINDOW_MS = 10 * 60 * 1e3;

// src/lib/version.ts
var PLUGIN_VERSION = "1.0.0-rc.6";

// src/lib/wire.ts
function ms(ts) {
  return ts ? timestampMs(ts) : 0;
}
function opt(value) {
  return value ? value : void 0;
}
function urgencyOf(value) {
  switch (value) {
    case Urgency.LOW:
      return "low";
    case Urgency.HIGH:
      return "high";
    default:
      return "normal";
  }
}
function toWireUrgency(value) {
  switch (value) {
    case "low":
      return Urgency.LOW;
    case "high":
      return Urgency.HIGH;
    case "normal":
      return Urgency.NORMAL;
    default:
      return Urgency.UNSPECIFIED;
  }
}
function messageTypeOf(value) {
  switch (value) {
    case MessageType.QUESTION:
      return "question";
    case MessageType.DONE:
      return "done";
    case MessageType.CLAIM:
      return "claim";
    case MessageType.RELEASE:
      return "release";
    case MessageType.CONTEXT:
      return "context";
    case MessageType.TASK:
      return "task";
    default:
      return "note";
  }
}
function taskStatusOf(value) {
  switch (value) {
    case TaskStatus.IN_PROGRESS:
      return "in_progress";
    case TaskStatus.DONE:
      return "done";
    case TaskStatus.DISMISSED:
      return "dismissed";
    default:
      return "open";
  }
}
function taskEventOf(value) {
  switch (value) {
    case TaskEvent.CHECKED_OUT:
      return "checked_out";
    case TaskEvent.PROGRESS:
      return "progress";
    case TaskEvent.RELEASED:
      return "released";
    case TaskEvent.DONE:
      return "done";
    case TaskEvent.DISMISSED:
      return "dismissed";
    default:
      return "added";
  }
}
function toTaskList(list) {
  return {
    key: list.key,
    topic: list.topic,
    title: list.title,
    createdByName: list.createdByName,
    createdAt: ms(list.createdAt),
    updatedAt: ms(list.updatedAt),
    open: list.open,
    inProgress: list.inProgress,
    done: list.done,
    dismissed: list.dismissed
  };
}
function toTask(task) {
  return {
    list: task.list,
    topic: task.topic,
    number: task.number,
    title: task.title,
    ...task.refs.length ? { refs: [...task.refs] } : {},
    status: taskStatusOf(task.status),
    createdByMemberId: task.createdByMemberId,
    createdByName: task.createdByName,
    createdAt: ms(task.createdAt),
    ...task.holder ? {
      holder: {
        memberId: task.holder.memberId,
        handle: task.holder.handle,
        name: task.holder.name,
        clientSessionId: opt(task.holder.clientSessionId),
        since: ms(task.holder.since)
      }
    } : {},
    ...task.lastProgress ? {
      lastProgress: {
        text: task.lastProgress.text,
        percent: task.lastProgress.percent,
        authorName: task.lastProgress.authorName,
        at: ms(task.lastProgress.at)
      }
    } : {},
    progressCount: task.progressCount,
    closedByName: opt(task.closedByName),
    closedAt: task.closedAt ? ms(task.closedAt) : void 0,
    resolution: opt(task.resolution),
    updatedAt: ms(task.updatedAt)
  };
}
function toWireMessageType(value) {
  switch (value) {
    case "question":
      return MessageType.QUESTION;
    case "done":
      return MessageType.DONE;
    case "note":
      return MessageType.NOTE;
    default:
      return MessageType.UNSPECIFIED;
  }
}
function statusOf(value) {
  switch (value) {
    case MemberStatus.ONLINE:
      return "online";
    case MemberStatus.IDLE:
      return "idle";
    default:
      return "offline";
  }
}
function toMessage(message) {
  const local = {
    seq: message.seq,
    channel: message.channel,
    fromMemberId: message.fromMemberId,
    fromName: message.fromName,
    fromHandle: message.fromHandle,
    fromTopic: message.fromTopic,
    ...message.fromClientSessionId ? { fromClientSessionId: message.fromClientSessionId } : {},
    to: {
      ...message.to?.memberId ? { memberId: message.to.memberId } : {},
      ...message.to?.handle ? { handle: message.to.handle } : {},
      ...message.to?.topic ? { topic: message.to.topic } : {},
      ...message.to?.clientSessionId ? { clientSessionId: message.to.clientSessionId } : {}
    },
    type: messageTypeOf(message.type),
    text: message.text,
    urgency: urgencyOf(message.urgency),
    ...message.refs.length ? { refs: [...message.refs] } : {},
    sentAt: ms(message.sentAt)
  };
  const payload = message.payload;
  switch (payload.case) {
    case "done":
      local.done = { task: payload.value.task, automatic: payload.value.automatic };
      break;
    case "claim":
      local.claim = { claimId: payload.value.claimId, expiresAt: ms(payload.value.expiresAt) };
      break;
    case "release":
      local.release = { claimId: payload.value.claimId };
      break;
    case "context":
      local.context = { key: payload.value.key, version: payload.value.version };
      break;
    case "task":
      if (payload.value.list) {
        local.task = {
          list: toTaskList(payload.value.list),
          numbers: [...payload.value.numbers],
          event: taskEventOf(payload.value.event),
          ...payload.value.previousHolderName ? { previousHolderName: payload.value.previousHolderName } : {}
        };
      }
      break;
    default:
      break;
  }
  return local;
}
function toMember(member) {
  return {
    memberId: member.memberId,
    displayName: member.displayName,
    handle: member.handle,
    status: statusOf(member.status),
    repo: opt(member.repo),
    branch: opt(member.branch),
    connections: member.connections,
    topics: [...member.topics],
    lastSeenAt: ms(member.lastSeenAt),
    sessions: member.sessions.map((session) => ({
      clientSessionId: session.clientSessionId,
      topic: session.topic,
      repo: opt(session.repo),
      branch: opt(session.branch),
      connectedAt: ms(session.connectedAt)
    }))
  };
}
function toClaim(claim) {
  return {
    claimId: claim.claimId,
    ownerMemberId: claim.ownerMemberId,
    ownerName: claim.ownerName,
    topic: claim.topic,
    paths: [...claim.paths],
    note: opt(claim.note),
    createdAt: ms(claim.createdAt),
    expiresAt: ms(claim.expiresAt)
  };
}
function toContextSummary(entry) {
  return {
    key: entry.key,
    version: entry.version,
    title: entry.title,
    summary: entry.summary,
    authorName: entry.authorName,
    createdAt: ms(entry.createdAt)
  };
}
function toContextEntry(entry) {
  return { ...toContextSummary(entry), body: entry.body, authorMemberId: entry.authorMemberId };
}
function toSnapshot(state) {
  return {
    channel: state.channel,
    self: state.selfMemberId,
    handle: state.handle,
    topic: state.topic,
    members: state.members.map(toMember),
    claims: state.claims.map(toClaim),
    contextIndex: state.contextIndex.map(toContextSummary),
    taskLists: state.taskLists.map(toTaskList),
    messages: state.messages.map(toMessage),
    cursor: state.cursor,
    latestSeq: state.latestSeq
  };
}
function toSendRequest(message) {
  const done = message.type === "done" && message.done?.task ? create(DonePayloadSchema, { task: message.done.task, automatic: message.done.automatic ?? false }) : void 0;
  return create(SendRequestSchema, {
    type: toWireMessageType(message.type),
    text: message.text,
    to: { handle: message.to.handle ?? "", topic: message.to.topic ?? "", clientSessionId: message.to.clientSessionId ?? "" },
    urgency: toWireUrgency(message.urgency),
    refs: message.refs ?? [],
    ...done ? { done } : {}
  });
}
function toSendResult(response) {
  return { seq: response.seq, delivered: response.delivered, deliveredOffline: response.deliveredOffline };
}

// src/lib/frames.ts
var WS_FRAME_LIMIT_BYTES = 12e4;
function clientFrame(request, requestId = "") {
  return create(ClientFrameSchema, { requestId, request });
}
function encodeFrame(frame) {
  return encode(ClientFrameSchema, frame);
}
function decodeServerFrame(text) {
  return decode(ServerFrameSchema, text);
}
function subscribeFrame(options) {
  return clientFrame({
    case: "subscribe",
    value: {
      client: { name: PLUGIN_NAME, version: PLUGIN_VERSION, protocol: PROTOCOL, capabilities: [] },
      ...options.since === void 0 ? {} : { since: options.since },
      repo: options.repo ?? "",
      branch: options.branch ?? ""
    }
  });
}
function fatalReason(code, message) {
  switch (code) {
    case ErrorCode.UNSUPPORTED_PROTOCOL:
      return `the channel backend does not speak this plugin's protocol (collab.v1, ${formatVersion(PROTOCOL)}): ${message}. Update collab-channel, or point api_endpoint at a 1.0 backend.`;
    case ErrorCode.REVOKED:
      return `this member was revoked on the channel (${message}). Ask whoever runs it for a new invite.`;
    default:
      return void 0;
  }
}
var ServerError = class extends Error {
  constructor(code, message) {
    super(`${ErrorCode[code] ?? "INTERNAL"}: ${message}`);
    this.code = code;
  }
  code;
};
function handleServerFrame(frame, ctx) {
  const id = ctx.clientSessionId;
  const event = frame.frame;
  switch (event.case) {
    case "hello": {
      if (!event.value.state) {
        ctx.log("hello without state");
        return false;
      }
      const state = toSnapshot(event.value.state);
      if (ctx.freshHello) {
        const cursor = readCursor(id);
        writeCursor(id, { delivered: Math.max(cursor.delivered, state.cursor), acked: Math.max(cursor.acked, state.cursor) });
      }
      for (const message of state.messages) ctx.ingest(message, { quiet: true });
      const protocol = event.value.protocol ? formatVersion(event.value.protocol) : "?";
      writeLocalState(id, {
        connected: true,
        channel: state.channel,
        self: state.self,
        handle: state.handle,
        topic: state.topic,
        members: state.members,
        claims: state.claims,
        contextIndex: state.contextIndex,
        taskLists: state.taskLists,
        // The hello carries the lists' counts but not the tasks: the daemon reads them next.
        tasksStale: true,
        latestSeq: state.latestSeq,
        lastError: void 0,
        fatal: void 0,
        server: `${event.value.serverVersion || "unknown"} (protocol ${protocol})`
      });
      return true;
    }
    case "message": {
      const message = toMessage(event.value);
      ctx.ingest(message, { quiet: false });
      writeLocalState(id, { latestSeq: Math.max(readLocalState(id).latestSeq, message.seq) });
      if (message.task) applyTaskList(id, message.task.list);
      return false;
    }
    case "presence":
      writeLocalState(id, { members: event.value.members.map(toMember) });
      return false;
    case "claims": {
      const topic = readLocalState(id).topic;
      if (event.value.topic && topic && event.value.topic !== topic) return false;
      writeLocalState(id, { claims: event.value.claims.map(toClaim) });
      return false;
    }
    case "context": {
      const entry = toContextSummary(event.value);
      const index = readLocalState(id).contextIndex.filter((e) => e.key !== entry.key);
      writeLocalState(id, { contextIndex: [entry, ...index] });
      return false;
    }
    case "result":
      if (event.value.requestId) ctx.settle(event.value.requestId, { response: event.value.response });
      return false;
    case "error": {
      const { code, message, requestId } = event.value;
      const reason = fatalReason(code, message);
      if (reason) ctx.fatal(reason);
      if (requestId && ctx.settle(requestId, { error: new ServerError(code, message) })) return false;
      if (!reason) ctx.log("server error", ErrorCode[code] ?? code, message);
      return false;
    }
    default:
      return false;
  }
}

// src/lib/notify.ts
import { spawn } from "node:child_process";
function notifyDesktop(title, body) {
  try {
    switch (process.platform) {
      case "win32":
        return windowsToast(title, body);
      case "darwin":
        return macNotification(title, body);
      default:
        return linuxNotification(title, body);
    }
  } catch {
  }
}
function detach(command, args) {
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => void 0);
  child.unref();
}
function windowsToast(title, body) {
  const appId = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";
  const script = `
$ErrorActionPreference='SilentlyContinue'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$texts = $template.GetElementsByTagName('text')
$texts.Item(0).AppendChild($template.CreateTextNode(${psLiteral(title)})) > $null
$texts.Item(1).AppendChild($template.CreateTextNode(${psLiteral(body)})) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(${psLiteral(appId)}).Show($toast)
`.trim();
  detach("powershell", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script]);
}
function macNotification(title, body) {
  detach("osascript", ["-e", `display notification ${osaLiteral(body)} with title ${osaLiteral(title)}`]);
}
function linuxNotification(title, body) {
  detach("notify-send", [title, body]);
}
function psLiteral(value) {
  return `'${value.replace(/'/g, "''").replace(/[\r\n]+/g, " ")}'`;
}
function osaLiteral(value) {
  return `"${value.replace(/["\\]/g, "\\$&").replace(/[\r\n]+/g, " ")}"`;
}

// src/lib/process.ts
import { execFile } from "node:child_process";
import fs3 from "node:fs";
function readCommandLine(pid) {
  if (process.platform === "linux") {
    try {
      return Promise.resolve(fs3.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").join(" ").trim());
    } catch {
      return Promise.resolve(void 0);
    }
  }
  const [command, args] = process.platform === "win32" ? ["powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `(Get-CimInstance Win32_Process -Filter "ProcessId=${Math.trunc(pid)}").CommandLine`
  ]] : ["ps", ["-o", "command=", "-p", String(Math.trunc(pid))]];
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 1e4, windowsHide: true }, (err, stdout) => {
      resolve(err ? void 0 : stdout.trim() || void 0);
    });
  });
}
var SPARE = /(^|\s)(--)?bg-spare(\s|=|$)/;
function becameSpare(atStart, now) {
  return atStart !== void 0 && now !== void 0 && !SPARE.test(atStart) && SPARE.test(now);
}

// src/daemon.ts
var MAX_LIFETIME_MS = 12 * 60 * 60 * 1e3;
var RECONNECT_BASE_MS = 500;
var RECONNECT_MAX_MS = 3e4;
var MCP_GONE_MS = 3 * 60 * 1e3;
var TASK_REFRESH_DEBOUNCE_MS = 300;
var clientSessionId = process.env.COLLAB_CLIENT_SESSION_ID ?? "default";
var claudePid = Number(process.env.COLLAB_CLAUDE_PID) || void 0;
var sessionCwd = process.env.COLLAB_CWD || process.cwd();
var sessionRepo = process.env.COLLAB_REPO || path3.basename(sessionCwd);
var sessionBranch = process.env.COLLAB_BRANCH || gitBranch(sessionCwd);
var logFile = path3.join(sessionDir(clientSessionId), "daemon.log");
function log(...parts) {
  const line = `${(/* @__PURE__ */ new Date()).toISOString()} ${parts.map((p) => typeof p === "string" ? p : JSON.stringify(p)).join(" ")}
`;
  try {
    fs4.mkdirSync(path3.dirname(logFile), { recursive: true });
    fs4.appendFileSync(logFile, line);
  } catch {
  }
}
var SocketUnavailable = class extends Error {
};
var Daemon = class {
  constructor(config, creds, origin) {
    this.config = config;
    this.creds = creds;
    this.origin = origin;
  }
  config;
  creds;
  origin;
  ws;
  /** True once the server answered this socket's subscribe with `hello`: before
   *  that it rejects every other frame. */
  subscribed = false;
  reconnectDelay = RECONNECT_BASE_MS;
  stopping = false;
  /** Set when the server refused this client for good: no more reconnects. */
  fatal;
  nextRequestId = 1;
  pending = /* @__PURE__ */ new Map();
  waiters = /* @__PURE__ */ new Set();
  token = crypto.randomBytes(24).toString("base64url");
  /** The last subscribe asked the server where to start, so its hello sets the local cursor. */
  freshHello = false;
  /** The Claude Code process's command line when this daemon started, to notice it turning into a spare. */
  claudeCommandLine;
  /** Last time the watchdog saw an MCP server of this plugin under the Claude Code process. */
  mcpSeenAt;
  async start() {
    const port = await this.startLoopbackServer();
    writeDaemonInfo({
      pid: process.pid,
      port,
      token: this.token,
      startedAt: Date.now(),
      clientSessionId,
      cwd: sessionCwd,
      claudePid
    });
    log("daemon started", { pid: process.pid, port, channel: this.creds.channel, topic: this.origin.topic });
    this.connect();
    if (claudePid && process.platform !== "win32") {
      void readCommandLine(claudePid).then((line) => {
        this.claudeCommandLine = line;
      });
    }
    setInterval(() => this.heartbeat(), HEARTBEAT_SECONDS * 1e3).unref();
    setInterval(() => this.watchdog(), 6e4).unref();
    setTimeout(() => this.shutdown("max lifetime reached"), MAX_LIFETIME_MS).unref();
    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.on(signal, () => this.shutdown(`received ${signal}`));
    }
  }
  /* ── WebSocket ────────────────────────────────────────────────────────── */
  connect() {
    if (this.stopping || this.fatal) return;
    issueTicket(this.creds, this.origin).then(({ ticket, wsEndpoint }) => {
      const url = `${wsEndpoint || this.creds.wsEndpoint}?ticket=${encodeURIComponent(ticket)}`;
      const ws = new wrapper_default(url);
      this.ws = ws;
      ws.on("open", () => {
        this.reconnectDelay = RECONNECT_BASE_MS;
        log("connected");
        const since = replayFrom();
        this.freshHello = since === void 0;
        ws.send(encodeFrame(subscribeFrame({ since, repo: sessionRepo, branch: sessionBranch })));
      });
      ws.on("message", (data) => this.onServerFrame(data.toString()));
      ws.on("close", (code) => {
        this.subscribed = false;
        this.failPending(new SocketUnavailable("the socket closed"));
        log("closed", { code });
        this.scheduleReconnect();
      });
      ws.on("error", (err) => {
        log("socket error", err.message);
      });
    }).catch((err) => {
      log("ticket failed", err.message);
      const reason = err instanceof ApiError ? fatalReason(err.code, err.message) : void 0;
      if (reason) return this.markFatal(reason);
      writeLocalState(clientSessionId, { connected: false, lastError: err.message });
      this.scheduleReconnect();
    });
  }
  scheduleReconnect() {
    if (this.stopping || this.fatal) return;
    writeLocalState(clientSessionId, { connected: false });
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(delay * 2, RECONNECT_MAX_MS);
    setTimeout(() => this.connect(), delay).unref();
  }
  /** Shown by the hooks and collab_status, so a closed socket says why. */
  markFatal(reason) {
    if (this.fatal) return;
    this.fatal = reason;
    this.subscribed = false;
    log("refused by the server, not reconnecting:", reason);
    writeLocalState(clientSessionId, { connected: false, lastError: reason, fatal: reason });
    try {
      this.ws?.close();
    } catch {
    }
  }
  onServerFrame(text) {
    let frame;
    try {
      frame = decodeServerFrame(text);
    } catch (err) {
      log("unreadable frame", err.message);
      return;
    }
    const helloApplied = handleServerFrame(frame, {
      clientSessionId,
      freshHello: this.freshHello,
      ingest: (message, { quiet }) => this.ingest(message, { quiet }),
      settle: (requestId, outcome) => {
        const pending = this.pending.get(requestId);
        if (!pending) return false;
        clearTimeout(pending.timer);
        this.pending.delete(requestId);
        if ("error" in outcome) pending.reject(outcome.error);
        else pending.resolve(outcome.response);
        return true;
      },
      fatal: (reason) => this.markFatal(reason),
      log
    });
    if (helloApplied) {
      this.freshHello = false;
      this.subscribed = true;
      void this.refreshTasks();
    }
  }
  /**
   * Keeps whatever the server sends. It never sends a session its own
   * messages; one from this member came from another of its sessions.
   */
  ingest(message, { quiet = false } = {}) {
    appendInbox(clientSessionId, message);
    for (const waiter of this.waiters) waiter();
    if (message.task && !quiet) this.scheduleTaskRefresh();
    const worthAToast = !quiet && this.config.desktopNotifications && (message.type === "done" || message.urgency === "high");
    if (worthAToast) {
      notifyDesktop(
        message.type === "done" ? `${message.fromName} finished a task` : `${message.fromName} says`,
        message.text
      );
    }
  }
  heartbeat() {
    if (this.isOpen()) this.sendFrame({ case: "heartbeat", value: {} });
    truncateInbox(clientSessionId);
  }
  /** Exits when the session that owns this daemon has clearly moved on. */
  watchdog() {
    try {
      const info = JSON.parse(fs4.readFileSync(path3.join(sessionDir(clientSessionId), "daemon.json"), "utf8"));
      if (info.pid !== process.pid) return this.shutdown("another daemon took over this session");
    } catch {
      return this.shutdown("daemon registration disappeared");
    }
    if (claudePid && !isAlive(claudePid)) return this.shutdown("its Claude Code process exited");
    if (claudePid) this.checkSessionStillThere(claudePid);
  }
  /**
   * The Claude Code process can outlive the session this daemon serves: it can
   * turn into a background spare (`claude bg-spare`) with SessionEnd never
   * getting through, and then this daemon stays connected as a session nobody
   * reads. Two signs that the session is over while its process lives on: the
   * process became a spare since this daemon started, or no MCP server of this
   * plugin has run under that process for a while (Claude Code runs it for as
   * long as it keeps a session's tools, and keeps it across a /clear). The
   * second only counts once one was seen, since a session can run without it.
   * Past both, the next session start in that process retires this daemon, and
   * the 12 h cap ends it anyway.
   */
  checkSessionStillThere(pid) {
    if (liveMcpServers(pid).length > 0) {
      this.mcpSeenAt = Date.now();
    } else if (this.mcpSeenAt && Date.now() - this.mcpSeenAt > MCP_GONE_MS) {
      return this.shutdown("the MCP server of its session is gone: the session ended");
    }
    const atStart = this.claudeCommandLine;
    if (atStart === void 0) return;
    void readCommandLine(pid).then((now) => {
      if (becameSpare(atStart, now)) this.shutdown("its Claude Code process became a background spare: the session ended");
    });
  }
  isOpen() {
    return this.subscribed && this.ws?.readyState === wrapper_default.OPEN;
  }
  /** Fire and forget: no request id, so the server sends no result (errors still come). */
  sendFrame(request) {
    if (this.isOpen()) this.ws.send(encodeFrame(clientFrame(request)));
  }
  failPending(err) {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      this.pending.delete(id);
      pending.reject(err);
    }
  }
  /**
   * One unary call: over the socket when it is subscribed and the frame fits,
   * otherwise over HTTP, which carries every unary call too. An answer from the
   * server, error or not, is final; only a socket that could not carry the
   * request falls back.
   */
  async request(init, timeoutMs = 1e4) {
    const requestId = `d${this.nextRequestId++}`;
    const frame = clientFrame(init, requestId);
    const request = frame.request;
    if (request.case === void 0 || request.case === "subscribe") throw new Error("not a unary request");
    const text = encodeFrame(frame);
    if (this.isOpen() && Buffer.byteLength(text) <= WS_FRAME_LIMIT_BYTES) {
      try {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            this.pending.delete(requestId);
            reject(new SocketUnavailable("timed out waiting for the server"));
          }, timeoutMs);
          this.pending.set(requestId, { resolve, reject, timer });
          this.ws.send(text);
        });
      } catch (err) {
        if (!(err instanceof SocketUnavailable)) throw err;
        log("socket request failed, falling back to HTTP", err.message);
      }
    }
    return this.overHttp(() => channelViaHttp(this.creds, this.origin, request));
  }
  /** An HTTP call on the socket's behalf. A refusal no retry can fix stops the reconnects too. */
  async overHttp(call2) {
    try {
      return await call2();
    } catch (err) {
      const reason = err instanceof ApiError ? fatalReason(err.code, err.message) : void 0;
      if (reason) this.markFatal(reason);
      throw err;
    }
  }
  /* ── Loopback API ─────────────────────────────────────────────────────── */
  startLoopbackServer() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((err) => {
        respond(res, 500, { error: err.message });
      });
    });
    return new Promise((resolve, reject) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("could not determine loopback port"));
      });
      server.on("error", reject);
    });
  }
  async handleRequest(req, res) {
    if (req.headers["x-collab-token"] !== this.token) return respond(res, 401, { error: "bad token" });
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const body = await readBody(req);
    switch (`${req.method} ${url.pathname}`) {
      case "GET /status":
        return respond(res, 200, {
          ...readLocalState(clientSessionId),
          // Live socket state wins over whatever the last snapshot recorded.
          connected: this.isOpen(),
          cursor: readCursor(clientSessionId),
          channel: this.creds.channel,
          self: this.creds.memberId,
          displayName: this.creds.displayName,
          topic: this.origin.topic,
          clientSessionId: this.origin.clientSessionId
        });
      case "POST /send":
        return respond(res, 200, await this.send(body));
      case "POST /ack": {
        const cursor = Math.max(0, Math.trunc(Number(body.cursor ?? 0)) || 0);
        const current = readCursor(clientSessionId);
        writeCursor(clientSessionId, { delivered: Math.max(current.delivered, cursor), acked: Math.max(current.acked, cursor) });
        if (this.isOpen()) this.sendFrame({ case: "ack", value: { cursor } });
        else await ackViaHttp(this.creds, this.origin, cursor).catch((err) => log("offline ack failed", err.message));
        return respond(res, 200, { ok: true });
      }
      case "GET /wait": {
        const timeoutMs = Math.min(6e5, Number(url.searchParams.get("timeoutMs") ?? 6e4));
        const types = (url.searchParams.get("types") ?? "").split(",").filter(Boolean);
        const minUrgency = url.searchParams.get("minUrgency");
        const sinceParam = url.searchParams.get("since");
        const since = sinceParam !== null ? Number(sinceParam) : readInbox(clientSessionId).at(-1)?.seq ?? 0;
        const abort = new AbortController();
        res.on("close", () => abort.abort());
        const { messages, trigger } = await this.waitForMessages({
          since,
          timeoutMs,
          types,
          minUrgency: minUrgency && minUrgency in URGENCY_RANK ? minUrgency : void 0,
          signal: abort.signal
        });
        return respond(res, 200, { message: trigger, messages });
      }
      case "POST /claim": {
        const response = await this.request({
          case: "claim",
          value: {
            paths: Array.isArray(body.paths) ? body.paths.map(String) : [],
            note: typeof body.note === "string" ? body.note : "",
            ttlSeconds: typeof body.ttlSeconds === "number" ? Math.max(0, Math.round(body.ttlSeconds)) : 0
          }
        });
        if (response.case !== "claim" || !response.value.claim) throw new Error("unexpected answer to a claim");
        return respond(res, 200, toClaim(response.value.claim));
      }
      case "POST /release": {
        const response = await this.request({ case: "release", value: { claimId: String(body.claimId ?? "") } });
        if (response.case !== "release") throw new Error("unexpected answer to a release");
        return respond(res, 200, { released: response.value.released });
      }
      case "POST /context": {
        const response = await this.request({
          case: "putContext",
          value: {
            key: String(body.key ?? ""),
            title: String(body.title ?? ""),
            summary: String(body.summary ?? ""),
            body: String(body.body ?? "")
          }
        });
        if (response.case !== "putContext" || !response.value.entry) throw new Error("unexpected answer to a context write");
        return respond(res, 200, toContextEntry(response.value.entry));
      }
      case "GET /context": {
        const version = Number(url.searchParams.get("version"));
        const response = await this.request({
          case: "getContext",
          value: {
            key: url.searchParams.get("key") ?? "",
            ...Number.isInteger(version) && version > 0 ? { version } : {},
            topic: url.searchParams.get("topic") ?? ""
          }
        });
        if (response.case !== "getContext" || !response.value.entry) throw new Error("unexpected answer to a context read");
        return respond(res, 200, toContextEntry(response.value.entry));
      }
      case "GET /tasks":
        return respond(res, 200, await this.tasks(() => this.listTasks(url.searchParams)));
      case "POST /tasks/add":
        return respond(res, 200, await this.tasks(() => this.addTasks(body)));
      case "POST /tasks/update":
        return respond(res, 200, await this.tasks(() => this.updateTask(body)));
      case "POST /presence":
        this.sendFrame({
          case: "setPresence",
          value: {
            status: body.status === "idle" ? MemberStatus.IDLE : MemberStatus.ONLINE,
            repo: typeof body.repo === "string" ? body.repo : "",
            branch: typeof body.branch === "string" ? body.branch : ""
          }
        });
        return respond(res, 200, { ok: true });
      case "POST /shutdown":
        respond(res, 200, { ok: true });
        setTimeout(() => this.shutdown("session ended"), 50);
        return;
      default:
        return respond(res, 404, { error: "unknown endpoint" });
    }
  }
  /* ── Task lists ───────────────────────────────────────────────────────── */
  taskRefresh;
  /** A burst of task notices, such as a list of five added at once, needs one read, not five. */
  scheduleTaskRefresh() {
    if (this.taskRefresh) return;
    this.taskRefresh = setTimeout(() => {
      this.taskRefresh = void 0;
      void this.refreshTasks();
    }, TASK_REFRESH_DEBOUNCE_MS);
    this.taskRefresh.unref();
  }
  /**
   * Reads the topic's open tasks into state.json, for what cannot go to the
   * network itself: the session start and the statusline. A task notice says
   * which task changed, not who has it now or how far along it is, hence a read.
   */
  async refreshTasks() {
    try {
      const response = await this.overHttp(() => listTasksViaHttp(this.creds, this.origin, {
        topic: "",
        list: "",
        filter: TaskFilter.OPEN,
        limit: 0
      }));
      writeLocalState(clientSessionId, { taskLists: response.lists.map(toTaskList).filter((l) => l.open + l.inProgress > 0) });
      if (!response.truncated) applyTasks(clientSessionId, response.tasks.map(toTask));
      else writeLocalState(clientSessionId, { tasksStale: false });
    } catch (err) {
      writeLocalState(clientSessionId, { tasksStale: false });
      log("task read failed", err.message);
    }
  }
  /** A backend from before task lists answers them as an operation it does not know. */
  async tasks(run) {
    try {
      return await run();
    } catch (err) {
      const message = err.message;
      if (/names no operation|No method at/.test(message)) {
        throw new Error("the channel backend does not have task lists yet (they need collab-backend 1.0.0-rc.3 or later)");
      }
      throw err;
    }
  }
  async listTasks(params) {
    const show = params.get("show");
    const filter = show === "closed" ? TaskFilter.CLOSED : show === "all" ? TaskFilter.ALL : TaskFilter.OPEN;
    const topic = params.get("topic") ?? "";
    const list = params.get("list") ?? "";
    const response = await this.overHttp(() => listTasksViaHttp(this.creds, this.origin, {
      topic,
      list,
      filter,
      limit: Math.max(0, Math.trunc(Number(params.get("limit") ?? 0)) || 0)
    }));
    const lists = response.lists.map(toTaskList);
    const tasks = response.tasks.map(toTask);
    if (filter === TaskFilter.OPEN && (!topic || topic === this.origin.topic)) {
      if (!list) writeLocalState(clientSessionId, { taskLists: lists.filter((l) => l.open + l.inProgress > 0) });
      if (!response.truncated) applyTasks(clientSessionId, tasks, list || void 0);
    }
    return { lists, tasks, truncated: response.truncated };
  }
  /** Creates the list if the topic has none by that key, then adds to it. */
  async addTasks(body) {
    const key = String(body.list ?? "");
    const created = await this.request({ case: "createTaskList", value: { key, title: String(body.listTitle ?? "") } });
    if (created.case !== "createTaskList" || !created.value.list) throw new Error("unexpected answer to creating a task list");
    const given = Array.isArray(body.tasks) ? body.tasks : [];
    const tasks = given.map((t) => typeof t === "string" ? { title: t, refs: [] } : { title: String(t.title ?? ""), refs: toStrings(t.refs) });
    const added = await this.request({ case: "addTasks", value: { list: created.value.list.key, tasks } });
    if (added.case !== "addTasks" || !added.value.list) throw new Error("unexpected answer to adding tasks");
    const list = toTaskList(added.value.list);
    applyTaskList(clientSessionId, list);
    const addedTasks = added.value.tasks.map(toTask);
    for (const task of addedTasks) applyTask(clientSessionId, task);
    return { created: created.value.created, list, tasks: addedTasks };
  }
  async updateTask(body) {
    const note = typeof body.note === "string" ? body.note : "";
    const percent = typeof body.percent === "number" ? Math.max(0, Math.round(body.percent)) : void 0;
    const change = (() => {
      switch (body.action) {
        case "checkout":
          return { case: "checkout", value: { takeover: body.takeover === true } };
        case "progress":
          return { case: "progress", value: { text: note, ...percent === void 0 ? {} : { percent } } };
        case "release":
          return { case: "release", value: { note } };
        case "done":
          return { case: "finish", value: { summary: note } };
        case "dismiss":
          return { case: "dismiss", value: { reason: note } };
        default:
          throw new Error("action must be checkout, progress, release, done or dismiss");
      }
    })();
    const response = await this.request({
      case: "updateTask",
      value: { topic: String(body.topic ?? ""), list: String(body.list ?? ""), number: Math.max(0, Math.trunc(Number(body.number)) || 0), change }
    });
    if (response.case !== "updateTask" || !response.value.task || !response.value.list) throw new Error("unexpected answer to a task update");
    const list = toTaskList(response.value.list);
    const task = toTask(response.value.task);
    applyTaskList(clientSessionId, list);
    applyTask(clientSessionId, task);
    return { task, list };
  }
  /** Prefers the socket, falls back to plain HTTP so a send never just fails. */
  async send(message) {
    const request = toSendRequest(message);
    if (!this.isOpen()) return toSendResult(await this.overHttp(() => sendViaHttp(this.creds, this.origin, request)));
    const response = await this.request({ case: "send", value: request });
    if (response.case !== "send") throw new Error("unexpected answer to a send");
    return toSendResult(response.value);
  }
  /**
   * Long-poll over the inbox. Resolves at once when something past `since`
   * already matches, so a message that landed between two polls is never lost;
   * otherwise waits for the next matching arrival. A timeout returns nothing.
   */
  waitForMessages(options) {
    const check = () => messagesSince(clientSessionId, options.since, { types: options.types, minUrgency: options.minUrgency });
    const ready = check();
    if (ready.trigger) return Promise.resolve(ready);
    return new Promise((resolve) => {
      const done = (result) => {
        clearTimeout(timer);
        this.waiters.delete(listener);
        options.signal.removeEventListener("abort", onAbort);
        resolve(result);
      };
      const listener = () => {
        const result = check();
        if (result.trigger) done(result);
      };
      const onAbort = () => done({ messages: [] });
      const timer = setTimeout(() => done({ messages: [] }), options.timeoutMs);
      this.waiters.add(listener);
      options.signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  shutdown(reason) {
    if (this.stopping) return;
    this.stopping = true;
    log("shutting down", reason);
    try {
      this.ws?.close();
    } catch {
    }
    clearDaemonInfo(clientSessionId, process.pid);
    setTimeout(() => process.exit(0), 100).unref();
  }
};
function replayFrom() {
  const since = Math.max(readCursor(clientSessionId).acked, readInbox(clientSessionId).at(-1)?.seq ?? 0);
  return since > 0 ? since : void 0;
}
function sessionTopic(config) {
  return resolveTopic(config, sessionCwd, void 0, readLocalState(clientSessionId).topic);
}
function toStrings(value) {
  return Array.isArray(value) ? value.map(String) : [];
}
function respond(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}
async function ensureCredentials(config) {
  const existing = resolveCredentials(config);
  if (existing?.memberId && existing.secret) return existing;
  if (!config.apiEndpoint) throw new Error("collab-channel: api_endpoint is not configured (run /config)");
  if (!config.inviteCode) throw new Error("collab-channel: no credentials and no invite_code to redeem (run /config)");
  fs4.mkdirSync(dataDir(), { recursive: true });
  const lock = path3.join(dataDir(), "join.lock");
  let owned = false;
  try {
    fs4.writeFileSync(lock, String(process.pid), { flag: "wx" });
    owned = true;
  } catch {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const creds = resolveCredentials(config);
      if (creds?.secret) return creds;
    }
    throw new Error("collab-channel: timed out waiting for another session to redeem the invite");
  }
  try {
    const joined = await join(config.apiEndpoint, config.inviteCode, config.displayName);
    const creds = {
      apiEndpoint: config.apiEndpoint,
      wsEndpoint: joined.wsEndpoint,
      memberId: joined.memberId,
      secret: joined.secret,
      channel: joined.channel,
      displayName: joined.displayName,
      handle: joined.handle,
      joinedAt: Date.now()
    };
    writeCredentials(creds);
    log("joined channel", { channel: creds.channel, memberId: creds.memberId });
    return creds;
  } finally {
    if (owned) {
      try {
        fs4.unlinkSync(lock);
      } catch {
      }
    }
  }
}
async function main() {
  const config = readConfig();
  const creds = await ensureCredentials(config);
  const origin = { topic: sessionTopic(config), clientSessionId };
  writeLocalState(clientSessionId, { topic: origin.topic });
  await fetchState(creds, origin, replayFrom()).then((wire) => {
    const state = toSnapshot(wire);
    writeLocalState(clientSessionId, {
      channel: state.channel,
      self: state.self,
      handle: state.handle,
      members: state.members,
      claims: state.claims,
      contextIndex: state.contextIndex,
      taskLists: state.taskLists,
      latestSeq: state.latestSeq
    });
  }).catch((err) => log("initial state fetch failed", err.message));
  await new Daemon(config, creds, origin).start();
}
main().catch((err) => {
  log("fatal", err.message);
  writeLocalState(clientSessionId, { connected: false, lastError: err.message });
  process.exit(1);
});
