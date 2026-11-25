
// lit les parametres de la requete et les met dans res.locals
// res.locals.user.id  : id de l'utilisateur (/:id ou ?id=)
// res.locals.user.likes : id des videos aimees par l'utilisateur (?likes=1,5,9)
// res.locals.video.nb : nombre de videos a envoyer (?nbNext=)
const locals = (req, res, next) => {
  const params = req.params ?? {};
  const query = req.query ?? {};

  const id = params.id ?? query.id;
  const nb = Number(query.nbNext);
  const likes = String(query.likes ?? "").split(",").map(Number).filter(n => Number.isInteger(n) && n > 0);

  res.locals.user = { ...res.locals.user };
  res.locals.video = { ...res.locals.video };

  if (id !== undefined) {
    res.locals.user.id = id;
  }

  res.locals.user.likes = likes;

  if (Number.isInteger(nb) && nb > 0) {
    res.locals.video.nb = nb;
  }

  return next();
};

export default locals;
