import type { VercelResponse } from '@vercel/node';
import { ServerApi } from 'stellar-sdk';
import handleErrors from '../../src/middlewares/error-handler';
import { RequestWithUser } from '../../src/types';
import { createPayment, getLastPayments } from '../../src/utils/database';
import StellarCustodial from '../../src/utils/stellar';

const handler = async (req: RequestWithUser, res: VercelResponse) => {
  if (req.method != 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    let transactions: ServerApi.PaymentOperationRecord[] = [];
    const stellar = await StellarCustodial.initialize();
    let txCol = await stellar.transactions();
    transactions = txCol.records;
    let paymentFetch = await getLastPayments(transactions.map(tx => {
      return { "txHash": tx.transaction_hash }
    }));
    let existingTxs: any[] = paymentFetch.items;

    transactions = transactions.filter(tx => existingTxs.filter(e => e.txHash == tx.transaction_hash).length == 0);
    if (transactions.length == 0) return res.json({ "message": "No new transactions" });

    let shouldContinue = transactions.length > 0;
    while (shouldContinue) {
      txCol = await txCol.next();
      paymentFetch = await getLastPayments(txCol.records.map(tx => {
        return { "txHash": tx.transaction_hash }
      }));
      existingTxs = paymentFetch.items;
      if (existingTxs.length == txCol.records.length || txCol.records.length == 0) {
        shouldContinue = false;
        break;
      }
      transactions = transactions.concat(txCol.records.filter(tx => existingTxs.filter(e => e.txHash == tx.transaction_hash).length == 0));
    }
    transactions = transactions.filter(tx => tx['transaction_successful'] == true);
    for (let i = 0; i < transactions.length; i++) {
      const tx:any = transactions[i];
      if(tx['transaction_successful']){
        await createPayment({
          txHash: tx.transaction_hash,
          source_account: tx.source_account,
          transaction: tx.transaction.toString()
        }, tx.id);

        const { to_muxed_id, amount } = tx;
        await stellar.increaseBalance(to_muxed_id, amount);
      }
    }

    res.json({ status: "success" });
  } catch (error) {
    console.error(error)
    res.status(500).json(error)
  }
};

export default handleErrors(handler);