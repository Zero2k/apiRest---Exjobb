import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import db from './utils/db';
import apiRoutes from './modules';

const createServer = async () => {
  const app = express();

  const PORT = process.env.PORT || 3000;

  app.set('json spaces', 4);

  app.use(cors('*'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  apiRoutes(app);

  app.get('*', (req, res) => res.status(200).send({
    message: 'Welcome to the default route',
  }));

  await db();

  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
  });
};

createServer();
