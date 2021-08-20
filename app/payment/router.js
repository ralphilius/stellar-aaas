"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth = require('../middlewares/auth')();
const router = require('express').Router();
const stellar_1 = __importDefault(require("../utils/stellar"));
const header_validator_1 = __importDefault(require("../middlewares/header-validator"));
async function makePayment(req, res) {
    var _a;
    const { destination, amount } = req.body;
    if (!destination || !amount)
        return res.status(400).end();
    try {
        const stellar = await stellar_1.default.initialize();
        const source = stellar.muxedFromId(req.user.id);
        const result = await stellar.makePayment(source.accountId(), destination, amount);
        if (result.toLedger) {
            res.status(204).json(result.data);
        }
        else {
            res.status(204).end();
        }
    }
    catch (e) {
        console.error(e);
        if (e.message) {
            switch (e.message) {
                case 'source-not-found':
                    return res.status(404).end();
                case 'insufficient-balance':
                    return res.status(409).end();
                case 'NotFoundError':
                case 'destination-not-found':
                    return res.status(404).end();
                // default: 
                //   return res.status(500).end();
            }
            const result_codes = ((((e || {}).response || {}).data || {}).extras || {}).result_codes;
            if ((_a = result_codes.operations) === null || _a === void 0 ? void 0 : _a.includes("op_no_destination"))
                return res.status(404).end();
            res.status(500).end();
        }
        else {
            res.status(500).end();
        }
    }
}
router.post('/pay', header_validator_1.default, auth, makePayment);
module.exports = router;
//# sourceMappingURL=router.js.map