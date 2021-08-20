"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('express').Router();
const database_1 = require("../utils/database");
const account_1 = require("../utils/account");
const nanoid_1 = require("nanoid");
const header_validator_1 = __importDefault(require("../middlewares/header-validator"));
const auth = require('../middlewares/auth')();
const stellar_1 = __importDefault(require("../utils/stellar"));
function validateRequest(req, res, next) {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).end();
    next();
}
function createCustomer(req, res) {
    const { username, password } = req.body;
    if (!account_1.validUsername(username))
        return res.status(400).json({
            message: "username must be between 4 to 12 alphanumeric characters"
        });
    database_1.getUser(username)
        .then((user) => {
        if (user)
            throw new Error('account-exists');
        const { salt, hash } = account_1.securePassword(password);
        const apiKey = nanoid_1.nanoid(32);
        return database_1.createUser(username, { salt, hash, apiKey, balance: '100' }); // Give each user 100 XLM to try out service
    })
        .then(() => {
        res.status(204).end();
    })
        .catch((e) => {
        if (e.message == 'account-exists')
            return res.status(409).end();
        res.status(500).json(e);
    });
}
function login(req, res) {
    const { username, password } = req.body;
    database_1.getUser(username)
        .then((user) => {
        if (!user)
            return res.status(404).end();
        if (!account_1.validPassword(password, user.hash, user.salt)) {
            res.status(401).end();
        }
        else {
            res.json({ apiKey: user.apiKey });
        }
    });
}
async function getAccountInfo(req, res) {
    const { id } = req.user;
    const stellar = await stellar_1.default.initialize();
    const muxedAccount = stellar.muxedFromId(id);
    const user = await database_1.getUserById(id);
    return res.json({
        address: muxedAccount.accountId(),
        balance: user['balance']
    });
}
router.post('/register', header_validator_1.default, validateRequest, createCustomer);
router.post('/login', header_validator_1.default, validateRequest, login);
router.get('/info', auth, getAccountInfo);
module.exports = router;
//# sourceMappingURL=router.js.map