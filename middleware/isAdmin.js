const isAdmin = (req, res, next) => {
  if (
    req.auth === '175840543' ||
    req.auth === '36859372' ||
    req.auth === '47810429'
  ) {
    req.admin = true;
    next();
  } else {
    return res.status(401).json({ error: { errors: 'Unauthorized' } });
  }
};

module.exports = isAdmin;
