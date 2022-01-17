import type { VercelResponse } from '@vercel/node';
import handleErrors from '../src/middlewares/error-handler';
import { RequestWithUser } from '../src/types';
import { getUserById } from '../src/utils/database';
import auth from '../src/middlewares/authenticator';
import StellarCustodial from '../src/utils/stellar';

const handler = async (req: RequestWithUser, res: VercelResponse) => {
  await auth(req, res);
  const { id } = req.user;
  const stellar = await StellarCustodial.initialize();
  const muxedAccount = stellar.muxedFromId(id);
  const user = await getUserById(id);
  return res.json({
    address: muxedAccount.accountId(),
    balance: user['balance']
  })
};

export default handleErrors(handler);