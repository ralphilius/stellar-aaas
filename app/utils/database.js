"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = exports.setToken = exports.getUserById = exports.getUser = exports.updateUser = exports.createUser = void 0;
const Database = require("@replit/database");
const account_1 = require("./account");
const db = new Database(process.env.CUSTOM_DB || null);
async function createUser(username, data) {
    const userId = account_1.usernameForId(username);
    setToken(data.apiKey, username); // Replit Database is a key-value database without query capability, so this will help to validate API key later.
    return db.set(`user-${userId}`, data);
}
exports.createUser = createUser;
async function updateUser(userId, data) {
    return db.set(`user-${userId}`, data);
}
exports.updateUser = updateUser;
async function getUser(username) {
    const userId = account_1.usernameForId(username);
    return db.get(`user-${userId}`);
}
exports.getUser = getUser;
async function getUserById(userId) {
    return db.get(`user-${userId}`);
}
exports.getUserById = getUserById;
function setToken(apiKey, username) {
    const userId = account_1.usernameForId(username);
    return db.set(`token-${apiKey}`, userId);
}
exports.setToken = setToken;
function getToken(apiKey) {
    return db.get(`token-${apiKey}`);
}
exports.getToken = getToken;
//# sourceMappingURL=database.js.map