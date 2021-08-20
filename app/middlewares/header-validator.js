"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function validate(req, res, next) {
    const { headers } = req;
    if (!headers['content-type'] || (headers['content-type'] != 'application/json'))
        return res.status(400).end();
    next();
}
exports.default = validate;
//# sourceMappingURL=header-validator.js.map