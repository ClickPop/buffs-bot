require('dotenv').config();
const Bot = require('../db/models/Bot');
const Hashids = require('hashids/cjs');
const axios = require('axios');
const hashids = new Hashids(process.env.SALT || ENV['SALT'], 32);
const getAccessToken = require('../util/getTwitchAccessToken');
let access_token;
(async () => {
  access_token = await getAccessToken();
})();

const authenticate = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res
      .status(401)
      .json({ errors: { error: 'Missing or invalid authorization header' } });
  }

  try {
    const auth = hashids.decode(req.headers.authorization)[0];
    if (!auth) {
      return res
        .status(401)
        .json({ error: { errors: 'Missing or invalid authorization header' } });
    }
    if (!req.path.includes('create')) {
      const user = await Bot.findOne({ twitch_userId: auth });

      if (!user) {
        return res.status(404).json({
          errors: { error: 'Bot does not exist' },
        });
      }
      req.auth = auth.toString();
      req.userInfo = {
        twitch_username: user.twitch_username,
        twitch_userId: user.twitch_userId,
      };
    } else {
      const twitch = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          authorization: `Bearer ${access_token}`,
          'Client-ID': process.env.BUFFS_CLIENT_ID || ENV['BUFFS_CLIENT_ID'],
        },
        params: {
          login: req.body.twitch_username,
        },
      });

      const twitch_userId = twitch.data.data[0].id;
      const twitch_username = twitch.data.data[0].login;
      if (twitch_userId !== req.body.twitch_userId) {
        return res.status(422).json({
          errors: { error: 'Invalid twitch ID and username combination' },
        });
      }
      req.auth = auth.toString();
      req.userInfo = {
        twitch_userId,
        twitch_username,
      };
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: { error: err } });
  }
};

module.exports = authenticate;
