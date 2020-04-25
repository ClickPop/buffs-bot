require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./db/db');
const Bot = require('./db/models/schema');
const authenticate = require('./middleware/authenticate');
const isAdmin = require('./middleware/isAdmin');
const reconnect = require('./util/reconnect');
const axios = require('axios');
app = express();
app.use(bodyParser.json());

//Connect to mongoDB
connectDB();

//Initialize and reconnect bots if server restarted
reconnect();

// //Home Route
app.get('/', (req, res) => {
  return res.json({
    data: {
      message: 'WELCOME TO THE BUFFS BOT API',
    },
  });
});
//Authentication Middleware
app.use(authenticate);
//Admin routes
app.use('/api/admin', isAdmin, require('./routes/admin'));
//Standard routes
app.use('/api', require('./routes/standard'));

//Error handling
app.use((res, req, next) => {
  next(createError(404));
});
app.use((err, req, res, next) => {
  res
    .status(err.status || 500)
    .json(
      { errors: { error: err } } || {
        errors: { error: 'A server error occurred' },
      }
    );
});

const PORT = process.env.PORT || ENV['PORT'] || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

//Call the heroku app every 10 minutes to keep it from sleeping
setInterval(async () => {
  await axios.get('http://buffsbot.herokuapp.com/');
}, 1000 * 60 * 10);
