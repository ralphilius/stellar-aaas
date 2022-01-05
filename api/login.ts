import type { VercelRequest, VercelResponse } from '@vercel/node';
import { User } from '../src/types';
import validateHeader from '../src/middlewares/header-validator';
import validateRequest from '../src/middlewares/request-validator';
import handleErrors from '../src/middlewares/error-handler';
import { getUser } from '../src/utils/database';
import { validPassword } from '../src/utils/account';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  await validateHeader(req, res);
  await validateRequest(req, res);

  const { username, password } = req.body;

  getUser(username)
    .then((user: User) => {
      if (!user) return res.status(404).end();

      if (!validPassword(password, user.hash, user.salt)) {
        res.status(401).end();
      } else {
        res.json({ apiKey: user.apiKey })
      }
    })
};

export default handleErrors(handler);