import { Response } from 'express';
import { RequestWithUser } from '../types';
const auth = require('../middlewares/auth')();
const router = require('express').Router();
import StellarCustodial from '../utils/stellar';
import validateHeader from '../middlewares/header-validator';

async function makePayment(req: RequestWithUser, res: Response){
  const { destination, amount } = req.body;
  
  if(!destination || !amount) return res.status(400).end();

  try {
    const stellar = await StellarCustodial.initialize();
    const source = stellar.muxedFromId(req.user.id);
    const result = await stellar.makePayment(source.accountId(), destination, amount);

    if(result.toLedger){ 
      res.status(204).json(result.data);
    } else {
      res.status(204).end();
    }
  } catch (e) {
    console.error(e);
    if(e.message){
      switch(e.message){
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
      if(result_codes.operations?.includes("op_no_destination")) return res.status(404).end();

      res.status(500).end();
    } else {
      res.status(500).end();
    }
  }
  
}


router.post('/pay', validateHeader, auth, makePayment);


module.exports = router;