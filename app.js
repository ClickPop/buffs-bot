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
app.use(authenticate);

//Connect to mongoDB
connectDB();

//Initialize and reconnect bots if server restarted
reconnect();

//Call the heroku app every 10 minutes to keep it from sleeping
setInterval(() => {
  axios.get('http://buffsbot.herokuapp.com/');
}, 1000 * 60 * 10);

app.use('/', (req, res) => {
  res.json({
    data: {
      message: 'WELCOME TO THE BUFFS BOT API',
    },
  });
});
app.use('/api/admin', isAdmin, require('./routes/admin'));
app.use('/api', require('./routes/standard'));

app.use((res, req, next) => {
  next(createError(404));
});
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  // render the error page
  res.status(err.status || 500);
  if (err.status === 404) {
    res.json(err);
  } else {
    res.json({ error: 'An error occurred' });
  }
});

const PORT = process.env.PORT || ENV['PORT'] || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
