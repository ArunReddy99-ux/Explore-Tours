const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Uncaught Error 💥💥💥 shutting down ');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    // console.log(con.connections);
    console.log('connection is suucessful');
  });
// console.log(app.get('env'));
// console.log(process.env);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
process.on('unhandledRejection', (err) => {
  const fullMessage = err.message;
  const errmsgStart = 0; // Start at the beginnning
  const newline = /\n/; // new line character
  const errmsgStop = fullMessage.search(newline); // Find new line
  const errmsgLen = errmsgStop - errmsgStart;
  const errorText = fullMessage.substr(errmsgStart, errmsgLen);
  console.log(`💥Error Name💥: ${err.name}`);
  console.log(`💥💥Error Text: ${errorText}`);
  // console.log(err.name, err.message);
  console.log('Unhandler  rejection 💥💥 shutting down....');
  server.close(() => process.exit(1));
});
