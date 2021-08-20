const StellarSdk = require("stellar-sdk");
import {
  Account, Asset,
  MuxedAccount,
  TransactionBuilder
} from 'stellar-sdk'
import { getUserById, updateUser } from './database';
import { usernameForId } from './account';
import { User } from '../types'

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

function isWithinMuxedBase(source: MuxedAccount, dest: MuxedAccount) {
  return source.baseAccount().accountId() == dest.baseAccount().accountId();
}

class StellarCustodial {
  CUSTODIAL_ACCOUNT: Account;
  static _instance: StellarCustodial;

  private constructor(private account: Account) {
    this.CUSTODIAL_ACCOUNT = account;
  }

  public usernameForMuxed(username: string): MuxedAccount {
    const userId = usernameForId(username);
    return new MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
  }

  muxedFromAddress(address: string): MuxedAccount {
    return MuxedAccount.fromAddress(address, this.CUSTODIAL_ACCOUNT.sequenceNumber());
  }

  public muxedFromId(userId: string): MuxedAccount {
    return new MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
  }

  public async getBaseMuxedBalance(acc: MuxedAccount): Promise<string | null> {
    try {
      const user: User = await getUserById(acc.id());
      return user.balance;
    } catch (e) {
      console.error(e);
      return null;
    }

  }

  public async makePayment(source: string, dest: string, amount: string): Promise<any> {
    const sourceMuxed = this.muxedFromAddress(source);
    const sourceUser = await getUserById(sourceMuxed.id());
    console.log(sourceUser);
    if (!sourceUser) throw new Error('source-not-found');
    console.log(sourceUser.balance, amount, sourceUser.balance < amount)
    if (parseFloat(sourceUser.balance) < parseFloat(amount)) throw new Error("insufficient-balance")

    if (isMuxedAccount(source) && isMuxedAccount(dest)) {
      const destMuxed = this.muxedFromAddress(dest);

      if (isWithinMuxedBase(sourceMuxed, destMuxed)) {
        const destUser = await getUserById(destMuxed.id());

        if (!destUser) throw new Error('destination-not-found');

        await updateUser(sourceMuxed.id(), {
          ...sourceUser,
          balance: (parseFloat(sourceUser.balance) - parseFloat(amount)).toString()
        })
        await updateUser(destMuxed.id(), {
          ...destUser,
          balance: (parseFloat(destUser.balance) + parseFloat(amount)).toString()
        });
        return {
          toLedger: false
        }
      }
    }

    // muxed to outside should reduce balance & revert on failure
    return loadAccount(sourceMuxed)
      .then((accountForPayment: Account) => {
        let payment = StellarSdk.Operation.payment({
          source: sourceMuxed.accountId(),
          destination: dest,
          asset: Asset.native(),
          amount: amount,
          withMuxing: isAnyAccountMuxed(sourceMuxed, dest),
        });

        let tx = new TransactionBuilder(accountForPayment, {
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
        await updateUser(sourceMuxed.id(), {
          ...sourceUser,
          balance: (parseFloat(sourceUser.balance) - parseFloat(amount)).toString()
        })
        return {
          toLedger: true,
          data: tx
        }
      }).catch(async (e) => {
        await updateUser(sourceMuxed.id(), {
          ...sourceUser,
          balance: (parseFloat(sourceUser.balance)).toString()
        })
        throw e;
      });
  }

  

  public static async initialize(): Promise<StellarCustodial> {
    const account = await server.loadAccount(custodialKey.publicKey());

    if (!StellarCustodial._instance) StellarCustodial._instance = new StellarCustodial(account);

    return StellarCustodial._instance;
  }

}

export default StellarCustodial;