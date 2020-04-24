const isAdmin = (req, res, next) => {
  if (
    req.userInfo.twitch_userId === '175840543' ||
    req.userInfo.twitch_userId === '36859372' ||
    req.userInfo.twitch_userId === '47810429'
  ) {
    next();
  } else {
    return res.status(401).json({ error: { errors: 'Unauthorized' } });
  }
};

module.exports = isAdmin;
