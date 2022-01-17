const StellarSdk = require("stellar-sdk");
import {
  Account, Asset,
  Keypair,
  MuxedAccount,
  Server,
  ServerApi,
  TransactionBuilder
} from 'stellar-sdk'
import { getUserById, updateUser } from './database';
import { usernameForId } from './account';
import { User } from '../types'
import { BigNumber } from 'bignumber.js';
import { Retrier } from '@jsier/retrier';

const server: Server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
export const CUSTODIAL_KEY: Keypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET);

async function loadAccount(account: string | Account | MuxedAccount): Promise<Account> {
  let publicKey = null;
  if (typeof account == "string") {
    account = MuxedAccount.fromAddress(account, "0");
  }

  publicKey = account.accountId();
  if (account.accountId().startsWith("M")) {
    publicKey = (account as MuxedAccount).baseAccount().accountId();
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

function isWithinMuxedBase(source: MuxedAccount, dest: MuxedAccount) {
  return source.baseAccount().accountId() == dest.baseAccount().accountId();
}

function createRetrier() {
  return new Retrier({
    limit: 2,
    stopRetryingIf: (e, attempt) => {
      const result_codes = ((((e || {}).response || {}).data || {}).extras || {}).result_codes;

      return !result_codes || result_codes.transaction != "tx_bad_seq";
    }
  });
}

class StellarCustodial {
  CUSTODIAL_ACCOUNT: Account;
  static _instance: StellarCustodial;

  private constructor(private account: Account) {
    this.CUSTODIAL_ACCOUNT = account;
  }

  public muxedFromUsername(username: string): MuxedAccount {
    const userId = usernameForId(username);
    return new MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
  }

  muxedFromAddress(address: string): MuxedAccount {
    return MuxedAccount.fromAddress(address, this.CUSTODIAL_ACCOUNT.sequenceNumber());
  }

  public async increaseBalance(userId: string, amount: string){
    if(!userId || !amount) return;
    const user = await getUserById(userId);
    if(user) await this.updateAccountBalance(user, BigNumber.sum(user.balance, amount).toString())
  }

  public async decreaseBalance(userId: string, amount: string){
    if(!userId || !amount) return;
    const user = await getUserById(userId);
    if(user) await this.updateAccountBalance(user, new BigNumber(user.balance).minus(amount).toString())
  }

  public async updateAccountBalance(account: User | null | undefined, balance: string) {
    if(!account || !balance) return;
    if (account) {
      try {
        await updateUser(account.key, {
          balance: (new BigNumber(balance)).toString()
        })
      } catch (e) {
        console.error(e);
      }
      
    }
  }

  public muxedFromId(userId: string): MuxedAccount {
    return new MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
  }

  public transactions(cursor?: string){
    return server.payments()
      .forAccount(CUSTODIAL_KEY.publicKey())
      .join("transactions")
      .cursor(cursor || "now")
      .limit(100)
      .order("desc")
      .call();
  }

  public static async listenForPayements() {
    const stellar = await this.initialize();
    server
      .payments()
      .forAccount(CUSTODIAL_KEY.publicKey())
      .join("transactions")
      .cursor("now")
      .stream({
        onmessage: (payment: any) => { // stellar-sdk doesn't have working type for muxed account yet
          const { to_muxed_id, amount } = payment;
          stellar.increaseBalance(to_muxed_id, amount);
        },
      });
  }

  public async accreditAccount(txHash: string) {
    return server.payments()
      .forTransaction(txHash)
      .call()
      .then(page => {
        page.records.filter((record: any) => record.to == this.CUSTODIAL_ACCOUNT.accountId())
          .forEach(async (record: any) => {
            const { to_muxed_id, amount } = record;
            //TODO: For simplicity, check for previous completed deposit is ignored
            this.increaseBalance(to_muxed_id, amount);
          });
      })
  }

  public async makePayment(source: string, dest: string, amount: string): Promise<any> {
    const sourceMuxed = this.muxedFromAddress(source);
    let sourceUser = await getUserById(sourceMuxed.id());

    if (!sourceUser) throw new Error('source-not-found');

    if (new BigNumber(sourceUser.balance).lt(new BigNumber(amount))) throw new Error("insufficient-balance")

    if (isMuxedAccount(source) && isMuxedAccount(dest)) {
      const destMuxed = this.muxedFromAddress(dest);

      if (isWithinMuxedBase(sourceMuxed, destMuxed)) {
        const destUser = await getUserById(destMuxed.id());

        if (!destUser) throw new Error('destination-not-found');

        await this.decreaseBalance(sourceMuxed.id(), amount);
        await this.increaseBalance(destMuxed.id(), amount);
        return {
          toLedger: false
        }
      }
    }

    // muxed to outside should reduce balance & revert on failure
    const retrier = createRetrier();
    return retrier.resolve(async (attempt) => {
      await this.decreaseBalance(sourceMuxed.id(), amount);
      return this.payExternal(sourceMuxed.accountId(), dest, amount);
    }).then(async (tx) => {
      return {
        toLedger: true,
        data: tx
      }
    }).catch(async (e) => {
      console.error(e);
      await this.increaseBalance(sourceMuxed.id(), amount);
      throw e;
    });
  }

  async payExternal(source: string, dest: string, amount: string) {
    return loadAccount(source)
      .then((accountForPayment: Account) => {
        let payment = StellarSdk.Operation.payment({
          source: source,
          destination: dest,
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

        tx.sign(CUSTODIAL_KEY);
        return server.submitTransaction(tx);
      })
  }

  public static async initialize(): Promise<StellarCustodial> {
    const account = await server.loadAccount(CUSTODIAL_KEY.publicKey());

    if (!StellarCustodial._instance) StellarCustodial._instance = new StellarCustodial(account);

    return StellarCustodial._instance;
  }

}

export default StellarCustodial;