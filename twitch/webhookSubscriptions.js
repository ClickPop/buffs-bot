require('dotenv').config();
const axios = require('axios');

const subscribeToWebhook = (twitch_userId, access_token) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.post(
        'https://api.twitch.tv/helix/webhooks/hub',
        {
          'hub.callback':
            process.env.STREAM_SUBSCRIPTION_CALLBACK ||
            ENV['STREAM_SUBSCRIPTION_CALLBACK'],
          'hub.mode': 'subscribe',
          'hub.topic': `https://api.twitch.tv/helix/stream?user_id=${twitch_userId}`,
          'hub.lease_seconds': 864000,
          'hub.secret': process.env.SALT || ENV['SALT'],
        },
        {
          headers: {
            'Client-ID': process.env.BUFFS_CLIENT_ID || ENV['BUFFS_CLIENT_ID'],
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      resolve(res.status);
    } catch (err) {
      console.error(err.response.data);
      reject(err);
    }
  });
};

const unsubscribeFromWebhook = async (twitch_userId, access_token) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.post(
        'https://api.twitch.tv/helix/webhooks/hub',
        {
          'hub.callback':
            process.env.STREAM_SUBSCRIPTION_CALLBACK ||
            ENV['STREAM_SUBSCRIPTION_CALLBACK'],
          'hub.mode': 'unsubscribe',
          'hub.topic': `https://api.twitch.tv/helix/stream?user_id=${twitch_userId}`,
          'hub.lease_seconds': 864000,
          'hub.secret': process.env.SALT || ENV['SALT'],
        },
        {
          headers: {
            'Client-ID': process.env.BUFFS_CLIENT_ID || ENV['BUFFS_CLIENT_ID'],
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      resolve(res.status);
    } catch (err) {
      console.error(err.response.data);
      reject(err);
    }
  });
};

const resubscribeToWebhooks = (access_token) => {
  return new Promise(async (resolve, reject) => {
    try {
      res = await axios.get(
        'https://api.twitch.tv/helix/webhooks/subscriptions',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Client-ID': process.env.BUFFS_CLIENT_ID || ENV['BUFFS_CLIENT_ID'],
          },
        }
      );
      const { data } = res.data;
      data.forEach((item, index) => {
        const user_id = item.topic.slice(item.topic.indexOf('user_id=') + 8);
        subscribeToWebhook(user_id, access_token);
        unsubscribeFromWebhook(user_id, access_token);
      });
      resolve(data);
    } catch (err) {
      console.error(err.response);
      reject(err);
    }
  });
};

module.exports = {
  subscribeToWebhook,
  unsubscribeFromWebhook,
  resubscribeToWebhooks,
};
