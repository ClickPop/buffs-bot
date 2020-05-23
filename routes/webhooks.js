const express = require('express');
const router = express.Router();
const clients = require('../util/clients');
const Bot = require('../db/models/Bot');
const Stream = require('../db/models/Stream');
const moment = require('moment');
const asyncForEach = require('../util/asyncForEach');

router.get('/:id', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.query['hub.mode']}d: ${req.params.id}`);
  }
  res.send(req.query['hub.challenge']);
});

router.post('/:id', async (req, res) => {
  const { data } = req.body;
  const twitch_userId = req.params.id;
  const bot = await Bot.findOne({ twitch_userId });
  if (!bot) {
    console.error('Bot does not exist');
    return res.send();
  }
  let client = await clients.getBot(bot.id);
  if (!client && bot.joined) {
    client = await clients.add(bot);
    await clients.join(bot.id, bot.twitch_username);
  }
  if (data.length < 1) {
    if (process.env.NODE_ENV !== 'production')
      console.log(`${bot.twitch_username} stopped streaming`);
    const stream = await Stream.findOne({ bot: bot.id }).sort({
      started_at: -1,
    });
    if (!stream) {
      console.error('Stream not found');
      return res.send();
    }
    stream.ended_at = moment().utc();
    await stream.save();
    clients.setStreamStatus(bot.id, false);
    return res.send();
  }
  data.forEach(async (item) => {
    const { id } = item;
    if (process.env.NODE_ENV !== 'production')
      console.log(`${bot.twitch_username} started streaming`);
    let stream = await Stream.findOne({ twitch_streamId: id });
    if (stream) {
      return res.send();
    }
    stream = new Stream({
      twitch_streamId: id,
      bot: bot.id,
      started_at: moment().utc(),
    });
    await stream.save();
    clients.setStreamStatus(bot.id, true);
  });
  return res.send();
});

module.exports = router;
