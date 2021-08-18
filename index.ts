import * as express from 'express';
import { Request, Response } from 'express';
const app = express();

const Database = require("@replit/database")
const db = new Database()

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api', require('./account/router'));
app.use('/api', require('./payment/router'));

app.listen(3000, () => {
  console.log('server started');
});