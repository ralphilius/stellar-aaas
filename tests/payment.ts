import BigNumber from 'bignumber.js';
import chai from 'chai';
import chaiHttp from 'chai-http';
// const StellarSdk = require("stellar-sdk");
import StellarSdk, { Keypair, Account, MuxedAccount, Server } from 'stellar-sdk';
var server: Server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

import { usernameForId } from '../src/utils/account';

chai.use(chaiHttp);
const expect = chai.expect;

const { Deta } = require("deta")
const deta = Deta(process.env.DETA_PROJECT_KEY)
const db = deta.Base("payments");

const USERNAME_ME = 'ralphilius';
const keypair = Keypair.fromSecret(process.env.STELLAR_SECRET as string);
const account = new Account(keypair.publicKey(), "0");

const USERNAME_TYLER = "kalepail";
const MUXED_PUBKEY_TYLER = new MuxedAccount(account, usernameForId(USERNAME_TYLER)).accountId();

const USERNAME_EXTERNAL_DEP = "fromexternal";
const MUXED_PUBKEY_EXTERNAL = new MuxedAccount(account, usernameForId(USERNAME_EXTERNAL_DEP)).accountId();

const MUSER_RANDOM = '18446744073709551615';
const MUXED_PUBKEY_RANDOM = new MuxedAccount(account, MUSER_RANDOM).accountId();

const requester = chai.request(process.env.VERCEL_BASE_URL || "http://localhost:3000").keepOpen();

describe("payment works", function () {
  this.timeout(10000)
  let apiKey: string = '', apiKeyExt = '', balance = 100;
  let pair1 = Keypair.random();
  let pair2 = Keypair.random();

  before(function () {
    return new Promise<void>(async (resolve) => {
      try {
        let res = await db.fetch();
        let allItems = res.items;
        while (res.last) {
          res = await db.fetch({}, { last: res.last });
          allItems = allItems.concat(res.items);
        }

        await allItems.forEach(async (item: any) => {
          await db.delete(item.key);
        });

        resolve();
      } catch (error) {
        console.error(error)
        throw error;
      }
    })

  });

  before(async () => {
    return requester.post('/api/login')
      .set('content-type', 'application/json')
      .send({ username: USERNAME_ME, password: "123456" })
      .then((res: any) => {
        apiKey = res.body['apiKey'];
      });
  });

  before(() => {
    return requester.post('/api/register')
      .set('content-type', 'application/json')
      .send({ username: USERNAME_TYLER, password: "123456" });
  });

  before(() => {
    return requester.post('/api/register')
      .set('content-type', 'application/json')
      .send({ username: USERNAME_EXTERNAL_DEP, password: "123456" });
  });

  after(() => {
    requester.close();
  })

  describe("payment to unmuxed account", () => {
    before(function () {
      return chai.request(`https://friendbot.stellar.org`)
        .get(`?addr=${encodeURIComponent(pair1.publicKey())}`)

    })

    it("should pay to existing account", function (done) {
      this.timeout(20000);
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: pair1.publicKey(), amount: "1" })
        .then((res) => {
          expect(res).to.have.status(204);
          requester.get('/api/info')
            .set("authorization", `Bearer ${apiKey}`)
            .end((err, res) => {
              balance--;
              expect(res.body.balance).to.equal(balance.toString());
              done();
            })
        }).catch(err => {
          throw err
        });
    })

    it("should not pay to non-existent customer", function(done) {
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: pair2.publicKey(), amount: "1" })
        .then((res) => {
          expect(res).to.have.status(404);
          done();
        }).catch(err => {
          throw err
        });
    })

  })

  describe("payment made to muxed account in same base", () => {
    it("should pay to existing customer", function (done) {
      //this.timeout(20000);
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: MUXED_PUBKEY_TYLER, amount: "1" })
        .then((res) => {
          expect(res).to.have.status(204);
          requester.get('/api/info')
            .set("authorization", `Bearer ${apiKey}`)
            .end((err, res) => {
              balance--;
              expect(res.body.balance).to.equal(balance.toString());
              done();
            })
        }).catch(err => {
          throw err
        });
    })

    it("should not pay with negative amount", function (done) {
      //this.timeout(5000);
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: MUXED_PUBKEY_TYLER, amount: "-1" })
        .then((res) => {
          expect(res).to.have.status(400);
          done();
        }).catch(err => {
          throw err
        });
    })

    it("should not pay with insufficient balance", function (done) {
      //this.timeout(20000);
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: MUXED_PUBKEY_TYLER, amount: "200" })
        .then((res) => {
          expect(res).to.have.status(409);
          done();
        }).catch(err => {
          throw err
        });
    })

    it("should not pay to non-existent customer", function (done) {
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: MUXED_PUBKEY_RANDOM, amount: "1" })
        .then((res) => {
          expect(res).to.have.status(404);
          done();
        }).catch(err => {
          throw err
        });
    })
  });

  describe("deposit into muxed", function () {
    this.timeout(120000);
    let extBalance = new BigNumber(0);
    before(async () => {
      this.timeout(30000)
      return requester.post('/api/login')
        .set('content-type', 'application/json')
        .send({ username: USERNAME_EXTERNAL_DEP, password: "123456" })
        .then((res: any) => {
          apiKeyExt = res.body['apiKey'];
        });
    });

    before(async () => {
      this.timeout(120000);
      return requester.post('/api/deposit')
        .set('content-type', 'application/json')
        .send()
        .then(res => {
          return requester.get('/api/info')
            .set("authorization", `Bearer ${apiKeyExt}`)
            .then((res) => {
              extBalance = new BigNumber(res.body['balance']);
            })
        })
        .catch(e => console.error(e));
    })

    beforeEach( async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
   });

    it("should make deposit on Stellar successfully", function (done) {
      this.timeout(120000);
      server.loadAccount(pair1.publicKey())
        .then(async (account: Account) => {
          let paymentOp = StellarSdk.Operation.payment({
            source: pair1.publicKey(),
            destination: MUXED_PUBKEY_EXTERNAL,
            asset: StellarSdk.Asset.native(),
            amount: "10",
            withMuxing: true,
          });

          let tx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            withMuxing: true
          })
            .addOperation(paymentOp)
            .setNetworkPassphrase(StellarSdk.Networks.TESTNET)
            .setTimeout(30)
            .build();

          tx.sign(pair1);
          return server.submitTransaction(tx);
        }).then(res => {
          return requester.post('/api/deposit')
            .set('content-type', 'application/json')
            .send();
        })
        .then(res => done())
        .catch(e => {
          throw e
        });
    })

    it("should recognize account balance correctly", function (done) {
      this.timeout(120000);
      try {
        requester.get('/api/info')
          .set("authorization", `Bearer ${apiKeyExt}`)
          .send()
          .then((res) => {
            expect(res.body.balance).to.equal(extBalance.plus(10).toString());
            done();
          })
      } catch (e) {
        console.error(e);
      }
    });
  })
})