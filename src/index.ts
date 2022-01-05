import express from 'express';
// import StellarCustodial, { CUSTODIAL_KEY } from './utils/stellar';
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use('/api', require('./account/router'));
// app.use('/api', require('./payment/router'));

app.listen(process.env.PORT || 3000, () => {
  console.log('server started');
});

// StellarCustodial.listenForPayements();

export default app;