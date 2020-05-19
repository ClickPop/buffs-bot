const Bot = require('../db/models/Bot');
const View = require('../db/models/View');
const Stream = require('../db/models/Stream');
const express = require('express');
const clients = require('../util/clients');
const { validationResult, check } = require('express-validator');
const moment = require('moment');
const router = express.Router();

//GET route to get the status of all bots.
router.get('/status', async (req, res) => {
  try {
    const botsData = await Bot.find();
    const bots = botsData.map((bot) => {
      return {
        bot: bot.id,
        joined: bot.joined,
        twitch_username: bot.twitch_username,
        twitch_userId: bot.twitch_userId,
      };
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

// GET route to get the current status of the specified bot
router.get('/status/:twitch_userId', async (req, res) => {
  const { twitch_userId } = req.params;

  try {
    let bot = await Bot.findOne({ twitch_userId });

    if (!bot) {
      return res.status(404).json({ errors: 'No user found' });
    }
    console.log(clients.getStreamStatus(bot.id));
    return res.json({
      data: {
        bot: bot.id,
        joined: bot.joined,
        twitch_username: bot.twitch_username,
        twitch_userId: bot.twitch_userId,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: JSON.stringify(err) } });
  }
});

// POST route to create a bot for specified user credentials
router.post(
  '/create',
  [
    check('twitch_username', 'Invalid username').exists().isString(),
    check('twitch_userId', 'Invalid user ID').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.mapped() });
    }

    try {
      const { twitch_username, twitch_userId } = req.body;

      if (twitch_userId !== req.userInfo.twitch_userId) {
        return req.status(422).json({
          errors: { error: 'Invalid Twitch ID/Username combination' },
        });
      }

      let bot = await Bot.findOne({ twitch_userId });

      if (bot) {
        return res.status(404).json({ errors: 'Bot already exists' });
      }

      bot = new Bot({
        twitch_username,
        twitch_userId,
      });
      await bot.save(async (err) => {
        if (!err) {
          await clients.add(bot);
          res.json({
            data: {
              bot: bot.id,
              twitch_username: bot.twitch_username,
              twitch_userId: bot.twitch_userId,
              created: true,
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

// PUT route to join or part a channel or update the username of a bot with specified user credentials
router.put(
  '/action',
  [
    check('twitch_username', 'Invalid username').exists().isString(),
    check('twitch_userId', 'Invalid user ID').exists(),
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
      return res.status(422).json({ errors: errors.mapped() });
    }
    try {
      const { twitch_username, twitch_userId, action } = req.body;

      let bot = await Bot.findOne({ twitch_userId });

      if (!bot) {
        return res.status(404).json({ errors: 'No bot found' });
      }

      if (!clients.getBot(bot.id)) {
        await clients.add(bot);
      }

      if (action === 'part' && bot.joined !== true) {
        return res.status(422).json({ errors: 'Already parted.' });
      } else if (action === 'join' && bot.joined !== false) {
        return res.status(422).json({ errors: 'Already joined.' });
      }

      switch (action) {
        case 'join':
          await clients.join(bot.id, twitch_username);
          bot.joined = true;
          await bot.save();
          return res.json({
            data: {
              bot: bot.id,
              joined: bot.joined,
              twitch_username: bot.twitch_username,
              twitch_userId: bot.twitch_userId,
            },
          });
        case 'part':
          await clients.part(bot.id, twitch_username);
          await clients.remove(bot.id);
          bot.joined = false;
          await bot.save();
          return res.json({
            data: {
              bot: bot.id,
              joined: bot.joined,
              twitch_username: bot.twitch_username,
              twitch_userId: bot.twitch_userId,
            },
          });
        case 'updateUsername':
          let username = bot.twitch_username;
          bot.twitch_username = twitch_username;
          await bot.save();
          return res.json({
            data: {
              bot: bot.id,
              old_username: username,
              new_username: bot.twitch_username,
              twitch_userId: bot.twitch_userId,
            },
          });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ errors: { error: JSON.stringify(err) } });
    }
  }
);

// DELETE route to remove a bot with specified user credentials
router.delete(
  '/delete',
  [check('twitch_userId', 'Invalid user ID').exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.mapped() });
    }
    try {
      const { twitch_userId } = req.body;

      let bot = await Bot.findOne({ twitch_userId });

      if (!bot) {
        return res.status(404).json({ errors: 'No user found' });
      }
      if (bot.joined === true || clients.getBot(bot.id)) {
        await clients.part(bot.id, bot.twitch_username);
        await clients.remove(bot.id);
      }
      await Bot.deleteOne({ _id: bot.id }, (err) => {
        if (!err) {
          res.json({
            data: {
              bot: bot.id,
              twitch_username: bot.twitch_username,
              twitch_userId: bot.twitch_userId,
              deleted: true,
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

router.get('/views', async (req, res) => {
  const { twitch_userIds } = req.query;
  let stream_count = 0;
  let totalViews = [];
  let bots = await Bot.find({
    twitch_userId: {
      $in: twitch_userIds.split(',').map((item) => {
        return item.trim();
      }),
    },
  });
  if (!bots) {
    return res.status(404).json({ errors: 'No bot found' });
  }
  const { from, to } = req.query;
  await asyncForEach(bots, async (bot) => {
    const query = {
      bot: bot.id,
    };
    if (from || to) {
      query.started_at = {};
      if (from) query.started_at.$gte = moment(from).utc().format();
      if (to) query.started_at.$lte = moment(to).utc().format();
    }
    streams = await Stream.find(query);
    if (!streams) return res.status(404).json({ errors: 'No streams found' });
    stream_count += streams.length;
    console.log(streams);
    await asyncForEach(streams, async (stream) => {
      let views = await View.find({ stream: stream.id });
      totalViews.push({
        stream,
        view_count: views.length,
        views,
      });
    });
  });
  return res.json({ stream_count, streams: totalViews });
});

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = router;
