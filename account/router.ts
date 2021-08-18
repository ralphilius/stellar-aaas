import { Request, Response, NextFunction } from 'express';
import { User, RequestWithUser } from '../types';
const router = require('express').Router();
import { getUser, createUser, getUserById } from '../utils/database';
import { securePassword, validPassword, validUsername } from '../utils/account';

import { nanoid } from 'nanoid';
import validateHeader from '../middlewares/header-validator';
const auth = require('../middlewares/auth')();
import StellarCustodial from '../utils/stellar';

function validateRequest(req: Request, res: Response, next: NextFunction) {
  const { username, password } = req.body;

  if (!username || !password) return res.status(400).end();

  next();
}

function createCustomer(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!validUsername(username)) return res.status(400).end();

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

      res.status(500).json(e);
    });

}

function login(req: Request, res: Response) {
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
}

async function getAccountInfo(req: RequestWithUser, res: Response) {
  const { id } = req.user;
  const stellar = await StellarCustodial.initialize();
  const muxedAccount = stellar.muxedFromId(id);
  const user = await getUserById(id);
  console.log(muxedAccount);
  //return res.json(muxedAccount);
  return res.json({
    address: muxedAccount.accountId(),
    balance: user['balance']
  })
}

router.post('/register', validateHeader, validateRequest, createCustomer);
router.post('/login', validateHeader, validateRequest, login);
router.get('/info', auth, getAccountInfo);


module.exports = router;