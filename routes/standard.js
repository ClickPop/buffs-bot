const Bot = require('../db/models/schema');
const express = require('express');
const { validationResult, check } = require('express-validator');
const clients = require('../util/clients');
const router = express.Router();

// GET route to get the current bot status of the authenticated user
router.get('/status', async (req, res) => {
  const { twitch_userId } = req.userInfo;

  try {
    let bot = await Bot.findOne({ twitch_userId });

    if (!bot) {
      return res.status(404).json({ errors: 'No user found' });
    }
    const id = bot.id;
    let connection_status;
    if (bot.joined === true) {
      connection_status = clients.getReadyState(id);
    }
    return res.json({
      data: {
        bot: bot.id,
        joined: bot.joined,
        twitch_username: bot.twitch_username,
        twitch_userId: bot.twitch_userId,
        connection_status,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: JSON.stringify(err) } });
  }
});

// POST route to create a bot for authenticated user
router.post(
  '/create',
  [
    check('twitch_username', 'Invalid username').exists().isString,
    check('twitch_userId', 'Invalid user ID').exists().isString,
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
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
          clients.add(bot.id);
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

// PUT route to join or part a channel or update the username of the bot for the authenticated user
router.put(
  '/action',
  [
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

      if (!clients.getBot(bot.id)) {
        await clients.add(bot.id);
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

// DELETE route to remove the authenticated user's bot
router.delete('/delete', async (req, res) => {
  try {
    const { twitch_userId } = req.userInfo;

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
});

module.exports = router;
