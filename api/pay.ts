import type { VercelResponse } from '@vercel/node';
import handleErrors from '../src/middlewares/error-handler';
import { RequestWithUser } from '../src/types';
import validateHeader from '../src/middlewares/header-validator';
import auth from '../src/middlewares/authenticator';
import { BigNumber } from 'bignumber.js';
import StellarCustodial from '../src/utils/stellar';

const handler = async (req: RequestWithUser, res: VercelResponse) => {
  await validateHeader(req, res);
  await auth(req, res);
  
  const { destination, amount }: { destination: string, amount: string } = req.body;

  if (!destination || !amount) return res.status(400).end();

  if(new BigNumber(amount).lt(0)) return res.status(400).end();

  try {
    const stellar = await StellarCustodial.initialize();
    const source = stellar.muxedFromId(req.user.id);
    const result = await stellar.makePayment(source.accountId(), destination, amount);

    if (result.toLedger) {
      res.status(204).json(result.data);
    } else {
      res.status(204).end();
    }
  } catch (e) {
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

      // if (result_codes.transaction == "tx_bad_seq") return stellar;

      if (result_codes?.operations?.includes("op_no_destination")) return res.status(404).end();
      console.log(e)
      res.status(500).json({ error: e.message });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
};

export default handleErrors(handler);