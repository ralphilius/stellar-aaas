"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountForApiKey = exports.securePassword = exports.validPassword = exports.validUsername = exports.usernameForId = void 0;
const crypto = __importStar(require("crypto"));
const database_1 = require("./database");
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789', 36);
const USERNAME_REGEX = /^[A-Za-z0-9]{3,12}$/; //^[a-zA-Z0-9]+$/;
// Muxed account can only accept number, so we need to convert username string to a number.
function usernameForId(username) {
    //return username.split('').map(c => c.charCodeAt(0)).join('');
    return `${BigInt(parseInt(username.toLowerCase(), 36)).toString()}`;
}
exports.usernameForId = usernameForId;
function validUsername(username) {
    return USERNAME_REGEX.test(username.toLowerCase());
}
exports.validUsername = validUsername;
function validPassword(password, hash, salt) {
    return hash == crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
}
exports.validPassword = validPassword;
;
function securePassword(password) {
    let salt = crypto.randomBytes(16).toString('hex');
    let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
    return { salt, hash };
}
exports.securePassword = securePassword;
function accountForApiKey(apiKey) {
    const username = database_1.getToken(apiKey);
    if (!username)
        return null;
    return database_1.getUser(username);
}
exports.accountForApiKey = accountForApiKey;
//# sourceMappingURL=account.js.map