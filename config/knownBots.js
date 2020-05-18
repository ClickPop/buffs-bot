const axios = require('axios');
let knownBots = ['nightbot', 'streamelements'];
(async () => {
  let res = await axios.get('https://api.twitchinsights.net/v1/bots/online');
  let bots = res.data.bots;
  bots.forEach((bot) => {
    knownBots.push(bot[0]);
  });
})();
module.exports = knownBots;
