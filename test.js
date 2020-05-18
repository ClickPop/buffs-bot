const axios = require('axios');

(async () => {
  let res = await axios.get('https://api.twitchinsights.net/v1/bots/online');
  let bots = res.data.bots;
  bots.forEach((bot) => {
    console.log(`'${bot[0]}', `);
  });
})();
