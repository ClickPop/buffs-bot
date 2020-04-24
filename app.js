require('dotenv').config();
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

//Call the heroku app every 10 minutes to keep it from sleeping
setInterval(() => {
  axios.get('http://buffsbot.herokuapp.com/status');
}, 1000 * 60 * 10);

app.use('/api/admin', authenticate, isAdmin, require('./routes/admin'));
app.use('/api', authenticate, require('./routes/standard'));

const PORT = process.env.PORT || ENV['PORT'] || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
