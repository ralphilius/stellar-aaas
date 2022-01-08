import chai from 'chai';
import chaiHttp from 'chai-http';
// const StellarSdk = require("stellar-sdk");
import StellarSdk, { MuxedAccount } from 'stellar-sdk';
import { Keypair, Account } from 'stellar-sdk';
import { usernameForId } from '../src/utils/account';

chai.use(chaiHttp);
const expect = chai.expect;

const USERNAME_ME = 'ralphilius';
const keypair = Keypair.fromSecret(process.env.STELLAR_SECRET as string);
const account = new Account(keypair.publicKey(), "0");

const USERNAME_TYLER = "kalepail";
const MUXED_PUBKEY_TYLER = new MuxedAccount(account, usernameForId(USERNAME_TYLER)).accountId();
console.log(MUXED_PUBKEY_TYLER);

const MUSER_RANDOM = '18446744073709551615';
const MUXED_PUBKEY_RANDOM = new MuxedAccount(account, MUSER_RANDOM).accountId();
console.log(MUXED_PUBKEY_RANDOM);

const requester = chai.request(process.env.VERCEL_BASE_URL || "http://localhost:3000").keepOpen();

describe("payment works", function(){
  this.timeout(10000)
  let apiKey: string = '', balance = 100;
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

  after(() => {
    requester.close();
  })

  describe("payment made to unmuxed account", () => {
    let pair1: Keypair, pair2: Keypair;
    before(function(){
      pair1 = Keypair.random();
      pair2 = Keypair.random();
      console.log(pair1.publicKey(), pair2.publicKey())
      
      return chai.request(`https://friendbot.stellar.org`)
        .get(`?addr=${encodeURIComponent(pair1.publicKey())}`)

    })

    it("should pay to existing account", function(done) {
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

    // it("should not pay to non-existent customer", function(done) {
    //   requester.post('/api/pay')
    //     .set("authorization", `Bearer ${apiKey}`)
    //     .set('content-type', 'application/json')
    //     .send({ destination: pair2.publicKey(), amount: "1" })
    //     .then((res) => {
    //       expect(res).to.have.status(404);
    //       done();
    //     }).catch(err => {
    //       throw err
    //     });
    // })

  })

  describe("payment made to muxed account in same base", () => {
    it("should pay to existing customer", function(done) {
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

    it("should not pay with negative amount", function(done) {
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

    it("should not pay with insufficient balance", function(done) {
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

    it("should not pay to non-existent customer", function(done) {
      //this.timeout(20000);
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

  describe("payment made to muxed account outside", () => {

  });
})