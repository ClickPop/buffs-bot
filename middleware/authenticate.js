require('dotenv').config();
const Bot = require('../db/models/schema');
const Hashids = require('hashids/cjs');
const hashids = new Hashids(process.env.SALT || ENV['SALT'], 32);

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

module.exports = authenticate;
