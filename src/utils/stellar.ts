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

const server: Server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
export const CUSTODIAL_KEY: Keypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET);

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

  public static async updateAccountBalance(accountId: string | undefined, balance: string) {
    const user: User = await getUserById(accountId);
    if (accountId && user) {
      updateUser(accountId, {
        ...user,
        ...{ balance: (parseFloat(user.balance) + parseFloat(balance)).toString() }
      })
    }
  }

  public muxedFromId(userId: string): MuxedAccount {
    return new MuxedAccount(this.CUSTODIAL_ACCOUNT, userId);
  }

  public static listenForPayements() {
    server
      .payments()
      .forAccount(CUSTODIAL_KEY.publicKey())
      .join("transactions")
      .cursor("now")
      .stream({
        onmessage: (payment: any) => { // stellar-sdk doesn't have working type for muxed account yet
          const { to_muxed_id, amount } = payment;
          StellarCustodial.updateAccountBalance(to_muxed_id, amount);
        },
      });
  }

  public async accreditAccount(txHash: string) {
    return server.payments()
      .forTransaction(txHash)
      .call()
      .then(page => {
        page.records.filter((record: ServerApi.PaymentOperationRecord & { to_muxed?: string, to_muxed_id?: string }) => record.to == this.CUSTODIAL_ACCOUNT.accountId())
          .forEach(async (record: ServerApi.PaymentOperationRecord & { to_muxed?: string, to_muxed_id?: string }) => {
            const { to_muxed_id, amount } = record;
            //TODO: For simplicity, check for previous completed deposit is ignored
            StellarCustodial.updateAccountBalance(to_muxed_id, amount);
          });
      })
  }

  public async makePayment(source: string, dest: string, amount: string): Promise<any> {
    const sourceMuxed = this.muxedFromAddress(source);
    const sourceUser = await getUserById(sourceMuxed.id());

    if (!sourceUser) throw new Error('source-not-found');

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

        tx.sign(CUSTODIAL_KEY);
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
    const account = await server.loadAccount(CUSTODIAL_KEY.publicKey());

    if (!StellarCustodial._instance) StellarCustodial._instance = new StellarCustodial(account);

    return StellarCustodial._instance;
  }

}

export default StellarCustodial;