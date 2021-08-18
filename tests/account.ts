import app from '../src/index';
import { User } from '../src/types';
import chai from 'chai';
import chaiHttp from 'chai-http';

const Database = require("@replit/database");
const db = new Database(process.env.CUSTOM_DB || null);

chai.use(chaiHttp);
chai.should();

const USERNAME = 'ralphiliustest';
const USER_ID = '4655947712959450972160'

describe("account registration works", () => {
  before(async () => {
    return db.empty().then(() => {
      console.log("db empty");
    })
  });

  describe('POST /api/register', () => {
    it("should create account correctly", (done) => {
      chai.request(app)
        .post('/api/register')
        .set('content-type', 'application/json')
        .send({username: USERNAME, password: "123456"})
        .end((err, res) => {
          res.should.have.status(204);
          done();
        });
    })

    it("should not create existing account", (done) => {
      chai.request(app)
        .post('/api/register')
        .set('content-type', 'application/json')
        .send({username: USERNAME, password: "123456"})
        .end((err, res) => {
          res.should.have.status(409);
          done();
        });
    })
  })

  describe('POST /api/login', () => {
    it("should return API key", (done) => {
      chai.request(app)
        .post('/api/login')
        .set('content-type', 'application/json')
        .send({username: USERNAME, password: "123456"})
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
      return db.get(`user-${USER_ID}`).then((user: User) => apiKey = user['apiKey']);
      
    })

    it("should return account information", (done) => {
      chai.request(app)
        .get('/api/info')
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