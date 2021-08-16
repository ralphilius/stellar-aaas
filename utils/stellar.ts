const StellarSdk = require("stellar-sdk");
import {
  Account, Asset,
  MuxedAccount,
  TransactionBuilder
} from 'stellar-sdk'
import { getUserById } from './database';
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
const custodialKey = StellarSdk.Keypair.fromSecret("SBEQ44JMAS4UW3GOXWNSDD3QYKM56IYK247CWAXFMR4PRSGUVRFSMUOU");

async function loadAccount(account: string | Account | MuxedAccount): Promise<Account> {
  let publicKey = null;
  if (typeof account == "string") {
    publicKey = account;
  } else {
    publicKey = account.accountId();
    if (account.accountId().startsWith("M")) {
      publicKey = (account as MuxedAccount).baseAccount().accountId();
    }
  }

  return server.loadAccount(publicKey)
}

function isMuxedAccount(acc: string | Account | MuxedAccount) {
  return typeof acc == 'string' ? acc.startsWith('M') : acc.accountId().startsWith('M');
}

function isAnyAccountMuxed(...args: Array<string | Account | MuxedAccount>): boolean {
  return Array.from(args)
    .map((a) => isMuxedAccount(a))
    .reduce((t, v) => t || v, false);
}

function isWithinMuxedBase(source: string | Account | MuxedAccount, dest: string | Account | MuxedAccount) {
  return isMuxedAccount(source) && isMuxedAccount(dest) && (source as MuxedAccount).baseAccount() == (dest as MuxedAccount).baseAccount();
}

class StellarCustodial {
  CUSTODIAL_ACCOUNT: Account;

  private constructor(private account: Account) {
    this.CUSTODIAL_ACCOUNT = account;
  }

  public getMuxedAccount(username: string): MuxedAccount {
    const userId = username.split('').map(c => c.charCodeAt(0)).join('');
    return new MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
  }

  public getMuxedBalance(acc: MuxedAccount) {
    getUserById(acc.accountId())
  }

  public async makePayment(source: string | Account | MuxedAccount, dest: string | Account | MuxedAccount, amount: string): Promise<any> {

    if (isWithinMuxedBase(source, dest)) {
      const sourceMuxed = this.parseMuxedAccount((source as string | MuxedAccount));
      const destMuxed = this.parseMuxedAccount((dest as string | MuxedAccount));
    }

    return loadAccount(source)
      .then((accountForPayment: Account) => {
        let payment = StellarSdk.Operation.payment({
          source: typeof source == 'string' ? source : source.accountId(),
          destination: typeof dest == 'string' ? dest : dest.accountId(),
          asset: Asset.native(),
          amount: amount,
          withMuxing: isAnyAccountMuxed(source, dest),
        });

        let tx = new TransactionBuilder(accountForPayment, {
          networkPassphrase: StellarSdk.Networks.TESTNET,
          withMuxing: isAnyAccountMuxed(source, dest),
          fee: '100',
        })
          .addOperation(payment)
          .setTimeout(30)
          .build();

        tx.sign(custodialKey);
        return server.submitTransaction(tx);
      });
  }

  parseMuxedAccount(acc: string | MuxedAccount) {
    if (typeof acc == 'string') return new MuxedAccount(this.CUSTODIAL_ACCOUNT, acc);

    return acc;
  }

  public static async initialize(): Promise<StellarCustodial> {
    const account = await server.loadAccount(custodialKey.publicKey());
    return new StellarCustodial(account);
  }

}

// const { custodialKey: CUSTODIAL_ACCOUNT } = await preamble();

// async function preamble(){
//   const custodialKey = StellarSdk.Keypair.fromSecret("...");
//   const custodialAccount = await server.loadAccount(custodialKey.publicKey());
//   return { custodialKey, custodialAccount}
// }

// function retrieveAccount(accountId: string){
//   return server.loadAccount(accountId)
// }

export default StellarCustodial;