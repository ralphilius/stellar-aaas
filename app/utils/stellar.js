"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StellarSdk = require("stellar-sdk");
const stellar_sdk_1 = require("stellar-sdk");
const database_1 = require("./database");
const account_1 = require("./account");
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
const custodialKey = StellarSdk.Keypair.fromSecret("SBEQ44JMAS4UW3GOXWNSDD3QYKM56IYK247CWAXFMR4PRSGUVRFSMUOU");
async function loadAccount(account) {
    let publicKey = null;
    if (typeof account == "string") {
        publicKey = account;
    }
    else {
        publicKey = account.accountId();
        if (account.accountId().startsWith("M")) {
            publicKey = account.baseAccount().accountId();
        }
    }
    return server.loadAccount(publicKey);
}
function isMuxedAccount(acc) {
    return typeof acc == 'string' ? acc.startsWith('M') : acc.accountId().startsWith('M');
}
function isAnyAccountMuxed(...args) {
    return Array.from(args)
        .map((a) => isMuxedAccount(a))
        .reduce((t, v) => t || v, false);
}
function isWithinMuxedBase(source, dest) {
    return source.baseAccount().accountId() == dest.baseAccount().accountId();
}
class StellarCustodial {
    constructor(account) {
        this.account = account;
        this.CUSTODIAL_ACCOUNT = account;
    }
    usernameForMuxed(username) {
        const userId = account_1.usernameForId(username);
        return new stellar_sdk_1.MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
    }
    muxedFromAddress(address) {
        return stellar_sdk_1.MuxedAccount.fromAddress(address, this.CUSTODIAL_ACCOUNT.sequenceNumber());
    }
    muxedFromId(userId) {
        return new stellar_sdk_1.MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
    }
    async getBaseMuxedBalance(acc) {
        try {
            const user = await database_1.getUserById(acc.id());
            return user.balance;
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    async makePayment(source, dest, amount) {
        const sourceMuxed = this.muxedFromAddress(source);
        const sourceUser = await database_1.getUserById(sourceMuxed.id());
        if (!sourceUser)
            throw new Error('source-not-found');
        if (sourceUser.balance < amount)
            throw new Error("insufficient-balance");
        if (isMuxedAccount(source) && isMuxedAccount(dest)) {
            const destMuxed = this.muxedFromAddress(dest);
            if (isWithinMuxedBase(sourceMuxed, destMuxed)) {
                const destUser = await database_1.getUserById(destMuxed.id());
                if (!destUser)
                    throw new Error('destination-not-found');
                await database_1.updateUser(sourceMuxed.id(), {
                    ...sourceUser,
                    balance: (parseFloat(sourceUser.balance) - parseFloat(amount)).toString()
                });
                await database_1.updateUser(destMuxed.id(), {
                    ...destUser,
                    balance: (parseFloat(destUser.balance) + parseFloat(amount)).toString()
                });
                return {
                    toLedger: false
                };
            }
        }
        // muxed to outside should reduce balance & revert on failure
        return loadAccount(sourceMuxed)
            .then((accountForPayment) => {
            let payment = StellarSdk.Operation.payment({
                source: sourceMuxed.accountId(),
                destination: dest,
                asset: stellar_sdk_1.Asset.native(),
                amount: amount,
                withMuxing: isAnyAccountMuxed(sourceMuxed, dest),
            });
            let tx = new stellar_sdk_1.TransactionBuilder(accountForPayment, {
                networkPassphrase: StellarSdk.Networks.TESTNET,
                withMuxing: isAnyAccountMuxed(sourceMuxed, dest),
                fee: '100',
            })
                .addOperation(payment)
                .setTimeout(30)
                .build();
            tx.sign(custodialKey);
            return server.submitTransaction(tx);
        }).then(async (tx) => {
            await database_1.updateUser(sourceMuxed.id(), {
                ...sourceUser,
                balance: (parseFloat(sourceUser.balance) - parseFloat(amount)).toString()
            });
            return {
                toLedger: true,
                data: tx
            };
        });
    }
    static async initialize() {
        const account = await server.loadAccount(custodialKey.publicKey());
        if (!StellarCustodial._instance)
            StellarCustodial._instance = new StellarCustodial(account);
        return StellarCustodial._instance;
    }
}
exports.default = StellarCustodial;
//# sourceMappingURL=stellar.js.map