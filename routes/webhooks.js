const express = require('express');
const router = express.Router();
const clients = require('../util/clients');
const Bot = require('../db/models/Bot');
const Stream = require('../db/models/Stream');
const moment = require('moment');

router.get('/:id', (req, res) => {
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
  }
  if (data.length < 1) {
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
    let stream = await Stream({ twitch_streamId: id });
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
