"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = express_1.default();
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use('/api', require('./account/router'));
app.use('/api', require('./payment/router'));
app.listen(process.env.PORT || 3000, () => {
    console.log('server started');
});
exports.default = app;
//# sourceMappingURL=index.js.map