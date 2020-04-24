require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { validationResult, check } = require('express-validator');
const tmi = require('./twitchBot');
const connectDB = require('./db');
const Bot = require('./schema');
const axios = require('axios');
const Hashids = require('hashids/cjs');
const hashids = new Hashids(process.env.SALT || ENV['SALT'], 32);
app = express();
app.use(bodyParser.json());
// app.use(authenticate);
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

const authenticate = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res
      .status(422)
      .json({ errors: { error: 'Missing or invalid authorization header' } });
  }

  try {
    const auth = hashids.decode(req.headers.authorization);

    const user = await Bot.findOne({ twitch_userId: auth });

    if (!user) {
      return res.status(422).json({
        errors: { error: 'Missing or invalid authorization header' },
      });
    }

    req.userInfo = {
      twitch_username: user.twitch_username,
      twitch_userId: user.twitch_userId,
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: err } });
  }
};

app.get('/', async (req, res) => {});

//GET route to get the status of all bots.
app.get('/status', authenticate, async (req, res) => {
  try {
    if (
      req.userInfo.twitch_userId !== '175840543' &&
      req.userInfo.twitch_userId !== '36859372' &&
      req.userInfo.twitch_userId !== '47810429'
    ) {
      return res.status(401).json({ errors: { error: 'Unauthorized' } });
    }
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
app.get('/status/:twitch_userId', authenticate, async (req, res) => {
  const { twitch_userId } = req.userInfo;

  if (twitch_userId !== req.params.twitch_userId) {
    return res.status(401).json({
      errors: { error: 'User ID does not match authorization token' },
    });
  }

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
    return res.json({ data: obj });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: JSON.stringify(err) } });
  }
});

// POST route to create a bot
app.post(
  '/create',
  // [
  //   check('twitch_username', 'No twitch username specified')
  //     .exists()
  //     .isString(),
  //   check('twitch_userId', 'No twitch user id specified').exists(),
  // ],
  authenticate,
  async (req, res) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(422).json({ errors: errors.array() });
    // }

    try {
      // const { twitch_username, twitch_userId } = req.body;
      const { twitch_username, twitch_userId } = req.userInfo;

      let bot = await Bot.findOne({ twitch_userId });

      if (bot) {
        return res.status(404).json({ errors: 'Bot already exists' });
      }

      bot = new Bot({
        twitch_username,
        twitch_userId,
      });

      await bot.save((err) => {
        if (!err) {
          res.json({
            data: {
              [bot.id]: {
                twitch_username: bot.twitch_username,
                twitch_userId: bot.twitch_userId,
                created: true,
              },
            },
          });
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

// PUT route to join or part a channel or update the username of a bot
app.put(
  '/action',
  authenticate,
  [
    // check('twitch_username', 'No twitch username specified')
    //   .exists()
    //   .isString(),
    // check('twitch_userId', 'No twitch user id specified').exists(),
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
      const { twitch_username, twitch_userId } = req.userInfo;
      const { action } = req.body;

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
          await clients[bot.id].join(twitch_username).then(async (data) => {
            bot.joined = true;
            await bot.save();
          });
          return res.json({
            data: {
              [bot.id]: {
                joined: bot.joined,
                twitch_username: bot.twitch_username,
                twitch_userId: bot.twitch_userId,
              },
            },
          });
        case 'part':
          await clients[bot.id].part(twitch_username).then(async (data) => {
            await clients[bot.id].disconnect();
            bot.joined = false;
            delete clients[bot.id];
            await bot.save();
          });
          return res.json({
            data: {
              [bot.id]: {
                joined: bot.joined,
                twitch_username: bot.twitch_username,
                twitch_userId: bot.twitch_userId,
              },
            },
          });
        case 'updateUsername':
          let username = bot.twitch_username;
          bot.twitch_username = twitch_username;
          await bot.save();
          return res.json({
            data: {
              [bot.id]: {
                old_username: username,
                new_username: bot.twitch_username,
                twitch_userId: bot.twitch_userId,
              },
            },
          });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

// DELETE route to remove a bot
app.delete(
  '/delete',
  authenticate,
  // [check('twitch_userId', 'No twitch user id specified').exists()],
  async (req, res) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(422).json({ errors: errors.array() });
    // }

    try {
      const { twitch_userId } = req.userInfo;

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
      await Bot.deleteOne({ _id: bot.id }, (err) => {
        if (!err) {
          res.json({
            data: {
              [bot.id]: {
                twitch_username: bot.twitch_username,
                twitch_userId: bot.twitch_userId,
                deleted: true,
              },
            },
          });
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

const PORT = process.env.PORT || ENV['PORT'] || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
