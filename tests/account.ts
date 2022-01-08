//import app from '../src/index';
import { User } from '../src/types';
import chai from 'chai';
import 'chai/register-should';
import chaiHttp from 'chai-http';

const { Deta } = require("deta")
const deta = Deta(process.env.DETA_PROJECT_KEY)
const db = deta.Base("users");
// const Database = require("@replit/database");
// const db = new Database(process.env.CUSTOM_DB || null);

chai.use(chaiHttp);

const requester = chai.request(process.env.VERCEL_BASE_URL || "http://localhost:3000").keepOpen();

const USERNAME = 'ralphilius';
const USER_ID = '2772031055288500'

describe("account registration works", function () {
  this.timeout(30000);
  before(function() {
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

  describe('POST /api/register', () => {
    it("should create account correctly", (done) => {
      requester.post('/api/register')
        .set('content-type', 'application/json')
        .send({ username: USERNAME, password: "123456" })
        .end((err, res) => {
          res.should.have.status(204);
          done();
        });
    })

    it("should not create existing account", (done) => {
      requester.post('/api/register')
        .set('content-type', 'application/json')
        .send({ username: USERNAME, password: "123456" })
        .end((err, res) => {
          res.should.have.status(409);
          done();
        });
    })
  })

  describe('POST /api/login', () => {
    it("should return API key", (done) => {
      requester.post('/api/login')
        .set('content-type', 'application/json')
        .send({ username: USERNAME, password: "123456" })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('apiKey')
          done();
        });
    })
  })

  describe('GET /api/info', () => {
    var apiKey: string = ''
    beforeEach(async () => {
      return db.get(`${USER_ID}`).then((user: User) => apiKey = user['apiKey']);
    })

    it("should return account information", (done) => {
      requester.get('/api/info')
        .set("authorization", `Bearer ${apiKey}`)
        .set('content-type', 'application/json')
        .send()
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('address')
          res.body.should.have.property('balance')
          done();
        });
    })
  })
})