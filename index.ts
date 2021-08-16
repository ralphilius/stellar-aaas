import * as express from 'express';
import { Request, Response } from 'express';
const app = express();

const Database = require("@replit/database")
const db = new Database()

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api', require('./account/router'));
app.use('/api', require('./payment/router'));

app.get('/', (req: Request, res: Response) => {
  return db.getAll().then((keys: any) => {
    console.log(keys);
    res.send(keys)
  }).catch((e: Error) => res.json(e))
  res.send('Hello Express app!')
}).get('/user/:id', (req, res) => {
  console.log(req.params)
  db.get(`user-${req.params.id}`).then((value: any) => res.json(value)).catch((e: Error) => res.json(e));
}).get('/empty', (req, res) => {
  db.empty().then(() => res.send("OK"))
}).get('/populate', (req, res) => {
  db.set(`user-${Math.random()}`, {
    a: Math.random(),
    b: "adkasbdkasbkdbaskdhkjsdkashd"
  }).then((value: any) => res.json(value)).catch((e: Error) => res.json(e))
})
//.post('/register', (req, res) => {
//   const { username, password } = req.body;
// }).post('/login', (req, res) => {

// }).post('/pay', (req, res) => {

// });

app.listen(3000, () => {
  console.log('server started');
});