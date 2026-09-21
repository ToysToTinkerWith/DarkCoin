var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/playground-catalog.json
var require_playground_catalog = __commonJS({
  "lib/playground-catalog.json"(exports2, module2) {
    module2.exports = {
      heads: {
        crown_of_horns: "Crown of Horns",
        all_knowing: "All Knowing",
        bone: "Bone",
        dark_knight_helm: "Dark Knight Helm",
        dragon_knight_helm: "Dragon Knight Helm",
        dragon: "Dragon",
        elder: "Elder",
        gladiator_helm: "Gladiator Helm",
        purity: "Purity",
        scarred: "Scarred",
        snake: "Snake",
        undead: "Undead",
        uni_horn: "Uni Horn",
        farmer: "Farmer",
        samurai: "Samurai",
        barbarian: "Barbarian",
        gold_hermes_helm: "Gold Hermes Helm",
        silver_hermes_helm: "Silver Hermes Helm",
        pirate_bandana: "Pirate Bandana",
        skel_tonian_mask: "Skel'tonian Mask",
        frost: "Frost",
        cyclops: "Cyclops",
        slayer: "Slayer",
        ram: "Ram",
        cannibal: "Cannibal"
      },
      armour: {
        dark_knight_armour: "Dark Knight Armour",
        dragon_hunter_armour: "Dragon Hunter Armour",
        dragon_knight_armour: "Dragon Knight Armour",
        gladiator_armour: "Gladiator Armour",
        hidden_one: "Hidden One",
        magicians_robe: "Magicians Robe",
        pharaoh: "Pharaoh",
        rags: "Rags",
        shinobi: "Shinobi",
        unchained: "Unchained",
        emperor_armour: "Emperor Armour",
        elf_robe: "Elf Robe",
        leather_garb: "Leather Garb",
        executioner_robe: "Executioner Robe",
        pirate_coat: "Pirate Coat",
        rogue: "Rogue",
        arctic_shinobi: "Arctic Shinobi",
        earth_faction: "Earth-Faction",
        dragon_guard: "Dragon-Guard"
      },
      weapons: {
        arctic_dual_katana: "Arctic Dual Katana",
        chameleon_wings: "Chameleon Wings",
        dark_sword: "Dark Sword",
        dragon_longsword: "Dragon Longsword",
        dragon_staff: "Dragon Staff",
        dual_katana: "Dual Katana",
        elder_wings: "Elder Wings",
        elf_bow: "Elf Bow",
        executioner_axe: "Executioner Axe",
        fire_wings: "Fire Wings",
        hedge_knight_sword: "Hedge-Knight Sword",
        lightning_staff: "Lightning Staff",
        rusty_sword: "Rusty Sword",
        scythe: "Scythe",
        shield: "Shield",
        sickle: "Sickle",
        sketonian_sword: "Ske'tonian Sword",
        snake_wings: "Snake Wings",
        spear: "Spear",
        trident: "Trident",
        wooden_club: "Wooden Club"
      }
    };
  }
});

// lib/playground.js
var require_playground = __commonJS({
  "lib/playground.js"(exports2, module2) {
    var catalog = require_playground_catalog();
    catalog.magic = { dark_magic: "Dark Magic", fire_magic: "Fire Magic", lightning_magic: "Lightning Magic", water_magic: "Water Magic", ice_daggers: "Ice Daggers", poison_cloud: "Poison Cloud", blood_shards: "Blood-Shards" };
    catalog.extras = { crescent_moon_earring: "Crescent Moon Earring", dragon_fangs_earring: "Dragon Fangs Earring", fusion_pearl_earring: "Fusion Pearl Earring", tentacle_earring: "Tentacle Earring", hoop_earring: "Hoop Earring", golden_feathers: "Golden Feathers", battle_wound: "Battle Wound", crescent_birthmark: "Crescent-Birthmark" };
    var CHAMPION_CREATOR2 = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";
    var normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    var aliases = { dragonlongsword: "dragon_longsword", sketoniansword: "sketonian_sword", skeletonianmask: "skel_tonian_mask" };
    var SKINS2 = ["Dark Skin", "Tribal Dark Skin", "Tribal Light Skin", "Fire Dragon", "Undead", "Chameleon", "Light Skin", "Elder Dragon", "Snake"];
    function traitId(category, value) {
      if (value == null || normalize(value) === "none" || value === "") return null;
      const target = normalize(value);
      const id = Object.keys(catalog[category]).find((id2) => normalize(catalog[category][id2]) === target || normalize(id2) === target) || aliases[target];
      if (!id || !catalog[category][id]) throw new Error(`A 3D model is not available for ${value}.`);
      return id;
    }
    function resolveLoadout2(properties) {
      if (!properties || !properties.Skin) throw new Error("This champion has no readable skin trait.");
      const skin = SKINS2.find((s) => normalize(s) === normalize(properties.Skin));
      if (!skin) throw new Error(`A skin appearance is not available for ${properties.Skin}.`);
      return { skin, head: traitId("heads", properties.Head), armour: traitId("armour", properties.Armour ?? properties.Armor), weapon: traitId("weapons", properties.Weapon), magic: traitId("magic", properties.Magic), extra: traitId("extras", properties.Extra), background: properties.Background || "Dawn Background" };
    }
    function ownedChampions(assets) {
      return (Array.isArray(assets) ? assets : []).filter((row) => Number(row.amount) > 0 && row.asset?.params?.creator === CHAMPION_CREATOR2 && Number(row.asset.params.total) === 1 && !row.asset.deleted);
    }
    function movementClip(x, z, yaw, running = false) {
      if (Math.hypot(x, z) < 1e-3) return "Idle";
      const localX = x * Math.cos(yaw) - z * Math.sin(yaw), localZ = x * Math.sin(yaw) + z * Math.cos(yaw);
      const sector = (Math.round(Math.atan2(localX, localZ) / (Math.PI / 4)) + 8) % 8;
      return (running ? "Run" : "Walk") + ["", "_Forward_Right", "_Right", "_Backward_Right", "_Backward", "_Backward_Left", "_Left", "_Forward_Left"][sector];
    }
    function clampPosition(x, z, radius = 13.4) {
      const length = Math.hypot(x, z), factor = length > radius ? radius / length : 1;
      return { x: x * factor, z: z * factor };
    }
    module2.exports = { catalog, CHAMPION_CREATOR: CHAMPION_CREATOR2, SKINS: SKINS2, normalize, traitId, resolveLoadout: resolveLoadout2, ownedChampions, movementClip, clampPosition };
  }
});

// node_modules/@multiformats/base-x/src/index.js
var require_src = __commonJS({
  "node_modules/@multiformats/base-x/src/index.js"(exports2, module2) {
    "use strict";
    function base(ALPHABET) {
      if (ALPHABET.length >= 255) {
        throw new TypeError("Alphabet too long");
      }
      var BASE_MAP = new Uint8Array(256);
      for (var j = 0; j < BASE_MAP.length; j++) {
        BASE_MAP[j] = 255;
      }
      for (var i = 0; i < ALPHABET.length; i++) {
        var x = ALPHABET.charAt(i);
        var xc = x.charCodeAt(0);
        if (BASE_MAP[xc] !== 255) {
          throw new TypeError(x + " is ambiguous");
        }
        BASE_MAP[xc] = i;
      }
      var BASE = ALPHABET.length;
      var LEADER = ALPHABET.charAt(0);
      var FACTOR = Math.log(BASE) / Math.log(256);
      var iFACTOR = Math.log(256) / Math.log(BASE);
      function encode(source) {
        if (source instanceof Uint8Array) {
        } else if (ArrayBuffer.isView(source)) {
          source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        } else if (Array.isArray(source)) {
          source = Uint8Array.from(source);
        }
        if (!(source instanceof Uint8Array)) {
          throw new TypeError("Expected Uint8Array");
        }
        if (source.length === 0) {
          return "";
        }
        var zeroes = 0;
        var length = 0;
        var pbegin = 0;
        var pend = source.length;
        while (pbegin !== pend && source[pbegin] === 0) {
          pbegin++;
          zeroes++;
        }
        var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
        var b58 = new Uint8Array(size);
        while (pbegin !== pend) {
          var carry = source[pbegin];
          var i2 = 0;
          for (var it1 = size - 1; (carry !== 0 || i2 < length) && it1 !== -1; it1--, i2++) {
            carry += 256 * b58[it1] >>> 0;
            b58[it1] = carry % BASE >>> 0;
            carry = carry / BASE >>> 0;
          }
          if (carry !== 0) {
            throw new Error("Non-zero carry");
          }
          length = i2;
          pbegin++;
        }
        var it2 = size - length;
        while (it2 !== size && b58[it2] === 0) {
          it2++;
        }
        var str = LEADER.repeat(zeroes);
        for (; it2 < size; ++it2) {
          str += ALPHABET.charAt(b58[it2]);
        }
        return str;
      }
      function decodeUnsafe(source) {
        if (typeof source !== "string") {
          throw new TypeError("Expected String");
        }
        if (source.length === 0) {
          return new Uint8Array();
        }
        var psz = 0;
        if (source[psz] === " ") {
          return;
        }
        var zeroes = 0;
        var length = 0;
        while (source[psz] === LEADER) {
          zeroes++;
          psz++;
        }
        var size = (source.length - psz) * FACTOR + 1 >>> 0;
        var b256 = new Uint8Array(size);
        while (source[psz]) {
          var carry = BASE_MAP[source.charCodeAt(psz)];
          if (carry === 255) {
            return;
          }
          var i2 = 0;
          for (var it3 = size - 1; (carry !== 0 || i2 < length) && it3 !== -1; it3--, i2++) {
            carry += BASE * b256[it3] >>> 0;
            b256[it3] = carry % 256 >>> 0;
            carry = carry / 256 >>> 0;
          }
          if (carry !== 0) {
            throw new Error("Non-zero carry");
          }
          length = i2;
          psz++;
        }
        if (source[psz] === " ") {
          return;
        }
        var it4 = size - length;
        while (it4 !== size && b256[it4] === 0) {
          it4++;
        }
        var vch = new Uint8Array(zeroes + (size - it4));
        var j2 = zeroes;
        while (it4 !== size) {
          vch[j2++] = b256[it4++];
        }
        return vch;
      }
      function decode(string) {
        var buffer = decodeUnsafe(string);
        if (buffer) {
          return buffer;
        }
        throw new Error("Non-base" + BASE + " character");
      }
      return {
        encode,
        decodeUnsafe,
        decode
      };
    }
    module2.exports = base;
  }
});

// node_modules/multibase/src/util.js
var require_util = __commonJS({
  "node_modules/multibase/src/util.js"(exports2, module2) {
    "use strict";
    var textDecoder = new TextDecoder();
    var decodeText = (bytes) => textDecoder.decode(bytes);
    var textEncoder = new TextEncoder();
    var encodeText = (text) => textEncoder.encode(text);
    function concat(arrs, length) {
      const output = new Uint8Array(length);
      let offset = 0;
      for (const arr of arrs) {
        output.set(arr, offset);
        offset += arr.length;
      }
      return output;
    }
    module2.exports = { decodeText, encodeText, concat };
  }
});

// node_modules/multibase/src/base.js
var require_base = __commonJS({
  "node_modules/multibase/src/base.js"(exports2, module2) {
    "use strict";
    var { encodeText } = require_util();
    var Base = class {
      /**
       * @param {BaseName} name
       * @param {BaseCode} code
       * @param {CodecFactory} factory
       * @param {string} alphabet
       */
      constructor(name, code, factory, alphabet) {
        this.name = name;
        this.code = code;
        this.codeBuf = encodeText(this.code);
        this.alphabet = alphabet;
        this.codec = factory(alphabet);
      }
      /**
       * @param {Uint8Array} buf
       * @returns {string}
       */
      encode(buf) {
        return this.codec.encode(buf);
      }
      /**
       * @param {string} string
       * @returns {Uint8Array}
       */
      decode(string) {
        for (const char of string) {
          if (this.alphabet && this.alphabet.indexOf(char) < 0) {
            throw new Error(`invalid character '${char}' in '${string}'`);
          }
        }
        return this.codec.decode(string);
      }
    };
    module2.exports = Base;
  }
});

// node_modules/multibase/src/rfc4648.js
var require_rfc4648 = __commonJS({
  "node_modules/multibase/src/rfc4648.js"(exports2, module2) {
    "use strict";
    var decode = (string, alphabet, bitsPerChar) => {
      const codes = {};
      for (let i = 0; i < alphabet.length; ++i) {
        codes[alphabet[i]] = i;
      }
      let end = string.length;
      while (string[end - 1] === "=") {
        --end;
      }
      const out = new Uint8Array(end * bitsPerChar / 8 | 0);
      let bits = 0;
      let buffer = 0;
      let written = 0;
      for (let i = 0; i < end; ++i) {
        const value = codes[string[i]];
        if (value === void 0) {
          throw new SyntaxError("Invalid character " + string[i]);
        }
        buffer = buffer << bitsPerChar | value;
        bits += bitsPerChar;
        if (bits >= 8) {
          bits -= 8;
          out[written++] = 255 & buffer >> bits;
        }
      }
      if (bits >= bitsPerChar || 255 & buffer << 8 - bits) {
        throw new SyntaxError("Unexpected end of data");
      }
      return out;
    };
    var encode = (data, alphabet, bitsPerChar) => {
      const pad = alphabet[alphabet.length - 1] === "=";
      const mask = (1 << bitsPerChar) - 1;
      let out = "";
      let bits = 0;
      let buffer = 0;
      for (let i = 0; i < data.length; ++i) {
        buffer = buffer << 8 | data[i];
        bits += 8;
        while (bits > bitsPerChar) {
          bits -= bitsPerChar;
          out += alphabet[mask & buffer >> bits];
        }
      }
      if (bits) {
        out += alphabet[mask & buffer << bitsPerChar - bits];
      }
      if (pad) {
        while (out.length * bitsPerChar & 7) {
          out += "=";
        }
      }
      return out;
    };
    var rfc4648 = (bitsPerChar) => (alphabet) => {
      return {
        /**
         * @param {Uint8Array} input
         * @returns {string}
         */
        encode(input) {
          return encode(input, alphabet, bitsPerChar);
        },
        /**
         * @param {string} input
         * @returns {Uint8Array}
         */
        decode(input) {
          return decode(input, alphabet, bitsPerChar);
        }
      };
    };
    module2.exports = { rfc4648 };
  }
});

// node_modules/multibase/src/constants.js
var require_constants = __commonJS({
  "node_modules/multibase/src/constants.js"(exports2, module2) {
    "use strict";
    var baseX = require_src();
    var Base = require_base();
    var { rfc4648 } = require_rfc4648();
    var { decodeText, encodeText } = require_util();
    var identity = () => {
      return {
        encode: decodeText,
        decode: encodeText
      };
    };
    var constants = [
      ["identity", "\0", identity, ""],
      ["base2", "0", rfc4648(1), "01"],
      ["base8", "7", rfc4648(3), "01234567"],
      ["base10", "9", baseX, "0123456789"],
      ["base16", "f", rfc4648(4), "0123456789abcdef"],
      ["base16upper", "F", rfc4648(4), "0123456789ABCDEF"],
      ["base32hex", "v", rfc4648(5), "0123456789abcdefghijklmnopqrstuv"],
      ["base32hexupper", "V", rfc4648(5), "0123456789ABCDEFGHIJKLMNOPQRSTUV"],
      ["base32hexpad", "t", rfc4648(5), "0123456789abcdefghijklmnopqrstuv="],
      ["base32hexpadupper", "T", rfc4648(5), "0123456789ABCDEFGHIJKLMNOPQRSTUV="],
      ["base32", "b", rfc4648(5), "abcdefghijklmnopqrstuvwxyz234567"],
      ["base32upper", "B", rfc4648(5), "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"],
      ["base32pad", "c", rfc4648(5), "abcdefghijklmnopqrstuvwxyz234567="],
      ["base32padupper", "C", rfc4648(5), "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567="],
      ["base32z", "h", rfc4648(5), "ybndrfg8ejkmcpqxot1uwisza345h769"],
      ["base36", "k", baseX, "0123456789abcdefghijklmnopqrstuvwxyz"],
      ["base36upper", "K", baseX, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
      ["base58btc", "z", baseX, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"],
      ["base58flickr", "Z", baseX, "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"],
      ["base64", "m", rfc4648(6), "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"],
      ["base64pad", "M", rfc4648(6), "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="],
      ["base64url", "u", rfc4648(6), "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"],
      ["base64urlpad", "U", rfc4648(6), "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_="]
    ];
    var names = constants.reduce(
      (prev, tupple) => {
        prev[tupple[0]] = new Base(tupple[0], tupple[1], tupple[2], tupple[3]);
        return prev;
      },
      /** @type {Record<BaseName,Base>} */
      {}
    );
    var codes = constants.reduce(
      (prev, tupple) => {
        prev[tupple[1]] = names[tupple[0]];
        return prev;
      },
      /** @type {Record<BaseCode,Base>} */
      {}
    );
    module2.exports = {
      names,
      codes
    };
  }
});

// node_modules/multibase/src/index.js
var require_src2 = __commonJS({
  "node_modules/multibase/src/index.js"(exports2, module2) {
    "use strict";
    var constants = require_constants();
    var { encodeText, decodeText, concat } = require_util();
    function multibase(nameOrCode, buf) {
      if (!buf) {
        throw new Error("requires an encoded Uint8Array");
      }
      const { name, codeBuf } = encoding(nameOrCode);
      validEncode(name, buf);
      return concat([codeBuf, buf], codeBuf.length + buf.length);
    }
    function encode(nameOrCode, buf) {
      const enc = encoding(nameOrCode);
      const data = encodeText(enc.encode(buf));
      return concat([enc.codeBuf, data], enc.codeBuf.length + data.length);
    }
    function decode(data) {
      if (data instanceof Uint8Array) {
        data = decodeText(data);
      }
      const prefix = data[0];
      if (["f", "F", "v", "V", "t", "T", "b", "B", "c", "C", "h", "k", "K"].includes(prefix)) {
        data = data.toLowerCase();
      }
      const enc = encoding(
        /** @type {BaseCode} */
        data[0]
      );
      return enc.decode(data.substring(1));
    }
    function isEncoded(data) {
      if (data instanceof Uint8Array) {
        data = decodeText(data);
      }
      if (Object.prototype.toString.call(data) !== "[object String]") {
        return false;
      }
      try {
        const enc = encoding(
          /** @type {BaseCode} */
          data[0]
        );
        return enc.name;
      } catch (err) {
        return false;
      }
    }
    function validEncode(name, buf) {
      const enc = encoding(name);
      enc.decode(decodeText(buf));
    }
    function encoding(nameOrCode) {
      if (Object.prototype.hasOwnProperty.call(
        constants.names,
        /** @type {BaseName} */
        nameOrCode
      )) {
        return constants.names[
          /** @type {BaseName} */
          nameOrCode
        ];
      } else if (Object.prototype.hasOwnProperty.call(
        constants.codes,
        /** @type {BaseCode} */
        nameOrCode
      )) {
        return constants.codes[
          /** @type {BaseCode} */
          nameOrCode
        ];
      } else {
        throw new Error(`Unsupported encoding: ${nameOrCode}`);
      }
    }
    function encodingFromData(data) {
      if (data instanceof Uint8Array) {
        data = decodeText(data);
      }
      return encoding(
        /** @type {BaseCode} */
        data[0]
      );
    }
    exports2 = module2.exports = multibase;
    exports2.encode = encode;
    exports2.decode = decode;
    exports2.isEncoded = isEncoded;
    exports2.encoding = encoding;
    exports2.encodingFromData = encodingFromData;
    var names = Object.freeze(constants.names);
    var codes = Object.freeze(constants.codes);
    exports2.names = names;
    exports2.codes = codes;
  }
});

// node_modules/varint/encode.js
var require_encode = __commonJS({
  "node_modules/varint/encode.js"(exports2, module2) {
    module2.exports = encode;
    var MSB = 128;
    var REST = 127;
    var MSBALL = ~REST;
    var INT = Math.pow(2, 31);
    function encode(num, out, offset) {
      out = out || [];
      offset = offset || 0;
      var oldOffset = offset;
      while (num >= INT) {
        out[offset++] = num & 255 | MSB;
        num /= 128;
      }
      while (num & MSBALL) {
        out[offset++] = num & 255 | MSB;
        num >>>= 7;
      }
      out[offset] = num | 0;
      encode.bytes = offset - oldOffset + 1;
      return out;
    }
  }
});

// node_modules/varint/decode.js
var require_decode = __commonJS({
  "node_modules/varint/decode.js"(exports2, module2) {
    module2.exports = read2;
    var MSB = 128;
    var REST = 127;
    function read2(buf, offset) {
      var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf.length;
      do {
        if (counter >= l) {
          read2.bytes = 0;
          throw new RangeError("Could not decode varint");
        }
        b = buf[counter++];
        res += shift < 28 ? (b & REST) << shift : (b & REST) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB);
      read2.bytes = counter - offset;
      return res;
    }
  }
});

// node_modules/varint/length.js
var require_length = __commonJS({
  "node_modules/varint/length.js"(exports2, module2) {
    var N1 = Math.pow(2, 7);
    var N2 = Math.pow(2, 14);
    var N3 = Math.pow(2, 21);
    var N4 = Math.pow(2, 28);
    var N5 = Math.pow(2, 35);
    var N6 = Math.pow(2, 42);
    var N7 = Math.pow(2, 49);
    var N8 = Math.pow(2, 56);
    var N9 = Math.pow(2, 63);
    module2.exports = function(value) {
      return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
    };
  }
});

// node_modules/varint/index.js
var require_varint = __commonJS({
  "node_modules/varint/index.js"(exports2, module2) {
    module2.exports = {
      encode: require_encode(),
      decode: require_decode(),
      encodingLength: require_length()
    };
  }
});

// node_modules/multihashes/src/constants.js
var require_constants2 = __commonJS({
  "node_modules/multihashes/src/constants.js"(exports2, module2) {
    "use strict";
    var names = Object.freeze({
      "identity": 0,
      "sha1": 17,
      "sha2-256": 18,
      "sha2-512": 19,
      "sha3-512": 20,
      "sha3-384": 21,
      "sha3-256": 22,
      "sha3-224": 23,
      "shake-128": 24,
      "shake-256": 25,
      "keccak-224": 26,
      "keccak-256": 27,
      "keccak-384": 28,
      "keccak-512": 29,
      "blake3": 30,
      "murmur3-128": 34,
      "murmur3-32": 35,
      "dbl-sha2-256": 86,
      "md4": 212,
      "md5": 213,
      "bmt": 214,
      "sha2-256-trunc254-padded": 4114,
      "ripemd-128": 4178,
      "ripemd-160": 4179,
      "ripemd-256": 4180,
      "ripemd-320": 4181,
      "x11": 4352,
      "kangarootwelve": 7425,
      "sm3-256": 21325,
      "blake2b-8": 45569,
      "blake2b-16": 45570,
      "blake2b-24": 45571,
      "blake2b-32": 45572,
      "blake2b-40": 45573,
      "blake2b-48": 45574,
      "blake2b-56": 45575,
      "blake2b-64": 45576,
      "blake2b-72": 45577,
      "blake2b-80": 45578,
      "blake2b-88": 45579,
      "blake2b-96": 45580,
      "blake2b-104": 45581,
      "blake2b-112": 45582,
      "blake2b-120": 45583,
      "blake2b-128": 45584,
      "blake2b-136": 45585,
      "blake2b-144": 45586,
      "blake2b-152": 45587,
      "blake2b-160": 45588,
      "blake2b-168": 45589,
      "blake2b-176": 45590,
      "blake2b-184": 45591,
      "blake2b-192": 45592,
      "blake2b-200": 45593,
      "blake2b-208": 45594,
      "blake2b-216": 45595,
      "blake2b-224": 45596,
      "blake2b-232": 45597,
      "blake2b-240": 45598,
      "blake2b-248": 45599,
      "blake2b-256": 45600,
      "blake2b-264": 45601,
      "blake2b-272": 45602,
      "blake2b-280": 45603,
      "blake2b-288": 45604,
      "blake2b-296": 45605,
      "blake2b-304": 45606,
      "blake2b-312": 45607,
      "blake2b-320": 45608,
      "blake2b-328": 45609,
      "blake2b-336": 45610,
      "blake2b-344": 45611,
      "blake2b-352": 45612,
      "blake2b-360": 45613,
      "blake2b-368": 45614,
      "blake2b-376": 45615,
      "blake2b-384": 45616,
      "blake2b-392": 45617,
      "blake2b-400": 45618,
      "blake2b-408": 45619,
      "blake2b-416": 45620,
      "blake2b-424": 45621,
      "blake2b-432": 45622,
      "blake2b-440": 45623,
      "blake2b-448": 45624,
      "blake2b-456": 45625,
      "blake2b-464": 45626,
      "blake2b-472": 45627,
      "blake2b-480": 45628,
      "blake2b-488": 45629,
      "blake2b-496": 45630,
      "blake2b-504": 45631,
      "blake2b-512": 45632,
      "blake2s-8": 45633,
      "blake2s-16": 45634,
      "blake2s-24": 45635,
      "blake2s-32": 45636,
      "blake2s-40": 45637,
      "blake2s-48": 45638,
      "blake2s-56": 45639,
      "blake2s-64": 45640,
      "blake2s-72": 45641,
      "blake2s-80": 45642,
      "blake2s-88": 45643,
      "blake2s-96": 45644,
      "blake2s-104": 45645,
      "blake2s-112": 45646,
      "blake2s-120": 45647,
      "blake2s-128": 45648,
      "blake2s-136": 45649,
      "blake2s-144": 45650,
      "blake2s-152": 45651,
      "blake2s-160": 45652,
      "blake2s-168": 45653,
      "blake2s-176": 45654,
      "blake2s-184": 45655,
      "blake2s-192": 45656,
      "blake2s-200": 45657,
      "blake2s-208": 45658,
      "blake2s-216": 45659,
      "blake2s-224": 45660,
      "blake2s-232": 45661,
      "blake2s-240": 45662,
      "blake2s-248": 45663,
      "blake2s-256": 45664,
      "skein256-8": 45825,
      "skein256-16": 45826,
      "skein256-24": 45827,
      "skein256-32": 45828,
      "skein256-40": 45829,
      "skein256-48": 45830,
      "skein256-56": 45831,
      "skein256-64": 45832,
      "skein256-72": 45833,
      "skein256-80": 45834,
      "skein256-88": 45835,
      "skein256-96": 45836,
      "skein256-104": 45837,
      "skein256-112": 45838,
      "skein256-120": 45839,
      "skein256-128": 45840,
      "skein256-136": 45841,
      "skein256-144": 45842,
      "skein256-152": 45843,
      "skein256-160": 45844,
      "skein256-168": 45845,
      "skein256-176": 45846,
      "skein256-184": 45847,
      "skein256-192": 45848,
      "skein256-200": 45849,
      "skein256-208": 45850,
      "skein256-216": 45851,
      "skein256-224": 45852,
      "skein256-232": 45853,
      "skein256-240": 45854,
      "skein256-248": 45855,
      "skein256-256": 45856,
      "skein512-8": 45857,
      "skein512-16": 45858,
      "skein512-24": 45859,
      "skein512-32": 45860,
      "skein512-40": 45861,
      "skein512-48": 45862,
      "skein512-56": 45863,
      "skein512-64": 45864,
      "skein512-72": 45865,
      "skein512-80": 45866,
      "skein512-88": 45867,
      "skein512-96": 45868,
      "skein512-104": 45869,
      "skein512-112": 45870,
      "skein512-120": 45871,
      "skein512-128": 45872,
      "skein512-136": 45873,
      "skein512-144": 45874,
      "skein512-152": 45875,
      "skein512-160": 45876,
      "skein512-168": 45877,
      "skein512-176": 45878,
      "skein512-184": 45879,
      "skein512-192": 45880,
      "skein512-200": 45881,
      "skein512-208": 45882,
      "skein512-216": 45883,
      "skein512-224": 45884,
      "skein512-232": 45885,
      "skein512-240": 45886,
      "skein512-248": 45887,
      "skein512-256": 45888,
      "skein512-264": 45889,
      "skein512-272": 45890,
      "skein512-280": 45891,
      "skein512-288": 45892,
      "skein512-296": 45893,
      "skein512-304": 45894,
      "skein512-312": 45895,
      "skein512-320": 45896,
      "skein512-328": 45897,
      "skein512-336": 45898,
      "skein512-344": 45899,
      "skein512-352": 45900,
      "skein512-360": 45901,
      "skein512-368": 45902,
      "skein512-376": 45903,
      "skein512-384": 45904,
      "skein512-392": 45905,
      "skein512-400": 45906,
      "skein512-408": 45907,
      "skein512-416": 45908,
      "skein512-424": 45909,
      "skein512-432": 45910,
      "skein512-440": 45911,
      "skein512-448": 45912,
      "skein512-456": 45913,
      "skein512-464": 45914,
      "skein512-472": 45915,
      "skein512-480": 45916,
      "skein512-488": 45917,
      "skein512-496": 45918,
      "skein512-504": 45919,
      "skein512-512": 45920,
      "skein1024-8": 45921,
      "skein1024-16": 45922,
      "skein1024-24": 45923,
      "skein1024-32": 45924,
      "skein1024-40": 45925,
      "skein1024-48": 45926,
      "skein1024-56": 45927,
      "skein1024-64": 45928,
      "skein1024-72": 45929,
      "skein1024-80": 45930,
      "skein1024-88": 45931,
      "skein1024-96": 45932,
      "skein1024-104": 45933,
      "skein1024-112": 45934,
      "skein1024-120": 45935,
      "skein1024-128": 45936,
      "skein1024-136": 45937,
      "skein1024-144": 45938,
      "skein1024-152": 45939,
      "skein1024-160": 45940,
      "skein1024-168": 45941,
      "skein1024-176": 45942,
      "skein1024-184": 45943,
      "skein1024-192": 45944,
      "skein1024-200": 45945,
      "skein1024-208": 45946,
      "skein1024-216": 45947,
      "skein1024-224": 45948,
      "skein1024-232": 45949,
      "skein1024-240": 45950,
      "skein1024-248": 45951,
      "skein1024-256": 45952,
      "skein1024-264": 45953,
      "skein1024-272": 45954,
      "skein1024-280": 45955,
      "skein1024-288": 45956,
      "skein1024-296": 45957,
      "skein1024-304": 45958,
      "skein1024-312": 45959,
      "skein1024-320": 45960,
      "skein1024-328": 45961,
      "skein1024-336": 45962,
      "skein1024-344": 45963,
      "skein1024-352": 45964,
      "skein1024-360": 45965,
      "skein1024-368": 45966,
      "skein1024-376": 45967,
      "skein1024-384": 45968,
      "skein1024-392": 45969,
      "skein1024-400": 45970,
      "skein1024-408": 45971,
      "skein1024-416": 45972,
      "skein1024-424": 45973,
      "skein1024-432": 45974,
      "skein1024-440": 45975,
      "skein1024-448": 45976,
      "skein1024-456": 45977,
      "skein1024-464": 45978,
      "skein1024-472": 45979,
      "skein1024-480": 45980,
      "skein1024-488": 45981,
      "skein1024-496": 45982,
      "skein1024-504": 45983,
      "skein1024-512": 45984,
      "skein1024-520": 45985,
      "skein1024-528": 45986,
      "skein1024-536": 45987,
      "skein1024-544": 45988,
      "skein1024-552": 45989,
      "skein1024-560": 45990,
      "skein1024-568": 45991,
      "skein1024-576": 45992,
      "skein1024-584": 45993,
      "skein1024-592": 45994,
      "skein1024-600": 45995,
      "skein1024-608": 45996,
      "skein1024-616": 45997,
      "skein1024-624": 45998,
      "skein1024-632": 45999,
      "skein1024-640": 46e3,
      "skein1024-648": 46001,
      "skein1024-656": 46002,
      "skein1024-664": 46003,
      "skein1024-672": 46004,
      "skein1024-680": 46005,
      "skein1024-688": 46006,
      "skein1024-696": 46007,
      "skein1024-704": 46008,
      "skein1024-712": 46009,
      "skein1024-720": 46010,
      "skein1024-728": 46011,
      "skein1024-736": 46012,
      "skein1024-744": 46013,
      "skein1024-752": 46014,
      "skein1024-760": 46015,
      "skein1024-768": 46016,
      "skein1024-776": 46017,
      "skein1024-784": 46018,
      "skein1024-792": 46019,
      "skein1024-800": 46020,
      "skein1024-808": 46021,
      "skein1024-816": 46022,
      "skein1024-824": 46023,
      "skein1024-832": 46024,
      "skein1024-840": 46025,
      "skein1024-848": 46026,
      "skein1024-856": 46027,
      "skein1024-864": 46028,
      "skein1024-872": 46029,
      "skein1024-880": 46030,
      "skein1024-888": 46031,
      "skein1024-896": 46032,
      "skein1024-904": 46033,
      "skein1024-912": 46034,
      "skein1024-920": 46035,
      "skein1024-928": 46036,
      "skein1024-936": 46037,
      "skein1024-944": 46038,
      "skein1024-952": 46039,
      "skein1024-960": 46040,
      "skein1024-968": 46041,
      "skein1024-976": 46042,
      "skein1024-984": 46043,
      "skein1024-992": 46044,
      "skein1024-1000": 46045,
      "skein1024-1008": 46046,
      "skein1024-1016": 46047,
      "skein1024-1024": 46048,
      "poseidon-bls12_381-a2-fc1": 46081,
      "poseidon-bls12_381-a2-fc1-sc": 46082
    });
    module2.exports = { names };
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/vendor/base-x.js
var require_base_x = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/vendor/base-x.js"(exports2, module2) {
    "use strict";
    function base(ALPHABET, name) {
      if (ALPHABET.length >= 255) {
        throw new TypeError("Alphabet too long");
      }
      var BASE_MAP = new Uint8Array(256);
      for (var j = 0; j < BASE_MAP.length; j++) {
        BASE_MAP[j] = 255;
      }
      for (var i = 0; i < ALPHABET.length; i++) {
        var x = ALPHABET.charAt(i);
        var xc = x.charCodeAt(0);
        if (BASE_MAP[xc] !== 255) {
          throw new TypeError(x + " is ambiguous");
        }
        BASE_MAP[xc] = i;
      }
      var BASE = ALPHABET.length;
      var LEADER = ALPHABET.charAt(0);
      var FACTOR = Math.log(BASE) / Math.log(256);
      var iFACTOR = Math.log(256) / Math.log(BASE);
      function encode(source) {
        if (source instanceof Uint8Array) ;
        else if (ArrayBuffer.isView(source)) {
          source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        } else if (Array.isArray(source)) {
          source = Uint8Array.from(source);
        }
        if (!(source instanceof Uint8Array)) {
          throw new TypeError("Expected Uint8Array");
        }
        if (source.length === 0) {
          return "";
        }
        var zeroes = 0;
        var length = 0;
        var pbegin = 0;
        var pend = source.length;
        while (pbegin !== pend && source[pbegin] === 0) {
          pbegin++;
          zeroes++;
        }
        var size = (pend - pbegin) * iFACTOR + 1 >>> 0;
        var b58 = new Uint8Array(size);
        while (pbegin !== pend) {
          var carry = source[pbegin];
          var i2 = 0;
          for (var it1 = size - 1; (carry !== 0 || i2 < length) && it1 !== -1; it1--, i2++) {
            carry += 256 * b58[it1] >>> 0;
            b58[it1] = carry % BASE >>> 0;
            carry = carry / BASE >>> 0;
          }
          if (carry !== 0) {
            throw new Error("Non-zero carry");
          }
          length = i2;
          pbegin++;
        }
        var it2 = size - length;
        while (it2 !== size && b58[it2] === 0) {
          it2++;
        }
        var str = LEADER.repeat(zeroes);
        for (; it2 < size; ++it2) {
          str += ALPHABET.charAt(b58[it2]);
        }
        return str;
      }
      function decodeUnsafe(source) {
        if (typeof source !== "string") {
          throw new TypeError("Expected String");
        }
        if (source.length === 0) {
          return new Uint8Array();
        }
        var psz = 0;
        if (source[psz] === " ") {
          return;
        }
        var zeroes = 0;
        var length = 0;
        while (source[psz] === LEADER) {
          zeroes++;
          psz++;
        }
        var size = (source.length - psz) * FACTOR + 1 >>> 0;
        var b256 = new Uint8Array(size);
        while (source[psz]) {
          var carry = BASE_MAP[source.charCodeAt(psz)];
          if (carry === 255) {
            return;
          }
          var i2 = 0;
          for (var it3 = size - 1; (carry !== 0 || i2 < length) && it3 !== -1; it3--, i2++) {
            carry += BASE * b256[it3] >>> 0;
            b256[it3] = carry % 256 >>> 0;
            carry = carry / 256 >>> 0;
          }
          if (carry !== 0) {
            throw new Error("Non-zero carry");
          }
          length = i2;
          psz++;
        }
        if (source[psz] === " ") {
          return;
        }
        var it4 = size - length;
        while (it4 !== size && b256[it4] === 0) {
          it4++;
        }
        var vch = new Uint8Array(zeroes + (size - it4));
        var j2 = zeroes;
        while (it4 !== size) {
          vch[j2++] = b256[it4++];
        }
        return vch;
      }
      function decode(string) {
        var buffer = decodeUnsafe(string);
        if (buffer) {
          return buffer;
        }
        throw new Error(`Non-${name} character`);
      }
      return {
        encode,
        decodeUnsafe,
        decode
      };
    }
    var src = base;
    var _brrp__multiformats_scope_baseX = src;
    module2.exports = _brrp__multiformats_scope_baseX;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bytes.js
var require_bytes = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bytes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var empty = new Uint8Array(0);
    var toHex = (d) => d.reduce((hex, byte) => hex + byte.toString(16).padStart(2, "0"), "");
    var fromHex = (hex) => {
      const hexes = hex.match(/../g);
      return hexes ? new Uint8Array(hexes.map((b) => parseInt(b, 16))) : empty;
    };
    var equals = (aa, bb) => {
      if (aa === bb)
        return true;
      if (aa.byteLength !== bb.byteLength) {
        return false;
      }
      for (let ii = 0; ii < aa.byteLength; ii++) {
        if (aa[ii] !== bb[ii]) {
          return false;
        }
      }
      return true;
    };
    var coerce = (o) => {
      if (o instanceof Uint8Array && o.constructor.name === "Uint8Array")
        return o;
      if (o instanceof ArrayBuffer)
        return new Uint8Array(o);
      if (ArrayBuffer.isView(o)) {
        return new Uint8Array(o.buffer, o.byteOffset, o.byteLength);
      }
      throw new Error("Unknown type, must be binary type");
    };
    var isBinary = (o) => o instanceof ArrayBuffer || ArrayBuffer.isView(o);
    var fromString = (str) => new TextEncoder().encode(str);
    var toString = (b) => new TextDecoder().decode(b);
    exports2.coerce = coerce;
    exports2.empty = empty;
    exports2.equals = equals;
    exports2.fromHex = fromHex;
    exports2.fromString = fromString;
    exports2.isBinary = isBinary;
    exports2.toHex = toHex;
    exports2.toString = toString;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base.js
var require_base2 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var baseX$1 = require_base_x();
    var bytes = require_bytes();
    var Encoder = class {
      constructor(name, prefix, baseEncode) {
        this.name = name;
        this.prefix = prefix;
        this.baseEncode = baseEncode;
      }
      encode(bytes2) {
        if (bytes2 instanceof Uint8Array) {
          return `${this.prefix}${this.baseEncode(bytes2)}`;
        } else {
          throw Error("Unknown type, must be binary type");
        }
      }
    };
    var Decoder = class {
      constructor(name, prefix, baseDecode) {
        this.name = name;
        this.prefix = prefix;
        if (prefix.codePointAt(0) === void 0) {
          throw new Error("Invalid prefix character");
        }
        this.prefixCodePoint = prefix.codePointAt(0);
        this.baseDecode = baseDecode;
      }
      decode(text) {
        if (typeof text === "string") {
          if (text.codePointAt(0) !== this.prefixCodePoint) {
            throw Error(`Unable to decode multibase string ${JSON.stringify(text)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
          }
          return this.baseDecode(text.slice(this.prefix.length));
        } else {
          throw Error("Can only multibase decode strings");
        }
      }
      or(decoder) {
        return or(this, decoder);
      }
    };
    var ComposedDecoder = class {
      constructor(decoders) {
        this.decoders = decoders;
      }
      or(decoder) {
        return or(this, decoder);
      }
      decode(input) {
        const prefix = input[0];
        const decoder = this.decoders[prefix];
        if (decoder) {
          return decoder.decode(input);
        } else {
          throw RangeError(`Unable to decode multibase string ${JSON.stringify(input)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
        }
      }
    };
    var or = (left, right) => new ComposedDecoder({
      ...left.decoders || { [left.prefix]: left },
      ...right.decoders || { [right.prefix]: right }
    });
    var Codec = class {
      constructor(name, prefix, baseEncode, baseDecode) {
        this.name = name;
        this.prefix = prefix;
        this.baseEncode = baseEncode;
        this.baseDecode = baseDecode;
        this.encoder = new Encoder(name, prefix, baseEncode);
        this.decoder = new Decoder(name, prefix, baseDecode);
      }
      encode(input) {
        return this.encoder.encode(input);
      }
      decode(input) {
        return this.decoder.decode(input);
      }
    };
    var from = ({ name, prefix, encode: encode2, decode: decode2 }) => new Codec(name, prefix, encode2, decode2);
    var baseX = ({ prefix, name, alphabet }) => {
      const { encode: encode2, decode: decode2 } = baseX$1(alphabet, name);
      return from({
        prefix,
        name,
        encode: encode2,
        decode: (text) => bytes.coerce(decode2(text))
      });
    };
    var decode = (string, alphabet, bitsPerChar, name) => {
      const codes = {};
      for (let i = 0; i < alphabet.length; ++i) {
        codes[alphabet[i]] = i;
      }
      let end = string.length;
      while (string[end - 1] === "=") {
        --end;
      }
      const out = new Uint8Array(end * bitsPerChar / 8 | 0);
      let bits = 0;
      let buffer = 0;
      let written = 0;
      for (let i = 0; i < end; ++i) {
        const value = codes[string[i]];
        if (value === void 0) {
          throw new SyntaxError(`Non-${name} character`);
        }
        buffer = buffer << bitsPerChar | value;
        bits += bitsPerChar;
        if (bits >= 8) {
          bits -= 8;
          out[written++] = 255 & buffer >> bits;
        }
      }
      if (bits >= bitsPerChar || 255 & buffer << 8 - bits) {
        throw new SyntaxError("Unexpected end of data");
      }
      return out;
    };
    var encode = (data, alphabet, bitsPerChar) => {
      const pad = alphabet[alphabet.length - 1] === "=";
      const mask = (1 << bitsPerChar) - 1;
      let out = "";
      let bits = 0;
      let buffer = 0;
      for (let i = 0; i < data.length; ++i) {
        buffer = buffer << 8 | data[i];
        bits += 8;
        while (bits > bitsPerChar) {
          bits -= bitsPerChar;
          out += alphabet[mask & buffer >> bits];
        }
      }
      if (bits) {
        out += alphabet[mask & buffer << bitsPerChar - bits];
      }
      if (pad) {
        while (out.length * bitsPerChar & 7) {
          out += "=";
        }
      }
      return out;
    };
    var rfc4648 = ({ name, prefix, bitsPerChar, alphabet }) => {
      return from({
        prefix,
        name,
        encode(input) {
          return encode(input, alphabet, bitsPerChar);
        },
        decode(input) {
          return decode(input, alphabet, bitsPerChar, name);
        }
      });
    };
    exports2.Codec = Codec;
    exports2.baseX = baseX;
    exports2.from = from;
    exports2.or = or;
    exports2.rfc4648 = rfc4648;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/identity.js
var require_identity = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/identity.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var bytes = require_bytes();
    var identity = base.from({
      prefix: "\0",
      name: "identity",
      encode: (buf) => bytes.toString(buf),
      decode: (str) => bytes.fromString(str)
    });
    exports2.identity = identity;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base2.js
var require_base22 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base2 = base.rfc4648({
      prefix: "0",
      name: "base2",
      alphabet: "01",
      bitsPerChar: 1
    });
    exports2.base2 = base2;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base8.js
var require_base8 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base8.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base8 = base.rfc4648({
      prefix: "7",
      name: "base8",
      alphabet: "01234567",
      bitsPerChar: 3
    });
    exports2.base8 = base8;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base10.js
var require_base10 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base10.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base10 = base.baseX({
      prefix: "9",
      name: "base10",
      alphabet: "0123456789"
    });
    exports2.base10 = base10;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base16.js
var require_base16 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base16.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base16 = base.rfc4648({
      prefix: "f",
      name: "base16",
      alphabet: "0123456789abcdef",
      bitsPerChar: 4
    });
    var base16upper = base.rfc4648({
      prefix: "F",
      name: "base16upper",
      alphabet: "0123456789ABCDEF",
      bitsPerChar: 4
    });
    exports2.base16 = base16;
    exports2.base16upper = base16upper;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base32.js
var require_base32 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base32.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base32 = base.rfc4648({
      prefix: "b",
      name: "base32",
      alphabet: "abcdefghijklmnopqrstuvwxyz234567",
      bitsPerChar: 5
    });
    var base32upper = base.rfc4648({
      prefix: "B",
      name: "base32upper",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
      bitsPerChar: 5
    });
    var base32pad = base.rfc4648({
      prefix: "c",
      name: "base32pad",
      alphabet: "abcdefghijklmnopqrstuvwxyz234567=",
      bitsPerChar: 5
    });
    var base32padupper = base.rfc4648({
      prefix: "C",
      name: "base32padupper",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
      bitsPerChar: 5
    });
    var base32hex = base.rfc4648({
      prefix: "v",
      name: "base32hex",
      alphabet: "0123456789abcdefghijklmnopqrstuv",
      bitsPerChar: 5
    });
    var base32hexupper = base.rfc4648({
      prefix: "V",
      name: "base32hexupper",
      alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
      bitsPerChar: 5
    });
    var base32hexpad = base.rfc4648({
      prefix: "t",
      name: "base32hexpad",
      alphabet: "0123456789abcdefghijklmnopqrstuv=",
      bitsPerChar: 5
    });
    var base32hexpadupper = base.rfc4648({
      prefix: "T",
      name: "base32hexpadupper",
      alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=",
      bitsPerChar: 5
    });
    var base32z = base.rfc4648({
      prefix: "h",
      name: "base32z",
      alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769",
      bitsPerChar: 5
    });
    exports2.base32 = base32;
    exports2.base32hex = base32hex;
    exports2.base32hexpad = base32hexpad;
    exports2.base32hexpadupper = base32hexpadupper;
    exports2.base32hexupper = base32hexupper;
    exports2.base32pad = base32pad;
    exports2.base32padupper = base32padupper;
    exports2.base32upper = base32upper;
    exports2.base32z = base32z;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base36.js
var require_base36 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base36.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base36 = base.baseX({
      prefix: "k",
      name: "base36",
      alphabet: "0123456789abcdefghijklmnopqrstuvwxyz"
    });
    var base36upper = base.baseX({
      prefix: "K",
      name: "base36upper",
      alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    });
    exports2.base36 = base36;
    exports2.base36upper = base36upper;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base58.js
var require_base58 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base58.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base58btc = base.baseX({
      name: "base58btc",
      prefix: "z",
      alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    });
    var base58flickr = base.baseX({
      name: "base58flickr",
      prefix: "Z",
      alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
    });
    exports2.base58btc = base58btc;
    exports2.base58flickr = base58flickr;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base64.js
var require_base64 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base64.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var base64 = base.rfc4648({
      prefix: "m",
      name: "base64",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      bitsPerChar: 6
    });
    var base64pad = base.rfc4648({
      prefix: "M",
      name: "base64pad",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      bitsPerChar: 6
    });
    var base64url = base.rfc4648({
      prefix: "u",
      name: "base64url",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      bitsPerChar: 6
    });
    var base64urlpad = base.rfc4648({
      prefix: "U",
      name: "base64urlpad",
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=",
      bitsPerChar: 6
    });
    exports2.base64 = base64;
    exports2.base64pad = base64pad;
    exports2.base64url = base64url;
    exports2.base64urlpad = base64urlpad;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base256emoji.js
var require_base256emoji = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/bases/base256emoji.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var base = require_base2();
    var alphabet = Array.from("\u{1F680}\u{1FA90}\u2604\u{1F6F0}\u{1F30C}\u{1F311}\u{1F312}\u{1F313}\u{1F314}\u{1F315}\u{1F316}\u{1F317}\u{1F318}\u{1F30D}\u{1F30F}\u{1F30E}\u{1F409}\u2600\u{1F4BB}\u{1F5A5}\u{1F4BE}\u{1F4BF}\u{1F602}\u2764\u{1F60D}\u{1F923}\u{1F60A}\u{1F64F}\u{1F495}\u{1F62D}\u{1F618}\u{1F44D}\u{1F605}\u{1F44F}\u{1F601}\u{1F525}\u{1F970}\u{1F494}\u{1F496}\u{1F499}\u{1F622}\u{1F914}\u{1F606}\u{1F644}\u{1F4AA}\u{1F609}\u263A\u{1F44C}\u{1F917}\u{1F49C}\u{1F614}\u{1F60E}\u{1F607}\u{1F339}\u{1F926}\u{1F389}\u{1F49E}\u270C\u2728\u{1F937}\u{1F631}\u{1F60C}\u{1F338}\u{1F64C}\u{1F60B}\u{1F497}\u{1F49A}\u{1F60F}\u{1F49B}\u{1F642}\u{1F493}\u{1F929}\u{1F604}\u{1F600}\u{1F5A4}\u{1F603}\u{1F4AF}\u{1F648}\u{1F447}\u{1F3B6}\u{1F612}\u{1F92D}\u2763\u{1F61C}\u{1F48B}\u{1F440}\u{1F62A}\u{1F611}\u{1F4A5}\u{1F64B}\u{1F61E}\u{1F629}\u{1F621}\u{1F92A}\u{1F44A}\u{1F973}\u{1F625}\u{1F924}\u{1F449}\u{1F483}\u{1F633}\u270B\u{1F61A}\u{1F61D}\u{1F634}\u{1F31F}\u{1F62C}\u{1F643}\u{1F340}\u{1F337}\u{1F63B}\u{1F613}\u2B50\u2705\u{1F97A}\u{1F308}\u{1F608}\u{1F918}\u{1F4A6}\u2714\u{1F623}\u{1F3C3}\u{1F490}\u2639\u{1F38A}\u{1F498}\u{1F620}\u261D\u{1F615}\u{1F33A}\u{1F382}\u{1F33B}\u{1F610}\u{1F595}\u{1F49D}\u{1F64A}\u{1F639}\u{1F5E3}\u{1F4AB}\u{1F480}\u{1F451}\u{1F3B5}\u{1F91E}\u{1F61B}\u{1F534}\u{1F624}\u{1F33C}\u{1F62B}\u26BD\u{1F919}\u2615\u{1F3C6}\u{1F92B}\u{1F448}\u{1F62E}\u{1F646}\u{1F37B}\u{1F343}\u{1F436}\u{1F481}\u{1F632}\u{1F33F}\u{1F9E1}\u{1F381}\u26A1\u{1F31E}\u{1F388}\u274C\u270A\u{1F44B}\u{1F630}\u{1F928}\u{1F636}\u{1F91D}\u{1F6B6}\u{1F4B0}\u{1F353}\u{1F4A2}\u{1F91F}\u{1F641}\u{1F6A8}\u{1F4A8}\u{1F92C}\u2708\u{1F380}\u{1F37A}\u{1F913}\u{1F619}\u{1F49F}\u{1F331}\u{1F616}\u{1F476}\u{1F974}\u25B6\u27A1\u2753\u{1F48E}\u{1F4B8}\u2B07\u{1F628}\u{1F31A}\u{1F98B}\u{1F637}\u{1F57A}\u26A0\u{1F645}\u{1F61F}\u{1F635}\u{1F44E}\u{1F932}\u{1F920}\u{1F927}\u{1F4CC}\u{1F535}\u{1F485}\u{1F9D0}\u{1F43E}\u{1F352}\u{1F617}\u{1F911}\u{1F30A}\u{1F92F}\u{1F437}\u260E\u{1F4A7}\u{1F62F}\u{1F486}\u{1F446}\u{1F3A4}\u{1F647}\u{1F351}\u2744\u{1F334}\u{1F4A3}\u{1F438}\u{1F48C}\u{1F4CD}\u{1F940}\u{1F922}\u{1F445}\u{1F4A1}\u{1F4A9}\u{1F450}\u{1F4F8}\u{1F47B}\u{1F910}\u{1F92E}\u{1F3BC}\u{1F975}\u{1F6A9}\u{1F34E}\u{1F34A}\u{1F47C}\u{1F48D}\u{1F4E3}\u{1F942}");
    var alphabetBytesToChars = alphabet.reduce((p, c, i) => {
      p[i] = c;
      return p;
    }, []);
    var alphabetCharsToBytes = alphabet.reduce((p, c, i) => {
      p[c.codePointAt(0)] = i;
      return p;
    }, []);
    function encode(data) {
      return data.reduce((p, c) => {
        p += alphabetBytesToChars[c];
        return p;
      }, "");
    }
    function decode(str) {
      const byts = [];
      for (const char of str) {
        const byt = alphabetCharsToBytes[char.codePointAt(0)];
        if (byt === void 0) {
          throw new Error(`Non-base256emoji character: ${char}`);
        }
        byts.push(byt);
      }
      return new Uint8Array(byts);
    }
    var base256emoji = base.from({
      prefix: "\u{1F680}",
      name: "base256emoji",
      encode,
      decode
    });
    exports2.base256emoji = base256emoji;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/vendor/varint.js
var require_varint2 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/vendor/varint.js"(exports2, module2) {
    "use strict";
    var encode_1 = encode;
    var MSB = 128;
    var REST = 127;
    var MSBALL = ~REST;
    var INT = Math.pow(2, 31);
    function encode(num, out, offset) {
      out = out || [];
      offset = offset || 0;
      var oldOffset = offset;
      while (num >= INT) {
        out[offset++] = num & 255 | MSB;
        num /= 128;
      }
      while (num & MSBALL) {
        out[offset++] = num & 255 | MSB;
        num >>>= 7;
      }
      out[offset] = num | 0;
      encode.bytes = offset - oldOffset + 1;
      return out;
    }
    var decode = read2;
    var MSB$1 = 128;
    var REST$1 = 127;
    function read2(buf, offset) {
      var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf.length;
      do {
        if (counter >= l) {
          read2.bytes = 0;
          throw new RangeError("Could not decode varint");
        }
        b = buf[counter++];
        res += shift < 28 ? (b & REST$1) << shift : (b & REST$1) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB$1);
      read2.bytes = counter - offset;
      return res;
    }
    var N1 = Math.pow(2, 7);
    var N2 = Math.pow(2, 14);
    var N3 = Math.pow(2, 21);
    var N4 = Math.pow(2, 28);
    var N5 = Math.pow(2, 35);
    var N6 = Math.pow(2, 42);
    var N7 = Math.pow(2, 49);
    var N8 = Math.pow(2, 56);
    var N9 = Math.pow(2, 63);
    var length = function(value) {
      return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
    };
    var varint = {
      encode: encode_1,
      decode,
      encodingLength: length
    };
    var _brrp_varint = varint;
    var varint$1 = _brrp_varint;
    module2.exports = varint$1;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/varint.js
var require_varint3 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/varint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var varint$1 = require_varint2();
    var decode = (data, offset = 0) => {
      const code = varint$1.decode(data, offset);
      return [
        code,
        varint$1.decode.bytes
      ];
    };
    var encodeTo = (int, target, offset = 0) => {
      varint$1.encode(int, target, offset);
      return target;
    };
    var encodingLength = (int) => {
      return varint$1.encodingLength(int);
    };
    exports2.decode = decode;
    exports2.encodeTo = encodeTo;
    exports2.encodingLength = encodingLength;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/digest.js
var require_digest = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/digest.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var bytes = require_bytes();
    var varint = require_varint3();
    var create = (code, digest) => {
      const size = digest.byteLength;
      const sizeOffset = varint.encodingLength(code);
      const digestOffset = sizeOffset + varint.encodingLength(size);
      const bytes2 = new Uint8Array(digestOffset + size);
      varint.encodeTo(code, bytes2, 0);
      varint.encodeTo(size, bytes2, sizeOffset);
      bytes2.set(digest, digestOffset);
      return new Digest(code, size, digest, bytes2);
    };
    var decode = (multihash) => {
      const bytes$1 = bytes.coerce(multihash);
      const [code, sizeOffset] = varint.decode(bytes$1);
      const [size, digestOffset] = varint.decode(bytes$1.subarray(sizeOffset));
      const digest = bytes$1.subarray(sizeOffset + digestOffset);
      if (digest.byteLength !== size) {
        throw new Error("Incorrect length");
      }
      return new Digest(code, size, digest, bytes$1);
    };
    var equals = (a, b) => {
      if (a === b) {
        return true;
      } else {
        return a.code === b.code && a.size === b.size && bytes.equals(a.bytes, b.bytes);
      }
    };
    var Digest = class {
      constructor(code, size, digest, bytes2) {
        this.code = code;
        this.size = size;
        this.digest = digest;
        this.bytes = bytes2;
      }
    };
    exports2.Digest = Digest;
    exports2.create = create;
    exports2.decode = decode;
    exports2.equals = equals;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/hasher.js
var require_hasher = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/hasher.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var digest = require_digest();
    var from = ({ name, code, encode }) => new Hasher(name, code, encode);
    var Hasher = class {
      constructor(name, code, encode) {
        this.name = name;
        this.code = code;
        this.encode = encode;
      }
      digest(input) {
        if (input instanceof Uint8Array) {
          const result = this.encode(input);
          return result instanceof Uint8Array ? digest.create(this.code, result) : result.then((digest$1) => digest.create(this.code, digest$1));
        } else {
          throw Error("Unknown type, must be binary type");
        }
      }
    };
    exports2.Hasher = Hasher;
    exports2.from = from;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/sha2.js
var require_sha2 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/sha2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var crypto5 = require("crypto");
    var hasher = require_hasher();
    var bytes = require_bytes();
    function _interopDefaultLegacy(e) {
      return e && typeof e === "object" && "default" in e ? e : { "default": e };
    }
    var crypto__default = /* @__PURE__ */ _interopDefaultLegacy(crypto5);
    var sha256 = hasher.from({
      name: "sha2-256",
      code: 18,
      encode: (input) => bytes.coerce(crypto__default["default"].createHash("sha256").update(input).digest())
    });
    var sha512 = hasher.from({
      name: "sha2-512",
      code: 19,
      encode: (input) => bytes.coerce(crypto__default["default"].createHash("sha512").update(input).digest())
    });
    exports2.sha256 = sha256;
    exports2.sha512 = sha512;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/identity.js
var require_identity2 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/hashes/identity.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var bytes = require_bytes();
    var digest$1 = require_digest();
    var code = 0;
    var name = "identity";
    var encode = bytes.coerce;
    var digest = (input) => digest$1.create(code, encode(input));
    var identity = {
      code,
      name,
      encode,
      digest
    };
    exports2.identity = identity;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/codecs/raw.js
var require_raw = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/codecs/raw.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var bytes = require_bytes();
    var name = "raw";
    var code = 85;
    var encode = (node) => bytes.coerce(node);
    var decode = (data) => bytes.coerce(data);
    exports2.code = code;
    exports2.decode = decode;
    exports2.encode = encode;
    exports2.name = name;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/codecs/json.js
var require_json = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/codecs/json.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var textEncoder = new TextEncoder();
    var textDecoder = new TextDecoder();
    var name = "json";
    var code = 512;
    var encode = (node) => textEncoder.encode(JSON.stringify(node));
    var decode = (data) => JSON.parse(textDecoder.decode(data));
    exports2.code = code;
    exports2.decode = decode;
    exports2.encode = encode;
    exports2.name = name;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/cid.js
var require_cid = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/cid.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var varint = require_varint3();
    var digest = require_digest();
    var base58 = require_base58();
    var base32 = require_base32();
    var bytes = require_bytes();
    var CID = class _CID {
      constructor(version2, code, multihash, bytes2) {
        this.code = code;
        this.version = version2;
        this.multihash = multihash;
        this.bytes = bytes2;
        this.byteOffset = bytes2.byteOffset;
        this.byteLength = bytes2.byteLength;
        this.asCID = this;
        this._baseCache = /* @__PURE__ */ new Map();
        Object.defineProperties(this, {
          byteOffset: hidden,
          byteLength: hidden,
          code: readonly,
          version: readonly,
          multihash: readonly,
          bytes: readonly,
          _baseCache: hidden,
          asCID: hidden
        });
      }
      toV0() {
        switch (this.version) {
          case 0: {
            return this;
          }
          default: {
            const { code, multihash } = this;
            if (code !== DAG_PB_CODE) {
              throw new Error("Cannot convert a non dag-pb CID to CIDv0");
            }
            if (multihash.code !== SHA_256_CODE) {
              throw new Error("Cannot convert non sha2-256 multihash CID to CIDv0");
            }
            return _CID.createV0(multihash);
          }
        }
      }
      toV1() {
        switch (this.version) {
          case 0: {
            const { code, digest: digest$1 } = this.multihash;
            const multihash = digest.create(code, digest$1);
            return _CID.createV1(this.code, multihash);
          }
          case 1: {
            return this;
          }
          default: {
            throw Error(`Can not convert CID version ${this.version} to version 0. This is a bug please report`);
          }
        }
      }
      equals(other) {
        return other && this.code === other.code && this.version === other.version && digest.equals(this.multihash, other.multihash);
      }
      toString(base) {
        const { bytes: bytes2, version: version2, _baseCache } = this;
        switch (version2) {
          case 0:
            return toStringV0(bytes2, _baseCache, base || base58.base58btc.encoder);
          default:
            return toStringV1(bytes2, _baseCache, base || base32.base32.encoder);
        }
      }
      toJSON() {
        return {
          code: this.code,
          version: this.version,
          hash: this.multihash.bytes
        };
      }
      get [Symbol.toStringTag]() {
        return "CID";
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return "CID(" + this.toString() + ")";
      }
      static isCID(value) {
        deprecate(/^0\.0/, IS_CID_DEPRECATION);
        return !!(value && (value[cidSymbol] || value.asCID === value));
      }
      get toBaseEncodedString() {
        throw new Error("Deprecated, use .toString()");
      }
      get codec() {
        throw new Error('"codec" property is deprecated, use integer "code" property instead');
      }
      get buffer() {
        throw new Error("Deprecated .buffer property, use .bytes to get Uint8Array instead");
      }
      get multibaseName() {
        throw new Error('"multibaseName" property is deprecated');
      }
      get prefix() {
        throw new Error('"prefix" property is deprecated');
      }
      static asCID(value) {
        if (value instanceof _CID) {
          return value;
        } else if (value != null && value.asCID === value) {
          const { version: version2, code, multihash, bytes: bytes2 } = value;
          return new _CID(version2, code, multihash, bytes2 || encodeCID(version2, code, multihash.bytes));
        } else if (value != null && value[cidSymbol] === true) {
          const { version: version2, multihash, code } = value;
          const digest$1 = digest.decode(multihash);
          return _CID.create(version2, code, digest$1);
        } else {
          return null;
        }
      }
      static create(version2, code, digest2) {
        if (typeof code !== "number") {
          throw new Error("String codecs are no longer supported");
        }
        switch (version2) {
          case 0: {
            if (code !== DAG_PB_CODE) {
              throw new Error(`Version 0 CID must use dag-pb (code: ${DAG_PB_CODE}) block encoding`);
            } else {
              return new _CID(version2, code, digest2, digest2.bytes);
            }
          }
          case 1: {
            const bytes2 = encodeCID(version2, code, digest2.bytes);
            return new _CID(version2, code, digest2, bytes2);
          }
          default: {
            throw new Error("Invalid version");
          }
        }
      }
      static createV0(digest2) {
        return _CID.create(0, DAG_PB_CODE, digest2);
      }
      static createV1(code, digest2) {
        return _CID.create(1, code, digest2);
      }
      static decode(bytes2) {
        const [cid, remainder] = _CID.decodeFirst(bytes2);
        if (remainder.length) {
          throw new Error("Incorrect length");
        }
        return cid;
      }
      static decodeFirst(bytes$1) {
        const specs = _CID.inspectBytes(bytes$1);
        const prefixSize = specs.size - specs.multihashSize;
        const multihashBytes = bytes.coerce(bytes$1.subarray(prefixSize, prefixSize + specs.multihashSize));
        if (multihashBytes.byteLength !== specs.multihashSize) {
          throw new Error("Incorrect length");
        }
        const digestBytes = multihashBytes.subarray(specs.multihashSize - specs.digestSize);
        const digest$1 = new digest.Digest(specs.multihashCode, specs.digestSize, digestBytes, multihashBytes);
        const cid = specs.version === 0 ? _CID.createV0(digest$1) : _CID.createV1(specs.codec, digest$1);
        return [
          cid,
          bytes$1.subarray(specs.size)
        ];
      }
      static inspectBytes(initialBytes) {
        let offset = 0;
        const next = () => {
          const [i, length] = varint.decode(initialBytes.subarray(offset));
          offset += length;
          return i;
        };
        let version2 = next();
        let codec = DAG_PB_CODE;
        if (version2 === 18) {
          version2 = 0;
          offset = 0;
        } else if (version2 === 1) {
          codec = next();
        }
        if (version2 !== 0 && version2 !== 1) {
          throw new RangeError(`Invalid CID version ${version2}`);
        }
        const prefixSize = offset;
        const multihashCode = next();
        const digestSize = next();
        const size = offset + digestSize;
        const multihashSize = size - prefixSize;
        return {
          version: version2,
          codec,
          multihashCode,
          digestSize,
          multihashSize,
          size
        };
      }
      static parse(source, base) {
        const [prefix, bytes2] = parseCIDtoBytes(source, base);
        const cid = _CID.decode(bytes2);
        cid._baseCache.set(prefix, source);
        return cid;
      }
    };
    var parseCIDtoBytes = (source, base) => {
      switch (source[0]) {
        case "Q": {
          const decoder = base || base58.base58btc;
          return [
            base58.base58btc.prefix,
            decoder.decode(`${base58.base58btc.prefix}${source}`)
          ];
        }
        case base58.base58btc.prefix: {
          const decoder = base || base58.base58btc;
          return [
            base58.base58btc.prefix,
            decoder.decode(source)
          ];
        }
        case base32.base32.prefix: {
          const decoder = base || base32.base32;
          return [
            base32.base32.prefix,
            decoder.decode(source)
          ];
        }
        default: {
          if (base == null) {
            throw Error("To parse non base32 or base58btc encoded CID multibase decoder must be provided");
          }
          return [
            source[0],
            base.decode(source)
          ];
        }
      }
    };
    var toStringV0 = (bytes2, cache, base) => {
      const { prefix } = base;
      if (prefix !== base58.base58btc.prefix) {
        throw Error(`Cannot string encode V0 in ${base.name} encoding`);
      }
      const cid = cache.get(prefix);
      if (cid == null) {
        const cid2 = base.encode(bytes2).slice(1);
        cache.set(prefix, cid2);
        return cid2;
      } else {
        return cid;
      }
    };
    var toStringV1 = (bytes2, cache, base) => {
      const { prefix } = base;
      const cid = cache.get(prefix);
      if (cid == null) {
        const cid2 = base.encode(bytes2);
        cache.set(prefix, cid2);
        return cid2;
      } else {
        return cid;
      }
    };
    var DAG_PB_CODE = 112;
    var SHA_256_CODE = 18;
    var encodeCID = (version2, code, multihash) => {
      const codeOffset = varint.encodingLength(version2);
      const hashOffset = codeOffset + varint.encodingLength(code);
      const bytes2 = new Uint8Array(hashOffset + multihash.byteLength);
      varint.encodeTo(version2, bytes2, 0);
      varint.encodeTo(code, bytes2, codeOffset);
      bytes2.set(multihash, hashOffset);
      return bytes2;
    };
    var cidSymbol = Symbol.for("@ipld/js-cid/CID");
    var readonly = {
      writable: false,
      configurable: false,
      enumerable: true
    };
    var hidden = {
      writable: false,
      enumerable: false,
      configurable: false
    };
    var version = "0.0.0-dev";
    var deprecate = (range, message) => {
      if (range.test(version)) {
        console.warn(message);
      } else {
        throw new Error(message);
      }
    };
    var IS_CID_DEPRECATION = `CID.isCID(v) is deprecated and will be removed in the next major release.
Following code pattern:

if (CID.isCID(value)) {
  doSomethingWithCID(value)
}

Is replaced with:

const cid = CID.asCID(value)
if (cid) {
  // Make sure to use cid instead of value
  doSomethingWithCID(cid)
}
`;
    exports2.CID = CID;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/index.js
var require_src3 = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var cid = require_cid();
    var varint = require_varint3();
    var bytes = require_bytes();
    var hasher = require_hasher();
    var digest = require_digest();
    exports2.CID = cid.CID;
    exports2.varint = varint;
    exports2.bytes = bytes;
    exports2.hasher = hasher;
    exports2.digest = digest;
  }
});

// node_modules/uint8arrays/node_modules/multiformats/cjs/src/basics.js
var require_basics = __commonJS({
  "node_modules/uint8arrays/node_modules/multiformats/cjs/src/basics.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var identity = require_identity();
    var base2 = require_base22();
    var base8 = require_base8();
    var base10 = require_base10();
    var base16 = require_base16();
    var base32 = require_base32();
    var base36 = require_base36();
    var base58 = require_base58();
    var base64 = require_base64();
    var base256emoji = require_base256emoji();
    var sha2 = require_sha2();
    var identity$1 = require_identity2();
    var raw = require_raw();
    var json = require_json();
    require_src3();
    var cid = require_cid();
    var hasher = require_hasher();
    var digest = require_digest();
    var varint = require_varint3();
    var bytes = require_bytes();
    var bases = {
      ...identity,
      ...base2,
      ...base8,
      ...base10,
      ...base16,
      ...base32,
      ...base36,
      ...base58,
      ...base64,
      ...base256emoji
    };
    var hashes = {
      ...sha2,
      ...identity$1
    };
    var codecs = {
      raw,
      json
    };
    exports2.CID = cid.CID;
    exports2.hasher = hasher;
    exports2.digest = digest;
    exports2.varint = varint;
    exports2.bytes = bytes;
    exports2.bases = bases;
    exports2.codecs = codecs;
    exports2.hashes = hashes;
  }
});

// node_modules/uint8arrays/cjs/src/util/as-uint8array.js
var require_as_uint8array = __commonJS({
  "node_modules/uint8arrays/cjs/src/util/as-uint8array.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function asUint8Array(buf) {
      if (globalThis.Buffer != null) {
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      }
      return buf;
    }
    exports2.asUint8Array = asUint8Array;
  }
});

// node_modules/uint8arrays/cjs/src/alloc.js
var require_alloc = __commonJS({
  "node_modules/uint8arrays/cjs/src/alloc.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var asUint8array = require_as_uint8array();
    function alloc(size = 0) {
      if (globalThis.Buffer != null && globalThis.Buffer.alloc != null) {
        return asUint8array.asUint8Array(globalThis.Buffer.alloc(size));
      }
      return new Uint8Array(size);
    }
    function allocUnsafe(size = 0) {
      if (globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null) {
        return asUint8array.asUint8Array(globalThis.Buffer.allocUnsafe(size));
      }
      return new Uint8Array(size);
    }
    exports2.alloc = alloc;
    exports2.allocUnsafe = allocUnsafe;
  }
});

// node_modules/uint8arrays/cjs/src/util/bases.js
var require_bases = __commonJS({
  "node_modules/uint8arrays/cjs/src/util/bases.js"(exports2, module2) {
    "use strict";
    var basics = require_basics();
    var alloc = require_alloc();
    function createCodec(name, prefix, encode, decode) {
      return {
        name,
        prefix,
        encoder: {
          name,
          prefix,
          encode
        },
        decoder: { decode }
      };
    }
    var string = createCodec("utf8", "u", (buf) => {
      const decoder = new TextDecoder("utf8");
      return "u" + decoder.decode(buf);
    }, (str) => {
      const encoder = new TextEncoder();
      return encoder.encode(str.substring(1));
    });
    var ascii = createCodec("ascii", "a", (buf) => {
      let string2 = "a";
      for (let i = 0; i < buf.length; i++) {
        string2 += String.fromCharCode(buf[i]);
      }
      return string2;
    }, (str) => {
      str = str.substring(1);
      const buf = alloc.allocUnsafe(str.length);
      for (let i = 0; i < str.length; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    });
    var BASES = {
      utf8: string,
      "utf-8": string,
      hex: basics.bases.base16,
      latin1: ascii,
      ascii,
      binary: ascii,
      ...basics.bases
    };
    module2.exports = BASES;
  }
});

// node_modules/uint8arrays/cjs/src/to-string.js
var require_to_string = __commonJS({
  "node_modules/uint8arrays/cjs/src/to-string.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var bases = require_bases();
    function toString(array, encoding = "utf8") {
      const base = bases[encoding];
      if (!base) {
        throw new Error(`Unsupported encoding "${encoding}"`);
      }
      if ((encoding === "utf8" || encoding === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null) {
        return globalThis.Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString("utf8");
      }
      return base.encoder.encode(array).substring(1);
    }
    exports2.toString = toString;
  }
});

// node_modules/uint8arrays/cjs/src/from-string.js
var require_from_string = __commonJS({
  "node_modules/uint8arrays/cjs/src/from-string.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var bases = require_bases();
    var asUint8array = require_as_uint8array();
    function fromString(string, encoding = "utf8") {
      const base = bases[encoding];
      if (!base) {
        throw new Error(`Unsupported encoding "${encoding}"`);
      }
      if ((encoding === "utf8" || encoding === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null) {
        return asUint8array.asUint8Array(globalThis.Buffer.from(string, "utf-8"));
      }
      return base.decoder.decode(`${base.prefix}${string}`);
    }
    exports2.fromString = fromString;
  }
});

// node_modules/uint8arrays/cjs/src/concat.js
var require_concat = __commonJS({
  "node_modules/uint8arrays/cjs/src/concat.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var alloc = require_alloc();
    var asUint8array = require_as_uint8array();
    function concat(arrays, length) {
      if (!length) {
        length = arrays.reduce((acc, curr) => acc + curr.length, 0);
      }
      const output = alloc.allocUnsafe(length);
      let offset = 0;
      for (const arr of arrays) {
        output.set(arr, offset);
        offset += arr.length;
      }
      return asUint8array.asUint8Array(output);
    }
    exports2.concat = concat;
  }
});

// node_modules/multihashes/src/index.js
var require_src4 = __commonJS({
  "node_modules/multihashes/src/index.js"(exports2, module2) {
    "use strict";
    var multibase = require_src2();
    var varint = require_varint();
    var { names } = require_constants2();
    var { toString: uint8ArrayToString } = require_to_string();
    var { fromString: uint8ArrayFromString } = require_from_string();
    var { concat: uint8ArrayConcat } = require_concat();
    var codes = (
      /** @type {import('./types').CodeNameMap} */
      {}
    );
    for (const key in names) {
      const name = (
        /** @type {HashName} */
        key
      );
      codes[names[name]] = name;
    }
    Object.freeze(codes);
    function toHexString(hash2) {
      if (!(hash2 instanceof Uint8Array)) {
        throw new Error("must be passed a Uint8Array");
      }
      return uint8ArrayToString(hash2, "base16");
    }
    function fromHexString(hash2) {
      return uint8ArrayFromString(hash2, "base16");
    }
    function toB58String(hash2) {
      if (!(hash2 instanceof Uint8Array)) {
        throw new Error("must be passed a Uint8Array");
      }
      return uint8ArrayToString(multibase.encode("base58btc", hash2)).slice(1);
    }
    function fromB58String(hash2) {
      const encoded = hash2 instanceof Uint8Array ? uint8ArrayToString(hash2) : hash2;
      return multibase.decode("z" + encoded);
    }
    function decode(bytes) {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error("multihash must be a Uint8Array");
      }
      if (bytes.length < 2) {
        throw new Error("multihash too short. must be > 2 bytes.");
      }
      const code = (
        /** @type {HashCode} */
        varint.decode(bytes)
      );
      if (!isValidCode(code)) {
        throw new Error(`multihash unknown function code: 0x${code.toString(16)}`);
      }
      bytes = bytes.slice(varint.decode.bytes);
      const len = varint.decode(bytes);
      if (len < 0) {
        throw new Error(`multihash invalid length: ${len}`);
      }
      bytes = bytes.slice(varint.decode.bytes);
      if (bytes.length !== len) {
        throw new Error(`multihash length inconsistent: 0x${uint8ArrayToString(bytes, "base16")}`);
      }
      return {
        code,
        name: codes[code],
        length: len,
        digest: bytes
      };
    }
    function encode(digest, code, length) {
      if (!digest || code === void 0) {
        throw new Error("multihash encode requires at least two args: digest, code");
      }
      const hashfn = coerceCode(code);
      if (!(digest instanceof Uint8Array)) {
        throw new Error("digest should be a Uint8Array");
      }
      if (length == null) {
        length = digest.length;
      }
      if (length && digest.length !== length) {
        throw new Error("digest length should be equal to specified length.");
      }
      const hash2 = varint.encode(hashfn);
      const len = varint.encode(length);
      return uint8ArrayConcat([hash2, len, digest], hash2.length + len.length + digest.length);
    }
    function coerceCode(name) {
      let code = name;
      if (typeof name === "string") {
        if (names[name] === void 0) {
          throw new Error(`Unrecognized hash function named: ${name}`);
        }
        code = names[name];
      }
      if (typeof code !== "number") {
        throw new Error(`Hash function code should be a number. Got: ${code}`);
      }
      if (codes[code] === void 0 && !isAppCode(code)) {
        throw new Error(`Unrecognized function code: ${code}`);
      }
      return code;
    }
    function isAppCode(code) {
      return code > 0 && code < 16;
    }
    function isValidCode(code) {
      if (isAppCode(code)) {
        return true;
      }
      if (codes[code]) {
        return true;
      }
      return false;
    }
    function validate(multihash) {
      decode(multihash);
    }
    function prefix(multihash) {
      validate(multihash);
      return multihash.subarray(0, 2);
    }
    module2.exports = {
      names,
      codes,
      toHexString,
      fromHexString,
      toB58String,
      fromB58String,
      decode,
      encode,
      coerceCode,
      isAppCode,
      validate,
      prefix,
      isValidCode
    };
  }
});

// node_modules/multicodec/node_modules/varint/encode.js
var require_encode2 = __commonJS({
  "node_modules/multicodec/node_modules/varint/encode.js"(exports2, module2) {
    module2.exports = encode;
    var MSB = 128;
    var REST = 127;
    var MSBALL = ~REST;
    var INT = Math.pow(2, 31);
    function encode(num, out, offset) {
      if (Number.MAX_SAFE_INTEGER && num > Number.MAX_SAFE_INTEGER) {
        encode.bytes = 0;
        throw new RangeError("Could not encode varint");
      }
      out = out || [];
      offset = offset || 0;
      var oldOffset = offset;
      while (num >= INT) {
        out[offset++] = num & 255 | MSB;
        num /= 128;
      }
      while (num & MSBALL) {
        out[offset++] = num & 255 | MSB;
        num >>>= 7;
      }
      out[offset] = num | 0;
      encode.bytes = offset - oldOffset + 1;
      return out;
    }
  }
});

// node_modules/multicodec/node_modules/varint/decode.js
var require_decode2 = __commonJS({
  "node_modules/multicodec/node_modules/varint/decode.js"(exports2, module2) {
    module2.exports = read2;
    var MSB = 128;
    var REST = 127;
    function read2(buf, offset) {
      var res = 0, offset = offset || 0, shift = 0, counter = offset, b, l = buf.length;
      do {
        if (counter >= l || shift > 49) {
          read2.bytes = 0;
          throw new RangeError("Could not decode varint");
        }
        b = buf[counter++];
        res += shift < 28 ? (b & REST) << shift : (b & REST) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB);
      read2.bytes = counter - offset;
      return res;
    }
  }
});

// node_modules/multicodec/node_modules/varint/length.js
var require_length2 = __commonJS({
  "node_modules/multicodec/node_modules/varint/length.js"(exports2, module2) {
    var N1 = Math.pow(2, 7);
    var N2 = Math.pow(2, 14);
    var N3 = Math.pow(2, 21);
    var N4 = Math.pow(2, 28);
    var N5 = Math.pow(2, 35);
    var N6 = Math.pow(2, 42);
    var N7 = Math.pow(2, 49);
    var N8 = Math.pow(2, 56);
    var N9 = Math.pow(2, 63);
    module2.exports = function(value) {
      return value < N1 ? 1 : value < N2 ? 2 : value < N3 ? 3 : value < N4 ? 4 : value < N5 ? 5 : value < N6 ? 6 : value < N7 ? 7 : value < N8 ? 8 : value < N9 ? 9 : 10;
    };
  }
});

// node_modules/multicodec/node_modules/varint/index.js
var require_varint4 = __commonJS({
  "node_modules/multicodec/node_modules/varint/index.js"(exports2, module2) {
    module2.exports = {
      encode: require_encode2(),
      decode: require_decode2(),
      encodingLength: require_length2()
    };
  }
});

// node_modules/multicodec/src/util.js
var require_util2 = __commonJS({
  "node_modules/multicodec/src/util.js"(exports2, module2) {
    "use strict";
    var varint = require_varint4();
    var { toString: uint8ArrayToString } = require_to_string();
    var { fromString: uint8ArrayFromString } = require_from_string();
    module2.exports = {
      numberToUint8Array,
      uint8ArrayToNumber,
      varintUint8ArrayEncode,
      varintEncode
    };
    function uint8ArrayToNumber(buf) {
      return parseInt(uint8ArrayToString(buf, "base16"), 16);
    }
    function numberToUint8Array(num) {
      let hexString = num.toString(16);
      if (hexString.length % 2 === 1) {
        hexString = "0" + hexString;
      }
      return uint8ArrayFromString(hexString, "base16");
    }
    function varintUint8ArrayEncode(input) {
      return Uint8Array.from(varint.encode(uint8ArrayToNumber(input)));
    }
    function varintEncode(num) {
      return Uint8Array.from(varint.encode(num));
    }
  }
});

// node_modules/multicodec/src/generated-table.js
var require_generated_table = __commonJS({
  "node_modules/multicodec/src/generated-table.js"(exports2, module2) {
    "use strict";
    var baseTable = Object.freeze({
      "identity": 0,
      "cidv1": 1,
      "cidv2": 2,
      "cidv3": 3,
      "ip4": 4,
      "tcp": 6,
      "sha1": 17,
      "sha2-256": 18,
      "sha2-512": 19,
      "sha3-512": 20,
      "sha3-384": 21,
      "sha3-256": 22,
      "sha3-224": 23,
      "shake-128": 24,
      "shake-256": 25,
      "keccak-224": 26,
      "keccak-256": 27,
      "keccak-384": 28,
      "keccak-512": 29,
      "blake3": 30,
      "dccp": 33,
      "murmur3-128": 34,
      "murmur3-32": 35,
      "ip6": 41,
      "ip6zone": 42,
      "path": 47,
      "multicodec": 48,
      "multihash": 49,
      "multiaddr": 50,
      "multibase": 51,
      "dns": 53,
      "dns4": 54,
      "dns6": 55,
      "dnsaddr": 56,
      "protobuf": 80,
      "cbor": 81,
      "raw": 85,
      "dbl-sha2-256": 86,
      "rlp": 96,
      "bencode": 99,
      "dag-pb": 112,
      "dag-cbor": 113,
      "libp2p-key": 114,
      "git-raw": 120,
      "torrent-info": 123,
      "torrent-file": 124,
      "leofcoin-block": 129,
      "leofcoin-tx": 130,
      "leofcoin-pr": 131,
      "sctp": 132,
      "dag-jose": 133,
      "dag-cose": 134,
      "eth-block": 144,
      "eth-block-list": 145,
      "eth-tx-trie": 146,
      "eth-tx": 147,
      "eth-tx-receipt-trie": 148,
      "eth-tx-receipt": 149,
      "eth-state-trie": 150,
      "eth-account-snapshot": 151,
      "eth-storage-trie": 152,
      "eth-receipt-log-trie": 153,
      "eth-reciept-log": 154,
      "bitcoin-block": 176,
      "bitcoin-tx": 177,
      "bitcoin-witness-commitment": 178,
      "zcash-block": 192,
      "zcash-tx": 193,
      "caip-50": 202,
      "streamid": 206,
      "stellar-block": 208,
      "stellar-tx": 209,
      "md4": 212,
      "md5": 213,
      "bmt": 214,
      "decred-block": 224,
      "decred-tx": 225,
      "ipld-ns": 226,
      "ipfs-ns": 227,
      "swarm-ns": 228,
      "ipns-ns": 229,
      "zeronet": 230,
      "secp256k1-pub": 231,
      "bls12_381-g1-pub": 234,
      "bls12_381-g2-pub": 235,
      "x25519-pub": 236,
      "ed25519-pub": 237,
      "bls12_381-g1g2-pub": 238,
      "dash-block": 240,
      "dash-tx": 241,
      "swarm-manifest": 250,
      "swarm-feed": 251,
      "udp": 273,
      "p2p-webrtc-star": 275,
      "p2p-webrtc-direct": 276,
      "p2p-stardust": 277,
      "p2p-circuit": 290,
      "dag-json": 297,
      "udt": 301,
      "utp": 302,
      "unix": 400,
      "thread": 406,
      "p2p": 421,
      "ipfs": 421,
      "https": 443,
      "onion": 444,
      "onion3": 445,
      "garlic64": 446,
      "garlic32": 447,
      "tls": 448,
      "noise": 454,
      "quic": 460,
      "ws": 477,
      "wss": 478,
      "p2p-websocket-star": 479,
      "http": 480,
      "swhid-1-snp": 496,
      "json": 512,
      "messagepack": 513,
      "libp2p-peer-record": 769,
      "libp2p-relay-rsvp": 770,
      "car-index-sorted": 1024,
      "sha2-256-trunc254-padded": 4114,
      "ripemd-128": 4178,
      "ripemd-160": 4179,
      "ripemd-256": 4180,
      "ripemd-320": 4181,
      "x11": 4352,
      "p256-pub": 4608,
      "p384-pub": 4609,
      "p521-pub": 4610,
      "ed448-pub": 4611,
      "x448-pub": 4612,
      "ed25519-priv": 4864,
      "secp256k1-priv": 4865,
      "x25519-priv": 4866,
      "kangarootwelve": 7425,
      "sm3-256": 21325,
      "blake2b-8": 45569,
      "blake2b-16": 45570,
      "blake2b-24": 45571,
      "blake2b-32": 45572,
      "blake2b-40": 45573,
      "blake2b-48": 45574,
      "blake2b-56": 45575,
      "blake2b-64": 45576,
      "blake2b-72": 45577,
      "blake2b-80": 45578,
      "blake2b-88": 45579,
      "blake2b-96": 45580,
      "blake2b-104": 45581,
      "blake2b-112": 45582,
      "blake2b-120": 45583,
      "blake2b-128": 45584,
      "blake2b-136": 45585,
      "blake2b-144": 45586,
      "blake2b-152": 45587,
      "blake2b-160": 45588,
      "blake2b-168": 45589,
      "blake2b-176": 45590,
      "blake2b-184": 45591,
      "blake2b-192": 45592,
      "blake2b-200": 45593,
      "blake2b-208": 45594,
      "blake2b-216": 45595,
      "blake2b-224": 45596,
      "blake2b-232": 45597,
      "blake2b-240": 45598,
      "blake2b-248": 45599,
      "blake2b-256": 45600,
      "blake2b-264": 45601,
      "blake2b-272": 45602,
      "blake2b-280": 45603,
      "blake2b-288": 45604,
      "blake2b-296": 45605,
      "blake2b-304": 45606,
      "blake2b-312": 45607,
      "blake2b-320": 45608,
      "blake2b-328": 45609,
      "blake2b-336": 45610,
      "blake2b-344": 45611,
      "blake2b-352": 45612,
      "blake2b-360": 45613,
      "blake2b-368": 45614,
      "blake2b-376": 45615,
      "blake2b-384": 45616,
      "blake2b-392": 45617,
      "blake2b-400": 45618,
      "blake2b-408": 45619,
      "blake2b-416": 45620,
      "blake2b-424": 45621,
      "blake2b-432": 45622,
      "blake2b-440": 45623,
      "blake2b-448": 45624,
      "blake2b-456": 45625,
      "blake2b-464": 45626,
      "blake2b-472": 45627,
      "blake2b-480": 45628,
      "blake2b-488": 45629,
      "blake2b-496": 45630,
      "blake2b-504": 45631,
      "blake2b-512": 45632,
      "blake2s-8": 45633,
      "blake2s-16": 45634,
      "blake2s-24": 45635,
      "blake2s-32": 45636,
      "blake2s-40": 45637,
      "blake2s-48": 45638,
      "blake2s-56": 45639,
      "blake2s-64": 45640,
      "blake2s-72": 45641,
      "blake2s-80": 45642,
      "blake2s-88": 45643,
      "blake2s-96": 45644,
      "blake2s-104": 45645,
      "blake2s-112": 45646,
      "blake2s-120": 45647,
      "blake2s-128": 45648,
      "blake2s-136": 45649,
      "blake2s-144": 45650,
      "blake2s-152": 45651,
      "blake2s-160": 45652,
      "blake2s-168": 45653,
      "blake2s-176": 45654,
      "blake2s-184": 45655,
      "blake2s-192": 45656,
      "blake2s-200": 45657,
      "blake2s-208": 45658,
      "blake2s-216": 45659,
      "blake2s-224": 45660,
      "blake2s-232": 45661,
      "blake2s-240": 45662,
      "blake2s-248": 45663,
      "blake2s-256": 45664,
      "skein256-8": 45825,
      "skein256-16": 45826,
      "skein256-24": 45827,
      "skein256-32": 45828,
      "skein256-40": 45829,
      "skein256-48": 45830,
      "skein256-56": 45831,
      "skein256-64": 45832,
      "skein256-72": 45833,
      "skein256-80": 45834,
      "skein256-88": 45835,
      "skein256-96": 45836,
      "skein256-104": 45837,
      "skein256-112": 45838,
      "skein256-120": 45839,
      "skein256-128": 45840,
      "skein256-136": 45841,
      "skein256-144": 45842,
      "skein256-152": 45843,
      "skein256-160": 45844,
      "skein256-168": 45845,
      "skein256-176": 45846,
      "skein256-184": 45847,
      "skein256-192": 45848,
      "skein256-200": 45849,
      "skein256-208": 45850,
      "skein256-216": 45851,
      "skein256-224": 45852,
      "skein256-232": 45853,
      "skein256-240": 45854,
      "skein256-248": 45855,
      "skein256-256": 45856,
      "skein512-8": 45857,
      "skein512-16": 45858,
      "skein512-24": 45859,
      "skein512-32": 45860,
      "skein512-40": 45861,
      "skein512-48": 45862,
      "skein512-56": 45863,
      "skein512-64": 45864,
      "skein512-72": 45865,
      "skein512-80": 45866,
      "skein512-88": 45867,
      "skein512-96": 45868,
      "skein512-104": 45869,
      "skein512-112": 45870,
      "skein512-120": 45871,
      "skein512-128": 45872,
      "skein512-136": 45873,
      "skein512-144": 45874,
      "skein512-152": 45875,
      "skein512-160": 45876,
      "skein512-168": 45877,
      "skein512-176": 45878,
      "skein512-184": 45879,
      "skein512-192": 45880,
      "skein512-200": 45881,
      "skein512-208": 45882,
      "skein512-216": 45883,
      "skein512-224": 45884,
      "skein512-232": 45885,
      "skein512-240": 45886,
      "skein512-248": 45887,
      "skein512-256": 45888,
      "skein512-264": 45889,
      "skein512-272": 45890,
      "skein512-280": 45891,
      "skein512-288": 45892,
      "skein512-296": 45893,
      "skein512-304": 45894,
      "skein512-312": 45895,
      "skein512-320": 45896,
      "skein512-328": 45897,
      "skein512-336": 45898,
      "skein512-344": 45899,
      "skein512-352": 45900,
      "skein512-360": 45901,
      "skein512-368": 45902,
      "skein512-376": 45903,
      "skein512-384": 45904,
      "skein512-392": 45905,
      "skein512-400": 45906,
      "skein512-408": 45907,
      "skein512-416": 45908,
      "skein512-424": 45909,
      "skein512-432": 45910,
      "skein512-440": 45911,
      "skein512-448": 45912,
      "skein512-456": 45913,
      "skein512-464": 45914,
      "skein512-472": 45915,
      "skein512-480": 45916,
      "skein512-488": 45917,
      "skein512-496": 45918,
      "skein512-504": 45919,
      "skein512-512": 45920,
      "skein1024-8": 45921,
      "skein1024-16": 45922,
      "skein1024-24": 45923,
      "skein1024-32": 45924,
      "skein1024-40": 45925,
      "skein1024-48": 45926,
      "skein1024-56": 45927,
      "skein1024-64": 45928,
      "skein1024-72": 45929,
      "skein1024-80": 45930,
      "skein1024-88": 45931,
      "skein1024-96": 45932,
      "skein1024-104": 45933,
      "skein1024-112": 45934,
      "skein1024-120": 45935,
      "skein1024-128": 45936,
      "skein1024-136": 45937,
      "skein1024-144": 45938,
      "skein1024-152": 45939,
      "skein1024-160": 45940,
      "skein1024-168": 45941,
      "skein1024-176": 45942,
      "skein1024-184": 45943,
      "skein1024-192": 45944,
      "skein1024-200": 45945,
      "skein1024-208": 45946,
      "skein1024-216": 45947,
      "skein1024-224": 45948,
      "skein1024-232": 45949,
      "skein1024-240": 45950,
      "skein1024-248": 45951,
      "skein1024-256": 45952,
      "skein1024-264": 45953,
      "skein1024-272": 45954,
      "skein1024-280": 45955,
      "skein1024-288": 45956,
      "skein1024-296": 45957,
      "skein1024-304": 45958,
      "skein1024-312": 45959,
      "skein1024-320": 45960,
      "skein1024-328": 45961,
      "skein1024-336": 45962,
      "skein1024-344": 45963,
      "skein1024-352": 45964,
      "skein1024-360": 45965,
      "skein1024-368": 45966,
      "skein1024-376": 45967,
      "skein1024-384": 45968,
      "skein1024-392": 45969,
      "skein1024-400": 45970,
      "skein1024-408": 45971,
      "skein1024-416": 45972,
      "skein1024-424": 45973,
      "skein1024-432": 45974,
      "skein1024-440": 45975,
      "skein1024-448": 45976,
      "skein1024-456": 45977,
      "skein1024-464": 45978,
      "skein1024-472": 45979,
      "skein1024-480": 45980,
      "skein1024-488": 45981,
      "skein1024-496": 45982,
      "skein1024-504": 45983,
      "skein1024-512": 45984,
      "skein1024-520": 45985,
      "skein1024-528": 45986,
      "skein1024-536": 45987,
      "skein1024-544": 45988,
      "skein1024-552": 45989,
      "skein1024-560": 45990,
      "skein1024-568": 45991,
      "skein1024-576": 45992,
      "skein1024-584": 45993,
      "skein1024-592": 45994,
      "skein1024-600": 45995,
      "skein1024-608": 45996,
      "skein1024-616": 45997,
      "skein1024-624": 45998,
      "skein1024-632": 45999,
      "skein1024-640": 46e3,
      "skein1024-648": 46001,
      "skein1024-656": 46002,
      "skein1024-664": 46003,
      "skein1024-672": 46004,
      "skein1024-680": 46005,
      "skein1024-688": 46006,
      "skein1024-696": 46007,
      "skein1024-704": 46008,
      "skein1024-712": 46009,
      "skein1024-720": 46010,
      "skein1024-728": 46011,
      "skein1024-736": 46012,
      "skein1024-744": 46013,
      "skein1024-752": 46014,
      "skein1024-760": 46015,
      "skein1024-768": 46016,
      "skein1024-776": 46017,
      "skein1024-784": 46018,
      "skein1024-792": 46019,
      "skein1024-800": 46020,
      "skein1024-808": 46021,
      "skein1024-816": 46022,
      "skein1024-824": 46023,
      "skein1024-832": 46024,
      "skein1024-840": 46025,
      "skein1024-848": 46026,
      "skein1024-856": 46027,
      "skein1024-864": 46028,
      "skein1024-872": 46029,
      "skein1024-880": 46030,
      "skein1024-888": 46031,
      "skein1024-896": 46032,
      "skein1024-904": 46033,
      "skein1024-912": 46034,
      "skein1024-920": 46035,
      "skein1024-928": 46036,
      "skein1024-936": 46037,
      "skein1024-944": 46038,
      "skein1024-952": 46039,
      "skein1024-960": 46040,
      "skein1024-968": 46041,
      "skein1024-976": 46042,
      "skein1024-984": 46043,
      "skein1024-992": 46044,
      "skein1024-1000": 46045,
      "skein1024-1008": 46046,
      "skein1024-1016": 46047,
      "skein1024-1024": 46048,
      "poseidon-bls12_381-a2-fc1": 46081,
      "poseidon-bls12_381-a2-fc1-sc": 46082,
      "zeroxcert-imprint-256": 52753,
      "fil-commitment-unsealed": 61697,
      "fil-commitment-sealed": 61698,
      "holochain-adr-v0": 8417572,
      "holochain-adr-v1": 8483108,
      "holochain-key-v0": 9728292,
      "holochain-key-v1": 9793828,
      "holochain-sig-v0": 10645796,
      "holochain-sig-v1": 10711332,
      "skynet-ns": 11639056,
      "arweave-ns": 11704592
    });
    module2.exports = { baseTable };
  }
});

// node_modules/multicodec/src/maps.js
var require_maps = __commonJS({
  "node_modules/multicodec/src/maps.js"(exports2, module2) {
    "use strict";
    var { baseTable } = require_generated_table();
    var varintEncode = require_util2().varintEncode;
    var nameToVarint = (
      /** @type {NameUint8ArrayMap} */
      {}
    );
    var constantToCode = (
      /** @type {ConstantCodeMap} */
      {}
    );
    var codeToName = (
      /** @type {CodeNameMap} */
      {}
    );
    for (const name in baseTable) {
      const codecName = (
        /** @type {CodecName} */
        name
      );
      const code = baseTable[codecName];
      nameToVarint[codecName] = varintEncode(code);
      const constant = (
        /** @type {CodecConstant} */
        codecName.toUpperCase().replace(/-/g, "_")
      );
      constantToCode[constant] = code;
      if (!codeToName[code]) {
        codeToName[code] = codecName;
      }
    }
    Object.freeze(nameToVarint);
    Object.freeze(constantToCode);
    Object.freeze(codeToName);
    var nameToCode = Object.freeze(baseTable);
    module2.exports = {
      nameToVarint,
      constantToCode,
      nameToCode,
      codeToName
    };
  }
});

// node_modules/multicodec/src/index.js
var require_src5 = __commonJS({
  "node_modules/multicodec/src/index.js"(exports2, module2) {
    "use strict";
    var varint = require_varint4();
    var { concat: uint8ArrayConcat } = require_concat();
    var util = require_util2();
    var { nameToVarint, constantToCode, nameToCode, codeToName } = require_maps();
    function addPrefix(multicodecStrOrCode, data) {
      let prefix;
      if (multicodecStrOrCode instanceof Uint8Array) {
        prefix = util.varintUint8ArrayEncode(multicodecStrOrCode);
      } else {
        if (nameToVarint[multicodecStrOrCode]) {
          prefix = nameToVarint[multicodecStrOrCode];
        } else {
          throw new Error("multicodec not recognized");
        }
      }
      return uint8ArrayConcat([prefix, data], prefix.length + data.length);
    }
    function rmPrefix(data) {
      varint.decode(
        /** @type {Buffer} */
        data
      );
      return data.slice(varint.decode.bytes);
    }
    function getNameFromData(prefixedData) {
      const code = (
        /** @type {CodecCode} */
        varint.decode(
          /** @type {Buffer} */
          prefixedData
        )
      );
      const name = codeToName[code];
      if (name === void 0) {
        throw new Error(`Code "${code}" not found`);
      }
      return name;
    }
    function getNameFromCode(codec) {
      return codeToName[codec];
    }
    function getCodeFromName(name) {
      const code = nameToCode[name];
      if (code === void 0) {
        throw new Error(`Codec "${name}" not found`);
      }
      return code;
    }
    function getCodeFromData(prefixedData) {
      return (
        /** @type {CodecCode} */
        varint.decode(
          /** @type {Buffer} */
          prefixedData
        )
      );
    }
    function getVarintFromName(name) {
      const code = nameToVarint[name];
      if (code === void 0) {
        throw new Error(`Codec "${name}" not found`);
      }
      return code;
    }
    function getVarintFromCode(code) {
      return util.varintEncode(code);
    }
    function getCodec(prefixedData) {
      return getNameFromData(prefixedData);
    }
    function getName(codec) {
      return getNameFromCode(codec);
    }
    function getNumber(name) {
      return getCodeFromName(name);
    }
    function getCode(prefixedData) {
      return getCodeFromData(prefixedData);
    }
    function getCodeVarint(name) {
      return getVarintFromName(name);
    }
    function getVarint(code) {
      return Array.from(getVarintFromCode(code));
    }
    module2.exports = {
      addPrefix,
      rmPrefix,
      getNameFromData,
      getNameFromCode,
      getCodeFromName,
      getCodeFromData,
      getVarintFromName,
      getVarintFromCode,
      // Deprecated
      getCodec,
      getName,
      getNumber,
      getCode,
      getCodeVarint,
      getVarint,
      // Make the constants top-level constants
      ...constantToCode,
      // Export the maps
      nameToVarint,
      nameToCode,
      codeToName
    };
  }
});

// node_modules/cids/src/cid-util.js
var require_cid_util = __commonJS({
  "node_modules/cids/src/cid-util.js"(exports2, module2) {
    "use strict";
    var mh = require_src4();
    var CIDUtil = {
      /**
       * Test if the given input is a valid CID object.
       * Returns an error message if it is not.
       * Returns undefined if it is a valid CID.
       *
       * @param {any} other
       * @returns {string|undefined}
       */
      checkCIDComponents: function(other) {
        if (other == null) {
          return "null values are not valid CIDs";
        }
        if (!(other.version === 0 || other.version === 1)) {
          return "Invalid version, must be a number equal to 1 or 0";
        }
        if (typeof other.codec !== "string") {
          return "codec must be string";
        }
        if (other.version === 0) {
          if (other.codec !== "dag-pb") {
            return "codec must be 'dag-pb' for CIDv0";
          }
          if (other.multibaseName !== "base58btc") {
            return "multibaseName must be 'base58btc' for CIDv0";
          }
        }
        if (!(other.multihash instanceof Uint8Array)) {
          return "multihash must be a Uint8Array";
        }
        try {
          mh.validate(other.multihash);
        } catch (err) {
          let errorMsg = err.message;
          if (!errorMsg) {
            errorMsg = "Multihash validation failed";
          }
          return errorMsg;
        }
      }
    };
    module2.exports = CIDUtil;
  }
});

// node_modules/uint8arrays/cjs/src/equals.js
var require_equals = __commonJS({
  "node_modules/uint8arrays/cjs/src/equals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function equals(a, b) {
      if (a === b) {
        return true;
      }
      if (a.byteLength !== b.byteLength) {
        return false;
      }
      for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    }
    exports2.equals = equals;
  }
});

// node_modules/cids/src/index.js
var require_src6 = __commonJS({
  "node_modules/cids/src/index.js"(exports2, module2) {
    "use strict";
    var mh = require_src4();
    var multibase = require_src2();
    var multicodec = require_src5();
    var CIDUtil = require_cid_util();
    var { concat: uint8ArrayConcat } = require_concat();
    var { toString: uint8ArrayToString } = require_to_string();
    var { equals: uint8ArrayEquals } = require_equals();
    var codecs = multicodec.nameToCode;
    var codecInts = (
      /** @type {CodecName[]} */
      Object.keys(codecs).reduce(
        (p, name) => {
          p[codecs[name]] = name;
          return p;
        },
        /** @type {Record<CodecCode, CodecName>} */
        {}
      )
    );
    var symbol = Symbol.for("@ipld/js-cid/CID");
    var CID = class _CID {
      /**
       * Create a new CID.
       *
       * The algorithm for argument input is roughly:
       * ```
       * if (cid)
       *   -> create a copy
       * else if (str)
       *   if (1st char is on multibase table) -> CID String
       *   else -> bs58 encoded multihash
       * else if (Uint8Array)
       *   if (1st byte is 0 or 1) -> CID
       *   else -> multihash
       * else if (Number)
       *   -> construct CID by parts
       * ```
       *
       * @param {CIDVersion | string | Uint8Array | CID} version
       * @param {string|number} [codec]
       * @param {Uint8Array} [multihash]
       * @param {string} [multibaseName]
       *
       * @example
       * new CID(<version>, <codec>, <multihash>, <multibaseName>)
       * new CID(<cidStr>)
       * new CID(<cid.bytes>)
       * new CID(<multihash>)
       * new CID(<bs58 encoded multihash>)
       * new CID(<cid>)
       */
      constructor(version, codec, multihash, multibaseName) {
        this.version;
        this.codec;
        this.multihash;
        Object.defineProperty(this, symbol, { value: true });
        if (_CID.isCID(version)) {
          const cid = (
            /** @type {CID} */
            version
          );
          this.version = cid.version;
          this.codec = cid.codec;
          this.multihash = cid.multihash;
          this.multibaseName = cid.multibaseName || (cid.version === 0 ? "base58btc" : "base32");
          return;
        }
        if (typeof version === "string") {
          const baseName = multibase.isEncoded(version);
          if (baseName) {
            const cid = multibase.decode(version);
            this.version = /** @type {CIDVersion} */
            parseInt(cid[0].toString(), 16);
            this.codec = multicodec.getCodec(cid.slice(1));
            this.multihash = multicodec.rmPrefix(cid.slice(1));
            this.multibaseName = baseName;
          } else {
            this.version = 0;
            this.codec = "dag-pb";
            this.multihash = mh.fromB58String(version);
            this.multibaseName = "base58btc";
          }
          _CID.validateCID(this);
          Object.defineProperty(this, "string", { value: version });
          return;
        }
        if (version instanceof Uint8Array) {
          const v = parseInt(version[0].toString(), 16);
          if (v === 1) {
            const cid = version;
            this.version = v;
            this.codec = multicodec.getCodec(cid.slice(1));
            this.multihash = multicodec.rmPrefix(cid.slice(1));
            this.multibaseName = "base32";
          } else {
            this.version = 0;
            this.codec = "dag-pb";
            this.multihash = version;
            this.multibaseName = "base58btc";
          }
          _CID.validateCID(this);
          return;
        }
        this.version = version;
        if (typeof codec === "number") {
          codec = codecInts[codec];
        }
        this.codec = /** @type {CodecName} */
        codec;
        this.multihash = /** @type {Uint8Array} */
        multihash;
        this.multibaseName = multibaseName || (version === 0 ? "base58btc" : "base32");
        _CID.validateCID(this);
      }
      /**
       * The CID as a `Uint8Array`
       *
       * @returns {Uint8Array}
       *
       */
      get bytes() {
        let bytes = this._bytes;
        if (!bytes) {
          if (this.version === 0) {
            bytes = this.multihash;
          } else if (this.version === 1) {
            const codec = multicodec.getCodeVarint(this.codec);
            bytes = uint8ArrayConcat([
              [1],
              codec,
              this.multihash
            ], 1 + codec.byteLength + this.multihash.byteLength);
          } else {
            throw new Error("unsupported version");
          }
          Object.defineProperty(this, "_bytes", { value: bytes });
        }
        return bytes;
      }
      /**
       * The prefix of the CID.
       *
       * @returns {Uint8Array}
       */
      get prefix() {
        const codec = multicodec.getCodeVarint(this.codec);
        const multihash = mh.prefix(this.multihash);
        const prefix = uint8ArrayConcat([
          [this.version],
          codec,
          multihash
        ], 1 + codec.byteLength + multihash.byteLength);
        return prefix;
      }
      /**
       * The codec of the CID in its number form.
       *
       * @returns {CodecCode}
       */
      get code() {
        return codecs[this.codec];
      }
      /**
       * Convert to a CID of version `0`.
       *
       * @returns {CID}
       */
      toV0() {
        if (this.codec !== "dag-pb") {
          throw new Error("Cannot convert a non dag-pb CID to CIDv0");
        }
        const { name, length } = mh.decode(this.multihash);
        if (name !== "sha2-256") {
          throw new Error("Cannot convert non sha2-256 multihash CID to CIDv0");
        }
        if (length !== 32) {
          throw new Error("Cannot convert non 32 byte multihash CID to CIDv0");
        }
        return new _CID(0, this.codec, this.multihash);
      }
      /**
       * Convert to a CID of version `1`.
       *
       * @returns {CID}
       */
      toV1() {
        return new _CID(1, this.codec, this.multihash, this.multibaseName);
      }
      /**
       * Encode the CID into a string.
       *
       * @param {BaseNameOrCode} [base=this.multibaseName] - Base encoding to use.
       * @returns {string}
       */
      toBaseEncodedString(base = this.multibaseName) {
        if (this.string && this.string.length !== 0 && base === this.multibaseName) {
          return this.string;
        }
        let str;
        if (this.version === 0) {
          if (base !== "base58btc") {
            throw new Error("not supported with CIDv0, to support different bases, please migrate the instance do CIDv1, you can do that through cid.toV1()");
          }
          str = mh.toB58String(this.multihash);
        } else if (this.version === 1) {
          str = uint8ArrayToString(multibase.encode(base, this.bytes));
        } else {
          throw new Error("unsupported version");
        }
        if (base === this.multibaseName) {
          Object.defineProperty(this, "string", { value: str });
        }
        return str;
      }
      /**
       * CID(QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n)
       *
       * @returns {string}
       */
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return "CID(" + this.toString() + ")";
      }
      /**
       * Encode the CID into a string.
       *
       * @param {BaseNameOrCode} [base=this.multibaseName] - Base encoding to use.
       * @returns {string}
       */
      toString(base) {
        return this.toBaseEncodedString(base);
      }
      /**
       * Serialize to a plain object.
       *
       * @returns {SerializedCID}
       */
      toJSON() {
        return {
          codec: this.codec,
          version: this.version,
          hash: this.multihash
        };
      }
      /**
       * Compare equality with another CID.
       *
       * @param {CID} other
       * @returns {boolean}
       */
      equals(other) {
        return this.codec === other.codec && this.version === other.version && uint8ArrayEquals(this.multihash, other.multihash);
      }
      /**
       * Test if the given input is a valid CID object.
       * Throws if it is not.
       *
       * @param {any} other - The other CID.
       * @returns {void}
       */
      static validateCID(other) {
        const errorMsg = CIDUtil.checkCIDComponents(other);
        if (errorMsg) {
          throw new Error(errorMsg);
        }
      }
      /**
       * Check if object is a CID instance
       *
       * @param {any} value
       * @returns {value is CID}
       */
      static isCID(value) {
        return value instanceof _CID || Boolean(value && value[symbol]);
      }
    };
    CID.codecs = codecs;
    module2.exports = CID;
  }
});

// lib/ipfsMedia.js
var require_ipfsMedia = __commonJS({
  "lib/ipfsMedia.js"(exports2, module2) {
    var algosdk4 = require("algosdk");
    var CID = require_src6();
    var multihashes = require_src4();
    var IPFS_GATEWAYS = [
      "https://ipfs-pera.algonode.dev/ipfs/",
      "https://gateway.pinata.cloud/ipfs/",
      "https://ipfs.algonode.xyz/ipfs/"
    ];
    var CHAMPION_CREATOR2 = "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY";
    function ipfsImageCandidates(value = "") {
      const uri = String(value || "").trim();
      if (!uri) return [];
      let path2 = "";
      if (uri.startsWith("ipfs://")) path2 = uri.slice(7).replace(/^ipfs\//, "");
      else {
        try {
          const url = new URL(uri);
          if (!["https:", "http:"].includes(url.protocol)) return uri.startsWith("data:image/") ? [uri] : [];
          const marker = url.pathname.indexOf("/ipfs/");
          if (marker >= 0) path2 = url.pathname.slice(marker + 6) + url.search;
        } catch {
          return uri.startsWith("/") && !uri.startsWith("//") ? [uri] : [];
        }
      }
      if (path2) return IPFS_GATEWAYS.map((gateway) => gateway + path2.split("#")[0]);
      return /^https?:\/\//.test(uri) ? [uri] : [];
    }
    function assetImageUrl2(params = {}) {
      let uri = String(params.url || "");
      const template = uri.match(/^template-ipfs:\/\/\{ipfscid:([01]):(dag-pb|raw):reserve:sha2-256\}/);
      const legacyChampion = params.creator === CHAMPION_CREATOR2 || String(params.name || "").startsWith("Dark Coin Champion");
      if ((template || legacyChampion) && params.reserve) {
        try {
          const hash2 = multihashes.encode(algosdk4.decodeAddress(String(params.reserve)).publicKey, "sha2-256");
          const cid = new CID(template ? Number(template[1]) : 0, template ? template[2] : "dag-pb", hash2).toString();
          uri = template ? uri.replace(template[0], `ipfs://${cid}`) : `ipfs://${cid}`;
        } catch {
          return "";
        }
      }
      return ipfsImageCandidates(uri)[0] || "";
    }
    module2.exports = { IPFS_GATEWAYS, ipfsImageCandidates, assetImageUrl: assetImageUrl2 };
  }
});

// pages/api/arena/combat.js
var combat_exports = {};
__export(combat_exports, {
  config: () => config,
  default: () => handler2
});
module.exports = __toCommonJS(combat_exports);

// components/contracts/Arena/3dTraitsData.js
var CHAMPION_TRAITS = {
  Background: [
    { assetId: 1631153255, trait: "Aqua Background", type: "Background", total: 132, effects: ["Increases Drown."] },
    { assetId: 1631164569, trait: "Blood Background", type: "Background", total: 144, effects: ["Increases Bleed."] },
    { assetId: 1631166128, trait: "Cosmos Background", type: "Background", total: 53, effects: ["Increases Intelligence", "Increases Resist."] },
    { assetId: 1631168001, trait: "Dungeon Background", type: "Background", total: 38, effects: ["Increases Doom."] },
    { assetId: 1631169006, trait: "Forest Background", type: "Background", total: 83, effects: ["Increases Health.", "Gain Nurture at start of battle."] },
    { assetId: 1631170742, trait: "Golden Background", type: "Background", total: 108, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631172134, trait: "Midnight Background", type: "Background", total: 105, effects: ["Gain Focus at the start of battle."] },
    { assetId: 1631173209, trait: "Noir Background", type: "Background", total: 118, effects: ["Resistance to Doom."] },
    { assetId: 1631173804, trait: "Red Moon Background", type: "Background", total: 19, effects: ["Apply Doom at the start of battle."] },
    { assetId: 1631175041, trait: "Sunset Background", type: "Background", total: 81, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631178480, trait: "Toxic Background", type: "Background", total: 119, effects: ["Increases Poison."] },
    { assetId: 1792634314, trait: "Valley Background", type: "Background", total: 40, effects: ["Increases Speed."] },
    { assetId: 3586495527, trait: "Golden Moon", type: "Background", total: 15, effects: ["Increases Bless.", "Gain Focus at the start of battle."] },
    { assetId: 2311097594, trait: "Waves Background", type: "Background", total: 65, effects: ["Apply Drown at the start of the battle."] },
    { assetId: 3668457144, trait: "Dawn Background", type: "Background", total: 35, effects: ["Increases Resist."] }
  ],
  Weapon: [
    // speedFactor: 1.0 is standard; higher values attack faster and lower values attack slower.
    { assetId: 1631181322, trait: "Dragon Long Sword", type: "Weapon", total: 63, damageRoll: "2d10", damageType: "fire", speedFactor: 0.85, effects: ["Apply Burn on melee hit."] },
    { assetId: 1631198641, trait: "Dragon Staff", type: "Weapon", total: 38, damageRoll: "2d8", damageType: "fire", speedFactor: 0.9, effects: ["Apply Burn at the start of battle."] },
    { assetId: 1631201003, trait: "Dual Katana", type: "Weapon", total: 79, damageRoll: "3d6", damageType: "slashing", speedFactor: 1.3, effects: ["Increases Speed."] },
    { assetId: 1631202303, trait: "Executioner Axe", type: "Weapon", total: 99, damageRoll: "1d12", damageType: "slashing", speedFactor: 0.7, effects: ["Increases Strength.", "Increases Health."] },
    { assetId: 1631204400, trait: "Scythe", type: "Weapon", total: 74, damageRoll: "2d6", damageType: "slashing", speedFactor: 0.85, effects: ["Apply Bleed on melee hit.", "Apply Doom on magic hit."] },
    { assetId: 1631205295, trait: "Shield", type: "Weapon", total: 89, damageRoll: "1d6", damageType: "blunt", speedFactor: 0.75, effects: ["Gain Shield at thzzzzzzzzzzzzzzzze start of battle."] },
    { assetId: 1631205996, trait: "Sickle", type: "Weapon", total: 78, damageRoll: "1d8", damageType: "slashing", speedFactor: 1.2, effects: ["Increases Nurture.", "Apply Bleed on melee hit."] },
    { assetId: 1631207056, trait: "Spear", type: "Weapon", total: 95, damageRoll: "1d10", damageType: "piercing", speedFactor: 1, effects: ["Increases Health.", "Apply Bleed on melee hit."] },
    { assetId: 1631207955, trait: "Trident", type: "Weapon", total: 112, damageRoll: "2d6", damageType: "water", speedFactor: 0.9, effects: ["Apply Drown on melee hit."] },
    { assetId: 1792635942, trait: "Dark Sword", type: "Weapon", total: 40, damageRoll: "2d8", damageType: "shadow", speedFactor: 0.95, effects: ["Apply Doom on melee hit."] },
    { assetId: 1792636565, trait: "Elf Bow", type: "Weapon", total: 40, damageRoll: "1d10", damageType: "piercing", speedFactor: 1.15, effects: ["Gain Nurture on ranged hit."] },
    { assetId: 3586495825, trait: "Wooden Club", type: "Weapon", total: 45, damageRoll: "1d10", damageType: "blunt", speedFactor: 0.8, effects: ["Increases Strength.", "Apply Paralyze on melee hit."] },
    { assetId: 3586495819, trait: "Snake Wings", type: "Weapon", total: 45, damageRoll: "2d6", damageType: "poison", speedFactor: 1.25, effects: ["Increases Speed.", "Increases Poison."] },
    { assetId: 3586495808, trait: "Ske'tonian Sword", type: "Weapon", total: 5, damageRoll: "2d8", damageType: "slashing", speedFactor: 1, effects: ["Apply Bleed on melee hit.", "Increases Resist."] },
    { assetId: 3586495146, trait: "Fire Wings", type: "Weapon", total: 45, damageRoll: "2d6", damageType: "fire", speedFactor: 1.2, effects: ["Increases Speed.", "Apply Burn on melee hit."] },
    { assetId: 3586495133, trait: "Elder Wings", type: "Weapon", total: 45, damageRoll: "2d6", damageType: "arcane", speedFactor: 1.05, effects: ["Increases Intelligence.", "Resistance to Freeze."] },
    { assetId: 3586495110, trait: "Chameleon Wings", type: "Weapon", total: 30, damageRoll: "2d6", damageType: "poison", speedFactor: 1.3, effects: ["Increases Speed.", "Resistance to Poison."] },
    { assetId: 3586495084, trait: "Arctic Dual Katana", type: "Weapon", total: 30, damageRoll: "3d6", damageType: "frost", speedFactor: 1.25, effects: ["Apply Freeze on melee hit.", "Increases Speed."] },
    { assetId: 3668457164, trait: "Rusty Sword", type: "Weapon", total: 35, damageRoll: "1d8", damageType: "slashing", speedFactor: 1.05, effects: ["Increases Speed.", "Decreases Strength."] },
    { assetId: 3668457154, trait: "Lightning Staff", type: "Weapon", total: 35, damageRoll: "2d8", damageType: "lightning", speedFactor: 1.1, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 3668457152, trait: "Hedge-Knight Sword", type: "Weapon", total: 35, damageRoll: "2d8", damageType: "slashing", speedFactor: 1.1, effects: ["Gain Hasten on melee hit."] }
  ],
  Magic: [
    { assetId: 1631208827, trait: "Dark Magic", type: "Magic", total: 10, effects: ["Increases Doom."] },
    { assetId: 1631209424, trait: "Fire Magic", type: "Magic", total: 30, effects: ["Apply Burn on magic hit."] },
    { assetId: 1631213913, trait: "Lightning Magic", type: "Magic", total: 15, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 1631217677, trait: "Water Magic", type: "Magic", total: 32, effects: ["Increases Drown."] },
    { assetId: 1631233542, trait: "Ice Daggers", type: "Magic", total: 25, effects: ["Apply Freeze on ranged hit."] },
    { assetId: 3586495574, trait: "Poison Cloud", type: "Magic", total: 15, effects: ["Apply Poison at the start of battle."] },
    { assetId: 3668457136, trait: "Blood-Shards", type: "Magic", total: 35, effects: ["Apply Bleed at start of battle."] }
  ],
  Head: [
    { assetId: 1631224831, trait: "Crown of Horns", type: "Head", total: 18, effects: ["Gain Doom at the start of battle.", "Gain Strengthen at the start of battle."] },
    { assetId: 1631236045, trait: "All Knowing", type: "Head", total: 61, effects: ["Increases Intelligence."] },
    { assetId: 1631236727, trait: "Bone", type: "Head", total: 62, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631238772, trait: "Dark Knight Helm", type: "Head", total: 71, effects: ["Increases Doom."] },
    { assetId: 1631240661, trait: "Dragon Knight Helm", type: "Head", total: 30, effects: ["Increases Health.", "Increases Burn."] },
    { assetId: 1631243569, trait: "Dragon", type: "Head", total: 129, effects: ["Gain Burn at start of battle.", "Increases Speed."] },
    { assetId: 1631245454, trait: "Elder", type: "Head", total: 103, effects: ["Increases Intelligence.", "Apply Freeze at the start of battle."] },
    { assetId: 1631263106, trait: "Gladiator Helm", type: "Head", total: 55, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631266132, trait: "Purity", type: "Head", total: 111, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631268297, trait: "Scarred", type: "Head", total: 81, effects: ["Increases Health.", "Increases Resist."] },
    { assetId: 1631271286, trait: "Snake", type: "Head", total: 108, effects: ["Apply Poison at start of battle."] },
    { assetId: 1631273225, trait: "Undead", type: "Head", total: 67, effects: ["Gain Nurture at start of battle.", "Gain Doom at start of battle."] },
    { assetId: 1631275042, trait: "Uni Horn", type: "Head", total: 104, effects: ["Gain Bless at start of battle.", "Increases Doom."] },
    { assetId: 1792637776, trait: "Farmer", type: "Head", total: 40, effects: ["Gain Nurture at start of battle."] },
    { assetId: 1792640216, trait: "Samurai", type: "Head", total: 40, effects: ["Gain Focus on melee hit."] },
    { assetId: 1935442966, trait: "Barbarian", type: "Head", total: 1, effects: ["Increases Strength.", "Decreases Accuracy."] },
    { assetId: 2311097574, trait: "Gold Hermes Helm", type: "Head", total: 10, effects: ["Gain Empower every melee hit."] },
    { assetId: 2311097577, trait: "Silver Hermes Helm", type: "Head", total: 75, effects: ["Gain Shield at start of battle."] },
    { assetId: 2311097585, trait: "Pirate Bandana", type: "Head", total: 65, effects: ["Increases Speed.", "Increases Drown."] },
    { assetId: 3586495600, trait: "Skel'tonian Mask", type: "Head", total: 5, effects: ["Gain Cleanse at start of battle.", "Increases Resist."] },
    { assetId: 3586495515, trait: "Frost", type: "Head", total: 30, effects: ["Apply Freeze at the start of battle.", "Resistance to Burn."] },
    { assetId: 3586495125, trait: "Cyclops", type: "Head", total: 45, effects: ["Increases Strength.", "Gain Strengthen upon suffering a magic hit."] },
    { assetId: 3668457190, trait: "Slayer", type: "Head", total: 35, effects: ["Resistance to Doom."] },
    { assetId: 3668457162, trait: "Ram", type: "Head", total: 35, effects: ["Gain Nurture on melee hit."] },
    { assetId: 3668457138, trait: "Cannibal", type: "Head", total: 35, effects: ["Heal when Bleed stacks are applied."] }
  ],
  Armour: [
    { assetId: 1631281879, trait: "Dark Knight Armour", type: "Armour", total: 39, effects: ["Gain Shield at the start of battle.", "Increases Doom."] },
    { assetId: 1631282734, trait: "Dragon Hunter Armour", type: "Armour", total: 63, effects: ["Increases Dexterity.", "Increases Burn."] },
    { assetId: 1631284233, trait: "Dragon Knight Armour", type: "Armour", total: 29, effects: ["Gain Shield at the start of battle.", "Increases Burn."] },
    { assetId: 1631286848, trait: "Gladiator Armour", type: "Armour", total: 47, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631293139, trait: "Hidden One", type: "Armour", total: 118, effects: ["Increases Intelligence."] },
    { assetId: 1631296742, trait: "Magicians Robe", type: "Armour", total: 84, effects: ["Increases speed of magic type moves."] },
    { assetId: 1631298825, trait: "Pharaoh", type: "Armour", total: 68, effects: ["Gain Empower at the start of battle."] },
    { assetId: 1631299446, trait: "Rags", type: "Armour", total: 157, effects: ["Increases Dexterity."] },
    { assetId: 1631302191, trait: "Shinobi", type: "Armour", total: 78, effects: ["Increases Speed."] },
    { assetId: 1631305105, trait: "Unchained", type: "Armour", total: 96, effects: ["Increases Doom."] },
    { assetId: 1642179694, trait: "Emperor Armour", type: "Armour", total: 15, effects: ["Increases Health.", "Gain Bless at the start of battle."] },
    { assetId: 1792645489, trait: "Elf Robe", type: "Armour", total: 40, effects: ["Increases Speed.", "Increases speed of ranged type moves."] },
    { assetId: 1792660153, trait: "Leather Garb", type: "Armour", total: 40, effects: ["Increases Health."] },
    { assetId: 1806077922, trait: "Executioner Robe", type: "Armour", total: 40, effects: ["Increases Bleed."] },
    { assetId: 2311097589, trait: "Pirate Coat", type: "Armour", total: 65, effects: ["Increases Speed.", "Increases Bleed."] },
    { assetId: 3586495594, trait: "Rogue", type: "Armour", total: 45, effects: ["Increases Speed.", "Increases Dexterity."] },
    { assetId: 3586495090, trait: "Arctic Shinobi", type: "Armour", total: 30, effects: ["Increases Speed.", "Resistance to Freeze."] },
    { assetId: 3668457150, trait: "Earth-Faction", type: "Armour", total: 35, effects: ["Resistance to Poison.", "Increases Nurture."] },
    { assetId: 3668457146, trait: "Dragon-Guard", type: "Armour", total: 35, effects: ["Resistance to Burn.", "Increases Shield."] }
  ],
  Extra: [
    { assetId: 1631307699, trait: "Crescent Moon Earring", type: "Extra", total: 50, effects: ["Increases Resist."] },
    { assetId: 1631308577, trait: "Dragon Fangs Earring", type: "Extra", total: 47, effects: ["Increases Burn."] },
    { assetId: 1631309418, trait: "Fusion Pearl Earring", type: "Extra", total: 49, effects: ["Increases Bless."] },
    { assetId: 2156520477, trait: "Tentacle Earring", type: "Extra", total: 45, effects: ["Increases Drown."] },
    { assetId: 2311097583, trait: "Hoop Earring", type: "Extra", total: 65, effects: ["Increases Health."] },
    { assetId: 3586495521, trait: "Golden Feathers", type: "Extra", total: 45, effects: ["Increases Speed.", "Increases Bless."] },
    { assetId: 3586495102, trait: "Battle Wound", type: "Extra", total: 45, effects: ["Increases Strength.", "Gain Bleed at the start of battle."] },
    { assetId: 3668457140, trait: "Crescent-Birthmark", type: "Extra", total: 35, effects: ["Resistance to Doom."] }
  ],
  Skin: [
    { trait: "Dark Skin", type: "Skin", champions: 195, effects: ["Increases Health.", "Increases Strength."] },
    { trait: "Tribal Dark Skin", type: "Skin", champions: 139, effects: ["Increases Health.", "Increases Poison."] },
    { trait: "Tribal Light Skin", type: "Skin", champions: 162, effects: ["Increases Dexterity.", "Increases Poison."] },
    { trait: "Fire Dragon", type: "Skin", champions: 43, effects: ["Apply Burn at the start of battle."] },
    { trait: "Undead", type: "Skin", champions: 86, effects: ["Gain Doom at the start of battle.", "Increases Strength."] },
    { trait: "Chameleon", type: "Skin", champions: 30, effects: ["Resistance to Poison."] },
    { trait: "Light Skin", type: "Skin", champions: 221, effects: ["Increases Intelligence."] },
    { trait: "Elder Dragon", type: "Skin", champions: 56, effects: ["Resistance to Burn."] },
    { trait: "Snake", type: "Skin", champions: 68, effects: ["Gain Cleanse at the start of battle."] }
  ]
};
var TRAIT_EFFECTS = Object.values(CHAMPION_TRAITS).flat().reduce((acc, traitDef) => {
  if (traitDef?.assetId) acc[Number(traitDef.assetId)] = traitDef.effects || [];
  return acc;
}, {});
var CHAMPION_ASSET_TRAITS = Object.entries(CHAMPION_TRAITS).filter(([type]) => type !== "Skin").flatMap(
  ([type, traitDefs]) => (Array.isArray(traitDefs) ? traitDefs : []).filter((traitDef) => traitDef?.assetId).map((traitDef) => ({
    assetId: Number(traitDef.assetId),
    name: traitDef.trait,
    type,
    total: traitDef.total ?? null,
    damageRoll: traitDef.damageRoll ?? null,
    damageType: traitDef.damageType ?? null,
    speedFactor: traitDef.speedFactor ?? null,
    effects: traitDef.effects || []
  }))
);
var CHAMPION_SKIN_TRAITS = (CHAMPION_TRAITS.Skin || []).map((traitDef) => ({
  assetId: null,
  name: traitDef.trait,
  type: "Skin",
  champions: traitDef.champions ?? null,
  effects: traitDef.effects || []
}));
var SKIN_EFFECTS = (CHAMPION_TRAITS.Skin || []).reduce((acc, traitDef) => {
  if (traitDef?.trait) acc[traitDef.trait] = traitDef.effects || [];
  return acc;
}, {});
var TRAIT_TYPE_BY_ASSET_ID = Object.entries(CHAMPION_TRAITS).reduce(
  (acc, [type, traitDefs]) => {
    if (type === "Skin") return acc;
    (Array.isArray(traitDefs) ? traitDefs : []).forEach((traitDef) => {
      if (traitDef?.assetId) acc[Number(traitDef.assetId)] = type;
    });
    return acc;
  },
  {}
);

// components/contracts/Arena/arenaTraitPerksV1.js
var passive = (id, name, description, bonuses) => ({ id, name, description, trigger: "always", statBonuses: bonuses });
var conditional = (id, name, description, condition, bonuses) => ({ id, name, description, trigger: "conditional", condition, statBonuses: bonuses });
var triggered = (id, name, description, trigger2, actions, condition = {}, chance = 1) => ({ id, name, description, trigger: trigger2, actions, condition, chance, deduplicate: "oncePerConfirmedHit", target: "self" });
var buff = (stats, durationSeconds) => ({ type: "buff", stats, durationSeconds, stacking: "refresh" });
var heal = (amount) => ({ type: "heal", amount });
var stamina = (amount) => ({ type: "restoreStamina", amount });
var barrier = (amount, durationSeconds) => ({ type: "barrier", amount, durationSeconds });
var cleanse = (ids) => ({ type: "cleanse", statusIds: ids, maxRemoved: 1, order: "oldestFirst" });
var apply = (id, target = "attacker") => ({ type: "applyStatus", id, target, potency: 1 });
var HEAD_PERKS = {
  crown_of_horns: [triggered("blood_price", "Blood Price", "After taking a direct hit below 40% health, gain +8% weapon power for 4s.", "directDamageTaken", [buff({ weaponPowerPct: 8 }, 4)], { selfHealthBelowPct: 40 })],
  all_knowing: [triggered("spell_insight", "Spell Insight", "An E ability hit refunds 1s of its cooldown. ", "abilityHit", [{ type: "refundAbilityCooldown", seconds: 1 }])],
  bone: [triggered("marrow_ward", "Marrow Ward", "After surviving a critical hit, gain a 10 HP barrier for 3s.", "criticalDamageTaken", [barrier(10, 3)])],
  dark_knight_helm: [triggered("dread_gaze", "Dread Gaze", "A weapon hit has a 30% chance to Weaken the target.", "weaponHit", [apply("weaken", "target")], {}, 0.3)],
  dragon_knight_helm: [passive("heat_tempered", "Heat Tempered", "+16 fire resistance.", { fireResistance: 16 })],
  dragon: [passive("predator", "Predator", "+4 percentage points critical chance.", { critChancePct: 4 })],
  elder: [conditional("still_mind", "Still Mind", "While stationary for at least 0.75s, gain +6% magic power. Snapshot at cast/attack commitment.", { stationarySecondsAtLeast: 0.75 }, { abilityPowerPct: 6 })],
  gladiator_helm: [triggered("second_bout", "Second Bout", "A weapon hit restores 6 stamina.", "weaponHit", [stamina(6)])],
  purity: [triggered("clean_break", "Clean Break", "Finishing an E cast removes your oldest cleanseable debuff.", "abilityFinished", [cleanse("allCleanseable")])],
  scarred: [passive("old_scars", "Old Scars", "+18 maximum health.", { maxHealth: 18 })],
  snake: [triggered("venom_feast", "Venom Feast", "Hitting a poisoned target restores 3 HP.", "directHit", [heal(3)], { targetHasStatus: "poison" })],
  undead: [{ ...triggered("refuse_death", "Refuse Death", "After surviving damage that crosses below 30% health, restore 10 HP.", "directDamageTaken", [heal(10)], { crossedBelowHealthPct: 30 }) }],
  uni_horn: [triggered("prismatic_ward", "Prismatic Ward", "Finishing an E cast grants an 8 HP barrier for 3s.", "abilityFinished", [barrier(8, 3)])],
  farmer: [triggered("harvest", "Harvest", "A weapon hit restores 3 HP.", "weaponHit", [heal(3)])],
  samurai: [triggered("iaijutsu", "Iaijutsu", "Finishing a weapon draw grants +6 percentage points crit chance for 3s.", "weaponDrawn", [buff({ critChancePct: 6 }, 3)])],
  barbarian: [passive("savage_critical", "Savage Critical", "+0.25x critical damage multiplier.", { critMultiplier: 0.25 })],
  gold_hermes_helm: [triggered("golden_stride", "Golden Stride", "Finishing an E cast grants +8% movement speed for 2s.", "abilityFinished", [buff({ moveSpeedPct: 8 }, 2)])],
  silver_hermes_helm: [triggered("silver_escape", "Silver Escape", "After surviving a critical hit, remove your oldest slow.", "criticalDamageTaken", [cleanse(["chill", "soaked"])])],
  pirate_bandana: [conditional("boarding_footwork", "Boarding Footwork", "Gain +3 percentage points crit chance when committing a weapon attack while moving.", { source: "weapon", movingAtCommit: true }, { critChancePct: 3 })],
  skel_tonian_mask: [passive("split_focus", "Split Focus", "+2 percentage points crit chance.", { critChancePct: 2 }), passive("other_half", "Other Half", "+2% magic power.", { abilityPowerPct: 2 })],
  frost: [triggered("cold_rebuke", "Cold Rebuke", "After a melee/punch hit damages you, 30% chance to Chill its attacker.", "directDamageTaken", [apply("chill")], { incomingAttackKinds: ["melee", "punch"] }, 0.3)],
  cyclops: [conditional("measured_blow", "Measured Blow", "Noncritical weapon strikes gain +6% weapon power. Evaluated after the critical roll.", { source: "weapon", critical: false }, { weaponPowerPct: 6 })],
  slayer: [conditional("finish_the_hunt", "Finish the Hunt", "+8% weapon power against a target below 35% health, evaluated before the hit.", { source: "weapon", targetHealthBelowPct: 35 }, { weaponPowerPct: 8 })],
  ram: [triggered("ram_charge", "Ram Charge", "A weapon hit has a 25% chance to Push the target.", "weaponHit", [apply("knockback", "target")], {}, 0.25)],
  cannibal: [triggered("blood_feast", "Blood Feast", "Hitting a bleeding target restores 4 HP.", "directHit", [heal(4)], { targetHasStatus: "bleed" })]
};
var ARMOUR_PERKS = {
  dark_knight_armour: [triggered("sheathed_bulwark", "Sheathed Bulwark", "Finishing a weapon stow grants an 18 HP barrier for 5s.", "weaponStowed", [barrier(18, 5)])],
  dragon_hunter_armour: [conditional("hunt_the_flame", "Hunt the Flame", "+9% weapon power against a burning target.", { source: "weapon", targetHasStatus: "burn" }, { weaponPowerPct: 9 })],
  dragon_knight_armour: [{ ...triggered("dragon_heart", "Dragon Heart", "After surviving damage that crosses below 50% health, gain a 20 HP barrier for 4s.", "directDamageTaken", [barrier(20, 4)], { crossedBelowHealthPct: 50 }) }],
  gladiator_armour: [passive("pit_fighter", "Pit Fighter", "+28 maximum health.", { maxHealth: 28 })],
  hidden_one: [triggered("hidden_opening", "Hidden Opening", "Finishing an E cast grants +8 percentage points crit chance for 3s.", "abilityFinished", [buff({ critChancePct: 8 }, 3)])],
  magicians_robe: [passive("spell_rhythm", "Spell Rhythm", "+10% E ability cooldown reduction; cooldown still starts after casting ends.", { cooldownReductionPct: 10 })],
  pharaoh: [triggered("royal_renewal", "Royal Renewal", "An E ability hit restores 8 HP.", "abilityHit", [heal(8)])],
  rags: [passive("unburdened", "Unburdened", "+5% movement speed.", { moveSpeedPct: 5 })],
  shinobi: [passive("rapid_forms", "Rapid Forms", "+7% attack haste.", { hastePct: 7 })],
  unchained: [triggered("break_chains", "Break Chains", "Finishing a weapon draw removes your oldest slow.", "weaponDrawn", [cleanse(["chill", "soaked"])]), passive("unbowed", "Unbowed", "+8% tenacity.", { tenacityPct: 8 })],
  emperor_armour: [passive("imperial_vigor", "Imperial Vigor", "+15 maximum health.", { maxHealth: 15 }), passive("royal_composure", "Royal Composure", "Reduce the BONUS portion of incoming critical damage by 25%; normal hit damage is unchanged.", { critBonusReductionPct: 25 })],
  elf_robe: [triggered("spell_to_arrow", "Spell to Arrow", "An E ability hit grants +8% attack haste for 4s.", "abilityHit", [buff({ hastePct: 8 }, 4)])],
  leather_garb: [passive("travel_ready", "Travel Ready", "+15 maximum stamina.", { maxStamina: 15 }), passive("padded", "Padded", "+10 maximum health.", { maxHealth: 10 })],
  executioner_robe: [passive("executioners_edge", "Executioner\u2019s Edge", "+0.35x critical damage multiplier.", { critMultiplier: 0.35 })],
  pirate_coat: [triggered("plunder_momentum", "Plunder Momentum", "A weapon critical grants +8% movement speed for 3s.", "weaponCritical", [buff({ moveSpeedPct: 8 }, 3)])],
  rogue: [passive("find_the_gap", "Find the Gap", "+6 percentage points critical chance.", { critChancePct: 6 })],
  arctic_shinobi: [triggered("slip_the_frost", "Slip the Frost", "After a slow is applied to you, remove your oldest slow.", "debuffApplied", [cleanse(["chill", "soaked"])], { appliedStatusIds: ["chill", "soaked"] })],
  earth_faction: [passive("deep_reserves", "Deep Reserves", "+30 maximum stamina.", { maxStamina: 30 })],
  dragon_guard: [passive("tempered_plates", "Tempered Plates", "+12 blunt, slashing and piercing resistance.", { bluntResistance: 12, slashingResistance: 12, piercingResistance: 12 })]
};
var EXTRA_PERKS = {
  crescent_moon_earring: [triggered("moon_echo", "Moon Echo", "An E ability critical refunds 1s of its cooldown.", "abilityCritical", [{ type: "refundAbilityCooldown", seconds: 1 }])],
  dragon_fangs_earring: [passive("fang_critical", "Fang Critical", "+0.15x critical damage multiplier.", { critMultiplier: 0.15 })],
  fusion_pearl_earring: [passive("pearl_focus", "Pearl Focus", "+2 percentage points critical chance.", { critChancePct: 2 })],
  tentacle_earring: [triggered("tidal_grip", "Tidal Grip", "Hitting a Soaked target restores 4 stamina.", "directHit", [stamina(4)], { targetHasStatus: "soaked" })],
  hoop_earring: [passive("sturdy_hoop", "Sturdy Hoop", "+10 maximum health.", { maxHealth: 10 })],
  golden_feathers: [passive("light_steps", "Light Steps", "Sprint consumes 10% less stamina.", { sprintCostReductionPct: 10 })],
  battle_wound: [conditional("last_laugh", "Last Laugh", "Below 40% health, gain +4 percentage points critical chance.", { selfHealthBelowPct: 40 }, { critChancePct: 4 })],
  crescent_birthmark: [triggered("lunar_release", "Lunar Release", "After Weaken or Exposed is applied to you, remove the oldest of those two debuffs.", "debuffApplied", [cleanse(["weaken", "exposed"])], { appliedStatusIds: ["weaken", "exposed"] })]
};
var SKIN_PERKS = {
  dark_skin: [passive("human_endurance", "Human Endurance", "+8% stamina recovery; same effect on both human skin tones.", { staminaRegenPct: 8 })],
  light_skin: [passive("human_endurance", "Human Endurance", "+8% stamina recovery; same effect on both human skin tones.", { staminaRegenPct: 8 })],
  tribal_dark_skin: [passive("trail_hardened", "Trail Hardened", "+8% tenacity; same effect on both tribal skin tones.", { tenacityPct: 8 })],
  tribal_light_skin: [passive("trail_hardened", "Trail Hardened", "+8% tenacity; same effect on both tribal skin tones.", { tenacityPct: 8 })],
  fire_dragon: [passive("ember_scales", "Ember Scales", "+12 fire resistance.", { fireResistance: 12 })],
  undead: [passive("grave_reserve", "Grave Reserve", "+10 maximum health.", { maxHealth: 10 })],
  chameleon: [triggered("startled_dash", "Startled Dash", "After surviving direct damage, gain +4% movement speed for 2s.", "directDamageTaken", [buff({ moveSpeedPct: 4 }, 2)])],
  elder_dragon: [triggered("ancient_flow", "Ancient Flow", "An E ability hit restores 5 stamina.", "abilityHit", [stamina(5)])],
  snake: [passive("venom_hide", "Venom Hide", "+12 poison resistance.", { poisonResistance: 12 })]
};
var BACKGROUND_PERKS = {
  aqua_background: [passive("aqua_ward", "Aqua Ward", "+6 water resistance.", { waterResistance: 6 })],
  blood_background: [passive("blood_moon_edge", "Blood Moon Edge", "+0.08x critical damage multiplier.", { critMultiplier: 0.08 })],
  cosmos_background: [passive("cosmic_study", "Cosmic Study", "+2% magic power.", { abilityPowerPct: 2 })],
  dungeon_background: [triggered("learn_the_miss", "Learn the Miss", "A completed weapon attack that hit nobody restores 3 stamina.", "weaponMissed", [stamina(3)])],
  forest_background: [passive("forest_vigor", "Forest Vigor", "+5 maximum health.", { maxHealth: 5 })],
  golden_background: [triggered("golden_arrival", "Golden Arrival", "On arena entry, gain a 5 HP barrier lasting 6s.", "roundStarted", [barrier(5, 6)])],
  midnight_background: [passive("night_focus", "Night Focus", "+1 percentage point critical chance.", { critChancePct: 1 })],
  noir_background: [passive("composure", "Composure", "+4% tenacity.", { tenacityPct: 4 })],
  red_moon_background: [conditional("red_resolve", "Red Resolve", "Below 40% health, gain +3% weapon power.", { selfHealthBelowPct: 40 }, { weaponPowerPct: 3 })],
  sunset_background: [passive("sunset_ward", "Sunset Ward", "+6 fire resistance.", { fireResistance: 6 })],
  toxic_background: [passive("toxic_ward", "Toxic Ward", "+6 poison resistance.", { poisonResistance: 6 })],
  valley_background: [passive("valley_pace", "Valley Pace", "+1% movement speed.", { moveSpeedPct: 1 })],
  golden_moon: [triggered("moonlit_spark", "Moonlit Spark", "An E ability critical restores 4 stamina.", "abilityCritical", [stamina(4)])],
  waves_background: [passive("steady_breath", "Steady Breath", "+5% stamina recovery.", { staminaRegenPct: 5 })],
  dawn_background: [triggered("small_renewal", "Small Renewal", "Finishing an E cast restores 2 HP.", "abilityFinished", [heal(2)])]
};
var WEAPON_PROC_CHANCES = {
  dragon_longsword: [0.45],
  dragon_staff: [0.55],
  executioner_axe: [0.25],
  scythe: [0.6],
  shield: [1],
  sickle: [0.35],
  trident: [0.4],
  dark_sword: [0.35],
  wooden_club: [0.7, 0.2],
  snake_wings: [0.5],
  sketonian_sword: [0.4],
  fire_wings: [0.6],
  elder_wings: [0.3],
  arctic_dual_katana: [0.35],
  lightning_staff: [0.45]
};
var WEAPON_EXTRA_PERKS = {
  dual_katana: [passive("paired_precision", "Paired Precision", "+3 percentage points critical chance.", { critChancePct: 3 })],
  spear: [conditional("measured_reach", "Measured Reach", "+4% weapon power when the target is at least 1.8m from your body at impact.", { source: "weapon", targetDistanceMAtLeast: 1.8 }, { weaponPowerPct: 4 })],
  elf_bow: [conditional("patient_aim", "Patient Aim", "Committing an arrow after standing still for 0.75s grants +4 percentage points crit chance to that arrow.", { source: "weapon", stationarySecondsAtLeast: 0.75 }, { critChancePct: 4 })],
  rusty_sword: [passive("jagged_edge", "Jagged Edge", "+0.12x critical damage multiplier.", { critMultiplier: 0.12 })],
  hedge_knight_sword: [passive("practiced_forms", "Practiced Forms", "+2% attack haste.", { hastePct: 2 })]
};

// components/contracts/Arena/arenaBalanceV1.js
var DAMAGE_TYPES = ["blunt", "slashing", "piercing", "fire", "frost", "lightning", "water", "poison", "shadow", "arcane"];
var STAT_DEFINITIONS = {
  maxHealth: { label: "Maximum health", base: 200, cap: [160, 280], unit: "HP", effect: "Damage required to defeat the champion." },
  maxStamina: { label: "Maximum stamina", base: 100, cap: [100, 140], unit: "points", effect: "Sprint endurance; attacks cost no stamina." },
  staminaRegenPct: { label: "Stamina recovery", base: 0, cap: [0, 25], unit: "%", effect: "Increases the 22 stamina/s recovery rate after its delay." },
  powerPct: { label: "Universal power", base: 0, cap: [0, 18], unit: "%", effect: "Increases all damage; adds to the relevant specialized power, combined cap 25%." },
  weaponPowerPct: { label: "Weapon power", base: 0, cap: [0, 18], unit: "%", effect: "Boosts melee, punches and bow attacks plus their applied DOTs. Staff bolts use magic power instead." },
  abilityPowerPct: { label: "Magic power", base: 0, cap: [0, 18], unit: "%", effect: "Boosts staff LMB bolts and all E abilities, their DOTs and fields; never control duration or projectile size." },
  hastePct: { label: "Attack haste", base: 0, cap: [0, 18], unit: "%", effect: "Shortens the complete LMB cycle; does not alter draw/stow or magic cooldown." },
  castSpeedPct: { label: "Casting speed", base: 0, cap: [0, 15], unit: "%", effect: "Shortens E cast time; minimum cast 0.55 s. Does not alter projectile travel speed." },
  moveSpeedPct: { label: "Movement speed", base: 0, cap: [-10, 10], unit: "%", effect: "Multiplies walk/run speed before directional and action modifiers." },
  tenacityPct: { label: "Tenacity", base: 0, cap: [0, 40], unit: "%", effect: "Shortens slows, Exposed, Weaken and Stagger; does not shorten DOTs." },
  cooldownReductionPct: { label: "Ability cooldown reduction", base: 0, cap: [0, 20], unit: "%", effect: "Reduces the cooldown that starts when E casting finishes or is interrupted." },
  critChancePct: { label: "Critical chance", base: 10, cap: [10, 25], unit: "%", effect: "10% baseline; gear and temporary buffs add percentage points, capped at 25%." },
  critMultiplier: { label: "Critical multiplier", base: 2, cap: [2, 2.5], unit: "x", effect: "2x baseline; gear adds to the multiplier, capped at 2.5x. No DOT/field crits." },
  critBonusReductionPct: { label: "Critical bonus protection", base: 0, cap: [0, 30], unit: "%", effect: "Reduces only the bonus portion of an incoming critical, never its normal-hit portion." },
  sprintCostReductionPct: { label: "Sprint efficiency", base: 0, cap: [0, 25], unit: "%", effect: "Reduces sprint stamina drain: 18 * (1 - reduction/100) points/s." },
  ...Object.fromEntries(DAMAGE_TYPES.map((type) => [type + "Resistance", {
    label: type[0].toUpperCase() + type.slice(1) + " resistance",
    base: 20,
    cap: [0, 65],
    unit: "rating",
    effect: `Reduces ${type} damage only: damage multiplier = 100 / (100 + rating).`
  }]))
};
var ARENA_RULES = {
  version: "1.4.0",
  status: "playtest-candidate",
  mode: { initial: "freeForAll", maxPlayers: 8, friendlyFire: true, death: "Remove champion from the room; explicit practice re-entry with a fresh NFT ownership lookup required.", resetOnEntry: ["health", "stamina", "statuses", "magicCooldown", "weaponCarryState"], spawnRadiusM: 10 },
  base: Object.fromEntries(Object.entries(STAT_DEFINITIONS).map(([key, s]) => [key, s.base])),
  caps: Object.fromEntries(Object.entries(STAT_DEFINITIONS).map(([key, s]) => [key, s.cap])),
  movement: {
    walkMps: 1.65,
    runMps: 3.2,
    backwardMultiplier: 0.8,
    sideMultiplier: 0.9,
    diagonalNormalization: true,
    attackMoveMultiplier: 0.75,
    castMoveMultiplier: 0.7,
    sprintDuringAttack: true,
    staminaStat: "maxStamina",
    sprintCostPerSecond: 18,
    staminaRegenPerSecond: 22,
    staminaRegenDelaySeconds: 1,
    attackStaminaCost: 0,
    emptyStaminaBehavior: "Walk; attacking remains available."
  },
  inputs: { move: "WASD", sprint: "Shift", aim: "Mouse", weaponToggle: "RMB", attack: "LMB", ability: "E" },
  timing: {
    simulationHz: 30,
    inputBufferSeconds: 0.12,
    globalActionLock: ["attack", "ability", "draw", "stow"],
    cancelRule: "Movement and facing remain available; committed actions cannot cancel into another action.",
    interruptedAction: "Skip remaining hits and consume recovery. Only an interrupted magic cast starts a recast cooldown."
  },
  targeting: {
    melee: "Swept weapon volume during its authored strike window; no hit merely from the VFX ribbon.",
    meleeDeduplication: "One hit per target per attackId and strike index; each katana/punch is a separate strike.",
    projectiles: "Swept sphere from previous to next position; first champion or wall stops it; owner ignored.",
    projectileHeading: "Snapshot champion facing at release. No homing or camera auto-aim.",
    hitbox: "Identical body capsules for all skins; ears, tails, wings and equipment do not enlarge the hurtbox.",
    cleave: "Full damage and independent crit/proc rolls on each confirmed target. One hit per target per strike.",
    headshots: false
  },
  damage: {
    physical: ["slashing", "piercing", "blunt"],
    elemental: ["fire", "frost", "lightning", "water", "poison", "shadow", "arcane"],
    formula: "rolledDamage * critMultiplier * (1 + combinedPowerPct / 100) * 100 / (100 + damageTypeResistance)",
    combinedPowerCapPct: 25,
    defence: "Use exactly one matching resistance: blunt, slashing, piercing, fire, frost, lightning, water, poison, shadow or arcane. Source weapon/ability does not determine defence. Exposed subtracts 8 from the matching rating, minimum 0.",
    order: ["dice total including flat bonus", "critical multiplier", "outgoing power and weaken", "matching resistance", "front guard", "temporary barrier", "health"],
    rounding: "Keep float HP internally; round only UI numbers.",
    crits: { chance: 0.1, multiplier: 2 },
    randomMisses: false,
    rolls: "Each confirmed strike rolls its own dice and one independent critical check. Every confirmed target rolls independently. Dual weapons roll independently per strike. Misses do not reroll; an attackId/strike/target deduplication record prevents duplicate hits.",
    randomness: "Authoritative match RNG only. Inject RNG into helpers; record rolls for replays. Never use frame rate, clients or VFX particle count to decide damage.",
    secondaryDamage: "Burn/Bleed/Poison use their fixed rates and never crit. A poison field rolls its rate once per cast, never per frame, and never crits. A critical impact does not amplify its applied status or field.",
    dotPower: "Snapshot source power on application; use current target defence at each tick.",
    dotDisplayTickSeconds: 1,
    rawDotDpsCap: 8,
    barrierCapHp: 30,
    periodicCap: "No shared periodic DPS cap: stacked DOT potency scales its full rate. Mitigate each DOT/field contribution, then apply rate * dt. Aggregate floating damage labels once per second.",
    guardAffectsDots: false,
    procsFromDots: false,
    lifestealFromDots: false
  },
  statuses: {
    stacking: "One effect entry per target and status, shared across attackers. Every successful application adds one stack and its potency to the total.",
    refresh: "Add incoming potency and reset the whole stack expiry to now plus the effect duration after tenacity. Expired or cleansed effects restart at one stack. Refresh never applies an instant damage tick.",
    credit: "Latest applying source receives status damage credit. Preserve accumulated damage power using a potency-weighted average of applications.",
    slows: "Stack potency within each slow; use the strongest slow type. Clamp movement reduction to 100% so it cannot reverse movement.",
    tenacity: "Multiply incoming slow, exposed, weaken and stagger duration by (1 - tenacityPct/100). Does not shorten DOTs.",
    potency: { minimum: 0.25, maximumPerApplication: 2, default: 1, stacking: "Sum application potency without a stack cap. HUD displays application count, not fractional potency. Percentage reductions stop at 100%." },
    knockback: "Clamp to arena and collision geometry. No wall damage; does not interrupt unless stagger is also applied.",
    sourceCooldown: "None. Every confirmed hit independently rolls each effect, even immediately after success."
  },
  perks: {
    maxPerTrait: 2,
    counts: "One named passive, conditional or triggered mechanic counts as one perk. Weapon/ability base damage and universal Second wind are baseline mechanics, not extra perks.",
    eventOrder: "Resolve death first. Survivors emit damage-taken events. Emit primary-hit events, roll weapon procs and apply statuses, then emit debuffApplied reactions. A lethal hit cannot trigger a survival heal or barrier.",
    hitEligibility: "Each confirmed primary hit, including each katana strike, independently rolls eligible on-hit effects. Repeated overlap from the same strike is deduplicated. DOTs and fields never roll additional hit effects.",
    procChance: "Each eligible effect independently rolls its chance on every confirmed hit, including consecutive successes. No internal effect cooldown. No proc chains.",
    linkedWeaponHandlers: "Abilities marked weaponOnHit describe their indexed onHit entry; process that entry ONCE, not a second time as a generic perk. magicCast similarly describes the equipped E action.",
    conditionalSampling: "movingAtCommit and stationarySecondsAtLeast are snapshots at action commitment. Source and target conditions use the pre-hit state. critical:false is evaluated after the critical roll and may modify power only. Re-evaluate health threshold buffs for every hit.",
    buffs: "Sum different stat buffs with gear, then clamp to STAT_DEFINITIONS caps. Same perk refreshes, never stacks. All damage increases must use the power stats and the shared 25% combined power cap.",
    refunds: "Maximum 2s cooldown refund per cast, never reduce the post-cast cooldown below 4s. Hits before casting ends bank the refund for that cast. Refunds never reset the ability or refund a later cast.",
    healing: "Every qualifying hit can heal. Clamp to missing health. No timer or cooldown; heal amounts are deliberately small.",
    barriers: "Shared 30 HP barrier pool. Grants add only until 30; each grant keeps its own expiry and earliest-expiring HP is consumed first. No damage reflection or barrier procs.",
    resets: "New entry resets health, stamina, statuses and action identifiers. Changing carry state never resets magic cooldown.",
    eventDefinitions: { weaponHit: "Confirmed primary LMB hit, including staff bolts.", abilityHit: "Confirmed primary E projectile impact.", directHit: "weaponHit or abilityHit.", weaponCritical: "weaponHit that crits.", abilityCritical: "abilityHit that crits.", directDamageTaken: "Surviving a primary direct hit that removes health; periodic and barrier-only damage excluded.", criticalDamageTaken: "directDamageTaken from a critical.", abilityFinished: "Successful completion of E casting; not interruption.", weaponDrawn: "Completed draw, not the button press.", weaponStowed: "Completed stow.", debuffApplied: "A hostile debuff actually applied/refreshed; immunities do not emit it. Reaction perks cannot generate new proc events.", weaponMissed: "Completed LMB action with zero targets hit across ALL strikes.", roundStarted: "After countdown ends." }
  },
  fairness: {
    rarityGrantsPower: false,
    skinsAndBackgroundsCosmetic: false,
    emptySlots: { head: null, armour: null, extra: null, weapon: "unarmed", magic: null, background: "dawn_background" },
    duplicateAccessories: "An Extra on both ears counts once, not twice.",
    loadoutChanges: "Only on entry; validate public NFT ownership and current equipped traits on the authority. Practice entry has no wallet signature and does not prove wallet control."
  },
  targets: {
    weaponRawSustainedDps: [23, 33],
    typicalDuelSeconds: [9, 15],
    note: "DPS target includes long-run DOT uptime at full hit rate, not burst. Range, guard, mobility and control justify differences. Duel length is a design target, not a measured result."
  }
};
var DAMAGE_PALETTE = {
  slashing: "#c8e9ff",
  piercing: "#ffe58a",
  blunt: "#e5aa59",
  fire: "#ff742e",
  frost: "#83eeff",
  lightning: "#fff14e",
  water: "#269fff",
  poison: "#66ef68",
  shadow: "#a965ff",
  arcane: "#ed79ff"
};
var STATUS_EFFECTS = {
  burn: { label: "Burn", kind: "dot", damageType: "fire", damagePerSecond: 4, durationSeconds: 2, cleanseable: true },
  bleed: { label: "Bleed", kind: "dot", damageType: "slashing", damagePerSecond: 3, durationSeconds: 3, cleanseable: true },
  poison: { label: "Poison", kind: "dot", damageType: "poison", damagePerSecond: 3, durationSeconds: 4, cleanseable: true },
  chill: { label: "Chill", kind: "slow", slowPct: 20, durationSeconds: 2, cleanseable: true },
  soaked: { label: "Soaked", kind: "slow", slowPct: 12, durationSeconds: 2.5, cleanseable: true },
  exposed: { label: "Exposed", kind: "defenceReduction", allResistanceReduction: 8, durationSeconds: 3, cleanseable: true },
  weaken: {
    label: "Weaken",
    kind: "outgoingDamageReduction",
    powerReductionPct: 8,
    durationSeconds: 2.5,
    cleanseable: true,
    calculation: "Multiply outgoing direct and snapshotted periodic damage by 0.92 after equipment power."
  },
  stagger: {
    label: "Stagger",
    kind: "interrupt",
    durationSeconds: 0.16,
    cleanseable: false,
    behavior: "Interrupt once and briefly prevent actions; never ragdoll. Repeated hits can interrupt again; no immunity cooldown."
  },
  knockback: { label: "Push", kind: "displacement", distanceM: 0.65, durationSeconds: 0.12, cleanseable: false }
};
var SLOT_BUDGETS = { Head: 6, Armour: 12, Extra: 4, Skin: 4, Background: 2, Weapon: 2, Magic: 2 };
function bindPerks(entry, abilities, budget) {
  if (abilities.length < 1 || abilities.length > 2) throw new Error("Traits need one or two perks: " + entry.name);
  entry.abilities = abilities.map((a, i) => ({ ...a, budgetWeight: abilities.length === 1 ? budget : i === 0 ? Math.floor(budget / 2) : Math.ceil(budget / 2) }));
  entry.statBonuses = {};
  for (const a of entry.abilities) if (a.trigger === "always") for (const [key, value] of Object.entries(a.statBonuses || {})) entry.statBonuses[key] = (entry.statBonuses[key] || 0) + value;
  return entry;
}
var status = (id) => ({ id, trigger: "confirmedHit", strike: "each", chance: 1, potency: 1 });
var projectileSpec = (spec) => {
  if (!spec) return void 0;
  if (!(spec.widthM > 0 && spec.maxRangeM > 0 && spec.speedMps > 0)) throw new Error("Invalid projectile size/range");
  return { ...spec, collider: "sweptSphere", widthDefinition: "Full collision diameter in metres; radius = widthM / 2. Visual must match." };
};
var weapon = (name, animation, damageType, damageRolls, cycleSeconds, reachM, onHit = [], options = {}) => ({
  name,
  animation,
  damageType,
  damageRolls,
  cycleSeconds,
  attacksPerSecond: 1 / cycleSeconds,
  reachM,
  onHit,
  statBonuses: {},
  powerSource: animation === "dragon_staff" ? "ability" : "weapon",
  critical: { chance: 0.1, multiplier: 2 },
  criticalUsesChampionStats: true,
  attackKind: "melee",
  statusPolicy: "Each confirmed hit rolls independently; no proc or crit cooldown.",
  hitRadiusM: 0.12,
  ...options,
  projectile: projectileSpec(options.projectile)
});
var WEAPONS = {
  dragon_longsword: weapon("Dragon Long Sword", "dragon_longsword", "fire", ["4d6+17"], 1.4, 1.9, [status("burn")]),
  dragon_staff: weapon(
    "Dragon Staff",
    "dragon_staff",
    "fire",
    ["3d10+16"],
    1.65,
    13,
    [status("burn")],
    { attackKind: "projectile", projectile: { speedMps: 9, widthM: 0.32, maxRangeM: 13 } }
  ),
  dual_katana: weapon("Dual Katana", "dual_katana", "slashing", ["3d6+5", "3d6+5"], 1.15, 1.5, [], { hitRadiusM: 0.1 }),
  executioner_axe: weapon("Executioner Axe", "executioner_axe", "slashing", ["5d8+22"], 1.7, 2, [status("stagger")], { hitRadiusM: 0.18 }),
  scythe: weapon("Scythe", "scythe", "slashing", ["3d10+20"], 1.55, 2.3, [status("bleed")], { hitRadiusM: 0.14 }),
  shield: weapon(
    "Shield",
    "shield",
    "blunt",
    ["3d8+12"],
    1.2,
    1.05,
    [status("knockback")],
    { guard: {
      frontConeDegrees: 100,
      damageReductionPct: 15,
      moveSpeedPenaltyPct: 5,
      activeWhen: "Held, idle or moving; inactive for the entire attack, ability, draw or stow.",
      stacks: false
    } }
  ),
  sickle: weapon("Sickle", "sickle", "slashing", ["3d6+12"], 1, 1.42, [status("bleed")]),
  spear: weapon("Spear", "spear", "piercing", ["4d6+18"], 1.25, 2.5, [], { hitRadiusM: 0.09 }),
  trident: weapon("Trident", "trident", "water", ["4d6+18"], 1.35, 2.35, [status("soaked")], { hitRadiusM: 0.14 }),
  dark_sword: weapon("Dark Sword", "dark_sword", "shadow", ["4d6+17"], 1.25, 1.85, [status("weaken")]),
  elf_bow: weapon(
    "Elf Bow",
    "elf_bow",
    "piercing",
    ["4d8+13"],
    1.35,
    15,
    [],
    { attackKind: "projectile", projectile: { speedMps: 16, widthM: 0.16, maxRangeM: 15 } }
  ),
  wooden_club: weapon("Wooden Club", "wooden_club", "blunt", ["4d10+20"], 1.6, 1.9, [status("knockback"), status("stagger")], { hitRadiusM: 0.2 }),
  snake_wings: weapon(
    "Snake Wings",
    "snake_wings",
    "poison",
    ["2d6+5", "2d6+5"],
    1,
    1.05,
    [status("poison")],
    { attackKind: "punch", permanent: true, statBonuses: { moveSpeedPct: 2 } }
  ),
  sketonian_sword: weapon("Ske'tonian Sword", "dark_sword", "slashing", ["4d6+17"], 1.3, 1.8, [status("exposed")]),
  fire_wings: weapon(
    "Fire Wings",
    "snake_wings",
    "fire",
    ["2d6+5", "2d6+5"],
    1.05,
    1.05,
    [status("burn")],
    { attackKind: "punch", permanent: true, statBonuses: { moveSpeedPct: 2 } }
  ),
  elder_wings: weapon(
    "Elder Wings",
    "snake_wings",
    "arcane",
    ["3d4+5", "3d4+5"],
    1.05,
    1.05,
    [status("weaken")],
    { attackKind: "punch", permanent: true, statBonuses: { moveSpeedPct: 2 } }
  ),
  chameleon_wings: weapon(
    "Chameleon Wings",
    "snake_wings",
    "poison",
    ["3d4+5", "3d4+5"],
    1,
    1.05,
    [],
    { attackKind: "punch", permanent: true, statBonuses: { moveSpeedPct: 3 } }
  ),
  arctic_dual_katana: weapon("Arctic Dual Katana", "dual_katana", "frost", ["3d6+3", "3d6+3"], 1.15, 1.55, [status("chill")]),
  rusty_sword: weapon("Rusty Sword", "dark_sword", "slashing", ["4d6+14"], 1.05, 1.65, []),
  lightning_staff: weapon(
    "Lightning Staff",
    "dragon_staff",
    "lightning",
    ["4d6+18"],
    1.45,
    12,
    [status("exposed")],
    { attackKind: "projectile", projectile: { speedMps: 12, widthM: 0.26, maxRangeM: 12 } }
  ),
  hedge_knight_sword: weapon("Hedge-Knight Sword", "dark_sword", "slashing", ["4d6+18"], 1.25, 1.8, [])
};
var ability = (name, label, damageType, damageRoll, cooldownSeconds, onHit, projectile, options = {}) => ({
  name,
  label,
  damageType,
  damageRoll,
  cooldownSeconds,
  castSeconds: 0.65,
  releasePhase: 0.6,
  powerSource: "ability",
  critical: { chance: 0.1, multiplier: 2 },
  criticalUsesChampionStats: true,
  onHit,
  projectile: projectileSpec(projectile),
  attackKind: "projectile",
  ...options
});
var MAGIC = {
  dark_magic: ability("Dark Magic", "Withering bolt", "shadow", "4d6+8", 11, [status("weaken")], { speedMps: 10, widthM: 0.4, maxRangeM: 11 }),
  fire_magic: ability("Fire Magic", "Ember shot", "fire", "3d8+14", 11, [status("burn")], { speedMps: 10, widthM: 0.36, maxRangeM: 11 }),
  lightning_magic: ability("Lightning Magic", "Disrupting spark", "lightning", "4d6+9", 12, [status("stagger")], { speedMps: 17, widthM: 0.24, maxRangeM: 10 }),
  water_magic: ability("Water Magic", "Tidal pulse", "water", "4d6+6", 11, [status("soaked"), status("knockback")], { speedMps: 9, widthM: 0.5, maxRangeM: 10 }),
  ice_daggers: ability(
    "Ice Daggers",
    "Ice lance",
    "frost",
    "4d6+9",
    12,
    [status("chill")],
    { speedMps: 13, widthM: 0.3, maxRangeM: 11 },
    { visual: "Render several ice daggers around ONE collider; roll the direct damage once, not once per visible dagger." }
  ),
  poison_cloud: ability(
    "Poison Cloud",
    "Venom mist",
    "poison",
    "3d4+5",
    13,
    [status("poison")],
    { speedMps: 8, widthM: 0.44, maxRangeM: 9 },
    { impactField: {
      radiusM: 1.4,
      durationSeconds: 3,
      damageRateRoll: "1d4+1",
      rollOncePerCast: true,
      canCrit: false,
      damageType: "poison",
      appliesStatuses: false,
      placement: "At first impact or maximum range; only the initial impact applies poison.",
      maxActivePerCaster: 1
    } }
  ),
  blood_shards: ability(
    "Blood-Shards",
    "Crimson shard",
    "slashing",
    "3d6+13",
    11,
    [status("bleed")],
    { speedMps: 12, widthM: 0.3, maxRangeM: 10 },
    { visual: "Shard fan is one projectile collider, with one hit per target." }
  )
};
var slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
function makeTraits(category, profiles2) {
  return Object.fromEntries(CHAMPION_TRAITS[category].map(({ trait: name }) => {
    const id = slug(name);
    if (!profiles2[id]) throw new Error("Missing perk profile: " + name);
    return [id, bindPerks({ name }, profiles2[id], SLOT_BUDGETS[category])];
  }));
}
var HEADS = makeTraits("Head", HEAD_PERKS);
var ARMOUR = makeTraits("Armour", ARMOUR_PERKS);
var EXTRAS = makeTraits("Extra", EXTRA_PERKS);
var SKINS = makeTraits("Skin", SKIN_PERKS);
var BACKGROUNDS = makeTraits("Background", BACKGROUND_PERKS);
for (const [id, w] of Object.entries(WEAPONS)) {
  w.onHit.forEach((effect, i) => {
    effect.chance = WEAPON_PROC_CHANCES[id]?.[i] ?? 1;
    effect.potency = { executioner_axe: 1.25, scythe: 1.15, sickle: 0.85, snake_wings: 0.75, fire_wings: 0.75, elder_wings: 0.8, arctic_dual_katana: 0.8, wooden_club: 1.15 }[id] ?? 1;
  });
  const perks = w.onHit.map((effect, i) => ({
    id: id + "_" + effect.id,
    name: STATUS_EFFECTS[effect.id].label + " strike",
    description: `${Math.round(effect.chance * 100)}% chance to apply ${STATUS_EFFECTS[effect.id].label} on every confirmed hit at ${effect.potency}x potency; no cooldown.`,
    trigger: "weaponHit",
    chance: effect.chance,
    potency: effect.potency,
    strike: "each",
    deduplicate: "oncePerConfirmedHit",
    actions: [{ type: "applyStatus", id: effect.id, target: "target", potency: effect.potency }],
    handler: "weaponOnHit",
    onHitIndex: i
  }));
  if (w.guard) perks.push({ id: "shield_guard", name: "Frontal Guard", description: "While held outside actions, reduce frontal direct damage by 15% in a 100-degree cone; movement is 5% slower.", trigger: "guard", guard: w.guard });
  for (const perk of WEAPON_EXTRA_PERKS[id] || []) perks.push(perk);
  if (w.permanent) perks.push(passive(id + "_mobility", "Wing Footwork", `+${w.statBonuses.moveSpeedPct}% movement speed; wings never enable flight.`, { moveSpeedPct: w.statBonuses.moveSpeedPct }));
  bindPerks(w, perks, SLOT_BUDGETS.Weapon);
}
for (const a of Object.values(MAGIC)) for (const e of a.onHit) e.potency = 1.25;
for (const [id, a] of Object.entries(MAGIC)) bindPerks(a, [{
  id: id + "_cast",
  name: a.label,
  trigger: "activeAbility",
  handler: "magicCast",
  description: `Cast ${a.damageRoll} ${a.damageType} damage; ${a.projectile.maxRangeM}m range, ${a.projectile.widthM}m width. On hit: ${a.onHit.map((e) => STATUS_EFFECTS[e.id].label).join(" and ")}. ${a.cooldownSeconds}s cooldown after casting.${a.impactField ? " Impact mist: roll " + a.impactField.damageRateRoll + " HP/s once per cast; " + a.impactField.radiusM + "m radius for " + a.impactField.durationSeconds + "s; no crits or extra status procs." : ""}`
}], SLOT_BUDGETS.Magic);
var TRAINING = {
  weapon: weapon("Training Sword", "dark_sword", "slashing", ["4d6+18"], 1.25, 1.8, []),
  magic: ability("Training Pulse", "Training pulse", "arcane", "4d6+15", 11, [], { speedMps: 11, widthM: 0.36, maxRangeM: 11 })
};
Object.assign(TRAINING.weapon, { id: "training_sword", modelId: "dark_sword", category: "Weapon", assetId: null });
Object.assign(TRAINING.magic, { id: "training_pulse", modelId: "dark_magic", category: "Magic", assetId: null });
bindPerks(TRAINING.weapon, [passive("training_forms", "Training Forms", "+2% attack haste.", { hastePct: 2 })], SLOT_BUDGETS.Weapon);
bindPerks(TRAINING.magic, [{ id: "training_cast", name: "Training Pulse", trigger: "activeAbility", handler: "magicCast", description: "Cast the training arcane projectile; no additional status." }], SLOT_BUDGETS.Magic);
var UNARMED = { ...WEAPONS.snake_wings, id: "unarmed", name: "Unarmed", damageType: "blunt", damageRolls: ["2d6+5", "2d6+5"], onHit: [], abilities: [], statBonuses: {}, permanent: true };
var TRAITS = { Weapon: WEAPONS, Magic: MAGIC, Head: HEADS, Armour: ARMOUR, Extra: EXTRAS, Skin: SKINS, Background: BACKGROUNDS };
for (const [category, entries] of Object.entries(TRAITS)) for (const [id, entry] of Object.entries(entries)) {
  const identity = CHAMPION_TRAITS[category].find((t) => t.trait === entry.name);
  if (!identity) throw new Error(`Unknown ${category} identity: ${entry.name}`);
  Object.assign(entry, { id, category, assetId: identity.assetId ?? null });
  entry.effects = describeTrait(entry);
}
function describeTrait(entry) {
  return entry.abilities.map((a) => `${a.name}: ${a.description}`);
}
function buildArenaStats(loadout = {}) {
  const stats = { ...ARENA_RULES.base }, selected = {};
  for (const [slot, entries, fallback] of [["head", HEADS, "bone"], ["armour", ARMOUR, "leather_garb"], ["extra", EXTRAS, "hoop_earring"]]) {
    const id = loadout[slot] === null ? null : loadout[slot] ?? fallback;
    if (id === null) {
      selected[slot] = null;
      continue;
    }
    if (!entries[id]) throw new Error(`Unknown ${slot}: ${id}`);
    selected[slot] = entries[id];
  }
  selected.weapon = loadout.weapon == null ? UNARMED : WEAPONS[loadout.weapon];
  selected.magic = loadout.magic == null ? null : MAGIC[loadout.magic];
  selected.skin = SKINS[slug(loadout.skin || "Undead")];
  selected.background = BACKGROUNDS[slug(loadout.background || "Dawn Background")];
  if (!selected.weapon || loadout.magic != null && !selected.magic || !selected.skin || !selected.background) throw new Error("Unknown weapon, magic, skin or background");
  for (const trait of Object.values(selected).filter(Boolean)) for (const [key, value] of Object.entries(trait.statBonuses || {})) stats[key] += value;
  for (const [key, [min, max]] of Object.entries(ARENA_RULES.caps)) stats[key] = Math.min(max, Math.max(min, stats[key]));
  return { stats, selected, perks: Object.entries(selected).filter(([, trait]) => trait).flatMap(([slot, trait]) => trait.abilities.map((a) => ({ ...a, slot, traitId: trait.id }))) };
}
function attackTiming(weaponId, authoredDurationSeconds, hastePct = 0) {
  const w = weaponId == null ? UNARMED : WEAPONS[weaponId];
  if (!w || !Number.isFinite(authoredDurationSeconds) || authoredDurationSeconds <= 0 || !Number.isFinite(hastePct)) throw new Error("Invalid attack timing");
  const h = Math.max(0, Math.min(ARENA_RULES.caps.hastePct[1], hastePct));
  const durationSeconds = w.cycleSeconds / (1 + h / 100);
  return { durationSeconds, attacksPerSecond: 1 / durationSeconds, speedFactor: authoredDurationSeconds / durationSeconds };
}
function abilityTiming(magicId, cooldownReductionPct = 0, castSpeedPct = 0) {
  const a = MAGIC[magicId];
  if (!a || !Number.isFinite(cooldownReductionPct) || !Number.isFinite(castSpeedPct)) throw new Error("Invalid ability timing");
  const c = Math.max(0, Math.min(ARENA_RULES.caps.cooldownReductionPct[1], cooldownReductionPct));
  const speed = Math.max(0, Math.min(ARENA_RULES.caps.castSpeedPct[1], castSpeedPct));
  const castSeconds = Math.max(0.55, a.castSeconds / (1 + speed / 100)), cooldownSeconds = a.cooldownSeconds * (1 - c / 100);
  return {
    castSeconds,
    cooldownSeconds,
    recastIntervalSeconds: castSeconds + cooldownSeconds,
    cooldownStarts: "When the cast finishes. If interrupted early, the full cooldown begins at interruption; the interrupted action still consumes remaining recovery."
  };
}
function diceStatistics(expression) {
  const match = /^([1-9]\d*)d([1-9]\d*)(?:\+([0-9]+))?$/.exec(expression);
  if (!match) throw new Error("Invalid dice expression: " + expression);
  const [, n, s, m] = match, count = Number(n), sides = Number(s), modifier = Number(m || 0);
  if (count > 20 || sides < 2 || sides > 100 || modifier > 200) throw new Error("Dice expression exceeds supported limits");
  return {
    count,
    sides,
    modifier,
    min: count + modifier,
    max: count * sides + modifier,
    mean: count * (sides + 1) / 2 + modifier,
    variance: count * (sides * sides - 1) / 12
  };
}
function randomUnit(rng) {
  if (typeof rng !== "function") throw new Error("Supply an authoritative RNG");
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("RNG must return [0, 1)");
  return value;
}
function rollDice(expression, rng) {
  const { count, sides, modifier } = diceStatistics(expression), dice = [];
  for (let i = 0; i < count; i++) dice.push(1 + Math.floor(randomUnit(rng) * sides));
  return { expression, dice, modifier, total: dice.reduce((sum, n) => sum + n, modifier) };
}
function combinedPower(stats = {}, sourceKind = "weapon") {
  if (!["weapon", "ability"].includes(sourceKind)) throw new Error("Unknown damage source kind");
  const specific = sourceKind === "weapon" ? "weaponPowerPct" : "abilityPowerPct";
  const universal = stats.powerPct ?? 0, specialized = stats[specific] ?? 0;
  if (!Number.isFinite(universal) || !Number.isFinite(specialized)) throw new Error("Invalid power");
  return Math.min(ARENA_RULES.damage.combinedPowerCapPct, Math.max(0, universal) + Math.max(0, specialized));
}
function criticalProfile(stats = {}) {
  const chance = stats.critChancePct ?? ARENA_RULES.base.critChancePct, multiplier = stats.critMultiplier ?? ARENA_RULES.base.critMultiplier;
  if (!Number.isFinite(chance) || !Number.isFinite(multiplier)) throw new Error("Invalid critical stats");
  const [minChance, maxChance] = ARENA_RULES.caps.critChancePct, [minMultiplier, maxMultiplier] = ARENA_RULES.caps.critMultiplier;
  return { chance: Math.max(minChance, Math.min(maxChance, chance)) / 100, multiplier: Math.max(minMultiplier, Math.min(maxMultiplier, multiplier)) };
}
function tryStatusProc(effect, { strikeIndex = 0 } = {}, rng) {
  if (!Number.isInteger(strikeIndex) || strikeIndex < 0 || !Number.isFinite(effect.chance) || effect.chance < 0 || effect.chance > 1) throw new Error("Invalid proc context");
  const applied = effect.chance === 1 ? true : effect.chance === 0 ? false : randomUnit(rng) < effect.chance;
  return { applied, reason: applied ? "applied" : "chance", potency: effect.potency ?? 1 };
}
function potentStatus(id, potency = 1, stacked = false) {
  const base = STATUS_EFFECTS[id];
  if (!base || !Number.isFinite(potency)) throw new Error("Invalid status potency");
  const value = Math.max(0.25, stacked ? potency : Math.min(2, potency)), effect = { ...base, id, potency: value };
  for (const key of ["damagePerSecond", "slowPct", "allResistanceReduction", "powerReductionPct", "distanceM"]) if (effect[key] != null) effect[key] *= value;
  if (effect.kind === "interrupt") effect.durationSeconds *= value;
  if (effect.slowPct) effect.slowPct = Math.min(100, effect.slowPct);
  if (effect.powerReductionPct) effect.powerReductionPct = Math.min(100, effect.powerReductionPct);
  return effect;
}
function applyStatBonuses(stats, bonuses) {
  const next = { ...stats };
  for (const [key, n] of Object.entries(bonuses)) {
    if (!STAT_DEFINITIONS[key] || !Number.isFinite(n)) throw new Error("Invalid bonus " + key);
    const [min, max] = ARENA_RULES.caps[key];
    next[key] = Math.max(min, Math.min(max, (next[key] ?? ARENA_RULES.base[key]) + n));
  }
  return next;
}
function mitigatedDamage(baseDamage, damageType, attackerStats = {}, defenderStats = {}, sourceKind = "weapon") {
  if (!Number.isFinite(baseDamage) || baseDamage < 0 || !DAMAGE_PALETTE[damageType]) throw new Error("Invalid damage");
  const power = combinedPower(attackerStats, sourceKind), key = damageType + "Resistance", rating = defenderStats[key] ?? ARENA_RULES.base[key];
  if (!Number.isFinite(rating)) throw new Error("Invalid resistance");
  const defence = Math.min(ARENA_RULES.caps[key][1], Math.max(0, rating));
  return baseDamage * (1 + power / 100) * 100 / (100 + defence);
}

// components/contracts/Arena/baselineSpells.js
var BASELINE_SPELLS = {
  renewing_light: {
    name: "Renewing Light",
    icon: "maxHealth",
    color: "#83efb2",
    kind: "heal",
    healRoll: "3d6+15",
    castSeconds: 0.9,
    cooldownSeconds: 15,
    buff: { name: "Quickened", icon: "moveSpeedPct", stats: { moveSpeedPct: 6 }, durationSeconds: 4 },
    description: "Heal yourself, then gain +6% movement speed for 4 seconds."
  },
  ironbloom: {
    name: "Ironbloom",
    icon: "tenacityPct",
    color: "#f5d18a",
    kind: "heal",
    healRoll: "2d8+12",
    castSeconds: 1.05,
    cooldownSeconds: 17,
    buff: { name: "Ironbloom guard", icon: "tenacityPct", stats: { bluntResistance: 10, slashingResistance: 10, piercingResistance: 10 }, durationSeconds: 5 },
    description: "Heal yourself and gain +10 blunt, slashing and piercing resistance for 5 seconds."
  },
  arcane_dart: {
    name: "Arcane Dart",
    icon: "arcane",
    color: "#dc96ff",
    kind: "projectile",
    damageType: "arcane",
    damageRoll: "3d6+10",
    castSeconds: 0.7,
    cooldownSeconds: 9,
    projectile: { speedMps: 12, widthM: 0.28, maxRangeM: 9 },
    onHit: [],
    description: "A fast, precise arcane projectile. Aim ahead of moving enemies."
  },
  frost_spark: {
    name: "Frost Spark",
    icon: "frost",
    color: "#83eeff",
    kind: "projectile",
    damageType: "frost",
    damageRoll: "2d8+8",
    castSeconds: 0.85,
    cooldownSeconds: 11,
    projectile: { speedMps: 10, widthM: 0.4, maxRangeM: 8 },
    onHit: [{ id: "chill", chance: 0.65, potency: 0.75, strike: "each" }],
    description: "A frost projectile with a 65% chance to apply Chill: 15% slow for 2 seconds before tenacity. Reapplications stack potency and refresh duration."
  },
  ember_burst: {
    name: "Ember Burst",
    icon: "fire",
    color: "#ff9554",
    kind: "area",
    damageType: "fire",
    damageRoll: "3d6+8",
    castSeconds: 1.1,
    cooldownSeconds: 13,
    area: { distanceM: 3, radiusM: 1.5, windupPhase: 0.2 },
    onHit: [{ id: "burn", chance: 0.35, potency: 0.75, strike: "each" }],
    description: "Mark a circle 3m ahead, then blast everyone inside. Each enemy independently rolls damage, a critical and a 35% Burn chance."
  }
};
for (const [id, s] of Object.entries(BASELINE_SPELLS)) Object.assign(s, { id, releasePhase: 0.6, powerSource: "ability", attackKind: s.kind === "area" ? "area" : "projectile", gesture: s.kind === "heal" ? "heal" : "forward" });
function baselineSpell(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(BASELINE_SPELLS, id) ? BASELINE_SPELLS[id] : null;
}
function validateBaselineSpell(id) {
  if (id == null) return null;
  if (!baselineSpell(id)) throw new Error("Choose a valid baseline spell.");
  return id;
}
function baselineTiming(id, cooldownReductionPct = 0, castSpeedPct = 0) {
  const spell = baselineSpell(id);
  if (!spell) throw new Error("Unknown baseline spell");
  const c = Math.max(0, Math.min(ARENA_RULES.caps.cooldownReductionPct[1], cooldownReductionPct));
  const speed = Math.max(0, Math.min(ARENA_RULES.caps.castSpeedPct[1], castSpeedPct));
  return { castSeconds: Math.max(0.55, spell.castSeconds / (1 + speed / 100)), cooldownSeconds: Math.max(4, spell.cooldownSeconds * (1 - c / 100)) };
}

// pages/api/arena/combat.js
var import_algosdk3 = __toESM(require("algosdk"));
var import_crypto4 = __toESM(require("crypto"));

// lib/arena/firebaseServer.js
var import_firebase_admin = __toESM(require("firebase-admin"));
var import_path = __toESM(require("path"));
function arenaDatabase() {
  let app = import_firebase_admin.default.apps.find((a) => a.name === "playground-authority");
  if (!app) {
    const options = { projectId: process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dark-coin-dc4a3" };
    const local = import_path.default.join(process.cwd(), "service.json");
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      options.credential = false ? import_firebase_admin.default.credential.cert(JSON.parse(import_fs.default.readFileSync(local, "utf8"))) : import_firebase_admin.default.credential.applicationDefault();
    }
    app = import_firebase_admin.default.initializeApp(options, "playground-authority");
  }
  return app.firestore();
}

// lib/arena/service.js
var import_crypto2 = __toESM(require("crypto"));

// lib/arena/weapon-paths.json
var weapon_paths_default = { dragon_longsword: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.8 }, windows: [{ side: null, start: 0.2, end: 0.65 }], frames: [[{ side: "L", inner: [-0.2522, 1.46238, 0.34874], outer: [-0.17976, 2.04194, 0.49967] }], [{ side: "L", inner: [-0.26224, 1.45942, 0.35279], outer: [-0.19363, 2.03736, 0.51154] }], [{ side: "L", inner: [-0.27253, 1.45647, 0.3567], outer: [-0.20826, 2.03278, 0.523] }], [{ side: "L", inner: [-0.29649, 1.44983, 0.36447], outer: [-0.24251, 2.02187, 0.54825] }], [{ side: "L", inner: [-0.32588, 1.44217, 0.37228], outer: [-0.28684, 2.00925, 0.57432] }], [{ side: "L", inner: [-0.36328, 1.43286, 0.37919], outer: [-0.34492, 1.99273, 0.60308] }], [{ side: "L", inner: [-0.40869, 1.42239, 0.38349], outer: [-0.41863, 1.97357, 0.6285] }], [{ side: "L", inner: [-0.45826, 1.41151, 0.38356], outer: [-0.5024, 1.95275, 0.64631] }], [{ side: "L", inner: [-0.51415, 1.39953, 0.37748], outer: [-0.60038, 1.9278, 0.65573] }], [{ side: "L", inner: [-0.57171, 1.38833, 0.3646], outer: [-0.70386, 1.90486, 0.64684] }], [{ side: "L", inner: [-0.62992, 1.37501, 0.34477], outer: [-0.81402, 1.87361, 0.63011] }], [{ side: "L", inner: [-0.68784, 1.36369, 0.31608], outer: [-0.9233, 1.84822, 0.58758] }], [{ side: "L", inner: [-0.74006, 1.3493, 0.28357], outer: [-1.02855, 1.81223, 0.54123] }], [{ side: "L", inner: [-0.7893, 1.3367, 0.24288], outer: [-1.12667, 1.78124, 0.47196] }], [{ side: "L", inner: [-0.83025, 1.32254, 0.20148], outer: [-1.21208, 1.74504, 0.40053] }], [{ side: "L", inner: [-0.8654, 1.30856, 0.1567], outer: [-1.28632, 1.70899, 0.3192] }], [{ side: "L", inner: [-0.89296, 1.29553, 0.11273], outer: [-1.34493, 1.67532, 0.23684] }], [{ side: "L", inner: [-0.9134, 1.28201, 0.07256], outer: [-1.39095, 1.63975, 0.1614] }], [{ side: "L", inner: [-0.92896, 1.27073, 0.03285], outer: [-1.42481, 1.6104, 0.08457] }], [{ side: "L", inner: [-0.93766, 1.26121, 406e-5], outer: [-1.44591, 1.58512, 0.03023] }], [{ side: "L", inner: [-0.94477, 1.25259, -0.02589], outer: [-1.46234, 1.56249, -0.0275] }], [{ side: "L", inner: [-0.94591, 1.25029, -0.03895], outer: [-1.46563, 1.55638, -0.05026] }], [{ side: "L", inner: [-0.94689, 1.24807, -0.05208], outer: [-1.46844, 1.5505, -0.07321] }], [{ side: "L", inner: [-0.94696, 1.24759, -0.05692], outer: [-1.46883, 1.54922, -0.0813] }], [{ side: "L", inner: [-0.94681, 1.24759, -0.05939], outer: [-1.46861, 1.54922, -0.08511] }], [{ side: "L", inner: [-0.94683, 1.24759, -0.05671], outer: [-1.46872, 1.54922, -0.08067] }], [{ side: "L", inner: [-0.94699, 1.24759, -0.04991], outer: [-1.46905, 1.54922, -0.06961] }], [{ side: "L", inner: [-0.94708, 1.24759, -0.04009], outer: [-1.46934, 1.54922, -0.05365] }], [{ side: "L", inner: [-0.94702, 1.24759, -0.02423], outer: [-1.46944, 1.54922, -0.02787] }], [{ side: "L", inner: [-0.94676, 1.24759, -746e-5], outer: [-1.46915, 1.54922, -61e-5] }], [{ side: "L", inner: [-0.94553, 1.24759, 0.01657], outer: [-1.46751, 1.54922, 0.03849] }], [{ side: "L", inner: [-0.94407, 1.24759, 0.04059], outer: [-1.4652, 1.54922, 0.07756] }], [{ side: "L", inner: [-0.94063, 1.24759, 0.07098], outer: [-1.46005, 1.54922, 0.12708] }], [{ side: "L", inner: [-0.9366, 1.24759, 0.10213], outer: [-1.45353, 1.54922, 0.17778] }], [{ side: "L", inner: [-0.93012, 1.24759, 0.13725], outer: [-1.44332, 1.54922, 0.23504] }], [{ side: "L", inner: [-0.92209, 1.24759, 0.17428], outer: [-1.4303, 1.54922, 0.29537] }], [{ side: "L", inner: [-0.9117, 1.24759, 0.2134], outer: [-1.41342, 1.54922, 0.35907] }], [{ side: "L", inner: [-0.89839, 1.24759, 0.25511], outer: [-1.39178, 1.54922, 0.4269] }], [{ side: "L", inner: [-0.88328, 1.24759, 0.29742], outer: [-1.36672, 1.54922, 0.4955] }], [{ side: "L", inner: [-0.86358, 1.24759, 0.34241], outer: [-1.33462, 1.54922, 0.56837] }], [{ side: "L", inner: [-0.84303, 1.24759, 0.387], outer: [-1.30009, 1.54922, 0.64006] }], [{ side: "L", inner: [-0.81605, 1.24759, 0.43329], outer: [-1.25618, 1.54922, 0.71476] }], [{ side: "L", inner: [-0.78815, 1.24759, 0.479], outer: [-1.2096, 1.54922, 0.78775] }], [{ side: "L", inner: [-0.7548, 1.24759, 0.52442], outer: [-1.15485, 1.54922, 0.86042] }], [{ side: "L", inner: [-0.71921, 1.24759, 0.56915], outer: [-1.09579, 1.54922, 0.93127] }], [{ side: "L", inner: [-0.67953, 1.24759, 0.61269], outer: [-1.03031, 1.54922, 0.99985] }], [{ side: "L", inner: [-0.63642, 1.24759, 0.65498], outer: [-0.95921, 1.54922, 1.06577] }], [{ side: "L", inner: [-0.59073, 1.24759, 0.69542], outer: [-0.88365, 1.54922, 1.12801] }], [{ side: "L", inner: [-0.54075, 1.24759, 0.7331], outer: [-0.80176, 1.54922, 1.18566] }], [{ side: "L", inner: [-0.48959, 1.24759, 0.76909], outer: [-0.71729, 1.54922, 1.2393] }], [{ side: "L", inner: [-0.43402, 1.24759, 0.80005], outer: [-0.62681, 1.54922, 1.28561] }], [{ side: "L", inner: [-0.37791, 1.24759, 0.82965], outer: [-0.53477, 1.54922, 1.32799] }], [{ side: "L", inner: [-0.31891, 1.24759, 0.85284], outer: [-0.43903, 1.54922, 1.36129] }], [{ side: "L", inner: [-0.25928, 1.24759, 0.874], outer: [-0.34201, 1.54922, 1.38984] }], [{ side: "L", inner: [-0.19883, 1.24759, 0.88935], outer: [-0.24409, 1.54922, 1.40982] }], [{ side: "L", inner: [-0.13796, 1.24759, 0.90111], outer: [-0.14571, 1.54922, 1.42349] }], [{ side: "L", inner: [-0.0776, 1.24759, 0.90845], outer: [-0.04826, 1.54922, 1.43007] }], [{ side: "L", inner: [-0.01798, 1.24759, 0.91068], outer: [0.04771, 1.54922, 1.42898] }], [{ side: "L", inner: [0.04076, 1.24759, 0.9102], outer: [0.14214, 1.54922, 1.42271] }], [{ side: "L", inner: [0.09676, 1.24759, 0.90359], outer: [0.23216, 1.54922, 1.40818] }], [{ side: "L", inner: [0.15244, 1.24759, 0.89581], outer: [0.32125, 1.54922, 1.39022] }], [{ side: "L", inner: [0.20281, 1.24759, 0.8818], outer: [0.40235, 1.54922, 1.36463] }], [{ side: "L", inner: [0.25278, 1.24759, 0.86679], outer: [0.48225, 1.54922, 1.33614] }], [{ side: "L", inner: [0.2975, 1.24759, 0.8482], outer: [0.55423, 1.54922, 1.30321] }], [{ side: "L", inner: [0.34041, 1.24759, 0.82805], outer: [0.62302, 1.54922, 1.26745] }], [{ side: "L", inner: [0.37923, 1.24759, 0.80659], outer: [0.68536, 1.54922, 1.22994] }], [{ side: "L", inner: [0.41472, 1.24759, 0.78406], outer: [0.74238, 1.54922, 1.19098] }], [{ side: "L", inner: [0.44756, 1.24759, 0.7613], outer: [0.79496, 1.54922, 1.1515] }], [{ side: "L", inner: [0.47562, 1.24759, 0.73874], outer: [0.84017, 1.54922, 1.11297] }], [{ side: "L", inner: [0.50259, 1.24759, 0.7161], outer: [0.88324, 1.54922, 1.07393] }], [{ side: "L", inner: [0.5236, 1.24759, 0.6956], outer: [0.91719, 1.54922, 1.03915] }], [{ side: "L", inner: [0.54433, 1.24759, 0.67486], outer: [0.95032, 1.54922, 1.00366] }], [{ side: "L", inner: [0.55967, 1.24759, 0.65785], outer: [0.975, 1.54922, 0.97478] }], [{ side: "L", inner: [0.5742, 1.24759, 0.64121], outer: [0.99821, 1.54922, 0.94643] }], [{ side: "L", inner: [0.58491, 1.24759, 0.62827], outer: [1.01532, 1.54922, 0.92439] }], [{ side: "L", inner: [0.59371, 1.24759, 0.61717], outer: [1.02937, 1.54922, 0.90552] }], [{ side: "L", inner: [0.60005, 1.24759, 0.60903], outer: [1.03944, 1.54922, 0.89165] }], [{ side: "L", inner: [0.60336, 1.24759, 0.60462], outer: [1.04473, 1.54922, 0.88416] }], [{ side: "L", inner: [0.60564, 1.24759, 0.60148], outer: [1.04839, 1.54922, 0.87882] }], [{ side: "L", inner: [0.60433, 1.24759, 0.60278], outer: [1.04648, 1.54922, 0.88108] }], [{ side: "L", inner: [0.60302, 1.24759, 0.60409], outer: [1.04456, 1.54922, 0.88334] }], [{ side: "L", inner: [0.59856, 1.24759, 0.60847], outer: [1.03805, 1.54922, 0.89095] }], [{ side: "L", inner: [0.59409, 1.24759, 0.61285], outer: [1.0315, 1.54922, 0.89854] }], [{ side: "L", inner: [0.58738, 1.24759, 0.61922], outer: [1.02166, 1.54922, 0.90964] }], [{ side: "L", inner: [0.58001, 1.24759, 0.62615], outer: [1.01081, 1.54922, 0.92169] }], [{ side: "L", inner: [0.57105, 1.24759, 0.63433], outer: [0.9976, 1.54922, 0.93598] }], [{ side: "L", inner: [0.56079, 1.24759, 0.64349], outer: [0.98242, 1.54922, 0.952] }], [{ side: "L", inner: [0.54519, 1.24759, 0.65909], outer: [0.95824, 1.54922, 0.97898] }], [{ side: "L", inner: [0.51862, 1.24759, 0.68736], outer: [0.91534, 1.54922, 1.02729] }], [{ side: "L", inner: [0.48859, 1.24759, 0.71733], outer: [0.86632, 1.54922, 1.07824] }], [{ side: "L", inner: [0.43384, 1.24759, 0.76319], outer: [0.77684, 1.54922, 1.15727] }], [{ side: "L", inner: [0.37758, 1.24759, 0.80733], outer: [0.68295, 1.54922, 1.23123] }], [{ side: "L", inner: [0.29319, 1.24759, 0.84719], outer: [0.54647, 1.54922, 1.30413] }], [{ side: "L", inner: [0.20356, 1.24759, 0.88332], outer: [0.39963, 1.54922, 1.36757] }], [{ side: "L", inner: [0.09765, 1.24759, 0.90143], outer: [0.2281, 1.54922, 1.40732] }], [{ side: "L", inner: [-0.01689, 1.24759, 0.90755], outer: [0.04281, 1.54922, 1.42657] }], [{ side: "L", inner: [-0.13284, 1.24759, 0.89889], outer: [-0.14581, 1.54922, 1.42117] }], [{ side: "L", inner: [-0.2497, 1.24759, 0.87279], outer: [-0.33607, 1.54922, 1.38804] }], [{ side: "L", inner: [-0.36199, 1.24759, 0.83919], outer: [-0.51898, 1.54922, 1.33749] }], [{ side: "L", inner: [-0.45995, 1.24759, 0.7933], outer: [-0.68099, 1.54922, 1.26668] }], [{ side: "L", inner: [-0.55592, 1.24759, 0.74314], outer: [-0.83719, 1.54922, 1.1834] }], [{ side: "L", inner: [-0.62518, 1.24759, 0.68996], outer: [-0.95268, 1.54922, 1.09701] }], [{ side: "L", inner: [-0.69242, 1.24759, 0.63426], outer: [-1.06226, 1.54922, 1.00326] }], [{ side: "L", inner: [-0.73759, 1.24759, 0.58642], outer: [-1.13618, 1.54922, 0.92417] }], [{ side: "L", inner: [-0.77585, 1.24759, 0.5404], outer: [-1.19813, 1.54922, 0.84802] }], [{ side: "L", inner: [-0.79918, 1.2489, 0.50752], outer: [-1.23388, 1.5527, 0.79504] }], [{ side: "L", inner: [-0.81119, 1.25116, 0.48561], outer: [-1.2505, 1.55869, 0.76192] }], [{ side: "L", inner: [-0.81441, 1.2574, 0.47065], outer: [-1.24817, 1.57507, 0.74426] }], [{ side: "L", inner: [-0.79987, 1.27263, 0.46742], outer: [-1.20738, 1.6152, 0.75114] }], [{ side: "L", inner: [-0.78233, 1.28875, 0.46315], outer: [-1.16085, 1.65766, 0.75393] }], [{ side: "L", inner: [-0.73991, 1.30796, 0.47192], outer: [-1.06556, 1.70691, 0.78611] }], [{ side: "L", inner: [-0.69695, 1.33057, 0.46988], outer: [-0.96875, 1.76605, 0.78676] }], [{ side: "L", inner: [-0.63403, 1.3481, 0.47538], outer: [-0.84086, 1.80817, 0.80627] }], [{ side: "L", inner: [-0.56951, 1.36897, 0.46847], outer: [-0.7117, 1.85974, 0.78916] }], [{ side: "L", inner: [-0.50166, 1.38701, 0.45802], outer: [-0.5841, 1.89986, 0.76479] }], [{ side: "L", inner: [-0.43419, 1.40507, 0.44026], outer: [-0.46326, 1.93845, 0.72058] }], [{ side: "L", inner: [-0.37654, 1.42201, 0.41748], outer: [-0.36635, 1.97262, 0.66375] }], [{ side: "L", inner: [-0.32673, 1.43674, 0.3949], outer: [-0.28642, 1.99889, 0.61004] }], [{ side: "L", inner: [-0.28792, 1.44974, 0.37192], outer: [-0.23006, 2.02197, 0.55395] }], [{ side: "L", inner: [-0.26954, 1.45607, 0.36058], outer: [-0.20339, 2.03198, 0.52753] }], [{ side: "L", inner: [-0.2522, 1.46238, 0.34875], outer: [-0.17976, 2.04194, 0.49968] }]] }, dragon_staff: { durations: { Draw: 2.3, Stow: 2.3, Swing: 2.1 }, windows: [{ side: "L", release: 0.55 }], frames: [[{ side: "L", inner: [-0.08639, 1.62737, 0.40025], outer: [-0.08639, 1.62737, 0.40025] }], [{ side: "L", inner: [-0.08628, 1.62718, 0.40096], outer: [-0.08628, 1.62718, 0.40096] }], [{ side: "L", inner: [-0.08616, 1.62697, 0.4018], outer: [-0.08616, 1.62697, 0.4018] }], [{ side: "L", inner: [-0.08587, 1.62646, 0.40384], outer: [-0.08587, 1.62646, 0.40384] }], [{ side: "L", inner: [-0.08555, 1.62593, 0.40613], outer: [-0.08555, 1.62593, 0.40613] }], [{ side: "L", inner: [-0.08514, 1.62524, 0.40941], outer: [-0.08514, 1.62524, 0.40941] }], [{ side: "L", inner: [-0.08471, 1.62454, 0.41302], outer: [-0.08471, 1.62454, 0.41302] }], [{ side: "L", inner: [-0.08424, 1.62384, 0.41745], outer: [-0.08424, 1.62384, 0.41745] }], [{ side: "L", inner: [-0.08378, 1.62319, 0.42228], outer: [-0.08378, 1.62319, 0.42228] }], [{ side: "L", inner: [-0.08334, 1.62265, 0.42776], outer: [-0.08334, 1.62265, 0.42776] }], [{ side: "L", inner: [-0.08294, 1.62227, 0.43369], outer: [-0.08294, 1.62227, 0.43369] }], [{ side: "L", inner: [-0.08258, 1.62207, 0.44011], outer: [-0.08258, 1.62207, 0.44011] }], [{ side: "L", inner: [-0.0823, 1.62217, 0.447], outer: [-0.0823, 1.62217, 0.447] }], [{ side: "L", inner: [-0.08208, 1.62249, 0.45425], outer: [-0.08208, 1.62249, 0.45425] }], [{ side: "L", inner: [-0.08196, 1.62325, 0.46195], outer: [-0.08196, 1.62325, 0.46195] }], [{ side: "L", inner: [-0.08188, 1.62422, 0.46988], outer: [-0.08188, 1.62422, 0.46988] }], [{ side: "L", inner: [-0.08191, 1.62578, 0.4782], outer: [-0.08191, 1.62578, 0.4782] }], [{ side: "L", inner: [-0.08197, 1.6275, 0.48665], outer: [-0.08197, 1.6275, 0.48665] }], [{ side: "L", inner: [-0.0821, 1.62992, 0.49539], outer: [-0.0821, 1.62992, 0.49539] }], [{ side: "L", inner: [-0.08225, 1.63245, 0.50418], outer: [-0.08225, 1.63245, 0.50418] }], [{ side: "L", inner: [-0.08241, 1.63574, 0.51311], outer: [-0.08241, 1.63574, 0.51311] }], [{ side: "L", inner: [-0.08258, 1.6391, 0.52205], outer: [-0.08258, 1.6391, 0.52205] }], [{ side: "L", inner: [-0.08268, 1.64315, 0.53093], outer: [-0.08268, 1.64315, 0.53093] }], [{ side: "L", inner: [-0.08277, 1.64728, 0.53979], outer: [-0.08277, 1.64728, 0.53979] }], [{ side: "L", inner: [-0.08274, 1.65193, 0.54843], outer: [-0.08274, 1.65193, 0.54843] }], [{ side: "L", inner: [-0.08267, 1.65667, 0.55697], outer: [-0.08267, 1.65667, 0.55697] }], [{ side: "L", inner: [-0.08244, 1.66174, 0.56517], outer: [-0.08244, 1.66174, 0.56517] }], [{ side: "L", inner: [-0.08213, 1.66688, 0.57318], outer: [-0.08213, 1.66688, 0.57318] }], [{ side: "L", inner: [-0.08167, 1.67216, 0.58078], outer: [-0.08167, 1.67216, 0.58078] }], [{ side: "L", inner: [-0.08111, 1.67742, 0.58805], outer: [-0.08111, 1.67742, 0.58805] }], [{ side: "L", inner: [-0.08043, 1.68266, 0.59489], outer: [-0.08043, 1.68266, 0.59489] }], [{ side: "L", inner: [-0.07966, 1.68775, 0.60126], outer: [-0.07966, 1.68775, 0.60126] }], [{ side: "L", inner: [-0.07881, 1.6927, 0.6072], outer: [-0.07881, 1.6927, 0.6072] }], [{ side: "L", inner: [-0.07791, 1.6973, 0.61252], outer: [-0.07791, 1.6973, 0.61252] }], [{ side: "L", inner: [-0.07699, 1.7017, 0.61746], outer: [-0.07699, 1.7017, 0.61746] }], [{ side: "L", inner: [-0.07609, 1.70553, 0.62161], outer: [-0.07609, 1.70553, 0.62161] }], [{ side: "L", inner: [-0.07521, 1.70914, 0.62545], outer: [-0.07521, 1.70914, 0.62545] }], [{ side: "L", inner: [-0.07448, 1.71192, 0.62832], outer: [-0.07448, 1.71192, 0.62832] }], [{ side: "L", inner: [-0.07378, 1.7145, 0.63097], outer: [-0.07378, 1.7145, 0.63097] }], [{ side: "L", inner: [-0.07336, 1.71598, 0.63245], outer: [-0.07336, 1.71598, 0.63245] }], [{ side: "L", inner: [-0.07296, 1.71735, 0.63382], outer: [-0.07296, 1.71735, 0.63382] }], [{ side: "L", inner: [-0.07295, 1.71714, 0.63455], outer: [-0.07295, 1.71714, 0.63455] }], [{ side: "L", inner: [-0.07297, 1.71669, 0.6356], outer: [-0.07297, 1.71669, 0.6356] }], [{ side: "L", inner: [-0.07325, 1.71394, 0.63966], outer: [-0.07325, 1.71394, 0.63966] }], [{ side: "L", inner: [-0.07358, 1.71072, 0.64434], outer: [-0.07358, 1.71072, 0.64434] }], [{ side: "L", inner: [-0.07408, 1.70554, 0.65165], outer: [-0.07408, 1.70554, 0.65165] }], [{ side: "L", inner: [-0.07464, 1.69967, 0.65966], outer: [-0.07464, 1.69967, 0.65966] }], [{ side: "L", inner: [-0.07532, 1.69222, 0.66942], outer: [-0.07532, 1.69222, 0.66942] }], [{ side: "L", inner: [-0.07607, 1.68395, 0.67978], outer: [-0.07607, 1.68395, 0.67978] }], [{ side: "L", inner: [-0.07688, 1.67441, 0.69115], outer: [-0.07688, 1.67441, 0.69115] }], [{ side: "L", inner: [-0.07773, 1.66404, 0.7029], outer: [-0.07773, 1.66404, 0.7029] }], [{ side: "L", inner: [-0.07864, 1.65272, 0.71505], outer: [-0.07864, 1.65272, 0.71505] }], [{ side: "L", inner: [-0.07954, 1.64067, 0.72725], outer: [-0.07954, 1.64067, 0.72725] }], [{ side: "L", inner: [-0.0805, 1.62799, 0.73944], outer: [-0.0805, 1.62799, 0.73944] }], [{ side: "L", inner: [-0.0814, 1.61489, 0.75125], outer: [-0.0814, 1.61489, 0.75125] }], [{ side: "L", inner: [-0.08236, 1.60142, 0.7628], outer: [-0.08236, 1.60142, 0.7628] }], [{ side: "L", inner: [-0.08321, 1.58806, 0.77355], outer: [-0.08321, 1.58806, 0.77355] }], [{ side: "L", inner: [-0.08413, 1.57454, 0.78393], outer: [-0.08413, 1.57454, 0.78393] }], [{ side: "L", inner: [-0.08489, 1.56184, 0.79308], outer: [-0.08489, 1.56184, 0.79308] }], [{ side: "L", inner: [-0.08572, 1.54909, 0.8019], outer: [-0.08572, 1.54909, 0.8019] }], [{ side: "L", inner: [-0.08634, 1.53808, 0.80907], outer: [-0.08634, 1.53808, 0.80907] }], [{ side: "L", inner: [-0.08703, 1.52714, 0.81597], outer: [-0.08703, 1.52714, 0.81597] }], [{ side: "L", inner: [-0.08749, 1.51875, 0.82101], outer: [-0.08749, 1.51875, 0.82101] }], [{ side: "L", inner: [-0.08797, 1.51078, 0.82568], outer: [-0.08797, 1.51078, 0.82568] }], [{ side: "L", inner: [-0.08825, 1.50581, 0.8285], outer: [-0.08825, 1.50581, 0.8285] }], [{ side: "L", inner: [-0.08848, 1.50188, 0.8307], outer: [-0.08848, 1.50188, 0.8307] }], [{ side: "L", inner: [-0.08851, 1.50133, 0.831], outer: [-0.08851, 1.50133, 0.831] }], [{ side: "L", inner: [-0.08842, 1.50282, 0.83018], outer: [-0.08842, 1.50282, 0.83018] }], [{ side: "L", inner: [-0.08811, 1.50834, 0.82707], outer: [-0.08811, 1.50834, 0.82707] }], [{ side: "L", inner: [-0.08764, 1.51611, 0.82256], outer: [-0.08764, 1.51611, 0.82256] }], [{ side: "L", inner: [-0.08702, 1.52679, 0.81616], outer: [-0.08702, 1.52679, 0.81616] }], [{ side: "L", inner: [-0.08625, 1.53938, 0.80822], outer: [-0.08625, 1.53938, 0.80822] }], [{ side: "L", inner: [-0.08541, 1.55357, 0.79883], outer: [-0.08541, 1.55357, 0.79883] }], [{ side: "L", inner: [-0.08441, 1.56903, 0.7879], outer: [-0.08441, 1.56903, 0.7879] }], [{ side: "L", inner: [-0.08342, 1.58507, 0.77591], outer: [-0.08342, 1.58507, 0.77591] }], [{ side: "L", inner: [-0.08228, 1.60153, 0.76262], outer: [-0.08228, 1.60153, 0.76262] }], [{ side: "L", inner: [-0.08122, 1.61784, 0.74868], outer: [-0.08122, 1.61784, 0.74868] }], [{ side: "L", inner: [-0.08002, 1.63362, 0.73403], outer: [-0.08002, 1.63362, 0.73403] }], [{ side: "L", inner: [-0.07896, 1.64888, 0.71906], outer: [-0.07896, 1.64888, 0.71906] }], [{ side: "L", inner: [-0.0778, 1.66262, 0.70439], outer: [-0.0778, 1.66262, 0.70439] }], [{ side: "L", inner: [-0.07681, 1.67579, 0.68962], outer: [-0.07681, 1.67579, 0.68962] }], [{ side: "L", inner: [-0.0758, 1.68653, 0.67654], outer: [-0.0758, 1.68653, 0.67654] }], [{ side: "L", inner: [-0.07494, 1.69666, 0.66369], outer: [-0.07494, 1.69666, 0.66369] }], [{ side: "L", inner: [-0.07421, 1.70405, 0.65368], outer: [-0.07421, 1.70405, 0.65368] }], [{ side: "L", inner: [-0.07359, 1.7106, 0.64452], outer: [-0.07359, 1.7106, 0.64452] }], [{ side: "L", inner: [-0.07321, 1.71432, 0.6391], outer: [-0.07321, 1.71432, 0.6391] }], [{ side: "L", inner: [-0.07296, 1.71695, 0.63495], outer: [-0.07296, 1.71695, 0.63495] }], [{ side: "L", inner: [-0.07303, 1.71697, 0.63403], outer: [-0.07303, 1.71697, 0.63403] }], [{ side: "L", inner: [-0.0733, 1.71616, 0.63262], outer: [-0.0733, 1.71616, 0.63262] }], [{ side: "L", inner: [-0.07392, 1.71397, 0.63042], outer: [-0.07392, 1.71397, 0.63042] }], [{ side: "L", inner: [-0.07472, 1.71098, 0.62734], outer: [-0.07472, 1.71098, 0.62734] }], [{ side: "L", inner: [-0.07571, 1.7071, 0.62329], outer: [-0.07571, 1.7071, 0.62329] }], [{ side: "L", inner: [-0.07678, 1.70248, 0.61827], outer: [-0.07678, 1.70248, 0.61827] }], [{ side: "L", inner: [-0.07792, 1.6973, 0.61252], outer: [-0.07792, 1.6973, 0.61252] }], [{ side: "L", inner: [-0.07898, 1.69154, 0.60577], outer: [-0.07898, 1.69154, 0.60577] }], [{ side: "L", inner: [-0.08002, 1.6855, 0.59851], outer: [-0.08002, 1.6855, 0.59851] }], [{ side: "L", inner: [-0.08086, 1.67916, 0.59024], outer: [-0.08086, 1.67916, 0.59024] }], [{ side: "L", inner: [-0.08164, 1.67273, 0.58167], outer: [-0.08164, 1.67273, 0.58167] }], [{ side: "L", inner: [-0.08212, 1.66635, 0.57218], outer: [-0.08212, 1.66635, 0.57218] }], [{ side: "L", inner: [-0.08256, 1.65999, 0.56254], outer: [-0.08256, 1.65999, 0.56254] }], [{ side: "L", inner: [-0.08268, 1.65409, 0.55217], outer: [-0.08268, 1.65409, 0.55217] }], [{ side: "L", inner: [-0.08279, 1.64826, 0.54175], outer: [-0.08279, 1.64826, 0.54175] }], [{ side: "L", inner: [-0.08267, 1.64322, 0.53091], outer: [-0.08267, 1.64322, 0.53091] }], [{ side: "L", inner: [-0.08254, 1.63834, 0.52006], outer: [-0.08254, 1.63834, 0.52006] }], [{ side: "L", inner: [-0.08234, 1.63439, 0.50915], outer: [-0.08234, 1.63439, 0.50915] }], [{ side: "L", inner: [-0.08215, 1.63071, 0.49831], outer: [-0.08215, 1.63071, 0.49831] }], [{ side: "L", inner: [-0.082, 1.62795, 0.48769], outer: [-0.082, 1.62795, 0.48769] }], [{ side: "L", inner: [-0.0819, 1.62557, 0.47727], outer: [-0.0819, 1.62557, 0.47727] }], [{ side: "L", inner: [-0.08192, 1.62398, 0.46728], outer: [-0.08192, 1.62398, 0.46728] }], [{ side: "L", inner: [-0.08203, 1.62283, 0.45769], outer: [-0.08203, 1.62283, 0.45769] }], [{ side: "L", inner: [-0.08226, 1.62227, 0.44863], outer: [-0.08226, 1.62227, 0.44863] }], [{ side: "L", inner: [-0.0826, 1.62213, 0.44021], outer: [-0.0826, 1.62213, 0.44021] }], [{ side: "L", inner: [-0.08303, 1.62237, 0.43237], outer: [-0.08303, 1.62237, 0.43237] }], [{ side: "L", inner: [-0.08354, 1.6229, 0.4254], outer: [-0.08354, 1.6229, 0.4254] }], [{ side: "L", inner: [-0.08409, 1.62362, 0.41898], outer: [-0.08409, 1.62362, 0.41898] }], [{ side: "L", inner: [-0.08464, 1.62446, 0.41372], outer: [-0.08464, 1.62446, 0.41372] }], [{ side: "L", inner: [-0.08519, 1.62533, 0.40892], outer: [-0.08519, 1.62533, 0.40892] }], [{ side: "L", inner: [-0.08563, 1.62607, 0.40556], outer: [-0.08563, 1.62607, 0.40556] }], [{ side: "L", inner: [-0.08605, 1.62678, 0.40254], outer: [-0.08605, 1.62678, 0.40254] }], [{ side: "L", inner: [-0.08623, 1.6271, 0.4013], outer: [-0.08623, 1.6271, 0.4013] }], [{ side: "L", inner: [-0.08639, 1.62737, 0.40025], outer: [-0.08639, 1.62737, 0.40025] }]] }, dual_katana: { durations: { Draw: 5.6, Stow: 5.6, Swing: 2.6 }, windows: [{ side: "R", start: 0.124, end: 0.403 }, { side: "L", start: 0.536, end: 0.797 }], frames: [[{ side: "L", inner: [-0.44277, 1.64363, 0.49429], outer: [-0.57459, 1.83875, 0.62052] }, { side: "R", inner: [0.46225, 1.61297, 0.51291], outer: [0.57971, 1.83286, 0.62541] }], [{ side: "L", inner: [-0.43891, 1.64363, 0.4977], outer: [-0.56975, 1.83875, 0.62496] }, { side: "R", inner: [0.47985, 1.60534, 0.51668], outer: [0.59881, 1.82266, 0.63255] }], [{ side: "L", inner: [-0.43194, 1.64363, 0.50371], outer: [-0.56099, 1.83875, 0.63276] }, { side: "R", inner: [0.51247, 1.59206, 0.52044], outer: [0.63471, 1.80468, 0.6415] }], [{ side: "L", inner: [-0.42128, 1.64363, 0.5127], outer: [-0.5476, 1.83875, 0.64443] }, { side: "R", inner: [0.56175, 1.57155, 0.52503], outer: [0.68866, 1.77682, 0.65372] }], [{ side: "L", inner: [-0.40563, 1.64363, 0.52502], outer: [-0.52794, 1.83875, 0.66049] }, { side: "R", inner: [0.6361, 1.54439, 0.51548], outer: [0.77235, 1.73942, 0.6504] }], [{ side: "L", inner: [-0.38795, 1.64363, 0.53819], outer: [-0.50569, 1.83875, 0.67764] }, { side: "R", inner: [0.71684, 1.5151, 0.49505], outer: [0.86359, 1.69941, 0.63398] }], [{ side: "L", inner: [-0.36774, 1.64363, 0.55227], outer: [-0.48023, 1.83875, 0.69599] }, { side: "R", inner: [0.80592, 1.48248, 0.45882], outer: [0.96556, 1.65526, 0.59835] }], [{ side: "L", inner: [-0.34553, 1.64363, 0.56625], outer: [-0.45225, 1.83875, 0.71431] }, { side: "R", inner: [0.89152, 1.45377, 0.39503], outer: [1.0658, 1.61836, 0.52672] }], [{ side: "L", inner: [-0.32274, 1.64363, 0.57963], outer: [-0.42349, 1.83875, 0.73181] }, { side: "R", inner: [0.9692, 1.42385, 0.32277], outer: [1.1578, 1.58087, 0.44351] }], [{ side: "L", inner: [-0.29964, 1.64363, 0.59192], outer: [-0.39431, 1.83875, 0.74796] }, { side: "R", inner: [1.0328, 1.39718, 0.23613], outer: [1.23528, 1.54916, 0.3396] }], [{ side: "L", inner: [-0.27791, 1.64363, 0.60236], outer: [-0.36684, 1.83875, 0.76174] }, { side: "R", inner: [1.07533, 1.37675, 0.14942], outer: [1.28856, 1.52648, 0.23262] }], [{ side: "L", inner: [-0.25749, 1.64363, 0.61149], outer: [-0.34101, 1.83875, 0.77377] }, { side: "R", inner: [1.10636, 1.35659, 0.06891], outer: [1.32846, 1.50328, 0.13184] }], [{ side: "L", inner: [-0.24029, 1.64363, 0.61843], outer: [-0.31924, 1.83875, 0.78298] }, { side: "R", inner: [1.12038, 1.34451, 407e-5], outer: [1.34746, 1.4901, 0.0493] }], [{ side: "L", inner: [-0.22763, 1.64363, 0.62323], outer: [-0.30322, 1.83875, 0.78936] }, { side: "R", inner: [1.12573, 1.33815, -0.03436], outer: [1.35519, 1.48278, 76e-5] }], [{ side: "L", inner: [-0.21834, 1.64363, 0.62659], outer: [-0.29144, 1.83875, 0.79382] }, { side: "R", inner: [1.12696, 1.33568, -0.05774], outer: [1.35743, 1.48001, -0.02847] }], [{ side: "L", inner: [-0.2164, 1.64363, 0.62726], outer: [-0.28899, 1.83875, 0.79472] }, { side: "R", inner: [1.12677, 1.33569, -0.06061], outer: [1.35732, 1.48001, -0.0319] }], [{ side: "L", inner: [-0.21855, 1.64363, 0.62651], outer: [-0.29171, 1.83875, 0.79371] }, { side: "R", inner: [1.12689, 1.33569, -0.05098], outer: [1.35715, 1.48001, -0.02005] }], [{ side: "L", inner: [-0.22365, 1.64363, 0.62471], outer: [-0.29817, 1.83875, 0.79131] }, { side: "R", inner: [1.12705, 1.33569, -0.03205], outer: [1.35669, 1.48001, 317e-5] }], [{ side: "L", inner: [-0.23351, 1.64363, 0.62107], outer: [-0.31065, 1.83875, 0.78647] }, { side: "R", inner: [1.12626, 1.33569, 469e-5], outer: [1.35447, 1.48001, 0.04821] }], [{ side: "L", inner: [-0.24577, 1.64363, 0.61628], outer: [-0.32618, 1.83875, 0.78012] }, { side: "R", inner: [1.12341, 1.33569, 0.05062], outer: [1.34942, 1.48001, 0.10445] }], [{ side: "L", inner: [-0.26007, 1.64363, 0.61045], outer: [-0.34427, 1.83875, 0.77238] }, { side: "R", inner: [1.1182, 1.33569, 0.10434], outer: [1.34102, 1.48001, 0.17013] }], [{ side: "L", inner: [-0.27814, 1.64363, 0.60232], outer: [-0.36713, 1.83875, 0.76166] }, { side: "R", inner: [1.10643, 1.33569, 0.17244], outer: [1.32423, 1.48001, 0.25329] }], [{ side: "L", inner: [-0.29754, 1.64363, 0.59294], outer: [-0.39166, 1.83875, 0.74931] }, { side: "R", inner: [1.08916, 1.33569, 0.24559], outer: [1.30036, 1.48001, 0.3424] }], [{ side: "L", inner: [-0.3185, 1.64363, 0.58208], outer: [-0.41811, 1.83875, 0.73501] }, { side: "R", inner: [1.06525, 1.33569, 0.32439], outer: [1.26787, 1.48001, 0.43805] }], [{ side: "L", inner: [-0.34145, 1.64363, 0.56873], outer: [-0.4471, 1.83875, 0.71755] }, { side: "R", inner: [1.02975, 1.33569, 0.4107], outer: [1.22112, 1.48001, 0.54242] }], [{ side: "L", inner: [-0.36499, 1.64363, 0.55393], outer: [-0.47679, 1.83875, 0.6982] }, { side: "R", inner: [0.9859, 1.33568, 0.49827], outer: [1.16377, 1.48001, 0.64772] }], [{ side: "L", inner: [-0.38927, 1.64363, 0.53729], outer: [-0.50735, 1.83875, 0.67646] }, { side: "R", inner: [0.93162, 1.33568, 0.58708], outer: [1.09343, 1.48001, 0.75379] }], [{ side: "L", inner: [-0.41395, 1.64363, 0.51827], outer: [-0.53843, 1.83875, 0.65174] }, { side: "R", inner: [0.86386, 1.33569, 0.6746], outer: [1.00685, 1.48001, 0.85771] }], [{ side: "L", inner: [-0.43847, 1.64363, 0.49783], outer: [-0.56923, 1.83875, 0.62516] }, { side: "R", inner: [0.78709, 1.33569, 0.75853], outer: [0.90907, 1.48001, 0.95626] }], [{ side: "L", inner: [-0.46269, 1.64363, 0.47547], outer: [-0.59961, 1.83875, 0.59616] }, { side: "R", inner: [0.69901, 1.33568, 0.83759], outer: [0.79778, 1.48001, 1.04788] }], [{ side: "L", inner: [-0.48608, 1.64363, 0.4513], outer: [-0.62894, 1.83875, 0.56489] }, { side: "R", inner: [0.60021, 1.33568, 0.90807], outer: [0.67395, 1.48001, 1.12839] }], [{ side: "L", inner: [-0.50865, 1.64363, 0.42599], outer: [-0.65712, 1.83875, 0.53213] }, { side: "R", inner: [0.49472, 1.33569, 0.97004], outer: [0.54223, 1.48001, 1.19746] }], [{ side: "L", inner: [-0.52989, 1.64363, 0.39921], outer: [-0.68363, 1.83875, 0.49758] }, { side: "R", inner: [0.3816, 1.33569, 1.01967], outer: [0.40203, 1.48001, 1.2511] }], [{ side: "L", inner: [-0.54955, 1.64363, 0.37151], outer: [-0.70813, 1.83875, 0.46187] }, { side: "R", inner: [0.26464, 1.33569, 1.05557], outer: [0.25785, 1.48001, 1.2878] }], [{ side: "L", inner: [-0.56796, 1.64363, 0.34318], outer: [-0.73092, 1.83875, 0.42536] }, { side: "R", inner: [0.14602, 1.33569, 1.08004], outer: [0.11226, 1.48001, 1.30991] }], [{ side: "L", inner: [-0.58426, 1.64363, 0.3144], outer: [-0.75112, 1.83875, 0.38836] }, { side: "R", inner: [0.02819, 1.33569, 1.08821], outer: [-0.03153, 1.48001, 1.31274] }], [{ side: "L", inner: [-0.5988, 1.64363, 0.28568], outer: [-0.76905, 1.83875, 0.35146] }, { side: "R", inner: [-0.08565, 1.33568, 1.08349], outer: [-0.1699, 1.48001, 1.30001] }], [{ side: "L", inner: [-0.61193, 1.64363, 0.25704], outer: [-0.7851, 1.83875, 0.31466] }, { side: "R", inner: [-0.19549, 1.33568, 1.06829], outer: [-0.30274, 1.48001, 1.27439] }], [{ side: "L", inner: [-0.62266, 1.64363, 0.22938], outer: [-0.79824, 1.83875, 0.2792] }, { side: "R", inner: [-0.295, 1.33569, 1.03971], outer: [-0.42275, 1.48001, 1.23377] }], [{ side: "L", inner: [-0.63191, 1.64363, 0.20265], outer: [-0.80945, 1.83875, 0.24495] }, { side: "R", inner: [-0.38598, 1.33569, 1.00385], outer: [-0.53203, 1.48001, 1.18453] }], [{ side: "L", inner: [-0.63987, 1.64363, 0.17674], outer: [-0.81899, 1.83875, 0.21176] }, { side: "R", inner: [-0.46927, 1.33569, 0.96186], outer: [-0.63155, 1.48001, 1.12812] }], [{ side: "L", inner: [-0.64569, 1.64363, 0.15351], outer: [-0.82596, 1.83875, 0.18203] }, { side: "R", inner: [-0.53723, 1.33569, 0.91641], outer: [-0.71269, 1.48001, 1.0687] }], [{ side: "L", inner: [-0.65054, 1.64363, 0.13181], outer: [-0.83166, 1.83875, 0.15428] }, { side: "R", inner: [-0.59705, 1.33569, 0.87043], outer: [-0.78366, 1.48001, 1.00882] }], [{ side: "L", inner: [-0.65435, 1.64363, 0.11194], outer: [-0.83607, 1.83875, 0.12888] }, { side: "R", inner: [-0.64797, 1.33569, 0.82485], outer: [-0.84379, 1.48001, 0.94988] }], [{ side: "L", inner: [-0.65685, 1.64363, 0.09587], outer: [-0.83894, 1.83875, 0.10835] }, { side: "R", inner: [-0.68562, 1.33568, 0.78526], outer: [-0.88814, 1.48001, 0.89912] }], [{ side: "L", inner: [-0.65879, 1.64363, 0.08195], outer: [-0.8411, 1.83875, 0.09058] }, { side: "R", inner: [-0.71666, 1.33568, 0.74985], outer: [-0.92446, 1.48001, 0.85375] }], [{ side: "L", inner: [-0.66009, 1.64363, 0.07097], outer: [-0.84251, 1.83875, 0.07656] }, { side: "R", inner: [-0.73972, 1.33569, 0.72097], outer: [-0.95133, 1.48001, 0.81688] }], [{ side: "L", inner: [-0.66075, 1.64363, 0.06457], outer: [-0.84322, 1.83875, 0.0684] }, { side: "R", inner: [-0.7526, 1.33569, 0.70379], outer: [-0.96629, 1.48001, 0.79498] }], [{ side: "L", inner: [-0.66112, 1.64363, 0.06086], outer: [-0.84361, 1.83875, 0.06366] }, { side: "R", inner: [-0.76021, 1.33569, 0.69323], outer: [-0.9751, 1.48001, 0.78153] }], [{ side: "L", inner: [-0.66107, 1.64363, 0.06134], outer: [-0.84356, 1.83875, 0.06427] }, { side: "R", inner: [-0.76023, 1.33569, 0.69286], outer: [-0.97516, 1.48001, 0.78107] }], [{ side: "L", inner: [-0.66137, 1.64324, 0.06653], outer: [-0.84399, 1.83821, 0.07118] }, { side: "R", inner: [-0.75461, 1.33569, 0.69886], outer: [-0.96883, 1.48001, 0.78878] }], [{ side: "L", inner: [-0.66727, 1.64012, 0.07366], outer: [-0.85109, 1.83381, 0.08256] }, { side: "R", inner: [-0.74466, 1.33569, 0.70939], outer: [-0.95759, 1.48001, 0.80231] }], [{ side: "L", inner: [-0.69111, 1.62821, 0.08323], outer: [-0.87894, 1.81713, 0.10351] }, { side: "R", inner: [-0.72586, 1.33569, 0.72856], outer: [-0.9363, 1.48001, 0.82702] }], [{ side: "L", inner: [-0.73336, 1.60765, 0.09048], outer: [-0.92701, 1.78806, 0.12705] }, { side: "R", inner: [-0.69893, 1.33568, 0.75444], outer: [-0.90563, 1.48001, 0.8605] }], [{ side: "L", inner: [-0.78506, 1.58154, 0.09758], outer: [-0.9831, 1.75199, 0.15338] }, { side: "R", inner: [-0.66176, 1.33568, 0.78966], outer: [-0.8628, 1.48001, 0.90609] }], [{ side: "L", inner: [-0.85045, 1.54797, 0.09648], outer: [-1.05182, 1.70694, 0.17106] }, { side: "R", inner: [-0.58826, 1.33569, 0.85961], outer: [-0.77604, 1.48001, 0.99641] }], [{ side: "L", inner: [-0.91643, 1.51194, 0.08757], outer: [-1.11868, 1.66211, 0.17661] }, { side: "R", inner: [-0.47561, 1.33569, 0.94267], outer: [-0.64159, 1.48001, 1.10523] }], [{ side: "L", inner: [-0.98153, 1.4721, 0.07728], outer: [-1.18299, 1.61622, 0.1774] }, { side: "R", inner: [-0.33017, 1.33569, 1.02512], outer: [-0.46559, 1.48001, 1.21391] }], [{ side: "L", inner: [-1.037, 1.43441, 0.05187], outer: [-1.23859, 1.57815, 0.1523] }, { side: "R", inner: [-0.13334, 1.33569, 1.07363], outer: [-0.22721, 1.48001, 1.28614] }], [{ side: "L", inner: [-1.08162, 1.39885, 0.02716], outer: [-1.28384, 1.54495, 0.12279] }, { side: "R", inner: [0.0752, 1.33569, 1.0817], outer: [0.0277, 1.48001, 1.30912] }], [{ side: "L", inner: [-1.11772, 1.36458, 218e-5], outer: [-1.32205, 1.51373, 0.08813] }, { side: "R", inner: [0.29052, 1.33569, 1.05084], outer: [0.29223, 1.48001, 1.28316] }], [{ side: "L", inner: [-1.136, 1.34346, -0.02033], outer: [-1.34224, 1.4963, 0.05375] }, { side: "R", inner: [0.47405, 1.33569, 0.98483], outer: [0.52067, 1.48001, 1.21243] }], [{ side: "L", inner: [-1.14805, 1.32783, -0.03242], outer: [-1.35592, 1.48232, 0.03322] }, { side: "R", inner: [0.62909, 1.33569, 0.90797], outer: [0.71479, 1.48001, 1.12391] }], [{ side: "L", inner: [-1.15296, 1.3208, -0.03566], outer: [-1.36144, 1.47617, 0.02582] }, { side: "R", inner: [0.7517, 1.33569, 0.82638], outer: [0.86945, 1.48001, 1.02666] }], [{ side: "L", inner: [-1.1535, 1.32025, -0.02923], outer: [-1.36167, 1.47568, 0.03313] }, { side: "R", inner: [0.82111, 1.33569, 0.76578], outer: [0.95785, 1.48001, 0.9536] }], [{ side: "L", inner: [-1.15353, 1.32025, -0.01855], outer: [-1.36108, 1.47568, 0.04587] }, { side: "R", inner: [0.86288, 1.33661, 0.72416], outer: [1.01078, 1.48102, 0.90327] }], [{ side: "L", inner: [-1.15327, 1.32025, -231e-5], outer: [-1.35977, 1.47568, 0.06537] }, { side: "R", inner: [0.87036, 1.3391, 0.71295], outer: [1.0198, 1.48378, 0.89055] }], [{ side: "L", inner: [-1.15189, 1.32025, 0.02633], outer: [-1.35639, 1.47568, 0.09983] }, { side: "R", inner: [0.83227, 1.35908, 0.72808], outer: [0.96963, 1.50665, 0.9129] }], [{ side: "L", inner: [-1.14912, 1.32025, 0.06238], outer: [-1.35086, 1.47568, 0.14313] }, { side: "R", inner: [0.77397, 1.3854, 0.74632], outer: [0.89636, 1.53624, 0.93887] }], [{ side: "L", inner: [-1.14371, 1.32025, 0.10999], outer: [-1.34142, 1.47568, 0.20019] }, { side: "R", inner: [0.68702, 1.42181, 0.76069], outer: [0.79212, 1.57848, 0.95872] }], [{ side: "L", inner: [-1.13316, 1.32025, 0.17114], outer: [-1.32501, 1.47568, 0.27322] }, { side: "R", inner: [0.5973, 1.46705, 0.74528], outer: [0.69368, 1.63548, 0.93802] }], [{ side: "L", inner: [-1.11758, 1.32025, 0.24008], outer: [-1.30192, 1.47568, 0.35517] }, { side: "R", inner: [0.50707, 1.51044, 0.71911], outer: [0.59691, 1.69272, 0.90215] }], [{ side: "L", inner: [-1.09291, 1.32025, 0.3217], outer: [-1.2671, 1.47568, 0.45163] }, { side: "R", inner: [0.44106, 1.55541, 0.66705], outer: [0.53283, 1.75436, 0.83076] }], [{ side: "L", inner: [-1.0569, 1.32025, 0.41247], outer: [-1.21813, 1.47568, 0.55816] }, { side: "R", inner: [0.40659, 1.58688, 0.61924], outer: [0.5026, 1.79743, 0.76503] }], [{ side: "L", inner: [-1.01106, 1.32025, 0.50726], outer: [-1.15682, 1.47568, 0.66843] }, { side: "R", inner: [0.39231, 1.60975, 0.57556], outer: [0.49315, 1.82858, 0.70499] }], [{ side: "L", inner: [-0.94911, 1.32025, 0.6064], outer: [-1.07611, 1.47568, 0.78274] }, { side: "R", inner: [0.41585, 1.61206, 0.55312], outer: [0.5228, 1.83165, 0.67619] }], [{ side: "L", inner: [-0.87428, 1.32025, 0.70299], outer: [-0.98008, 1.47568, 0.8928] }, { side: "R", inner: [0.44167, 1.61297, 0.53028], outer: [0.55465, 1.83286, 0.64727] }], [{ side: "L", inner: [-0.78862, 1.32025, 0.79552], outer: [-0.87116, 1.47568, 0.99655] }, { side: "R", inner: [0.46879, 1.61297, 0.50685], outer: [0.58769, 1.83286, 0.61782] }], [{ side: "L", inner: [-0.68723, 1.32025, 0.88043], outer: [-0.74442, 1.47568, 1.09008] }, { side: "R", inner: [0.49524, 1.61297, 0.4807], outer: [0.61994, 1.83286, 0.58511] }], [{ side: "L", inner: [-0.57652, 1.32025, 0.95523], outer: [-0.60721, 1.47568, 1.17036] }, { side: "R", inner: [0.52064, 1.61297, 0.45303], outer: [0.65084, 1.83286, 0.5505] }], [{ side: "L", inner: [-0.4579, 1.32025, 1.01986], outer: [-0.46137, 1.47568, 1.23714] }, { side: "R", inner: [0.54503, 1.61297, 0.424], outer: [0.68038, 1.83286, 0.51418] }], [{ side: "L", inner: [-0.33094, 1.32025, 1.06586], outer: [-0.30714, 1.47568, 1.28187] }, { side: "R", inner: [0.5672, 1.61297, 0.39325], outer: [0.70729, 1.83286, 0.47587] }], [{ side: "L", inner: [-0.20203, 1.32025, 1.0982], outer: [-0.15157, 1.47568, 1.30958] }, { side: "R", inner: [0.5878, 1.61297, 0.36186], outer: [0.73217, 1.83286, 0.43674] }], [{ side: "L", inner: [-0.07206, 1.32025, 1.11589], outer: [4e-3, 1.47568, 1.31946] }, { side: "R", inner: [0.60666, 1.61297, 0.32984], outer: [0.75485, 1.83286, 0.39684] }], [{ side: "L", inner: [0.05317, 1.32025, 1.11388], outer: [0.15281, 1.47568, 1.307] }, { side: "R", inner: [0.62271, 1.61297, 0.29785], outer: [0.77418, 1.83286, 0.35709] }], [{ side: "L", inner: [0.17318, 1.32025, 1.09981], outer: [0.29441, 1.47568, 1.28016] }, { side: "R", inner: [0.63706, 1.61297, 0.26613], outer: [0.79132, 1.83286, 0.31765] }], [{ side: "L", inner: [0.28542, 1.32025, 1.07281], outer: [0.42589, 1.47568, 1.23863] }, { side: "R", inner: [0.64934, 1.61297, 0.23499], outer: [0.80592, 1.83286, 0.27898] }], [{ side: "L", inner: [0.38383, 1.32025, 1.03439], outer: [0.54055, 1.47568, 1.18492] }, { side: "R", inner: [0.65911, 1.61297, 0.2056], outer: [0.8175, 1.83286, 0.24252] }], [{ side: "L", inner: [0.47307, 1.32025, 0.9901], outer: [0.64371, 1.47568, 1.12467] }, { side: "R", inner: [0.6674, 1.61297, 0.17741], outer: [0.82722, 1.83286, 0.20755] }], [{ side: "L", inner: [0.54934, 1.32025, 0.9415], outer: [0.73127, 1.47568, 1.06036] }, { side: "R", inner: [0.67383, 1.61297, 0.15134], outer: [0.83471, 1.83286, 0.17525] }], [{ side: "L", inner: [0.61124, 1.32025, 0.8934], outer: [0.80184, 1.47568, 0.99777] }, { side: "R", inner: [0.67856, 1.61297, 0.12838], outer: [0.84015, 1.83286, 0.14681] }], [{ side: "L", inner: [0.66414, 1.32025, 0.84643], outer: [0.86162, 1.47568, 0.93713] }, { side: "R", inner: [0.6823, 1.61297, 0.10747], outer: [0.84438, 1.83286, 0.12092] }], [{ side: "L", inner: [0.7039, 1.32025, 0.80521], outer: [0.90625, 1.47568, 0.88444] }, { side: "R", inner: [0.68478, 1.61297, 0.09036], outer: [0.84714, 1.83286, 0.09976] }], [{ side: "L", inner: [0.73275, 1.32025, 0.77242], outer: [0.93837, 1.47568, 0.84272] }, { side: "R", inner: [0.6864, 1.61297, 0.07725], outer: [0.84892, 1.83286, 0.08354] }], [{ side: "L", inner: [0.75447, 1.32025, 0.74593], outer: [0.9624, 1.47568, 0.80911] }, { side: "R", inner: [0.68753, 1.61297, 0.06693], outer: [0.85012, 1.83286, 0.07078] }], [{ side: "L", inner: [0.76408, 1.32025, 0.73344], outer: [0.97298, 1.47568, 0.79331] }, { side: "R", inner: [0.68798, 1.61297, 0.06217], outer: [0.85059, 1.83286, 0.06489] }], [{ side: "L", inner: [0.76612, 1.32025, 0.73029], outer: [0.97525, 1.47568, 0.78935] }, { side: "R", inner: [0.688, 1.61297, 0.06193], outer: [0.85062, 1.83286, 0.06459] }], [{ side: "L", inner: [0.76286, 1.32025, 0.73364], outer: [0.97173, 1.47568, 0.79361] }, { side: "R", inner: [0.68771, 1.61297, 0.06507], outer: [0.85031, 1.83286, 0.06848] }], [{ side: "L", inner: [0.75235, 1.32025, 0.74437], outer: [0.96035, 1.47568, 0.8073] }, { side: "R", inner: [0.68669, 1.61297, 0.07482], outer: [0.84923, 1.83286, 0.08053] }], [{ side: "L", inner: [0.73802, 1.32025, 0.75849], outer: [0.94478, 1.47568, 0.82537] }, { side: "R", inner: [0.68509, 1.61297, 0.08785], outer: [0.84749, 1.83286, 0.09665] }], [{ side: "L", inner: [0.7203, 1.32025, 0.77544], outer: [0.92546, 1.47568, 0.84708] }, { side: "R", inner: [0.68293, 1.61297, 0.10369], outer: [0.84508, 1.83286, 0.11625] }], [{ side: "L", inner: [0.68264, 1.32025, 0.81439], outer: [0.88366, 1.47568, 0.89695] }, { side: "R", inner: [0.67931, 1.61297, 0.12454], outer: [0.841, 1.83286, 0.14207] }], [{ side: "L", inner: [0.61411, 1.32025, 0.87899], outer: [0.80638, 1.47568, 0.98027] }, { side: "R", inner: [0.67472, 1.61297, 0.14716], outer: [0.83573, 1.83286, 0.17007] }], [{ side: "L", inner: [0.50571, 1.32025, 0.96895], outer: [0.68151, 1.47568, 1.09669] }, { side: "R", inner: [0.66896, 1.61297, 0.17181], outer: [0.82903, 1.83286, 0.20062] }], [{ side: "L", inner: [0.32321, 1.32025, 1.05481], outer: [0.46971, 1.47568, 1.21532] }, { side: "R", inner: [0.6612, 1.61297, 0.19893], outer: [0.81995, 1.83286, 0.23425] }], [{ side: "L", inner: [0.1082, 1.32025, 1.10595], outer: [0.21615, 1.47568, 1.29455] }, { side: "R", inner: [0.65218, 1.61297, 0.22677], outer: [0.8093, 1.83286, 0.26878] }], [{ side: "L", inner: [-0.14147, 1.32025, 1.10575], outer: [-0.08139, 1.47568, 1.31459] }, { side: "R", inner: [0.64157, 1.61297, 0.25545], outer: [0.79668, 1.83286, 0.30437] }], [{ side: "L", inner: [-0.38379, 1.32025, 1.04547], outer: [-0.37504, 1.47568, 1.2626] }, { side: "R", inner: [0.62907, 1.61297, 0.28436], outer: [0.78178, 1.83286, 0.34031] }], [{ side: "L", inner: [-0.60228, 1.32025, 0.95096], outer: [-0.64327, 1.47568, 1.16437] }, { side: "R", inner: [0.61543, 1.61297, 0.31296], outer: [0.76541, 1.83286, 0.37586] }], [{ side: "L", inner: [-0.77608, 1.32025, 0.83182], outer: [-0.86025, 1.47568, 1.03216] }, { side: "R", inner: [0.6004, 1.61297, 0.34094], outer: [0.74733, 1.83286, 0.41067] }], [{ side: "L", inner: [-0.89069, 1.32025, 0.71979], outer: [-1.0055, 1.47568, 0.90429] }, { side: "R", inner: [0.58435, 1.61297, 0.36751], outer: [0.728, 1.83286, 0.44377] }], [{ side: "L", inner: [-0.96921, 1.32099, 0.62239], outer: [-1.10554, 1.47627, 0.79176] }, { side: "R", inner: [0.56772, 1.61297, 0.39293], outer: [0.70788, 1.83286, 0.47543] }], [{ side: "L", inner: [-0.99753, 1.32458, 0.57236], outer: [-1.14143, 1.47938, 0.7358] }, { side: "R", inner: [0.55076, 1.61297, 0.4163], outer: [0.68735, 1.83286, 0.50459] }], [{ side: "L", inner: [-0.98477, 1.34942, 0.55551], outer: [-1.124, 1.50198, 0.72498] }, { side: "R", inner: [0.53413, 1.61297, 0.43734], outer: [0.66719, 1.83286, 0.53087] }], [{ side: "L", inner: [-0.94345, 1.38521, 0.5589], outer: [-1.07399, 1.53284, 0.73931] }, { side: "R", inner: [0.51785, 1.61297, 0.4567], outer: [0.64739, 1.83286, 0.55504] }], [{ side: "L", inner: [-0.85571, 1.44156, 0.57115], outer: [-0.97759, 1.58662, 0.75953] }, { side: "R", inner: [0.50304, 1.61297, 0.47287], outer: [0.62939, 1.83286, 0.57527] }], [{ side: "L", inner: [-0.75141, 1.49853, 0.5705], outer: [-0.87282, 1.64749, 0.75612] }, { side: "R", inner: [0.48995, 1.61297, 0.48643], outer: [0.61347, 1.83286, 0.59224] }], [{ side: "L", inner: [-0.63231, 1.55158, 0.56587], outer: [-0.75421, 1.71172, 0.7416] }, { side: "R", inner: [0.47826, 1.61297, 0.49802], outer: [0.59922, 1.83286, 0.60674] }], [{ side: "L", inner: [-0.54136, 1.59729, 0.53377], outer: [-0.66952, 1.77351, 0.68839] }, { side: "R", inner: [0.47032, 1.61297, 0.50549], outer: [0.58955, 1.83286, 0.61611] }], [{ side: "L", inner: [-0.47788, 1.62602, 0.51218], outer: [-0.60793, 1.81397, 0.65055] }, { side: "R", inner: [0.46511, 1.61297, 0.51032], outer: [0.58319, 1.83286, 0.62216] }], [{ side: "L", inner: [-0.44278, 1.64363, 0.49429], outer: [-0.5746, 1.83875, 0.62052] }, { side: "R", inner: [0.46225, 1.61297, 0.51291], outer: [0.57971, 1.83286, 0.62541] }]] }, executioner_axe: { durations: { Draw: 2.8, Stow: 2.8, Swing: 2.1 }, windows: [{ side: null, start: 0.22, end: 0.72 }], frames: [[{ side: "R", inner: [-0.44886, 1.48217, 0.3732], outer: [-0.87231, 1.77188, 0.46] }], [{ side: "R", inner: [-0.45208, 1.4838, 0.37173], outer: [-0.87606, 1.77347, 0.45603] }], [{ side: "R", inner: [-0.45585, 1.4857, 0.36998], outer: [-0.88042, 1.77534, 0.45134] }], [{ side: "R", inner: [-0.46488, 1.49021, 0.36556], outer: [-0.89082, 1.77975, 0.43988] }], [{ side: "R", inner: [-0.47475, 1.49517, 0.36052], outer: [-0.90203, 1.7846, 0.42706] }], [{ side: "R", inner: [-0.48857, 1.50201, 0.35287], outer: [-0.91752, 1.79129, 0.40852] }], [{ side: "R", inner: [-0.5033, 1.50937, 0.34418], outer: [-0.93372, 1.79848, 0.38801] }], [{ side: "R", inner: [-0.52074, 1.51798, 0.33289], outer: [-0.95251, 1.80688, 0.36267] }], [{ side: "R", inner: [-0.53894, 1.52708, 0.32009], outer: [-0.97163, 1.81576, 0.33488] }], [{ side: "R", inner: [-0.55866, 1.53692, 0.30482], outer: [-0.99177, 1.82535, 0.30316] }], [{ side: "R", inner: [-0.57879, 1.54709, 0.28762], outer: [-1.01167, 1.83525, 0.26873] }], [{ side: "R", inner: [-0.59932, 1.55762, 0.26833], outer: [-1.03123, 1.84549, 0.23141] }], [{ side: "R", inner: [-0.61968, 1.56821, 0.24688], outer: [-1.04981, 1.85577, 0.19152] }], [{ side: "R", inner: [-0.63954, 1.57887, 0.22394], outer: [-1.06706, 1.86613, 0.14987] }], [{ side: "R", inner: [-0.65845, 1.58924, 0.19901], outer: [-1.08254, 1.87617, 0.10631] }], [{ side: "R", inner: [-0.67628, 1.59951, 0.1733], outer: [-1.09612, 1.88613, 0.06213] }], [{ side: "R", inner: [-0.69231, 1.60903, 0.14628], outer: [-1.10726, 1.89532, 0.01734] }], [{ side: "R", inner: [-0.70704, 1.61836, 0.11919], outer: [-1.11639, 1.90437, -0.02713] }], [{ side: "R", inner: [-0.71916, 1.6264, 0.0921], outer: [-1.12265, 1.91211, -0.07019] }], [{ side: "R", inner: [-0.73013, 1.63426, 0.0654], outer: [-1.12721, 1.91972, -0.11242] }], [{ side: "R", inner: [-0.73786, 1.6402, 0.04064], outer: [-1.12886, 1.92543, -0.15052] }], [{ side: "R", inner: [-0.7447, 1.64595, 0.01654], outer: [-1.12927, 1.93099, -0.18752] }], [{ side: "R", inner: [-0.74821, 1.64929, -35e-4], outer: [-1.12731, 1.9342, -0.21773] }], [{ side: "R", inner: [-0.75095, 1.65225, -0.02238], outer: [-1.12457, 1.93705, -0.24614] }], [{ side: "R", inner: [-0.75101, 1.65283, -0.03569], outer: [-1.12065, 1.93761, -0.266] }], [{ side: "R", inner: [-0.75091, 1.65327, -0.04667], outer: [-1.11715, 1.93802, -0.28237] }], [{ side: "R", inner: [-0.75069, 1.65323, -0.05053], outer: [-1.11575, 1.93795, -0.28811] }], [{ side: "R", inner: [-0.75144, 1.65235, -0.05162], outer: [-1.11677, 1.93632, -0.28968] }], [{ side: "R", inner: [-0.7541, 1.64977, -0.04717], outer: [-1.12262, 1.93156, -0.28289] }], [{ side: "R", inner: [-0.75832, 1.64563, -0.03983], outer: [-1.13196, 1.92393, -0.27162] }], [{ side: "R", inner: [-0.7645, 1.63937, -0.02848], outer: [-1.14572, 1.91238, -0.25412] }], [{ side: "R", inner: [-0.77204, 1.63146, -0.01351], outer: [-1.1627, 1.89778, -0.23083] }], [{ side: "R", inner: [-0.78049, 1.62196, 506e-5], outer: [-1.18208, 1.88028, -0.20176] }], [{ side: "R", inner: [-0.78973, 1.61083, 0.02802], outer: [-1.20373, 1.85978, -0.16541] }], [{ side: "R", inner: [-0.79876, 1.59855, 0.05426], outer: [-1.22559, 1.8372, -0.12363] }], [{ side: "R", inner: [-0.80764, 1.58478, 0.08548], outer: [-1.2481, 1.81186, -0.07327] }], [{ side: "R", inner: [-0.81511, 1.57019, 0.11962], outer: [-1.26859, 1.7851, -0.01802] }], [{ side: "R", inner: [-0.82122, 1.55433, 0.15895], outer: [-1.28754, 1.75599, 0.04646] }], [{ side: "R", inner: [-0.82474, 1.53794, 0.20069], outer: [-1.30229, 1.726, 0.11497] }], [{ side: "R", inner: [-0.82557, 1.52055, 0.24724], outer: [-1.31303, 1.69418, 0.1924] }], [{ side: "R", inner: [-0.82273, 1.50286, 0.29554], outer: [-1.31765, 1.66195, 0.27261] }], [{ side: "R", inner: [-0.816, 1.48447, 0.34759], outer: [-1.3159, 1.62842, 0.36022] }], [{ side: "R", inner: [-0.80474, 1.46599, 0.40072], outer: [-1.30652, 1.59487, 0.44947] }], [{ side: "R", inner: [-0.78876, 1.44716, 0.45567], outer: [-1.28906, 1.56071, 0.54273] }], [{ side: "R", inner: [-0.76769, 1.42843, 0.51086], outer: [-1.26301, 1.52685, 0.63633] }], [{ side: "R", inner: [-0.74165, 1.40964, 0.56593], outer: [-1.22823, 1.49296, 0.73047] }], [{ side: "R", inner: [-0.71046, 1.39118, 0.62004], outer: [-1.18468, 1.45976, 0.82299] }], [{ side: "R", inner: [-0.6746, 1.37293, 0.67231], outer: [-1.13281, 1.42706, 0.9129] }], [{ side: "R", inner: [-0.63412, 1.35522, 0.72225], outer: [-1.07297, 1.39542, 0.99896] }], [{ side: "R", inner: [-0.58973, 1.338, 0.76902], outer: [-1.00611, 1.36478, 1.07996] }], [{ side: "R", inner: [-0.54189, 1.32151, 0.81222], outer: [-0.93315, 1.33553, 1.15499] }], [{ side: "R", inner: [-0.49118, 1.30579, 0.85146], outer: [-0.855, 1.30776, 1.22349] }], [{ side: "R", inner: [-0.43875, 1.29096, 0.8862], outer: [-0.77354, 1.28169, 1.28445] }], [{ side: "R", inner: [-0.38453, 1.27715, 0.91679], outer: [-0.68885, 1.25749, 1.33843] }], [{ side: "R", inner: [-0.33073, 1.26443, 0.94246], outer: [-0.60431, 1.23534, 1.38414] }], [{ side: "R", inner: [-0.27608, 1.25287, 0.96428], outer: [-0.51823, 1.21528, 1.42333] }], [{ side: "R", inner: [-0.22414, 1.24268, 0.98137], outer: [-0.43609, 1.19775, 1.45448] }], [{ side: "R", inner: [-0.172, 1.23367, 0.99525], outer: [-0.35356, 1.18229, 1.4802] }], [{ side: "R", inner: [-0.12187, 1.22565, 1.00563], outer: [-0.27395, 1.16868, 1.5] }], [{ side: "R", inner: [-0.07114, 1.21867, 1.0134], outer: [-0.19339, 1.15686, 1.5154] }], [{ side: "R", inner: [-0.01623, 1.21086, 1.01857], outer: [-0.10595, 1.14384, 1.52674] }], [{ side: "R", inner: [0.03995, 1.20419, 1.02074], outer: [-0.0166, 1.13275, 1.53306] }], [{ side: "R", inner: [0.0991, 1.1965, 1.01926], outer: [0.07768, 1.12017, 1.53355] }], [{ side: "R", inner: [0.15903, 1.19006, 1.01425], outer: [0.17305, 1.10974, 1.52819] }], [{ side: "R", inner: [0.22009, 1.18276, 1.00502], outer: [0.2703, 1.09808, 1.51598] }], [{ side: "R", inner: [0.28121, 1.17665, 0.99195], outer: [0.36745, 1.08847, 1.49748] }], [{ side: "R", inner: [0.34181, 1.1699, 0.97461], outer: [0.46373, 1.078, 1.47208] }], [{ side: "R", inner: [0.40145, 1.16414, 0.95349], outer: [0.55826, 1.06927, 1.44051] }], [{ side: "R", inner: [0.45926, 1.15808, 0.92854], outer: [0.64973, 1.0602, 1.40279] }], [{ side: "R", inner: [0.51495, 1.15268, 0.90027], outer: [0.73759, 1.0523, 1.35976] }], [{ side: "R", inner: [0.56794, 1.14737, 0.86894], outer: [0.82096, 1.04464, 1.31189] }], [{ side: "R", inner: [0.61765, 1.14229, 0.83521], outer: [0.89892, 1.03739, 1.26025] }], [{ side: "R", inner: [0.66431, 1.13771, 0.79935], outer: [0.97185, 1.03097, 1.20532] }], [{ side: "R", inner: [0.70673, 1.13288, 0.76239], outer: [1.0379, 1.0241, 1.14874] }], [{ side: "R", inner: [0.74619, 1.12893, 0.72419], outer: [1.09913, 1.01861, 1.09029] }], [{ side: "R", inner: [0.78072, 1.12433, 0.68647], outer: [1.15254, 1.01189, 1.03272] }], [{ side: "R", inner: [0.81275, 1.12087, 0.64821], outer: [1.20191, 1.00698, 0.97434] }], [{ side: "R", inner: [0.83949, 1.11656, 0.61226], outer: [1.24301, 1.00043, 0.91961] }], [{ side: "R", inner: [0.8644, 1.1135, 0.57615], outer: [1.28117, 0.99585, 0.86466] }], [{ side: "R", inner: [0.88393, 1.10966, 0.54434], outer: [1.31104, 0.98977, 0.81634] }], [{ side: "R", inner: [0.90235, 1.10696, 0.51245], outer: [1.33914, 0.98553, 0.76787] }], [{ side: "R", inner: [0.91552, 1.10385, 0.48699], outer: [1.35922, 0.98044, 0.72923] }], [{ side: "R", inner: [0.92788, 1.10156, 0.46196], outer: [1.37802, 0.97667, 0.69122] }], [{ side: "R", inner: [0.936, 1.0995, 0.44407], outer: [1.39035, 0.97321, 0.66405] }], [{ side: "R", inner: [0.94313, 1.09793, 0.42779], outer: [1.40118, 0.97056, 0.63933] }], [{ side: "R", inner: [0.9468, 1.09696, 0.41898], outer: [1.40674, 0.96891, 0.62595] }], [{ side: "R", inner: [0.94918, 1.0963, 0.41313], outer: [1.41035, 0.96779, 0.61704] }], [{ side: "R", inner: [0.94845, 1.09623, 0.41474], outer: [1.40927, 0.96767, 0.61941] }], [{ side: "R", inner: [0.94593, 1.09618, 0.42038], outer: [1.40552, 0.96759, 0.62778] }], [{ side: "R", inner: [0.94042, 1.09618, 0.43254], outer: [1.3973, 0.96759, 0.64585] }], [{ side: "R", inner: [0.93262, 1.09618, 0.44901], outer: [1.38567, 0.96759, 0.67033] }], [{ side: "R", inner: [0.92214, 1.09618, 0.47013], outer: [1.37003, 0.96759, 0.70172] }], [{ side: "R", inner: [0.90872, 1.09618, 0.49541], outer: [1.35004, 0.96759, 0.73929] }], [{ side: "R", inner: [0.89279, 1.09618, 0.52361], outer: [1.32626, 0.96759, 0.78118] }], [{ side: "R", inner: [0.87323, 1.09618, 0.55538], outer: [1.29713, 0.96759, 0.82841] }], [{ side: "R", inner: [0.85131, 1.09618, 0.58856], outer: [1.26441, 0.96759, 0.87767] }], [{ side: "R", inner: [0.83655, 1.10118, 0.61019], outer: [1.2427, 0.97627, 0.91055] }], [{ side: "R", inner: [0.82382, 1.10761, 0.62817], outer: [1.22407, 0.98748, 0.93824] }], [{ side: "R", inner: [0.81108, 1.14031, 0.64863], outer: [1.20658, 1.04462, 0.97297] }], [{ side: "R", inner: [0.79475, 1.17698, 0.66977], outer: [1.18316, 1.10847, 1.00921] }], [{ side: "R", inner: [0.76644, 1.23938, 0.70281], outer: [1.14098, 1.21814, 1.06342] }], [{ side: "R", inner: [0.72656, 1.30153, 0.73673], outer: [1.07937, 1.32676, 1.11839] }], [{ side: "R", inner: [0.67444, 1.38099, 0.77349], outer: [0.9962, 1.4671, 1.17328] }], [{ side: "R", inner: [0.60565, 1.45499, 0.80804], outer: [0.8852, 1.5971, 1.22329] }], [{ side: "R", inner: [0.52786, 1.53408, 0.83375], outer: [0.75705, 1.73736, 1.25437] }], [{ side: "R", inner: [0.43426, 1.60105, 0.85217], outer: [0.60307, 1.85607, 1.27318] }], [{ side: "R", inner: [0.33798, 1.66219, 0.85179], outer: [0.44302, 1.96591, 1.26105] }], [{ side: "R", inner: [0.23302, 1.70562, 0.83975], outer: [0.26958, 2.04552, 1.23206] }], [{ side: "R", inner: [0.13211, 1.73656, 0.80647], outer: [0.1022, 2.10509, 1.17263] }], [{ side: "R", inner: [0.03229, 1.749, 0.76248], outer: [-0.06248, 2.13413, 1.09934] }], [{ side: "R", inner: [-0.0592, 1.74758, 0.70472], outer: [-0.21368, 2.14115, 1.00805] }], [{ side: "R", inner: [-0.14163, 1.73245, 0.64393], outer: [-0.34979, 2.12591, 0.91342] }], [{ side: "R", inner: [-0.21469, 1.70602, 0.58145], outer: [-0.47093, 2.09276, 0.81713] }], [{ side: "R", inner: [-0.27472, 1.67402, 0.52574], outer: [-0.57114, 2.04993, 0.72972] }], [{ side: "R", inner: [-0.32667, 1.63507, 0.47672], outer: [-0.65863, 1.99568, 0.65145] }], [{ side: "R", inner: [-0.36521, 1.59909, 0.43997], outer: [-0.72453, 1.94449, 0.58952] }], [{ side: "R", inner: [-0.39801, 1.56047, 0.41111], outer: [-0.78135, 1.88845, 0.5386] }], [{ side: "R", inner: [-0.41882, 1.53209, 0.39384], outer: [-0.81812, 1.84665, 0.50519] }], [{ side: "R", inner: [-0.43642, 1.50417, 0.38114], outer: [-0.84962, 1.80504, 0.47868] }], [{ side: "R", inner: [-0.44323, 1.49242, 0.37663], outer: [-0.86201, 1.78737, 0.46832] }], [{ side: "R", inner: [-0.44886, 1.48217, 0.3732], outer: [-0.87231, 1.77188, 0.46] }]] }, scythe: { durations: { Draw: 2, Stow: 2, Swing: 1.5 }, windows: [{ side: null, start: 0.2, end: 0.76 }], frames: [[{ side: "R", inner: [-0.56345, 1.07319, 0.54233], outer: [-0.38157, 1.0442, 1.12625] }], [{ side: "R", inner: [-0.56951, 1.07449, 0.54086], outer: [-0.38995, 1.04548, 1.1255] }], [{ side: "R", inner: [-0.58308, 1.07743, 0.53734], outer: [-0.40881, 1.04834, 1.12357] }], [{ side: "R", inner: [-0.60369, 1.08192, 0.5316], outer: [-0.43754, 1.05273, 1.12018] }], [{ side: "R", inner: [-0.63075, 1.08789, 0.52345], outer: [-0.47545, 1.05856, 1.11497] }], [{ side: "R", inner: [-0.66647, 1.09586, 0.51092], outer: [-0.52574, 1.06634, 1.10607] }], [{ side: "R", inner: [-0.70676, 1.10502, 0.49482], outer: [-0.58287, 1.07528, 1.0937] }], [{ side: "R", inner: [-0.7509, 1.11531, 0.47485], outer: [-0.64602, 1.08533, 1.07734] }], [{ side: "R", inner: [-0.79817, 1.12665, 0.45073], outer: [-0.71433, 1.0964, 1.05648] }], [{ side: "R", inner: [-0.84943, 1.13934, 0.41965], outer: [-0.78924, 1.10879, 1.0282] }], [{ side: "R", inner: [-0.90143, 1.15278, 0.38362], outer: [-0.86637, 1.12191, 0.99412] }], [{ side: "R", inner: [-0.95337, 1.16689, 0.34266], outer: [-0.94475, 1.13569, 0.95409] }], [{ side: "R", inner: [-1.00446, 1.18159, 0.29683], outer: [-1.02343, 1.15006, 0.908] }], [{ side: "R", inner: [-1.05404, 1.1969, 0.24379], outer: [-1.1018, 1.165, 0.85337] }], [{ side: "R", inner: [-1.10035, 1.21246, 0.18666], outer: [-1.17736, 1.18018, 0.79322] }], [{ side: "R", inner: [-1.14281, 1.22814, 0.12598], outer: [-1.24929, 1.1955, 0.72804] }], [{ side: "R", inner: [-1.1809, 1.24387, 0.06226], outer: [-1.31687, 1.21086, 0.65833] }], [{ side: "R", inner: [-1.21294, 1.25932, -493e-5], outer: [-1.37808, 1.22593, 0.58371] }], [{ side: "R", inner: [-1.23922, 1.27439, -0.07263], outer: [-1.43286, 1.24062, 0.50724] }], [{ side: "R", inner: [-1.25967, 1.28896, -0.13999], outer: [-1.48095, 1.25482, 0.42988] }], [{ side: "R", inner: [-1.27427, 1.3029, -0.20621], outer: [-1.52217, 1.26841, 0.35258] }], [{ side: "R", inner: [-1.2815, 1.31555, -0.26907], outer: [-1.55434, 1.2807, 0.27795] }], [{ side: "R", inner: [-1.2832, 1.32709, -0.32743], outer: [-1.57945, 1.29191, 0.20725] }], [{ side: "R", inner: [-1.27976, 1.3374, -0.38049], outer: [-1.5978, 1.30191, 0.1415] }], [{ side: "R", inner: [-1.27164, 1.34636, -0.4275], outer: [-1.60976, 1.31058, 0.0817] }], [{ side: "R", inner: [-1.26089, 1.35387, -0.46704], outer: [-1.61653, 1.31782, 0.03006] }], [{ side: "R", inner: [-1.25022, 1.36094, -0.50248], outer: [-1.62141, 1.32465, -0.0169] }], [{ side: "R", inner: [-1.24008, 1.36753, -0.5337], outer: [-1.62481, 1.33103, -0.05879] }], [{ side: "R", inner: [-1.23087, 1.3736, -0.56055], outer: [-1.62715, 1.33691, -0.09525] }], [{ side: "R", inner: [-1.22409, 1.37879, -0.58041], outer: [-1.62885, 1.34195, -0.12249] }], [{ side: "R", inner: [-1.21925, 1.3833, -0.59496], outer: [-1.6303, 1.34636, -0.14268] }], [{ side: "R", inner: [-1.21666, 1.38712, -0.60405], outer: [-1.63177, 1.35011, -0.1555] }], [{ side: "R", inner: [-1.21656, 1.39019, -0.60748], outer: [-1.63345, 1.35315, -0.16059] }], [{ side: "R", inner: [-1.22051, 1.39188, -0.60266], outer: [-1.63596, 1.35495, -0.15442] }], [{ side: "R", inner: [-1.227, 1.39257, -0.59305], outer: [-1.63916, 1.35589, -0.14176] }], [{ side: "R", inner: [-1.23583, 1.39232, -0.57874], outer: [-1.64286, 1.356, -0.12279] }], [{ side: "R", inner: [-1.24677, 1.39116, -0.55976], outer: [-1.64686, 1.35535, -0.09767] }], [{ side: "R", inner: [-1.26035, 1.38878, -0.53425], outer: [-1.65092, 1.35362, -0.06404] }], [{ side: "R", inner: [-1.27512, 1.38568, -0.50447], outer: [-1.65446, 1.35126, -0.02509] }], [{ side: "R", inner: [-1.29072, 1.3819, -0.4704], outer: [-1.65709, 1.34834, 0.01901] }], [{ side: "R", inner: [-1.30676, 1.37751, -0.43207], outer: [-1.65843, 1.34488, 0.06808] }], [{ side: "R", inner: [-1.3232, 1.3723, -0.38824], outer: [-1.65781, 1.34068, 0.12355] }], [{ side: "R", inner: [-1.33899, 1.36665, -0.34065], outer: [-1.65492, 1.3361, 0.18293] }], [{ side: "R", inner: [-1.35373, 1.36061, -0.28941], outer: [-1.64936, 1.33119, 0.24596] }], [{ side: "R", inner: [-1.36699, 1.35422, -0.23461], outer: [-1.64075, 1.326, 0.31233] }], [{ side: "R", inner: [-1.3784, 1.34742, -0.17588], outer: [-1.62833, 1.32039, 0.38241] }], [{ side: "R", inner: [-1.3874, 1.34047, -0.11445], outer: [-1.61218, 1.31464, 0.45449] }], [{ side: "R", inner: [-1.39366, 1.3334, -0.05056], outer: [-1.59205, 1.30881, 0.52816] }], [{ side: "R", inner: [-1.39687, 1.32626, 0.0155], outer: [-1.56773, 1.30294, 0.60299] }], [{ side: "R", inner: [-1.39671, 1.31912, 0.08324], outer: [-1.53881, 1.29698, 0.67839] }], [{ side: "R", inner: [-1.39303, 1.31211, 0.15201], outer: [-1.50565, 1.29114, 0.75348] }], [{ side: "R", inner: [-1.38571, 1.30525, 0.22145], outer: [-1.46827, 1.28545, 0.82781] }], [{ side: "R", inner: [-1.37466, 1.2986, 0.29115], outer: [-1.42673, 1.27994, 0.90093] }], [{ side: "R", inner: [-1.35999, 1.29237, 0.35993], outer: [-1.38136, 1.27471, 0.97158] }], [{ side: "R", inner: [-1.34179, 1.28654, 0.42779], outer: [-1.33254, 1.26982, 1.03977] }], [{ side: "R", inner: [-1.32019, 1.28114, 0.49436], outer: [-1.28055, 1.26533, 1.10515] }], [{ side: "R", inner: [-1.29538, 1.27622, 0.55927], outer: [-1.22573, 1.26124, 1.16739] }], [{ side: "R", inner: [-1.26811, 1.27214, 0.62093], outer: [-1.16934, 1.2578, 1.22502] }], [{ side: "R", inner: [-1.23843, 1.26873, 0.68001], outer: [-1.11139, 1.25494, 1.2788] }], [{ side: "R", inner: [-1.20669, 1.26604, 0.73625], outer: [-1.05237, 1.25269, 1.32862] }], [{ side: "R", inner: [-1.17328, 1.26409, 0.78943], outer: [-0.99279, 1.25106, 1.37436] }], [{ side: "R", inner: [-1.13963, 1.26341, 0.83785], outer: [-0.93474, 1.25049, 1.41469] }], [{ side: "R", inner: [-1.10311, 1.26314, 0.88601], outer: [-0.87355, 1.25024, 1.45348] }], [{ side: "R", inner: [-1.06255, 1.26303, 0.93503], outer: [-0.80744, 1.2501, 1.49148] }], [{ side: "R", inner: [-1.01645, 1.26284, 0.98593], outer: [-0.73435, 1.24984, 1.52919] }], [{ side: "R", inner: [-0.96405, 1.26252, 1.03855], outer: [-0.65321, 1.24942, 1.56589] }], [{ side: "R", inner: [-0.90637, 1.26213, 1.09068], outer: [-0.56641, 1.24891, 1.59973] }], [{ side: "R", inner: [-0.84341, 1.26167, 1.14155], outer: [-0.47429, 1.24829, 1.62987] }], [{ side: "R", inner: [-0.77525, 1.26113, 1.19035], outer: [-0.37733, 1.24758, 1.6555] }], [{ side: "R", inner: [-0.70264, 1.2605, 1.23622], outer: [-0.27644, 1.24675, 1.6756] }], [{ side: "R", inner: [-0.62618, 1.25981, 1.27822], outer: [-0.17301, 1.24585, 1.68972] }], [{ side: "R", inner: [-0.54633, 1.25906, 1.31581], outer: [-0.0678, 1.24486, 1.69751] }], [{ side: "R", inner: [-0.46369, 1.25825, 1.34852], outer: [0.03836, 1.24379, 1.6987] }], [{ side: "R", inner: [-0.38052, 1.25738, 1.37572], outer: [0.14285, 1.24265, 1.69313] }], [{ side: "R", inner: [-0.29666, 1.25645, 1.39748], outer: [0.24567, 1.24145, 1.68127] }], [{ side: "R", inner: [-0.21288, 1.25548, 1.41381], outer: [0.34599, 1.24018, 1.66345] }], [{ side: "R", inner: [-0.12997, 1.25447, 1.4248], outer: [0.44299, 1.23885, 1.64011] }], [{ side: "R", inner: [-0.05125, 1.25341, 1.43071], outer: [0.53318, 1.2375, 1.61258] }], [{ side: "R", inner: [0.02447, 1.25232, 1.43216], outer: [0.61805, 1.23609, 1.58144] }], [{ side: "R", inner: [0.09651, 1.2512, 1.42967], outer: [0.6971, 1.23464, 1.54755] }], [{ side: "R", inner: [0.16418, 1.25005, 1.42384], outer: [0.76987, 1.23316, 1.51183] }], [{ side: "R", inner: [0.22365, 1.24887, 1.41592], outer: [0.83263, 1.23168, 1.47707] }], [{ side: "R", inner: [0.2772, 1.24768, 1.40639], outer: [0.88813, 1.23017, 1.44309] }], [{ side: "R", inner: [0.32438, 1.24648, 1.39601], outer: [0.93622, 1.22864, 1.4109] }], [{ side: "R", inner: [0.36479, 1.24526, 1.38553], outer: [0.97678, 1.2271, 1.38145] }], [{ side: "R", inner: [0.3941, 1.24404, 1.37673], outer: [1.00583, 1.22558, 1.35847] }], [{ side: "R", inner: [0.41549, 1.24282, 1.3694], outer: [1.0268, 1.22406, 1.34053] }], [{ side: "R", inner: [0.42862, 1.2416, 1.36408], outer: [1.03955, 1.22255, 1.32829] }], [{ side: "R", inner: [0.43319, 1.24039, 1.36112], outer: [1.04393, 1.22106, 1.32229] }], [{ side: "R", inner: [0.42422, 1.23877, 1.35969], outer: [1.03514, 1.21917, 1.32398] }], [{ side: "R", inner: [0.40679, 1.23663, 1.35759], outer: [1.01807, 1.21673, 1.32889] }], [{ side: "R", inner: [0.38142, 1.23399, 1.35456], outer: [0.9931, 1.21376, 1.33657] }], [{ side: "R", inner: [0.34864, 1.23085, 1.35016], outer: [0.96056, 1.21029, 1.34643] }], [{ side: "R", inner: [0.30636, 1.227, 1.34354], outer: [0.91809, 1.20608, 1.35884] }], [{ side: "R", inner: [0.25899, 1.22271, 1.33455], outer: [0.86977, 1.20142, 1.37168] }], [{ side: "R", inner: [0.20724, 1.21799, 1.32266], outer: [0.81603, 1.19633, 1.38422] }], [{ side: "R", inner: [0.15187, 1.21287, 1.30737], outer: [0.75734, 1.19083, 1.3957] }], [{ side: "R", inner: [0.09259, 1.20717, 1.28809], outer: [0.69296, 1.18473, 1.40615] }], [{ side: "R", inner: [0.03228, 1.20113, 1.26494], outer: [0.62566, 1.17828, 1.41415] }], [{ side: "R", inner: [-0.02825, 1.19477, 1.2377], outer: [0.55605, 1.17153, 1.41918] }], [{ side: "R", inner: [-0.08818, 1.18813, 1.20626], outer: [0.4848, 1.16449, 1.42078] }], [{ side: "R", inner: [-0.14676, 1.18109, 1.17128], outer: [0.41238, 1.15704, 1.4196] }], [{ side: "R", inner: [-0.20268, 1.17387, 1.13288], outer: [0.34032, 1.14941, 1.41473] }], [{ side: "R", inner: [-0.25534, 1.16648, 1.09132], outer: [0.26923, 1.14163, 1.40613] }], [{ side: "R", inner: [-0.30419, 1.15896, 1.04702], outer: [0.19974, 1.13374, 1.39386] }], [{ side: "R", inner: [-0.34856, 1.15132, 1.00196], outer: [0.13279, 1.1257, 1.3795] }], [{ side: "R", inner: [-0.38831, 1.14368, 0.95573], outer: [0.06883, 1.11769, 1.36222] }], [{ side: "R", inner: [-0.42332, 1.13608, 0.90889], outer: [824e-5, 1.10974, 1.34242] }], [{ side: "R", inner: [-0.45359, 1.12856, 0.86207], outer: [-0.04867, 1.10188, 1.32056] }], [{ side: "R", inner: [-0.47908, 1.12126, 0.81788], outer: [-0.101, 1.09425, 1.29872] }], [{ side: "R", inner: [-0.50024, 1.1142, 0.77515], outer: [-0.14905, 1.08688, 1.27595] }], [{ side: "R", inner: [-0.51738, 1.10743, 0.73437], outer: [-0.19279, 1.07982, 1.2528] }], [{ side: "R", inner: [-0.53091, 1.10098, 0.69605], outer: [-0.23227, 1.07311, 1.22983] }], [{ side: "R", inner: [-0.54129, 1.09516, 0.6627], outer: [-0.26646, 1.06703, 1.20911] }], [{ side: "R", inner: [-0.54899, 1.08984, 0.63258], outer: [-0.29626, 1.0615, 1.18955] }], [{ side: "R", inner: [-0.55451, 1.08507, 0.606], outer: [-0.32183, 1.05655, 1.17162] }], [{ side: "R", inner: [-0.55837, 1.08091, 0.58319], outer: [-0.34337, 1.05222, 1.15576] }], [{ side: "R", inner: [-0.56083, 1.07777, 0.56649], outer: [-0.35921, 1.04896, 1.1439] }], [{ side: "R", inner: [-0.5623, 1.07541, 0.55399], outer: [-0.37082, 1.04651, 1.13484] }], [{ side: "R", inner: [-0.56312, 1.07387, 0.54589], outer: [-0.37828, 1.04491, 1.12888] }], [{ side: "R", inner: [-0.56345, 1.07319, 0.54233], outer: [-0.38156, 1.0442, 1.12625] }]] }, shield: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.35 }, windows: [{ side: null, start: 0.18, end: 0.6 }], frames: [[{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32333], outer: [-0.3, 0.84235, 0.39401] }], [{ side: "L", inner: [-0.3, 1.0331, 0.32335], outer: [-0.3, 0.84236, 0.39403] }], [{ side: "L", inner: [-0.29999, 1.0331, 0.32337], outer: [-0.29999, 0.84236, 0.39405] }], [{ side: "L", inner: [-0.29992, 1.0332, 0.32383], outer: [-0.29992, 0.84246, 0.39451] }], [{ side: "L", inner: [-0.29974, 1.03346, 0.32507], outer: [-0.29974, 0.84272, 0.39575] }], [{ side: "L", inner: [-0.29956, 1.03373, 0.3263], outer: [-0.29956, 0.84298, 0.39698] }], [{ side: "L", inner: [-0.29926, 1.03415, 0.3283], outer: [-0.29926, 0.84341, 0.39898] }], [{ side: "L", inner: [-0.29882, 1.03478, 0.33127], outer: [-0.29882, 0.84404, 0.40195] }], [{ side: "L", inner: [-0.29837, 1.03542, 0.33424], outer: [-0.29837, 0.84467, 0.40492] }], [{ side: "L", inner: [-0.29782, 1.03621, 0.33796], outer: [-0.29782, 0.84547, 0.40864] }], [{ side: "L", inner: [-0.29716, 1.03715, 0.3424], outer: [-0.29716, 0.84641, 0.41308] }], [{ side: "L", inner: [-0.2965, 1.0381, 0.34684], outer: [-0.2965, 0.84735, 0.41752] }], [{ side: "L", inner: [-0.29573, 1.03919, 0.35198], outer: [-0.29573, 0.84845, 0.42266] }], [{ side: "L", inner: [-0.29489, 1.04039, 0.35762], outer: [-0.29489, 0.84965, 0.4283] }], [{ side: "L", inner: [-0.29405, 1.04159, 0.36326], outer: [-0.29405, 0.85085, 0.43394] }], [{ side: "L", inner: [-0.29312, 1.04292, 0.36952], outer: [-0.29312, 0.85218, 0.4402] }], [{ side: "L", inner: [-0.29214, 1.04432, 0.3761], outer: [-0.29214, 0.85358, 0.44678] }], [{ side: "L", inner: [-0.29116, 1.04572, 0.38268], outer: [-0.29116, 0.85498, 0.45336] }], [{ side: "L", inner: [-0.2901, 1.04723, 0.38976], outer: [-0.2901, 0.85649, 0.46044] }], [{ side: "L", inner: [-0.28902, 1.04877, 0.39702], outer: [-0.28902, 0.85803, 0.4677] }], [{ side: "L", inner: [-0.28794, 1.05032, 0.40427], outer: [-0.28794, 0.85957, 0.47495] }], [{ side: "L", inner: [-0.28681, 1.05193, 0.41186], outer: [-0.28681, 0.86119, 0.48254] }], [{ side: "L", inner: [-0.28567, 1.05356, 0.41953], outer: [-0.28567, 0.86282, 0.49021] }], [{ side: "L", inner: [-0.28453, 1.05519, 0.42719], outer: [-0.28453, 0.86445, 0.49787] }], [{ side: "L", inner: [-0.28337, 1.05685, 0.43499], outer: [-0.28337, 0.86611, 0.50567] }], [{ side: "L", inner: [-0.2822, 1.05852, 0.44281], outer: [-0.2822, 0.86777, 0.51349] }], [{ side: "L", inner: [-0.28104, 1.06018, 0.45062], outer: [-0.28104, 0.86944, 0.5213] }], [{ side: "L", inner: [-0.27989, 1.06182, 0.45832], outer: [-0.27989, 0.87107, 0.529] }], [{ side: "L", inner: [-0.27875, 1.06345, 0.46602], outer: [-0.27875, 0.87271, 0.5367] }], [{ side: "L", inner: [-0.2776, 1.06509, 0.47371], outer: [-0.2776, 0.87435, 0.54439] }], [{ side: "L", inner: [-0.27651, 1.06665, 0.48102], outer: [-0.27651, 0.8759, 0.5517] }], [{ side: "L", inner: [-0.27542, 1.0682, 0.48834], outer: [-0.27542, 0.87746, 0.55902] }], [{ side: "L", inner: [-0.27434, 1.06975, 0.49559], outer: [-0.27434, 0.879, 0.56627] }], [{ side: "L", inner: [-0.27335, 1.07116, 0.50226], outer: [-0.27335, 0.88042, 0.57294] }], [{ side: "L", inner: [-0.27236, 1.07258, 0.50892], outer: [-0.27236, 0.88184, 0.5796] }], [{ side: "L", inner: [-0.27139, 1.07397, 0.51544], outer: [-0.27139, 0.88323, 0.58612] }], [{ side: "L", inner: [-0.27053, 1.07519, 0.5212], outer: [-0.27053, 0.88445, 0.59188] }], [{ side: "L", inner: [-0.26967, 1.07642, 0.52695], outer: [-0.26967, 0.88568, 0.59763] }], [{ side: "L", inner: [-0.26886, 1.07758, 0.53242], outer: [-0.26886, 0.88684, 0.6031] }], [{ side: "L", inner: [-0.26817, 1.07856, 0.53701], outer: [-0.26817, 0.88782, 0.60769] }], [{ side: "L", inner: [-0.26749, 1.07953, 0.54159], outer: [-0.26749, 0.88879, 0.61227] }], [{ side: "L", inner: [-0.26688, 1.08041, 0.54572], outer: [-0.26688, 0.88967, 0.6164] }], [{ side: "L", inner: [-0.26641, 1.08108, 0.54886], outer: [-0.26641, 0.89034, 0.61954] }], [{ side: "L", inner: [-0.26594, 1.08175, 0.552], outer: [-0.26594, 0.89101, 0.62268] }], [{ side: "L", inner: [-0.26557, 1.08228, 0.55448], outer: [-0.26557, 0.89153, 0.62516] }], [{ side: "L", inner: [-0.26536, 1.08258, 0.55592], outer: [-0.26536, 0.89184, 0.6266] }], [{ side: "L", inner: [-0.26514, 1.08289, 0.55736], outer: [-0.26514, 0.89215, 0.62804] }], [{ side: "L", inner: [-0.26502, 1.08306, 0.55817], outer: [-0.26502, 0.89232, 0.62885] }], [{ side: "L", inner: [-0.26501, 1.08307, 0.55823], outer: [-0.26501, 0.89233, 0.62891] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55829], outer: [-0.265, 0.89234, 0.62897] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.265, 1.08309, 0.55832], outer: [-0.265, 0.89235, 0.629] }], [{ side: "L", inner: [-0.2651, 1.08296, 0.55768], outer: [-0.2651, 0.89221, 0.62836] }], [{ side: "L", inner: [-0.26521, 1.08279, 0.5569], outer: [-0.26521, 0.89205, 0.62758] }], [{ side: "L", inner: [-0.26533, 1.08263, 0.55613], outer: [-0.26533, 0.89188, 0.62681] }], [{ side: "L", inner: [-0.26568, 1.08212, 0.55374], outer: [-0.26568, 0.89138, 0.62442] }], [{ side: "L", inner: [-0.26606, 1.08157, 0.55118], outer: [-0.26606, 0.89083, 0.62186] }], [{ side: "L", inner: [-0.26644, 1.08103, 0.54862], outer: [-0.26644, 0.89029, 0.6193] }], [{ side: "L", inner: [-0.26705, 1.08017, 0.54456], outer: [-0.26705, 0.88942, 0.61524] }], [{ side: "L", inner: [-0.26766, 1.07929, 0.54047], outer: [-0.26766, 0.88855, 0.61115] }], [{ side: "L", inner: [-0.26828, 1.07841, 0.53631], outer: [-0.26828, 0.88767, 0.60699] }], [{ side: "L", inner: [-0.26908, 1.07727, 0.53094], outer: [-0.26908, 0.88653, 0.60162] }], [{ side: "L", inner: [-0.26988, 1.07613, 0.52558], outer: [-0.26988, 0.88538, 0.59626] }], [{ side: "L", inner: [-0.27069, 1.07496, 0.52009], outer: [-0.27069, 0.88422, 0.59077] }], [{ side: "L", inner: [-0.27164, 1.0736, 0.51372], outer: [-0.27164, 0.88286, 0.5844] }], [{ side: "L", inner: [-0.27259, 1.07225, 0.50735], outer: [-0.27259, 0.88151, 0.57803] }], [{ side: "L", inner: [-0.27356, 1.07086, 0.50083], outer: [-0.27356, 0.88012, 0.57151] }], [{ side: "L", inner: [-0.27462, 1.06935, 0.49372], outer: [-0.27462, 0.87861, 0.5644] }], [{ side: "L", inner: [-0.27568, 1.06784, 0.48661], outer: [-0.27568, 0.87709, 0.55729] }], [{ side: "L", inner: [-0.27676, 1.06629, 0.47937], outer: [-0.27676, 0.87555, 0.55005] }], [{ side: "L", inner: [-0.27789, 1.06468, 0.47178], outer: [-0.27789, 0.87394, 0.54246] }], [{ side: "L", inner: [-0.27902, 1.06307, 0.46419], outer: [-0.27902, 0.87232, 0.53487] }], [{ side: "L", inner: [-0.28016, 1.06143, 0.45653], outer: [-0.28016, 0.87069, 0.52721] }], [{ side: "L", inner: [-0.28132, 1.05977, 0.44872], outer: [-0.28132, 0.86903, 0.5194] }], [{ side: "L", inner: [-0.28248, 1.05811, 0.44092], outer: [-0.28248, 0.86737, 0.5116] }], [{ side: "L", inner: [-0.28364, 1.05646, 0.43314], outer: [-0.28364, 0.86572, 0.50382] }], [{ side: "L", inner: [-0.2848, 1.05481, 0.42539], outer: [-0.2848, 0.86407, 0.49607] }], [{ side: "L", inner: [-0.28595, 1.05316, 0.41764], outer: [-0.28595, 0.86242, 0.48832] }], [{ side: "L", inner: [-0.28708, 1.05154, 0.41004], outer: [-0.28708, 0.8608, 0.48072] }], [{ side: "L", inner: [-0.28819, 1.04996, 0.40261], outer: [-0.28819, 0.85922, 0.47329] }], [{ side: "L", inner: [-0.2893, 1.04838, 0.39517], outer: [-0.2893, 0.85764, 0.46585] }], [{ side: "L", inner: [-0.29036, 1.04687, 0.38806], outer: [-0.29036, 0.85613, 0.45874] }], [{ side: "L", inner: [-0.29138, 1.04541, 0.38121], outer: [-0.29138, 0.85467, 0.45189] }], [{ side: "L", inner: [-0.2924, 1.04395, 0.37435], outer: [-0.2924, 0.85321, 0.44503] }], [{ side: "L", inner: [-0.29334, 1.04261, 0.36803], outer: [-0.29334, 0.85186, 0.43871] }], [{ side: "L", inner: [-0.29424, 1.04133, 0.36202], outer: [-0.29424, 0.85058, 0.4327] }], [{ side: "L", inner: [-0.29513, 1.04005, 0.35601], outer: [-0.29513, 0.84931, 0.42669] }], [{ side: "L", inner: [-0.29591, 1.03894, 0.35079], outer: [-0.29591, 0.84819, 0.42147] }], [{ side: "L", inner: [-0.29664, 1.03789, 0.34589], outer: [-0.29664, 0.84715, 0.41657] }], [{ side: "L", inner: [-0.29737, 1.03685, 0.34098], outer: [-0.29737, 0.84611, 0.41166] }], [{ side: "L", inner: [-0.29794, 1.03604, 0.33715], outer: [-0.29794, 0.84529, 0.40783] }], [{ side: "L", inner: [-0.29846, 1.03529, 0.33363], outer: [-0.29846, 0.84454, 0.40431] }], [{ side: "L", inner: [-0.29899, 1.03454, 0.3301], outer: [-0.29899, 0.84379, 0.40078] }], [{ side: "L", inner: [-0.29931, 1.03408, 0.32797], outer: [-0.29931, 0.84334, 0.39865] }], [{ side: "L", inner: [-0.29959, 1.03368, 0.32608], outer: [-0.29959, 0.84294, 0.39676] }], [{ side: "L", inner: [-0.29987, 1.03328, 0.32419], outer: [-0.29987, 0.84253, 0.39487] }], [{ side: "L", inner: [-0.29993, 1.0332, 0.32382], outer: [-0.29993, 0.84246, 0.3945] }], [{ side: "L", inner: [-0.29996, 1.03315, 0.32357], outer: [-0.29996, 0.8424, 0.39425] }], [{ side: "L", inner: [-0.3, 1.03309, 0.32332], outer: [-0.3, 0.84235, 0.394] }]] }, sickle: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.8 }, windows: [{ side: null, start: 0.2, end: 0.65 }], frames: [[{ side: "L", inner: [-0.09702, 1.40938, 0.34182], outer: [0.20412, 1.70653, 0.43041] }], [{ side: "L", inner: [-0.10699, 1.40665, 0.34874], outer: [0.19176, 1.7031, 0.44722] }], [{ side: "L", inner: [-0.11711, 1.40386, 0.35561], outer: [0.17904, 1.6995, 0.46391] }], [{ side: "L", inner: [-0.14159, 1.39798, 0.3699], outer: [0.1471, 1.69195, 0.50055] }], [{ side: "L", inner: [-0.17111, 1.39075, 0.38587], outer: [0.10739, 1.68217, 0.54189] }], [{ side: "L", inner: [-0.21004, 1.38258, 0.40237], outer: [0.0525, 1.67097, 0.58875] }], [{ side: "L", inner: [-0.25748, 1.37311, 0.41841], outer: [-0.017, 1.65734, 0.63799] }], [{ side: "L", inner: [-0.31001, 1.36328, 0.43108], outer: [-0.09709, 1.64263, 0.683] }], [{ side: "L", inner: [-0.371, 1.35347, 0.43788], outer: [-0.1942, 1.62757, 0.7215] }], [{ side: "L", inner: [-0.43416, 1.3426, 0.44052], outer: [-0.29716, 1.60979, 0.75145] }], [{ side: "L", inner: [-0.50044, 1.33326, 0.43205], outer: [-0.41094, 1.59453, 0.76456] }], [{ side: "L", inner: [-0.56772, 1.32219, 0.41924], outer: [-0.52763, 1.57508, 0.76749] }], [{ side: "L", inner: [-0.62986, 1.31259, 0.39614], outer: [-0.64123, 1.55835, 0.75153] }], [{ side: "L", inner: [-0.69094, 1.30157, 0.36794], outer: [-0.75397, 1.53808, 0.7242] }], [{ side: "L", inner: [-0.74331, 1.291, 0.3349], outer: [-0.85451, 1.51854, 0.68518] }], [{ side: "L", inner: [-0.79045, 1.27987, 0.29815], outer: [-0.94711, 1.49749, 0.63716] }], [{ side: "L", inner: [-0.82995, 1.2688, 0.2609], outer: [-1.02651, 1.47623, 0.5852] }], [{ side: "L", inner: [-0.86051, 1.2585, 0.22484], outer: [-1.09064, 1.45641, 0.53259] }], [{ side: "L", inner: [-0.88677, 1.24822, 0.18964], outer: [-1.14621, 1.43623, 0.47977] }], [{ side: "L", inner: [-0.90237, 1.24096, 0.1625], outer: [-1.18137, 1.42207, 0.43854] }], [{ side: "L", inner: [-0.91719, 1.23326, 0.13475], outer: [-1.2148, 1.40684, 0.39577] }], [{ side: "L", inner: [-0.92105, 1.23144, 0.12215], outer: [-1.22452, 1.40325, 0.37753] }], [{ side: "L", inner: [-0.92482, 1.22958, 0.10949], outer: [-1.23404, 1.39959, 0.35912] }], [{ side: "L", inner: [-0.92584, 1.22917, 0.1048], outer: [-1.23682, 1.39876, 0.35251] }], [{ side: "L", inner: [-0.9261, 1.22917, 0.10238], outer: [-1.23772, 1.39876, 0.3493] }], [{ side: "L", inner: [-0.92558, 1.22917, 0.10499], outer: [-1.23636, 1.39876, 0.35296] }], [{ side: "L", inner: [-0.92442, 1.22917, 0.11162], outer: [-1.23317, 1.39876, 0.36211] }], [{ side: "L", inner: [-0.92262, 1.22917, 0.12116], outer: [-1.2284, 1.39876, 0.37526] }], [{ side: "L", inner: [-0.91949, 1.22917, 0.13652], outer: [-1.22039, 1.39876, 0.39639] }], [{ side: "L", inner: [-0.91601, 1.22917, 0.1527], outer: [-1.21163, 1.39876, 0.41856] }], [{ side: "L", inner: [-0.91017, 1.22917, 0.17578], outer: [-1.198, 1.39876, 0.45006] }], [{ side: "L", inner: [-0.90414, 1.22917, 0.19871], outer: [-1.18393, 1.39876, 0.48118] }], [{ side: "L", inner: [-0.89492, 1.22917, 0.22753], outer: [-1.16414, 1.39876, 0.52009] }], [{ side: "L", inner: [-0.88501, 1.22917, 0.25685], outer: [-1.143, 1.39876, 0.55935] }], [{ side: "L", inner: [-0.87193, 1.22917, 0.28961], outer: [-1.11669, 1.39876, 0.60292] }], [{ side: "L", inner: [-0.85701, 1.22917, 0.32382], outer: [-1.08723, 1.39876, 0.64797] }], [{ side: "L", inner: [-0.83943, 1.22917, 0.3596], outer: [-1.05361, 1.39876, 0.69456] }], [{ side: "L", inner: [-0.81854, 1.22917, 0.39731], outer: [-1.01485, 1.39876, 0.74305] }], [{ side: "L", inner: [-0.79591, 1.22917, 0.43513], outer: [-0.97333, 1.39876, 0.79092] }], [{ side: "L", inner: [-0.76831, 1.22917, 0.47478], outer: [-0.92467, 1.39876, 0.84033] }], [{ side: "L", inner: [-0.7402, 1.22917, 0.51358], outer: [-0.87496, 1.39876, 0.88763] }], [{ side: "L", inner: [-0.70542, 1.22917, 0.55312], outer: [-0.81625, 1.39876, 0.93494] }], [{ side: "L", inner: [-0.67016, 1.22917, 0.59159], outer: [-0.75662, 1.39876, 0.97966] }], [{ side: "L", inner: [-0.6296, 1.22917, 0.62894], outer: [-0.69014, 1.39876, 1.02188] }], [{ side: "L", inner: [-0.58727, 1.22917, 0.66503], outer: [-0.62128, 1.39876, 1.06115] }], [{ side: "L", inner: [-0.54132, 1.22917, 0.69926], outer: [-0.548, 1.39876, 1.09679] }], [{ side: "L", inner: [-0.49248, 1.22917, 0.73166], outer: [-0.47129, 1.39876, 1.12867] }], [{ side: "L", inner: [-0.44172, 1.22917, 0.76172], outer: [-0.39251, 1.39876, 1.15625] }], [{ side: "L", inner: [-0.38736, 1.22917, 0.7885], outer: [-0.30986, 1.39876, 1.17846] }], [{ side: "L", inner: [-0.3326, 1.22917, 0.81329], outer: [-0.22718, 1.39876, 1.19664] }], [{ side: "L", inner: [-0.27422, 1.22917, 0.83267], outer: [-0.14112, 1.39876, 1.20731] }], [{ side: "L", inner: [-0.21616, 1.22917, 0.85054], outer: [-0.05609, 1.39876, 1.21447] }], [{ side: "L", inner: [-0.15607, 1.22917, 0.86188], outer: [0.03011, 1.39876, 1.21318] }], [{ side: "L", inner: [-0.09621, 1.22917, 0.87114], outer: [0.11508, 1.39876, 1.20793] }], [{ side: "L", inner: [-0.03639, 1.22917, 0.87472], outer: [0.19867, 1.39876, 1.19538] }], [{ side: "L", inner: [0.023, 1.22917, 0.87485], outer: [0.2805, 1.39876, 1.17778] }], [{ side: "L", inner: [0.08109, 1.22917, 0.87084], outer: [0.35943, 1.39876, 1.15473] }], [{ side: "L", inner: [0.1377, 1.22917, 0.86208], outer: [0.43518, 1.39876, 1.12584] }], [{ side: "L", inner: [0.1927, 1.22917, 0.85094], outer: [0.50772, 1.39876, 1.0935] }], [{ side: "L", inner: [0.2444, 1.22917, 0.83432], outer: [0.57492, 1.39876, 1.05528] }], [{ side: "L", inner: [0.29513, 1.22917, 0.81682], outer: [0.63967, 1.39876, 1.01521] }], [{ side: "L", inner: [0.34026, 1.22917, 0.794], outer: [0.69658, 1.39876, 0.97036] }], [{ side: "L", inner: [0.38443, 1.22917, 0.77054], outer: [0.75114, 1.39876, 0.92417] }], [{ side: "L", inner: [0.42326, 1.22917, 0.74436], outer: [0.79838, 1.39876, 0.87611] }], [{ side: "L", inner: [0.45996, 1.22917, 0.71711], outer: [0.84206, 1.39876, 0.82695] }], [{ side: "L", inner: [0.49255, 1.22917, 0.6893], outer: [0.88008, 1.39876, 0.77816] }], [{ side: "L", inner: [0.52181, 1.22917, 0.66106], outer: [0.91342, 1.39876, 0.72971] }], [{ side: "L", inner: [0.54843, 1.22917, 0.63314], outer: [0.94295, 1.39876, 0.68233] }], [{ side: "L", inner: [0.57064, 1.22917, 0.60619], outer: [0.96697, 1.39876, 0.63763] }], [{ side: "L", inner: [0.59169, 1.22917, 0.5795], outer: [0.98902, 1.39876, 0.59348] }], [{ side: "L", inner: [0.6076, 1.22917, 0.55581], outer: [1.00518, 1.39876, 0.55513] }], [{ side: "L", inner: [0.62312, 1.22917, 0.53206], outer: [1.0204, 1.39876, 0.51672] }], [{ side: "L", inner: [0.6343, 1.22917, 0.51284], outer: [1.03097, 1.39876, 0.48602] }], [{ side: "L", inner: [0.64475, 1.22917, 0.49417], outer: [1.04052, 1.39876, 0.45629] }], [{ side: "L", inner: [0.65232, 1.22917, 0.47976], outer: [1.04719, 1.39876, 0.43347] }], [{ side: "L", inner: [0.65844, 1.22917, 0.46748], outer: [1.05242, 1.39876, 0.4141] }], [{ side: "L", inner: [0.66281, 1.22917, 0.4585], outer: [1.05606, 1.39876, 0.39997] }], [{ side: "L", inner: [0.66507, 1.22917, 0.45366], outer: [1.0579, 1.39876, 0.39238] }], [{ side: "L", inner: [0.6666, 1.22917, 0.45021], outer: [1.05912, 1.39876, 0.38698] }], [{ side: "L", inner: [0.66561, 1.22917, 0.45165], outer: [1.05827, 1.39876, 0.38926] }], [{ side: "L", inner: [0.66463, 1.22917, 0.45308], outer: [1.05742, 1.39876, 0.39155] }], [{ side: "L", inner: [0.66128, 1.22917, 0.45792], outer: [1.05451, 1.39876, 0.39927] }], [{ side: "L", inner: [0.65791, 1.22917, 0.46276], outer: [1.05156, 1.39876, 0.40699] }], [{ side: "L", inner: [0.65282, 1.22917, 0.46984], outer: [1.04706, 1.39876, 0.41834] }], [{ side: "L", inner: [0.64721, 1.22917, 0.47755], outer: [1.04203, 1.39876, 0.43073] }], [{ side: "L", inner: [0.64036, 1.22917, 0.4867], outer: [1.0358, 1.39876, 0.44551] }], [{ side: "L", inner: [0.63249, 1.22917, 0.497], outer: [1.02854, 1.39876, 0.46221] }], [{ side: "L", inner: [0.62085, 1.22917, 0.51461], outer: [1.01771, 1.39876, 0.49063] }], [{ side: "L", inner: [0.60133, 1.22917, 0.5468], outer: [0.99889, 1.39876, 0.54248] }], [{ side: "L", inner: [0.57879, 1.22917, 0.58146], outer: [0.976, 1.39876, 0.59867] }], [{ side: "L", inner: [0.53614, 1.22917, 0.63618], outer: [0.93009, 1.39876, 0.68979] }], [{ side: "L", inner: [0.49111, 1.22917, 0.69024], outer: [0.87848, 1.39876, 0.7798] }], [{ side: "L", inner: [0.41973, 1.22917, 0.7443], outer: [0.79384, 1.39876, 0.87889] }], [{ side: "L", inner: [0.34163, 1.22917, 0.79651], outer: [0.69669, 1.39876, 0.97542] }], [{ side: "L", inner: [0.24596, 1.22917, 0.8336], outer: [0.5743, 1.39876, 1.0578] }], [{ side: "L", inner: [0.13934, 1.22917, 0.86075], outer: [0.43376, 1.39876, 1.12794] }], [{ side: "L", inner: [0.02838, 1.22917, 0.87424], outer: [0.28283, 1.39876, 1.17973] }], [{ side: "L", inner: [-0.08662, 1.22917, 0.87109], outer: [0.12229, 1.39876, 1.20936] }], [{ side: "L", inner: [-0.20024, 1.22917, 0.86012], outer: [-0.04026, 1.39876, 1.22409] }], [{ side: "L", inner: [-0.30236, 1.22917, 0.83528], outer: [-0.19154, 1.39876, 1.2171] }], [{ side: "L", inner: [-0.4052, 1.22917, 0.80544], outer: [-0.34546, 1.39876, 1.19851] }], [{ side: "L", inner: [-0.48214, 1.22917, 0.76829], outer: [-0.46552, 1.39876, 1.16553] }], [{ side: "L", inner: [-0.55874, 1.22917, 0.72769], outer: [-0.58545, 1.39876, 1.12438] }], [{ side: "L", inner: [-0.61194, 1.22917, 0.6904], outer: [-0.67077, 1.39876, 1.0836] }], [{ side: "L", inner: [-0.65816, 1.22917, 0.65331], outer: [-0.74566, 1.39876, 1.04114] }], [{ side: "L", inner: [-0.68689, 1.23018, 0.62572], outer: [-0.7914, 1.40075, 1.00889] }], [{ side: "L", inner: [-0.70187, 1.23202, 0.60648], outer: [-0.81427, 1.40438, 0.9866] }], [{ side: "L", inner: [-0.70607, 1.23766, 0.59125], outer: [-0.81634, 1.41554, 0.96944] }], [{ side: "L", inner: [-0.68849, 1.25035, 0.5837], outer: [-0.77636, 1.44042, 0.96183] }], [{ side: "L", inner: [-0.66704, 1.26306, 0.57605], outer: [-0.72946, 1.46509, 0.95304] }], [{ side: "L", inner: [-0.61789, 1.28073, 0.57175], outer: [-0.63411, 1.49924, 0.94434] }], [{ side: "L", inner: [-0.5681, 1.29598, 0.56402], outer: [-0.53767, 1.52761, 0.92769] }], [{ side: "L", inner: [-0.49854, 1.31325, 0.5512], outer: [-0.41385, 1.55962, 0.89611] }], [{ side: "L", inner: [-0.42748, 1.32801, 0.53292], outer: [-0.2894, 1.58544, 0.8515] }], [{ side: "L", inner: [-0.35529, 1.34385, 0.50664], outer: [-0.17021, 1.61214, 0.79054] }], [{ side: "L", inner: [-0.2844, 1.35902, 0.47436], outer: [-0.05825, 1.63635, 0.7168] }], [{ side: "L", inner: [-0.22347, 1.37289, 0.43992], outer: [0.03357, 1.65699, 0.64005] }], [{ side: "L", inner: [-0.17355, 1.3867, 0.40538], outer: [0.10393, 1.67689, 0.56549] }], [{ side: "L", inner: [-0.13248, 1.39762, 0.3739], outer: [0.1595, 1.69135, 0.49763] }], [{ side: "L", inner: [-0.11452, 1.40365, 0.35794], outer: [0.18236, 1.69929, 0.46421] }], [{ side: "L", inner: [-0.09703, 1.40937, 0.34182], outer: [0.20411, 1.70653, 0.43042] }]] }, spear: { durations: { Draw: 2.3, Stow: 2.3, Swing: 2.2 }, windows: [{ side: null, start: 0.4, end: 0.62 }], frames: [[{ side: "L", inner: [-0.23338, 1.31758, 0.3241], outer: [0.02145, 1.9662, 0.46237] }], [{ side: "L", inner: [-0.23164, 1.3161, 0.32375], outer: [0.03204, 1.96083, 0.46369] }], [{ side: "L", inner: [-0.22939, 1.31413, 0.3233], outer: [0.04587, 1.95346, 0.46566] }], [{ side: "L", inner: [-0.22495, 1.30987, 0.32248], outer: [0.07426, 1.93699, 0.47068] }], [{ side: "L", inner: [-0.22016, 1.30466, 0.32168], outer: [0.10661, 1.91582, 0.47818] }], [{ side: "L", inner: [-0.21481, 1.29779, 0.32096], outer: [0.14545, 1.88631, 0.49014] }], [{ side: "L", inner: [-0.21, 1.2899, 0.3205], outer: [0.18584, 1.84963, 0.50702] }], [{ side: "L", inner: [-0.20603, 1.28098, 0.32048], outer: [0.22496, 1.80574, 0.52942] }], [{ side: "L", inner: [-0.20393, 1.27176, 0.32087], outer: [0.26039, 1.75414, 0.55854] }], [{ side: "L", inner: [-0.20355, 1.26213, 0.32181], outer: [0.28798, 1.69769, 0.59287] }], [{ side: "L", inner: [-0.20617, 1.25387, 0.32301], outer: [0.3057, 1.63625, 0.63375] }], [{ side: "L", inner: [-0.2109, 1.24593, 0.32457], outer: [0.31116, 1.57344, 0.67808] }], [{ side: "L", inner: [-0.2185, 1.24106, 0.32589], outer: [0.30275, 1.51152, 0.7258] }], [{ side: "L", inner: [-0.22807, 1.23761, 0.32706], outer: [0.28061, 1.45269, 0.77401] }], [{ side: "L", inner: [-0.23933, 1.23764, 0.32749], outer: [0.24512, 1.40025, 0.8211] }], [{ side: "L", inner: [-0.25153, 1.24016, 0.32717], outer: [0.19825, 1.35557, 0.8649] }], [{ side: "L", inner: [-0.2642, 1.24565, 0.32582], outer: [0.14187, 1.32028, 0.90402] }], [{ side: "L", inner: [-0.27602, 1.2537, 0.32339], outer: [0.08037, 1.29553, 0.9366] }], [{ side: "L", inner: [-0.28762, 1.26373, 0.31997], outer: [0.01407, 1.28018, 0.96301] }], [{ side: "L", inner: [-0.29661, 1.27512, 0.31573], outer: [-0.04884, 1.27464, 0.98161] }], [{ side: "L", inner: [-0.30536, 1.28762, 0.31071], outer: [-0.11333, 1.27648, 0.99465] }], [{ side: "L", inner: [-0.3106, 1.29925, 0.30576], outer: [-0.16599, 1.28383, 1.0012] }], [{ side: "L", inner: [-0.31545, 1.31102, 0.30051], outer: [-0.21671, 1.29532, 1.00392] }], [{ side: "L", inner: [-0.31804, 1.32052, 0.29609], outer: [-0.25457, 1.30712, 1.00361] }], [{ side: "L", inner: [-0.32002, 1.32872, 0.29217], outer: [-0.28595, 1.31889, 1.00176] }], [{ side: "L", inner: [-0.32092, 1.33419, 0.28949], outer: [-0.30594, 1.32747, 0.99978] }], [{ side: "L", inner: [-0.32137, 1.33713, 0.2878], outer: [-0.3165, 1.33233, 0.99825] }], [{ side: "L", inner: [-0.32147, 1.33791, 0.28699], outer: [-0.31925, 1.33364, 0.99746] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.28434], outer: [-0.32, 1.334, 0.99481] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.28101], outer: [-0.32, 1.334, 0.99147] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.27512], outer: [-0.32, 1.334, 0.98558] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.26877], outer: [-0.32, 1.334, 0.97924] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.26044], outer: [-0.32, 1.334, 0.97091] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.2517], outer: [-0.32, 1.334, 0.96216] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.24182], outer: [-0.32, 1.334, 0.95229] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.23153], outer: [-0.32, 1.334, 0.94199] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.22073], outer: [-0.32, 1.334, 0.9312] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.20975], outer: [-0.32, 1.334, 0.92022] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.19867], outer: [-0.32, 1.334, 0.90914] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.18786], outer: [-0.32, 1.334, 0.89833] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.17712], outer: [-0.32, 1.334, 0.88759] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.16735], outer: [-0.32, 1.334, 0.87781] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.15786], outer: [-0.32, 1.334, 0.86833] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.14969], outer: [-0.32, 1.334, 0.86015] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.14232], outer: [-0.32, 1.334, 0.85279] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.13638], outer: [-0.32, 1.334, 0.84684] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.13199], outer: [-0.32, 1.334, 0.84246] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.12891], outer: [-0.32, 1.334, 0.83937] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.13134], outer: [-0.32, 1.334, 0.84181] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.13585], outer: [-0.32, 1.334, 0.84632] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.16112], outer: [-0.32, 1.334, 0.87159] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.1903], outer: [-0.32, 1.334, 0.90076] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.2378], outer: [-0.32, 1.334, 0.94827] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.28954], outer: [-0.32, 1.334, 1.00001] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.35256], outer: [-0.32, 1.334, 1.06302] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.42052], outer: [-0.32, 1.334, 1.13098] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.49441], outer: [-0.32, 1.334, 1.20487] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.57225], outer: [-0.32, 1.334, 1.28272] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.65237], outer: [-0.32, 1.334, 1.36283] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.73377], outer: [-0.32, 1.334, 1.44424] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.81546], outer: [-0.32, 1.334, 1.52593] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.89409], outer: [-0.32, 1.334, 1.60455] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.97131], outer: [-0.32, 1.334, 1.68178] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.04223], outer: [-0.32, 1.334, 1.75269] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.10865], outer: [-0.32, 1.334, 1.81912] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.16721], outer: [-0.32, 1.334, 1.87768] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.2165], outer: [-0.32, 1.334, 1.92696] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.25806], outer: [-0.32, 1.334, 1.96852] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.28387], outer: [-0.32, 1.334, 1.99434] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30379], outer: [-0.32, 1.334, 2.01425] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30657], outer: [-0.32, 1.334, 2.01703] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30753], outer: [-0.32, 1.334, 2.018] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30753], outer: [-0.32, 1.334, 2.018] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30753], outer: [-0.32, 1.334, 2.018] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30753], outer: [-0.32, 1.334, 2.018] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30753], outer: [-0.32, 1.334, 2.018] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30753], outer: [-0.32, 1.334, 2.018] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.30225], outer: [-0.32, 1.334, 2.01272] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.29395], outer: [-0.32, 1.334, 2.00442] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.26524], outer: [-0.32, 1.334, 1.9757] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.23198], outer: [-0.32, 1.334, 1.94244] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.1786], outer: [-0.32, 1.334, 1.88906] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.1226], outer: [-0.32, 1.334, 1.83307] }], [{ side: "L", inner: [-0.3215, 1.33812, 1.05481], outer: [-0.32, 1.334, 1.76528] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.98387], outer: [-0.32, 1.334, 1.69433] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.90739], outer: [-0.32, 1.334, 1.61786] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.8293], outer: [-0.32, 1.334, 1.53976] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.74985], outer: [-0.32, 1.334, 1.46031] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.6724], outer: [-0.32, 1.334, 1.38286] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.59569], outer: [-0.32, 1.334, 1.30616] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.52668], outer: [-0.32, 1.334, 1.23714] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.45972], outer: [-0.32, 1.334, 1.17019] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.40566], outer: [-0.32, 1.334, 1.11612] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.35702], outer: [-0.32, 1.334, 1.06748] }], [{ side: "L", inner: [-0.3215, 1.33812, 0.32285], outer: [-0.32, 1.334, 1.03331] }], [{ side: "L", inner: [-0.32149, 1.33806, 0.30007], outer: [-0.31977, 1.33389, 1.01054] }], [{ side: "L", inner: [-0.32147, 1.33792, 0.29097], outer: [-0.31927, 1.33365, 1.00143] }], [{ side: "L", inner: [-0.32103, 1.33489, 0.28914], outer: [-0.30846, 1.32861, 0.99948] }], [{ side: "L", inner: [-0.32032, 1.33027, 0.29142], outer: [-0.29168, 1.32125, 1.00126] }], [{ side: "L", inner: [-0.31816, 1.32112, 0.29581], outer: [-0.2569, 1.30794, 1.00352] }], [{ side: "L", inner: [-0.31565, 1.31133, 0.30037], outer: [-0.21807, 1.29568, 1.00394] }], [{ side: "L", inner: [-0.30992, 1.29793, 0.30634], outer: [-0.15997, 1.28278, 1.00065] }], [{ side: "L", inner: [-0.30354, 1.28503, 0.31178], outer: [-0.10008, 1.27556, 0.99244] }], [{ side: "L", inner: [-0.2938, 1.27156, 0.31709], outer: [-0.02936, 1.27556, 0.97652] }], [{ side: "L", inner: [-0.28296, 1.25958, 0.32144], outer: [0.04112, 1.28529, 0.95318] }], [{ side: "L", inner: [-0.27006, 1.24939, 0.32473], outer: [0.11199, 1.30676, 0.921] }], [{ side: "L", inner: [-0.25644, 1.24228, 0.3267], outer: [0.17688, 1.34059, 0.88109] }], [{ side: "L", inner: [-0.24293, 1.23789, 0.32753], outer: [0.23218, 1.38577, 0.83466] }], [{ side: "L", inner: [-0.23015, 1.23792, 0.32709], outer: [0.27456, 1.4421, 0.78356] }], [{ side: "L", inner: [-0.2193, 1.24001, 0.32613], outer: [0.30125, 1.50512, 0.7305] }], [{ side: "L", inner: [-0.21112, 1.2467, 0.32444], outer: [0.31099, 1.57356, 0.67847] }], [{ side: "L", inner: [-0.20559, 1.25421, 0.32295], outer: [0.3045, 1.64264, 0.62908] }], [{ side: "L", inner: [-0.20372, 1.2644, 0.32152], outer: [0.28333, 1.70887, 0.5861] }], [{ side: "L", inner: [-0.20428, 1.27443, 0.32072], outer: [0.25036, 1.77037, 0.54904] }], [{ side: "L", inner: [-0.20756, 1.28469, 0.3204], outer: [0.20998, 1.82375, 0.52002] }], [{ side: "L", inner: [-0.21228, 1.29389, 0.32068], outer: [0.16592, 1.8686, 0.49805] }], [{ side: "L", inner: [-0.21804, 1.30207, 0.32136], outer: [0.12186, 1.90481, 0.48246] }], [{ side: "L", inner: [-0.22346, 1.3083, 0.32221], outer: [0.08425, 1.93074, 0.47279] }], [{ side: "L", inner: [-0.22863, 1.31342, 0.32315], outer: [0.05071, 1.95078, 0.46642] }], [{ side: "L", inner: [-0.23129, 1.3158, 0.32368], outer: [0.03418, 1.95972, 0.46397] }], [{ side: "L", inner: [-0.23338, 1.31758, 0.3241], outer: [0.02146, 1.9662, 0.46237] }]] }, trident: { durations: { Draw: 2.3, Stow: 2.3, Swing: 2.2 }, windows: [{ side: null, start: 0.4, end: 0.62 }], frames: [[{ side: "L", inner: [-0.19422, 1.42436, 0.34977], outer: [0.07272, 2.11358, 0.50059] }], [{ side: "L", inner: [-0.19105, 1.4223, 0.34965], outer: [0.08522, 2.10745, 0.50219] }], [{ side: "L", inner: [-0.18695, 1.41951, 0.34956], outer: [0.10158, 2.09903, 0.5046] }], [{ side: "L", inner: [-0.17866, 1.4134, 0.34958], outer: [0.13519, 2.08016, 0.51068] }], [{ side: "L", inner: [-0.16943, 1.40575, 0.35001], outer: [0.17357, 2.05581, 0.51973] }], [{ side: "L", inner: [-0.15867, 1.39541, 0.35119], outer: [0.2198, 2.02177, 0.53413] }], [{ side: "L", inner: [-0.14808, 1.38308, 0.35336], outer: [0.26808, 1.97925, 0.55441] }], [{ side: "L", inner: [-0.13836, 1.36873, 0.35676], outer: [0.31509, 1.9282, 0.58128] }], [{ side: "L", inner: [-0.13076, 1.3529, 0.36158], outer: [0.35815, 1.86784, 0.61622] }], [{ side: "L", inner: [-0.12582, 1.33594, 0.36771], outer: [0.39212, 1.80163, 0.65737] }], [{ side: "L", inner: [-0.12492, 1.31932, 0.37509], outer: [0.41486, 1.72902, 0.70647] }], [{ side: "L", inner: [-0.12773, 1.3027, 0.38336], outer: [0.42322, 1.6546, 0.75973] }], [{ side: "L", inner: [-0.13513, 1.28877, 0.39199], outer: [0.41542, 1.5805, 0.81722] }], [{ side: "L", inner: [-0.14637, 1.27649, 0.40061], outer: [0.39138, 1.50975, 0.87541] }], [{ side: "L", inner: [-0.16115, 1.26811, 0.40846], outer: [0.3515, 1.44592, 0.93249] }], [{ side: "L", inner: [-0.17855, 1.26301, 0.41519], outer: [0.29796, 1.39088, 0.98582] }], [{ side: "L", inner: [-0.19788, 1.26187, 0.42035], outer: [0.23291, 1.34652, 1.03376] }], [{ side: "L", inner: [-0.21735, 1.26454, 0.42358], outer: [0.16138, 1.31434, 1.07405] }], [{ side: "L", inner: [-0.23743, 1.27035, 0.42501], outer: [0.08388, 1.29311, 1.10712] }], [{ side: "L", inner: [-0.25483, 1.27886, 0.42453], outer: [982e-5, 1.28351, 1.1309] }], [{ side: "L", inner: [-0.27232, 1.28946, 0.42252], outer: [-0.06628, 1.2826, 1.14814] }], [{ side: "L", inner: [-0.28501, 1.30025, 0.41952], outer: [-0.12888, 1.28864, 1.15743] }], [{ side: "L", inner: [-0.2971, 1.31181, 0.41566], outer: [-0.18927, 1.29968, 1.16215] }], [{ side: "L", inner: [-0.30527, 1.32155, 0.41199], outer: [-0.23462, 1.31166, 1.16295] }], [{ side: "L", inner: [-0.3119, 1.33021, 0.40848], outer: [-0.27224, 1.32394, 1.16175] }], [{ side: "L", inner: [-0.31583, 1.33611, 0.40597], outer: [-0.29631, 1.33303, 1.16005] }], [{ side: "L", inner: [-0.31789, 1.33932, 0.40433], outer: [-0.30902, 1.33821, 1.15862] }], [{ side: "L", inner: [-0.31841, 1.34017, 0.40353], outer: [-0.31234, 1.33961, 1.15785] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.40089], outer: [-0.31325, 1.34, 1.15521] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.39755], outer: [-0.31325, 1.34, 1.15187] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.39166], outer: [-0.31325, 1.34, 1.14598] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.38531], outer: [-0.31325, 1.34, 1.13964] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.37699], outer: [-0.31325, 1.34, 1.13131] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.36824], outer: [-0.31325, 1.34, 1.12256] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.35836], outer: [-0.31325, 1.34, 1.11269] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.34807], outer: [-0.31325, 1.34, 1.10239] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.33728], outer: [-0.31325, 1.34, 1.0916] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.3263], outer: [-0.31325, 1.34, 1.08062] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.31521], outer: [-0.31325, 1.34, 1.06954] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.30441], outer: [-0.31325, 1.34, 1.05873] }], [{ side: "L", inner: [-0.31855, 1.34041, 0.29366], outer: [-0.31325, 1.34, 1.04799] }], [{ side: "L", inner: [-0.31855, 1.34041, 0.28389], outer: [-0.31325, 1.34, 1.03821] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.27441], outer: [-0.31325, 1.34, 1.02873] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.26623], outer: [-0.31325, 1.34, 1.02055] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.25887], outer: [-0.31325, 1.34, 1.01319] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.25292], outer: [-0.31325, 1.34, 1.00724] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.24854], outer: [-0.31325, 1.34, 1.00286] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.24545], outer: [-0.31325, 1.34, 0.99977] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.24789], outer: [-0.31325, 1.34, 1.00221] }], [{ side: "L", inner: [-0.31855, 1.34041, 0.25239], outer: [-0.31325, 1.34, 1.00672] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.27766], outer: [-0.31325, 1.34, 1.03199] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.30684], outer: [-0.31325, 1.34, 1.06116] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.35435], outer: [-0.31325, 1.34, 1.10867] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.40608], outer: [-0.31325, 1.34, 1.16041] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.4691], outer: [-0.31325, 1.34, 1.22342] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.53706], outer: [-0.31325, 1.34, 1.29138] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.61095], outer: [-0.31325, 1.34, 1.36527] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.6888], outer: [-0.31325, 1.34, 1.44312] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.76891], outer: [-0.31325, 1.34, 1.52323] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.85031], outer: [-0.31325, 1.34, 1.60464] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.93201], outer: [-0.31325, 1.34, 1.68633] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.01063], outer: [-0.31325, 1.34, 1.76495] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.08786], outer: [-0.31325, 1.34, 1.84218] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.15877], outer: [-0.31325, 1.34, 1.91309] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.22519], outer: [-0.31325, 1.34, 1.97952] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.28375], outer: [-0.31325, 1.34, 2.03808] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.33304], outer: [-0.31325, 1.34, 2.08736] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.3746], outer: [-0.31325, 1.34, 2.12892] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.40042], outer: [-0.31325, 1.34, 2.15474] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.42033], outer: [-0.31325, 1.34, 2.17465] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42311], outer: [-0.31325, 1.34, 2.17743] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42408], outer: [-0.31325, 1.34, 2.1784] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42408], outer: [-0.31325, 1.34, 2.1784] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42408], outer: [-0.31325, 1.34, 2.1784] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42408], outer: [-0.31325, 1.34, 2.1784] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42408], outer: [-0.31325, 1.34, 2.1784] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.42408], outer: [-0.31325, 1.34, 2.1784] }], [{ side: "L", inner: [-0.31855, 1.34041, 1.4188], outer: [-0.31325, 1.34, 2.17312] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.4105], outer: [-0.31325, 1.34, 2.16482] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.38178], outer: [-0.31325, 1.34, 2.1361] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.34852], outer: [-0.31325, 1.34, 2.10284] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.29514], outer: [-0.31325, 1.34, 2.04946] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.23914], outer: [-0.31325, 1.34, 1.99347] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.17136], outer: [-0.31325, 1.34, 1.92568] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.10041], outer: [-0.31325, 1.34, 1.85473] }], [{ side: "L", inner: [-0.31855, 1.3404, 1.02394], outer: [-0.31325, 1.34, 1.77826] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.94584], outer: [-0.31325, 1.34, 1.70016] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.86639], outer: [-0.31325, 1.34, 1.62071] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.78894], outer: [-0.31325, 1.34, 1.54326] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.71223], outer: [-0.31325, 1.34, 1.46656] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.64322], outer: [-0.31325, 1.34, 1.39754] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.57627], outer: [-0.31325, 1.34, 1.33059] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.5222], outer: [-0.31325, 1.34, 1.27652] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.47356], outer: [-0.31325, 1.34, 1.22788] }], [{ side: "L", inner: [-0.31855, 1.3404, 0.43939], outer: [-0.31325, 1.34, 1.19371] }], [{ side: "L", inner: [-0.31851, 1.34033, 0.41661], outer: [-0.31298, 1.33988, 1.17094] }], [{ side: "L", inner: [-0.31842, 1.34018, 0.40751], outer: [-0.31237, 1.33963, 1.16183] }], [{ side: "L", inner: [-0.31633, 1.33687, 0.40563], outer: [-0.29934, 1.33425, 1.15978] }], [{ side: "L", inner: [-0.31307, 1.33187, 0.40778], outer: [-0.27913, 1.32644, 1.16134] }], [{ side: "L", inner: [-0.30573, 1.32218, 0.41174], outer: [-0.23742, 1.31251, 1.16292] }], [{ side: "L", inner: [-0.29748, 1.31212, 0.41555], outer: [-0.19089, 1.30003, 1.16222] }], [{ side: "L", inner: [-0.2835, 1.29899, 0.4199], outer: [-0.12174, 1.28769, 1.15661] }], [{ side: "L", inner: [-0.2687, 1.28718, 0.42304], outer: [-0.05064, 1.28213, 1.14516] }], [{ side: "L", inner: [-0.24942, 1.27606, 0.42483], outer: [0.03276, 1.28553, 1.12434] }], [{ side: "L", inner: [-0.22929, 1.26774, 0.42464], outer: [0.11554, 1.30039, 1.09476] }], [{ side: "L", inner: [-0.20743, 1.26279, 0.42217], outer: [0.1982, 1.32911, 1.0547] }], [{ side: "L", inner: [-0.18596, 1.26236, 0.41739], outer: [0.27335, 1.37211, 1.00562] }], [{ side: "L", inner: [-0.16614, 1.26598, 0.41066], outer: [0.33679, 1.42821, 0.94896] }], [{ side: "L", inner: [-0.14901, 1.27505, 0.40215], outer: [0.38464, 1.4968, 0.88699] }], [{ side: "L", inner: [-0.13602, 1.28687, 0.39294], outer: [0.41385, 1.57296, 0.82285] }], [{ side: "L", inner: [-0.12794, 1.30337, 0.38331], outer: [0.42307, 1.65458, 0.76022] }], [{ side: "L", inner: [-0.12466, 1.32061, 0.37431], outer: [0.41319, 1.73669, 0.70084] }], [{ side: "L", inner: [-0.12675, 1.33961, 0.36641], outer: [0.3864, 1.81468, 0.64927] }], [{ side: "L", inner: [-0.13271, 1.35769, 0.35999], outer: [0.34588, 1.88688, 0.60481] }], [{ side: "L", inner: [-0.1421, 1.37466, 0.35526], outer: [0.29709, 1.94914, 0.57001] }], [{ side: "L", inner: [-0.15323, 1.38938, 0.35215], outer: [0.24423, 2.00126, 0.54363] }], [{ side: "L", inner: [-0.16519, 1.40188, 0.35037], outer: [0.1917, 2.04313, 0.52489] }], [{ side: "L", inner: [-0.1758, 1.41112, 0.34966], outer: [0.14704, 2.07298, 0.51322] }], [{ side: "L", inner: [-0.18553, 1.41851, 0.34954], outer: [0.10731, 2.09596, 0.50552] }], [{ side: "L", inner: [-0.19042, 1.42188, 0.34963], outer: [0.08775, 2.10618, 0.50254] }], [{ side: "L", inner: [-0.19422, 1.42436, 0.34977], outer: [0.07273, 2.11358, 0.50059] }]] }, dark_sword: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.8 }, windows: [{ side: null, start: 0.2, end: 0.65 }], frames: [[{ side: "L", inner: [-0.25483, 1.44136, 0.34151], outer: [-0.18704, 1.9837, 0.479] }], [{ side: "L", inner: [-0.26462, 1.43847, 0.34527], outer: [-0.20018, 1.97932, 0.49009] }], [{ side: "L", inner: [-0.27464, 1.43559, 0.34892], outer: [-0.21403, 1.97493, 0.50082] }], [{ side: "L", inner: [-0.29797, 1.42912, 0.35611], outer: [-0.24646, 1.9645, 0.52447] }], [{ side: "L", inner: [-0.32654, 1.42165, 0.36336], outer: [-0.28842, 1.95241, 0.54903] }], [{ side: "L", inner: [-0.36288, 1.41261, 0.36966], outer: [-0.34344, 1.93663, 0.5762] }], [{ side: "L", inner: [-0.40695, 1.40244, 0.3735], outer: [-0.41333, 1.91828, 0.60044] }], [{ side: "L", inner: [-0.45505, 1.39187, 0.37331], outer: [-0.49293, 1.89832, 0.61767] }], [{ side: "L", inner: [-0.50927, 1.38028, 0.36716], outer: [-0.58626, 1.87442, 0.62703] }], [{ side: "L", inner: [-0.56519, 1.36939, 0.35462], outer: [-0.68517, 1.8523, 0.61926] }], [{ side: "L", inner: [-0.62168, 1.35656, 0.33513], outer: [-0.79061, 1.82237, 0.60367] }], [{ side: "L", inner: [-0.67803, 1.34557, 0.30733], outer: [-0.89566, 1.79783, 0.56372] }], [{ side: "L", inner: [-0.72869, 1.33177, 0.27554], outer: [-0.99672, 1.76339, 0.51945] }], [{ side: "L", inner: [-0.77657, 1.31963, 0.23597], outer: [-1.09122, 1.73361, 0.45333] }], [{ side: "L", inner: [-0.81626, 1.30608, 0.1956], outer: [-1.17328, 1.69903, 0.38472] }], [{ side: "L", inner: [-0.8503, 1.29273, 0.15198], outer: [-1.24453, 1.66466, 0.30652] }], [{ side: "L", inner: [-0.87694, 1.2803, 0.10916], outer: [-1.30067, 1.63263, 0.2273] }], [{ side: "L", inner: [-0.89656, 1.26748, 0.07003], outer: [-1.34446, 1.59895, 0.15461] }], [{ side: "L", inner: [-0.91151, 1.25679, 0.03141], outer: [-1.37664, 1.57119, 0.08072] }], [{ side: "L", inner: [-0.91976, 1.2478, 337e-5], outer: [-1.39648, 1.54737, 0.0284] }], [{ side: "L", inner: [-0.9265, 1.23967, -0.02575], outer: [-1.41189, 1.52607, -0.0271] }], [{ side: "L", inner: [-0.92755, 1.2375, -0.03851], outer: [-1.41492, 1.52032, -0.04902] }], [{ side: "L", inner: [-0.92845, 1.23541, -0.05132], outer: [-1.41751, 1.5148, -0.07112] }], [{ side: "L", inner: [-0.92851, 1.23495, -0.05606], outer: [-1.41786, 1.5136, -0.07892] }], [{ side: "L", inner: [-0.92836, 1.23495, -0.05848], outer: [-1.41765, 1.5136, -0.0826] }], [{ side: "L", inner: [-0.92838, 1.23495, -0.05586], outer: [-1.41775, 1.5136, -0.07833] }], [{ side: "L", inner: [-0.92853, 1.23495, -0.04921], outer: [-1.41807, 1.5136, -0.06769] }], [{ side: "L", inner: [-0.92861, 1.23495, -0.03961], outer: [-1.41834, 1.5136, -0.05233] }], [{ side: "L", inner: [-0.92854, 1.23495, -0.0241], outer: [-1.41842, 1.5136, -0.02752] }], [{ side: "L", inner: [-0.92828, 1.23495, -771e-5], outer: [-1.41813, 1.5136, -128e-5] }], [{ side: "L", inner: [-0.92707, 1.23495, 0.01579], outer: [-1.41653, 1.5136, 0.03635] }], [{ side: "L", inner: [-0.92565, 1.23495, 0.03928], outer: [-1.41431, 1.5136, 0.07395] }], [{ side: "L", inner: [-0.92227, 1.23495, 0.069], outer: [-1.40932, 1.5136, 0.1216] }], [{ side: "L", inner: [-0.91832, 1.23495, 0.09946], outer: [-1.40304, 1.5136, 0.17039] }], [{ side: "L", inner: [-0.91197, 1.23495, 0.13379], outer: [-1.3932, 1.5136, 0.22549] }], [{ side: "L", inner: [-0.90412, 1.23495, 0.17], outer: [-1.38067, 1.5136, 0.28354] }], [{ side: "L", inner: [-0.89396, 1.23495, 0.20825], outer: [-1.36442, 1.5136, 0.34485] }], [{ side: "L", inner: [-0.88094, 1.23495, 0.24903], outer: [-1.34359, 1.5136, 0.41012] }], [{ side: "L", inner: [-0.86619, 1.23495, 0.29042], outer: [-1.3195, 1.5136, 0.47616] }], [{ side: "L", inner: [-0.84692, 1.23495, 0.33442], outer: [-1.28862, 1.5136, 0.5463] }], [{ side: "L", inner: [-0.82687, 1.23495, 0.37805], outer: [-1.25545, 1.5136, 0.61534] }], [{ side: "L", inner: [-0.80049, 1.23495, 0.42334], outer: [-1.2132, 1.5136, 0.68727] }], [{ side: "L", inner: [-0.77325, 1.23495, 0.46808], outer: [-1.16844, 1.5136, 0.75759] }], [{ side: "L", inner: [-0.74065, 1.23495, 0.51253], outer: [-1.11578, 1.5136, 0.8276] }], [{ side: "L", inner: [-0.70589, 1.23495, 0.55634], outer: [-1.05901, 1.5136, 0.8959] }], [{ side: "L", inner: [-0.66713, 1.23495, 0.599], outer: [-0.99605, 1.5136, 0.96204] }], [{ side: "L", inner: [-0.62501, 1.23495, 0.64046], outer: [-0.92768, 1.5136, 1.02565] }], [{ side: "L", inner: [-0.58037, 1.23495, 0.68012], outer: [-0.85504, 1.5136, 1.08576] }], [{ side: "L", inner: [-0.53152, 1.23495, 0.7171], outer: [-0.77627, 1.5136, 1.14146] }], [{ side: "L", inner: [-0.48154, 1.23495, 0.75246], outer: [-0.69505, 1.5136, 1.19337] }], [{ side: "L", inner: [-0.4272, 1.23495, 0.78288], outer: [-0.60798, 1.5136, 1.23819] }], [{ side: "L", inner: [-0.37236, 1.23495, 0.81203], outer: [-0.51945, 1.5136, 1.27932] }], [{ side: "L", inner: [-0.31467, 1.23495, 0.83486], outer: [-0.4273, 1.5136, 1.31163] }], [{ side: "L", inner: [-0.25635, 1.23495, 0.85575], outer: [-0.33393, 1.5136, 1.33946] }], [{ side: "L", inner: [-0.19723, 1.23495, 0.87094], outer: [-0.23967, 1.5136, 1.35899] }], [{ side: "L", inner: [-0.13769, 1.23495, 0.88264], outer: [-0.14495, 1.5136, 1.37247] }], [{ side: "L", inner: [-0.07864, 1.23495, 0.89001], outer: [-0.05113, 1.5136, 1.37912] }], [{ side: "L", inner: [-0.02031, 1.23495, 0.89236], outer: [0.0413, 1.5136, 1.37836] }], [{ side: "L", inner: [0.03717, 1.23495, 0.89208], outer: [0.13224, 1.5136, 1.37265] }], [{ side: "L", inner: [0.09197, 1.23495, 0.88575], outer: [0.21893, 1.5136, 1.3589] }], [{ side: "L", inner: [0.14647, 1.23495, 0.87833], outer: [0.30477, 1.5136, 1.34193] }], [{ side: "L", inner: [0.19576, 1.23495, 0.86472], outer: [0.38286, 1.5136, 1.31747] }], [{ side: "L", inner: [0.24466, 1.23495, 0.8502], outer: [0.45984, 1.5136, 1.2903] }], [{ side: "L", inner: [0.28843, 1.23495, 0.83211], outer: [0.52916, 1.5136, 1.25877] }], [{ side: "L", inner: [0.33042, 1.23495, 0.81251], outer: [0.59542, 1.5136, 1.22454] }], [{ side: "L", inner: [0.36841, 1.23495, 0.79162], outer: [0.65546, 1.5136, 1.18859] }], [{ side: "L", inner: [0.40313, 1.23495, 0.76967], outer: [0.71038, 1.5136, 1.15124] }], [{ side: "L", inner: [0.43527, 1.23495, 0.7475], outer: [0.76103, 1.5136, 1.11339] }], [{ side: "L", inner: [0.46273, 1.23495, 0.72551], outer: [0.80456, 1.5136, 1.07642] }], [{ side: "L", inner: [0.48913, 1.23495, 0.70344], outer: [0.84606, 1.5136, 1.03898] }], [{ side: "L", inner: [0.50968, 1.23495, 0.68345], outer: [0.87875, 1.5136, 1.0056] }], [{ side: "L", inner: [0.52997, 1.23495, 0.66323], outer: [0.91067, 1.5136, 0.97155] }], [{ side: "L", inner: [0.54498, 1.23495, 0.64665], outer: [0.93443, 1.5136, 0.94383] }], [{ side: "L", inner: [0.5592, 1.23495, 0.63042], outer: [0.9568, 1.5136, 0.91662] }], [{ side: "L", inner: [0.56969, 1.23495, 0.6178], outer: [0.97328, 1.5136, 0.89547] }], [{ side: "L", inner: [0.57831, 1.23495, 0.60698], outer: [0.98682, 1.5136, 0.87736] }], [{ side: "L", inner: [0.58451, 1.23495, 0.59904], outer: [0.99653, 1.5136, 0.86405] }], [{ side: "L", inner: [0.58776, 1.23495, 0.59474], outer: [1.00162, 1.5136, 0.85686] }], [{ side: "L", inner: [0.58999, 1.23495, 0.59167], outer: [1.00515, 1.5136, 0.85173] }], [{ side: "L", inner: [0.5887, 1.23495, 0.59294], outer: [1.00329, 1.5136, 0.8539] }], [{ side: "L", inner: [0.5874, 1.23495, 0.59421], outer: [1.00144, 1.5136, 0.85607] }], [{ side: "L", inner: [0.58302, 1.23495, 0.59848], outer: [0.99512, 1.5136, 0.86336] }], [{ side: "L", inner: [0.57863, 1.23495, 0.60274], outer: [0.98878, 1.5136, 0.87063] }], [{ side: "L", inner: [0.57203, 1.23495, 0.60895], outer: [0.97925, 1.5136, 0.88127] }], [{ side: "L", inner: [0.56477, 1.23495, 0.6157], outer: [0.96874, 1.5136, 0.89283] }], [{ side: "L", inner: [0.55596, 1.23495, 0.62366], outer: [0.95594, 1.5136, 0.90652] }], [{ side: "L", inner: [0.54589, 1.23495, 0.63258], outer: [0.94124, 1.5136, 0.92187] }], [{ side: "L", inner: [0.53058, 1.23495, 0.64778], outer: [0.9179, 1.5136, 0.94774] }], [{ side: "L", inner: [0.50459, 1.23495, 0.67534], outer: [0.8766, 1.5136, 0.99409] }], [{ side: "L", inner: [0.47523, 1.23495, 0.70456], outer: [0.82943, 1.5136, 1.04299] }], [{ side: "L", inner: [0.42171, 1.23495, 0.74926], outer: [0.74334, 1.5136, 1.11878] }], [{ side: "L", inner: [0.36678, 1.23495, 0.79234], outer: [0.65312, 1.5136, 1.18983] }], [{ side: "L", inner: [0.28424, 1.23495, 0.83103], outer: [0.52173, 1.5136, 1.2595] }], [{ side: "L", inner: [0.19663, 1.23495, 0.8662], outer: [0.38048, 1.5136, 1.32027] }], [{ side: "L", inner: [0.09303, 1.23495, 0.88354], outer: [0.21536, 1.5136, 1.35791] }], [{ side: "L", inner: [-0.019, 1.23495, 0.8892], outer: [0.03698, 1.5136, 1.37588] }], [{ side: "L", inner: [-0.13238, 1.23495, 0.88042], outer: [-0.14455, 1.5136, 1.37016] }], [{ side: "L", inner: [-0.24664, 1.23495, 0.85457], outer: [-0.32763, 1.5136, 1.33772] }], [{ side: "L", inner: [-0.35644, 1.23495, 0.82157], outer: [-0.50364, 1.5136, 1.28882] }], [{ side: "L", inner: [-0.45214, 1.23495, 0.77656], outer: [-0.65941, 1.5136, 1.22044] }], [{ side: "L", inner: [-0.54598, 1.23495, 0.72757], outer: [-0.80972, 1.5136, 1.1404] }], [{ side: "L", inner: [-0.6136, 1.23495, 0.67557], outer: [-0.9207, 1.5136, 1.05725] }], [{ side: "L", inner: [-0.67934, 1.23495, 0.62122], outer: [-1.02614, 1.5136, 0.96722] }], [{ side: "L", inner: [-0.7235, 1.23495, 0.57448], outer: [-1.09725, 1.5136, 0.89118] }], [{ side: "L", inner: [-0.76092, 1.23495, 0.52952], outer: [-1.15688, 1.5136, 0.81797] }], [{ side: "L", inner: [-0.78381, 1.23618, 0.49737], outer: [-1.19141, 1.51687, 0.76702] }], [{ side: "L", inner: [-0.79565, 1.23831, 0.47589], outer: [-1.20757, 1.5225, 0.73511] }], [{ side: "L", inner: [-0.79903, 1.2442, 0.46114], outer: [-1.20568, 1.53791, 0.71806] }], [{ side: "L", inner: [-0.78532, 1.25859, 0.4578], outer: [-1.16716, 1.57573, 0.72474] }], [{ side: "L", inner: [-0.76867, 1.27386, 0.45352], outer: [-1.12301, 1.61588, 0.72757] }], [{ side: "L", inner: [-0.72778, 1.29219, 0.46167], outer: [-1.03184, 1.66274, 0.75811] }], [{ side: "L", inner: [-0.68637, 1.31373, 0.45961], outer: [-0.93915, 1.71903, 0.75873] }], [{ side: "L", inner: [-0.62529, 1.33067, 0.46439], outer: [-0.81621, 1.7596, 0.77617] }], [{ side: "L", inner: [-0.56275, 1.35072, 0.45741], outer: [-0.69239, 1.80901, 0.75873] }], [{ side: "L", inner: [-0.49692, 1.36819, 0.44686], outer: [-0.57035, 1.84765, 0.73386] }], [{ side: "L", inner: [-0.43152, 1.38568, 0.42941], outer: [-0.45527, 1.8847, 0.69027] }], [{ side: "L", inner: [-0.37562, 1.40207, 0.40734], outer: [-0.36334, 1.91738, 0.63525] }], [{ side: "L", inner: [-0.32732, 1.4164, 0.38556], outer: [-0.28776, 1.94256, 0.58363] }], [{ side: "L", inner: [-0.28959, 1.42902, 0.36361], outer: [-0.23453, 1.96458, 0.53031] }], [{ side: "L", inner: [-0.27172, 1.4352, 0.35278], outer: [-0.20936, 1.97417, 0.50528] }], [{ side: "L", inner: [-0.25483, 1.44136, 0.34151], outer: [-0.18704, 1.9837, 0.479] }]] }, elf_bow: { durations: { Draw: 2.3, Stow: 2.3, Swing: 2.8 }, windows: [{ side: "L", release: 0.64 }], frames: [[{ side: "L", inner: [-0.34495, 0.84453, 0.08807], outer: [-0.34495, 0.84453, 0.08807] }], [{ side: "L", inner: [-0.34419, 0.84503, 0.09234], outer: [-0.34419, 0.84503, 0.09234] }], [{ side: "L", inner: [-0.3426, 0.84626, 0.10113], outer: [-0.3426, 0.84626, 0.10113] }], [{ side: "L", inner: [-0.34022, 0.84835, 0.11431], outer: [-0.34022, 0.84835, 0.11431] }], [{ side: "L", inner: [-0.33675, 0.85225, 0.13342], outer: [-0.33675, 0.85225, 0.13342] }], [{ side: "L", inner: [-0.33249, 0.8585, 0.15664], outer: [-0.33249, 0.8585, 0.15664] }], [{ side: "L", inner: [-0.32762, 0.86696, 0.18273], outer: [-0.32762, 0.86696, 0.18273] }], [{ side: "L", inner: [-0.32204, 0.87862, 0.21193], outer: [-0.32204, 0.87862, 0.21193] }], [{ side: "L", inner: [-0.31566, 0.89502, 0.2434], outer: [-0.31566, 0.89502, 0.2434] }], [{ side: "L", inner: [-0.30876, 0.91484, 0.27557], outer: [-0.30876, 0.91484, 0.27557] }], [{ side: "L", inner: [-0.30132, 0.93818, 0.30819], outer: [-0.30132, 0.93818, 0.30819] }], [{ side: "L", inner: [-0.29286, 0.96776, 0.33958], outer: [-0.29286, 0.96776, 0.33958] }], [{ side: "L", inner: [-0.28371, 1.00056, 0.36918], outer: [-0.28371, 1.00056, 0.36918] }], [{ side: "L", inner: [-0.27386, 1.03642, 0.39677], outer: [-0.27386, 1.03642, 0.39677] }], [{ side: "L", inner: [-0.26283, 1.0761, 0.42032], outer: [-0.26283, 1.0761, 0.42032] }], [{ side: "L", inner: [-0.25072, 1.11773, 0.43972], outer: [-0.25072, 1.11773, 0.43972] }], [{ side: "L", inner: [-0.23776, 1.16035, 0.45565], outer: [-0.23776, 1.16035, 0.45565] }], [{ side: "L", inner: [-0.22372, 1.20348, 0.4671], outer: [-0.22372, 1.20348, 0.4671] }], [{ side: "L", inner: [-0.20859, 1.24548, 0.47333], outer: [-0.20859, 1.24548, 0.47333] }], [{ side: "L", inner: [-0.19291, 1.28593, 0.47641], outer: [-0.19291, 1.28593, 0.47641] }], [{ side: "L", inner: [-0.17677, 1.32458, 0.47647], outer: [-0.17677, 1.32458, 0.47647] }], [{ side: "L", inner: [-0.16049, 1.35862, 0.47246], outer: [-0.16049, 1.35862, 0.47246] }], [{ side: "L", inner: [-0.14463, 1.38948, 0.46699], outer: [-0.14463, 1.38948, 0.46699] }], [{ side: "L", inner: [-0.12933, 1.41711, 0.46028], outer: [-0.12933, 1.41711, 0.46028] }], [{ side: "L", inner: [-0.11548, 1.43957, 0.45276], outer: [-0.11548, 1.43957, 0.45276] }], [{ side: "L", inner: [-0.10354, 1.45765, 0.44562], outer: [-0.10354, 1.45765, 0.44562] }], [{ side: "L", inner: [-0.09338, 1.47224, 0.43916], outer: [-0.09338, 1.47224, 0.43916] }], [{ side: "L", inner: [-0.08578, 1.48249, 0.43403], outer: [-0.08578, 1.48249, 0.43403] }], [{ side: "L", inner: [-0.08194, 1.48751, 0.43136], outer: [-0.08194, 1.48751, 0.43136] }], [{ side: "L", inner: [-0.08007, 1.48992, 0.43005], outer: [-0.08007, 1.48992, 0.43005] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08, 1.49, 0.43], outer: [-0.08, 1.49, 0.43] }], [{ side: "L", inner: [-0.08064, 1.48918, 0.43045], outer: [-0.08064, 1.48918, 0.43045] }], [{ side: "L", inner: [-0.08213, 1.48728, 0.43151], outer: [-0.08213, 1.48728, 0.43151] }], [{ side: "L", inner: [-0.08752, 1.48019, 0.43522], outer: [-0.08752, 1.48019, 0.43522] }], [{ side: "L", inner: [-0.09485, 1.47014, 0.44009], outer: [-0.09485, 1.47014, 0.44009] }], [{ side: "L", inner: [-0.104, 1.45714, 0.44599], outer: [-0.104, 1.45714, 0.44599] }], [{ side: "L", inner: [-0.11548, 1.43968, 0.45281], outer: [-0.11548, 1.43968, 0.45281] }], [{ side: "L", inner: [-0.12835, 1.41848, 0.45963], outer: [-0.12835, 1.41848, 0.45963] }], [{ side: "L", inner: [-0.14212, 1.39435, 0.46609], outer: [-0.14212, 1.39435, 0.46609] }], [{ side: "L", inner: [-0.15675, 1.36661, 0.47167], outer: [-0.15675, 1.36661, 0.47167] }], [{ side: "L", inner: [-0.17175, 1.33494, 0.47512], outer: [-0.17175, 1.33494, 0.47512] }], [{ side: "L", inner: [-0.18672, 1.301, 0.47664], outer: [-0.18672, 1.301, 0.47664] }], [{ side: "L", inner: [-0.20157, 1.26491, 0.47609], outer: [-0.20157, 1.26491, 0.47609] }], [{ side: "L", inner: [-0.21567, 1.22622, 0.47094], outer: [-0.21567, 1.22622, 0.47094] }], [{ side: "L", inner: [-0.22915, 1.18689, 0.46283], outer: [-0.22915, 1.18689, 0.46283] }], [{ side: "L", inner: [-0.24198, 1.14714, 0.45172], outer: [-0.24198, 1.14714, 0.45172] }], [{ side: "L", inner: [-0.25371, 1.10781, 0.436], outer: [-0.25371, 1.10781, 0.436] }], [{ side: "L", inner: [-0.26452, 1.06996, 0.41668], outer: [-0.26452, 1.06996, 0.41668] }], [{ side: "L", inner: [-0.27462, 1.0337, 0.39468], outer: [-0.27462, 1.0337, 0.39468] }], [{ side: "L", inner: [-0.28386, 0.99994, 0.36963], outer: [-0.28386, 0.99994, 0.36963] }], [{ side: "L", inner: [-0.29218, 0.97009, 0.3419], outer: [-0.29218, 0.97009, 0.3419] }], [{ side: "L", inner: [-0.29996, 0.94311, 0.313], outer: [-0.29996, 0.94311, 0.313] }], [{ side: "L", inner: [-0.30721, 0.91911, 0.28314], outer: [-0.30721, 0.91911, 0.28314] }], [{ side: "L", inner: [-0.31364, 0.90045, 0.25314], outer: [-0.31364, 0.90045, 0.25314] }], [{ side: "L", inner: [-0.31963, 0.88468, 0.22396], outer: [-0.31963, 0.88468, 0.22396] }], [{ side: "L", inner: [-0.32516, 0.8717, 0.19579], outer: [-0.32516, 0.8717, 0.19579] }], [{ side: "L", inner: [-0.33, 0.86249, 0.17006], outer: [-0.33, 0.86249, 0.17006] }], [{ side: "L", inner: [-0.33422, 0.8558, 0.14725], outer: [-0.33422, 0.8558, 0.14725] }], [{ side: "L", inner: [-0.33791, 0.85083, 0.12708], outer: [-0.33791, 0.85083, 0.12708] }], [{ side: "L", inner: [-0.3409, 0.84768, 0.11058], outer: [-0.3409, 0.84768, 0.11058] }], [{ side: "L", inner: [-0.34294, 0.84597, 0.09926], outer: [-0.34294, 0.84597, 0.09926] }], [{ side: "L", inner: [-0.3443, 0.84495, 0.09172], outer: [-0.3443, 0.84495, 0.09172] }], [{ side: "L", inner: [-0.34495, 0.84453, 0.08807], outer: [-0.34495, 0.84453, 0.08807] }]] }, wooden_club: { durations: { Draw: 2.8, Stow: 2.8, Swing: 2.3 }, windows: [{ side: null, start: 0.32, end: 0.72 }], frames: [[{ side: "R", inner: [-0.46342, 0.88942, 0.78005], outer: [-0.76433, 0.8297, 1.09902] }], [{ side: "R", inner: [-0.4634, 0.88508, 0.77659], outer: [-0.76451, 0.82105, 1.09452] }], [{ side: "R", inner: [-0.46332, 0.87868, 0.77131], outer: [-0.76469, 0.80824, 1.08763] }], [{ side: "R", inner: [-0.46298, 0.86652, 0.76069], outer: [-0.76476, 0.7838, 1.07364] }], [{ side: "R", inner: [-0.46218, 0.85108, 0.74601], outer: [-0.76427, 0.75245, 1.05401] }], [{ side: "R", inner: [-0.46065, 0.83305, 0.72697], outer: [-0.76278, 0.71535, 1.02815] }], [{ side: "R", inner: [-0.45788, 0.8116, 0.70119], outer: [-0.75955, 0.6704, 0.99258] }], [{ side: "R", inner: [-0.45391, 0.79037, 0.67155], outer: [-0.75445, 0.62479, 0.95103] }], [{ side: "R", inner: [-0.44775, 0.76726, 0.63303], outer: [-0.74605, 0.57338, 0.89623] }], [{ side: "R", inner: [-0.43975, 0.74625, 0.58971], outer: [-0.73472, 0.5242, 0.8337] }], [{ side: "R", inner: [-0.42918, 0.72718, 0.53872], outer: [-0.71932, 0.47605, 0.75917] }], [{ side: "R", inner: [-0.41603, 0.71197, 0.48126], outer: [-0.69976, 0.43243, 0.67415] }], [{ side: "R", inner: [-0.40034, 0.70199, 0.41809], outer: [-0.67601, 0.3958, 0.57966] }], [{ side: "R", inner: [-0.38162, 0.6984, 0.34797], outer: [-0.64728, 0.36753, 0.47367] }], [{ side: "R", inner: [-0.3607, 0.70253, 0.2744], outer: [-0.61478, 0.35079, 0.36141] }], [{ side: "R", inner: [-0.33699, 0.71561, 0.19567], outer: [-0.57755, 0.34683, 0.24015] }], [{ side: "R", inner: [-0.31155, 0.73814, 0.11546], outer: [-0.53719, 0.35744, 0.11553] }], [{ side: "R", inner: [-0.28443, 0.77091, 0.03399], outer: [-0.49374, 0.38373, -0.01217] }], [{ side: "R", inner: [-0.2563, 0.81392, -0.04666], outer: [-0.44825, 0.42617, -0.13968] }], [{ side: "R", inner: [-0.22773, 0.86704, -0.125], outer: [-0.40158, 0.48478, -0.26464] }], [{ side: "R", inner: [-0.19932, 0.92966, -0.19943], outer: [-0.35472, 0.5589, -0.38447] }], [{ side: "R", inner: [-0.17162, 1.00107, -0.26873], outer: [-0.30853, 0.64763, -0.49716] }], [{ side: "R", inner: [-0.14538, 1.07959, -0.33125], outer: [-0.26425, 0.74867, -0.59996] }], [{ side: "R", inner: [-0.12091, 1.16424, -0.38649], outer: [-0.22243, 0.86054, -0.69195] }], [{ side: "R", inner: [-0.09871, 1.25328, -0.43366], outer: [-0.18388, 0.98068, -0.77172] }], [{ side: "R", inner: [-0.07921, 1.34427, -0.47217], outer: [-0.14943, 1.10552, -0.83812] }], [{ side: "R", inner: [-0.06223, 1.43748, -0.50278], outer: [-0.11875, 1.23514, -0.89228] }], [{ side: "R", inner: [-0.0485, 1.52729, -0.52465], outer: [-0.09326, 1.36143, -0.93249] }], [{ side: "R", inner: [-0.03724, 1.61685, -0.53953], outer: [-0.07161, 1.48852, -0.96167] }], [{ side: "R", inner: [-0.0289, 1.70011, -0.54748], outer: [-0.05475, 1.60758, -0.97948] }], [{ side: "R", inner: [-0.02285, 1.77909, -0.54993], outer: [-0.04165, 1.72124, -0.98827] }], [{ side: "R", inner: [-0.0189, 1.85188, -0.54783], outer: [-0.03208, 1.82656, -0.98946] }], [{ side: "R", inner: [-0.01674, 1.91555, -0.54257], outer: [-0.02572, 1.91906, -0.98501] }], [{ side: "R", inner: [-0.01586, 1.97488, -0.53474], outer: [-0.02152, 2.00557, -0.97618] }], [{ side: "R", inner: [-0.01594, 2.02009, -0.52684], outer: [-0.01949, 2.07169, -0.96635] }], [{ side: "R", inner: [-0.01658, 2.0608, -0.51826], outer: [-0.01856, 2.13134, -0.95514] }], [{ side: "R", inner: [-0.01736, 2.08891, -0.5115], outer: [-0.01842, 2.1726, -0.94606] }], [{ side: "R", inner: [-0.01807, 2.10857, -0.50636], outer: [-0.01858, 2.2015, -0.93904] }], [{ side: "R", inner: [-0.01851, 2.11921, -0.50344], outer: [-0.01875, 2.21714, -0.93501] }], [{ side: "R", inner: [-0.01863, 2.12202, -0.50265], outer: [-0.01881, 2.22128, -0.93392] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12209, -0.50263], outer: [-0.01881, 2.22137, -0.9339] }], [{ side: "R", inner: [-0.01863, 2.12219, -0.50256], outer: [-0.01881, 2.22156, -0.93381] }], [{ side: "R", inner: [-0.01863, 2.12465, -0.50099], outer: [-0.01881, 2.22605, -0.93176] }], [{ side: "R", inner: [-0.01863, 2.13424, -0.49466], outer: [-0.01881, 2.24359, -0.92349] }], [{ side: "R", inner: [-0.01863, 2.15959, -0.47642], outer: [-0.01881, 2.29025, -0.89923] }], [{ side: "R", inner: [-0.01863, 2.19676, -0.44523], outer: [-0.01881, 2.35946, -0.85678] }], [{ side: "R", inner: [-0.01863, 2.24046, -0.40038], outer: [-0.01881, 2.44238, -0.79418] }], [{ side: "R", inner: [-0.01863, 2.29152, -0.33254], outer: [-0.01881, 2.54234, -0.69714] }], [{ side: "R", inner: [-0.01863, 2.3364, -0.25028], outer: [-0.01881, 2.63498, -0.57693] }], [{ side: "R", inner: [-0.01863, 2.37493, -0.14135], outer: [-0.01881, 2.72294, -0.41473] }], [{ side: "R", inner: [-0.01863, 2.39602, -0.0181], outer: [-0.01881, 2.78553, -0.22818] }], [{ side: "R", inner: [-0.01863, 2.39543, 0.12162], outer: [-0.01881, 2.81681, -0.01358] }], [{ side: "R", inner: [-0.01863, 2.36841, 0.26936], outer: [-0.01881, 2.80778, 0.21644] }], [{ side: "R", inner: [-0.01863, 2.31296, 0.41832], outer: [-0.01881, 2.75427, 0.45142] }], [{ side: "R", inner: [-0.01863, 2.22967, 0.56074], outer: [-0.01881, 2.65608, 0.67914] }], [{ side: "R", inner: [-0.01863, 2.12129, 0.68993], outer: [-0.01881, 2.51664, 0.88878] }], [{ side: "R", inner: [-0.01863, 1.99531, 0.79829], outer: [-0.01881, 2.34642, 1.06767] }], [{ side: "R", inner: [-0.01863, 1.85709, 0.88415], outer: [-0.01881, 2.15372, 1.21257] }], [{ side: "R", inner: [-0.01863, 1.71496, 0.94589], outer: [-0.01881, 1.95119, 1.32011] }], [{ side: "R", inner: [-0.01863, 1.58001, 0.98408], outer: [-0.01881, 1.75586, 1.39019] }], [{ side: "R", inner: [-0.01863, 1.44943, 1.00418], outer: [-0.01881, 1.56458, 1.43148] }], [{ side: "R", inner: [-0.01863, 1.34686, 1.00895], outer: [-0.01881, 1.41302, 1.44652] }], [{ side: "R", inner: [-0.01863, 1.25438, 1.00505], outer: [-0.01881, 1.27547, 1.44709] }], [{ side: "R", inner: [-0.01863, 1.19561, 0.99846], outer: [-0.01881, 1.18764, 1.44094] }], [{ side: "R", inner: [-0.01863, 1.15671, 0.99227], outer: [-0.01881, 1.12938, 1.43398] }], [{ side: "R", inner: [-0.01863, 1.14304, 0.9897], outer: [-0.01881, 1.10893, 1.43093] }], [{ side: "R", inner: [-0.01863, 1.12943, 0.98619], outer: [-0.01881, 1.08927, 1.42691] }], [{ side: "R", inner: [-0.01863, 1.11586, 0.98222], outer: [-0.01881, 1.06998, 1.42238] }], [{ side: "R", inner: [-0.01863, 1.0894, 0.97409], outer: [-0.01881, 1.03235, 1.41294] }], [{ side: "R", inner: [-0.01863, 1.06051, 0.96464], outer: [-0.01881, 0.99121, 1.40172] }], [{ side: "R", inner: [-0.01863, 1.02466, 0.95204], outer: [-0.01881, 0.94014, 1.38644] }], [{ side: "R", inner: [-0.01863, 0.98681, 0.93768], outer: [-0.01881, 0.88616, 1.36863] }], [{ side: "R", inner: [-0.01863, 0.94684, 0.9213], outer: [-0.01881, 0.82912, 1.3479] }], [{ side: "R", inner: [-0.01863, 0.90681, 0.90358], outer: [-0.01881, 0.77196, 1.32509] }], [{ side: "R", inner: [-0.01863, 0.86717, 0.88471], outer: [-0.01881, 0.71532, 1.30039] }], [{ side: "R", inner: [-0.01863, 0.83129, 0.86642], outer: [-0.01881, 0.66404, 1.27614] }], [{ side: "R", inner: [-0.01863, 0.79778, 0.84827], outer: [-0.01881, 0.61613, 1.25181] }], [{ side: "R", inner: [-0.01863, 0.76983, 0.8323], outer: [-0.01881, 0.57617, 1.23022] }], [{ side: "R", inner: [-0.01863, 0.74773, 0.81913], outer: [-0.01881, 0.54456, 1.21228] }], [{ side: "R", inner: [-0.01863, 0.73084, 0.80871], outer: [-0.01881, 0.52042, 1.19804] }], [{ side: "R", inner: [-0.01881, 0.72438, 0.8047], outer: [-0.01911, 0.51121, 1.19253] }], [{ side: "R", inner: [-0.01919, 0.72098, 0.80265], outer: [-0.01974, 0.5064, 1.1897] }], [{ side: "R", inner: [-0.02274, 0.72155, 0.80396], outer: [-0.02571, 0.50771, 1.19141] }], [{ side: "R", inner: [-0.0275, 0.72232, 0.80569], outer: [-0.03369, 0.50949, 1.19364] }], [{ side: "R", inner: [-0.03499, 0.72359, 0.80832], outer: [-0.04627, 0.51236, 1.19704] }], [{ side: "R", inner: [-0.04444, 0.72526, 0.81151], outer: [-0.06213, 0.5161, 1.20111] }], [{ side: "R", inner: [-0.05539, 0.7273, 0.81502], outer: [-0.08052, 0.5206, 1.20551] }], [{ side: "R", inner: [-0.06881, 0.72995, 0.81903], outer: [-0.10303, 0.52634, 1.21046] }], [{ side: "R", inner: [-0.08296, 0.73291, 0.82293], outer: [-0.12676, 0.53267, 1.21515] }], [{ side: "R", inner: [-0.09938, 0.73658, 0.82704], outer: [-0.15429, 0.54038, 1.2199] }], [{ side: "R", inner: [-0.11646, 0.74065, 0.83082], outer: [-0.18291, 0.54882, 1.22405] }], [{ side: "R", inner: [-0.1348, 0.74532, 0.83433], outer: [-0.21364, 0.55835, 1.22761] }], [{ side: "R", inner: [-0.15399, 0.75053, 0.83737], outer: [-0.24579, 0.56885, 1.23033] }], [{ side: "R", inner: [-0.17367, 0.75621, 0.83983], outer: [-0.27874, 0.58018, 1.23203] }], [{ side: "R", inner: [-0.19412, 0.76251, 0.84166], outer: [-0.31298, 0.59259, 1.23261] }], [{ side: "R", inner: [-0.21459, 0.7692, 0.84272], outer: [-0.34725, 0.60565, 1.23195] }], [{ side: "R", inner: [-0.23536, 0.77641, 0.84301], outer: [-0.38202, 0.61959, 1.22998] }], [{ side: "R", inner: [-0.25592, 0.78397, 0.84248], outer: [-0.41643, 0.63408, 1.22669] }], [{ side: "R", inner: [-0.27628, 0.79188, 0.84112], outer: [-0.45049, 0.64915, 1.22207] }], [{ side: "R", inner: [-0.29611, 0.80002, 0.83897], outer: [-0.4837, 0.66454, 1.2162] }], [{ side: "R", inner: [-0.31551, 0.8084, 0.83604], outer: [-0.51617, 0.68031, 1.2091] }], [{ side: "R", inner: [-0.3339, 0.81676, 0.83246], outer: [-0.54697, 0.69595, 1.20105] }], [{ side: "R", inner: [-0.35168, 0.82523, 0.82823], outer: [-0.57674, 0.71173, 1.19197] }], [{ side: "R", inner: [-0.3682, 0.83348, 0.82356], outer: [-0.60443, 0.72704, 1.18233] }], [{ side: "R", inner: [-0.38375, 0.84159, 0.81849], outer: [-0.63049, 0.74203, 1.17212] }], [{ side: "R", inner: [-0.39816, 0.84942, 0.81316], outer: [-0.65466, 0.75648, 1.1616] }], [{ side: "R", inner: [-0.41104, 0.85671, 0.80784], outer: [-0.67628, 0.76988, 1.15128] }], [{ side: "R", inner: [-0.42313, 0.86379, 0.80235], outer: [-0.69657, 0.78288, 1.14077] }], [{ side: "R", inner: [-0.43303, 0.8698, 0.79746], outer: [-0.71322, 0.79387, 1.1315] }], [{ side: "R", inner: [-0.44216, 0.87549, 0.79264], outer: [-0.72855, 0.80428, 1.12242] }], [{ side: "R", inner: [-0.44933, 0.88009, 0.7886], outer: [-0.74062, 0.81267, 1.11488] }], [{ side: "R", inner: [-0.45517, 0.8839, 0.78517], outer: [-0.75044, 0.81964, 1.10848] }], [{ side: "R", inner: [-0.4596, 0.88685, 0.78246], outer: [-0.7579, 0.82501, 1.10346] }], [{ side: "R", inner: [-0.46189, 0.88839, 0.78103], outer: [-0.76175, 0.82781, 1.10081] }], [{ side: "R", inner: [-0.46342, 0.88942, 0.78005], outer: [-0.76433, 0.8297, 1.09902] }]] }, snake_wings: { durations: { Draw: 0, Stow: 0, Swing: 1.8 }, windows: [{ side: "R", start: 0.18, end: 0.36 }, { side: "L", start: 0.36, end: 0.53 }], frames: [[{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }], [{ side: "R", inner: [0.38201, 0.84404, 267e-5], outer: [0.39117, 0.83029, 0.09609] }, { side: "L", inner: [-0.38071, 0.85804, 0.09157], outer: [-0.39247, 0.81629, 719e-5] }], [{ side: "R", inner: [0.3883, 0.84649, 0.01363], outer: [0.3965, 0.83538, 0.10748] }, { side: "L", inner: [-0.38567, 0.86284, 0.10209], outer: [-0.39913, 0.81904, 0.01902] }], [{ side: "R", inner: [0.40154, 0.85485, 0.03876], outer: [0.40721, 0.84985, 0.13333] }, { side: "L", inner: [-0.39561, 0.8765, 0.12592], outer: [-0.41315, 0.8282, 0.04617] }], [{ side: "R", inner: [0.41662, 0.86539, 0.06812], outer: [0.41906, 0.86738, 0.16294] }, { side: "L", inner: [-0.40666, 0.89292, 0.15323], outer: [-0.42903, 0.83986, 0.07783] }], [{ side: "R", inner: [0.43238, 0.88341, 0.1037], outer: [0.43016, 0.8939, 0.19796] }, { side: "L", inner: [-0.41696, 0.91775, 0.18545], outer: [-0.44558, 0.85955, 0.11622] }], [{ side: "R", inner: [0.44837, 0.90802, 0.14433], outer: [0.44012, 0.92788, 0.23672] }, { side: "L", inner: [-0.42628, 0.94944, 0.22111], outer: [-0.46221, 0.88646, 0.15994] }], [{ side: "R", inner: [0.46157, 0.93837, 0.18539], outer: [0.44624, 0.96742, 0.27439] }, { side: "L", inner: [-0.43209, 0.98617, 0.25572], outer: [-0.47572, 0.91963, 0.20405] }], [{ side: "R", inner: [0.46944, 0.97933, 0.22707], outer: [0.44541, 1.0174, 0.31058] }, { side: "L", inner: [-0.43142, 1.03262, 0.28884], outer: [-0.48343, 0.96411, 0.24881] }], [{ side: "R", inner: [0.47486, 1.02269, 0.26741], outer: [0.44183, 1.06838, 0.34371] }, { side: "L", inner: [-0.42849, 1.07972, 0.31935], outer: [-0.48819, 1.01135, 0.29176] }], [{ side: "R", inner: [0.46831, 1.07472, 0.29922], outer: [0.42529, 1.12633, 0.3662] }, { side: "L", inner: [-0.4133, 1.13338, 0.33962], outer: [-0.48031, 1.06766, 0.3258] }], [{ side: "R", inner: [0.46027, 1.12806, 0.33004], outer: [0.40767, 1.18349, 0.38626] }, { side: "L", inner: [-0.39754, 1.18616, 0.35815], outer: [-0.47039, 1.12539, 0.35815] }], [{ side: "R", inner: [0.44079, 1.18035, 0.34666], outer: [0.37909, 1.23707, 0.39111] }, { side: "L", inner: [-0.37141, 1.23553, 0.36216], outer: [-0.44848, 1.18188, 0.37562] }], [{ side: "R", inner: [0.41859, 1.23306, 0.36024], outer: [0.3488, 1.28883, 0.39217] }, { side: "L", inner: [-0.34396, 1.28328, 0.36308], outer: [-0.42343, 1.23861, 0.38932] }], [{ side: "R", inner: [0.39201, 1.27834, 0.36332], outer: [0.31569, 1.3311, 0.38312] }, { side: "L", inner: [-0.31388, 1.32215, 0.35455], outer: [-0.39382, 1.2873, 0.3919] }], [{ side: "R", inner: [0.36282, 1.31977, 0.36051], outer: [0.28142, 1.36783, 0.36851] }, { side: "L", inner: [-0.28277, 1.35596, 0.34099], outer: [-0.36148, 1.33164, 0.38803] }], [{ side: "R", inner: [0.33446, 1.35422, 0.35336], outer: [0.24963, 1.39662, 0.35076] }, { side: "L", inner: [-0.25397, 1.38247, 0.32466], outer: [-0.33012, 1.36837, 0.37945] }], [{ side: "R", inner: [0.3077, 1.37991, 0.34151], outer: [0.22088, 1.41633, 0.32987] }, { side: "L", inner: [-0.22791, 1.40055, 0.30535], outer: [-0.30067, 1.39569, 0.36603] }], [{ side: "R", inner: [0.28279, 1.4023, 0.3292], outer: [0.19503, 1.43255, 0.30962] }, { side: "L", inner: [-0.20452, 1.41555, 0.2868], outer: [-0.2733, 1.41931, 0.35202] }], [{ side: "R", inner: [0.26567, 1.41419, 0.31799], outer: [0.17777, 1.43989, 0.29322] }, { side: "L", inner: [-0.18892, 1.42225, 0.27167], outer: [-0.25451, 1.43183, 0.33954] }], [{ side: "R", inner: [0.24843, 1.42587, 0.30642], outer: [0.1608, 1.44679, 0.27669] }, { side: "L", inner: [-0.17359, 1.42864, 0.25651], outer: [-0.23565, 1.44402, 0.3266] }], [{ side: "R", inner: [0.24444, 1.42813, 0.30372], outer: [0.15693, 1.44788, 0.27287] }, { side: "L", inner: [-0.17012, 1.42966, 0.2527], outer: [-0.2313, 1.44638, 0.32325] }], [{ side: "R", inner: [0.24044, 1.43037, 0.301], outer: [0.15307, 1.44896, 0.26905] }, { side: "L", inner: [-0.16667, 1.43067, 0.24889], outer: [-0.22695, 1.44872, 0.31989] }], [{ side: "R", inner: [0.23922, 1.43066, 0.30486], outer: [0.15177, 1.44889, 0.27291] }, { side: "L", inner: [-0.16591, 1.43088, 0.24807], outer: [-0.226, 1.44923, 0.31914] }], [{ side: "R", inner: [0.23879, 1.4304, 0.31061], outer: [0.15121, 1.44851, 0.27896] }, { side: "L", inner: [-0.16591, 1.43087, 0.24809], outer: [-0.22602, 1.44922, 0.31915] }], [{ side: "R", inner: [0.23821, 1.42997, 0.31972], outer: [0.15037, 1.44786, 0.28868] }, { side: "L", inner: [-0.1659, 1.43086, 0.24812], outer: [-0.22604, 1.44919, 0.31917] }], [{ side: "R", inner: [0.23751, 1.4294, 0.3315], outer: [0.14931, 1.44701, 0.30132] }, { side: "L", inner: [-0.1659, 1.43084, 0.24817], outer: [-0.22608, 1.44917, 0.31919] }], [{ side: "R", inner: [0.23683, 1.42872, 0.34476], outer: [0.14819, 1.446, 0.31571] }, { side: "L", inner: [-0.1659, 1.43082, 0.24823], outer: [-0.22612, 1.44914, 0.31921] }], [{ side: "R", inner: [0.2362, 1.42783, 0.361], outer: [0.14695, 1.44467, 0.3336] }, { side: "L", inner: [-0.1659, 1.4308, 0.24829], outer: [-0.22617, 1.4491, 0.31924] }], [{ side: "R", inner: [0.2356, 1.42691, 0.37754], outer: [0.14575, 1.44327, 0.35187] }, { side: "L", inner: [-0.1659, 1.43077, 0.24836], outer: [-0.22622, 1.44906, 0.31926] }], [{ side: "R", inner: [0.23525, 1.42567, 0.39664], outer: [0.14462, 1.44145, 0.37346] }, { side: "L", inner: [-0.1659, 1.43074, 0.24844], outer: [-0.22628, 1.44902, 0.31929] }], [{ side: "R", inner: [0.23491, 1.42445, 0.41568], outer: [0.14357, 1.43958, 0.39499] }, { side: "L", inner: [-0.1659, 1.43071, 0.24852], outer: [-0.22634, 1.44897, 0.31933] }], [{ side: "R", inner: [0.23492, 1.42287, 0.43582], outer: [0.1428, 1.43728, 0.41829] }, { side: "L", inner: [-0.1659, 1.43068, 0.24861], outer: [-0.22641, 1.44892, 0.31936] }], [{ side: "R", inner: [0.23499, 1.42127, 0.45601], outer: [0.14219, 1.43484, 0.44173] }, { side: "L", inner: [-0.1659, 1.43065, 0.2487], outer: [-0.22648, 1.44888, 0.31939] }], [{ side: "R", inner: [0.23538, 1.41939, 0.47583], outer: [0.14196, 1.43207, 0.46521] }, { side: "L", inner: [-0.1659, 1.43062, 0.24878], outer: [-0.22655, 1.44883, 0.31943] }], [{ side: "R", inner: [0.23594, 1.41739, 0.49538], outer: [0.14203, 1.42905, 0.4886] }, { side: "L", inner: [-0.1659, 1.43058, 0.24887], outer: [-0.22661, 1.44878, 0.31946] }], [{ side: "R", inner: [0.23675, 1.4152, 0.5138], outer: [0.14251, 1.42578, 0.51106] }, { side: "L", inner: [-0.16591, 1.43055, 0.24895], outer: [-0.22668, 1.44874, 0.31949] }], [{ side: "R", inner: [0.23787, 1.41278, 0.53081], outer: [0.14348, 1.42218, 0.53234] }, { side: "L", inner: [-0.16591, 1.43053, 0.24903], outer: [-0.22674, 1.44869, 0.31952] }], [{ side: "R", inner: [0.23914, 1.41029, 0.54671], outer: [0.1448, 1.41839, 0.55254] }, { side: "L", inner: [-0.16588, 1.43048, 0.24943], outer: [-0.22678, 1.44863, 0.31987] }], [{ side: "R", inner: [0.24089, 1.40747, 0.55914], outer: [0.14683, 1.41425, 0.5695] }, { side: "L", inner: [-0.16573, 1.4304, 0.25096], outer: [-0.22671, 1.4485, 0.32134] }], [{ side: "R", inner: [0.24263, 1.40471, 0.57132], outer: [0.14908, 1.40997, 0.58612] }, { side: "L", inner: [-0.16559, 1.43031, 0.25248], outer: [-0.22664, 1.44836, 0.32281] }], [{ side: "R", inner: [0.24502, 1.40162, 0.57702], outer: [0.15223, 1.40549, 0.59637] }, { side: "L", inner: [-0.16496, 1.42999, 0.25893], outer: [-0.22622, 1.44789, 0.32913] }], [{ side: "R", inner: [0.24736, 1.39861, 0.58242], outer: [0.15555, 1.40088, 0.60621] }, { side: "L", inner: [-0.16434, 1.42968, 0.26538], outer: [-0.2258, 1.44742, 0.33544] }], [{ side: "R", inner: [0.24848, 1.39726, 0.58345], outer: [0.15718, 1.39881, 0.60919] }, { side: "L", inner: [-0.16344, 1.4292, 0.27518], outer: [-0.22527, 1.4467, 0.34497] }], [{ side: "R", inner: [0.24926, 1.39637, 0.58326], outer: [0.15832, 1.39747, 0.61024] }, { side: "L", inner: [-0.16246, 1.42867, 0.28594], outer: [-0.22471, 1.4459, 0.35542] }], [{ side: "R", inner: [0.24941, 1.39622, 0.58281], outer: [0.15852, 1.39724, 0.61] }, { side: "L", inner: [-0.16136, 1.42801, 0.29864], outer: [-0.22423, 1.44491, 0.36765] }], [{ side: "R", inner: [0.24905, 1.39666, 0.58216], outer: [0.15798, 1.3979, 0.60874] }, { side: "L", inner: [-0.16017, 1.42725, 0.31289], outer: [-0.2238, 1.44377, 0.3813] }], [{ side: "R", inner: [0.24835, 1.39751, 0.58095], outer: [0.15695, 1.3992, 0.60632] }, { side: "L", inner: [-0.15898, 1.42641, 0.32801], outer: [-0.22347, 1.4425, 0.3957] }], [{ side: "R", inner: [0.24697, 1.39922, 0.57859], outer: [0.15495, 1.40178, 0.60153] }, { side: "L", inner: [-0.15776, 1.42541, 0.34487], outer: [-0.22334, 1.441, 0.41162] }], [{ side: "R", inner: [0.24558, 1.40094, 0.57588], outer: [0.15301, 1.40433, 0.59634] }, { side: "L", inner: [-0.15657, 1.42437, 0.3619], outer: [-0.22328, 1.43946, 0.42765] }], [{ side: "R", inner: [0.24431, 1.40266, 0.57102], outer: [0.15124, 1.40695, 0.58891] }, { side: "L", inner: [-0.15546, 1.42314, 0.3804], outer: [-0.22356, 1.43757, 0.44486] }], [{ side: "R", inner: [0.24303, 1.40441, 0.56607], outer: [0.14954, 1.40954, 0.58134] }, { side: "L", inner: [-0.15441, 1.42186, 0.39886], outer: [-0.22387, 1.43568, 0.46199] }], [{ side: "R", inner: [0.24195, 1.40605, 0.55932], outer: [0.14813, 1.41202, 0.57203] }, { side: "L", inner: [-0.15355, 1.42038, 0.41787], outer: [-0.22459, 1.43342, 0.47938] }], [{ side: "R", inner: [0.24089, 1.40769, 0.55226], outer: [0.1468, 1.41446, 0.56241] }, { side: "L", inner: [-0.15279, 1.41883, 0.43689], outer: [-0.22539, 1.43112, 0.49671] }], [{ side: "R", inner: [0.23997, 1.40923, 0.54414], outer: [0.14571, 1.41679, 0.55178] }, { side: "L", inner: [-0.15227, 1.41712, 0.45556], outer: [-0.22655, 1.42853, 0.51346] }], [{ side: "R", inner: [0.23912, 1.41074, 0.53545], outer: [0.14476, 1.41904, 0.5406] }, { side: "L", inner: [-0.15193, 1.41529, 0.47399], outer: [-0.2279, 1.42579, 0.52983] }], [{ side: "R", inner: [0.23836, 1.41219, 0.52621], outer: [0.14396, 1.42121, 0.52891] }, { side: "L", inner: [-0.15183, 1.41334, 0.49162], outer: [-0.22951, 1.42286, 0.54524] }], [{ side: "R", inner: [0.23772, 1.41356, 0.51632], outer: [0.14336, 1.42328, 0.51662] }, { side: "L", inner: [-0.15203, 1.41124, 0.50824], outer: [-0.23145, 1.41968, 0.55943] }], [{ side: "R", inner: [0.23713, 1.41491, 0.5062], outer: [0.14285, 1.42528, 0.50414] }, { side: "L", inner: [-0.15243, 1.40904, 0.5241], outer: [-0.23355, 1.41642, 0.57273] }], [{ side: "R", inner: [0.23669, 1.41614, 0.4955], outer: [0.14256, 1.42715, 0.49119] }, { side: "L", inner: [-0.15326, 1.40668, 0.53762], outer: [-0.2361, 1.41282, 0.58345] }], [{ side: "R", inner: [0.23625, 1.41739, 0.48475], outer: [0.14232, 1.42899, 0.47816] }, { side: "L", inner: [-0.15422, 1.40424, 0.55097], outer: [-0.23867, 1.40926, 0.59389] }], [{ side: "R", inner: [0.23598, 1.4185, 0.47361], outer: [0.1423, 1.43068, 0.46492] }, { side: "L", inner: [-0.15574, 1.40172, 0.56003], outer: [-0.2418, 1.40537, 0.5998] }], [{ side: "R", inner: [0.23573, 1.41962, 0.46243], outer: [0.14234, 1.43234, 0.45163] }, { side: "L", inner: [-0.15738, 1.39911, 0.5689], outer: [-0.24491, 1.40153, 0.6054] }], [{ side: "R", inner: [0.23559, 1.42063, 0.45119], outer: [0.14252, 1.43387, 0.4384] }, { side: "L", inner: [-0.15844, 1.39764, 0.57283], outer: [-0.24676, 1.39934, 0.60743] }], [{ side: "R", inner: [0.2355, 1.42162, 0.4399], outer: [0.14279, 1.43535, 0.42518] }, { side: "L", inner: [-0.15934, 1.39649, 0.57534], outer: [-0.24824, 1.39763, 0.60844] }], [{ side: "R", inner: [0.23549, 1.42254, 0.42868], outer: [0.14315, 1.43673, 0.41214] }, { side: "L", inner: [-0.15974, 1.39598, 0.57673], outer: [-0.24889, 1.39688, 0.60915] }], [{ side: "R", inner: [0.23554, 1.42341, 0.4175], outer: [0.1436, 1.43803, 0.39924] }, { side: "L", inner: [-0.15973, 1.39598, 0.57722], outer: [-0.24888, 1.39688, 0.60965] }], [{ side: "R", inner: [0.23565, 1.42423, 0.40646], outer: [0.14412, 1.43926, 0.38656] }, { side: "L", inner: [-0.15945, 1.39633, 0.57713], outer: [-0.24843, 1.39738, 0.61001] }], [{ side: "R", inner: [0.23584, 1.42498, 0.39571], outer: [0.1447, 1.44038, 0.37433] }, { side: "L", inner: [-0.15862, 1.39735, 0.57586], outer: [-0.24708, 1.39892, 0.61009] }], [{ side: "R", inner: [0.23604, 1.42571, 0.38503], outer: [0.14532, 1.44147, 0.3622] }, { side: "L", inner: [-0.15774, 1.39848, 0.57412], outer: [-0.24561, 1.40061, 0.60982] }], [{ side: "R", inner: [0.23634, 1.42635, 0.37503], outer: [0.14599, 1.44243, 0.35097] }, { side: "L", inner: [-0.1564, 1.40047, 0.56887], outer: [-0.24318, 1.40354, 0.60709] }], [{ side: "R", inner: [0.23663, 1.42698, 0.36501], outer: [0.14668, 1.44338, 0.33973] }, { side: "L", inner: [-0.15512, 1.4024, 0.56351], outer: [-0.24074, 1.4065, 0.60418] }], [{ side: "R", inner: [0.23699, 1.42752, 0.35593], outer: [0.14737, 1.44419, 0.32964] }, { side: "L", inner: [-0.15413, 1.40434, 0.55562], outer: [-0.23853, 1.40935, 0.59865] }], [{ side: "R", inner: [0.23736, 1.42805, 0.34695], outer: [0.14808, 1.44498, 0.31968] }, { side: "L", inner: [-0.15324, 1.40622, 0.54733], outer: [-0.23637, 1.4122, 0.59264] }], [{ side: "R", inner: [0.23774, 1.42851, 0.33885], outer: [0.14876, 1.44567, 0.31077] }, { side: "L", inner: [-0.15258, 1.40804, 0.53747], outer: [-0.23442, 1.41492, 0.58496] }], [{ side: "R", inner: [0.23813, 1.42894, 0.33118], outer: [0.14942, 1.44631, 0.30238] }, { side: "L", inner: [-0.15208, 1.40981, 0.5268], outer: [-0.2326, 1.41757, 0.57636] }], [{ side: "R", inner: [0.23851, 1.42932, 0.32423], outer: [0.15005, 1.44688, 0.2948] }, { side: "L", inner: [-0.15174, 1.4115, 0.51529], outer: [-0.23092, 1.42011, 0.56683] }], [{ side: "R", inner: [0.23887, 1.42964, 0.31817], outer: [0.15061, 1.44737, 0.28824] }, { side: "L", inner: [-0.1516, 1.41311, 0.50278], outer: [-0.22944, 1.42252, 0.55618] }], [{ side: "R", inner: [0.23922, 1.42994, 0.31253], outer: [0.15114, 1.44781, 0.28214] }, { side: "L", inner: [-0.15157, 1.41467, 0.48993], outer: [-0.22805, 1.42489, 0.54513] }], [{ side: "R", inner: [0.23949, 1.43016, 0.30839], outer: [0.15155, 1.44814, 0.27767] }, { side: "L", inner: [-0.15175, 1.41612, 0.47613], outer: [-0.2269, 1.42704, 0.53299] }], [{ side: "R", inner: [0.23976, 1.43038, 0.30424], outer: [0.15195, 1.44847, 0.27321] }, { side: "L", inner: [-0.152, 1.41754, 0.46227], outer: [-0.22578, 1.42921, 0.52074] }], [{ side: "R", inner: [0.23987, 1.43049, 0.30232], outer: [0.15214, 1.44864, 0.27113] }, { side: "L", inner: [-0.15244, 1.41883, 0.44772], outer: [-0.22495, 1.43111, 0.50765] }], [{ side: "R", inner: [0.23999, 1.4306, 0.30041], outer: [0.15232, 1.4488, 0.26904] }, { side: "L", inner: [-0.15295, 1.42009, 0.43314], outer: [-0.22415, 1.43302, 0.49448] }], [{ side: "R", inner: [0.23999, 1.43064, 0.29991], outer: [0.15237, 1.44886, 0.26845] }, { side: "L", inner: [-0.15358, 1.42123, 0.41845], outer: [-0.22357, 1.43473, 0.48106] }], [{ side: "R", inner: [0.23997, 1.43067, 0.29981], outer: [0.15237, 1.4489, 0.26829] }, { side: "L", inner: [-0.15429, 1.42233, 0.40371], outer: [-0.22307, 1.43638, 0.46753] }], [{ side: "R", inner: [0.23993, 1.43069, 0.29976], outer: [0.15236, 1.44894, 0.26817] }, { side: "L", inner: [-0.15507, 1.42334, 0.38919], outer: [-0.22271, 1.4379, 0.4541] }], [{ side: "R", inner: [0.2399, 1.43071, 0.29976], outer: [0.15235, 1.44897, 0.2681] }, { side: "L", inner: [-0.15591, 1.42428, 0.37485], outer: [-0.22248, 1.43931, 0.44076] }], [{ side: "R", inner: [0.23987, 1.43073, 0.29975], outer: [0.15234, 1.449, 0.26803] }, { side: "L", inner: [-0.15679, 1.42516, 0.3608], outer: [-0.22233, 1.44064, 0.42762] }], [{ side: "R", inner: [0.23984, 1.43075, 0.29975], outer: [0.15234, 1.44902, 0.26797] }, { side: "L", inner: [-0.15771, 1.42596, 0.34735], outer: [-0.22234, 1.44182, 0.41495] }], [{ side: "R", inner: [0.2398, 1.43077, 0.29974], outer: [0.15233, 1.44905, 0.2679] }, { side: "L", inner: [-0.15864, 1.42672, 0.33403], outer: [-0.22239, 1.44298, 0.40239] }], [{ side: "R", inner: [0.23978, 1.43078, 0.29973], outer: [0.15232, 1.44908, 0.26784] }, { side: "L", inner: [-0.15956, 1.42737, 0.32192], outer: [-0.2226, 1.44395, 0.39085] }], [{ side: "R", inner: [0.23975, 1.4308, 0.29973], outer: [0.15232, 1.44911, 0.26778] }, { side: "L", inner: [-0.16049, 1.42801, 0.30981], outer: [-0.22283, 1.44491, 0.37929] }], [{ side: "R", inner: [0.23972, 1.43082, 0.29972], outer: [0.15231, 1.44913, 0.26773] }, { side: "L", inner: [-0.16135, 1.42853, 0.29927], outer: [-0.22317, 1.4457, 0.36915] }], [{ side: "R", inner: [0.2397, 1.43083, 0.29972], outer: [0.1523, 1.44915, 0.26768] }, { side: "L", inner: [-0.16221, 1.42904, 0.28892], outer: [-0.22354, 1.44646, 0.35917] }], [{ side: "R", inner: [0.23968, 1.43084, 0.29971], outer: [0.1523, 1.44917, 0.26764] }, { side: "L", inner: [-0.16298, 1.42946, 0.28001], outer: [-0.22395, 1.44709, 0.35053] }], [{ side: "R", inner: [0.23966, 1.43086, 0.29971], outer: [0.1523, 1.44919, 0.2676] }, { side: "L", inner: [-0.16371, 1.42984, 0.27183], outer: [-0.22438, 1.44766, 0.34255] }], [{ side: "R", inner: [0.23965, 1.43087, 0.29971], outer: [0.15229, 1.4492, 0.26756] }, { side: "L", inner: [-0.16434, 1.43016, 0.26476], outer: [-0.22479, 1.44814, 0.33563] }], [{ side: "R", inner: [0.23963, 1.43088, 0.2997], outer: [0.15229, 1.44922, 0.26754] }, { side: "L", inner: [-0.16487, 1.43041, 0.2591], outer: [-0.22517, 1.44852, 0.33006] }], [{ side: "R", inner: [0.23962, 1.43088, 0.2997], outer: [0.15229, 1.44923, 0.26751] }, { side: "L", inner: [-0.16533, 1.43063, 0.25408], outer: [-0.22551, 1.44885, 0.32512] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15229, 1.44923, 0.2675] }, { side: "L", inner: [-0.1656, 1.43075, 0.25131], outer: [-0.22573, 1.44903, 0.32237] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15228, 1.44924, 0.26748] }, { side: "L", inner: [-0.16586, 1.43087, 0.24853], outer: [-0.22595, 1.44921, 0.31962] }], [{ side: "R", inner: [0.24358, 1.42864, 0.30273], outer: [0.15611, 1.44815, 0.27163] }, { side: "L", inner: [-0.16933, 1.42988, 0.25212], outer: [-0.23031, 1.44689, 0.32277] }], [{ side: "R", inner: [0.24755, 1.42638, 0.30575], outer: [0.15995, 1.44704, 0.27577] }, { side: "L", inner: [-0.17281, 1.42887, 0.25571], outer: [-0.23468, 1.44455, 0.32591] }], [{ side: "R", inner: [0.26416, 1.41501, 0.31682], outer: [0.17627, 1.44029, 0.2916] }, { side: "L", inner: [-0.18757, 1.4226, 0.27017], outer: [-0.25286, 1.43269, 0.33825] }], [{ side: "R", inner: [0.28425, 1.40079, 0.32975], outer: [0.19651, 1.4314, 0.31061] }, { side: "L", inner: [-0.20587, 1.41446, 0.28768], outer: [-0.27489, 1.41772, 0.35268] }], [{ side: "R", inner: [0.31083, 1.37672, 0.34277], outer: [0.22419, 1.41389, 0.3322] }, { side: "L", inner: [-0.2309, 1.39829, 0.30747], outer: [-0.30411, 1.39231, 0.3675] }], [{ side: "R", inner: [0.3422, 1.34454, 0.35511], outer: [0.25818, 1.38858, 0.35533] }, { side: "L", inner: [-0.26171, 1.37501, 0.32881], outer: [-0.33867, 1.3581, 0.38163] }], [{ side: "R", inner: [0.37356, 1.30576, 0.36246], outer: [0.29382, 1.3557, 0.37466] }, { side: "L", inner: [-0.29402, 1.34482, 0.34671], outer: [-0.37336, 1.31664, 0.39041] }], [{ side: "R", inner: [0.4052, 1.25432, 0.36072], outer: [0.33205, 1.30883, 0.38675] }, { side: "L", inner: [-0.32867, 1.30159, 0.35783], outer: [-0.40858, 1.26155, 0.38964] }], [{ side: "R", inner: [0.43425, 1.20191, 0.35507], outer: [0.36934, 1.25859, 0.39474] }, { side: "L", inner: [-0.36268, 1.25544, 0.36566], outer: [-0.44091, 1.20506, 0.38416] }], [{ side: "R", inner: [0.45316, 1.14056, 0.33122], outer: [0.39814, 1.19643, 0.38461] }, { side: "L", inner: [-0.38861, 1.19808, 0.35622], outer: [-0.46269, 1.13891, 0.35962] }], [{ side: "R", inner: [0.47011, 1.0804, 0.30571], outer: [0.42604, 1.13265, 0.3715] }, { side: "L", inner: [-0.41421, 1.13918, 0.34471], outer: [-0.48194, 1.07388, 0.3325] }], [{ side: "R", inner: [0.4714, 1.02534, 0.26504], outer: [0.43799, 1.07107, 0.34116] }, { side: "L", inner: [-0.42472, 1.08235, 0.31673], outer: [-0.48468, 1.01407, 0.28947] }], [{ side: "R", inner: [0.46928, 0.97257, 0.22178], outer: [0.44655, 1.00948, 0.30617] }, { side: "L", inner: [-0.4325, 1.02521, 0.28484], outer: [-0.48333, 0.95684, 0.24311] }], [{ side: "R", inner: [0.45806, 0.93209, 0.17573], outer: [0.44434, 0.9591, 0.26563] }, { side: "L", inner: [-0.43023, 0.97852, 0.24763], outer: [-0.47216, 0.91267, 0.19373] }], [{ side: "R", inner: [0.44203, 0.89847, 0.12842], outer: [0.43614, 0.91479, 0.22169] }, { side: "L", inner: [-0.42251, 0.93727, 0.20725], outer: [-0.45566, 0.87598, 0.14287] }], [{ side: "R", inner: [0.42495, 0.87382, 0.08612], outer: [0.42515, 0.8801, 0.18078] }, { side: "L", inner: [-0.41232, 0.90483, 0.16966], outer: [-0.43778, 0.84909, 0.09724] }], [{ side: "R", inner: [0.40715, 0.85936, 0.05008], outer: [0.41158, 0.8571, 0.14482] }, { side: "L", inner: [-0.39964, 0.88333, 0.1365], outer: [-0.41908, 0.83312, 0.0584] }], [{ side: "R", inner: [0.39139, 0.84796, 0.01918], outer: [0.39907, 0.8382, 0.11323] }, { side: "L", inner: [-0.38807, 0.86549, 0.10739], outer: [-0.4024, 0.82067, 0.02501] }], [{ side: "R", inner: [0.38356, 0.84476, 544e-5], outer: [0.39248, 0.83167, 0.09897] }, { side: "L", inner: [-0.38192, 0.85935, 0.09423], outer: [-0.39412, 0.81708, 0.01018] }], [{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }]] }, sketonian_sword: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.8 }, windows: [{ side: null, start: 0.2, end: 0.65 }], frames: [[{ side: "L", inner: [-0.25565, 1.44624, 0.34492], outer: [-0.17436, 2.08633, 0.5145] }], [{ side: "L", inner: [-0.2656, 1.44335, 0.34867], outer: [-0.18873, 2.08161, 0.52695] }], [{ side: "L", inner: [-0.27579, 1.44045, 0.35227], outer: [-0.20389, 2.07689, 0.53896] }], [{ side: "L", inner: [-0.29947, 1.43397, 0.35935], outer: [-0.23939, 2.06562, 0.56543] }], [{ side: "L", inner: [-0.32842, 1.42649, 0.3664], outer: [-0.28538, 2.0526, 0.59269] }], [{ side: "L", inner: [-0.36516, 1.41746, 0.3724], outer: [-0.34562, 2.03554, 0.62274] }], [{ side: "L", inner: [-0.40959, 1.40732, 0.37582], outer: [-0.42203, 2.01575, 0.6492] }], [{ side: "L", inner: [-0.45794, 1.39682, 0.37513], outer: [-0.50882, 1.99426, 0.66763] }], [{ side: "L", inner: [-0.51228, 1.38533, 0.36845], outer: [-0.61024, 1.96848, 0.67734] }], [{ side: "L", inner: [-0.56815, 1.37456, 0.3554], outer: [-0.71717, 1.94487, 0.66784] }], [{ side: "L", inner: [-0.62449, 1.36186, 0.33557], outer: [-0.83096, 1.91255, 0.65052] }], [{ side: "L", inner: [-0.68058, 1.35102, 0.3075], outer: [-0.94358, 1.88641, 0.60626] }], [{ side: "L", inner: [-0.73105, 1.3373, 0.27571], outer: [-1.0522, 1.84914, 0.55848] }], [{ side: "L", inner: [-0.77876, 1.32522, 0.23622], outer: [-1.15329, 1.81712, 0.48691] }], [{ side: "L", inner: [-0.81844, 1.31167, 0.19607], outer: [-1.24145, 1.77958, 0.41334] }], [{ side: "L", inner: [-0.85258, 1.29825, 0.15269], outer: [-1.31814, 1.74214, 0.32956] }], [{ side: "L", inner: [-0.87941, 1.28571, 0.1101], outer: [-1.37876, 1.70713, 0.24473] }], [{ side: "L", inner: [-0.89931, 1.27271, 0.07116], outer: [-1.42656, 1.67006, 0.16706] }], [{ side: "L", inner: [-0.91455, 1.26183, 0.03265], outer: [-1.46175, 1.63945, 0.08787] }], [{ side: "L", inner: [-0.92306, 1.25266, 466e-5], outer: [-1.48383, 1.61303, 0.03191] }], [{ side: "L", inner: [-0.93005, 1.24434, -0.02444], outer: [-1.50103, 1.58936, -0.02761] }], [{ side: "L", inner: [-0.93118, 1.24212, -0.03722], outer: [-1.50451, 1.58296, -0.05103] }], [{ side: "L", inner: [-0.93215, 1.23998, -0.05006], outer: [-1.50749, 1.5768, -0.07465] }], [{ side: "L", inner: [-0.93223, 1.23952, -0.05481], outer: [-1.50792, 1.57547, -0.08297] }], [{ side: "L", inner: [-0.93208, 1.23952, -0.05724], outer: [-1.50769, 1.57547, -0.08688] }], [{ side: "L", inner: [-0.93209, 1.23952, -0.0546], outer: [-1.50781, 1.57547, -0.08231] }], [{ side: "L", inner: [-0.93223, 1.23952, -0.04792], outer: [-1.50815, 1.57547, -0.07094] }], [{ side: "L", inner: [-0.9323, 1.23952, -0.03828], outer: [-1.50845, 1.57547, -0.05452] }], [{ side: "L", inner: [-0.93221, 1.23952, -0.0227], outer: [-1.50856, 1.57547, -0.02799] }], [{ side: "L", inner: [-0.93192, 1.23952, -624e-5], outer: [-1.50826, 1.57547, 6e-5] }], [{ side: "L", inner: [-0.93066, 1.23952, 0.01737], outer: [-1.50659, 1.57547, 0.04029] }], [{ side: "L", inner: [-0.92919, 1.23952, 0.04096], outer: [-1.50421, 1.57547, 0.08049] }], [{ side: "L", inner: [-0.92575, 1.23952, 0.0708], outer: [-1.49893, 1.57547, 0.13143] }], [{ side: "L", inner: [-0.92173, 1.23952, 0.1014], outer: [-1.49221, 1.57547, 0.1836] }], [{ side: "L", inner: [-0.9153, 1.23952, 0.13588], outer: [-1.48172, 1.57547, 0.24252] }], [{ side: "L", inner: [-0.90734, 1.23952, 0.17223], outer: [-1.46832, 1.57547, 0.30458] }], [{ side: "L", inner: [-0.89707, 1.23952, 0.21064], outer: [-1.45095, 1.57547, 0.37013] }], [{ side: "L", inner: [-0.88393, 1.23952, 0.25158], outer: [-1.42867, 1.57547, 0.43991] }], [{ side: "L", inner: [-0.86903, 1.23952, 0.29312], outer: [-1.40286, 1.57547, 0.51048] }], [{ side: "L", inner: [-0.8496, 1.23952, 0.33728], outer: [-1.36983, 1.57547, 0.58542] }], [{ side: "L", inner: [-0.82938, 1.23952, 0.38106], outer: [-1.33424, 1.57547, 0.65914] }], [{ side: "L", inner: [-0.8028, 1.23952, 0.42651], outer: [-1.28906, 1.57547, 0.73596] }], [{ side: "L", inner: [-0.77536, 1.23952, 0.47139], outer: [-1.24107, 1.57547, 0.81099] }], [{ side: "L", inner: [-0.74253, 1.23952, 0.51597], outer: [-1.18471, 1.57547, 0.8857] }], [{ side: "L", inner: [-0.70754, 1.23952, 0.5599], outer: [-1.12388, 1.57547, 0.95849] }], [{ side: "L", inner: [-0.66853, 1.23952, 0.60266], outer: [-1.05647, 1.57547, 1.02894] }], [{ side: "L", inner: [-0.62615, 1.23952, 0.64421], outer: [-0.98326, 1.57547, 1.09663] }], [{ side: "L", inner: [-0.58124, 1.23952, 0.68395], outer: [-0.90546, 1.57547, 1.16049] }], [{ side: "L", inner: [-0.53211, 1.23952, 0.72098], outer: [-0.82118, 1.57547, 1.21963] }], [{ side: "L", inner: [-0.48185, 1.23952, 0.75637], outer: [-0.7342, 1.57547, 1.27457] }], [{ side: "L", inner: [-0.42723, 1.23952, 0.7868], outer: [-0.64111, 1.57547, 1.32202] }], [{ side: "L", inner: [-0.3721, 1.23952, 0.81594], outer: [-0.54637, 1.57547, 1.36535] }], [{ side: "L", inner: [-0.31412, 1.23952, 0.83875], outer: [-0.44787, 1.57547, 1.39939] }], [{ side: "L", inner: [-0.25553, 1.23952, 0.85959], outer: [-0.34805, 1.57547, 1.42849] }], [{ side: "L", inner: [-0.19612, 1.23952, 0.87471], outer: [-0.24733, 1.57547, 1.44881] }], [{ side: "L", inner: [-0.13632, 1.23952, 0.88631], outer: [-0.14613, 1.57547, 1.46261] }], [{ side: "L", inner: [-0.07701, 1.23952, 0.89358], outer: [-0.04591, 1.57547, 1.46911] }], [{ side: "L", inner: [-0.01843, 1.23952, 0.8958], outer: [0.05278, 1.57547, 1.46776] }], [{ side: "L", inner: [0.03928, 1.23952, 0.89539], outer: [0.14988, 1.57547, 1.46105] }], [{ side: "L", inner: [0.09429, 1.23952, 0.88891], outer: [0.24244, 1.57547, 1.44592] }], [{ side: "L", inner: [0.149, 1.23952, 0.88132], outer: [0.33404, 1.57547, 1.42719] }], [{ side: "L", inner: [0.19847, 1.23952, 0.86756], outer: [0.41743, 1.57547, 1.40073] }], [{ side: "L", inner: [0.24755, 1.23952, 0.85285], outer: [0.49957, 1.57547, 1.37121] }], [{ side: "L", inner: [0.29146, 1.23952, 0.83459], outer: [0.57359, 1.57547, 1.3372] }], [{ side: "L", inner: [0.33359, 1.23952, 0.81481], outer: [0.64431, 1.57547, 1.30027] }], [{ side: "L", inner: [0.3717, 1.23952, 0.79374], outer: [0.70841, 1.57547, 1.26155] }], [{ side: "L", inner: [0.40653, 1.23952, 0.77163], outer: [0.76703, 1.57547, 1.22135] }], [{ side: "L", inner: [0.43877, 1.23952, 0.74929], outer: [0.82109, 1.57547, 1.18061] }], [{ side: "L", inner: [0.4663, 1.23952, 0.72713], outer: [0.86757, 1.57547, 1.14088] }], [{ side: "L", inner: [0.49277, 1.23952, 0.70491], outer: [0.91185, 1.57547, 1.10061] }], [{ side: "L", inner: [0.51337, 1.23952, 0.68478], outer: [0.94676, 1.57547, 1.06476] }], [{ side: "L", inner: [0.53371, 1.23952, 0.66442], outer: [0.98081, 1.57547, 1.02816] }], [{ side: "L", inner: [0.54875, 1.23952, 0.64773], outer: [1.00619, 1.57547, 0.99839] }], [{ side: "L", inner: [0.563, 1.23952, 0.6314], outer: [1.03005, 1.57547, 0.96916] }], [{ side: "L", inner: [0.57351, 1.23952, 0.6187], outer: [1.04763, 1.57547, 0.94644] }], [{ side: "L", inner: [0.58214, 1.23952, 0.60781], outer: [1.06208, 1.57547, 0.92698] }], [{ side: "L", inner: [0.58836, 1.23952, 0.59982], outer: [1.07243, 1.57547, 0.91269] }], [{ side: "L", inner: [0.59161, 1.23952, 0.59549], outer: [1.07786, 1.57547, 0.90496] }], [{ side: "L", inner: [0.59384, 1.23952, 0.59241], outer: [1.08162, 1.57547, 0.89946] }], [{ side: "L", inner: [0.59255, 1.23952, 0.59369], outer: [1.07966, 1.57547, 0.90179] }], [{ side: "L", inner: [0.59125, 1.23952, 0.59496], outer: [1.0777, 1.57547, 0.90412] }], [{ side: "L", inner: [0.58687, 1.23952, 0.59926], outer: [1.07104, 1.57547, 0.91197] }], [{ side: "L", inner: [0.58247, 1.23952, 0.60355], outer: [1.06433, 1.57547, 0.9198] }], [{ side: "L", inner: [0.57586, 1.23952, 0.6098], outer: [1.05427, 1.57547, 0.93126] }], [{ side: "L", inner: [0.56859, 1.23952, 0.61659], outer: [1.04316, 1.57547, 0.9437] }], [{ side: "L", inner: [0.55977, 1.23952, 0.62461], outer: [1.02963, 1.57547, 0.95844] }], [{ side: "L", inner: [0.54968, 1.23952, 0.63359], outer: [1.01408, 1.57547, 0.97498] }], [{ side: "L", inner: [0.53434, 1.23952, 0.64889], outer: [0.98926, 1.57547, 1.00281] }], [{ side: "L", inner: [0.50829, 1.23952, 0.67664], outer: [0.94515, 1.57547, 1.05262] }], [{ side: "L", inner: [0.47886, 1.23952, 0.70606], outer: [0.89471, 1.57547, 1.10516] }], [{ side: "L", inner: [0.42519, 1.23952, 0.75108], outer: [0.80264, 1.57547, 1.18668] }], [{ side: "L", inner: [0.37008, 1.23952, 0.79447], outer: [0.70594, 1.57547, 1.26288] }], [{ side: "L", inner: [0.28725, 1.23952, 0.83354], outer: [0.56557, 1.57547, 1.33827] }], [{ side: "L", inner: [0.19932, 1.23952, 0.86905], outer: [0.41446, 1.57547, 1.40377] }], [{ side: "L", inner: [0.09533, 1.23952, 0.88672], outer: [0.23801, 1.57547, 1.44516] }], [{ side: "L", inner: [-0.01716, 1.23952, 0.89267], outer: [0.04744, 1.57547, 1.46542] }], [{ side: "L", inner: [-0.13105, 1.23952, 0.88411], outer: [-0.14663, 1.57547, 1.46028] }], [{ side: "L", inner: [-0.24584, 1.23952, 0.85841], outer: [-0.34239, 1.57547, 1.42665] }], [{ side: "L", inner: [-0.35618, 1.23952, 0.82549], outer: [-0.53059, 1.57547, 1.37484] }], [{ side: "L", inner: [-0.45239, 1.23952, 0.78048], outer: [-0.69741, 1.57547, 1.30219] }], [{ side: "L", inner: [-0.54675, 1.23952, 0.73142], outer: [-0.85812, 1.57547, 1.21645] }], [{ side: "L", inner: [-0.61479, 1.23952, 0.67931], outer: [-0.97709, 1.57547, 1.12758] }], [{ side: "L", inner: [-0.68092, 1.23952, 0.62481], outer: [-1.08985, 1.57547, 1.031] }], [{ side: "L", inner: [-0.72537, 1.23952, 0.57793], outer: [-1.16592, 1.57547, 0.94957] }], [{ side: "L", inner: [-0.76304, 1.23952, 0.53283], outer: [-1.22965, 1.57547, 0.87117] }], [{ side: "L", inner: [-0.78606, 1.24077, 0.50054], outer: [-1.26635, 1.57911, 0.81665] }], [{ side: "L", inner: [-0.79796, 1.24295, 0.47895], outer: [-1.28334, 1.58538, 0.78263] }], [{ side: "L", inner: [-0.8013, 1.24898, 0.46401], outer: [-1.28063, 1.60252, 0.76456] }], [{ side: "L", inner: [-0.78739, 1.26366, 0.46029], outer: [-1.23804, 1.64445, 0.77172] }], [{ side: "L", inner: [-0.77059, 1.27919, 0.45557], outer: [-1.18959, 1.68875, 0.77459] }], [{ side: "L", inner: [-0.72962, 1.29771, 0.46321], outer: [-1.09096, 1.73994, 0.80809] }], [{ side: "L", inner: [-0.68829, 1.31934, 0.46062], outer: [-0.99078, 1.8014, 0.80874] }], [{ side: "L", inner: [-0.62753, 1.33619, 0.46525], outer: [-0.85888, 1.84487, 0.82966] }], [{ side: "L", inner: [-0.56531, 1.35609, 0.4583], outer: [-0.7255, 1.89824, 0.81254] }], [{ side: "L", inner: [-0.49969, 1.37336, 0.44818], outer: [-0.59365, 1.93961, 0.7882] }], [{ side: "L", inner: [-0.43426, 1.39067, 0.43134], outer: [-0.46856, 1.97944, 0.74318] }], [{ side: "L", inner: [-0.37807, 1.40696, 0.40985], outer: [-0.36807, 2.01476, 0.68473] }], [{ side: "L", inner: [-0.32928, 1.42124, 0.38855], outer: [-0.28507, 2.04186, 0.62929] }], [{ side: "L", inner: [-0.29101, 1.43387, 0.36688], outer: [-0.22657, 2.06573, 0.57102] }], [{ side: "L", inner: [-0.27285, 1.44006, 0.35614], outer: [-0.19887, 2.07605, 0.54354] }], [{ side: "L", inner: [-0.25566, 1.44624, 0.34493], outer: [-0.17437, 2.08633, 0.5145] }]] }, fire_wings: { durations: { Draw: 0, Stow: 0, Swing: 1.8 }, windows: [{ side: "R", start: 0.18, end: 0.36 }, { side: "L", start: 0.36, end: 0.53 }], frames: [[{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }], [{ side: "R", inner: [0.38201, 0.84404, 267e-5], outer: [0.39117, 0.83029, 0.09609] }, { side: "L", inner: [-0.38071, 0.85804, 0.09157], outer: [-0.39247, 0.81629, 719e-5] }], [{ side: "R", inner: [0.3883, 0.84649, 0.01363], outer: [0.3965, 0.83538, 0.10748] }, { side: "L", inner: [-0.38567, 0.86284, 0.10209], outer: [-0.39913, 0.81904, 0.01902] }], [{ side: "R", inner: [0.40154, 0.85485, 0.03876], outer: [0.40721, 0.84985, 0.13333] }, { side: "L", inner: [-0.39561, 0.8765, 0.12592], outer: [-0.41315, 0.8282, 0.04617] }], [{ side: "R", inner: [0.41662, 0.86539, 0.06812], outer: [0.41906, 0.86738, 0.16294] }, { side: "L", inner: [-0.40666, 0.89292, 0.15323], outer: [-0.42903, 0.83986, 0.07783] }], [{ side: "R", inner: [0.43238, 0.88341, 0.1037], outer: [0.43016, 0.8939, 0.19796] }, { side: "L", inner: [-0.41696, 0.91775, 0.18545], outer: [-0.44558, 0.85955, 0.11622] }], [{ side: "R", inner: [0.44837, 0.90802, 0.14433], outer: [0.44012, 0.92788, 0.23672] }, { side: "L", inner: [-0.42628, 0.94944, 0.22111], outer: [-0.46221, 0.88646, 0.15994] }], [{ side: "R", inner: [0.46157, 0.93837, 0.18539], outer: [0.44624, 0.96742, 0.27439] }, { side: "L", inner: [-0.43209, 0.98617, 0.25572], outer: [-0.47572, 0.91963, 0.20405] }], [{ side: "R", inner: [0.46944, 0.97933, 0.22707], outer: [0.44541, 1.0174, 0.31058] }, { side: "L", inner: [-0.43142, 1.03262, 0.28884], outer: [-0.48343, 0.96411, 0.24881] }], [{ side: "R", inner: [0.47486, 1.02269, 0.26741], outer: [0.44183, 1.06838, 0.34371] }, { side: "L", inner: [-0.42849, 1.07972, 0.31935], outer: [-0.48819, 1.01135, 0.29176] }], [{ side: "R", inner: [0.46831, 1.07472, 0.29922], outer: [0.42529, 1.12633, 0.3662] }, { side: "L", inner: [-0.4133, 1.13338, 0.33962], outer: [-0.48031, 1.06766, 0.3258] }], [{ side: "R", inner: [0.46027, 1.12806, 0.33004], outer: [0.40767, 1.18349, 0.38626] }, { side: "L", inner: [-0.39754, 1.18616, 0.35815], outer: [-0.47039, 1.12539, 0.35815] }], [{ side: "R", inner: [0.44079, 1.18035, 0.34666], outer: [0.37909, 1.23707, 0.39111] }, { side: "L", inner: [-0.37141, 1.23553, 0.36216], outer: [-0.44848, 1.18188, 0.37562] }], [{ side: "R", inner: [0.41859, 1.23306, 0.36024], outer: [0.3488, 1.28883, 0.39217] }, { side: "L", inner: [-0.34396, 1.28328, 0.36308], outer: [-0.42343, 1.23861, 0.38932] }], [{ side: "R", inner: [0.39201, 1.27834, 0.36332], outer: [0.31569, 1.3311, 0.38312] }, { side: "L", inner: [-0.31388, 1.32215, 0.35455], outer: [-0.39382, 1.2873, 0.3919] }], [{ side: "R", inner: [0.36282, 1.31977, 0.36051], outer: [0.28142, 1.36783, 0.36851] }, { side: "L", inner: [-0.28277, 1.35596, 0.34099], outer: [-0.36148, 1.33164, 0.38803] }], [{ side: "R", inner: [0.33446, 1.35422, 0.35336], outer: [0.24963, 1.39662, 0.35076] }, { side: "L", inner: [-0.25397, 1.38247, 0.32466], outer: [-0.33012, 1.36837, 0.37945] }], [{ side: "R", inner: [0.3077, 1.37991, 0.34151], outer: [0.22088, 1.41633, 0.32987] }, { side: "L", inner: [-0.22791, 1.40055, 0.30535], outer: [-0.30067, 1.39569, 0.36603] }], [{ side: "R", inner: [0.28279, 1.4023, 0.3292], outer: [0.19503, 1.43255, 0.30962] }, { side: "L", inner: [-0.20452, 1.41555, 0.2868], outer: [-0.2733, 1.41931, 0.35202] }], [{ side: "R", inner: [0.26567, 1.41419, 0.31799], outer: [0.17777, 1.43989, 0.29322] }, { side: "L", inner: [-0.18892, 1.42225, 0.27167], outer: [-0.25451, 1.43183, 0.33954] }], [{ side: "R", inner: [0.24843, 1.42587, 0.30642], outer: [0.1608, 1.44679, 0.27669] }, { side: "L", inner: [-0.17359, 1.42864, 0.25651], outer: [-0.23565, 1.44402, 0.3266] }], [{ side: "R", inner: [0.24444, 1.42813, 0.30372], outer: [0.15693, 1.44788, 0.27287] }, { side: "L", inner: [-0.17012, 1.42966, 0.2527], outer: [-0.2313, 1.44638, 0.32325] }], [{ side: "R", inner: [0.24044, 1.43037, 0.301], outer: [0.15307, 1.44896, 0.26905] }, { side: "L", inner: [-0.16667, 1.43067, 0.24889], outer: [-0.22695, 1.44872, 0.31989] }], [{ side: "R", inner: [0.23922, 1.43066, 0.30486], outer: [0.15177, 1.44889, 0.27291] }, { side: "L", inner: [-0.16591, 1.43088, 0.24807], outer: [-0.226, 1.44923, 0.31914] }], [{ side: "R", inner: [0.23879, 1.4304, 0.31061], outer: [0.15121, 1.44851, 0.27896] }, { side: "L", inner: [-0.16591, 1.43087, 0.24809], outer: [-0.22602, 1.44922, 0.31915] }], [{ side: "R", inner: [0.23821, 1.42997, 0.31972], outer: [0.15037, 1.44786, 0.28868] }, { side: "L", inner: [-0.1659, 1.43086, 0.24812], outer: [-0.22604, 1.44919, 0.31917] }], [{ side: "R", inner: [0.23751, 1.4294, 0.3315], outer: [0.14931, 1.44701, 0.30132] }, { side: "L", inner: [-0.1659, 1.43084, 0.24817], outer: [-0.22608, 1.44917, 0.31919] }], [{ side: "R", inner: [0.23683, 1.42872, 0.34476], outer: [0.14819, 1.446, 0.31571] }, { side: "L", inner: [-0.1659, 1.43082, 0.24823], outer: [-0.22612, 1.44914, 0.31921] }], [{ side: "R", inner: [0.2362, 1.42783, 0.361], outer: [0.14695, 1.44467, 0.3336] }, { side: "L", inner: [-0.1659, 1.4308, 0.24829], outer: [-0.22617, 1.4491, 0.31924] }], [{ side: "R", inner: [0.2356, 1.42691, 0.37754], outer: [0.14575, 1.44327, 0.35187] }, { side: "L", inner: [-0.1659, 1.43077, 0.24836], outer: [-0.22622, 1.44906, 0.31926] }], [{ side: "R", inner: [0.23525, 1.42567, 0.39664], outer: [0.14462, 1.44145, 0.37346] }, { side: "L", inner: [-0.1659, 1.43074, 0.24844], outer: [-0.22628, 1.44902, 0.31929] }], [{ side: "R", inner: [0.23491, 1.42445, 0.41568], outer: [0.14357, 1.43958, 0.39499] }, { side: "L", inner: [-0.1659, 1.43071, 0.24852], outer: [-0.22634, 1.44897, 0.31933] }], [{ side: "R", inner: [0.23492, 1.42287, 0.43582], outer: [0.1428, 1.43728, 0.41829] }, { side: "L", inner: [-0.1659, 1.43068, 0.24861], outer: [-0.22641, 1.44892, 0.31936] }], [{ side: "R", inner: [0.23499, 1.42127, 0.45601], outer: [0.14219, 1.43484, 0.44173] }, { side: "L", inner: [-0.1659, 1.43065, 0.2487], outer: [-0.22648, 1.44888, 0.31939] }], [{ side: "R", inner: [0.23538, 1.41939, 0.47583], outer: [0.14196, 1.43207, 0.46521] }, { side: "L", inner: [-0.1659, 1.43062, 0.24878], outer: [-0.22655, 1.44883, 0.31943] }], [{ side: "R", inner: [0.23594, 1.41739, 0.49538], outer: [0.14203, 1.42905, 0.4886] }, { side: "L", inner: [-0.1659, 1.43058, 0.24887], outer: [-0.22661, 1.44878, 0.31946] }], [{ side: "R", inner: [0.23675, 1.4152, 0.5138], outer: [0.14251, 1.42578, 0.51106] }, { side: "L", inner: [-0.16591, 1.43055, 0.24895], outer: [-0.22668, 1.44874, 0.31949] }], [{ side: "R", inner: [0.23787, 1.41278, 0.53081], outer: [0.14348, 1.42218, 0.53234] }, { side: "L", inner: [-0.16591, 1.43053, 0.24903], outer: [-0.22674, 1.44869, 0.31952] }], [{ side: "R", inner: [0.23914, 1.41029, 0.54671], outer: [0.1448, 1.41839, 0.55254] }, { side: "L", inner: [-0.16588, 1.43048, 0.24943], outer: [-0.22678, 1.44863, 0.31987] }], [{ side: "R", inner: [0.24089, 1.40747, 0.55914], outer: [0.14683, 1.41425, 0.5695] }, { side: "L", inner: [-0.16573, 1.4304, 0.25096], outer: [-0.22671, 1.4485, 0.32134] }], [{ side: "R", inner: [0.24263, 1.40471, 0.57132], outer: [0.14908, 1.40997, 0.58612] }, { side: "L", inner: [-0.16559, 1.43031, 0.25248], outer: [-0.22664, 1.44836, 0.32281] }], [{ side: "R", inner: [0.24502, 1.40162, 0.57702], outer: [0.15223, 1.40549, 0.59637] }, { side: "L", inner: [-0.16496, 1.42999, 0.25893], outer: [-0.22622, 1.44789, 0.32913] }], [{ side: "R", inner: [0.24736, 1.39861, 0.58242], outer: [0.15555, 1.40088, 0.60621] }, { side: "L", inner: [-0.16434, 1.42968, 0.26538], outer: [-0.2258, 1.44742, 0.33544] }], [{ side: "R", inner: [0.24848, 1.39726, 0.58345], outer: [0.15718, 1.39881, 0.60919] }, { side: "L", inner: [-0.16344, 1.4292, 0.27518], outer: [-0.22527, 1.4467, 0.34497] }], [{ side: "R", inner: [0.24926, 1.39637, 0.58326], outer: [0.15832, 1.39747, 0.61024] }, { side: "L", inner: [-0.16246, 1.42867, 0.28594], outer: [-0.22471, 1.4459, 0.35542] }], [{ side: "R", inner: [0.24941, 1.39622, 0.58281], outer: [0.15852, 1.39724, 0.61] }, { side: "L", inner: [-0.16136, 1.42801, 0.29864], outer: [-0.22423, 1.44491, 0.36765] }], [{ side: "R", inner: [0.24905, 1.39666, 0.58216], outer: [0.15798, 1.3979, 0.60874] }, { side: "L", inner: [-0.16017, 1.42725, 0.31289], outer: [-0.2238, 1.44377, 0.3813] }], [{ side: "R", inner: [0.24835, 1.39751, 0.58095], outer: [0.15695, 1.3992, 0.60632] }, { side: "L", inner: [-0.15898, 1.42641, 0.32801], outer: [-0.22347, 1.4425, 0.3957] }], [{ side: "R", inner: [0.24697, 1.39922, 0.57859], outer: [0.15495, 1.40178, 0.60153] }, { side: "L", inner: [-0.15776, 1.42541, 0.34487], outer: [-0.22334, 1.441, 0.41162] }], [{ side: "R", inner: [0.24558, 1.40094, 0.57588], outer: [0.15301, 1.40433, 0.59634] }, { side: "L", inner: [-0.15657, 1.42437, 0.3619], outer: [-0.22328, 1.43946, 0.42765] }], [{ side: "R", inner: [0.24431, 1.40266, 0.57102], outer: [0.15124, 1.40695, 0.58891] }, { side: "L", inner: [-0.15546, 1.42314, 0.3804], outer: [-0.22356, 1.43757, 0.44486] }], [{ side: "R", inner: [0.24303, 1.40441, 0.56607], outer: [0.14954, 1.40954, 0.58134] }, { side: "L", inner: [-0.15441, 1.42186, 0.39886], outer: [-0.22387, 1.43568, 0.46199] }], [{ side: "R", inner: [0.24195, 1.40605, 0.55932], outer: [0.14813, 1.41202, 0.57203] }, { side: "L", inner: [-0.15355, 1.42038, 0.41787], outer: [-0.22459, 1.43342, 0.47938] }], [{ side: "R", inner: [0.24089, 1.40769, 0.55226], outer: [0.1468, 1.41446, 0.56241] }, { side: "L", inner: [-0.15279, 1.41883, 0.43689], outer: [-0.22539, 1.43112, 0.49671] }], [{ side: "R", inner: [0.23997, 1.40923, 0.54414], outer: [0.14571, 1.41679, 0.55178] }, { side: "L", inner: [-0.15227, 1.41712, 0.45556], outer: [-0.22655, 1.42853, 0.51346] }], [{ side: "R", inner: [0.23912, 1.41074, 0.53545], outer: [0.14476, 1.41904, 0.5406] }, { side: "L", inner: [-0.15193, 1.41529, 0.47399], outer: [-0.2279, 1.42579, 0.52983] }], [{ side: "R", inner: [0.23836, 1.41219, 0.52621], outer: [0.14396, 1.42121, 0.52891] }, { side: "L", inner: [-0.15183, 1.41334, 0.49162], outer: [-0.22951, 1.42286, 0.54524] }], [{ side: "R", inner: [0.23772, 1.41356, 0.51632], outer: [0.14336, 1.42328, 0.51662] }, { side: "L", inner: [-0.15203, 1.41124, 0.50824], outer: [-0.23145, 1.41968, 0.55943] }], [{ side: "R", inner: [0.23713, 1.41491, 0.5062], outer: [0.14285, 1.42528, 0.50414] }, { side: "L", inner: [-0.15243, 1.40904, 0.5241], outer: [-0.23355, 1.41642, 0.57273] }], [{ side: "R", inner: [0.23669, 1.41614, 0.4955], outer: [0.14256, 1.42715, 0.49119] }, { side: "L", inner: [-0.15326, 1.40668, 0.53762], outer: [-0.2361, 1.41282, 0.58345] }], [{ side: "R", inner: [0.23625, 1.41739, 0.48475], outer: [0.14232, 1.42899, 0.47816] }, { side: "L", inner: [-0.15422, 1.40424, 0.55097], outer: [-0.23867, 1.40926, 0.59389] }], [{ side: "R", inner: [0.23598, 1.4185, 0.47361], outer: [0.1423, 1.43068, 0.46492] }, { side: "L", inner: [-0.15574, 1.40172, 0.56003], outer: [-0.2418, 1.40537, 0.5998] }], [{ side: "R", inner: [0.23573, 1.41962, 0.46243], outer: [0.14234, 1.43234, 0.45163] }, { side: "L", inner: [-0.15738, 1.39911, 0.5689], outer: [-0.24491, 1.40153, 0.6054] }], [{ side: "R", inner: [0.23559, 1.42063, 0.45119], outer: [0.14252, 1.43387, 0.4384] }, { side: "L", inner: [-0.15844, 1.39764, 0.57283], outer: [-0.24676, 1.39934, 0.60743] }], [{ side: "R", inner: [0.2355, 1.42162, 0.4399], outer: [0.14279, 1.43535, 0.42518] }, { side: "L", inner: [-0.15934, 1.39649, 0.57534], outer: [-0.24824, 1.39763, 0.60844] }], [{ side: "R", inner: [0.23549, 1.42254, 0.42868], outer: [0.14315, 1.43673, 0.41214] }, { side: "L", inner: [-0.15974, 1.39598, 0.57673], outer: [-0.24889, 1.39688, 0.60915] }], [{ side: "R", inner: [0.23554, 1.42341, 0.4175], outer: [0.1436, 1.43803, 0.39924] }, { side: "L", inner: [-0.15973, 1.39598, 0.57722], outer: [-0.24888, 1.39688, 0.60965] }], [{ side: "R", inner: [0.23565, 1.42423, 0.40646], outer: [0.14412, 1.43926, 0.38656] }, { side: "L", inner: [-0.15945, 1.39633, 0.57713], outer: [-0.24843, 1.39738, 0.61001] }], [{ side: "R", inner: [0.23584, 1.42498, 0.39571], outer: [0.1447, 1.44038, 0.37433] }, { side: "L", inner: [-0.15862, 1.39735, 0.57586], outer: [-0.24708, 1.39892, 0.61009] }], [{ side: "R", inner: [0.23604, 1.42571, 0.38503], outer: [0.14532, 1.44147, 0.3622] }, { side: "L", inner: [-0.15774, 1.39848, 0.57412], outer: [-0.24561, 1.40061, 0.60982] }], [{ side: "R", inner: [0.23634, 1.42635, 0.37503], outer: [0.14599, 1.44243, 0.35097] }, { side: "L", inner: [-0.1564, 1.40047, 0.56887], outer: [-0.24318, 1.40354, 0.60709] }], [{ side: "R", inner: [0.23663, 1.42698, 0.36501], outer: [0.14668, 1.44338, 0.33973] }, { side: "L", inner: [-0.15512, 1.4024, 0.56351], outer: [-0.24074, 1.4065, 0.60418] }], [{ side: "R", inner: [0.23699, 1.42752, 0.35593], outer: [0.14737, 1.44419, 0.32964] }, { side: "L", inner: [-0.15413, 1.40434, 0.55562], outer: [-0.23853, 1.40935, 0.59865] }], [{ side: "R", inner: [0.23736, 1.42805, 0.34695], outer: [0.14808, 1.44498, 0.31968] }, { side: "L", inner: [-0.15324, 1.40622, 0.54733], outer: [-0.23637, 1.4122, 0.59264] }], [{ side: "R", inner: [0.23774, 1.42851, 0.33885], outer: [0.14876, 1.44567, 0.31077] }, { side: "L", inner: [-0.15258, 1.40804, 0.53747], outer: [-0.23442, 1.41492, 0.58496] }], [{ side: "R", inner: [0.23813, 1.42894, 0.33118], outer: [0.14942, 1.44631, 0.30238] }, { side: "L", inner: [-0.15208, 1.40981, 0.5268], outer: [-0.2326, 1.41757, 0.57636] }], [{ side: "R", inner: [0.23851, 1.42932, 0.32423], outer: [0.15005, 1.44688, 0.2948] }, { side: "L", inner: [-0.15174, 1.4115, 0.51529], outer: [-0.23092, 1.42011, 0.56683] }], [{ side: "R", inner: [0.23887, 1.42964, 0.31817], outer: [0.15061, 1.44737, 0.28824] }, { side: "L", inner: [-0.1516, 1.41311, 0.50278], outer: [-0.22944, 1.42252, 0.55618] }], [{ side: "R", inner: [0.23922, 1.42994, 0.31253], outer: [0.15114, 1.44781, 0.28214] }, { side: "L", inner: [-0.15157, 1.41467, 0.48993], outer: [-0.22805, 1.42489, 0.54513] }], [{ side: "R", inner: [0.23949, 1.43016, 0.30839], outer: [0.15155, 1.44814, 0.27767] }, { side: "L", inner: [-0.15175, 1.41612, 0.47613], outer: [-0.2269, 1.42704, 0.53299] }], [{ side: "R", inner: [0.23976, 1.43038, 0.30424], outer: [0.15195, 1.44847, 0.27321] }, { side: "L", inner: [-0.152, 1.41754, 0.46227], outer: [-0.22578, 1.42921, 0.52074] }], [{ side: "R", inner: [0.23987, 1.43049, 0.30232], outer: [0.15214, 1.44864, 0.27113] }, { side: "L", inner: [-0.15244, 1.41883, 0.44772], outer: [-0.22495, 1.43111, 0.50765] }], [{ side: "R", inner: [0.23999, 1.4306, 0.30041], outer: [0.15232, 1.4488, 0.26904] }, { side: "L", inner: [-0.15295, 1.42009, 0.43314], outer: [-0.22415, 1.43302, 0.49448] }], [{ side: "R", inner: [0.23999, 1.43064, 0.29991], outer: [0.15237, 1.44886, 0.26845] }, { side: "L", inner: [-0.15358, 1.42123, 0.41845], outer: [-0.22357, 1.43473, 0.48106] }], [{ side: "R", inner: [0.23997, 1.43067, 0.29981], outer: [0.15237, 1.4489, 0.26829] }, { side: "L", inner: [-0.15429, 1.42233, 0.40371], outer: [-0.22307, 1.43638, 0.46753] }], [{ side: "R", inner: [0.23993, 1.43069, 0.29976], outer: [0.15236, 1.44894, 0.26817] }, { side: "L", inner: [-0.15507, 1.42334, 0.38919], outer: [-0.22271, 1.4379, 0.4541] }], [{ side: "R", inner: [0.2399, 1.43071, 0.29976], outer: [0.15235, 1.44897, 0.2681] }, { side: "L", inner: [-0.15591, 1.42428, 0.37485], outer: [-0.22248, 1.43931, 0.44076] }], [{ side: "R", inner: [0.23987, 1.43073, 0.29975], outer: [0.15234, 1.449, 0.26803] }, { side: "L", inner: [-0.15679, 1.42516, 0.3608], outer: [-0.22233, 1.44064, 0.42762] }], [{ side: "R", inner: [0.23984, 1.43075, 0.29975], outer: [0.15234, 1.44902, 0.26797] }, { side: "L", inner: [-0.15771, 1.42596, 0.34735], outer: [-0.22234, 1.44182, 0.41495] }], [{ side: "R", inner: [0.2398, 1.43077, 0.29974], outer: [0.15233, 1.44905, 0.2679] }, { side: "L", inner: [-0.15864, 1.42672, 0.33403], outer: [-0.22239, 1.44298, 0.40239] }], [{ side: "R", inner: [0.23978, 1.43078, 0.29973], outer: [0.15232, 1.44908, 0.26784] }, { side: "L", inner: [-0.15956, 1.42737, 0.32192], outer: [-0.2226, 1.44395, 0.39085] }], [{ side: "R", inner: [0.23975, 1.4308, 0.29973], outer: [0.15232, 1.44911, 0.26778] }, { side: "L", inner: [-0.16049, 1.42801, 0.30981], outer: [-0.22283, 1.44491, 0.37929] }], [{ side: "R", inner: [0.23972, 1.43082, 0.29972], outer: [0.15231, 1.44913, 0.26773] }, { side: "L", inner: [-0.16135, 1.42853, 0.29927], outer: [-0.22317, 1.4457, 0.36915] }], [{ side: "R", inner: [0.2397, 1.43083, 0.29972], outer: [0.1523, 1.44915, 0.26768] }, { side: "L", inner: [-0.16221, 1.42904, 0.28892], outer: [-0.22354, 1.44646, 0.35917] }], [{ side: "R", inner: [0.23968, 1.43084, 0.29971], outer: [0.1523, 1.44917, 0.26764] }, { side: "L", inner: [-0.16298, 1.42946, 0.28001], outer: [-0.22395, 1.44709, 0.35053] }], [{ side: "R", inner: [0.23966, 1.43086, 0.29971], outer: [0.1523, 1.44919, 0.2676] }, { side: "L", inner: [-0.16371, 1.42984, 0.27183], outer: [-0.22438, 1.44766, 0.34255] }], [{ side: "R", inner: [0.23965, 1.43087, 0.29971], outer: [0.15229, 1.4492, 0.26756] }, { side: "L", inner: [-0.16434, 1.43016, 0.26476], outer: [-0.22479, 1.44814, 0.33563] }], [{ side: "R", inner: [0.23963, 1.43088, 0.2997], outer: [0.15229, 1.44922, 0.26754] }, { side: "L", inner: [-0.16487, 1.43041, 0.2591], outer: [-0.22517, 1.44852, 0.33006] }], [{ side: "R", inner: [0.23962, 1.43088, 0.2997], outer: [0.15229, 1.44923, 0.26751] }, { side: "L", inner: [-0.16533, 1.43063, 0.25408], outer: [-0.22551, 1.44885, 0.32512] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15229, 1.44923, 0.2675] }, { side: "L", inner: [-0.1656, 1.43075, 0.25131], outer: [-0.22573, 1.44903, 0.32237] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15228, 1.44924, 0.26748] }, { side: "L", inner: [-0.16586, 1.43087, 0.24853], outer: [-0.22595, 1.44921, 0.31962] }], [{ side: "R", inner: [0.24358, 1.42864, 0.30273], outer: [0.15611, 1.44815, 0.27163] }, { side: "L", inner: [-0.16933, 1.42988, 0.25212], outer: [-0.23031, 1.44689, 0.32277] }], [{ side: "R", inner: [0.24755, 1.42638, 0.30575], outer: [0.15995, 1.44704, 0.27577] }, { side: "L", inner: [-0.17281, 1.42887, 0.25571], outer: [-0.23468, 1.44455, 0.32591] }], [{ side: "R", inner: [0.26416, 1.41501, 0.31682], outer: [0.17627, 1.44029, 0.2916] }, { side: "L", inner: [-0.18757, 1.4226, 0.27017], outer: [-0.25286, 1.43269, 0.33825] }], [{ side: "R", inner: [0.28425, 1.40079, 0.32975], outer: [0.19651, 1.4314, 0.31061] }, { side: "L", inner: [-0.20587, 1.41446, 0.28768], outer: [-0.27489, 1.41772, 0.35268] }], [{ side: "R", inner: [0.31083, 1.37672, 0.34277], outer: [0.22419, 1.41389, 0.3322] }, { side: "L", inner: [-0.2309, 1.39829, 0.30747], outer: [-0.30411, 1.39231, 0.3675] }], [{ side: "R", inner: [0.3422, 1.34454, 0.35511], outer: [0.25818, 1.38858, 0.35533] }, { side: "L", inner: [-0.26171, 1.37501, 0.32881], outer: [-0.33867, 1.3581, 0.38163] }], [{ side: "R", inner: [0.37356, 1.30576, 0.36246], outer: [0.29382, 1.3557, 0.37466] }, { side: "L", inner: [-0.29402, 1.34482, 0.34671], outer: [-0.37336, 1.31664, 0.39041] }], [{ side: "R", inner: [0.4052, 1.25432, 0.36072], outer: [0.33205, 1.30883, 0.38675] }, { side: "L", inner: [-0.32867, 1.30159, 0.35783], outer: [-0.40858, 1.26155, 0.38964] }], [{ side: "R", inner: [0.43425, 1.20191, 0.35507], outer: [0.36934, 1.25859, 0.39474] }, { side: "L", inner: [-0.36268, 1.25544, 0.36566], outer: [-0.44091, 1.20506, 0.38416] }], [{ side: "R", inner: [0.45316, 1.14056, 0.33122], outer: [0.39814, 1.19643, 0.38461] }, { side: "L", inner: [-0.38861, 1.19808, 0.35622], outer: [-0.46269, 1.13891, 0.35962] }], [{ side: "R", inner: [0.47011, 1.0804, 0.30571], outer: [0.42604, 1.13265, 0.3715] }, { side: "L", inner: [-0.41421, 1.13918, 0.34471], outer: [-0.48194, 1.07388, 0.3325] }], [{ side: "R", inner: [0.4714, 1.02534, 0.26504], outer: [0.43799, 1.07107, 0.34116] }, { side: "L", inner: [-0.42472, 1.08235, 0.31673], outer: [-0.48468, 1.01407, 0.28947] }], [{ side: "R", inner: [0.46928, 0.97257, 0.22178], outer: [0.44655, 1.00948, 0.30617] }, { side: "L", inner: [-0.4325, 1.02521, 0.28484], outer: [-0.48333, 0.95684, 0.24311] }], [{ side: "R", inner: [0.45806, 0.93209, 0.17573], outer: [0.44434, 0.9591, 0.26563] }, { side: "L", inner: [-0.43023, 0.97852, 0.24763], outer: [-0.47216, 0.91267, 0.19373] }], [{ side: "R", inner: [0.44203, 0.89847, 0.12842], outer: [0.43614, 0.91479, 0.22169] }, { side: "L", inner: [-0.42251, 0.93727, 0.20725], outer: [-0.45566, 0.87598, 0.14287] }], [{ side: "R", inner: [0.42495, 0.87382, 0.08612], outer: [0.42515, 0.8801, 0.18078] }, { side: "L", inner: [-0.41232, 0.90483, 0.16966], outer: [-0.43778, 0.84909, 0.09724] }], [{ side: "R", inner: [0.40715, 0.85936, 0.05008], outer: [0.41158, 0.8571, 0.14482] }, { side: "L", inner: [-0.39964, 0.88333, 0.1365], outer: [-0.41908, 0.83312, 0.0584] }], [{ side: "R", inner: [0.39139, 0.84796, 0.01918], outer: [0.39907, 0.8382, 0.11323] }, { side: "L", inner: [-0.38807, 0.86549, 0.10739], outer: [-0.4024, 0.82067, 0.02501] }], [{ side: "R", inner: [0.38356, 0.84476, 544e-5], outer: [0.39248, 0.83167, 0.09897] }, { side: "L", inner: [-0.38192, 0.85935, 0.09423], outer: [-0.39412, 0.81708, 0.01018] }], [{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }]] }, elder_wings: { durations: { Draw: 0, Stow: 0, Swing: 1.8 }, windows: [{ side: "R", start: 0.18, end: 0.36 }, { side: "L", start: 0.36, end: 0.53 }], frames: [[{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }], [{ side: "R", inner: [0.38201, 0.84404, 267e-5], outer: [0.39117, 0.83029, 0.09609] }, { side: "L", inner: [-0.38071, 0.85804, 0.09157], outer: [-0.39247, 0.81629, 719e-5] }], [{ side: "R", inner: [0.3883, 0.84649, 0.01363], outer: [0.3965, 0.83538, 0.10748] }, { side: "L", inner: [-0.38567, 0.86284, 0.10209], outer: [-0.39913, 0.81904, 0.01902] }], [{ side: "R", inner: [0.40154, 0.85485, 0.03876], outer: [0.40721, 0.84985, 0.13333] }, { side: "L", inner: [-0.39561, 0.8765, 0.12592], outer: [-0.41315, 0.8282, 0.04617] }], [{ side: "R", inner: [0.41662, 0.86539, 0.06812], outer: [0.41906, 0.86738, 0.16294] }, { side: "L", inner: [-0.40666, 0.89292, 0.15323], outer: [-0.42903, 0.83986, 0.07783] }], [{ side: "R", inner: [0.43238, 0.88341, 0.1037], outer: [0.43016, 0.8939, 0.19796] }, { side: "L", inner: [-0.41696, 0.91775, 0.18545], outer: [-0.44558, 0.85955, 0.11622] }], [{ side: "R", inner: [0.44837, 0.90802, 0.14433], outer: [0.44012, 0.92788, 0.23672] }, { side: "L", inner: [-0.42628, 0.94944, 0.22111], outer: [-0.46221, 0.88646, 0.15994] }], [{ side: "R", inner: [0.46157, 0.93837, 0.18539], outer: [0.44624, 0.96742, 0.27439] }, { side: "L", inner: [-0.43209, 0.98617, 0.25572], outer: [-0.47572, 0.91963, 0.20405] }], [{ side: "R", inner: [0.46944, 0.97933, 0.22707], outer: [0.44541, 1.0174, 0.31058] }, { side: "L", inner: [-0.43142, 1.03262, 0.28884], outer: [-0.48343, 0.96411, 0.24881] }], [{ side: "R", inner: [0.47486, 1.02269, 0.26741], outer: [0.44183, 1.06838, 0.34371] }, { side: "L", inner: [-0.42849, 1.07972, 0.31935], outer: [-0.48819, 1.01135, 0.29176] }], [{ side: "R", inner: [0.46831, 1.07472, 0.29922], outer: [0.42529, 1.12633, 0.3662] }, { side: "L", inner: [-0.4133, 1.13338, 0.33962], outer: [-0.48031, 1.06766, 0.3258] }], [{ side: "R", inner: [0.46027, 1.12806, 0.33004], outer: [0.40767, 1.18349, 0.38626] }, { side: "L", inner: [-0.39754, 1.18616, 0.35815], outer: [-0.47039, 1.12539, 0.35815] }], [{ side: "R", inner: [0.44079, 1.18035, 0.34666], outer: [0.37909, 1.23707, 0.39111] }, { side: "L", inner: [-0.37141, 1.23553, 0.36216], outer: [-0.44848, 1.18188, 0.37562] }], [{ side: "R", inner: [0.41859, 1.23306, 0.36024], outer: [0.3488, 1.28883, 0.39217] }, { side: "L", inner: [-0.34396, 1.28328, 0.36308], outer: [-0.42343, 1.23861, 0.38932] }], [{ side: "R", inner: [0.39201, 1.27834, 0.36332], outer: [0.31569, 1.3311, 0.38312] }, { side: "L", inner: [-0.31388, 1.32215, 0.35455], outer: [-0.39382, 1.2873, 0.3919] }], [{ side: "R", inner: [0.36282, 1.31977, 0.36051], outer: [0.28142, 1.36783, 0.36851] }, { side: "L", inner: [-0.28277, 1.35596, 0.34099], outer: [-0.36148, 1.33164, 0.38803] }], [{ side: "R", inner: [0.33446, 1.35422, 0.35336], outer: [0.24963, 1.39662, 0.35076] }, { side: "L", inner: [-0.25397, 1.38247, 0.32466], outer: [-0.33012, 1.36837, 0.37945] }], [{ side: "R", inner: [0.3077, 1.37991, 0.34151], outer: [0.22088, 1.41633, 0.32987] }, { side: "L", inner: [-0.22791, 1.40055, 0.30535], outer: [-0.30067, 1.39569, 0.36603] }], [{ side: "R", inner: [0.28279, 1.4023, 0.3292], outer: [0.19503, 1.43255, 0.30962] }, { side: "L", inner: [-0.20452, 1.41555, 0.2868], outer: [-0.2733, 1.41931, 0.35202] }], [{ side: "R", inner: [0.26567, 1.41419, 0.31799], outer: [0.17777, 1.43989, 0.29322] }, { side: "L", inner: [-0.18892, 1.42225, 0.27167], outer: [-0.25451, 1.43183, 0.33954] }], [{ side: "R", inner: [0.24843, 1.42587, 0.30642], outer: [0.1608, 1.44679, 0.27669] }, { side: "L", inner: [-0.17359, 1.42864, 0.25651], outer: [-0.23565, 1.44402, 0.3266] }], [{ side: "R", inner: [0.24444, 1.42813, 0.30372], outer: [0.15693, 1.44788, 0.27287] }, { side: "L", inner: [-0.17012, 1.42966, 0.2527], outer: [-0.2313, 1.44638, 0.32325] }], [{ side: "R", inner: [0.24044, 1.43037, 0.301], outer: [0.15307, 1.44896, 0.26905] }, { side: "L", inner: [-0.16667, 1.43067, 0.24889], outer: [-0.22695, 1.44872, 0.31989] }], [{ side: "R", inner: [0.23922, 1.43066, 0.30486], outer: [0.15177, 1.44889, 0.27291] }, { side: "L", inner: [-0.16591, 1.43088, 0.24807], outer: [-0.226, 1.44923, 0.31914] }], [{ side: "R", inner: [0.23879, 1.4304, 0.31061], outer: [0.15121, 1.44851, 0.27896] }, { side: "L", inner: [-0.16591, 1.43087, 0.24809], outer: [-0.22602, 1.44922, 0.31915] }], [{ side: "R", inner: [0.23821, 1.42997, 0.31972], outer: [0.15037, 1.44786, 0.28868] }, { side: "L", inner: [-0.1659, 1.43086, 0.24812], outer: [-0.22604, 1.44919, 0.31917] }], [{ side: "R", inner: [0.23751, 1.4294, 0.3315], outer: [0.14931, 1.44701, 0.30132] }, { side: "L", inner: [-0.1659, 1.43084, 0.24817], outer: [-0.22608, 1.44917, 0.31919] }], [{ side: "R", inner: [0.23683, 1.42872, 0.34476], outer: [0.14819, 1.446, 0.31571] }, { side: "L", inner: [-0.1659, 1.43082, 0.24823], outer: [-0.22612, 1.44914, 0.31921] }], [{ side: "R", inner: [0.2362, 1.42783, 0.361], outer: [0.14695, 1.44467, 0.3336] }, { side: "L", inner: [-0.1659, 1.4308, 0.24829], outer: [-0.22617, 1.4491, 0.31924] }], [{ side: "R", inner: [0.2356, 1.42691, 0.37754], outer: [0.14575, 1.44327, 0.35187] }, { side: "L", inner: [-0.1659, 1.43077, 0.24836], outer: [-0.22622, 1.44906, 0.31926] }], [{ side: "R", inner: [0.23525, 1.42567, 0.39664], outer: [0.14462, 1.44145, 0.37346] }, { side: "L", inner: [-0.1659, 1.43074, 0.24844], outer: [-0.22628, 1.44902, 0.31929] }], [{ side: "R", inner: [0.23491, 1.42445, 0.41568], outer: [0.14357, 1.43958, 0.39499] }, { side: "L", inner: [-0.1659, 1.43071, 0.24852], outer: [-0.22634, 1.44897, 0.31933] }], [{ side: "R", inner: [0.23492, 1.42287, 0.43582], outer: [0.1428, 1.43728, 0.41829] }, { side: "L", inner: [-0.1659, 1.43068, 0.24861], outer: [-0.22641, 1.44892, 0.31936] }], [{ side: "R", inner: [0.23499, 1.42127, 0.45601], outer: [0.14219, 1.43484, 0.44173] }, { side: "L", inner: [-0.1659, 1.43065, 0.2487], outer: [-0.22648, 1.44888, 0.31939] }], [{ side: "R", inner: [0.23538, 1.41939, 0.47583], outer: [0.14196, 1.43207, 0.46521] }, { side: "L", inner: [-0.1659, 1.43062, 0.24878], outer: [-0.22655, 1.44883, 0.31943] }], [{ side: "R", inner: [0.23594, 1.41739, 0.49538], outer: [0.14203, 1.42905, 0.4886] }, { side: "L", inner: [-0.1659, 1.43058, 0.24887], outer: [-0.22661, 1.44878, 0.31946] }], [{ side: "R", inner: [0.23675, 1.4152, 0.5138], outer: [0.14251, 1.42578, 0.51106] }, { side: "L", inner: [-0.16591, 1.43055, 0.24895], outer: [-0.22668, 1.44874, 0.31949] }], [{ side: "R", inner: [0.23787, 1.41278, 0.53081], outer: [0.14348, 1.42218, 0.53234] }, { side: "L", inner: [-0.16591, 1.43053, 0.24903], outer: [-0.22674, 1.44869, 0.31952] }], [{ side: "R", inner: [0.23914, 1.41029, 0.54671], outer: [0.1448, 1.41839, 0.55254] }, { side: "L", inner: [-0.16588, 1.43048, 0.24943], outer: [-0.22678, 1.44863, 0.31987] }], [{ side: "R", inner: [0.24089, 1.40747, 0.55914], outer: [0.14683, 1.41425, 0.5695] }, { side: "L", inner: [-0.16573, 1.4304, 0.25096], outer: [-0.22671, 1.4485, 0.32134] }], [{ side: "R", inner: [0.24263, 1.40471, 0.57132], outer: [0.14908, 1.40997, 0.58612] }, { side: "L", inner: [-0.16559, 1.43031, 0.25248], outer: [-0.22664, 1.44836, 0.32281] }], [{ side: "R", inner: [0.24502, 1.40162, 0.57702], outer: [0.15223, 1.40549, 0.59637] }, { side: "L", inner: [-0.16496, 1.42999, 0.25893], outer: [-0.22622, 1.44789, 0.32913] }], [{ side: "R", inner: [0.24736, 1.39861, 0.58242], outer: [0.15555, 1.40088, 0.60621] }, { side: "L", inner: [-0.16434, 1.42968, 0.26538], outer: [-0.2258, 1.44742, 0.33544] }], [{ side: "R", inner: [0.24848, 1.39726, 0.58345], outer: [0.15718, 1.39881, 0.60919] }, { side: "L", inner: [-0.16344, 1.4292, 0.27518], outer: [-0.22527, 1.4467, 0.34497] }], [{ side: "R", inner: [0.24926, 1.39637, 0.58326], outer: [0.15832, 1.39747, 0.61024] }, { side: "L", inner: [-0.16246, 1.42867, 0.28594], outer: [-0.22471, 1.4459, 0.35542] }], [{ side: "R", inner: [0.24941, 1.39622, 0.58281], outer: [0.15852, 1.39724, 0.61] }, { side: "L", inner: [-0.16136, 1.42801, 0.29864], outer: [-0.22423, 1.44491, 0.36765] }], [{ side: "R", inner: [0.24905, 1.39666, 0.58216], outer: [0.15798, 1.3979, 0.60874] }, { side: "L", inner: [-0.16017, 1.42725, 0.31289], outer: [-0.2238, 1.44377, 0.3813] }], [{ side: "R", inner: [0.24835, 1.39751, 0.58095], outer: [0.15695, 1.3992, 0.60632] }, { side: "L", inner: [-0.15898, 1.42641, 0.32801], outer: [-0.22347, 1.4425, 0.3957] }], [{ side: "R", inner: [0.24697, 1.39922, 0.57859], outer: [0.15495, 1.40178, 0.60153] }, { side: "L", inner: [-0.15776, 1.42541, 0.34487], outer: [-0.22334, 1.441, 0.41162] }], [{ side: "R", inner: [0.24558, 1.40094, 0.57588], outer: [0.15301, 1.40433, 0.59634] }, { side: "L", inner: [-0.15657, 1.42437, 0.3619], outer: [-0.22328, 1.43946, 0.42765] }], [{ side: "R", inner: [0.24431, 1.40266, 0.57102], outer: [0.15124, 1.40695, 0.58891] }, { side: "L", inner: [-0.15546, 1.42314, 0.3804], outer: [-0.22356, 1.43757, 0.44486] }], [{ side: "R", inner: [0.24303, 1.40441, 0.56607], outer: [0.14954, 1.40954, 0.58134] }, { side: "L", inner: [-0.15441, 1.42186, 0.39886], outer: [-0.22387, 1.43568, 0.46199] }], [{ side: "R", inner: [0.24195, 1.40605, 0.55932], outer: [0.14813, 1.41202, 0.57203] }, { side: "L", inner: [-0.15355, 1.42038, 0.41787], outer: [-0.22459, 1.43342, 0.47938] }], [{ side: "R", inner: [0.24089, 1.40769, 0.55226], outer: [0.1468, 1.41446, 0.56241] }, { side: "L", inner: [-0.15279, 1.41883, 0.43689], outer: [-0.22539, 1.43112, 0.49671] }], [{ side: "R", inner: [0.23997, 1.40923, 0.54414], outer: [0.14571, 1.41679, 0.55178] }, { side: "L", inner: [-0.15227, 1.41712, 0.45556], outer: [-0.22655, 1.42853, 0.51346] }], [{ side: "R", inner: [0.23912, 1.41074, 0.53545], outer: [0.14476, 1.41904, 0.5406] }, { side: "L", inner: [-0.15193, 1.41529, 0.47399], outer: [-0.2279, 1.42579, 0.52983] }], [{ side: "R", inner: [0.23836, 1.41219, 0.52621], outer: [0.14396, 1.42121, 0.52891] }, { side: "L", inner: [-0.15183, 1.41334, 0.49162], outer: [-0.22951, 1.42286, 0.54524] }], [{ side: "R", inner: [0.23772, 1.41356, 0.51632], outer: [0.14336, 1.42328, 0.51662] }, { side: "L", inner: [-0.15203, 1.41124, 0.50824], outer: [-0.23145, 1.41968, 0.55943] }], [{ side: "R", inner: [0.23713, 1.41491, 0.5062], outer: [0.14285, 1.42528, 0.50414] }, { side: "L", inner: [-0.15243, 1.40904, 0.5241], outer: [-0.23355, 1.41642, 0.57273] }], [{ side: "R", inner: [0.23669, 1.41614, 0.4955], outer: [0.14256, 1.42715, 0.49119] }, { side: "L", inner: [-0.15326, 1.40668, 0.53762], outer: [-0.2361, 1.41282, 0.58345] }], [{ side: "R", inner: [0.23625, 1.41739, 0.48475], outer: [0.14232, 1.42899, 0.47816] }, { side: "L", inner: [-0.15422, 1.40424, 0.55097], outer: [-0.23867, 1.40926, 0.59389] }], [{ side: "R", inner: [0.23598, 1.4185, 0.47361], outer: [0.1423, 1.43068, 0.46492] }, { side: "L", inner: [-0.15574, 1.40172, 0.56003], outer: [-0.2418, 1.40537, 0.5998] }], [{ side: "R", inner: [0.23573, 1.41962, 0.46243], outer: [0.14234, 1.43234, 0.45163] }, { side: "L", inner: [-0.15738, 1.39911, 0.5689], outer: [-0.24491, 1.40153, 0.6054] }], [{ side: "R", inner: [0.23559, 1.42063, 0.45119], outer: [0.14252, 1.43387, 0.4384] }, { side: "L", inner: [-0.15844, 1.39764, 0.57283], outer: [-0.24676, 1.39934, 0.60743] }], [{ side: "R", inner: [0.2355, 1.42162, 0.4399], outer: [0.14279, 1.43535, 0.42518] }, { side: "L", inner: [-0.15934, 1.39649, 0.57534], outer: [-0.24824, 1.39763, 0.60844] }], [{ side: "R", inner: [0.23549, 1.42254, 0.42868], outer: [0.14315, 1.43673, 0.41214] }, { side: "L", inner: [-0.15974, 1.39598, 0.57673], outer: [-0.24889, 1.39688, 0.60915] }], [{ side: "R", inner: [0.23554, 1.42341, 0.4175], outer: [0.1436, 1.43803, 0.39924] }, { side: "L", inner: [-0.15973, 1.39598, 0.57722], outer: [-0.24888, 1.39688, 0.60965] }], [{ side: "R", inner: [0.23565, 1.42423, 0.40646], outer: [0.14412, 1.43926, 0.38656] }, { side: "L", inner: [-0.15945, 1.39633, 0.57713], outer: [-0.24843, 1.39738, 0.61001] }], [{ side: "R", inner: [0.23584, 1.42498, 0.39571], outer: [0.1447, 1.44038, 0.37433] }, { side: "L", inner: [-0.15862, 1.39735, 0.57586], outer: [-0.24708, 1.39892, 0.61009] }], [{ side: "R", inner: [0.23604, 1.42571, 0.38503], outer: [0.14532, 1.44147, 0.3622] }, { side: "L", inner: [-0.15774, 1.39848, 0.57412], outer: [-0.24561, 1.40061, 0.60982] }], [{ side: "R", inner: [0.23634, 1.42635, 0.37503], outer: [0.14599, 1.44243, 0.35097] }, { side: "L", inner: [-0.1564, 1.40047, 0.56887], outer: [-0.24318, 1.40354, 0.60709] }], [{ side: "R", inner: [0.23663, 1.42698, 0.36501], outer: [0.14668, 1.44338, 0.33973] }, { side: "L", inner: [-0.15512, 1.4024, 0.56351], outer: [-0.24074, 1.4065, 0.60418] }], [{ side: "R", inner: [0.23699, 1.42752, 0.35593], outer: [0.14737, 1.44419, 0.32964] }, { side: "L", inner: [-0.15413, 1.40434, 0.55562], outer: [-0.23853, 1.40935, 0.59865] }], [{ side: "R", inner: [0.23736, 1.42805, 0.34695], outer: [0.14808, 1.44498, 0.31968] }, { side: "L", inner: [-0.15324, 1.40622, 0.54733], outer: [-0.23637, 1.4122, 0.59264] }], [{ side: "R", inner: [0.23774, 1.42851, 0.33885], outer: [0.14876, 1.44567, 0.31077] }, { side: "L", inner: [-0.15258, 1.40804, 0.53747], outer: [-0.23442, 1.41492, 0.58496] }], [{ side: "R", inner: [0.23813, 1.42894, 0.33118], outer: [0.14942, 1.44631, 0.30238] }, { side: "L", inner: [-0.15208, 1.40981, 0.5268], outer: [-0.2326, 1.41757, 0.57636] }], [{ side: "R", inner: [0.23851, 1.42932, 0.32423], outer: [0.15005, 1.44688, 0.2948] }, { side: "L", inner: [-0.15174, 1.4115, 0.51529], outer: [-0.23092, 1.42011, 0.56683] }], [{ side: "R", inner: [0.23887, 1.42964, 0.31817], outer: [0.15061, 1.44737, 0.28824] }, { side: "L", inner: [-0.1516, 1.41311, 0.50278], outer: [-0.22944, 1.42252, 0.55618] }], [{ side: "R", inner: [0.23922, 1.42994, 0.31253], outer: [0.15114, 1.44781, 0.28214] }, { side: "L", inner: [-0.15157, 1.41467, 0.48993], outer: [-0.22805, 1.42489, 0.54513] }], [{ side: "R", inner: [0.23949, 1.43016, 0.30839], outer: [0.15155, 1.44814, 0.27767] }, { side: "L", inner: [-0.15175, 1.41612, 0.47613], outer: [-0.2269, 1.42704, 0.53299] }], [{ side: "R", inner: [0.23976, 1.43038, 0.30424], outer: [0.15195, 1.44847, 0.27321] }, { side: "L", inner: [-0.152, 1.41754, 0.46227], outer: [-0.22578, 1.42921, 0.52074] }], [{ side: "R", inner: [0.23987, 1.43049, 0.30232], outer: [0.15214, 1.44864, 0.27113] }, { side: "L", inner: [-0.15244, 1.41883, 0.44772], outer: [-0.22495, 1.43111, 0.50765] }], [{ side: "R", inner: [0.23999, 1.4306, 0.30041], outer: [0.15232, 1.4488, 0.26904] }, { side: "L", inner: [-0.15295, 1.42009, 0.43314], outer: [-0.22415, 1.43302, 0.49448] }], [{ side: "R", inner: [0.23999, 1.43064, 0.29991], outer: [0.15237, 1.44886, 0.26845] }, { side: "L", inner: [-0.15358, 1.42123, 0.41845], outer: [-0.22357, 1.43473, 0.48106] }], [{ side: "R", inner: [0.23997, 1.43067, 0.29981], outer: [0.15237, 1.4489, 0.26829] }, { side: "L", inner: [-0.15429, 1.42233, 0.40371], outer: [-0.22307, 1.43638, 0.46753] }], [{ side: "R", inner: [0.23993, 1.43069, 0.29976], outer: [0.15236, 1.44894, 0.26817] }, { side: "L", inner: [-0.15507, 1.42334, 0.38919], outer: [-0.22271, 1.4379, 0.4541] }], [{ side: "R", inner: [0.2399, 1.43071, 0.29976], outer: [0.15235, 1.44897, 0.2681] }, { side: "L", inner: [-0.15591, 1.42428, 0.37485], outer: [-0.22248, 1.43931, 0.44076] }], [{ side: "R", inner: [0.23987, 1.43073, 0.29975], outer: [0.15234, 1.449, 0.26803] }, { side: "L", inner: [-0.15679, 1.42516, 0.3608], outer: [-0.22233, 1.44064, 0.42762] }], [{ side: "R", inner: [0.23984, 1.43075, 0.29975], outer: [0.15234, 1.44902, 0.26797] }, { side: "L", inner: [-0.15771, 1.42596, 0.34735], outer: [-0.22234, 1.44182, 0.41495] }], [{ side: "R", inner: [0.2398, 1.43077, 0.29974], outer: [0.15233, 1.44905, 0.2679] }, { side: "L", inner: [-0.15864, 1.42672, 0.33403], outer: [-0.22239, 1.44298, 0.40239] }], [{ side: "R", inner: [0.23978, 1.43078, 0.29973], outer: [0.15232, 1.44908, 0.26784] }, { side: "L", inner: [-0.15956, 1.42737, 0.32192], outer: [-0.2226, 1.44395, 0.39085] }], [{ side: "R", inner: [0.23975, 1.4308, 0.29973], outer: [0.15232, 1.44911, 0.26778] }, { side: "L", inner: [-0.16049, 1.42801, 0.30981], outer: [-0.22283, 1.44491, 0.37929] }], [{ side: "R", inner: [0.23972, 1.43082, 0.29972], outer: [0.15231, 1.44913, 0.26773] }, { side: "L", inner: [-0.16135, 1.42853, 0.29927], outer: [-0.22317, 1.4457, 0.36915] }], [{ side: "R", inner: [0.2397, 1.43083, 0.29972], outer: [0.1523, 1.44915, 0.26768] }, { side: "L", inner: [-0.16221, 1.42904, 0.28892], outer: [-0.22354, 1.44646, 0.35917] }], [{ side: "R", inner: [0.23968, 1.43084, 0.29971], outer: [0.1523, 1.44917, 0.26764] }, { side: "L", inner: [-0.16298, 1.42946, 0.28001], outer: [-0.22395, 1.44709, 0.35053] }], [{ side: "R", inner: [0.23966, 1.43086, 0.29971], outer: [0.1523, 1.44919, 0.2676] }, { side: "L", inner: [-0.16371, 1.42984, 0.27183], outer: [-0.22438, 1.44766, 0.34255] }], [{ side: "R", inner: [0.23965, 1.43087, 0.29971], outer: [0.15229, 1.4492, 0.26756] }, { side: "L", inner: [-0.16434, 1.43016, 0.26476], outer: [-0.22479, 1.44814, 0.33563] }], [{ side: "R", inner: [0.23963, 1.43088, 0.2997], outer: [0.15229, 1.44922, 0.26754] }, { side: "L", inner: [-0.16487, 1.43041, 0.2591], outer: [-0.22517, 1.44852, 0.33006] }], [{ side: "R", inner: [0.23962, 1.43088, 0.2997], outer: [0.15229, 1.44923, 0.26751] }, { side: "L", inner: [-0.16533, 1.43063, 0.25408], outer: [-0.22551, 1.44885, 0.32512] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15229, 1.44923, 0.2675] }, { side: "L", inner: [-0.1656, 1.43075, 0.25131], outer: [-0.22573, 1.44903, 0.32237] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15228, 1.44924, 0.26748] }, { side: "L", inner: [-0.16586, 1.43087, 0.24853], outer: [-0.22595, 1.44921, 0.31962] }], [{ side: "R", inner: [0.24358, 1.42864, 0.30273], outer: [0.15611, 1.44815, 0.27163] }, { side: "L", inner: [-0.16933, 1.42988, 0.25212], outer: [-0.23031, 1.44689, 0.32277] }], [{ side: "R", inner: [0.24755, 1.42638, 0.30575], outer: [0.15995, 1.44704, 0.27577] }, { side: "L", inner: [-0.17281, 1.42887, 0.25571], outer: [-0.23468, 1.44455, 0.32591] }], [{ side: "R", inner: [0.26416, 1.41501, 0.31682], outer: [0.17627, 1.44029, 0.2916] }, { side: "L", inner: [-0.18757, 1.4226, 0.27017], outer: [-0.25286, 1.43269, 0.33825] }], [{ side: "R", inner: [0.28425, 1.40079, 0.32975], outer: [0.19651, 1.4314, 0.31061] }, { side: "L", inner: [-0.20587, 1.41446, 0.28768], outer: [-0.27489, 1.41772, 0.35268] }], [{ side: "R", inner: [0.31083, 1.37672, 0.34277], outer: [0.22419, 1.41389, 0.3322] }, { side: "L", inner: [-0.2309, 1.39829, 0.30747], outer: [-0.30411, 1.39231, 0.3675] }], [{ side: "R", inner: [0.3422, 1.34454, 0.35511], outer: [0.25818, 1.38858, 0.35533] }, { side: "L", inner: [-0.26171, 1.37501, 0.32881], outer: [-0.33867, 1.3581, 0.38163] }], [{ side: "R", inner: [0.37356, 1.30576, 0.36246], outer: [0.29382, 1.3557, 0.37466] }, { side: "L", inner: [-0.29402, 1.34482, 0.34671], outer: [-0.37336, 1.31664, 0.39041] }], [{ side: "R", inner: [0.4052, 1.25432, 0.36072], outer: [0.33205, 1.30883, 0.38675] }, { side: "L", inner: [-0.32867, 1.30159, 0.35783], outer: [-0.40858, 1.26155, 0.38964] }], [{ side: "R", inner: [0.43425, 1.20191, 0.35507], outer: [0.36934, 1.25859, 0.39474] }, { side: "L", inner: [-0.36268, 1.25544, 0.36566], outer: [-0.44091, 1.20506, 0.38416] }], [{ side: "R", inner: [0.45316, 1.14056, 0.33122], outer: [0.39814, 1.19643, 0.38461] }, { side: "L", inner: [-0.38861, 1.19808, 0.35622], outer: [-0.46269, 1.13891, 0.35962] }], [{ side: "R", inner: [0.47011, 1.0804, 0.30571], outer: [0.42604, 1.13265, 0.3715] }, { side: "L", inner: [-0.41421, 1.13918, 0.34471], outer: [-0.48194, 1.07388, 0.3325] }], [{ side: "R", inner: [0.4714, 1.02534, 0.26504], outer: [0.43799, 1.07107, 0.34116] }, { side: "L", inner: [-0.42472, 1.08235, 0.31673], outer: [-0.48468, 1.01407, 0.28947] }], [{ side: "R", inner: [0.46928, 0.97257, 0.22178], outer: [0.44655, 1.00948, 0.30617] }, { side: "L", inner: [-0.4325, 1.02521, 0.28484], outer: [-0.48333, 0.95684, 0.24311] }], [{ side: "R", inner: [0.45806, 0.93209, 0.17573], outer: [0.44434, 0.9591, 0.26563] }, { side: "L", inner: [-0.43023, 0.97852, 0.24763], outer: [-0.47216, 0.91267, 0.19373] }], [{ side: "R", inner: [0.44203, 0.89847, 0.12842], outer: [0.43614, 0.91479, 0.22169] }, { side: "L", inner: [-0.42251, 0.93727, 0.20725], outer: [-0.45566, 0.87598, 0.14287] }], [{ side: "R", inner: [0.42495, 0.87382, 0.08612], outer: [0.42515, 0.8801, 0.18078] }, { side: "L", inner: [-0.41232, 0.90483, 0.16966], outer: [-0.43778, 0.84909, 0.09724] }], [{ side: "R", inner: [0.40715, 0.85936, 0.05008], outer: [0.41158, 0.8571, 0.14482] }, { side: "L", inner: [-0.39964, 0.88333, 0.1365], outer: [-0.41908, 0.83312, 0.0584] }], [{ side: "R", inner: [0.39139, 0.84796, 0.01918], outer: [0.39907, 0.8382, 0.11323] }, { side: "L", inner: [-0.38807, 0.86549, 0.10739], outer: [-0.4024, 0.82067, 0.02501] }], [{ side: "R", inner: [0.38356, 0.84476, 544e-5], outer: [0.39248, 0.83167, 0.09897] }, { side: "L", inner: [-0.38192, 0.85935, 0.09423], outer: [-0.39412, 0.81708, 0.01018] }], [{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }]] }, chameleon_wings: { durations: { Draw: 0, Stow: 0, Swing: 1.8 }, windows: [{ side: "R", start: 0.18, end: 0.36 }, { side: "L", start: 0.36, end: 0.53 }], frames: [[{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }], [{ side: "R", inner: [0.38201, 0.84404, 267e-5], outer: [0.39117, 0.83029, 0.09609] }, { side: "L", inner: [-0.38071, 0.85804, 0.09157], outer: [-0.39247, 0.81629, 719e-5] }], [{ side: "R", inner: [0.3883, 0.84649, 0.01363], outer: [0.3965, 0.83538, 0.10748] }, { side: "L", inner: [-0.38567, 0.86284, 0.10209], outer: [-0.39913, 0.81904, 0.01902] }], [{ side: "R", inner: [0.40154, 0.85485, 0.03876], outer: [0.40721, 0.84985, 0.13333] }, { side: "L", inner: [-0.39561, 0.8765, 0.12592], outer: [-0.41315, 0.8282, 0.04617] }], [{ side: "R", inner: [0.41662, 0.86539, 0.06812], outer: [0.41906, 0.86738, 0.16294] }, { side: "L", inner: [-0.40666, 0.89292, 0.15323], outer: [-0.42903, 0.83986, 0.07783] }], [{ side: "R", inner: [0.43238, 0.88341, 0.1037], outer: [0.43016, 0.8939, 0.19796] }, { side: "L", inner: [-0.41696, 0.91775, 0.18545], outer: [-0.44558, 0.85955, 0.11622] }], [{ side: "R", inner: [0.44837, 0.90802, 0.14433], outer: [0.44012, 0.92788, 0.23672] }, { side: "L", inner: [-0.42628, 0.94944, 0.22111], outer: [-0.46221, 0.88646, 0.15994] }], [{ side: "R", inner: [0.46157, 0.93837, 0.18539], outer: [0.44624, 0.96742, 0.27439] }, { side: "L", inner: [-0.43209, 0.98617, 0.25572], outer: [-0.47572, 0.91963, 0.20405] }], [{ side: "R", inner: [0.46944, 0.97933, 0.22707], outer: [0.44541, 1.0174, 0.31058] }, { side: "L", inner: [-0.43142, 1.03262, 0.28884], outer: [-0.48343, 0.96411, 0.24881] }], [{ side: "R", inner: [0.47486, 1.02269, 0.26741], outer: [0.44183, 1.06838, 0.34371] }, { side: "L", inner: [-0.42849, 1.07972, 0.31935], outer: [-0.48819, 1.01135, 0.29176] }], [{ side: "R", inner: [0.46831, 1.07472, 0.29922], outer: [0.42529, 1.12633, 0.3662] }, { side: "L", inner: [-0.4133, 1.13338, 0.33962], outer: [-0.48031, 1.06766, 0.3258] }], [{ side: "R", inner: [0.46027, 1.12806, 0.33004], outer: [0.40767, 1.18349, 0.38626] }, { side: "L", inner: [-0.39754, 1.18616, 0.35815], outer: [-0.47039, 1.12539, 0.35815] }], [{ side: "R", inner: [0.44079, 1.18035, 0.34666], outer: [0.37909, 1.23707, 0.39111] }, { side: "L", inner: [-0.37141, 1.23553, 0.36216], outer: [-0.44848, 1.18188, 0.37562] }], [{ side: "R", inner: [0.41859, 1.23306, 0.36024], outer: [0.3488, 1.28883, 0.39217] }, { side: "L", inner: [-0.34396, 1.28328, 0.36308], outer: [-0.42343, 1.23861, 0.38932] }], [{ side: "R", inner: [0.39201, 1.27834, 0.36332], outer: [0.31569, 1.3311, 0.38312] }, { side: "L", inner: [-0.31388, 1.32215, 0.35455], outer: [-0.39382, 1.2873, 0.3919] }], [{ side: "R", inner: [0.36282, 1.31977, 0.36051], outer: [0.28142, 1.36783, 0.36851] }, { side: "L", inner: [-0.28277, 1.35596, 0.34099], outer: [-0.36148, 1.33164, 0.38803] }], [{ side: "R", inner: [0.33446, 1.35422, 0.35336], outer: [0.24963, 1.39662, 0.35076] }, { side: "L", inner: [-0.25397, 1.38247, 0.32466], outer: [-0.33012, 1.36837, 0.37945] }], [{ side: "R", inner: [0.3077, 1.37991, 0.34151], outer: [0.22088, 1.41633, 0.32987] }, { side: "L", inner: [-0.22791, 1.40055, 0.30535], outer: [-0.30067, 1.39569, 0.36603] }], [{ side: "R", inner: [0.28279, 1.4023, 0.3292], outer: [0.19503, 1.43255, 0.30962] }, { side: "L", inner: [-0.20452, 1.41555, 0.2868], outer: [-0.2733, 1.41931, 0.35202] }], [{ side: "R", inner: [0.26567, 1.41419, 0.31799], outer: [0.17777, 1.43989, 0.29322] }, { side: "L", inner: [-0.18892, 1.42225, 0.27167], outer: [-0.25451, 1.43183, 0.33954] }], [{ side: "R", inner: [0.24843, 1.42587, 0.30642], outer: [0.1608, 1.44679, 0.27669] }, { side: "L", inner: [-0.17359, 1.42864, 0.25651], outer: [-0.23565, 1.44402, 0.3266] }], [{ side: "R", inner: [0.24444, 1.42813, 0.30372], outer: [0.15693, 1.44788, 0.27287] }, { side: "L", inner: [-0.17012, 1.42966, 0.2527], outer: [-0.2313, 1.44638, 0.32325] }], [{ side: "R", inner: [0.24044, 1.43037, 0.301], outer: [0.15307, 1.44896, 0.26905] }, { side: "L", inner: [-0.16667, 1.43067, 0.24889], outer: [-0.22695, 1.44872, 0.31989] }], [{ side: "R", inner: [0.23922, 1.43066, 0.30486], outer: [0.15177, 1.44889, 0.27291] }, { side: "L", inner: [-0.16591, 1.43088, 0.24807], outer: [-0.226, 1.44923, 0.31914] }], [{ side: "R", inner: [0.23879, 1.4304, 0.31061], outer: [0.15121, 1.44851, 0.27896] }, { side: "L", inner: [-0.16591, 1.43087, 0.24809], outer: [-0.22602, 1.44922, 0.31915] }], [{ side: "R", inner: [0.23821, 1.42997, 0.31972], outer: [0.15037, 1.44786, 0.28868] }, { side: "L", inner: [-0.1659, 1.43086, 0.24812], outer: [-0.22604, 1.44919, 0.31917] }], [{ side: "R", inner: [0.23751, 1.4294, 0.3315], outer: [0.14931, 1.44701, 0.30132] }, { side: "L", inner: [-0.1659, 1.43084, 0.24817], outer: [-0.22608, 1.44917, 0.31919] }], [{ side: "R", inner: [0.23683, 1.42872, 0.34476], outer: [0.14819, 1.446, 0.31571] }, { side: "L", inner: [-0.1659, 1.43082, 0.24823], outer: [-0.22612, 1.44914, 0.31921] }], [{ side: "R", inner: [0.2362, 1.42783, 0.361], outer: [0.14695, 1.44467, 0.3336] }, { side: "L", inner: [-0.1659, 1.4308, 0.24829], outer: [-0.22617, 1.4491, 0.31924] }], [{ side: "R", inner: [0.2356, 1.42691, 0.37754], outer: [0.14575, 1.44327, 0.35187] }, { side: "L", inner: [-0.1659, 1.43077, 0.24836], outer: [-0.22622, 1.44906, 0.31926] }], [{ side: "R", inner: [0.23525, 1.42567, 0.39664], outer: [0.14462, 1.44145, 0.37346] }, { side: "L", inner: [-0.1659, 1.43074, 0.24844], outer: [-0.22628, 1.44902, 0.31929] }], [{ side: "R", inner: [0.23491, 1.42445, 0.41568], outer: [0.14357, 1.43958, 0.39499] }, { side: "L", inner: [-0.1659, 1.43071, 0.24852], outer: [-0.22634, 1.44897, 0.31933] }], [{ side: "R", inner: [0.23492, 1.42287, 0.43582], outer: [0.1428, 1.43728, 0.41829] }, { side: "L", inner: [-0.1659, 1.43068, 0.24861], outer: [-0.22641, 1.44892, 0.31936] }], [{ side: "R", inner: [0.23499, 1.42127, 0.45601], outer: [0.14219, 1.43484, 0.44173] }, { side: "L", inner: [-0.1659, 1.43065, 0.2487], outer: [-0.22648, 1.44888, 0.31939] }], [{ side: "R", inner: [0.23538, 1.41939, 0.47583], outer: [0.14196, 1.43207, 0.46521] }, { side: "L", inner: [-0.1659, 1.43062, 0.24878], outer: [-0.22655, 1.44883, 0.31943] }], [{ side: "R", inner: [0.23594, 1.41739, 0.49538], outer: [0.14203, 1.42905, 0.4886] }, { side: "L", inner: [-0.1659, 1.43058, 0.24887], outer: [-0.22661, 1.44878, 0.31946] }], [{ side: "R", inner: [0.23675, 1.4152, 0.5138], outer: [0.14251, 1.42578, 0.51106] }, { side: "L", inner: [-0.16591, 1.43055, 0.24895], outer: [-0.22668, 1.44874, 0.31949] }], [{ side: "R", inner: [0.23787, 1.41278, 0.53081], outer: [0.14348, 1.42218, 0.53234] }, { side: "L", inner: [-0.16591, 1.43053, 0.24903], outer: [-0.22674, 1.44869, 0.31952] }], [{ side: "R", inner: [0.23914, 1.41029, 0.54671], outer: [0.1448, 1.41839, 0.55254] }, { side: "L", inner: [-0.16588, 1.43048, 0.24943], outer: [-0.22678, 1.44863, 0.31987] }], [{ side: "R", inner: [0.24089, 1.40747, 0.55914], outer: [0.14683, 1.41425, 0.5695] }, { side: "L", inner: [-0.16573, 1.4304, 0.25096], outer: [-0.22671, 1.4485, 0.32134] }], [{ side: "R", inner: [0.24263, 1.40471, 0.57132], outer: [0.14908, 1.40997, 0.58612] }, { side: "L", inner: [-0.16559, 1.43031, 0.25248], outer: [-0.22664, 1.44836, 0.32281] }], [{ side: "R", inner: [0.24502, 1.40162, 0.57702], outer: [0.15223, 1.40549, 0.59637] }, { side: "L", inner: [-0.16496, 1.42999, 0.25893], outer: [-0.22622, 1.44789, 0.32913] }], [{ side: "R", inner: [0.24736, 1.39861, 0.58242], outer: [0.15555, 1.40088, 0.60621] }, { side: "L", inner: [-0.16434, 1.42968, 0.26538], outer: [-0.2258, 1.44742, 0.33544] }], [{ side: "R", inner: [0.24848, 1.39726, 0.58345], outer: [0.15718, 1.39881, 0.60919] }, { side: "L", inner: [-0.16344, 1.4292, 0.27518], outer: [-0.22527, 1.4467, 0.34497] }], [{ side: "R", inner: [0.24926, 1.39637, 0.58326], outer: [0.15832, 1.39747, 0.61024] }, { side: "L", inner: [-0.16246, 1.42867, 0.28594], outer: [-0.22471, 1.4459, 0.35542] }], [{ side: "R", inner: [0.24941, 1.39622, 0.58281], outer: [0.15852, 1.39724, 0.61] }, { side: "L", inner: [-0.16136, 1.42801, 0.29864], outer: [-0.22423, 1.44491, 0.36765] }], [{ side: "R", inner: [0.24905, 1.39666, 0.58216], outer: [0.15798, 1.3979, 0.60874] }, { side: "L", inner: [-0.16017, 1.42725, 0.31289], outer: [-0.2238, 1.44377, 0.3813] }], [{ side: "R", inner: [0.24835, 1.39751, 0.58095], outer: [0.15695, 1.3992, 0.60632] }, { side: "L", inner: [-0.15898, 1.42641, 0.32801], outer: [-0.22347, 1.4425, 0.3957] }], [{ side: "R", inner: [0.24697, 1.39922, 0.57859], outer: [0.15495, 1.40178, 0.60153] }, { side: "L", inner: [-0.15776, 1.42541, 0.34487], outer: [-0.22334, 1.441, 0.41162] }], [{ side: "R", inner: [0.24558, 1.40094, 0.57588], outer: [0.15301, 1.40433, 0.59634] }, { side: "L", inner: [-0.15657, 1.42437, 0.3619], outer: [-0.22328, 1.43946, 0.42765] }], [{ side: "R", inner: [0.24431, 1.40266, 0.57102], outer: [0.15124, 1.40695, 0.58891] }, { side: "L", inner: [-0.15546, 1.42314, 0.3804], outer: [-0.22356, 1.43757, 0.44486] }], [{ side: "R", inner: [0.24303, 1.40441, 0.56607], outer: [0.14954, 1.40954, 0.58134] }, { side: "L", inner: [-0.15441, 1.42186, 0.39886], outer: [-0.22387, 1.43568, 0.46199] }], [{ side: "R", inner: [0.24195, 1.40605, 0.55932], outer: [0.14813, 1.41202, 0.57203] }, { side: "L", inner: [-0.15355, 1.42038, 0.41787], outer: [-0.22459, 1.43342, 0.47938] }], [{ side: "R", inner: [0.24089, 1.40769, 0.55226], outer: [0.1468, 1.41446, 0.56241] }, { side: "L", inner: [-0.15279, 1.41883, 0.43689], outer: [-0.22539, 1.43112, 0.49671] }], [{ side: "R", inner: [0.23997, 1.40923, 0.54414], outer: [0.14571, 1.41679, 0.55178] }, { side: "L", inner: [-0.15227, 1.41712, 0.45556], outer: [-0.22655, 1.42853, 0.51346] }], [{ side: "R", inner: [0.23912, 1.41074, 0.53545], outer: [0.14476, 1.41904, 0.5406] }, { side: "L", inner: [-0.15193, 1.41529, 0.47399], outer: [-0.2279, 1.42579, 0.52983] }], [{ side: "R", inner: [0.23836, 1.41219, 0.52621], outer: [0.14396, 1.42121, 0.52891] }, { side: "L", inner: [-0.15183, 1.41334, 0.49162], outer: [-0.22951, 1.42286, 0.54524] }], [{ side: "R", inner: [0.23772, 1.41356, 0.51632], outer: [0.14336, 1.42328, 0.51662] }, { side: "L", inner: [-0.15203, 1.41124, 0.50824], outer: [-0.23145, 1.41968, 0.55943] }], [{ side: "R", inner: [0.23713, 1.41491, 0.5062], outer: [0.14285, 1.42528, 0.50414] }, { side: "L", inner: [-0.15243, 1.40904, 0.5241], outer: [-0.23355, 1.41642, 0.57273] }], [{ side: "R", inner: [0.23669, 1.41614, 0.4955], outer: [0.14256, 1.42715, 0.49119] }, { side: "L", inner: [-0.15326, 1.40668, 0.53762], outer: [-0.2361, 1.41282, 0.58345] }], [{ side: "R", inner: [0.23625, 1.41739, 0.48475], outer: [0.14232, 1.42899, 0.47816] }, { side: "L", inner: [-0.15422, 1.40424, 0.55097], outer: [-0.23867, 1.40926, 0.59389] }], [{ side: "R", inner: [0.23598, 1.4185, 0.47361], outer: [0.1423, 1.43068, 0.46492] }, { side: "L", inner: [-0.15574, 1.40172, 0.56003], outer: [-0.2418, 1.40537, 0.5998] }], [{ side: "R", inner: [0.23573, 1.41962, 0.46243], outer: [0.14234, 1.43234, 0.45163] }, { side: "L", inner: [-0.15738, 1.39911, 0.5689], outer: [-0.24491, 1.40153, 0.6054] }], [{ side: "R", inner: [0.23559, 1.42063, 0.45119], outer: [0.14252, 1.43387, 0.4384] }, { side: "L", inner: [-0.15844, 1.39764, 0.57283], outer: [-0.24676, 1.39934, 0.60743] }], [{ side: "R", inner: [0.2355, 1.42162, 0.4399], outer: [0.14279, 1.43535, 0.42518] }, { side: "L", inner: [-0.15934, 1.39649, 0.57534], outer: [-0.24824, 1.39763, 0.60844] }], [{ side: "R", inner: [0.23549, 1.42254, 0.42868], outer: [0.14315, 1.43673, 0.41214] }, { side: "L", inner: [-0.15974, 1.39598, 0.57673], outer: [-0.24889, 1.39688, 0.60915] }], [{ side: "R", inner: [0.23554, 1.42341, 0.4175], outer: [0.1436, 1.43803, 0.39924] }, { side: "L", inner: [-0.15973, 1.39598, 0.57722], outer: [-0.24888, 1.39688, 0.60965] }], [{ side: "R", inner: [0.23565, 1.42423, 0.40646], outer: [0.14412, 1.43926, 0.38656] }, { side: "L", inner: [-0.15945, 1.39633, 0.57713], outer: [-0.24843, 1.39738, 0.61001] }], [{ side: "R", inner: [0.23584, 1.42498, 0.39571], outer: [0.1447, 1.44038, 0.37433] }, { side: "L", inner: [-0.15862, 1.39735, 0.57586], outer: [-0.24708, 1.39892, 0.61009] }], [{ side: "R", inner: [0.23604, 1.42571, 0.38503], outer: [0.14532, 1.44147, 0.3622] }, { side: "L", inner: [-0.15774, 1.39848, 0.57412], outer: [-0.24561, 1.40061, 0.60982] }], [{ side: "R", inner: [0.23634, 1.42635, 0.37503], outer: [0.14599, 1.44243, 0.35097] }, { side: "L", inner: [-0.1564, 1.40047, 0.56887], outer: [-0.24318, 1.40354, 0.60709] }], [{ side: "R", inner: [0.23663, 1.42698, 0.36501], outer: [0.14668, 1.44338, 0.33973] }, { side: "L", inner: [-0.15512, 1.4024, 0.56351], outer: [-0.24074, 1.4065, 0.60418] }], [{ side: "R", inner: [0.23699, 1.42752, 0.35593], outer: [0.14737, 1.44419, 0.32964] }, { side: "L", inner: [-0.15413, 1.40434, 0.55562], outer: [-0.23853, 1.40935, 0.59865] }], [{ side: "R", inner: [0.23736, 1.42805, 0.34695], outer: [0.14808, 1.44498, 0.31968] }, { side: "L", inner: [-0.15324, 1.40622, 0.54733], outer: [-0.23637, 1.4122, 0.59264] }], [{ side: "R", inner: [0.23774, 1.42851, 0.33885], outer: [0.14876, 1.44567, 0.31077] }, { side: "L", inner: [-0.15258, 1.40804, 0.53747], outer: [-0.23442, 1.41492, 0.58496] }], [{ side: "R", inner: [0.23813, 1.42894, 0.33118], outer: [0.14942, 1.44631, 0.30238] }, { side: "L", inner: [-0.15208, 1.40981, 0.5268], outer: [-0.2326, 1.41757, 0.57636] }], [{ side: "R", inner: [0.23851, 1.42932, 0.32423], outer: [0.15005, 1.44688, 0.2948] }, { side: "L", inner: [-0.15174, 1.4115, 0.51529], outer: [-0.23092, 1.42011, 0.56683] }], [{ side: "R", inner: [0.23887, 1.42964, 0.31817], outer: [0.15061, 1.44737, 0.28824] }, { side: "L", inner: [-0.1516, 1.41311, 0.50278], outer: [-0.22944, 1.42252, 0.55618] }], [{ side: "R", inner: [0.23922, 1.42994, 0.31253], outer: [0.15114, 1.44781, 0.28214] }, { side: "L", inner: [-0.15157, 1.41467, 0.48993], outer: [-0.22805, 1.42489, 0.54513] }], [{ side: "R", inner: [0.23949, 1.43016, 0.30839], outer: [0.15155, 1.44814, 0.27767] }, { side: "L", inner: [-0.15175, 1.41612, 0.47613], outer: [-0.2269, 1.42704, 0.53299] }], [{ side: "R", inner: [0.23976, 1.43038, 0.30424], outer: [0.15195, 1.44847, 0.27321] }, { side: "L", inner: [-0.152, 1.41754, 0.46227], outer: [-0.22578, 1.42921, 0.52074] }], [{ side: "R", inner: [0.23987, 1.43049, 0.30232], outer: [0.15214, 1.44864, 0.27113] }, { side: "L", inner: [-0.15244, 1.41883, 0.44772], outer: [-0.22495, 1.43111, 0.50765] }], [{ side: "R", inner: [0.23999, 1.4306, 0.30041], outer: [0.15232, 1.4488, 0.26904] }, { side: "L", inner: [-0.15295, 1.42009, 0.43314], outer: [-0.22415, 1.43302, 0.49448] }], [{ side: "R", inner: [0.23999, 1.43064, 0.29991], outer: [0.15237, 1.44886, 0.26845] }, { side: "L", inner: [-0.15358, 1.42123, 0.41845], outer: [-0.22357, 1.43473, 0.48106] }], [{ side: "R", inner: [0.23997, 1.43067, 0.29981], outer: [0.15237, 1.4489, 0.26829] }, { side: "L", inner: [-0.15429, 1.42233, 0.40371], outer: [-0.22307, 1.43638, 0.46753] }], [{ side: "R", inner: [0.23993, 1.43069, 0.29976], outer: [0.15236, 1.44894, 0.26817] }, { side: "L", inner: [-0.15507, 1.42334, 0.38919], outer: [-0.22271, 1.4379, 0.4541] }], [{ side: "R", inner: [0.2399, 1.43071, 0.29976], outer: [0.15235, 1.44897, 0.2681] }, { side: "L", inner: [-0.15591, 1.42428, 0.37485], outer: [-0.22248, 1.43931, 0.44076] }], [{ side: "R", inner: [0.23987, 1.43073, 0.29975], outer: [0.15234, 1.449, 0.26803] }, { side: "L", inner: [-0.15679, 1.42516, 0.3608], outer: [-0.22233, 1.44064, 0.42762] }], [{ side: "R", inner: [0.23984, 1.43075, 0.29975], outer: [0.15234, 1.44902, 0.26797] }, { side: "L", inner: [-0.15771, 1.42596, 0.34735], outer: [-0.22234, 1.44182, 0.41495] }], [{ side: "R", inner: [0.2398, 1.43077, 0.29974], outer: [0.15233, 1.44905, 0.2679] }, { side: "L", inner: [-0.15864, 1.42672, 0.33403], outer: [-0.22239, 1.44298, 0.40239] }], [{ side: "R", inner: [0.23978, 1.43078, 0.29973], outer: [0.15232, 1.44908, 0.26784] }, { side: "L", inner: [-0.15956, 1.42737, 0.32192], outer: [-0.2226, 1.44395, 0.39085] }], [{ side: "R", inner: [0.23975, 1.4308, 0.29973], outer: [0.15232, 1.44911, 0.26778] }, { side: "L", inner: [-0.16049, 1.42801, 0.30981], outer: [-0.22283, 1.44491, 0.37929] }], [{ side: "R", inner: [0.23972, 1.43082, 0.29972], outer: [0.15231, 1.44913, 0.26773] }, { side: "L", inner: [-0.16135, 1.42853, 0.29927], outer: [-0.22317, 1.4457, 0.36915] }], [{ side: "R", inner: [0.2397, 1.43083, 0.29972], outer: [0.1523, 1.44915, 0.26768] }, { side: "L", inner: [-0.16221, 1.42904, 0.28892], outer: [-0.22354, 1.44646, 0.35917] }], [{ side: "R", inner: [0.23968, 1.43084, 0.29971], outer: [0.1523, 1.44917, 0.26764] }, { side: "L", inner: [-0.16298, 1.42946, 0.28001], outer: [-0.22395, 1.44709, 0.35053] }], [{ side: "R", inner: [0.23966, 1.43086, 0.29971], outer: [0.1523, 1.44919, 0.2676] }, { side: "L", inner: [-0.16371, 1.42984, 0.27183], outer: [-0.22438, 1.44766, 0.34255] }], [{ side: "R", inner: [0.23965, 1.43087, 0.29971], outer: [0.15229, 1.4492, 0.26756] }, { side: "L", inner: [-0.16434, 1.43016, 0.26476], outer: [-0.22479, 1.44814, 0.33563] }], [{ side: "R", inner: [0.23963, 1.43088, 0.2997], outer: [0.15229, 1.44922, 0.26754] }, { side: "L", inner: [-0.16487, 1.43041, 0.2591], outer: [-0.22517, 1.44852, 0.33006] }], [{ side: "R", inner: [0.23962, 1.43088, 0.2997], outer: [0.15229, 1.44923, 0.26751] }, { side: "L", inner: [-0.16533, 1.43063, 0.25408], outer: [-0.22551, 1.44885, 0.32512] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15229, 1.44923, 0.2675] }, { side: "L", inner: [-0.1656, 1.43075, 0.25131], outer: [-0.22573, 1.44903, 0.32237] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15228, 1.44924, 0.26748] }, { side: "L", inner: [-0.16586, 1.43087, 0.24853], outer: [-0.22595, 1.44921, 0.31962] }], [{ side: "R", inner: [0.24358, 1.42864, 0.30273], outer: [0.15611, 1.44815, 0.27163] }, { side: "L", inner: [-0.16933, 1.42988, 0.25212], outer: [-0.23031, 1.44689, 0.32277] }], [{ side: "R", inner: [0.24755, 1.42638, 0.30575], outer: [0.15995, 1.44704, 0.27577] }, { side: "L", inner: [-0.17281, 1.42887, 0.25571], outer: [-0.23468, 1.44455, 0.32591] }], [{ side: "R", inner: [0.26416, 1.41501, 0.31682], outer: [0.17627, 1.44029, 0.2916] }, { side: "L", inner: [-0.18757, 1.4226, 0.27017], outer: [-0.25286, 1.43269, 0.33825] }], [{ side: "R", inner: [0.28425, 1.40079, 0.32975], outer: [0.19651, 1.4314, 0.31061] }, { side: "L", inner: [-0.20587, 1.41446, 0.28768], outer: [-0.27489, 1.41772, 0.35268] }], [{ side: "R", inner: [0.31083, 1.37672, 0.34277], outer: [0.22419, 1.41389, 0.3322] }, { side: "L", inner: [-0.2309, 1.39829, 0.30747], outer: [-0.30411, 1.39231, 0.3675] }], [{ side: "R", inner: [0.3422, 1.34454, 0.35511], outer: [0.25818, 1.38858, 0.35533] }, { side: "L", inner: [-0.26171, 1.37501, 0.32881], outer: [-0.33867, 1.3581, 0.38163] }], [{ side: "R", inner: [0.37356, 1.30576, 0.36246], outer: [0.29382, 1.3557, 0.37466] }, { side: "L", inner: [-0.29402, 1.34482, 0.34671], outer: [-0.37336, 1.31664, 0.39041] }], [{ side: "R", inner: [0.4052, 1.25432, 0.36072], outer: [0.33205, 1.30883, 0.38675] }, { side: "L", inner: [-0.32867, 1.30159, 0.35783], outer: [-0.40858, 1.26155, 0.38964] }], [{ side: "R", inner: [0.43425, 1.20191, 0.35507], outer: [0.36934, 1.25859, 0.39474] }, { side: "L", inner: [-0.36268, 1.25544, 0.36566], outer: [-0.44091, 1.20506, 0.38416] }], [{ side: "R", inner: [0.45316, 1.14056, 0.33122], outer: [0.39814, 1.19643, 0.38461] }, { side: "L", inner: [-0.38861, 1.19808, 0.35622], outer: [-0.46269, 1.13891, 0.35962] }], [{ side: "R", inner: [0.47011, 1.0804, 0.30571], outer: [0.42604, 1.13265, 0.3715] }, { side: "L", inner: [-0.41421, 1.13918, 0.34471], outer: [-0.48194, 1.07388, 0.3325] }], [{ side: "R", inner: [0.4714, 1.02534, 0.26504], outer: [0.43799, 1.07107, 0.34116] }, { side: "L", inner: [-0.42472, 1.08235, 0.31673], outer: [-0.48468, 1.01407, 0.28947] }], [{ side: "R", inner: [0.46928, 0.97257, 0.22178], outer: [0.44655, 1.00948, 0.30617] }, { side: "L", inner: [-0.4325, 1.02521, 0.28484], outer: [-0.48333, 0.95684, 0.24311] }], [{ side: "R", inner: [0.45806, 0.93209, 0.17573], outer: [0.44434, 0.9591, 0.26563] }, { side: "L", inner: [-0.43023, 0.97852, 0.24763], outer: [-0.47216, 0.91267, 0.19373] }], [{ side: "R", inner: [0.44203, 0.89847, 0.12842], outer: [0.43614, 0.91479, 0.22169] }, { side: "L", inner: [-0.42251, 0.93727, 0.20725], outer: [-0.45566, 0.87598, 0.14287] }], [{ side: "R", inner: [0.42495, 0.87382, 0.08612], outer: [0.42515, 0.8801, 0.18078] }, { side: "L", inner: [-0.41232, 0.90483, 0.16966], outer: [-0.43778, 0.84909, 0.09724] }], [{ side: "R", inner: [0.40715, 0.85936, 0.05008], outer: [0.41158, 0.8571, 0.14482] }, { side: "L", inner: [-0.39964, 0.88333, 0.1365], outer: [-0.41908, 0.83312, 0.0584] }], [{ side: "R", inner: [0.39139, 0.84796, 0.01918], outer: [0.39907, 0.8382, 0.11323] }, { side: "L", inner: [-0.38807, 0.86549, 0.10739], outer: [-0.4024, 0.82067, 0.02501] }], [{ side: "R", inner: [0.38356, 0.84476, 544e-5], outer: [0.39248, 0.83167, 0.09897] }, { side: "L", inner: [-0.38192, 0.85935, 0.09423], outer: [-0.39412, 0.81708, 0.01018] }], [{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }]] }, arctic_dual_katana: { durations: { Draw: 5.6, Stow: 5.6, Swing: 2.6 }, windows: [{ side: "R", start: 0.124, end: 0.403 }, { side: "L", start: 0.536, end: 0.797 }], frames: [[{ side: "L", inner: [-0.36988, 1.40657, 0.43436], outer: [-0.51761, 1.92732, 0.6548] }, { side: "R", inner: [0.39612, 1.39758, 0.43436], outer: [0.59898, 1.89942, 0.6548] }], [{ side: "L", inner: [-0.36648, 1.40657, 0.43722], outer: [-0.5125, 1.92732, 0.6588] }, { side: "R", inner: [0.4112, 1.39139, 0.43637], outer: [0.6187, 1.88881, 0.66244] }], [{ side: "L", inner: [-0.36035, 1.40657, 0.44223], outer: [-0.50329, 1.92732, 0.66581] }, { side: "R", inner: [0.43866, 1.38081, 0.43759], outer: [0.65593, 1.87009, 0.6721] }], [{ side: "L", inner: [-0.35101, 1.40657, 0.44972], outer: [-0.48921, 1.92732, 0.67625] }, { side: "R", inner: [0.48003, 1.36481, 0.43831], outer: [0.71195, 1.84102, 0.68537] }], [{ side: "L", inner: [-0.33727, 1.40657, 0.45997], outer: [-0.46862, 1.92732, 0.69055] }, { side: "R", inner: [0.54023, 1.34461, 0.42697], outer: [0.79959, 1.80189, 0.68236] }], [{ side: "L", inner: [-0.32179, 1.40657, 0.4709], outer: [-0.44541, 1.92732, 0.70571] }, { side: "R", inner: [0.60474, 1.32388, 0.40671], outer: [0.89552, 1.7598, 0.66557] }], [{ side: "L", inner: [-0.30413, 1.40657, 0.48257], outer: [-0.41895, 1.92732, 0.72181] }, { side: "R", inner: [0.67455, 1.30241, 0.37366], outer: [1.00329, 1.71297, 0.62854] }], [{ side: "L", inner: [-0.28472, 1.40657, 0.4941], outer: [-0.39, 1.92732, 0.73768] }, { side: "R", inner: [0.7399, 1.28523, 0.32059], outer: [1.10987, 1.67342, 0.55302] }], [{ side: "L", inner: [-0.26485, 1.40657, 0.50511], outer: [-0.36035, 1.92732, 0.75269] }, { side: "R", inner: [0.79882, 1.26866, 0.26095], outer: [1.20795, 1.63264, 0.46521] }], [{ side: "L", inner: [-0.24473, 1.40657, 0.51518], outer: [-0.3304, 1.92732, 0.76633] }, { side: "R", inner: [0.84621, 1.25533, 0.1914], outer: [1.29085, 1.59748, 0.35516] }], [{ side: "L", inner: [-0.22582, 1.40657, 0.52368], outer: [-0.30231, 1.92732, 0.77778] }, { side: "R", inner: [0.87751, 1.24599, 0.12288], outer: [1.34798, 1.57178, 0.24166] }], [{ side: "L", inner: [-0.20809, 1.40657, 0.53109], outer: [-0.27597, 1.92732, 0.78762] }, { side: "R", inner: [0.90021, 1.23684, 0.05915], outer: [1.3908, 1.54536, 0.13485] }], [{ side: "L", inner: [-0.19315, 1.40657, 0.53669], outer: [-0.25384, 1.92732, 0.79502] }, { side: "R", inner: [0.91018, 1.23167, 833e-5], outer: [1.41123, 1.53004, 0.04734] }], [{ side: "L", inner: [-0.18217, 1.40657, 0.54054], outer: [-0.23758, 1.92732, 0.80006] }, { side: "R", inner: [0.91397, 1.22886, -0.02211], outer: [1.41951, 1.52159, -395e-5] }], [{ side: "L", inner: [-0.17411, 1.40657, 0.54323], outer: [-0.22565, 1.92732, 0.80354] }, { side: "R", inner: [0.91481, 1.22779, -0.04071], outer: [1.42188, 1.51837, -0.03477] }], [{ side: "L", inner: [-0.17243, 1.40657, 0.54377], outer: [-0.22317, 1.92732, 0.80423] }, { side: "R", inner: [0.91467, 1.22779, -0.04307], outer: [1.42176, 1.51837, -0.03837] }], [{ side: "L", inner: [-0.17429, 1.40657, 0.54316], outer: [-0.22593, 1.92732, 0.80346] }, { side: "R", inner: [0.91463, 1.22779, -0.03548], outer: [1.42165, 1.51837, -0.02589] }], [{ side: "L", inner: [-0.17872, 1.40657, 0.54173], outer: [-0.23247, 1.92732, 0.80159] }, { side: "R", inner: [0.91454, 1.22779, -0.02052], outer: [1.42129, 1.51837, -147e-5] }], [{ side: "L", inner: [-0.18726, 1.40657, 0.53881], outer: [-0.24512, 1.92732, 0.79779] }, { side: "R", inner: [0.91346, 1.22779, 852e-5], outer: [1.41919, 1.51837, 0.04591] }], [{ side: "L", inner: [-0.1979, 1.40657, 0.53495], outer: [-0.26089, 1.92732, 0.79274] }, { side: "R", inner: [0.91066, 1.22779, 0.04478], outer: [1.41417, 1.51837, 0.10509] }], [{ side: "L", inner: [-0.21033, 1.40657, 0.53026], outer: [-0.27929, 1.92732, 0.78651] }, { side: "R", inner: [0.90607, 1.22779, 0.08719], outer: [1.40565, 1.51837, 0.17423] }], [{ side: "L", inner: [-0.22603, 1.40657, 0.52365], outer: [-0.3026, 1.92732, 0.77773] }, { side: "R", inner: [0.89596, 1.22779, 0.14084], outer: [1.38843, 1.51837, 0.26179] }], [{ side: "L", inner: [-0.2429, 1.40657, 0.516], outer: [-0.32769, 1.92732, 0.76746] }, { side: "R", inner: [0.88162, 1.22779, 0.19845], outer: [1.36375, 1.51837, 0.35565] }], [{ side: "L", inner: [-0.26116, 1.40657, 0.50714], outer: [-0.35482, 1.92732, 0.75542] }, { side: "R", inner: [0.86223, 1.22779, 0.26052], outer: [1.32998, 1.51837, 0.4564] }], [{ side: "L", inner: [-0.28116, 1.40657, 0.49613], outer: [-0.38468, 1.92732, 0.74047] }, { side: "R", inner: [0.83342, 1.22779, 0.32853], outer: [1.28129, 1.51837, 0.56637] }], [{ side: "L", inner: [-0.30171, 1.40657, 0.48393], outer: [-0.41538, 1.92732, 0.72372] }, { side: "R", inner: [0.79835, 1.22779, 0.39767], outer: [1.22137, 1.51837, 0.67733] }], [{ side: "L", inner: [-0.32295, 1.40657, 0.47016], outer: [-0.44713, 1.92732, 0.70467] }, { side: "R", inner: [0.75523, 1.22779, 0.46798], outer: [1.14772, 1.51837, 0.78908] }], [{ side: "L", inner: [-0.34455, 1.40657, 0.45433], outer: [-0.47961, 1.92732, 0.68275] }, { side: "R", inner: [0.70127, 1.22779, 0.53726], outer: [1.05704, 1.51837, 0.89863] }], [{ side: "L", inner: [-0.36608, 1.40657, 0.43729], outer: [-0.51196, 1.92732, 0.65896] }, { side: "R", inner: [0.64059, 1.22779, 0.60415], outer: [0.95446, 1.51837, 1.00245] }], [{ side: "L", inner: [-0.38739, 1.40657, 0.41861], outer: [-0.54409, 1.92732, 0.63277] }, { side: "R", inner: [0.57097, 1.22779, 0.66758], outer: [0.83763, 1.51837, 1.09892] }], [{ side: "L", inner: [-0.40799, 1.40657, 0.39833], outer: [-0.57535, 1.92732, 0.60427] }, { side: "R", inner: [0.49273, 1.22779, 0.72438], outer: [0.70763, 1.51837, 1.1837] }], [{ side: "L", inner: [-0.42796, 1.40657, 0.37707], outer: [-0.60561, 1.92732, 0.57419] }, { side: "R", inner: [0.40943, 1.22779, 0.77506], outer: [0.56921, 1.51837, 1.25633] }], [{ side: "L", inner: [-0.44678, 1.40657, 0.35452], outer: [-0.63435, 1.92732, 0.54223] }, { side: "R", inner: [0.31984, 1.22779, 0.81601], outer: [0.4219, 1.51837, 1.31274] }], [{ side: "L", inner: [-0.46427, 1.40657, 0.33112], outer: [-0.6612, 1.92732, 0.50899] }, { side: "R", inner: [0.22713, 1.22779, 0.84607], outer: [0.27037, 1.51837, 1.35133] }], [{ side: "L", inner: [-0.48073, 1.40657, 0.30719], outer: [-0.68645, 1.92732, 0.4748] }, { side: "R", inner: [0.13313, 1.22779, 0.86761], outer: [0.11731, 1.51837, 1.37447] }], [{ side: "L", inner: [-0.49534, 1.40657, 0.2828], outer: [-0.70917, 1.92732, 0.43996] }, { side: "R", inner: [0.03958, 1.22779, 0.87569], outer: [-0.03386, 1.51837, 1.37745] }], [{ side: "L", inner: [-0.50846, 1.40657, 0.25843], outer: [-0.72965, 1.92732, 0.40503] }, { side: "R", inner: [-0.05077, 1.22779, 0.87354], outer: [-0.1794, 1.51837, 1.36407] }], [{ side: "L", inner: [-0.52039, 1.40657, 0.2341], outer: [-0.74829, 1.92732, 0.37004] }, { side: "R", inner: [-0.13803, 1.22779, 0.86337], outer: [-0.31913, 1.51837, 1.33704] }], [{ side: "L", inner: [-0.53019, 1.40657, 0.21056], outer: [-0.76394, 1.92732, 0.33617] }, { side: "R", inner: [-0.2169, 1.22779, 0.84173], outer: [-0.44546, 1.51837, 1.29441] }], [{ side: "L", inner: [-0.53872, 1.40657, 0.18779], outer: [-0.77761, 1.92732, 0.30333] }, { side: "R", inner: [-0.28896, 1.22779, 0.81443], outer: [-0.56054, 1.51837, 1.24268] }], [{ side: "L", inner: [-0.54615, 1.40657, 0.1657], outer: [-0.78956, 1.92732, 0.27139] }, { side: "R", inner: [-0.35498, 1.22779, 0.78233], outer: [-0.66537, 1.51837, 1.18334] }], [{ side: "L", inner: [-0.55164, 1.40657, 0.14585], outer: [-0.7987, 1.92732, 0.24269] }, { side: "R", inner: [-0.40851, 1.22779, 0.74693], outer: [-0.75095, 1.51837, 1.12095] }], [{ side: "L", inner: [-0.55628, 1.40657, 0.12731], outer: [-0.80645, 1.92732, 0.21582] }, { side: "R", inner: [-0.45571, 1.22779, 0.71131], outer: [-0.82582, 1.51837, 1.05798] }], [{ side: "L", inner: [-0.56, 1.40657, 0.11031], outer: [-0.81275, 1.92732, 0.19115] }, { side: "R", inner: [-0.49588, 1.22779, 0.67597], outer: [-0.88927, 1.51837, 0.99598] }], [{ side: "L", inner: [-0.56249, 1.40657, 0.09655], outer: [-0.81715, 1.92732, 0.17118] }, { side: "R", inner: [-0.52542, 1.22779, 0.64515], outer: [-0.93613, 1.51837, 0.9426] }], [{ side: "L", inner: [-0.56446, 1.40657, 0.08463], outer: [-0.82064, 1.92732, 0.15385] }, { side: "R", inner: [-0.54986, 1.22779, 0.61766], outer: [-0.97451, 1.51837, 0.89485] }], [{ side: "L", inner: [-0.56582, 1.40657, 0.07523], outer: [-0.82311, 1.92732, 0.14017] }, { side: "R", inner: [-0.568, 1.22779, 0.59525], outer: [-1.00291, 1.51837, 0.85604] }], [{ side: "L", inner: [-0.56653, 1.40657, 0.06974], outer: [-0.82444, 1.92732, 0.13219] }, { side: "R", inner: [-0.57813, 1.22779, 0.58191], outer: [-1.01872, 1.51837, 0.83298] }], [{ side: "L", inner: [-0.56692, 1.40657, 0.06656], outer: [-0.82518, 1.92732, 0.12756] }, { side: "R", inner: [-0.58411, 1.22779, 0.57371], outer: [-1.02804, 1.51837, 0.81882] }], [{ side: "L", inner: [-0.56687, 1.40657, 0.06697], outer: [-0.82509, 1.92732, 0.12815] }, { side: "R", inner: [-0.58408, 1.22779, 0.57342], outer: [-1.02812, 1.51837, 0.81834] }], [{ side: "L", inner: [-0.56692, 1.40627, 0.07139], outer: [-0.82493, 1.92685, 0.13479] }, { side: "R", inner: [-0.57941, 1.22779, 0.57802], outer: [-1.02149, 1.51837, 0.82647] }], [{ side: "L", inner: [-0.57096, 1.40387, 0.07731], outer: [-0.83072, 1.92306, 0.1449] }, { side: "R", inner: [-0.57118, 1.22779, 0.58609], outer: [-1.00971, 1.51837, 0.84075] }], [{ side: "L", inner: [-0.58804, 1.39481, 0.08453], outer: [-0.85566, 1.90869, 0.16131] }, { side: "R", inner: [-0.55567, 1.22779, 0.60078], outer: [-0.9874, 1.51837, 0.8668] }], [{ side: "L", inner: [-0.61798, 1.38008, 0.08967], outer: [-0.90118, 1.88401, 0.17596] }, { side: "R", inner: [-0.5335, 1.22779, 0.62054], outer: [-0.95525, 1.51837, 0.90212] }], [{ side: "L", inner: [-0.65458, 1.36231, 0.09361], outer: [-0.95688, 1.85312, 0.19014] }, { side: "R", inner: [-0.50335, 1.22779, 0.64752], outer: [-0.91024, 1.51837, 0.95018] }], [{ side: "L", inner: [-0.70021, 1.34182, 0.09108], outer: [-1.03025, 1.8138, 0.19055] }, { side: "R", inner: [-0.44558, 1.22779, 0.70169], outer: [-0.81861, 1.51837, 1.04521] }], [{ side: "L", inner: [-0.74621, 1.32194, 0.0823], outer: [-1.10679, 1.77222, 0.17623] }, { side: "R", inner: [-0.35731, 1.22779, 0.76575], outer: [-0.67664, 1.51837, 1.15968] }], [{ side: "L", inner: [-0.79209, 1.30131, 0.0708], outer: [-1.18534, 1.72502, 0.15686] }, { side: "R", inner: [-0.24421, 1.22779, 0.83043], outer: [-0.49071, 1.51837, 1.27359] }], [{ side: "L", inner: [-0.83121, 1.2836, 0.04922], outer: [-1.25671, 1.67943, 0.11133] }, { side: "R", inner: [-0.08907, 1.22779, 0.86545], outer: [-0.23957, 1.51837, 1.34971] }], [{ side: "L", inner: [-0.8633, 1.26681, 0.02729], outer: [-1.31671, 1.63365, 0.0652] }, { side: "R", inner: [0.07509, 1.22779, 0.86887], outer: [0.02887, 1.51837, 1.37387] }], [{ side: "L", inner: [-0.88963, 1.25026, 482e-5], outer: [-1.36784, 1.58603, 0.01783] }, { side: "R", inner: [0.24537, 1.22779, 0.84286], outer: [0.30707, 1.51837, 1.3462] }], [{ side: "L", inner: [-0.90293, 1.23984, -0.01388], outer: [-1.39514, 1.55482, -0.02397] }, { side: "R", inner: [0.38951, 1.22779, 0.78952], outer: [0.54743, 1.51837, 1.27141] }], [{ side: "L", inner: [-0.9118, 1.23179, -0.02453], outer: [-1.41358, 1.53054, -0.04811] }, { side: "R", inner: [0.5117, 1.22779, 0.73044], outer: [0.75145, 1.51837, 1.1773] }], [{ side: "L", inner: [-0.91539, 1.22809, -0.02745], outer: [-1.4213, 1.51926, -0.0568] }, { side: "R", inner: [0.60852, 1.22779, 0.66892], outer: [0.91384, 1.51837, 1.07381] }], [{ side: "L", inner: [-0.91579, 1.22779, -0.02239], outer: [-1.42219, 1.51837, -0.04922] }, { side: "R", inner: [0.66323, 1.22779, 0.62305], outer: [1.00664, 1.51837, 0.99618] }], [{ side: "L", inner: [-0.91577, 1.22779, -0.01407], outer: [-1.4224, 1.51837, -0.03587] }, { side: "R", inner: [0.69665, 1.22819, 0.5917], outer: [1.062, 1.51955, 0.94271] }], [{ side: "L", inner: [-0.91546, 1.22779, -156e-5], outer: [-1.42237, 1.51837, -0.0154] }, { side: "R", inner: [0.70304, 1.22926, 0.58305], outer: [1.07122, 1.52278, 0.92929] }], [{ side: "L", inner: [-0.91415, 1.22779, 0.02035], outer: [-1.42126, 1.51837, 0.02086] }, { side: "R", inner: [0.67517, 1.23814, 0.59529], outer: [1.01705, 1.54908, 0.95311] }], [{ side: "L", inner: [-0.91175, 1.22779, 0.0479], outer: [-1.41851, 1.51837, 0.06654] }, { side: "R", inner: [0.63217, 1.25008, 0.61024], outer: [0.93797, 1.58282, 0.98088] }], [{ side: "L", inner: [-0.90729, 1.22779, 0.08431], outer: [-1.41261, 1.51837, 0.12688] }, { side: "R", inner: [0.56807, 1.26769, 0.62274], outer: [0.82547, 1.62999, 1.00231] }], [{ side: "L", inner: [-0.89874, 1.22779, 0.13111], outer: [-1.40053, 1.51837, 0.20438] }, { side: "R", inner: [0.49953, 1.29344, 0.614], outer: [0.71983, 1.69179, 0.98057] }], [{ side: "L", inner: [-0.88649, 1.22779, 0.18395], outer: [-1.38202, 1.51837, 0.29171] }, { side: "R", inner: [0.43087, 1.3209, 0.5958], outer: [0.61639, 1.75268, 0.94327] }], [{ side: "L", inner: [-0.86725, 1.22779, 0.24665], outer: [-1.35217, 1.51837, 0.39501] }, { side: "R", inner: [0.37771, 1.35286, 0.55799], outer: [0.54896, 1.81753, 0.86838] }], [{ side: "L", inner: [-0.83927, 1.22779, 0.31659], outer: [-1.30814, 1.51837, 0.50977] }, { side: "R", inner: [0.34921, 1.37688, 0.52155], outer: [0.51767, 1.8625, 0.79974] }], [{ side: "L", inner: [-0.80418, 1.22779, 0.38998], outer: [-1.25124, 1.51837, 0.62934] }, { side: "R", inner: [0.337, 1.39496, 0.48757], outer: [0.50831, 1.89496, 0.73706] }], [{ side: "L", inner: [-0.7565, 1.22779, 0.46692], outer: [-1.17428, 1.51837, 0.75436] }, { side: "R", inner: [0.35682, 1.39684, 0.46867], outer: [0.53941, 1.89816, 0.70727] }], [{ side: "L", inner: [-0.69906, 1.22779, 0.54221], outer: [-1.08087, 1.51837, 0.87593] }, { side: "R", inner: [0.37865, 1.39758, 0.44922], outer: [0.57277, 1.89942, 0.67739] }], [{ side: "L", inner: [-0.6337, 1.22779, 0.6151], outer: [-0.97324, 1.51837, 0.99175] }, { side: "R", inner: [0.40165, 1.39758, 0.42916], outer: [0.60735, 1.89942, 0.64696] }], [{ side: "L", inner: [-0.55569, 1.22779, 0.68232], outer: [-0.84632, 1.51837, 1.09788] }, { side: "R", inner: [0.42402, 1.39758, 0.40674], outer: [0.64114, 1.89942, 0.61315] }], [{ side: "L", inner: [-0.47062, 1.22779, 0.7423], outer: [-0.70734, 1.51837, 1.19077] }, { side: "R", inner: [0.4455, 1.39758, 0.38305], outer: [0.67353, 1.89942, 0.57735] }], [{ side: "L", inner: [-0.37954, 1.22779, 0.79533], outer: [-0.55815, 1.51837, 1.26994] }, { side: "R", inner: [0.46616, 1.39758, 0.35825], outer: [0.70451, 1.89942, 0.53974] }], [{ side: "L", inner: [-0.28135, 1.22779, 0.83328], outer: [-0.39905, 1.51837, 1.32654] }, { side: "R", inner: [0.48484, 1.39758, 0.33193], outer: [0.73279, 1.89942, 0.50007] }], [{ side: "L", inner: [-0.18172, 1.22779, 0.86126], outer: [-0.23722, 1.51837, 1.36532] }, { side: "R", inner: [0.50223, 1.39758, 0.30511], outer: [0.75895, 1.89942, 0.45952] }], [{ side: "L", inner: [-0.08103, 1.22779, 0.87825], outer: [-0.07414, 1.51837, 1.38531] }, { side: "R", inner: [0.51816, 1.39758, 0.27777], outer: [0.78281, 1.89942, 0.41814] }], [{ side: "L", inner: [0.01612, 1.22779, 0.87897], outer: [0.08301, 1.51837, 1.38165] }, { side: "R", inner: [0.53164, 1.39758, 0.25044], outer: [0.80321, 1.89942, 0.37691] }], [{ side: "L", inner: [0.1093, 1.22779, 0.87074], outer: [0.23368, 1.51837, 1.36235] }, { side: "R", inner: [0.5437, 1.39758, 0.22336], outer: [0.82131, 1.89942, 0.33598] }], [{ side: "L", inner: [0.19656, 1.22779, 0.85223], outer: [0.37464, 1.51837, 1.32704] }, { side: "R", inner: [0.55403, 1.39758, 0.1968], outer: [0.83676, 1.89942, 0.29584] }], [{ side: "L", inner: [0.27281, 1.22779, 0.82408], outer: [0.49864, 1.51837, 1.27813] }, { side: "R", inner: [0.56218, 1.39758, 0.17172], outer: [0.84907, 1.89942, 0.25798] }], [{ side: "L", inner: [0.34212, 1.22779, 0.7916], outer: [0.61106, 1.51837, 1.22151] }, { side: "R", inner: [0.56912, 1.39758, 0.14768], outer: [0.85942, 1.89942, 0.22166] }], [{ side: "L", inner: [0.40126, 1.22779, 0.75542], outer: [0.70736, 1.51837, 1.15972] }, { side: "R", inner: [0.57447, 1.39758, 0.12546], outer: [0.86743, 1.89942, 0.1881] }], [{ side: "L", inner: [0.44914, 1.22779, 0.71939], outer: [0.78573, 1.51837, 1.09868] }, { side: "R", inner: [0.57837, 1.39758, 0.10589], outer: [0.87329, 1.89942, 0.15854] }], [{ side: "L", inner: [0.49019, 1.22779, 0.68426], outer: [0.85265, 1.51837, 1.03892] }, { side: "R", inner: [0.58147, 1.39758, 0.08807], outer: [0.87786, 1.89942, 0.13162] }], [{ side: "L", inner: [0.52096, 1.22779, 0.65327], outer: [0.90313, 1.51837, 0.98659] }, { side: "R", inner: [0.58349, 1.39758, 0.07349], outer: [0.88088, 1.89942, 0.10962] }], [{ side: "L", inner: [0.54332, 1.22779, 0.62865], outer: [0.93973, 1.51837, 0.9449] }, { side: "R", inner: [0.58481, 1.39758, 0.06232], outer: [0.88284, 1.89942, 0.09275] }], [{ side: "L", inner: [0.56021, 1.22779, 0.60875], outer: [0.96727, 1.51837, 0.91118] }, { side: "R", inner: [0.58573, 1.39758, 0.05353], outer: [0.88418, 1.89942, 0.07947] }], [{ side: "L", inner: [0.56767, 1.22779, 0.59936], outer: [0.97947, 1.51837, 0.89529] }, { side: "R", inner: [0.58608, 1.39758, 0.04947], outer: [0.88471, 1.89942, 0.07335] }], [{ side: "L", inner: [0.56918, 1.22779, 0.59699], outer: [0.98214, 1.51837, 0.89131] }, { side: "R", inner: [0.5861, 1.39758, 0.04927], outer: [0.88474, 1.89942, 0.07304] }], [{ side: "L", inner: [0.56651, 1.22779, 0.59947], outer: [0.97817, 1.51837, 0.8956] }, { side: "R", inner: [0.58587, 1.39758, 0.05195], outer: [0.88439, 1.89942, 0.07708] }], [{ side: "L", inner: [0.55793, 1.22779, 0.60742], outer: [0.96534, 1.51837, 0.90937] }, { side: "R", inner: [0.58505, 1.39758, 0.06025], outer: [0.88318, 1.89942, 0.08962] }], [{ side: "L", inner: [0.54623, 1.22779, 0.61788], outer: [0.94783, 1.51837, 0.92751] }, { side: "R", inner: [0.58375, 1.39758, 0.07136], outer: [0.88127, 1.89942, 0.10639] }], [{ side: "L", inner: [0.53182, 1.22779, 0.63042], outer: [0.92614, 1.51837, 0.94927] }, { side: "R", inner: [0.58199, 1.39758, 0.08486], outer: [0.87862, 1.89942, 0.12677] }], [{ side: "L", inner: [0.50222, 1.22779, 0.65946], outer: [0.87886, 1.51837, 0.99903] }, { side: "R", inner: [0.57899, 1.39758, 0.10262], outer: [0.8742, 1.89942, 0.1536] }], [{ side: "L", inner: [0.44923, 1.22779, 0.70762], outer: [0.7919, 1.51837, 1.08143] }, { side: "R", inner: [0.57519, 1.39758, 0.1219], outer: [0.86853, 1.89942, 0.18271] }], [{ side: "L", inner: [0.36702, 1.22779, 0.77576], outer: [0.65271, 1.51837, 1.19474] }, { side: "R", inner: [0.57043, 1.39758, 0.14292], outer: [0.86135, 1.89942, 0.21445] }], [{ side: "L", inner: [0.22625, 1.22779, 0.83766], outer: [0.42176, 1.51837, 1.30556] }, { side: "R", inner: [0.56393, 1.39758, 0.16604], outer: [0.85168, 1.89942, 0.24939] }], [{ side: "L", inner: [0.06096, 1.22779, 0.87288], outer: [0.14967, 1.51837, 1.37217] }, { side: "R", inner: [0.55639, 1.39758, 0.18978], outer: [0.84035, 1.89942, 0.28525] }], [{ side: "L", inner: [-0.13202, 1.22779, 0.86813], outer: [-0.16439, 1.51837, 1.3742] }, { side: "R", inner: [0.54752, 1.39758, 0.21426], outer: [0.82697, 1.89942, 0.3222] }], [{ side: "L", inner: [-0.31817, 1.22779, 0.81689], outer: [-0.46982, 1.51837, 1.30079] }, { side: "R", inner: [0.53699, 1.39758, 0.23892], outer: [0.81123, 1.89942, 0.3595] }], [{ side: "L", inner: [-0.48627, 1.22779, 0.74336], outer: [-0.74427, 1.51837, 1.17994] }, { side: "R", inner: [0.52553, 1.39758, 0.26335], outer: [0.79395, 1.89942, 0.39638] }], [{ side: "L", inner: [-0.6197, 1.22779, 0.65265], outer: [-0.96229, 1.51837, 1.02654] }, { side: "R", inner: [0.51287, 1.39758, 0.28725], outer: [0.77489, 1.89942, 0.43249] }], [{ side: "L", inner: [-0.70793, 1.22779, 0.56762], outer: [-1.10536, 1.51837, 0.8826] }, { side: "R", inner: [0.49933, 1.39758, 0.30994], outer: [0.75455, 1.89942, 0.4668] }], [{ side: "L", inner: [-0.76925, 1.22819, 0.49392], outer: [-1.20168, 1.51957, 0.7579] }, { side: "R", inner: [0.48532, 1.39758, 0.33167], outer: [0.7334, 1.89942, 0.49961] }], [{ side: "L", inner: [-0.79155, 1.23009, 0.45512], outer: [-1.2343, 1.52535, 0.69674] }, { side: "R", inner: [0.47098, 1.39758, 0.35165], outer: [0.71183, 1.89942, 0.52981] }], [{ side: "L", inner: [-0.78136, 1.24289, 0.44425], outer: [-1.20656, 1.56382, 0.68466] }, { side: "R", inner: [0.45693, 1.39758, 0.36965], outer: [0.69067, 1.89942, 0.55703] }], [{ side: "L", inner: [-0.74949, 1.26039, 0.4498], outer: [-1.13872, 1.61516, 0.70325] }, { side: "R", inner: [0.44317, 1.39758, 0.38622], outer: [0.6699, 1.89942, 0.58203] }], [{ side: "L", inner: [-0.68208, 1.28723, 0.46562], outer: [-1.01092, 1.68908, 0.7339] }, { side: "R", inner: [0.43064, 1.39758, 0.40006], outer: [0.65103, 1.89942, 0.60297] }], [{ side: "L", inner: [-0.60273, 1.31561, 0.47282], outer: [-0.87248, 1.75757, 0.74395] }, { side: "R", inner: [0.41957, 1.39758, 0.41167], outer: [0.63435, 1.89942, 0.62052] }], [{ side: "L", inner: [-0.51487, 1.34375, 0.47578], outer: [-0.72339, 1.81798, 0.74636] }, { side: "R", inner: [0.40968, 1.39758, 0.4216], outer: [0.61942, 1.89942, 0.63551] }], [{ side: "L", inner: [-0.44511, 1.37324, 0.45867], outer: [-0.62236, 1.8721, 0.70628] }, { side: "R", inner: [0.40295, 1.39758, 0.428], outer: [0.60929, 1.89942, 0.64519] }], [{ side: "L", inner: [-0.39717, 1.39325, 0.44582], outer: [-0.55326, 1.90607, 0.67871] }, { side: "R", inner: [0.39854, 1.39758, 0.43214], outer: [0.60263, 1.89942, 0.65144] }], [{ side: "L", inner: [-0.36988, 1.40657, 0.43437], outer: [-0.51762, 1.92731, 0.6548] }, { side: "R", inner: [0.39612, 1.39758, 0.43436], outer: [0.59898, 1.89942, 0.6548] }]] }, rusty_sword: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.8 }, windows: [{ side: null, start: 0.2, end: 0.65 }], frames: [[{ side: "L", inner: [-0.25207, 1.46342, 0.34792], outer: [-0.17401, 2.0879, 0.5083] }], [{ side: "L", inner: [-0.26205, 1.46047, 0.35198], outer: [-0.18798, 2.08321, 0.52079] }], [{ side: "L", inner: [-0.27228, 1.45752, 0.35591], outer: [-0.20274, 2.07851, 0.53287] }], [{ side: "L", inner: [-0.2961, 1.45088, 0.36375], outer: [-0.23734, 2.0673, 0.55961] }], [{ side: "L", inner: [-0.32534, 1.44322, 0.37165], outer: [-0.28232, 2.0543, 0.58732] }], [{ side: "L", inner: [-0.36259, 1.4339, 0.37872], outer: [-0.34145, 2.03723, 0.61818] }], [{ side: "L", inner: [-0.40785, 1.4234, 0.38325], outer: [-0.41681, 2.01733, 0.64584] }], [{ side: "L", inner: [-0.45734, 1.41248, 0.38358], outer: [-0.50284, 1.99564, 0.66579] }], [{ side: "L", inner: [-0.51322, 1.40042, 0.37784], outer: [-0.60392, 1.96951, 0.67734] }], [{ side: "L", inner: [-0.57087, 1.38913, 0.36527], outer: [-0.71106, 1.94542, 0.66969] }], [{ side: "L", inner: [-0.62928, 1.37568, 0.34572], outer: [-0.82564, 1.91246, 0.65409] }], [{ side: "L", inner: [-0.68747, 1.36422, 0.31725], outer: [-0.93956, 1.88561, 0.61118] }], [{ side: "L", inner: [-0.74001, 1.34967, 0.28485], outer: [-1.04971, 1.84753, 0.56415] }], [{ side: "L", inner: [-0.7896, 1.33691, 0.24416], outer: [-1.15249, 1.8147, 0.49278] }], [{ side: "L", inner: [-0.83085, 1.32259, 0.20267], outer: [-1.2421, 1.77639, 0.41886] }], [{ side: "L", inner: [-0.86626, 1.30846, 0.15772], outer: [-1.32001, 1.73826, 0.3343] }], [{ side: "L", inner: [-0.894, 1.29531, 0.11353], outer: [-1.38147, 1.70269, 0.24846] }], [{ side: "L", inner: [-0.91455, 1.28169, 0.07315], outer: [-1.42972, 1.66517, 0.16974] }], [{ side: "L", inner: [-0.93018, 1.27033, 0.03321], outer: [-1.46514, 1.63426, 0.08949] }], [{ side: "L", inner: [-0.9389, 1.26076, 427e-5], outer: [-1.48721, 1.60766, 0.03279] }], [{ side: "L", inner: [-0.94601, 1.2521, -0.02584], outer: [-1.50432, 1.58387, -0.02748] }], [{ side: "L", inner: [-0.94715, 1.24979, -0.03895], outer: [-1.50776, 1.57744, -0.0511] }], [{ side: "L", inner: [-0.94812, 1.24756, -0.05212], outer: [-1.5107, 1.57126, -0.07491] }], [{ side: "L", inner: [-0.9482, 1.24708, -0.05698], outer: [-1.51111, 1.56992, -0.08327] }], [{ side: "L", inner: [-0.94804, 1.24708, -0.05945], outer: [-1.51088, 1.56992, -0.08719] }], [{ side: "L", inner: [-0.94806, 1.24708, -0.05676], outer: [-1.511, 1.56992, -0.08261] }], [{ side: "L", inner: [-0.94822, 1.24708, -0.04995], outer: [-1.51134, 1.56992, -0.07121] }], [{ side: "L", inner: [-0.94831, 1.24708, -0.04012], outer: [-1.51165, 1.56992, -0.05475] }], [{ side: "L", inner: [-0.94825, 1.24708, -0.02424], outer: [-1.51176, 1.56992, -0.02817] }], [{ side: "L", inner: [-0.94799, 1.24708, -745e-5], outer: [-1.51147, 1.56992, -5e-5] }], [{ side: "L", inner: [-0.94676, 1.24708, 0.01662], outer: [-1.50979, 1.56992, 0.04027] }], [{ side: "L", inner: [-0.94531, 1.24708, 0.04067], outer: [-1.50742, 1.56992, 0.08056] }], [{ side: "L", inner: [-0.94186, 1.24708, 0.07111], outer: [-1.50213, 1.56992, 0.13162] }], [{ side: "L", inner: [-0.93782, 1.24708, 0.10231], outer: [-1.4954, 1.56992, 0.18391] }], [{ side: "L", inner: [-0.93133, 1.24708, 0.13748], outer: [-1.4849, 1.56992, 0.24296] }], [{ side: "L", inner: [-0.92329, 1.24708, 0.17457], outer: [-1.47147, 1.56992, 0.30518] }], [{ side: "L", inner: [-0.91289, 1.24708, 0.21375], outer: [-1.45406, 1.56992, 0.37087] }], [{ side: "L", inner: [-0.89956, 1.24708, 0.25551], outer: [-1.43174, 1.56992, 0.44082] }], [{ side: "L", inner: [-0.88443, 1.24708, 0.29789], outer: [-1.40588, 1.56992, 0.51155] }], [{ side: "L", inner: [-0.86469, 1.24708, 0.34294], outer: [-1.37278, 1.56992, 0.58667] }], [{ side: "L", inner: [-0.84411, 1.24708, 0.38759], outer: [-1.33711, 1.56992, 0.66056] }], [{ side: "L", inner: [-0.81709, 1.24708, 0.43396], outer: [-1.29184, 1.56992, 0.73756] }], [{ side: "L", inner: [-0.78915, 1.24708, 0.47973], outer: [-1.24374, 1.56992, 0.81275] }], [{ side: "L", inner: [-0.75574, 1.24708, 0.52521], outer: [-1.18725, 1.56992, 0.88764] }], [{ side: "L", inner: [-0.72009, 1.24708, 0.57], outer: [-1.12629, 1.56992, 0.9606] }], [{ side: "L", inner: [-0.68036, 1.24708, 0.6136], outer: [-1.05873, 1.56992, 1.03121] }], [{ side: "L", inner: [-0.63718, 1.24708, 0.65595], outer: [-0.98535, 1.56992, 1.09905] }], [{ side: "L", inner: [-0.59142, 1.24708, 0.69644], outer: [-0.90738, 1.56992, 1.16305] }], [{ side: "L", inner: [-0.54136, 1.24708, 0.73417], outer: [-0.82291, 1.56992, 1.22232] }], [{ side: "L", inner: [-0.49013, 1.24708, 0.7702], outer: [-0.73573, 1.56992, 1.27739] }], [{ side: "L", inner: [-0.43447, 1.24708, 0.80119], outer: [-0.64243, 1.56992, 1.32494] }], [{ side: "L", inner: [-0.37828, 1.24708, 0.83083], outer: [-0.54748, 1.56992, 1.36835] }], [{ side: "L", inner: [-0.3192, 1.24708, 0.85404], outer: [-0.44876, 1.56992, 1.40247] }], [{ side: "L", inner: [-0.25947, 1.24708, 0.87521], outer: [-0.34871, 1.56992, 1.43163] }], [{ side: "L", inner: [-0.19893, 1.24708, 0.89058], outer: [-0.24776, 1.56992, 1.45198] }], [{ side: "L", inner: [-0.13798, 1.24708, 0.90234], outer: [-0.14633, 1.56992, 1.46581] }], [{ side: "L", inner: [-0.07753, 1.24708, 0.90968], outer: [-0.04589, 1.56992, 1.47232] }], [{ side: "L", inner: [-0.01783, 1.24708, 0.91191], outer: [0.05303, 1.56992, 1.47096] }], [{ side: "L", inner: [0.041, 1.24708, 0.91141], outer: [0.15035, 1.56992, 1.46422] }], [{ side: "L", inner: [0.09708, 1.24708, 0.90478], outer: [0.24313, 1.56992, 1.44905] }], [{ side: "L", inner: [0.15284, 1.24708, 0.89698], outer: [0.33493, 1.56992, 1.43027] }], [{ side: "L", inner: [0.20328, 1.24708, 0.88294], outer: [0.41851, 1.56992, 1.40374] }], [{ side: "L", inner: [0.25332, 1.24708, 0.8679], outer: [0.50083, 1.56992, 1.37416] }], [{ side: "L", inner: [0.29811, 1.24708, 0.84927], outer: [0.57503, 1.56992, 1.34007] }], [{ side: "L", inner: [0.34108, 1.24708, 0.82909], outer: [0.64591, 1.56992, 1.30305] }], [{ side: "L", inner: [0.37995, 1.24708, 0.80759], outer: [0.71016, 1.56992, 1.26423] }], [{ side: "L", inner: [0.41549, 1.24708, 0.78502], outer: [0.76892, 1.56992, 1.22394] }], [{ side: "L", inner: [0.44838, 1.24708, 0.76222], outer: [0.8231, 1.56992, 1.18311] }], [{ side: "L", inner: [0.47648, 1.24708, 0.73963], outer: [0.8697, 1.56992, 1.14328] }], [{ side: "L", inner: [0.50349, 1.24708, 0.71694], outer: [0.91407, 1.56992, 1.10292] }], [{ side: "L", inner: [0.52453, 1.24708, 0.69641], outer: [0.94907, 1.56992, 1.06698] }], [{ side: "L", inner: [0.54529, 1.24708, 0.67563], outer: [0.98321, 1.56992, 1.0303] }], [{ side: "L", inner: [0.56065, 1.24708, 0.6586], outer: [1.00864, 1.56992, 1.00046] }], [{ side: "L", inner: [0.5752, 1.24708, 0.64193], outer: [1.03255, 1.56992, 0.97115] }], [{ side: "L", inner: [0.58593, 1.24708, 0.62897], outer: [1.05018, 1.56992, 0.94838] }], [{ side: "L", inner: [0.59474, 1.24708, 0.61785], outer: [1.06466, 1.56992, 0.92888] }], [{ side: "L", inner: [0.60109, 1.24708, 0.6097], outer: [1.07504, 1.56992, 0.91455] }], [{ side: "L", inner: [0.60441, 1.24708, 0.60528], outer: [1.08048, 1.56992, 0.9068] }], [{ side: "L", inner: [0.60669, 1.24708, 0.60213], outer: [1.08425, 1.56992, 0.90128] }], [{ side: "L", inner: [0.60537, 1.24708, 0.60344], outer: [1.08229, 1.56992, 0.90362] }], [{ side: "L", inner: [0.60406, 1.24708, 0.60475], outer: [1.08033, 1.56992, 0.90596] }], [{ side: "L", inner: [0.5996, 1.24708, 0.60914], outer: [1.07365, 1.56992, 0.91383] }], [{ side: "L", inner: [0.59513, 1.24708, 0.61352], outer: [1.06693, 1.56992, 0.92168] }], [{ side: "L", inner: [0.58841, 1.24708, 0.61991], outer: [1.05684, 1.56992, 0.93316] }], [{ side: "L", inner: [0.58102, 1.24708, 0.62685], outer: [1.04571, 1.56992, 0.94563] }], [{ side: "L", inner: [0.57205, 1.24708, 0.63504], outer: [1.03215, 1.56992, 0.96042] }], [{ side: "L", inner: [0.56179, 1.24708, 0.64422], outer: [1.01657, 1.56992, 0.97699] }], [{ side: "L", inner: [0.54616, 1.24708, 0.65985], outer: [0.9917, 1.56992, 1.00489] }], [{ side: "L", inner: [0.51955, 1.24708, 0.68817], outer: [0.94748, 1.56992, 1.05482] }], [{ side: "L", inner: [0.48948, 1.24708, 0.71818], outer: [0.89692, 1.56992, 1.10748] }], [{ side: "L", inner: [0.43465, 1.24708, 0.76413], outer: [0.80462, 1.56992, 1.18919] }], [{ side: "L", inner: [0.3783, 1.24708, 0.80833], outer: [0.70768, 1.56992, 1.26557] }], [{ side: "L", inner: [0.29379, 1.24708, 0.84827], outer: [0.56699, 1.56992, 1.34114] }], [{ side: "L", inner: [0.20402, 1.24708, 0.88446], outer: [0.41552, 1.56992, 1.40679] }], [{ side: "L", inner: [0.09795, 1.24708, 0.90262], outer: [0.23866, 1.56992, 1.44829] }], [{ side: "L", inner: [-0.01674, 1.24708, 0.90878], outer: [0.04765, 1.56992, 1.46861] }], [{ side: "L", inner: [-0.13287, 1.24708, 0.90012], outer: [-0.14687, 1.56992, 1.46347] }], [{ side: "L", inner: [-0.2499, 1.24708, 0.87401], outer: [-0.34307, 1.56992, 1.42978] }], [{ side: "L", inner: [-0.36236, 1.24708, 0.84037], outer: [-0.53169, 1.56992, 1.37785] }], [{ side: "L", inner: [-0.46047, 1.24708, 0.79442], outer: [-0.6989, 1.56992, 1.30502] }], [{ side: "L", inner: [-0.55659, 1.24708, 0.74418], outer: [-0.85997, 1.56992, 1.21906] }], [{ side: "L", inner: [-0.62596, 1.24708, 0.69092], outer: [-0.97921, 1.56992, 1.12998] }], [{ side: "L", inner: [-0.69329, 1.24708, 0.63513], outer: [-1.09222, 1.56992, 1.03315] }], [{ side: "L", inner: [-0.73853, 1.24708, 0.58722], outer: [-1.16847, 1.56992, 0.95153] }], [{ side: "L", inner: [-0.77685, 1.24708, 0.54113], outer: [-1.23233, 1.56992, 0.87294] }], [{ side: "L", inner: [-0.80021, 1.24839, 0.50821], outer: [-1.26908, 1.57358, 0.81837] }], [{ side: "L", inner: [-0.81222, 1.25066, 0.48629], outer: [-1.28607, 1.57987, 0.78441] }], [{ side: "L", inner: [-0.81541, 1.25693, 0.4714], outer: [-1.28323, 1.59709, 0.76674] }], [{ side: "L", inner: [-0.80075, 1.27224, 0.46835], outer: [-1.24014, 1.63931, 0.77492] }], [{ side: "L", inner: [-0.78305, 1.28848, 0.46424], outer: [-1.19099, 1.68406, 0.77872] }], [{ side: "L", inner: [-0.74029, 1.30787, 0.4732], outer: [-1.09078, 1.73607, 0.81319] }], [{ side: "L", inner: [-0.69699, 1.3307, 0.47121], outer: [-0.98892, 1.7986, 0.81419] }], [{ side: "L", inner: [-0.63363, 1.34846, 0.47661], outer: [-0.85491, 1.84323, 0.83441] }], [{ side: "L", inner: [-0.56876, 1.36957, 0.4694], outer: [-0.71993, 1.8978, 0.81568] }], [{ side: "L", inner: [-0.50072, 1.38779, 0.45855], outer: [-0.58732, 1.94012, 0.78905] }], [{ side: "L", inner: [-0.43324, 1.406, 0.44034], outer: [-0.46249, 1.98065, 0.74151] }], [{ side: "L", inner: [-0.37572, 1.42302, 0.41717], outer: [-0.3631, 2.01633, 0.68101] }], [{ side: "L", inner: [-0.32611, 1.43778, 0.39433], outer: [-0.28158, 2.04356, 0.62419] }], [{ side: "L", inner: [-0.28755, 1.45079, 0.37119], outer: [-0.22465, 2.06741, 0.56514] }], [{ side: "L", inner: [-0.26929, 1.45712, 0.35979], outer: [-0.19773, 2.07769, 0.53745] }], [{ side: "L", inner: [-0.25207, 1.46342, 0.34792], outer: [-0.17402, 2.0879, 0.5083] }]] }, lightning_staff: { durations: { Draw: 2.3, Stow: 2.3, Swing: 2.1 }, windows: [{ side: "L", release: 0.55 }], frames: [[{ side: "L", inner: [-0.04534, 1.78777, 0.44795], outer: [-0.04534, 1.78777, 0.44795] }], [{ side: "L", inner: [-0.04522, 1.7876, 0.4486], outer: [-0.04522, 1.7876, 0.4486] }], [{ side: "L", inner: [-0.04509, 1.7874, 0.44937], outer: [-0.04509, 1.7874, 0.44937] }], [{ side: "L", inner: [-0.04479, 1.78694, 0.45125], outer: [-0.04479, 1.78694, 0.45125] }], [{ side: "L", inner: [-0.04446, 1.78645, 0.45336], outer: [-0.04446, 1.78645, 0.45336] }], [{ side: "L", inner: [-0.04403, 1.78583, 0.45639], outer: [-0.04403, 1.78583, 0.45639] }], [{ side: "L", inner: [-0.04358, 1.78522, 0.45973], outer: [-0.04358, 1.78522, 0.45973] }], [{ side: "L", inner: [-0.0431, 1.7846, 0.46383], outer: [-0.0431, 1.7846, 0.46383] }], [{ side: "L", inner: [-0.04263, 1.78405, 0.4683], outer: [-0.04263, 1.78405, 0.4683] }], [{ side: "L", inner: [-0.04217, 1.78362, 0.4734], outer: [-0.04217, 1.78362, 0.4734] }], [{ side: "L", inner: [-0.04176, 1.78335, 0.47892], outer: [-0.04176, 1.78335, 0.47892] }], [{ side: "L", inner: [-0.0414, 1.78327, 0.48491], outer: [-0.0414, 1.78327, 0.48491] }], [{ side: "L", inner: [-0.04113, 1.78349, 0.49136], outer: [-0.04113, 1.78349, 0.49136] }], [{ side: "L", inner: [-0.04092, 1.78394, 0.49815], outer: [-0.04092, 1.78394, 0.49815] }], [{ side: "L", inner: [-0.04081, 1.78483, 0.50538], outer: [-0.04081, 1.78483, 0.50538] }], [{ side: "L", inner: [-0.04076, 1.78594, 0.51285], outer: [-0.04076, 1.78594, 0.51285] }], [{ side: "L", inner: [-0.04083, 1.78762, 0.5207], outer: [-0.04083, 1.78762, 0.5207] }], [{ side: "L", inner: [-0.04094, 1.78948, 0.52869], outer: [-0.04094, 1.78948, 0.52869] }], [{ side: "L", inner: [-0.04113, 1.79204, 0.53697], outer: [-0.04113, 1.79204, 0.53697] }], [{ side: "L", inner: [-0.04134, 1.7947, 0.54531], outer: [-0.04134, 1.7947, 0.54531] }], [{ side: "L", inner: [-0.04159, 1.79811, 0.55381], outer: [-0.04159, 1.79811, 0.55381] }], [{ side: "L", inner: [-0.04184, 1.8016, 0.56232], outer: [-0.04184, 1.8016, 0.56232] }], [{ side: "L", inner: [-0.04205, 1.80577, 0.57081], outer: [-0.04205, 1.80577, 0.57081] }], [{ side: "L", inner: [-0.04224, 1.81002, 0.57928], outer: [-0.04224, 1.81002, 0.57928] }], [{ side: "L", inner: [-0.04233, 1.81479, 0.58756], outer: [-0.04233, 1.81479, 0.58756] }], [{ side: "L", inner: [-0.04237, 1.81965, 0.59575], outer: [-0.04237, 1.81965, 0.59575] }], [{ side: "L", inner: [-0.04227, 1.82482, 0.60365], outer: [-0.04227, 1.82482, 0.60365] }], [{ side: "L", inner: [-0.04209, 1.83006, 0.61135], outer: [-0.04209, 1.83006, 0.61135] }], [{ side: "L", inner: [-0.04176, 1.83543, 0.61868], outer: [-0.04176, 1.83543, 0.61868] }], [{ side: "L", inner: [-0.04134, 1.84079, 0.6257], outer: [-0.04134, 1.84079, 0.6257] }], [{ side: "L", inner: [-0.04079, 1.84611, 0.63231], outer: [-0.04079, 1.84611, 0.63231] }], [{ side: "L", inner: [-0.04015, 1.85128, 0.63848], outer: [-0.04015, 1.85128, 0.63848] }], [{ side: "L", inner: [-0.03943, 1.8563, 0.64424], outer: [-0.03943, 1.8563, 0.64424] }], [{ side: "L", inner: [-0.03865, 1.86097, 0.6494], outer: [-0.03865, 1.86097, 0.6494] }], [{ side: "L", inner: [-0.03784, 1.86543, 0.6542], outer: [-0.03784, 1.86543, 0.6542] }], [{ side: "L", inner: [-0.03704, 1.86931, 0.65823], outer: [-0.03704, 1.86931, 0.65823] }], [{ side: "L", inner: [-0.03626, 1.87296, 0.66197], outer: [-0.03626, 1.87296, 0.66197] }], [{ side: "L", inner: [-0.0356, 1.87577, 0.66476], outer: [-0.0356, 1.87577, 0.66476] }], [{ side: "L", inner: [-0.03496, 1.87839, 0.66734], outer: [-0.03496, 1.87839, 0.66734] }], [{ side: "L", inner: [-0.03458, 1.87989, 0.66879], outer: [-0.03458, 1.87989, 0.66879] }], [{ side: "L", inner: [-0.03423, 1.88127, 0.67011], outer: [-0.03423, 1.88127, 0.67011] }], [{ side: "L", inner: [-0.03423, 1.88102, 0.67104], outer: [-0.03423, 1.88102, 0.67104] }], [{ side: "L", inner: [-0.03426, 1.8805, 0.67239], outer: [-0.03426, 1.8805, 0.67239] }], [{ side: "L", inner: [-0.03458, 1.87745, 0.67783], outer: [-0.03458, 1.87745, 0.67783] }], [{ side: "L", inner: [-0.03495, 1.87387, 0.6841], outer: [-0.03495, 1.87387, 0.6841] }], [{ side: "L", inner: [-0.03553, 1.86806, 0.69392], outer: [-0.03553, 1.86806, 0.69392] }], [{ side: "L", inner: [-0.03618, 1.86148, 0.70468], outer: [-0.03618, 1.86148, 0.70468] }], [{ side: "L", inner: [-0.03697, 1.85307, 0.71783], outer: [-0.03697, 1.85307, 0.71783] }], [{ side: "L", inner: [-0.03782, 1.84369, 0.73181], outer: [-0.03782, 1.84369, 0.73181] }], [{ side: "L", inner: [-0.03875, 1.83283, 0.74718], outer: [-0.03875, 1.83283, 0.74718] }], [{ side: "L", inner: [-0.03973, 1.82094, 0.76311], outer: [-0.03973, 1.82094, 0.76311] }], [{ side: "L", inner: [-0.04077, 1.8079, 0.77964], outer: [-0.04077, 1.8079, 0.77964] }], [{ side: "L", inner: [-0.04181, 1.79396, 0.79629], outer: [-0.04181, 1.79396, 0.79629] }], [{ side: "L", inner: [-0.0429, 1.77921, 0.81296], outer: [-0.0429, 1.77921, 0.81296] }], [{ side: "L", inner: [-0.04393, 1.76391, 0.82921], outer: [-0.04393, 1.76391, 0.82921] }], [{ side: "L", inner: [-0.04503, 1.74811, 0.84512], outer: [-0.04503, 1.74811, 0.84512] }], [{ side: "L", inner: [-0.046, 1.73237, 0.86002], outer: [-0.046, 1.73237, 0.86002] }], [{ side: "L", inner: [-0.04706, 1.71638, 0.87445], outer: [-0.04706, 1.71638, 0.87445] }], [{ side: "L", inner: [-0.04792, 1.70132, 0.88724], outer: [-0.04792, 1.70132, 0.88724] }], [{ side: "L", inner: [-0.04887, 1.68614, 0.8996], outer: [-0.04887, 1.68614, 0.8996] }], [{ side: "L", inner: [-0.04958, 1.673, 0.90973], outer: [-0.04958, 1.673, 0.90973] }], [{ side: "L", inner: [-0.05036, 1.65991, 0.91948], outer: [-0.05036, 1.65991, 0.91948] }], [{ side: "L", inner: [-0.05089, 1.64985, 0.92665], outer: [-0.05089, 1.64985, 0.92665] }], [{ side: "L", inner: [-0.05143, 1.64028, 0.9333], outer: [-0.05143, 1.64028, 0.9333] }], [{ side: "L", inner: [-0.05175, 1.63431, 0.93733], outer: [-0.05175, 1.63431, 0.93733] }], [{ side: "L", inner: [-0.05201, 1.62957, 0.94048], outer: [-0.05201, 1.62957, 0.94048] }], [{ side: "L", inner: [-0.05204, 1.62891, 0.94092], outer: [-0.05204, 1.62891, 0.94092] }], [{ side: "L", inner: [-0.05194, 1.6307, 0.93974], outer: [-0.05194, 1.6307, 0.93974] }], [{ side: "L", inner: [-0.05158, 1.63735, 0.93529], outer: [-0.05158, 1.63735, 0.93529] }], [{ side: "L", inner: [-0.05106, 1.64668, 0.92887], outer: [-0.05106, 1.64668, 0.92887] }], [{ side: "L", inner: [-0.05035, 1.65949, 0.91976], outer: [-0.05035, 1.65949, 0.91976] }], [{ side: "L", inner: [-0.04947, 1.67455, 0.90854], outer: [-0.04947, 1.67455, 0.90854] }], [{ side: "L", inner: [-0.04851, 1.69148, 0.89531], outer: [-0.04851, 1.69148, 0.89531] }], [{ side: "L", inner: [-0.04737, 1.70985, 0.88001], outer: [-0.04737, 1.70985, 0.88001] }], [{ side: "L", inner: [-0.04625, 1.72884, 0.86329], outer: [-0.04625, 1.72884, 0.86329] }], [{ side: "L", inner: [-0.04494, 1.74823, 0.84491], outer: [-0.04494, 1.74823, 0.84491] }], [{ side: "L", inner: [-0.04373, 1.76737, 0.82565], outer: [-0.04373, 1.76737, 0.82565] }], [{ side: "L", inner: [-0.04235, 1.78577, 0.80558], outer: [-0.04235, 1.78577, 0.80558] }], [{ side: "L", inner: [-0.04115, 1.80346, 0.78509], outer: [-0.04115, 1.80346, 0.78509] }], [{ side: "L", inner: [-0.03981, 1.81931, 0.76516], outer: [-0.03981, 1.81931, 0.76516] }], [{ side: "L", inner: [-0.03868, 1.83439, 0.74509], outer: [-0.03868, 1.83439, 0.74509] }], [{ side: "L", inner: [-0.03751, 1.84662, 0.72745], outer: [-0.03751, 1.84662, 0.72745] }], [{ side: "L", inner: [-0.03653, 1.85808, 0.7101], outer: [-0.03653, 1.85808, 0.7101] }], [{ side: "L", inner: [-0.03568, 1.86639, 0.69665], outer: [-0.03568, 1.86639, 0.69665] }], [{ side: "L", inner: [-0.03497, 1.87373, 0.68435], outer: [-0.03497, 1.87373, 0.68435] }], [{ side: "L", inner: [-0.03453, 1.87787, 0.67708], outer: [-0.03453, 1.87787, 0.67708] }], [{ side: "L", inner: [-0.03424, 1.88081, 0.67156], outer: [-0.03424, 1.88081, 0.67156] }], [{ side: "L", inner: [-0.03429, 1.88087, 0.67045], outer: [-0.03429, 1.88087, 0.67045] }], [{ side: "L", inner: [-0.03453, 1.88006, 0.66895], outer: [-0.03453, 1.88006, 0.66895] }], [{ side: "L", inner: [-0.03509, 1.87785, 0.66681], outer: [-0.03509, 1.87785, 0.66681] }], [{ side: "L", inner: [-0.03581, 1.87482, 0.66381], outer: [-0.03581, 1.87482, 0.66381] }], [{ side: "L", inner: [-0.03671, 1.8709, 0.65986], outer: [-0.03671, 1.8709, 0.65986] }], [{ side: "L", inner: [-0.03766, 1.86621, 0.65498], outer: [-0.03766, 1.86621, 0.65498] }], [{ side: "L", inner: [-0.03865, 1.86096, 0.6494], outer: [-0.03865, 1.86096, 0.6494] }], [{ side: "L", inner: [-0.03957, 1.85513, 0.64285], outer: [-0.03957, 1.85513, 0.64285] }], [{ side: "L", inner: [-0.04046, 1.849, 0.63581], outer: [-0.04046, 1.849, 0.63581] }], [{ side: "L", inner: [-0.04113, 1.84256, 0.62782], outer: [-0.04113, 1.84256, 0.62782] }], [{ side: "L", inner: [-0.04175, 1.83601, 0.61954], outer: [-0.04175, 1.83601, 0.61954] }], [{ side: "L", inner: [-0.04207, 1.82952, 0.61039], outer: [-0.04207, 1.82952, 0.61039] }], [{ side: "L", inner: [-0.04235, 1.82303, 0.60111], outer: [-0.04235, 1.82303, 0.60111] }], [{ side: "L", inner: [-0.04232, 1.817, 0.59116], outer: [-0.04232, 1.817, 0.59116] }], [{ side: "L", inner: [-0.04228, 1.81103, 0.58115], outer: [-0.04228, 1.81103, 0.58115] }], [{ side: "L", inner: [-0.04204, 1.80584, 0.5708], outer: [-0.04204, 1.80584, 0.5708] }], [{ side: "L", inner: [-0.04179, 1.80081, 0.56043], outer: [-0.04179, 1.80081, 0.56043] }], [{ side: "L", inner: [-0.04148, 1.7967, 0.55005], outer: [-0.04148, 1.7967, 0.55005] }], [{ side: "L", inner: [-0.0412, 1.79287, 0.53974], outer: [-0.0412, 1.79287, 0.53974] }], [{ side: "L", inner: [-0.04097, 1.78994, 0.52968], outer: [-0.04097, 1.78994, 0.52968] }], [{ side: "L", inner: [-0.04082, 1.7874, 0.51982], outer: [-0.04082, 1.7874, 0.51982] }], [{ side: "L", inner: [-0.04079, 1.78565, 0.5104], outer: [-0.04079, 1.78565, 0.5104] }], [{ side: "L", inner: [-0.04087, 1.78434, 0.50138], outer: [-0.04087, 1.78434, 0.50138] }], [{ side: "L", inner: [-0.04109, 1.78362, 0.49289], outer: [-0.04109, 1.78362, 0.49289] }], [{ side: "L", inner: [-0.04142, 1.78333, 0.48501], outer: [-0.04142, 1.78333, 0.48501] }], [{ side: "L", inner: [-0.04185, 1.78342, 0.47769], outer: [-0.04185, 1.78342, 0.47769] }], [{ side: "L", inner: [-0.04237, 1.78382, 0.47121], outer: [-0.04237, 1.78382, 0.47121] }], [{ side: "L", inner: [-0.04294, 1.78442, 0.46525], outer: [-0.04294, 1.78442, 0.46525] }], [{ side: "L", inner: [-0.04352, 1.78514, 0.46037], outer: [-0.04352, 1.78514, 0.46037] }], [{ side: "L", inner: [-0.04409, 1.78592, 0.45593], outer: [-0.04409, 1.78592, 0.45593] }], [{ side: "L", inner: [-0.04455, 1.78659, 0.45284], outer: [-0.04455, 1.78659, 0.45284] }], [{ side: "L", inner: [-0.04498, 1.78723, 0.45006], outer: [-0.04498, 1.78723, 0.45006] }], [{ side: "L", inner: [-0.04517, 1.78752, 0.44892], outer: [-0.04517, 1.78752, 0.44892] }], [{ side: "L", inner: [-0.04534, 1.78777, 0.44795], outer: [-0.04534, 1.78777, 0.44795] }]] }, hedge_knight_sword: { durations: { Draw: 3.2, Stow: 3.2, Swing: 1.8 }, windows: [{ side: null, start: 0.2, end: 0.65 }], frames: [[{ side: "L", inner: [-0.25244, 1.46044, 0.34714], outer: [-0.17401, 2.0879, 0.5083] }], [{ side: "L", inner: [-0.2624, 1.4575, 0.35117], outer: [-0.18798, 2.08321, 0.52079] }], [{ side: "L", inner: [-0.27261, 1.45455, 0.35506], outer: [-0.20274, 2.07851, 0.53287] }], [{ side: "L", inner: [-0.29637, 1.44794, 0.3628], outer: [-0.23734, 2.0673, 0.55961] }], [{ side: "L", inner: [-0.32554, 1.4403, 0.37061], outer: [-0.28232, 2.0543, 0.58732] }], [{ side: "L", inner: [-0.36268, 1.43102, 0.37756], outer: [-0.34145, 2.03723, 0.61818] }], [{ side: "L", inner: [-0.4078, 1.42057, 0.38199], outer: [-0.41681, 2.01733, 0.64584] }], [{ side: "L", inner: [-0.45711, 1.4097, 0.38223], outer: [-0.50284, 1.99564, 0.66579] }], [{ side: "L", inner: [-0.51277, 1.39771, 0.37641], outer: [-0.60392, 1.96951, 0.67734] }], [{ side: "L", inner: [-0.57019, 1.38647, 0.36382], outer: [-0.71106, 1.94542, 0.66969] }], [{ side: "L", inner: [-0.62833, 1.37311, 0.34426], outer: [-0.82564, 1.91246, 0.65409] }], [{ side: "L", inner: [-0.68626, 1.36173, 0.31586], outer: [-0.93956, 1.88561, 0.61118] }], [{ side: "L", inner: [-0.73853, 1.34729, 0.28353], outer: [-1.04971, 1.84753, 0.56416] }], [{ side: "L", inner: [-0.78786, 1.33462, 0.24299], outer: [-1.15249, 1.8147, 0.49279] }], [{ side: "L", inner: [-0.82889, 1.32042, 0.20165], outer: [-1.2421, 1.77639, 0.41886] }], [{ side: "L", inner: [-0.8641, 1.30641, 0.15688], outer: [-1.32001, 1.73826, 0.3343] }], [{ side: "L", inner: [-0.89168, 1.29336, 0.11289], outer: [-1.38147, 1.70269, 0.24846] }], [{ side: "L", inner: [-0.9121, 1.27985, 0.07269], outer: [-1.42972, 1.66517, 0.16974] }], [{ side: "L", inner: [-0.92763, 1.26859, 0.03295], outer: [-1.46514, 1.63426, 0.08949] }], [{ side: "L", inner: [-0.93629, 1.25909, 413e-5], outer: [-1.48721, 1.60765, 0.03279] }], [{ side: "L", inner: [-0.94335, 1.25051, -0.02584], outer: [-1.50432, 1.58387, -0.02748] }], [{ side: "L", inner: [-0.94448, 1.24822, -0.03889], outer: [-1.50776, 1.57744, -0.0511] }], [{ side: "L", inner: [-0.94544, 1.24601, -0.05201], outer: [-1.5107, 1.57126, -0.07491] }], [{ side: "L", inner: [-0.94551, 1.24553, -0.05685], outer: [-1.51111, 1.56992, -0.08327] }], [{ side: "L", inner: [-0.94536, 1.24553, -0.05932], outer: [-1.51088, 1.56992, -0.08719] }], [{ side: "L", inner: [-0.94538, 1.24553, -0.05664], outer: [-1.511, 1.56992, -0.08261] }], [{ side: "L", inner: [-0.94554, 1.24553, -0.04985], outer: [-1.51134, 1.56992, -0.07121] }], [{ side: "L", inner: [-0.94563, 1.24553, -0.04005], outer: [-1.51165, 1.56992, -0.05475] }], [{ side: "L", inner: [-0.94557, 1.24553, -0.02422], outer: [-1.51176, 1.56992, -0.02817] }], [{ side: "L", inner: [-0.94531, 1.24553, -748e-5], outer: [-1.51147, 1.56992, -5e-5] }], [{ side: "L", inner: [-0.94408, 1.24553, 0.0165], outer: [-1.50979, 1.56992, 0.04027] }], [{ side: "L", inner: [-0.94263, 1.24553, 0.04048], outer: [-1.50742, 1.56992, 0.08056] }], [{ side: "L", inner: [-0.93919, 1.24553, 0.07082], outer: [-1.50213, 1.56992, 0.13162] }], [{ side: "L", inner: [-0.93516, 1.24553, 0.10192], outer: [-1.4954, 1.56992, 0.18391] }], [{ side: "L", inner: [-0.92869, 1.24553, 0.13698], outer: [-1.4849, 1.56992, 0.24296] }], [{ side: "L", inner: [-0.92068, 1.24553, 0.17394], outer: [-1.47147, 1.56992, 0.30518] }], [{ side: "L", inner: [-0.91031, 1.24553, 0.213], outer: [-1.45406, 1.56992, 0.37087] }], [{ side: "L", inner: [-0.89702, 1.24553, 0.25463], outer: [-1.43174, 1.56992, 0.44082] }], [{ side: "L", inner: [-0.88194, 1.24553, 0.29687], outer: [-1.40588, 1.56992, 0.51155] }], [{ side: "L", inner: [-0.86227, 1.24553, 0.34178], outer: [-1.37278, 1.56992, 0.58667] }], [{ side: "L", inner: [-0.84176, 1.24553, 0.38629], outer: [-1.33711, 1.56992, 0.66056] }], [{ side: "L", inner: [-0.81483, 1.24553, 0.43251], outer: [-1.29184, 1.56992, 0.73756] }], [{ side: "L", inner: [-0.78698, 1.24553, 0.47814], outer: [-1.24374, 1.56992, 0.81276] }], [{ side: "L", inner: [-0.75369, 1.24553, 0.52348], outer: [-1.18726, 1.56992, 0.88764] }], [{ side: "L", inner: [-0.71816, 1.24553, 0.56814], outer: [-1.12629, 1.56992, 0.9606] }], [{ side: "L", inner: [-0.67856, 1.24553, 0.61161], outer: [-1.05873, 1.56992, 1.03121] }], [{ side: "L", inner: [-0.63552, 1.24553, 0.65384], outer: [-0.98535, 1.56992, 1.09905] }], [{ side: "L", inner: [-0.58991, 1.24553, 0.69422], outer: [-0.90738, 1.56992, 1.16305] }], [{ side: "L", inner: [-0.54002, 1.24553, 0.73184], outer: [-0.82291, 1.56992, 1.22232] }], [{ side: "L", inner: [-0.48896, 1.24553, 0.76778], outer: [-0.73573, 1.56992, 1.27739] }], [{ side: "L", inner: [-0.43348, 1.24553, 0.7987], outer: [-0.64243, 1.56992, 1.32494] }], [{ side: "L", inner: [-0.37748, 1.24553, 0.82827], outer: [-0.54748, 1.56992, 1.36835] }], [{ side: "L", inner: [-0.31858, 1.24553, 0.85143], outer: [-0.44876, 1.56992, 1.40247] }], [{ side: "L", inner: [-0.25905, 1.24553, 0.87256], outer: [-0.34871, 1.56992, 1.43163] }], [{ side: "L", inner: [-0.1987, 1.24553, 0.8879], outer: [-0.24776, 1.56992, 1.45198] }], [{ side: "L", inner: [-0.13794, 1.24553, 0.89966], outer: [-0.14633, 1.56992, 1.46581] }], [{ side: "L", inner: [-0.07768, 1.24553, 0.907], outer: [-0.04589, 1.56992, 1.47232] }], [{ side: "L", inner: [-0.01816, 1.24553, 0.90924], outer: [0.05303, 1.56992, 1.47096] }], [{ side: "L", inner: [0.04048, 1.24553, 0.90878], outer: [0.15035, 1.56992, 1.46422] }], [{ side: "L", inner: [0.09638, 1.24553, 0.90219], outer: [0.24313, 1.56992, 1.44905] }], [{ side: "L", inner: [0.15197, 1.24553, 0.89444], outer: [0.33493, 1.56992, 1.43027] }], [{ side: "L", inner: [0.20226, 1.24553, 0.88046], outer: [0.41851, 1.56992, 1.40374] }], [{ side: "L", inner: [0.25214, 1.24553, 0.86549], outer: [0.50083, 1.56992, 1.37416] }], [{ side: "L", inner: [0.29679, 1.24553, 0.84694], outer: [0.57503, 1.56992, 1.34007] }], [{ side: "L", inner: [0.33963, 1.24553, 0.82683], outer: [0.64591, 1.56992, 1.30305] }], [{ side: "L", inner: [0.37838, 1.24553, 0.80541], outer: [0.71016, 1.56992, 1.26423] }], [{ side: "L", inner: [0.41381, 1.24553, 0.78293], outer: [0.76892, 1.56992, 1.22394] }], [{ side: "L", inner: [0.44659, 1.24553, 0.76022], outer: [0.8231, 1.56992, 1.18311] }], [{ side: "L", inner: [0.4746, 1.24553, 0.7377], outer: [0.8697, 1.56992, 1.14328] }], [{ side: "L", inner: [0.50153, 1.24553, 0.7151], outer: [0.91407, 1.56992, 1.10292] }], [{ side: "L", inner: [0.5225, 1.24553, 0.69464], outer: [0.94907, 1.56992, 1.06698] }], [{ side: "L", inner: [0.5432, 1.24553, 0.67394], outer: [0.98321, 1.56992, 1.0303] }], [{ side: "L", inner: [0.55852, 1.24553, 0.65697], outer: [1.00864, 1.56992, 1.00046] }], [{ side: "L", inner: [0.57302, 1.24553, 0.64036], outer: [1.03256, 1.56992, 0.97115] }], [{ side: "L", inner: [0.58371, 1.24553, 0.62745], outer: [1.05018, 1.56992, 0.94838] }], [{ side: "L", inner: [0.5925, 1.24553, 0.61637], outer: [1.06466, 1.56992, 0.92888] }], [{ side: "L", inner: [0.59883, 1.24553, 0.60825], outer: [1.07504, 1.56992, 0.91455] }], [{ side: "L", inner: [0.60214, 1.24553, 0.60385], outer: [1.08048, 1.56992, 0.9068] }], [{ side: "L", inner: [0.60441, 1.24553, 0.60071], outer: [1.08425, 1.56992, 0.90128] }], [{ side: "L", inner: [0.6031, 1.24553, 0.60201], outer: [1.08229, 1.56992, 0.90362] }], [{ side: "L", inner: [0.60179, 1.24553, 0.60331], outer: [1.08033, 1.56992, 0.90596] }], [{ side: "L", inner: [0.59734, 1.24553, 0.60769], outer: [1.07365, 1.56992, 0.91383] }], [{ side: "L", inner: [0.59288, 1.24553, 0.61205], outer: [1.06693, 1.56992, 0.92168] }], [{ side: "L", inner: [0.58618, 1.24553, 0.61841], outer: [1.05684, 1.56992, 0.93316] }], [{ side: "L", inner: [0.57881, 1.24553, 0.62533], outer: [1.04571, 1.56992, 0.94563] }], [{ side: "L", inner: [0.56986, 1.24553, 0.63349], outer: [1.03215, 1.56992, 0.96042] }], [{ side: "L", inner: [0.55962, 1.24553, 0.64263], outer: [1.01657, 1.56992, 0.97699] }], [{ side: "L", inner: [0.54404, 1.24553, 0.6582], outer: [0.9917, 1.56992, 1.00489] }], [{ side: "L", inner: [0.51751, 1.24553, 0.68642], outer: [0.94748, 1.56992, 1.05482] }], [{ side: "L", inner: [0.48754, 1.24553, 0.71633], outer: [0.89692, 1.56992, 1.10748] }], [{ side: "L", inner: [0.43289, 1.24553, 0.7621], outer: [0.80462, 1.56992, 1.18919] }], [{ side: "L", inner: [0.37673, 1.24553, 0.80615], outer: [0.70768, 1.56992, 1.26557] }], [{ side: "L", inner: [0.29249, 1.24553, 0.84592], outer: [0.56699, 1.56992, 1.34114] }], [{ side: "L", inner: [0.20302, 1.24553, 0.88197], outer: [0.41552, 1.56992, 1.4068] }], [{ side: "L", inner: [0.09728, 1.24553, 0.90002], outer: [0.23866, 1.56992, 1.4483] }], [{ side: "L", inner: [-0.01705, 1.24553, 0.90611], outer: [0.04765, 1.56992, 1.46861] }], [{ side: "L", inner: [-0.1328, 1.24553, 0.89744], outer: [-0.14687, 1.56992, 1.46347] }], [{ side: "L", inner: [-0.24946, 1.24553, 0.87136], outer: [-0.34307, 1.56992, 1.42978] }], [{ side: "L", inner: [-0.36155, 1.24553, 0.83781], outer: [-0.53169, 1.56992, 1.37785] }], [{ side: "L", inner: [-0.45934, 1.24553, 0.79199], outer: [-0.6989, 1.56992, 1.30502] }], [{ side: "L", inner: [-0.55514, 1.24553, 0.74191], outer: [-0.85997, 1.56992, 1.21906] }], [{ side: "L", inner: [-0.62428, 1.24553, 0.68883], outer: [-0.97921, 1.56992, 1.12998] }], [{ side: "L", inner: [-0.69139, 1.24553, 0.63324], outer: [-1.09222, 1.56992, 1.03315] }], [{ side: "L", inner: [-0.73648, 1.24553, 0.58549], outer: [-1.16847, 1.56992, 0.95153] }], [{ side: "L", inner: [-0.77468, 1.24553, 0.53955], outer: [-1.23233, 1.56992, 0.87294] }], [{ side: "L", inner: [-0.79797, 1.24683, 0.50673], outer: [-1.26908, 1.57358, 0.81837] }], [{ side: "L", inner: [-0.80997, 1.24907, 0.48488], outer: [-1.28607, 1.57987, 0.78441] }], [{ side: "L", inner: [-0.81318, 1.25529, 0.46999], outer: [-1.28323, 1.59709, 0.76674] }], [{ side: "L", inner: [-0.79865, 1.27048, 0.46689], outer: [-1.24014, 1.63931, 0.77492] }], [{ side: "L", inner: [-0.78111, 1.28658, 0.46275], outer: [-1.19099, 1.68406, 0.77872] }], [{ side: "L", inner: [-0.73862, 1.30582, 0.47158], outer: [-1.09078, 1.73607, 0.81319] }], [{ side: "L", inner: [-0.69559, 1.32846, 0.46959], outer: [-0.98892, 1.7986, 0.81419] }], [{ side: "L", inner: [-0.63257, 1.3461, 0.47491], outer: [-0.85491, 1.84323, 0.83442] }], [{ side: "L", inner: [-0.56803, 1.36705, 0.46775], outer: [-0.71993, 1.8978, 0.81568] }], [{ side: "L", inner: [-0.50029, 1.38516, 0.45697], outer: [-0.58732, 1.94012, 0.78905] }], [{ side: "L", inner: [-0.43309, 1.40326, 0.43889], outer: [-0.46249, 1.98065, 0.74151] }], [{ side: "L", inner: [-0.37577, 1.42019, 0.41591], outer: [-0.3631, 2.01633, 0.681] }], [{ side: "L", inner: [-0.32632, 1.43489, 0.39323], outer: [-0.28158, 2.04356, 0.62419] }], [{ side: "L", inner: [-0.28784, 1.44785, 0.37025], outer: [-0.22465, 2.06741, 0.56514] }], [{ side: "L", inner: [-0.26963, 1.45416, 0.35893], outer: [-0.19773, 2.07769, 0.53745] }], [{ side: "L", inner: [-0.25245, 1.46044, 0.34714], outer: [-0.17402, 2.0879, 0.5083] }]] }, unarmed: { durations: { Draw: 0, Stow: 0, Swing: 1.8 }, windows: [{ side: "R", start: 0.18, end: 0.36 }, { side: "L", start: 0.36, end: 0.53 }], frames: [[{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }], [{ side: "R", inner: [0.38201, 0.84404, 267e-5], outer: [0.39117, 0.83029, 0.09609] }, { side: "L", inner: [-0.38071, 0.85804, 0.09157], outer: [-0.39247, 0.81629, 719e-5] }], [{ side: "R", inner: [0.3883, 0.84649, 0.01363], outer: [0.3965, 0.83538, 0.10748] }, { side: "L", inner: [-0.38567, 0.86284, 0.10209], outer: [-0.39913, 0.81904, 0.01902] }], [{ side: "R", inner: [0.40154, 0.85485, 0.03876], outer: [0.40721, 0.84985, 0.13333] }, { side: "L", inner: [-0.39561, 0.8765, 0.12592], outer: [-0.41315, 0.8282, 0.04617] }], [{ side: "R", inner: [0.41662, 0.86539, 0.06812], outer: [0.41906, 0.86738, 0.16294] }, { side: "L", inner: [-0.40666, 0.89292, 0.15323], outer: [-0.42903, 0.83986, 0.07783] }], [{ side: "R", inner: [0.43238, 0.88341, 0.1037], outer: [0.43016, 0.8939, 0.19796] }, { side: "L", inner: [-0.41696, 0.91775, 0.18545], outer: [-0.44558, 0.85955, 0.11622] }], [{ side: "R", inner: [0.44837, 0.90802, 0.14433], outer: [0.44012, 0.92788, 0.23672] }, { side: "L", inner: [-0.42628, 0.94944, 0.22111], outer: [-0.46221, 0.88646, 0.15994] }], [{ side: "R", inner: [0.46157, 0.93837, 0.18539], outer: [0.44624, 0.96742, 0.27439] }, { side: "L", inner: [-0.43209, 0.98617, 0.25572], outer: [-0.47572, 0.91963, 0.20405] }], [{ side: "R", inner: [0.46944, 0.97933, 0.22707], outer: [0.44541, 1.0174, 0.31058] }, { side: "L", inner: [-0.43142, 1.03262, 0.28884], outer: [-0.48343, 0.96411, 0.24881] }], [{ side: "R", inner: [0.47486, 1.02269, 0.26741], outer: [0.44183, 1.06838, 0.34371] }, { side: "L", inner: [-0.42849, 1.07972, 0.31935], outer: [-0.48819, 1.01135, 0.29176] }], [{ side: "R", inner: [0.46831, 1.07472, 0.29922], outer: [0.42529, 1.12633, 0.3662] }, { side: "L", inner: [-0.4133, 1.13338, 0.33962], outer: [-0.48031, 1.06766, 0.3258] }], [{ side: "R", inner: [0.46027, 1.12806, 0.33004], outer: [0.40767, 1.18349, 0.38626] }, { side: "L", inner: [-0.39754, 1.18616, 0.35815], outer: [-0.47039, 1.12539, 0.35815] }], [{ side: "R", inner: [0.44079, 1.18035, 0.34666], outer: [0.37909, 1.23707, 0.39111] }, { side: "L", inner: [-0.37141, 1.23553, 0.36216], outer: [-0.44848, 1.18188, 0.37562] }], [{ side: "R", inner: [0.41859, 1.23306, 0.36024], outer: [0.3488, 1.28883, 0.39217] }, { side: "L", inner: [-0.34396, 1.28328, 0.36308], outer: [-0.42343, 1.23861, 0.38932] }], [{ side: "R", inner: [0.39201, 1.27834, 0.36332], outer: [0.31569, 1.3311, 0.38312] }, { side: "L", inner: [-0.31388, 1.32215, 0.35455], outer: [-0.39382, 1.2873, 0.3919] }], [{ side: "R", inner: [0.36282, 1.31977, 0.36051], outer: [0.28142, 1.36783, 0.36851] }, { side: "L", inner: [-0.28277, 1.35596, 0.34099], outer: [-0.36148, 1.33164, 0.38803] }], [{ side: "R", inner: [0.33446, 1.35422, 0.35336], outer: [0.24963, 1.39662, 0.35076] }, { side: "L", inner: [-0.25397, 1.38247, 0.32466], outer: [-0.33012, 1.36837, 0.37945] }], [{ side: "R", inner: [0.3077, 1.37991, 0.34151], outer: [0.22088, 1.41633, 0.32987] }, { side: "L", inner: [-0.22791, 1.40055, 0.30535], outer: [-0.30067, 1.39569, 0.36603] }], [{ side: "R", inner: [0.28279, 1.4023, 0.3292], outer: [0.19503, 1.43255, 0.30962] }, { side: "L", inner: [-0.20452, 1.41555, 0.2868], outer: [-0.2733, 1.41931, 0.35202] }], [{ side: "R", inner: [0.26567, 1.41419, 0.31799], outer: [0.17777, 1.43989, 0.29322] }, { side: "L", inner: [-0.18892, 1.42225, 0.27167], outer: [-0.25451, 1.43183, 0.33954] }], [{ side: "R", inner: [0.24843, 1.42587, 0.30642], outer: [0.1608, 1.44679, 0.27669] }, { side: "L", inner: [-0.17359, 1.42864, 0.25651], outer: [-0.23565, 1.44402, 0.3266] }], [{ side: "R", inner: [0.24444, 1.42813, 0.30372], outer: [0.15693, 1.44788, 0.27287] }, { side: "L", inner: [-0.17012, 1.42966, 0.2527], outer: [-0.2313, 1.44638, 0.32325] }], [{ side: "R", inner: [0.24044, 1.43037, 0.301], outer: [0.15307, 1.44896, 0.26905] }, { side: "L", inner: [-0.16667, 1.43067, 0.24889], outer: [-0.22695, 1.44872, 0.31989] }], [{ side: "R", inner: [0.23922, 1.43066, 0.30486], outer: [0.15177, 1.44889, 0.27291] }, { side: "L", inner: [-0.16591, 1.43088, 0.24807], outer: [-0.226, 1.44923, 0.31914] }], [{ side: "R", inner: [0.23879, 1.4304, 0.31061], outer: [0.15121, 1.44851, 0.27896] }, { side: "L", inner: [-0.16591, 1.43087, 0.24809], outer: [-0.22602, 1.44922, 0.31915] }], [{ side: "R", inner: [0.23821, 1.42997, 0.31972], outer: [0.15037, 1.44786, 0.28868] }, { side: "L", inner: [-0.1659, 1.43086, 0.24812], outer: [-0.22604, 1.44919, 0.31917] }], [{ side: "R", inner: [0.23751, 1.4294, 0.3315], outer: [0.14931, 1.44701, 0.30132] }, { side: "L", inner: [-0.1659, 1.43084, 0.24817], outer: [-0.22608, 1.44917, 0.31919] }], [{ side: "R", inner: [0.23683, 1.42872, 0.34476], outer: [0.14819, 1.446, 0.31571] }, { side: "L", inner: [-0.1659, 1.43082, 0.24823], outer: [-0.22612, 1.44914, 0.31921] }], [{ side: "R", inner: [0.2362, 1.42783, 0.361], outer: [0.14695, 1.44467, 0.3336] }, { side: "L", inner: [-0.1659, 1.4308, 0.24829], outer: [-0.22617, 1.4491, 0.31924] }], [{ side: "R", inner: [0.2356, 1.42691, 0.37754], outer: [0.14575, 1.44327, 0.35187] }, { side: "L", inner: [-0.1659, 1.43077, 0.24836], outer: [-0.22622, 1.44906, 0.31926] }], [{ side: "R", inner: [0.23525, 1.42567, 0.39664], outer: [0.14462, 1.44145, 0.37346] }, { side: "L", inner: [-0.1659, 1.43074, 0.24844], outer: [-0.22628, 1.44902, 0.31929] }], [{ side: "R", inner: [0.23491, 1.42445, 0.41568], outer: [0.14357, 1.43958, 0.39499] }, { side: "L", inner: [-0.1659, 1.43071, 0.24852], outer: [-0.22634, 1.44897, 0.31933] }], [{ side: "R", inner: [0.23492, 1.42287, 0.43582], outer: [0.1428, 1.43728, 0.41829] }, { side: "L", inner: [-0.1659, 1.43068, 0.24861], outer: [-0.22641, 1.44892, 0.31936] }], [{ side: "R", inner: [0.23499, 1.42127, 0.45601], outer: [0.14219, 1.43484, 0.44173] }, { side: "L", inner: [-0.1659, 1.43065, 0.2487], outer: [-0.22648, 1.44888, 0.31939] }], [{ side: "R", inner: [0.23538, 1.41939, 0.47583], outer: [0.14196, 1.43207, 0.46521] }, { side: "L", inner: [-0.1659, 1.43062, 0.24878], outer: [-0.22655, 1.44883, 0.31943] }], [{ side: "R", inner: [0.23594, 1.41739, 0.49538], outer: [0.14203, 1.42905, 0.4886] }, { side: "L", inner: [-0.1659, 1.43058, 0.24887], outer: [-0.22661, 1.44878, 0.31946] }], [{ side: "R", inner: [0.23675, 1.4152, 0.5138], outer: [0.14251, 1.42578, 0.51106] }, { side: "L", inner: [-0.16591, 1.43055, 0.24895], outer: [-0.22668, 1.44874, 0.31949] }], [{ side: "R", inner: [0.23787, 1.41278, 0.53081], outer: [0.14348, 1.42218, 0.53234] }, { side: "L", inner: [-0.16591, 1.43053, 0.24903], outer: [-0.22674, 1.44869, 0.31952] }], [{ side: "R", inner: [0.23914, 1.41029, 0.54671], outer: [0.1448, 1.41839, 0.55254] }, { side: "L", inner: [-0.16588, 1.43048, 0.24943], outer: [-0.22678, 1.44863, 0.31987] }], [{ side: "R", inner: [0.24089, 1.40747, 0.55914], outer: [0.14683, 1.41425, 0.5695] }, { side: "L", inner: [-0.16573, 1.4304, 0.25096], outer: [-0.22671, 1.4485, 0.32134] }], [{ side: "R", inner: [0.24263, 1.40471, 0.57132], outer: [0.14908, 1.40997, 0.58612] }, { side: "L", inner: [-0.16559, 1.43031, 0.25248], outer: [-0.22664, 1.44836, 0.32281] }], [{ side: "R", inner: [0.24502, 1.40162, 0.57702], outer: [0.15223, 1.40549, 0.59637] }, { side: "L", inner: [-0.16496, 1.42999, 0.25893], outer: [-0.22622, 1.44789, 0.32913] }], [{ side: "R", inner: [0.24736, 1.39861, 0.58242], outer: [0.15555, 1.40088, 0.60621] }, { side: "L", inner: [-0.16434, 1.42968, 0.26538], outer: [-0.2258, 1.44742, 0.33544] }], [{ side: "R", inner: [0.24848, 1.39726, 0.58345], outer: [0.15718, 1.39881, 0.60919] }, { side: "L", inner: [-0.16344, 1.4292, 0.27518], outer: [-0.22527, 1.4467, 0.34497] }], [{ side: "R", inner: [0.24926, 1.39637, 0.58326], outer: [0.15832, 1.39747, 0.61024] }, { side: "L", inner: [-0.16246, 1.42867, 0.28594], outer: [-0.22471, 1.4459, 0.35542] }], [{ side: "R", inner: [0.24941, 1.39622, 0.58281], outer: [0.15852, 1.39724, 0.61] }, { side: "L", inner: [-0.16136, 1.42801, 0.29864], outer: [-0.22423, 1.44491, 0.36765] }], [{ side: "R", inner: [0.24905, 1.39666, 0.58216], outer: [0.15798, 1.3979, 0.60874] }, { side: "L", inner: [-0.16017, 1.42725, 0.31289], outer: [-0.2238, 1.44377, 0.3813] }], [{ side: "R", inner: [0.24835, 1.39751, 0.58095], outer: [0.15695, 1.3992, 0.60632] }, { side: "L", inner: [-0.15898, 1.42641, 0.32801], outer: [-0.22347, 1.4425, 0.3957] }], [{ side: "R", inner: [0.24697, 1.39922, 0.57859], outer: [0.15495, 1.40178, 0.60153] }, { side: "L", inner: [-0.15776, 1.42541, 0.34487], outer: [-0.22334, 1.441, 0.41162] }], [{ side: "R", inner: [0.24558, 1.40094, 0.57588], outer: [0.15301, 1.40433, 0.59634] }, { side: "L", inner: [-0.15657, 1.42437, 0.3619], outer: [-0.22328, 1.43946, 0.42765] }], [{ side: "R", inner: [0.24431, 1.40266, 0.57102], outer: [0.15124, 1.40695, 0.58891] }, { side: "L", inner: [-0.15546, 1.42314, 0.3804], outer: [-0.22356, 1.43757, 0.44486] }], [{ side: "R", inner: [0.24303, 1.40441, 0.56607], outer: [0.14954, 1.40954, 0.58134] }, { side: "L", inner: [-0.15441, 1.42186, 0.39886], outer: [-0.22387, 1.43568, 0.46199] }], [{ side: "R", inner: [0.24195, 1.40605, 0.55932], outer: [0.14813, 1.41202, 0.57203] }, { side: "L", inner: [-0.15355, 1.42038, 0.41787], outer: [-0.22459, 1.43342, 0.47938] }], [{ side: "R", inner: [0.24089, 1.40769, 0.55226], outer: [0.1468, 1.41446, 0.56241] }, { side: "L", inner: [-0.15279, 1.41883, 0.43689], outer: [-0.22539, 1.43112, 0.49671] }], [{ side: "R", inner: [0.23997, 1.40923, 0.54414], outer: [0.14571, 1.41679, 0.55178] }, { side: "L", inner: [-0.15227, 1.41712, 0.45556], outer: [-0.22655, 1.42853, 0.51346] }], [{ side: "R", inner: [0.23912, 1.41074, 0.53545], outer: [0.14476, 1.41904, 0.5406] }, { side: "L", inner: [-0.15193, 1.41529, 0.47399], outer: [-0.2279, 1.42579, 0.52983] }], [{ side: "R", inner: [0.23836, 1.41219, 0.52621], outer: [0.14396, 1.42121, 0.52891] }, { side: "L", inner: [-0.15183, 1.41334, 0.49162], outer: [-0.22951, 1.42286, 0.54524] }], [{ side: "R", inner: [0.23772, 1.41356, 0.51632], outer: [0.14336, 1.42328, 0.51662] }, { side: "L", inner: [-0.15203, 1.41124, 0.50824], outer: [-0.23145, 1.41968, 0.55943] }], [{ side: "R", inner: [0.23713, 1.41491, 0.5062], outer: [0.14285, 1.42528, 0.50414] }, { side: "L", inner: [-0.15243, 1.40904, 0.5241], outer: [-0.23355, 1.41642, 0.57273] }], [{ side: "R", inner: [0.23669, 1.41614, 0.4955], outer: [0.14256, 1.42715, 0.49119] }, { side: "L", inner: [-0.15326, 1.40668, 0.53762], outer: [-0.2361, 1.41282, 0.58345] }], [{ side: "R", inner: [0.23625, 1.41739, 0.48475], outer: [0.14232, 1.42899, 0.47816] }, { side: "L", inner: [-0.15422, 1.40424, 0.55097], outer: [-0.23867, 1.40926, 0.59389] }], [{ side: "R", inner: [0.23598, 1.4185, 0.47361], outer: [0.1423, 1.43068, 0.46492] }, { side: "L", inner: [-0.15574, 1.40172, 0.56003], outer: [-0.2418, 1.40537, 0.5998] }], [{ side: "R", inner: [0.23573, 1.41962, 0.46243], outer: [0.14234, 1.43234, 0.45163] }, { side: "L", inner: [-0.15738, 1.39911, 0.5689], outer: [-0.24491, 1.40153, 0.6054] }], [{ side: "R", inner: [0.23559, 1.42063, 0.45119], outer: [0.14252, 1.43387, 0.4384] }, { side: "L", inner: [-0.15844, 1.39764, 0.57283], outer: [-0.24676, 1.39934, 0.60743] }], [{ side: "R", inner: [0.2355, 1.42162, 0.4399], outer: [0.14279, 1.43535, 0.42518] }, { side: "L", inner: [-0.15934, 1.39649, 0.57534], outer: [-0.24824, 1.39763, 0.60844] }], [{ side: "R", inner: [0.23549, 1.42254, 0.42868], outer: [0.14315, 1.43673, 0.41214] }, { side: "L", inner: [-0.15974, 1.39598, 0.57673], outer: [-0.24889, 1.39688, 0.60915] }], [{ side: "R", inner: [0.23554, 1.42341, 0.4175], outer: [0.1436, 1.43803, 0.39924] }, { side: "L", inner: [-0.15973, 1.39598, 0.57722], outer: [-0.24888, 1.39688, 0.60965] }], [{ side: "R", inner: [0.23565, 1.42423, 0.40646], outer: [0.14412, 1.43926, 0.38656] }, { side: "L", inner: [-0.15945, 1.39633, 0.57713], outer: [-0.24843, 1.39738, 0.61001] }], [{ side: "R", inner: [0.23584, 1.42498, 0.39571], outer: [0.1447, 1.44038, 0.37433] }, { side: "L", inner: [-0.15862, 1.39735, 0.57586], outer: [-0.24708, 1.39892, 0.61009] }], [{ side: "R", inner: [0.23604, 1.42571, 0.38503], outer: [0.14532, 1.44147, 0.3622] }, { side: "L", inner: [-0.15774, 1.39848, 0.57412], outer: [-0.24561, 1.40061, 0.60982] }], [{ side: "R", inner: [0.23634, 1.42635, 0.37503], outer: [0.14599, 1.44243, 0.35097] }, { side: "L", inner: [-0.1564, 1.40047, 0.56887], outer: [-0.24318, 1.40354, 0.60709] }], [{ side: "R", inner: [0.23663, 1.42698, 0.36501], outer: [0.14668, 1.44338, 0.33973] }, { side: "L", inner: [-0.15512, 1.4024, 0.56351], outer: [-0.24074, 1.4065, 0.60418] }], [{ side: "R", inner: [0.23699, 1.42752, 0.35593], outer: [0.14737, 1.44419, 0.32964] }, { side: "L", inner: [-0.15413, 1.40434, 0.55562], outer: [-0.23853, 1.40935, 0.59865] }], [{ side: "R", inner: [0.23736, 1.42805, 0.34695], outer: [0.14808, 1.44498, 0.31968] }, { side: "L", inner: [-0.15324, 1.40622, 0.54733], outer: [-0.23637, 1.4122, 0.59264] }], [{ side: "R", inner: [0.23774, 1.42851, 0.33885], outer: [0.14876, 1.44567, 0.31077] }, { side: "L", inner: [-0.15258, 1.40804, 0.53747], outer: [-0.23442, 1.41492, 0.58496] }], [{ side: "R", inner: [0.23813, 1.42894, 0.33118], outer: [0.14942, 1.44631, 0.30238] }, { side: "L", inner: [-0.15208, 1.40981, 0.5268], outer: [-0.2326, 1.41757, 0.57636] }], [{ side: "R", inner: [0.23851, 1.42932, 0.32423], outer: [0.15005, 1.44688, 0.2948] }, { side: "L", inner: [-0.15174, 1.4115, 0.51529], outer: [-0.23092, 1.42011, 0.56683] }], [{ side: "R", inner: [0.23887, 1.42964, 0.31817], outer: [0.15061, 1.44737, 0.28824] }, { side: "L", inner: [-0.1516, 1.41311, 0.50278], outer: [-0.22944, 1.42252, 0.55618] }], [{ side: "R", inner: [0.23922, 1.42994, 0.31253], outer: [0.15114, 1.44781, 0.28214] }, { side: "L", inner: [-0.15157, 1.41467, 0.48993], outer: [-0.22805, 1.42489, 0.54513] }], [{ side: "R", inner: [0.23949, 1.43016, 0.30839], outer: [0.15155, 1.44814, 0.27767] }, { side: "L", inner: [-0.15175, 1.41612, 0.47613], outer: [-0.2269, 1.42704, 0.53299] }], [{ side: "R", inner: [0.23976, 1.43038, 0.30424], outer: [0.15195, 1.44847, 0.27321] }, { side: "L", inner: [-0.152, 1.41754, 0.46227], outer: [-0.22578, 1.42921, 0.52074] }], [{ side: "R", inner: [0.23987, 1.43049, 0.30232], outer: [0.15214, 1.44864, 0.27113] }, { side: "L", inner: [-0.15244, 1.41883, 0.44772], outer: [-0.22495, 1.43111, 0.50765] }], [{ side: "R", inner: [0.23999, 1.4306, 0.30041], outer: [0.15232, 1.4488, 0.26904] }, { side: "L", inner: [-0.15295, 1.42009, 0.43314], outer: [-0.22415, 1.43302, 0.49448] }], [{ side: "R", inner: [0.23999, 1.43064, 0.29991], outer: [0.15237, 1.44886, 0.26845] }, { side: "L", inner: [-0.15358, 1.42123, 0.41845], outer: [-0.22357, 1.43473, 0.48106] }], [{ side: "R", inner: [0.23997, 1.43067, 0.29981], outer: [0.15237, 1.4489, 0.26829] }, { side: "L", inner: [-0.15429, 1.42233, 0.40371], outer: [-0.22307, 1.43638, 0.46753] }], [{ side: "R", inner: [0.23993, 1.43069, 0.29976], outer: [0.15236, 1.44894, 0.26817] }, { side: "L", inner: [-0.15507, 1.42334, 0.38919], outer: [-0.22271, 1.4379, 0.4541] }], [{ side: "R", inner: [0.2399, 1.43071, 0.29976], outer: [0.15235, 1.44897, 0.2681] }, { side: "L", inner: [-0.15591, 1.42428, 0.37485], outer: [-0.22248, 1.43931, 0.44076] }], [{ side: "R", inner: [0.23987, 1.43073, 0.29975], outer: [0.15234, 1.449, 0.26803] }, { side: "L", inner: [-0.15679, 1.42516, 0.3608], outer: [-0.22233, 1.44064, 0.42762] }], [{ side: "R", inner: [0.23984, 1.43075, 0.29975], outer: [0.15234, 1.44902, 0.26797] }, { side: "L", inner: [-0.15771, 1.42596, 0.34735], outer: [-0.22234, 1.44182, 0.41495] }], [{ side: "R", inner: [0.2398, 1.43077, 0.29974], outer: [0.15233, 1.44905, 0.2679] }, { side: "L", inner: [-0.15864, 1.42672, 0.33403], outer: [-0.22239, 1.44298, 0.40239] }], [{ side: "R", inner: [0.23978, 1.43078, 0.29973], outer: [0.15232, 1.44908, 0.26784] }, { side: "L", inner: [-0.15956, 1.42737, 0.32192], outer: [-0.2226, 1.44395, 0.39085] }], [{ side: "R", inner: [0.23975, 1.4308, 0.29973], outer: [0.15232, 1.44911, 0.26778] }, { side: "L", inner: [-0.16049, 1.42801, 0.30981], outer: [-0.22283, 1.44491, 0.37929] }], [{ side: "R", inner: [0.23972, 1.43082, 0.29972], outer: [0.15231, 1.44913, 0.26773] }, { side: "L", inner: [-0.16135, 1.42853, 0.29927], outer: [-0.22317, 1.4457, 0.36915] }], [{ side: "R", inner: [0.2397, 1.43083, 0.29972], outer: [0.1523, 1.44915, 0.26768] }, { side: "L", inner: [-0.16221, 1.42904, 0.28892], outer: [-0.22354, 1.44646, 0.35917] }], [{ side: "R", inner: [0.23968, 1.43084, 0.29971], outer: [0.1523, 1.44917, 0.26764] }, { side: "L", inner: [-0.16298, 1.42946, 0.28001], outer: [-0.22395, 1.44709, 0.35053] }], [{ side: "R", inner: [0.23966, 1.43086, 0.29971], outer: [0.1523, 1.44919, 0.2676] }, { side: "L", inner: [-0.16371, 1.42984, 0.27183], outer: [-0.22438, 1.44766, 0.34255] }], [{ side: "R", inner: [0.23965, 1.43087, 0.29971], outer: [0.15229, 1.4492, 0.26756] }, { side: "L", inner: [-0.16434, 1.43016, 0.26476], outer: [-0.22479, 1.44814, 0.33563] }], [{ side: "R", inner: [0.23963, 1.43088, 0.2997], outer: [0.15229, 1.44922, 0.26754] }, { side: "L", inner: [-0.16487, 1.43041, 0.2591], outer: [-0.22517, 1.44852, 0.33006] }], [{ side: "R", inner: [0.23962, 1.43088, 0.2997], outer: [0.15229, 1.44923, 0.26751] }, { side: "L", inner: [-0.16533, 1.43063, 0.25408], outer: [-0.22551, 1.44885, 0.32512] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15229, 1.44923, 0.2675] }, { side: "L", inner: [-0.1656, 1.43075, 0.25131], outer: [-0.22573, 1.44903, 0.32237] }], [{ side: "R", inner: [0.23961, 1.43089, 0.2997], outer: [0.15228, 1.44924, 0.26748] }, { side: "L", inner: [-0.16586, 1.43087, 0.24853], outer: [-0.22595, 1.44921, 0.31962] }], [{ side: "R", inner: [0.24358, 1.42864, 0.30273], outer: [0.15611, 1.44815, 0.27163] }, { side: "L", inner: [-0.16933, 1.42988, 0.25212], outer: [-0.23031, 1.44689, 0.32277] }], [{ side: "R", inner: [0.24755, 1.42638, 0.30575], outer: [0.15995, 1.44704, 0.27577] }, { side: "L", inner: [-0.17281, 1.42887, 0.25571], outer: [-0.23468, 1.44455, 0.32591] }], [{ side: "R", inner: [0.26416, 1.41501, 0.31682], outer: [0.17627, 1.44029, 0.2916] }, { side: "L", inner: [-0.18757, 1.4226, 0.27017], outer: [-0.25286, 1.43269, 0.33825] }], [{ side: "R", inner: [0.28425, 1.40079, 0.32975], outer: [0.19651, 1.4314, 0.31061] }, { side: "L", inner: [-0.20587, 1.41446, 0.28768], outer: [-0.27489, 1.41772, 0.35268] }], [{ side: "R", inner: [0.31083, 1.37672, 0.34277], outer: [0.22419, 1.41389, 0.3322] }, { side: "L", inner: [-0.2309, 1.39829, 0.30747], outer: [-0.30411, 1.39231, 0.3675] }], [{ side: "R", inner: [0.3422, 1.34454, 0.35511], outer: [0.25818, 1.38858, 0.35533] }, { side: "L", inner: [-0.26171, 1.37501, 0.32881], outer: [-0.33867, 1.3581, 0.38163] }], [{ side: "R", inner: [0.37356, 1.30576, 0.36246], outer: [0.29382, 1.3557, 0.37466] }, { side: "L", inner: [-0.29402, 1.34482, 0.34671], outer: [-0.37336, 1.31664, 0.39041] }], [{ side: "R", inner: [0.4052, 1.25432, 0.36072], outer: [0.33205, 1.30883, 0.38675] }, { side: "L", inner: [-0.32867, 1.30159, 0.35783], outer: [-0.40858, 1.26155, 0.38964] }], [{ side: "R", inner: [0.43425, 1.20191, 0.35507], outer: [0.36934, 1.25859, 0.39474] }, { side: "L", inner: [-0.36268, 1.25544, 0.36566], outer: [-0.44091, 1.20506, 0.38416] }], [{ side: "R", inner: [0.45316, 1.14056, 0.33122], outer: [0.39814, 1.19643, 0.38461] }, { side: "L", inner: [-0.38861, 1.19808, 0.35622], outer: [-0.46269, 1.13891, 0.35962] }], [{ side: "R", inner: [0.47011, 1.0804, 0.30571], outer: [0.42604, 1.13265, 0.3715] }, { side: "L", inner: [-0.41421, 1.13918, 0.34471], outer: [-0.48194, 1.07388, 0.3325] }], [{ side: "R", inner: [0.4714, 1.02534, 0.26504], outer: [0.43799, 1.07107, 0.34116] }, { side: "L", inner: [-0.42472, 1.08235, 0.31673], outer: [-0.48468, 1.01407, 0.28947] }], [{ side: "R", inner: [0.46928, 0.97257, 0.22178], outer: [0.44655, 1.00948, 0.30617] }, { side: "L", inner: [-0.4325, 1.02521, 0.28484], outer: [-0.48333, 0.95684, 0.24311] }], [{ side: "R", inner: [0.45806, 0.93209, 0.17573], outer: [0.44434, 0.9591, 0.26563] }, { side: "L", inner: [-0.43023, 0.97852, 0.24763], outer: [-0.47216, 0.91267, 0.19373] }], [{ side: "R", inner: [0.44203, 0.89847, 0.12842], outer: [0.43614, 0.91479, 0.22169] }, { side: "L", inner: [-0.42251, 0.93727, 0.20725], outer: [-0.45566, 0.87598, 0.14287] }], [{ side: "R", inner: [0.42495, 0.87382, 0.08612], outer: [0.42515, 0.8801, 0.18078] }, { side: "L", inner: [-0.41232, 0.90483, 0.16966], outer: [-0.43778, 0.84909, 0.09724] }], [{ side: "R", inner: [0.40715, 0.85936, 0.05008], outer: [0.41158, 0.8571, 0.14482] }, { side: "L", inner: [-0.39964, 0.88333, 0.1365], outer: [-0.41908, 0.83312, 0.0584] }], [{ side: "R", inner: [0.39139, 0.84796, 0.01918], outer: [0.39907, 0.8382, 0.11323] }, { side: "L", inner: [-0.38807, 0.86549, 0.10739], outer: [-0.4024, 0.82067, 0.02501] }], [{ side: "R", inner: [0.38356, 0.84476, 544e-5], outer: [0.39248, 0.83167, 0.09897] }, { side: "L", inner: [-0.38192, 0.85935, 0.09423], outer: [-0.39412, 0.81708, 0.01018] }], [{ side: "R", inner: [0.3757, 0.84167, -825e-5], outer: [0.38579, 0.82526, 0.08464] }, { side: "L", inner: [-0.3757, 0.85328, 0.081], outer: [-0.38579, 0.81366, -461e-5] }]] } };

// lib/arena/jump.js
var JUMP_DURATION = 0.84;
var JUMP_HEIGHT = 0.8;
function sampleJump(start, time) {
  const phase = start == null ? 1 : Math.max(0, Math.min(1, (time - start) / JUMP_DURATION));
  const active = start != null && time >= start && phase < 1;
  return { active, phase, height: active ? 4 * JUMP_HEIGHT * phase * (1 - phase) : 0, tuck: active ? Math.sin(Math.PI * phase) ** 2 : 0 };
}

// lib/arena/movement.js
var RADIUS = 13.4;
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function movePlayer(p, input, dt, now, m) {
  p.y = sampleJump(p.jumpStart, now).height;
  const moving = Math.hypot(input.x, input.z) > 0.01, run = input.run && moving && p.stamina > 1;
  const turn = Math.atan2(Math.sin(input.yaw - p.yaw), Math.cos(input.yaw - p.yaw));
  p.yaw += clamp(turn, -dt * (p.action ? 3 : 12), dt * (p.action ? 3 : 12));
  let speed = (run ? m.run : m.walk) * (1 + m.speedPct / 100);
  const forward = input.x * Math.sin(p.yaw) + input.z * Math.cos(p.yaw);
  if (forward < -0.2) speed *= 0.8;
  else if (Math.abs(forward) < 0.7) speed *= 0.9;
  if (p.action) speed *= p.action.kind === "Cast" ? 0.7 : 0.75;
  speed *= 1 - m.slow / 100;
  if (p.carry === "Hold" && !p.action) speed *= 1 - m.guard / 100;
  if (m.stunnedUntil > now) speed = 0;
  p.vx = input.x * speed;
  p.vz = input.z * speed;
  p.running = run;
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  if (m.push?.until > now) {
    p.x += m.push.x * dt;
    p.z += m.push.z * dt;
  }
  const distance = Math.hypot(p.x, p.z);
  if (distance > RADIUS) {
    p.x *= RADIUS / distance;
    p.z *= RADIUS / distance;
  }
  if (moving) p.stationarySince = now;
  if (run) {
    p.stamina = Math.max(0, p.stamina - 18 * (1 - m.sprintCost / 100) * dt);
    p.lastSprint = now;
  } else if (now - p.lastSprint >= 1) p.stamina = Math.min(m.maxStamina, p.stamina + 22 * (1 + m.regen / 100) * dt);
}

// lib/arena/simulation.js
var ROOM_LIMIT = 8;
var ARENA_RADIUS = 13.4;
var INPUT_LEASE = 0.65;
var DISCONNECT_SECONDS = 12;
var STEP = 1 / 30;
var clamp2 = (n, a, b) => Math.max(a, Math.min(b, n));
var profiles = /* @__PURE__ */ new Map();
var dummyProfile = buildArenaStats({ skin: "Light Skin", weapon: null, head: null, armour: null, magic: null, extra: null });
dummyProfile.perks = [];
dummyProfile.stats = { ...dummyProfile.stats, maxHealth: 1e3, tenacityPct: 0, critBonusReductionPct: 0 };
for (const key of Object.keys(dummyProfile.stats)) if (key.endsWith("Resistance")) dummyProfile.stats[key] = 0;
function createDummy(now) {
  return { id: "training-dummy", isDummy: true, x: 0, z: 0, yaw: 0, hp: 1e3, statuses: {}, buffs: {}, barriers: [], action: null, carry: "Carry", stunnedUntil: 0, lastCombat: now };
}
var combatTargets = (room) => [...Object.values(room.players), ...room.dummy ? [room.dummy] : []];
var targetExists = (room, p) => !!room.players[p.id] || p.isDummy && room.dummy === p;
function profile(p) {
  if (p.isDummy) return dummyProfile;
  const key = JSON.stringify(p.champion.loadout);
  if (!profiles.has(key)) {
    if (profiles.size > 512) profiles.clear();
    profiles.set(key, buildArenaStats(p.champion.loadout));
  }
  return profiles.get(key);
}
function createRoom(now, seed) {
  return { version: 3, time: now, rng: seed >>> 0, serial: 0, players: {}, dummy: createDummy(now), projectiles: [], fields: [], events: [] };
}
function random(room) {
  let t = room.rng = room.rng + 1831565813 >>> 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function emit(room, type, data) {
  room.events.push({ id: ++room.serial, time: room.time, type, ...data });
}
function bounded(p) {
  const d = Math.hypot(p.x, p.z);
  if (d > ARENA_RADIUS) {
    p.x *= ARENA_RADIUS / d;
    p.z *= ARENA_RADIUS / d;
  }
}
function addPlayer(room, id, champion) {
  if (Object.keys(room.players).length >= ROOM_LIMIT) throw new Error("This arena is full. Please try again shortly.");
  if (Object.values(room.players).some((p2) => p2.champion.id === champion.id)) throw new Error("This champion is already in the arena.");
  validateBaselineSpell(champion.baselineSpell);
  const { stats, selected } = buildArenaStats(champion.loadout);
  let spawn = { x: 0, z: 10 }, best = -1;
  for (let i = 0; i < 16; i++) {
    const q = { x: 10 * Math.sin(i * Math.PI / 8), z: 10 * Math.cos(i * Math.PI / 8) }, distance = Math.min(30, ...Object.values(room.players).map((p2) => Math.hypot(q.x - p2.x, q.z - p2.z)));
    if (distance > best) {
      best = distance;
      spawn = q;
    }
  }
  const p = {
    id,
    champion,
    ...spawn,
    yaw: Math.atan2(-spawn.x, -spawn.z),
    hp: stats.maxHealth,
    stamina: stats.maxStamina,
    carry: selected.weapon.permanent ? "Hold" : "Carry",
    jumpStart: null,
    y: 0,
    action: null,
    statuses: {},
    buffs: {},
    barriers: [],
    baselineCooldownUntil: 0,
    baselineCastId: null,
    baselineRefund: 0,
    baselineCooldownStart: 0,
    baselineBaseCooldown: 0,
    cooldownUntil: 0,
    magicCastId: null,
    magicRefund: 0,
    magicCooldownStart: 0,
    magicBaseCooldown: 0,
    input: { x: 0, z: 0, yaw: 0, run: false },
    lastInput: room.time,
    lastSeen: room.time,
    lastSeq: -1,
    lastCombat: room.time,
    lastSprint: -1e6,
    stationarySince: room.time,
    vx: 0,
    vz: 0,
    running: false,
    stunnedUntil: 0
  };
  p.input.yaw = p.yaw;
  room.players[id] = p;
  emit(room, "joined", { playerId: id });
  trigger(room, p, "roundStarted", {});
  return p;
}
function removePlayer(room, id, reason = "left", killerId = null) {
  if (!room.players[id]) return;
  delete room.players[id];
  room.projectiles = room.projectiles.filter((p) => p.owner !== id);
  room.fields = room.fields.filter((p) => p.owner !== id);
  emit(room, reason === "defeated" ? "death" : "left", { playerId: id, killerId, reason });
}
function qualifies(c, p, target, ctx = {}) {
  const max = profile(p).stats.maxHealth;
  if (c.selfHealthBelowPct != null && p.hp / max * 100 >= c.selfHealthBelowPct) return false;
  if (c.crossedBelowHealthPct != null && !(ctx.beforeHp / max * 100 >= c.crossedBelowHealthPct && p.hp / max * 100 < c.crossedBelowHealthPct)) return false;
  if (c.source && c.source !== ctx.source) return false;
  if (c.critical != null && c.critical !== ctx.critical) return false;
  if (c.movingAtCommit && !ctx.movingAtCommit) return false;
  if (c.stationarySecondsAtLeast != null && (ctx.stationarySeconds ?? 0) < c.stationarySecondsAtLeast) return false;
  if (c.targetHasStatus && !target?.statuses[c.targetHasStatus]) return false;
  if (c.targetHealthBelowPct != null && (!target || target.hp / profile(target).stats.maxHealth * 100 >= c.targetHealthBelowPct)) return false;
  if (c.targetDistanceMAtLeast != null && (!target || Math.hypot(p.x - target.x, p.z - target.z) < c.targetDistanceMAtLeast)) return false;
  if (c.incomingAttackKinds && !c.incomingAttackKinds.includes(ctx.attackKind)) return false;
  if (c.appliedStatusIds && !c.appliedStatusIds.includes(ctx.statusId)) return false;
  return true;
}
function statsFor(p, target = null, ctx = {}) {
  let stats = { ...profile(p).stats };
  const bonuses = {};
  for (const b of Object.values(p.buffs)) for (const [k, v] of Object.entries(b.stats)) bonuses[k] = (bonuses[k] || 0) + v;
  for (const perk of profile(p).perks) if (perk.trigger === "conditional" && !(ctx.unarmed && perk.slot === "weapon") && qualifies(perk.condition, p, target, ctx)) for (const [k, v] of Object.entries(perk.statBonuses)) bonuses[k] = (bonuses[k] || 0) + v;
  stats = applyStatBonuses(stats, bonuses);
  if (p.statuses.exposed) {
    for (const k of Object.keys(stats)) if (k.endsWith("Resistance")) stats[k] = Math.max(0, stats[k] - p.statuses.exposed.allResistanceReduction);
  }
  return stats;
}
function context(p, source) {
  return { source, movingAtCommit: Math.hypot(p.vx, p.vz) > 0.05, stationarySeconds: Math.max(0, p.lastSeen - p.stationarySince) };
}
function trigger(room, p, event, ctx) {
  if (!room.players[p.id] || p.hp <= 0) return;
  for (const perk of profile(p).perks) {
    if (ctx.unarmed && perk.slot === "weapon") continue;
    if (perk.trigger !== event || perk.handler || !qualifies(perk.condition || {}, p, ctx.target, ctx)) continue;
    if (perk.chance != null && random(room) >= perk.chance) continue;
    const key = perk.slot + ":" + perk.id;
    for (const a of perk.actions || []) {
      if (a.type === "buff") p.buffs[key] = { stats: a.stats, until: room.time + a.durationSeconds };
      else if (a.type === "heal") p.hp = Math.min(profile(p).stats.maxHealth, p.hp + a.amount);
      else if (a.type === "restoreStamina") p.stamina = Math.min(profile(p).stats.maxStamina, p.stamina + a.amount);
      else if (a.type === "barrier") {
        const amount = Math.min(a.amount, 30 - p.barriers.reduce((v, b) => v + b.hp, 0));
        if (amount > 0) p.barriers.push({ hp: amount, until: room.time + a.durationSeconds });
      } else if (a.type === "cleanse") {
        const eligible = Object.values(p.statuses).filter((s) => a.statusIds === "allCleanseable" ? s.cleanseable : a.statusIds.includes(s.id)).sort((a2, b) => a2.appliedAt - b.appliedAt);
        for (const s of eligible.slice(0, a.maxRemoved || 1)) delete p.statuses[s.id];
      } else if (a.type === "applyStatus") {
        const target = a.target === "target" ? ctx.target : ctx.attacker;
        if (target && targetExists(room, target)) applyStatus(room, p, target, a.id, a.potency ?? 1, ctx.source || "weapon", !["debuffApplied", "directDamageTaken", "criticalDamageTaken"].includes(event));
      } else if (a.type === "refundAbilityCooldown") {
        const baseline = p.baselineCastId && ctx.castId === p.baselineCastId;
        const prefix = baseline ? "baseline" : "magic", cooldown = baseline ? "baselineCooldownUntil" : "cooldownUntil";
        if (!p[prefix + "CastId"] || ctx.castId !== p[prefix + "CastId"]) continue;
        const grant = Math.min(a.seconds, 2 - p[prefix + "Refund"]);
        p[prefix + "Refund"] += Math.max(0, grant);
        if (p[prefix + "CooldownStart"]) p[cooldown] = p[prefix + "CooldownStart"] + Math.max(4, p[prefix + "BaseCooldown"] - p[prefix + "Refund"]);
      }
    }
  }
}
function applyStatus(room, source, target, id, potency, sourceKind, react = true) {
  const incoming = potentStatus(id, potency), old = target.statuses[id]?.until > room.time ? target.statuses[id] : null;
  const totalPotency = (old?.potency || 0) + incoming.potency;
  const s = potentStatus(id, totalPotency, true), st = statsFor(source), def = statsFor(target);
  s.stacks = (old?.stacks || (old ? 1 : 0)) + 1;
  s.source = source.id;
  s.appliedAt = room.time;
  const power = (1 + combinedPower(st, sourceKind) / 100) * (1 - (source.statuses.weaken?.powerReductionPct || 0) / 100);
  s.powerMultiplier = ((old?.potency || 0) * (old?.powerMultiplier ?? 1) + incoming.potency * power) / totalPotency;
  const duration = s.durationSeconds * (s.kind === "dot" ? 1 : 1 - def.tenacityPct / 100);
  s.until = room.time + duration;
  target.statuses[id] = s;
  if (s.kind === "displacement" && !target.isDummy) {
    const dx = target.x - source.x, dz = target.z - source.z, d = Math.hypot(dx, dz) || 1;
    target.push = { x: dx / d * s.distanceM / duration, z: dz / d * s.distanceM / duration, until: s.until };
  } else if (s.kind === "interrupt" && !target.isDummy) {
    target.stunnedUntil = Math.max(target.stunnedUntil, s.until);
    if (target.action && !target.action.cancelled) {
      target.action.cancelled = true;
      if (target.action.kind === "Cast") startMagicCooldown(room, target, target.action);
    }
  }
  emit(room, "status", { playerId: target.id, sourceId: source.id, statusId: id, potency: s.potency, stacks: s.stacks, until: s.until, x: target.x, z: target.z });
  if (react) trigger(room, target, "debuffApplied", { statusId: id, attacker: source, source: sourceKind });
}
function damage(room, source, target, amount, meta = {}) {
  const beforeHp = target.hp;
  let remaining = amount;
  target.barriers.sort((a, b) => a.until - b.until);
  for (const b of target.barriers) {
    const take = Math.min(b.hp, remaining);
    b.hp -= take;
    remaining -= take;
  }
  target.hp = Math.max(0, target.hp - remaining);
  target.lastCombat = room.time;
  if (source) source.lastCombat = room.time;
  if (meta.periodic) {
    target.periodicLabel = (target.periodicLabel || 0) + (beforeHp - target.hp);
    if (room.time - (target.lastPeriodicLabel || 0) >= 1) {
      emit(room, "hit", { playerId: target.id, sourceId: source?.id || null, amount: target.periodicLabel, critical: false, damageType: meta.damageType, x: target.x, z: target.z });
      target.periodicLabel = 0;
      target.lastPeriodicLabel = room.time;
    }
  } else emit(room, "hit", { playerId: target.id, sourceId: source?.id || null, amount: beforeHp - target.hp, absorbed: amount - remaining, critical: !!meta.critical, damageType: meta.damageType || "blunt", x: target.x, z: target.z });
  if (target.hp <= 0 && target.isDummy) {
    target.hp = 1e3;
    emit(room, "dummyReset", { playerId: target.id });
  }
  if (target.hp <= 0) {
    removePlayer(room, target.id, "defeated", source?.id);
    return false;
  }
  if (!meta.periodic && remaining > 0) {
    const ctx = { ...meta, beforeHp, attacker: source, target: source };
    trigger(room, target, "directDamageTaken", ctx);
    if (meta.critical) trigger(room, target, "criticalDamageTaken", ctx);
  }
  return true;
}
function directHit(room, source, target, attack, strikeIndex) {
  const ctx = { ...attack.context, target, attackKind: attack.spec.attackKind, castId: attack.id };
  const critStats = statsFor(source, target, ctx), critical = random(room) < criticalProfile(critStats).chance;
  const stats = statsFor(source, target, { ...ctx, critical }), def = statsFor(target), roll = rollDice(attack.spec.damageRolls?.[strikeIndex] || attack.spec.damageRoll, () => random(room));
  const multiplier = critical ? 1 + (criticalProfile(stats).multiplier - 1) * (1 - def.critBonusReductionPct / 100) : 1;
  let amount = mitigatedDamage(roll.total * multiplier, attack.spec.damageType, stats, def, attack.spec.powerSource) * (1 - (source.statuses.weaken?.powerReductionPct || 0) / 100);
  const guard = profile(target).selected.weapon.guard;
  if (guard && target.carry === "Hold" && !target.action) {
    const angle = Math.atan2(source.x - target.x, source.z - target.z) - target.yaw;
    if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < guard.frontConeDegrees * Math.PI / 360) amount *= 1 - guard.damageReductionPct / 100;
  }
  const alive = damage(room, source, target, amount, { ...ctx, critical, damageType: attack.spec.damageType });
  attack.hitCount = (attack.hitCount || 0) + 1;
  const event = ctx.source === "ability" ? "abilityHit" : "weaponHit";
  trigger(room, source, event, { ...ctx, critical });
  trigger(room, source, "directHit", { ...ctx, critical });
  if (critical) trigger(room, source, ctx.source === "ability" ? "abilityCritical" : "weaponCritical", { ...ctx, critical });
  if (alive) {
    for (const effect of attack.spec.onHit) if (tryStatusProc(effect, { strikeIndex }, () => random(room)).applied) applyStatus(room, source, target, effect.id, effect.potency, attack.spec.powerSource);
  }
}
function command(room, id, input, now) {
  advance(room, now);
  return applyInput(room, id, input, Math.max(now, room.time));
}
function applyInput(room, id, input, now = room.time) {
  const p = room.players[id];
  if (!p) return { error: "Your champion is no longer in the arena.", gone: true };
  if (!Number.isSafeInteger(input.seq) || input.seq <= p.lastSeq) return { duplicate: true };
  if (![input.x, input.z, input.yaw].every(Number.isFinite)) throw new Error("Invalid movement.");
  p.lastSeq = input.seq;
  p.lastSeen = now;
  p.lastInput = now;
  const len = Math.max(1, Math.hypot(input.x, input.z));
  p.input = { x: clamp2(input.x / len, -1, 1), z: clamp2(input.z / len, -1, 1), yaw: Math.atan2(Math.sin(input.yaw), Math.cos(input.yaw)), run: input.run === true };
  if (!input.action) return {};
  if (input.action === "jump") {
    if (p.stunnedUntil > now) return { error: "Cannot jump while stunned." };
    if (sampleJump(p.jumpStart, now).active) return { error: "Land before jumping again." };
    p.jumpStart = now;
    return {};
  }
  if (p.action || p.stunnedUntil > now) return { error: "Finish the current action first." };
  const { selected } = profile(p), unarmed = input.action === "attack" && p.carry !== "Hold", spec = unarmed ? UNARMED : selected.weapon, ctx = { ...context(p, ["cast", "baseline"].includes(input.action) ? "ability" : "weapon"), unarmed };
  const baseline = input.action === "baseline", spell = baseline ? baselineSpell(p.champion.baselineSpell) : selected.magic;
  const stats = statsFor(p, null, ctx), motion = weapon_paths_default[unarmed ? "unarmed" : p.champion.loadout.weapon || "unarmed"];
  let kind, duration;
  if (input.action === "attack") {
    kind = "Swing";
    duration = attackTiming(unarmed ? null : p.champion.loadout.weapon, motion.durations.Swing, stats.hastePct).durationSeconds;
  } else if (input.action === "toggle") {
    if (spec.permanent) return { error: "This champion is always ready." };
    kind = p.carry === "Carry" ? "Draw" : "Stow";
    duration = motion.durations[kind];
  } else if (input.action === "cast" || baseline) {
    if (!spell) return { error: baseline ? "Choose a baseline spell before entering." : "This champion has no magic trait equipped." };
    if ((baseline ? p.baselineCooldownUntil : p.cooldownUntil) > now) return { error: "Your magic is still recovering." };
    kind = "Cast";
    duration = (baseline ? baselineTiming : abilityTiming)(spell.id, stats.cooldownReductionPct, stats.castSpeedPct).castSeconds;
  } else return { error: "Unknown action." };
  const action = { id: ++room.serial, kind, start: now, duration, hits: {}, hitCount: 0, released: false, context: ctx, baseline, unarmed, spec: kind === "Cast" ? spell : spec };
  if (kind === "Cast") {
    const prefix = baseline ? "baseline" : "magic";
    p[prefix + "CastId"] = action.id;
    p[prefix + "Refund"] = 0;
    p[prefix + "CooldownStart"] = 0;
    p[prefix + "BaseCooldown"] = (baseline ? baselineTiming : abilityTiming)(spell.id, stats.cooldownReductionPct, stats.castSpeedPct).cooldownSeconds;
  }
  p.action = action;
  p.lastCombat = now;
  emit(room, "action", { playerId: id, action: kind });
  return {};
}
function startMagicCooldown(room, p, a) {
  const prefix = a.baseline ? "baseline" : "magic";
  if (p[prefix + "CooldownStart"]) return;
  p[prefix + "CooldownStart"] = room.time;
  p[a.baseline ? "baselineCooldownUntil" : "cooldownUntil"] = room.time + Math.max(4, p[prefix + "BaseCooldown"] - p[prefix + "Refund"]);
}
function localPoint(point, p) {
  const [x, y, z] = point, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return [p.x + x * c + z * s, y + (p.y || 0), p.z - x * s + z * c];
}
function lerp(a, b, t) {
  return a.map((n, i) => n + (b[i] - n) * t);
}
function bladeAt(weaponId, phase, side) {
  const frames = weapon_paths_default[weaponId || "unarmed"].frames, f = clamp2(phase, 0, 1) * (frames.length - 1), i = Math.floor(f), a = frames[i].find((s) => side == null || s.side === side), b = frames[Math.min(i + 1, frames.length - 1)].find((s) => s.side === a?.side);
  return a ? { inner: lerp(a.inner, b.inner, f - i), outer: lerp(a.outer, b.outer, f - i) } : null;
}
function capsuleHit(a, b, target, radius) {
  const n = Math.max(1, Math.ceil(Math.hypot(...a.map((v, i) => v - b[i])) / 0.04));
  for (let i = 0; i <= n; i++) {
    const q = lerp(a, b, i / n), dy = q[1] - clamp2(q[1], 0.4 + (target.y || 0), 1.65 + (target.y || 0));
    if ((q[0] - target.x) ** 2 + (q[2] - target.z) ** 2 + dy * dy <= (0.28 + radius) ** 2) return true;
  }
  return false;
}
function spawnProjectile(room, p, a, phase) {
  const magic = a.kind === "Cast", socket = bladeAt(p.champion.loadout.weapon, phase, null);
  const origin = magic ? localPoint(a.baseline ? [0, 1.5, 0.65] : [-0.32, 2.03, 0.28], p) : localPoint(socket?.outer || [0, 1.3, 0.45], p), spec = a.spec.projectile;
  const projectile = {
    id: ++room.serial,
    owner: p.id,
    actionId: a.id,
    source: magic ? "ability" : "weapon",
    traitId: magic ? a.spec.id : p.champion.loadout.weapon,
    x: origin[0],
    y: origin[1],
    z: origin[2],
    dx: Math.sin(p.yaw),
    dy: magic && !a.baseline ? -0.065 : 0,
    dz: Math.cos(p.yaw),
    distance: 0,
    speed: spec.speedMps,
    width: spec.widthM,
    range: spec.maxRangeM,
    damageType: a.spec.damageType,
    attack: JSON.parse(JSON.stringify(a)),
    spawnedAt: room.time
  };
  room.projectiles.push(projectile);
  emit(room, "projectile", { projectileId: projectile.id, playerId: p.id });
}
function fieldAt(room, projectile) {
  const spec = projectile.attack.spec.impactField;
  if (!spec) return;
  room.fields = room.fields.filter((f) => f.owner !== projectile.owner);
  const owner = room.players[projectile.owner];
  if (!owner) return;
  room.fields.push({
    id: ++room.serial,
    owner: owner.id,
    x: projectile.x,
    z: projectile.z,
    radius: spec.radiusM,
    until: room.time + spec.durationSeconds,
    rate: rollDice(spec.damageRateRoll, () => random(room)).total * (1 + combinedPower(statsFor(owner), "ability") / 100),
    damageType: spec.damageType
  });
}
function releaseSpell(room, p, a) {
  const spec = a.spec;
  if (spec.kind === "heal") {
    const stats = statsFor(p), critical = random(room) < criticalProfile(stats).chance;
    const amount = rollDice(spec.healRoll, () => random(room)).total * (1 + combinedPower(stats, "ability") / 100) * (critical ? criticalProfile(stats).multiplier : 1);
    const before = p.hp;
    p.hp = Math.min(profile(p).stats.maxHealth, p.hp + amount);
    p.buffs["baseline:" + spec.id] = { stats: spec.buff.stats, until: room.time + spec.buff.durationSeconds, spellId: spec.id };
    emit(room, "heal", { playerId: p.id, spellId: spec.id, amount: p.hp - before, critical, x: p.x, z: p.z });
  } else if (spec.kind === "area") {
    const center = a.areaCenter || localPoint([0, 0, spec.area.distanceM], p);
    emit(room, "spellBurst", { playerId: p.id, spellId: spec.id, x: center[0], z: center[2], radius: spec.area.radiusM });
    for (const target of combatTargets(room)) if (target !== p && Math.hypot(target.x - center[0], target.z - center[2]) <= spec.area.radiusM + 0.28) directHit(room, p, target, a, 0);
  } else spawnProjectile(room, p, a, spec.releasePhase);
}
function step(room, dt) {
  room.time += dt;
  if (room.dummy) {
    for (const [id, s] of Object.entries(room.dummy.statuses)) if (s.until <= room.time) delete room.dummy.statuses[id];
  }
  for (const p of Object.values(room.players)) {
    if (room.time - p.lastSeen > DISCONNECT_SECONDS) {
      removePlayer(room, p.id, "disconnected");
      continue;
    }
    for (const [id, s] of Object.entries(p.statuses)) if (s.until <= room.time) delete p.statuses[id];
    for (const [id, b] of Object.entries(p.buffs)) if (b.until <= room.time) delete p.buffs[id];
    p.barriers = p.barriers.filter((b) => b.until > room.time && b.hp > 0);
    const stats = statsFor(p), input = room.time - p.lastInput <= INPUT_LEASE ? p.input : { x: 0, z: 0, run: false, yaw: p.yaw };
    movePlayer(p, input, dt, room.time, movementModifiers(p, stats));
  }
  const players = Object.values(room.players);
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const a = players[i], b = players[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 0.58) {
      const nx = d ? dx / d : 1, nz = d ? dz / d : 0, offset = (0.58 - d) / 2;
      a.x -= nx * offset;
      a.z -= nz * offset;
      b.x += nx * offset;
      b.z += nz * offset;
      bounded(a);
      bounded(b);
    }
  }
  for (const p of Object.values(room.players)) {
    const a = p.action;
    if (!a) continue;
    const phase = clamp2((room.time - a.start) / a.duration, 0, 1), previous = clamp2((room.time - dt - a.start) / a.duration, 0, 1), motion = weapon_paths_default[a.unarmed ? "unarmed" : p.champion.loadout.weapon || "unarmed"];
    if (!a.cancelled) {
      if (a.spec.kind === "area" && !a.areaCenter && phase >= a.spec.area.windupPhase) {
        a.areaCenter = localPoint([0, 0, a.spec.area.distanceM], p);
        emit(room, "spellTelegraph", { playerId: p.id, spellId: a.spec.id, x: a.areaCenter[0], z: a.areaCenter[2], radius: a.spec.area.radiusM, until: a.start + a.duration * a.spec.releasePhase });
      }
      if (a.kind === "Cast" || a.kind === "Swing" && a.spec.projectile) {
        const release = a.kind === "Cast" ? a.spec.releasePhase : motion.windows[0].release;
        if (!a.released && phase >= release) {
          a.released = true;
          if (a.kind === "Cast") releaseSpell(room, p, a);
          else spawnProjectile(room, p, a, release);
        }
      } else if (a.kind === "Swing") motion.windows.forEach((window, strike) => {
        if (phase < window.start || previous > window.end) return;
        const lo = Math.max(previous, window.start), hi = Math.min(phase, window.end), count = Math.max(1, Math.ceil((hi - lo) * 240));
        for (let i = 0; i <= count; i++) {
          const blade = bladeAt(a.unarmed ? null : p.champion.loadout.weapon, lo + (hi - lo) * i / count, window.side);
          if (!blade) continue;
          for (const q of combatTargets(room)) {
            const key = strike + ":" + q.id;
            if (q === p || a.hits[key] || Math.hypot(q.x - p.x, q.z - p.z) > a.spec.reachM + 0.28) continue;
            if (capsuleHit(localPoint(blade.inner, p), localPoint(blade.outer, p), q, a.spec.hitRadiusM)) {
              a.hits[key] = true;
              directHit(room, p, q, a, strike);
            }
          }
        }
      });
    }
    if (phase >= 1) {
      p.action = null;
      if (a.kind === "Cast") {
        startMagicCooldown(room, p, a);
        if (!a.cancelled) trigger(room, p, "abilityFinished", { source: "ability", castId: a.id });
      } else if (a.kind === "Draw" || a.kind === "Stow") {
        if (!a.cancelled) {
          p.carry = a.kind === "Draw" ? "Hold" : "Carry";
          trigger(room, p, a.kind === "Draw" ? "weaponDrawn" : "weaponStowed", {});
        }
      } else if (a.kind === "Swing" && !a.hitCount && !a.spec.projectile) trigger(room, p, "weaponMissed", { source: "weapon", unarmed: !!a.unarmed });
    }
  }
  for (const projectile of [...room.projectiles]) {
    const owner = room.players[projectile.owner];
    if (!owner) continue;
    const distance = Math.min(projectile.speed * dt, projectile.range - projectile.distance), old = [projectile.x, projectile.y, projectile.z];
    projectile.x += projectile.dx * distance;
    projectile.y += projectile.dy * distance;
    projectile.z += projectile.dz * distance;
    projectile.distance += distance;
    const candidates = combatTargets(room).filter((q) => q !== owner && capsuleHit(old, [projectile.x, projectile.y, projectile.z], q, projectile.width / 2)).sort((a, b) => Math.hypot(a.x - old[0], a.z - old[2]) - Math.hypot(b.x - old[0], b.z - old[2]));
    const target = candidates[0], ended = !!target || projectile.distance >= projectile.range || Math.hypot(projectile.x, projectile.z) >= 14;
    if (target) directHit(room, owner, target, projectile.attack, 0);
    if (ended) {
      fieldAt(room, projectile);
      room.projectiles = room.projectiles.filter((v) => v.id !== projectile.id);
      if (!target && projectile.source === "weapon") trigger(room, owner, "weaponMissed", { source: "weapon" });
    }
  }
  room.fields = room.fields.filter((f) => f.until > room.time);
  for (const p of combatTargets(room)) {
    const rates = Object.values(p.statuses).filter((s) => s.kind === "dot").map((s) => ({ source: s.source, type: s.damageType, rate: s.damagePerSecond * s.powerMultiplier }));
    for (const f of room.fields) if (f.owner !== p.id && Math.hypot(f.x - p.x, f.z - p.z) <= f.radius + 0.28) rates.push({ source: f.owner, type: f.damageType, rate: f.rate });
    for (const r of rates) {
      if (!targetExists(room, p)) break;
      const amount = mitigatedDamage(r.rate * dt, r.type, {}, statsFor(p));
      damage(room, room.players[r.source], p, amount, { periodic: true, damageType: r.type });
    }
    if (targetExists(room, p) && !rates.length && room.time - p.lastCombat >= 6) p.hp = p.isDummy ? 1e3 : Math.min(profile(p).stats.maxHealth, p.hp + 8 * dt);
  }
}
function advance(room, now) {
  if (!Number.isFinite(now) || now < room.time) return;
  const end = Math.min(now, room.time + DISCONNECT_SECONDS + STEP);
  while (end - room.time > 1e-6) step(room, Math.min(STEP, end - room.time));
  if (now > room.time) room.time = now;
  room.events = room.events.filter((e) => room.time - e.time < 5).slice(-160);
}
function movementModifiers(p, stats = statsFor(p)) {
  return {
    walk: ARENA_RULES.movement.walkMps,
    run: ARENA_RULES.movement.runMps,
    speedPct: stats.moveSpeedPct,
    sprintCost: stats.sprintCostReductionPct,
    regen: stats.staminaRegenPct,
    maxStamina: stats.maxStamina,
    slow: Math.max(0, ...Object.values(p.statuses).map((s) => s.slowPct || 0)),
    guard: profile(p).selected.weapon.guard?.moveSpeedPenaltyPct || 0,
    stunnedUntil: p.stunnedUntil,
    push: p.push || null
  };
}
function snapshot(room) {
  return {
    dummy: room.dummy ? { id: room.dummy.id, x: 0, z: 0, hp: room.dummy.hp, maxHealth: 1e3, statuses: Object.values(room.dummy.statuses).map((s) => ({ id: s.id, potency: s.potency, stacks: s.stacks || 1, until: s.until })) } : null,
    time: room.time,
    version: room.version,
    capacity: ROOM_LIMIT,
    players: Object.fromEntries(Object.values(room.players).map((p) => [p.id, { id: p.id, champion: p.champion, x: p.x, z: p.z, yaw: p.yaw, vx: p.vx, vz: p.vz, running: p.running, hp: p.hp, maxHealth: profile(p).stats.maxHealth, stamina: p.stamina, maxStamina: profile(p).stats.maxStamina, barrier: p.barriers.reduce((n, b) => n + b.hp, 0), carry: p.carry, jumpStart: p.jumpStart ?? null, magicCooldownStart: p.magicCooldownStart || 0, baselineCooldownStart: p.baselineCooldownStart || 0, cooldownUntil: p.cooldownUntil, baselineCooldownUntil: p.baselineCooldownUntil || 0, buffs: Object.values(p.buffs).filter((b) => b.spellId).map((b) => ({ spellId: b.spellId, until: b.until })), statuses: Object.values(p.statuses).map((s) => ({ id: s.id, potency: s.potency, stacks: s.stacks || 1, until: s.until })), action: p.action ? { id: p.action.id, kind: p.action.kind, start: p.action.start, duration: p.action.duration, cancelled: !!p.action.cancelled, unarmed: !!p.action.unarmed, spellId: p.action.kind === "Cast" ? p.action.spec.id : null, gesture: p.action.spec.gesture || "forward", baseline: !!p.action.baseline } : null }])),
    projectiles: room.projectiles.map(({ attack, ...p }) => p),
    fields: room.fields,
    events: room.events
  };
}

// lib/arena/walletProof.js
var import_algosdk = __toESM(require("algosdk"));
var import_crypto = __toESM(require("crypto"));
var hash = (value) => import_crypto.default.createHash("sha256").update(value).digest("hex");

// lib/arena/service.js
var COLLECTION = "arenaPrivate";
var ROOM = "room-public-v3";
function fail(message, status2 = 400) {
  const error = new Error(message);
  error.status = status2;
  throw error;
}
function clean(value) {
  return JSON.parse(JSON.stringify(value));
}
async function joinPracticeArena(db, address, champion, token, now = Date.now() / 1e3, roomId = ROOM) {
  const roomRef = db.collection(COLLECTION).doc(roomId), id = import_crypto2.default.randomUUID();
  const sessionRef = db.collection(COLLECTION).doc("session-" + hash(token));
  const admissionRef = db.collection(COLLECTION).doc("admission-" + hash(roomId + address));
  return db.runTransaction(async (tx) => {
    const [roomDoc, admissionDoc] = await Promise.all([tx.get(roomRef), tx.get(admissionRef)]);
    if (now - (admissionDoc.data()?.createdAt ?? -Infinity) < 5) fail("Please wait a moment before entering again.", 429);
    const room = roomDoc.exists ? roomDoc.data().state : createRoom(now, import_crypto2.default.randomBytes(4).readUInt32LE());
    advance(room, now);
    if (Object.values(room.players).some((p) => p.walletHash === hash(address))) fail("This wallet already has a champion in the arena.", 409);
    const player = addPlayer(room, id, champion);
    player.walletHash = hash(address);
    tx.set(sessionRef, { playerId: id, address, assetId: champion.id, expiresAt: now + 3600, deleteAt: new Date((now + 3600) * 1e3) });
    tx.set(admissionRef, { createdAt: now, deleteAt: new Date((now + 60) * 1e3) });
    tx.set(roomRef, { state: clean(room), updatedAt: now, deleteAt: new Date((now + 86400) * 1e3) });
    return { playerId: id, token, expiresAt: now + 3600, state: snapshot(room) };
  });
}
async function arenaCommand(db, token, input, now = Date.now() / 1e3, roomId = ROOM) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) fail("Sign in with your champion first.", 401);
  const roomRef = db.collection(COLLECTION).doc(roomId), sessionRef = db.collection(COLLECTION).doc("session-" + hash(token));
  return db.runTransaction(async (tx) => {
    const [roomDoc, sessionDoc] = await Promise.all([tx.get(roomRef), tx.get(sessionRef)]), session = sessionDoc.data();
    if (!session || session.expiresAt < now) fail("Your arena session expired. Select your champion again.", 401);
    if (!roomDoc.exists) fail("This arena has restarted. Please enter again.", 410);
    const room = roomDoc.data().state;
    if (input.leave) {
      advance(room, now);
      removePlayer(room, session.playerId);
      tx.delete(sessionRef);
    } else {
      const p = room.players[session.playerId];
      if (p && now - p.lastSeen < 0.08 && input.seq > p.lastSeq) return { state: snapshot(room), throttled: true };
      const result = command(room, session.playerId, input, now);
      tx.set(roomRef, { state: clean(room), updatedAt: now, deleteAt: new Date((now + 86400) * 1e3) });
      return { ...result, state: snapshot(room) };
    }
    tx.set(roomRef, { state: clean(room), updatedAt: now, deleteAt: new Date((now + 86400) * 1e3) });
    return { state: snapshot(room) };
  });
}

// pages/api/arena/playground.js
var import_algosdk2 = __toESM(require("algosdk"));

// components/contracts/Arena/traitsData.js
var CHAMPION_TRAITS2 = {
  Background: [
    { assetId: 1631153255, trait: "Aqua Background", type: "Background", total: 132, effects: ["Increases Drown."] },
    { assetId: 1631164569, trait: "Blood Background", type: "Background", total: 144, effects: ["Increases Bleed."] },
    { assetId: 1631166128, trait: "Cosmos Background", type: "Background", total: 53, effects: ["Increases Intelligence", "Increases Resist."] },
    { assetId: 1631168001, trait: "Dungeon Background", type: "Background", total: 38, effects: ["Increases Doom."] },
    { assetId: 1631169006, trait: "Forest Background", type: "Background", total: 83, effects: ["Increases Health.", "Gain Nurture at start of battle."] },
    { assetId: 1631170742, trait: "Golden Background", type: "Background", total: 108, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631172134, trait: "Midnight Background", type: "Background", total: 105, effects: ["Gain Focus at the start of battle."] },
    { assetId: 1631173209, trait: "Noir Background", type: "Background", total: 118, effects: ["Increases accuracy of curse type moves."] },
    { assetId: 1631173804, trait: "Red Moon Background", type: "Background", total: 19, effects: ["Apply Doom at the start of battle."] },
    { assetId: 1631175041, trait: "Sunset Background", type: "Background", total: 81, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631178480, trait: "Toxic Background", type: "Background", total: 119, effects: ["Increases Poison."] },
    { assetId: 1792634314, trait: "Valley Background", type: "Background", total: 40, effects: ["Increases Speed."] },
    { assetId: 3586495527, trait: "Golden Moon", type: "Background", total: 15, effects: ["Increases Bless.", "Gain Focus at the start of battle."] },
    { assetId: 2311097594, trait: "Waves Background", type: "Background", total: 65, effects: ["Apply Drown at the start of the battle."] },
    { assetId: 3668457144, trait: "Dawn Background", type: "Background", total: 35, effects: ["Increases Resist."] }
  ],
  Weapon: [
    { assetId: 1631181322, trait: "Dragon Long Sword", type: "Weapon", total: 63, effects: ["Apply Burn on melee hit."] },
    { assetId: 1631198641, trait: "Dragon Staff", type: "Weapon", total: 38, effects: ["Apply Burn at the start of battle."] },
    { assetId: 1631201003, trait: "Dual Katana", type: "Weapon", total: 79, effects: ["Increases Speed."] },
    { assetId: 1631202303, trait: "Executioner Axe", type: "Weapon", total: 99, effects: ["Increases Strength.", "Increases Health."] },
    { assetId: 1631204400, trait: "Scythe", type: "Weapon", total: 74, effects: ["Apply Bleed on melee hit.", "Apply Doom on magic hit."] },
    { assetId: 1631205295, trait: "Shield", type: "Weapon", total: 89, effects: ["Gain Shield at the start of battle."] },
    { assetId: 1631205996, trait: "Sickle", type: "Weapon", total: 78, effects: ["Increases Nurture.", "Apply Bleed on melee hit."] },
    { assetId: 1631207056, trait: "Spear", type: "Weapon", total: 95, effects: ["Increases Health.", "Apply Bleed on melee hit."] },
    { assetId: 1631207955, trait: "Trident", type: "Weapon", total: 112, effects: ["Apply Drown on melee hit."] },
    { assetId: 1792635942, trait: "Dark Sword", type: "Weapon", total: 40, effects: ["Apply Doom on melee hit."] },
    { assetId: 1792636565, trait: "Elf Bow", type: "Weapon", total: 40, effects: ["Gain Nurture on ranged hit."] },
    { assetId: 3586495825, trait: "Wooden Club", type: "Weapon", total: 45, effects: ["Increases Strength.", "Apply Paralyze on melee hit."] },
    { assetId: 3586495819, trait: "Snake Wings", type: "Weapon", total: 45, effects: ["Increases Speed.", "Increases Poison."] },
    { assetId: 3586495808, trait: "Ske'tonian Sword", type: "Weapon", total: 5, effects: ["Apply Bleed on melee hit.", "Increases Resist."] },
    { assetId: 3586495146, trait: "Fire Wings", type: "Weapon", total: 45, effects: ["Increases Speed.", "Apply Burn on ranged hit."] },
    { assetId: 3586495133, trait: "Elder Wings", type: "Weapon", total: 45, effects: ["Increases Intelligence.", "Resistance to Freeze."] },
    { assetId: 3586495110, trait: "Chameleon Wings", type: "Weapon", total: 30, effects: ["Increases Speed.", "Resistance to Poison."] },
    { assetId: 3586495084, trait: "Arctic Dual Katana", type: "Weapon", total: 30, effects: ["Apply Freeze on melee hit.", "Increases Speed."] },
    { assetId: 3668457164, trait: "Rusty Sword", type: "Weapon", total: 35, effects: ["Increases Speed.", "Decreases Strength."] },
    { assetId: 3668457154, trait: "Lightning Staff", type: "Weapon", total: 35, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 3668457152, trait: "Hedge-Knight Sword", type: "Weapon", total: 35, effects: ["Gain Hasten on melee hit."] }
  ],
  Magic: [
    { assetId: 1631208827, trait: "Dark Magic", type: "Magic", total: 10, effects: ["Increases Doom."] },
    { assetId: 1631209424, trait: "Fire Magic", type: "Magic", total: 30, effects: ["Apply Burn on magic hit."] },
    { assetId: 1631213913, trait: "Lightning Magic", type: "Magic", total: 15, effects: ["Apply Paralyze on magic hit."] },
    { assetId: 1631217677, trait: "Water Magic", type: "Magic", total: 32, effects: ["Increases Drown."] },
    { assetId: 1631233542, trait: "Ice Daggers", type: "Magic", total: 25, effects: ["Apply Freeze on ranged hit."] },
    { assetId: 3586495574, trait: "Poison Cloud", type: "Magic", total: 15, effects: ["Apply Poison at the start of battle."] },
    { assetId: 3668457136, trait: "Blood-Shards", type: "Magic", total: 35, effects: ["Apply Bleed at start of battle."] }
  ],
  Head: [
    { assetId: 1631224831, trait: "Crown of Horns", type: "Head", total: 18, effects: ["Gain Doom at the start of battle.", "Gain Strengthen at the start of battle."] },
    { assetId: 1631236045, trait: "All Knowing", type: "Head", total: 61, effects: ["Increases Intelligence."] },
    { assetId: 1631236727, trait: "Bone", type: "Head", total: 62, effects: ["Gain Cleanse at the start of battle."] },
    { assetId: 1631238772, trait: "Dark Knight Helm", type: "Head", total: 71, effects: ["Increases Doom."] },
    { assetId: 1631240661, trait: "Dragon Knight Helm", type: "Head", total: 30, effects: ["Increases Health.", "Increases Burn."] },
    { assetId: 1631243569, trait: "Dragon", type: "Head", total: 129, effects: ["Gain Burn at start of battle.", "Increases Speed."] },
    { assetId: 1631245454, trait: "Elder", type: "Head", total: 103, effects: ["Increases Intelligence.", "Apply Freeze at the start of battle."] },
    { assetId: 1631263106, trait: "Gladiator Helm", type: "Head", total: 55, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631266132, trait: "Purity", type: "Head", total: 111, effects: ["Gain Bless at start of battle."] },
    { assetId: 1631268297, trait: "Scarred", type: "Head", total: 81, effects: ["Increases Health.", "Increases Resist."] },
    { assetId: 1631271286, trait: "Snake", type: "Head", total: 108, effects: ["Apply Poison at start of battle."] },
    { assetId: 1631273225, trait: "Undead", type: "Head", total: 67, effects: ["Gain Nurture at start of battle.", "Gain Doom at start of battle."] },
    { assetId: 1631275042, trait: "Uni Horn", type: "Head", total: 104, effects: ["Gain Bless at start of battle.", "Increases Doom."] },
    { assetId: 1792637776, trait: "Farmer", type: "Head", total: 40, effects: ["Gain Nurture at start of battle."] },
    { assetId: 1792640216, trait: "Samurai", type: "Head", total: 40, effects: ["Gain Focus on melee hit."] },
    { assetId: 1935442966, trait: "Barbarian", type: "Head", total: 1, effects: ["Increases Strength.", "Decreases Accuracy."] },
    { assetId: 2311097574, trait: "Gold Hermes Helm", type: "Head", total: 10, effects: ["Gain Empower every melee hit."] },
    { assetId: 2311097577, trait: "Silver Hermes Helm", type: "Head", total: 75, effects: ["Gain Shield at start of battle."] },
    { assetId: 2311097585, trait: "Pirate Bandana", type: "Head", total: 65, effects: ["Increases Speed.", "Increases Drown."] },
    { assetId: 3586495600, trait: "Skel'tonian Mask", type: "Head", total: 5, effects: ["Gain Cleanse at start of battle.", "Increases Resist."] },
    { assetId: 3586495515, trait: "Frost", type: "Head", total: 30, effects: ["Apply Freeze at the start of battle.", "Resistance to Burn."] },
    { assetId: 3586495125, trait: "Cyclops", type: "Head", total: 45, effects: ["Increases Strength.", "Decreases accuracy of melee type moves."] },
    { assetId: 3668457190, trait: "Slayer", type: "Head", total: 35, effects: ["Resistance to Doom."] },
    { assetId: 3668457162, trait: "Ram", type: "Head", total: 35, effects: ["Gain Nurture on melee hit."] },
    { assetId: 3668457138, trait: "Cannibal", type: "Head", total: 35, effects: ["Heal when Bleed stacks are applied."] }
  ],
  Armour: [
    { assetId: 1631281879, trait: "Dark Knight Armour", type: "Armour", total: 39, effects: ["Gain Shield at the start of battle.", "Increases Doom."] },
    { assetId: 1631282734, trait: "Dragon Hunter Armour", type: "Armour", total: 63, effects: ["Increases Dexterity.", "Increases Burn."] },
    { assetId: 1631284233, trait: "Dragon Knight Armour", type: "Armour", total: 29, effects: ["Gain Shield at the start of battle.", "Increases Burn."] },
    { assetId: 1631286848, trait: "Gladiator Armour", type: "Armour", total: 47, effects: ["Increases Health.", "Increases Strength."] },
    { assetId: 1631293139, trait: "Hidden One", type: "Armour", total: 118, effects: ["Increases Intelligence."] },
    { assetId: 1631296742, trait: "Magicians Robe", type: "Armour", total: 84, effects: ["Increases accuracy of magic type moves."] },
    { assetId: 1631298825, trait: "Pharaoh", type: "Armour", total: 68, effects: ["Gain Empower at the start of battle."] },
    { assetId: 1631299446, trait: "Rags", type: "Armour", total: 157, effects: ["Increases Dexterity."] },
    { assetId: 1631302191, trait: "Shinobi", type: "Armour", total: 78, effects: ["Increases Speed."] },
    { assetId: 1631305105, trait: "Unchained", type: "Armour", total: 96, effects: ["Increases Doom."] },
    { assetId: 1642179694, trait: "Emperor Armour", type: "Armour", total: 15, effects: ["Increases Health.", "Gain Bless at the start of battle."] },
    { assetId: 1792645489, trait: "Elf Robe", type: "Armour", total: 40, effects: ["Increases Speed.", "Increases accuracy of ranged type moves."] },
    { assetId: 1792660153, trait: "Leather Garb", type: "Armour", total: 40, effects: ["Increases Health."] },
    { assetId: 1806077922, trait: "Executioner Robe", type: "Armour", total: 40, effects: ["Increases Bleed."] },
    { assetId: 2311097589, trait: "Pirate Coat", type: "Armour", total: 65, effects: ["Increases Speed.", "Increases Bleed."] },
    { assetId: 3586495594, trait: "Rogue", type: "Armour", total: 45, effects: ["Increases Speed.", "Increases Dexterity."] },
    { assetId: 3586495090, trait: "Arctic Shinobi", type: "Armour", total: 30, effects: ["Increases Speed.", "Resistance to Freeze."] },
    { assetId: 3668457150, trait: "Earth-Faction", type: "Armour", total: 35, effects: ["Resistance to Poison.", "Increases Nurture."] },
    { assetId: 3668457146, trait: "Dragon-Guard", type: "Armour", total: 35, effects: ["Resistance to Burn.", "Increases Shield."] }
  ],
  Extra: [
    { assetId: 1631307699, trait: "Crescent Moon Earring", type: "Extra", total: 50, effects: ["Increases Resist."] },
    { assetId: 1631308577, trait: "Dragon Fangs Earring", type: "Extra", total: 47, effects: ["Increases Burn."] },
    { assetId: 1631309418, trait: "Fusion Pearl Earring", type: "Extra", total: 49, effects: ["Increases Bless."] },
    { assetId: 2156520477, trait: "Tentacle Earring", type: "Extra", total: 45, effects: ["Increases Drown."] },
    { assetId: 2311097583, trait: "Hoop Earring", type: "Extra", total: 65, effects: ["Increases Health."] },
    { assetId: 3586495521, trait: "Golden Feathers", type: "Extra", total: 45, effects: ["Increases Speed.", "Increases Bless."] },
    { assetId: 3586495102, trait: "Battle Wound", type: "Extra", total: 45, effects: ["Increases Strength.", "Gain Bleed at the start of battle."] },
    { assetId: 3668457140, trait: "Crescent-Birthmark", type: "Extra", total: 35, effects: ["Resistance to Doom."] }
  ],
  Skin: [
    { trait: "Dark Skin", type: "Skin", champions: 195, effects: ["Increases Health.", "Increases Strength."] },
    { trait: "Tribal Dark Skin", type: "Skin", champions: 139, effects: ["Increases Health.", "Increases Poison."] },
    { trait: "Tribal Light Skin", type: "Skin", champions: 162, effects: ["Increases Dexterity.", "Increases Poison."] },
    { trait: "Fire Dragon", type: "Skin", champions: 43, effects: ["Apply Burn at the start of battle."] },
    { trait: "Undead", type: "Skin", champions: 86, effects: ["Gain Doom at the start of battle.", "Increases Strength."] },
    { trait: "Chameleon", type: "Skin", champions: 30, effects: ["Resistance to Poison."] },
    { trait: "Light Skin", type: "Skin", champions: 221, effects: ["Increases Intelligence."] },
    { trait: "Elder Dragon", type: "Skin", champions: 56, effects: ["Resistance to Burn."] },
    { trait: "Snake", type: "Skin", champions: 68, effects: ["Gain Cleanse at the start of battle."] }
  ]
};
var TRAIT_EFFECTS2 = Object.values(CHAMPION_TRAITS2).flat().reduce((acc, traitDef) => {
  if (traitDef?.assetId) acc[Number(traitDef.assetId)] = traitDef.effects || [];
  return acc;
}, {});
var CHAMPION_ASSET_TRAITS2 = Object.entries(CHAMPION_TRAITS2).filter(([type]) => type !== "Skin").flatMap(
  ([type, traitDefs]) => (Array.isArray(traitDefs) ? traitDefs : []).filter((traitDef) => traitDef?.assetId).map((traitDef) => ({
    assetId: Number(traitDef.assetId),
    name: traitDef.trait,
    type,
    total: traitDef.total ?? null,
    effects: traitDef.effects || []
  }))
);
var CHAMPION_SKIN_TRAITS2 = (CHAMPION_TRAITS2.Skin || []).map((traitDef) => ({
  assetId: null,
  name: traitDef.trait,
  type: "Skin",
  champions: traitDef.champions ?? null,
  effects: traitDef.effects || []
}));
var SKIN_EFFECTS2 = (CHAMPION_TRAITS2.Skin || []).reduce((acc, traitDef) => {
  if (traitDef?.trait) acc[traitDef.trait] = traitDef.effects || [];
  return acc;
}, {});
var TRAIT_TYPE_BY_ASSET_ID2 = Object.entries(CHAMPION_TRAITS2).reduce(
  (acc, [type, traitDefs]) => {
    if (type === "Skin") return acc;
    (Array.isArray(traitDefs) ? traitDefs : []).forEach((traitDef) => {
      if (traitDef?.assetId) acc[Number(traitDef.assetId)] = type;
    });
    return acc;
  },
  {}
);

// pages/api/arena/playground.js
var import_playground = __toESM(require_playground());
var import_ipfsMedia = __toESM(require_ipfsMedia());
var IDX = "https://mainnet-idx.algonode.cloud";
var ALGOD = "https://mainnet-api.algonode.cloud";
async function read(url, optional = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12e3);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (optional && r.status === 404) return null;
    if (!r.ok) throw new Error(`Champion data service returned ${r.status}. Please retry.`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}
async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Use GET." });
  }
  const id = Number(req.query.assetId), address = String(req.query.address || "");
  if (!Number.isSafeInteger(id) || id <= 0 || !import_algosdk2.default.isValidAddress(address)) return res.status(400).json({ error: "Choose a champion from your connected wallet." });
  res.setHeader("Cache-Control", "no-store");
  try {
    const [assetResult, holdings] = await Promise.all([read(`${IDX}/v2/assets/${id}`), read(`${IDX}/v2/accounts/${address}/assets?asset-id=${id}`)]);
    const asset = assetResult.asset;
    if (asset?.params?.creator !== import_playground.CHAMPION_CREATOR || Number(asset.params.total) !== 1 || asset.deleted) return res.status(400).json({ error: "This NFT is not a Dark Coin Champion." });
    if (!holdings.assets?.some((h) => Number(h["asset-id"]) === id && Number(h.amount) > 0 && !h.deleted)) return res.status(403).json({ error: "This champion is no longer in the connected wallet." });
    let metadata = null, next = null;
    for (let page = 0; page < 10 && !metadata; page++) {
      const txs = await read(`${IDX}/v2/assets/${id}/transactions?tx-type=acfg&limit=100${next ? "&next=" + encodeURIComponent(next) : ""}`);
      for (const tx of [...txs.transactions || []].sort((a, b) => b["confirmed-round"] - a["confirmed-round"] || (b["intra-round-offset"] || 0) - (a["intra-round-offset"] || 0))) {
        try {
          const d = JSON.parse(Buffer.from(tx.note || "", "base64").toString("utf8"));
          if (d.properties?.Skin) {
            metadata = d;
            break;
          }
        } catch {
        }
      }
      next = txs["next-token"];
      if (!next) break;
    }
    if (!metadata) throw new Error("The champion\u2019s trait metadata could not be found.");
    const properties = { ...metadata.properties };
    await Promise.all([["Head", "H"], ["Armour", "A"], ["Weapon", "W"], ["Magic", "M"], ["Extra", "E"]].map(async ([category, suffix]) => {
      const key = Buffer.alloc(9);
      key.writeBigUInt64BE(BigInt(id));
      key[8] = suffix.charCodeAt(0);
      const box = await read(`${ALGOD}/v2/applications/1632253886/box?name=${encodeURIComponent("b64:" + key.toString("base64"))}`, true);
      if (!box) return;
      const bytes = Buffer.from(box.value, "base64");
      if (bytes.length !== 8) throw new Error("Invalid equipped trait data.");
      const traitId = Number(bytes.readBigUInt64BE());
      if (!traitId) {
        properties[category] = "None";
        return;
      }
      const trait = CHAMPION_TRAITS2[category].find((t) => t.assetId === traitId);
      if (!trait) throw new Error(`Unknown equipped ${category.toLowerCase()} trait.`);
      properties[category] = trait.trait;
    }));
    return res.json({ id, name: asset.params.name, image: (0, import_ipfsMedia.assetImageUrl)(asset.params), traits: properties, loadout: (0, import_playground.resolveLoadout)(properties) });
  } catch (error) {
    return res.status(502).json({ error: error.name === "AbortError" ? "Champion data timed out. Please retry." : error.message });
  }
}

// lib/arena/availability.js
var PLAYGROUND_JOIN_ENABLED = process.env.NEXT_PUBLIC_ARENA_DEV === "true" || process.env.NEXT_PUBLIC_ARENA_ENABLED === "true";
var PLAYGROUND_PAUSED_MESSAGE = "The playground is temporarily closed while we improve arena performance.";

// lib/arena/tickets.js
var import_crypto3 = __toESM(require("crypto"));
var ROOM_ID = "playground-realtime-v1";
var hashToken = (value) => import_crypto3.default.createHash("sha256").update(value).digest("hex");
function mac(value, secret) {
  if (!secret || secret.length < 32) throw new Error("Arena ticket signing is not configured.");
  return import_crypto3.default.createHmac("sha256", secret).update(value).digest();
}
function issueTicket(champion, address, secret, now = Date.now() / 1e3, roomId = ROOM_ID) {
  const claims = { v: 1, room: roomId, nonce: import_crypto3.default.randomBytes(24).toString("hex"), wallet: hashToken(address), champion, iat: now, exp: now + 60 };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return body + "." + mac(body, secret).toString("base64url");
}

// pages/api/arena/combat.js
var config = { api: { bodyParser: { sizeLimit: "20kb" } } };
var attempts = /* @__PURE__ */ new Map();
async function verifiedChampion(assetId, address) {
  let status2 = 200, result;
  await handler({ method: "GET", query: { assetId, address } }, { setHeader() {
  }, status(n) {
    status2 = n;
    return this;
  }, json(value) {
    result = value;
    return this;
  } });
  if (status2 !== 200) {
    const e = new Error(result?.error || "Could not verify this champion.");
    e.status = status2;
    throw e;
  }
  return result;
}
async function handler2(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  try {
    const body = req.body || {}, op = body.op, now = Date.now() / 1e3;
    if (op === "join" && !PLAYGROUND_JOIN_ENABLED) return res.status(503).json({ code: "PLAYGROUND_PAUSED", error: PLAYGROUND_PAUSED_MESSAGE });
    if (op === "join") {
      const address = String(body.address || ""), assetId = Number(body.assetId);
      if (!import_algosdk3.default.isValidAddress(address) || !Number.isSafeInteger(assetId) || assetId < 1) return res.status(400).json({ error: "Choose a champion from your connected wallet." });
      const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0];
      if (now - (attempts.get(ip) || 0) < 3) return res.status(429).json({ error: "Please wait a moment before entering again." });
      if (attempts.size > 2e3) attempts.clear();
      attempts.set(ip, now);
      const baselineSpell2 = validateBaselineSpell(body.baselineSpell);
      const champion = await verifiedChampion(assetId, address);
      champion.baselineSpell = baselineSpell2;
      if (process.env.ARENA_TRANSPORT === "websocket") {
        const url = process.env.ARENA_WS_URL;
        if (!url || !url.startsWith("wss://")) return res.status(503).json({ error: "The arena connection is not configured yet." });
        return res.json({ champion, session: { transport: "websocket", url, ticket: issueTicket(champion, address, process.env.ARENA_TICKET_SECRET, now, process.env.ARENA_ROOM_ID), expiresAt: now + 60 } });
      }
      const db = arenaDatabase();
      const session = await joinPracticeArena(db, address, champion, import_crypto4.default.randomBytes(32).toString("hex"));
      return res.json({ champion, session });
    }
    if (op === "input" || op === "leave") {
      if (process.env.ARENA_TRANSPORT === "websocket") return res.status(410).json({ error: "The arena connection has changed. Select your champion again." });
      const db = arenaDatabase();
      const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
      return res.json(await arenaCommand(db, token, { ...body.input, leave: op === "leave" }));
    }
    return res.status(400).json({ error: "Unknown arena request." });
  } catch (e) {
    const infrastructure = /credential|permission|UNAVAILABLE|DEADLINE|ECONN|metadata|ENOTFOUND/i.test(e.message || "");
    if (infrastructure) console.error("Arena authority unavailable:", e.code || e.name);
    return res.status(e.status || (infrastructure ? 503 : 400)).json({ error: infrastructure ? "The arena server is unavailable. Please try again shortly." : e.message });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config
});
