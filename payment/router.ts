import { Request, Response, NextFunction } from 'express';
import { User, RequestWithUser } from '../types';
const auth = require('../middlewares/auth')();
const router = require('express').Router();
import StellarCustodial from '../utils/stellar';
import validateHeader from '../middlewares/header-validator';

async function makePayment(req: RequestWithUser, res: Response){
  const { destination, amount } = req.body;
  
  if(!destination || !amount) return res.status(400).end();

  try {
    const stellar = await StellarCustodial.initialize();
    const source = stellar.getMuxedAccount(req.user.username);
    const tx = await stellar.makePayment(source, destination, amount);
    res.status(204).json(tx);
  } catch (e) {
    if(e.name && e.name == 'NotFoundError'){
      return res.status(404).end();
    }

    res.status(500).end();
  }
  
}


router.post('/pay', validateHeader, auth, makePayment);


module.exports = router;