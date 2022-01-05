import type { VercelResponse } from '@vercel/node';
import handleErrors from '../../src/middlewares/error-handler';
import { RequestWithUser } from '../../src/types';
import StellarCustodial from '../../src/utils/stellar';

const handler = async (req: RequestWithUser, res: VercelResponse) => {
  const { txHash } = req.query;

  try {
    const stellar = await StellarCustodial.initialize();
    stellar.accreditAccount(txHash as string)
      .then(() => {
        res.json({status: "success"})
      })
      .catch(e => res.status(500).json(e));
  } catch (error) {
    res.status(500).json(error)
  }
};

export default handleErrors(handler);