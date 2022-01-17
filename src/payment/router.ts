// import { Response } from 'express';
// import { RequestWithUser } from '../types';
// const auth = require('../middlewares/auth')();
// const router = require('express').Router();
// import StellarCustodial from '../utils/stellar';
// import validateHeader from '../middlewares/header-validator';
// import { BigNumber } from 'bignumber.js';

// async function makePayment(req: RequestWithUser, res: Response) {
//   const { destination, amount }: { destination: string, amount: string } = req.body;

//   if (!destination || !amount) return res.status(400).end();

//   if(new BigNumber(amount).lt(0)) return res.status(400).end();

//   try {
//     const stellar = await StellarCustodial.initialize();
//     const source = stellar.muxedFromId(req.user.id);
//     const result = await stellar.makePayment(source.accountId(), destination, amount);

//     if (result.toLedger) {
//       res.status(204).json(result.data);
//     } else {
//       res.status(204).end();
//     }
//   } catch (e) {
//     if (e.message) {
//       switch (e.message) {
//         case 'source-not-found':
//           return res.status(404).end();
//         case 'insufficient-balance':
//           return res.status(409).end();
//         case 'NotFoundError':
//         case 'destination-not-found':
//           return res.status(404).end();
//         // default: 
//         //   return res.status(500).end();
//       }
//       const result_codes = ((((e || {}).response || {}).data || {}).extras || {}).result_codes;

//       // if (result_codes.transaction == "tx_bad_seq") return stellar;

//       if (result_codes?.operations?.includes("op_no_destination")) return res.status(404).end();
//       console.log(e)
//       res.status(500).json({ error: e.message });
//     } else {
//       res.status(500).json({ error: e.message });
//     }
//   }
// }

// async function accreditAccount(req: RequestWithUser, res: Response) {
//   const { txHash } = req.params;

//   try {
//     const stellar = await StellarCustodial.initialize();
//     stellar.accreditAccount(txHash)
//       .then(() => {
//         res.json({status: "success"})
//       })
//       .catch(e => res.status(500).json(e));
//   } catch (error) {
//     res.status(500).json(error)
//   }
// }

// router.post('/pay', validateHeader, auth, makePayment);
// router.post('/deposit/:txHash', validateHeader, auth, accreditAccount)

// module.exports = router;