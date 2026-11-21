
const userId = (req, res, next) => {
  const id = req.headers["x-user-id"];

  if (!id) {
    return res.status(401).json({ error: "x-user-id manquant" });
  }

  req.user = { id };

  return next();
};

export default userId;
