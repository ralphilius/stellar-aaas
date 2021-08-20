import app from '../src/index';
import chai from 'chai';
import chaiHttp from 'chai-http';
// const StellarSdk = require("stellar-sdk");
import StellarSdk from 'stellar-sdk';
import { Keypair } from 'stellar-sdk';
chai.use(chaiHttp);
const expect = chai.expect;

const PUBKEY = "GCRYYMHDTKHEDRBJVVIQDMO6FADIY3QWLGPQKNBRBJY5R76XBYLPNOBC";
const MUSERNAME_ME = 'ralphilius';
const MPUBKEY_ME = "MCRYYMHDTKHEDRBJVVIQDMO6FADIY3QWLGPQKNBRBJY5R76XBYLPMAAJ3ES4MW2YWTROC";

const MUSERNAME_TYLER = "kalepail";
const MPUBKEY_TYLER = "MCRYYMHDTKHEDRBJVVIQDMO6FADIY3QWLGPQKNBRBJY5R76XBYLPMAAAAFZEP67DPW6I2"

const MPUBKEY_RANDOM = "MCRYYMHDTKHEDRBJVVIQDMO6FADIY3QWLGPQKNBRBJY5R76XBYLPN7777777777774Y7C";
const MUSER_RANDOM = '18446744073709551615';

describe("payment works", function(){
  this.timeout(30000)
  let apiKey: string = '', balance = 100;
  let requester = chai.request(app).keepOpen();
  before(async () => {
    return requester.post('/api/login')
      .set('content-type', 'application/json')
      .send({ username: MUSERNAME_ME, password: "123456" })
      .then((res: any) => {
        apiKey = res.body['apiKey'];
      });
  });

  before(() => {
    return requester.post('/api/register')
      .set('content-type', 'application/json')
      .send({ username: MUSERNAME_TYLER, password: "123456" });
  });

  after(() => {
    requester.close();
  })

  describe("payment made to unmuxed account", () => {
    let pair1: Keypair, pair2: Keypair;
    before(function(){
      //this.timeout(10000);
      pair1 = StellarSdk.Keypair.random();
      pair2 = StellarSdk.Keypair.random();
      
      chai.request(`https://friendbot.stellar.org`)
        .get(`?addr=${encodeURIComponent(pair1.publicKey())}`)
        .end()

    })

    it("should pay to existing account", function(done) {
      //this.timeout(20000);
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
      //this.timeout(10000);
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
    it("should pay to existing customer", function(done) {
      //this.timeout(20000);
      requester.post('/api/pay')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send({ destination: MPUBKEY_TYLER, amount: "1" })
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
        .send({ destination: MPUBKEY_TYLER, amount: "-1" })
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
        .send({ destination: MPUBKEY_TYLER, amount: "200" })
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
        .send({ destination: MPUBKEY_RANDOM, amount: "1" })
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