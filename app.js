require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { validationResult, check } = require('express-validator');
const tmi = require('./twitchBot');
const connectDB = require('./db');
const Bot = require('./schema');
const axios = require('axios');
app = express();
app.use(bodyParser.json());
connectDB();
const clients = [];

// Function to load all joined entries from the database into memory
// and instantiate a tmi object for each then join the user channel
(async function (error) {
  if (error) {
    console.error('Reconnecting bots...');
  }
  let bots = await Bot.find();
  bots.forEach(async (bot, index) => {
    if (bot.joined === true) {
      clients[bot.id] = await tmi();
    }
  });
})();

// Call the heroku app every 10 minutes to keep it from sleeping
setInterval(() => {
  axios.get('http://buffsbot.herokuapp.com/status');
}, 1000 * 60 * 10);

//GET route to get the status of all bots.
app.get('/status', async (req, res) => {
  try {
    const botsData = await Bot.find();
    const bots = botsData.map((bot) => {
      const id = bot.id;
      let connection_status;
      if (bot.joined === true) {
        connection_status = clients[id].readyState();
      }
      const obj = new Object();
      obj[id] = {
        joined: bot.joined,
        twitch_username: bot.twitch_username,
        twitch_userId: bot.twitch_userId,
        connection_status,
      };
      return obj;
    });
    return res.json({
      data: {
        bots,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: JSON.stringify(err) } });
  }
});

// GET route to get the current status of a bot
app.get('/status/:twitch_userId', async (req, res) => {
  const { twitch_userId } = req.params;
  try {
    let bot = await Bot.findOne({ twitch_userId });

    if (!bot) {
      return res.status(404).json({ errors: 'No user found' });
    }
    const id = bot.id;
    let connection_status;
    if (bot.joined === true) {
      connection_status = clients[id].readyState();
    }
    const obj = new Object();
    obj[id] = {
      joined: bot.joined,
      twitch_username: bot.twitch_username,
      twitch_userId: bot.twitch_userId,
      connection_status,
    };
    return res.json({ data: { bot: obj } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: JSON.stringify(err) } });
  }
});

// POST route to create a bot
app.post(
  '/create',
  [
    check('twitch_username', 'No twitch username specified')
      .exists()
      .isString(),
    check('twitch_userId', 'No twitch user id specified').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { twitch_username, twitch_userId } = req.body;

      let bot = await Bot.findOne({ twitch_userId });

      if (bot) {
        return res.status(404).json({ errors: 'Bot already exists' });
      }

      bot = new Bot({
        twitch_username,
        twitch_userId,
      });

      await bot.save();

      return res.json({ data: { bot, created: true } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

// PUT route to join or part a channel or update the username of a bot
app.put(
  '/',
  [
    check('twitch_username', 'No twitch username specified')
      .exists()
      .isString(),
    check('twitch_userId', 'No twitch user id specified').exists(),
    check('action', 'Invalid action specified')
      .exists()
      .isString()
      .custom(
        (value) =>
          value === 'join' || value === 'part' || value === 'updateUsername'
      ),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { twitch_username, twitch_userId, action } = req.body;

      let bot = await Bot.findOne({ twitch_userId });

      if (!bot) {
        return res.status(404).json({ errors: 'No bot found' });
      }

      if (!clients[bot.id]) {
        clients[bot.id] = await tmi();
      }

      if (action === 'part' && bot.joined !== true) {
        return res.status(422).json({ errors: 'Already parted.' });
      } else if (action === 'join' && bot.joined !== false) {
        return res.status(422).json({ errors: 'Already joined.' });
      }

      switch (action) {
        case 'join':
          await clients[bot.id].join(twitch_username);
          bot.joined = true;
          await bot.save();
          return res.json({ data: bot });
        case 'part':
          await clients[bot.id].part(twitch_username);
          await clients[bot.id].disconnect();
          bot.joined = false;
          delete clients[bot.id];
          await bot.save();
          return res.json({ data: bot });
        case 'updateUsername':
          bot.twitch_username = twitch_username;
          await bot.save();
          return res.json({ data: bot });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

// DELETE route to remove a bot
app.delete(
  '/',
  [check('twitch_userId', 'No twitch user id specified').exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { twitch_userId } = req.body;

      let bot = await Bot.findOne({ twitch_userId });

      if (!bot) {
        return res.status(404).json({ errors: 'No user found' });
      }
      if (bot.joined === true) {
        await clients[bot.id].part(twitch_username);
        bot.joined = false;
        await bot.save();
      }
      delete clients[bot.id];
      await Bot.deleteOne({ _id: bot.id });
      res.json({ data: { bot, deleted: true } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
