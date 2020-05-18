const axios = require('axios');

module.exports = getAccessToken = async () => {
  const token = new Promise(async (resolve, reject) => {
    try {
      const res = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${
          process.env.BUFFS_CLIENT_ID || ENV['BUFFS_CLIENT_ID']
        }&client_secret=${
          process.env.BUFFS_CLIENT_SECRET || ENV['BUFFS_CLIENT_SECRET']
        }&grant_type=client_credentials`
      );
      resolve(res.data.access_token);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
  return token;
};
