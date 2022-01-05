import type { VercelRequest, VercelResponse } from '@vercel/node';
import { User } from '../src/types';
import validateHeader from '../src/middlewares/header-validator';
import validateRequest from '../src/middlewares/request-validator';
import handleErrors from '../src/middlewares/error-handler';
import { getUser, createUser, getUserById } from '../src/utils/database';
import { securePassword, validPassword, validUsername } from '../src/utils/account';
import { nanoid } from 'nanoid';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  await validateHeader(req, res);
  await validateRequest(req, res);

  const { username, password } = req.body;
  if (!validUsername(username)) return res.status(400).json({
    message: "username must be between 4 to 12 alphanumeric characters"
  });

  getUser(username)
    .then((user: User) => {
      if (user) throw new Error('account-exists');

      const { salt, hash } = securePassword(password);
      const apiKey = nanoid(32);

      return createUser(username, { salt, hash, apiKey, balance: '100' }); // Give each user 100 XLM to try out service
    })
    .then(() => {
      res.status(204).end();
    })
    .catch((e: Error) => {
      if (e.message == 'account-exists') return res.status(409).end();

      res.status(500).json({error: e.message});
    });
};

export default handleErrors(handler);