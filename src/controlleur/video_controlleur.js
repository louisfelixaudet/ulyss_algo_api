/*
    ici on creer un object js qui va posseder les fonctions qui seront appeler au routeur (fait des fonctions flechers)


    chaque * ... * separe les fonctions entre elle

    chaque ! ... ! est un commentaire pour moi ny touche pas

    *

        precondition: chaque axes doivent avoir la meme longueur

        predictVideo (req, res)

        steps:
        1. get the vecteur of each axes
        2. get  the weight of regression lineaire
        3. predict the nexte nbNext video
        4. send the all the video predicted with the videoView

    *

    !
        1. get the vecteur of preference of the user
        2. get the weight of every algo if they need them liste of algo with weight (regression, neuronne)
        3. get the table of every algo if they need them liste of algo with tab (word2vect, TF_IDF(3 tab))
        4. get all the comment
        5. get all the video by there subject
    !

    *
        trainingAlgo (req, res)

        1. get the number of video

        2. training connaissance (Neurone)
          - get the old weight of the neuronnes (training)
          - get tous les donnees de connaissance
          - verifie the length of the array of video
          - trainer avec la fonction training de neuronne
          - push the new weight a and b
          - create new array with resultatsNeurone with the new data
          - push the axe

        3. training sousCategorie (word2vecter et tfidf)
          - get all text data 
          - traine tf
          - traine idf
          - send tf
          - send idf
          - traine tfidf
          - send tfidf
          - traine tabVecteur with vecterTab(dataImp)
          - send w1
          - create new array with getVideoContext with the new data
          - push the map

        4. training engagement (KNN)
          - get commentaire that dnot have a notation good or bad
          - get commentaire that have a notation 
          - traine each commentaire that dont have a good or bad notation on the other commentaire
          - modifier les commentaires des video dans la bd
          - create new array with video2Engagement with the new data
          - push the axe

    *
        pullNewVideo (req, res)

        1. get the date of the last pull
        2. fetch the new videos from api_ulys (newvideo/:date)
        3. push the videos, the comments and the quizz
        4. update the metadata of all the videos (meta)
        5. hide the videos deleted or private (syncVisibility)
        6. push the date of this pull
        7. training

    *
        syncVideo (req, res)

        1. fetch the id of the visible videos from api_ulys (visibles)
        2. hide the others: not predicted but still used for the training

    *
*/

import videoModel, { valeurAxe } from "../modele/video_model.js";
import videoView from "../view/video_view.js";
import { predict, training as trainingRegression } from "#regressionLineaire";
import { weightScoreVideo } from "#config";
import { trainingNeuron } from "#neurone";
import { resultatsNeurone } from "#connaissance";
import TF_IDF, { getValueFinal, data as dataTFIDF, resetData } from "#tfidf";
import { combineText, newDataCat, vecterTab, getVideoContext } from "#sousCategorie";
import { video2Engagement, sortCommentaire } from "#engagement";

// ---------- sous-fonctions d'entrainement (appelees seulement par entrainerTout) ----------

// tfidf -> word2vecter -> vecteur de chaque video (video2vecter)
const entrainerSousCat = async () => {
  const textes = await videoModel.selectAll(["desc", "title", "titleQuizz", "questQuizz"]);

  // TF_IDF reconstruit TF et IDF a chaque appel, la derniere matrice contient tous les documents
  // on vide d'abord les donnees du dernier entrainement sinon les videos seraient comptees en double
  resetData();
  let matriceTFIDF;
  textes.forEach(doc => {
    matriceTFIDF = TF_IDF(combineText(doc.desc, doc.title, doc.titleQuizz, doc.questQuizz));
  });

  await videoModel.pushTF(dataTFIDF.dictWordTF);
  await videoModel.pushIDF(dataTFIDF.dictWordIDF);
  await videoModel.pushTFIDF(matriceTFIDF);

  const dataImp = newDataCat(textes, getValueFinal(matriceTFIDF));

  const { W1, index } = vecterTab(dataImp);

  // pas assez de textes : aucun mot n'est assez frequent pour avoir un vecteur
  if (W1.length === 0) return;

  await videoModel.pushWord2Vect(W1);

  const contextVideo = getVideoContext(dataImp, W1, index);
  await videoModel.pushContextVideo(contextVideo);
};

// neurone : nouveaux poids puis axe connaissance
const entrainerConnaissance = async (nbVideo) => {
  const oldWeight = await videoModel.selectWeightneurone("training");
  // { videos: [{ difTeacher, difTeacherOpinion, tauxReussiteQuizz, videoSimResalt }], resp: [...] }
  const donneesConnaissance = await videoModel.selectDonneesConnaissance();

  if (donneesConnaissance.videos.length !== nbVideo) {
    throw new Error("connaissance: le nombre de videos ne correspond pas");
  }

  const xConnaissance = donneesConnaissance.videos.map(video => [
    video.difTeacher,
    video.difTeacherOpinion,
    video.tauxReussiteQuizz,
    video.videoSimResalt,
  ]);

  // premier entrainement : pas encore de poids en bd (un poids par entree)
  const w = oldWeight?.w?.length === 4 ? oldWeight.w : [0, 0, 0, 0];
  const b = oldWeight?.b ?? 0;

  const newWeight = trainingNeuron(xConnaissance, w, b, donneesConnaissance.resp);
  await videoModel.pushWeightNeurone(newWeight.w, newWeight.b);

  const axeConnaissance = resultatsNeurone(newWeight.w, newWeight.b, donneesConnaissance.videos);
  await videoModel.pushAxesConnaissance(axeConnaissance);
};

// knn : note les commentaires sans type puis axe engagement
const entrainerEngagement = async () => {
  // allCom: [idVideo, commentaire, note, idcom] (note undefined = pas encore note)
  const allCom = await videoModel.selectCom();
  const definedCom = allCom.filter(com => com[2] !== undefined);
  const undefinedCom = allCom.filter(com => com[2] === undefined);

  // sortCommentaire garde l'ordre de undefinedCom (note null = aucun commentaire note pour comparer)
  const newCom = sortCommentaire(allCom)
    .map(([idVideo, texte, note], i) => [idVideo, texte, note, undefinedCom[i][3]])
    .filter(com => com[2] !== null);

  await Promise.all(newCom.map(([idVideo, , note, idcom]) =>
    videoModel.modifyTypeCommentaires(idcom, idVideo, note === 1 ? "positif" : "negatif")
  ));

  // knn dans video2Engagement lit [commentaire, type]
  const comTraining = [...definedCom, ...newCom].map(com => [com[1], com[2]]);
  const videos = await videoModel.selectVideosEngagement();

  const axeEngagement = video2Engagement(videos, comTraining);
  await videoModel.pushAxesEngagement(axeEngagement);
};

// score fige d'une video : combinaison fixe de ses 3 axes, ce n'est pas un entrainement
const scoreFige = ([sousCat, engagement, connaissance]) =>
  sousCat * weightScoreVideo.SOUSCAT +
  engagement * weightScoreVideo.ENGAGEMENT +
  connaissance * weightScoreVideo.CONNAISSANCE;

// regression : apprend a reproduire le score fige a partir des 3 axes (a lancer apres les 3 axes)
const entrainerRegression = async (nbVideo, lr = 0.5, epoques = 500) => {
  const [sousCat, engagement, connaissance, oldWeight] = await Promise.all([
    videoModel.selectSousCat(),
    videoModel.selectEngagement(),
    videoModel.selectConnaissance(),
    videoModel.selectWeightreg("training"),
  ]);

  // x d'une video = [sousCat, engagement, connaissance] a la meme position i
  const x = Array.from({ length: nbVideo }, (_, i) => [valeurAxe(sousCat, i), valeurAxe(engagement, i), valeurAxe(connaissance, i)]);
  const yScoreFige = x.map(scoreFige);

  // premier entrainement : pas encore de poids en bd
  const a = Array.isArray(oldWeight?.a) && oldWeight.a.length === 3 ? oldWeight.a : [0, 0, 0];
  const b = oldWeight?.b ?? 0;

  const newWeight = trainingRegression(a, x, b, yScoreFige, lr, epoques);
  await videoModel.pushWeightReg(newWeight.a, newWeight.b);
};

// un seul entrainement a la fois : TF_IDF garde ses donnees dans un etat partage
let entrainementEnCours = false;

// tout est entraine en meme temps sur les nouvelles donnees pour que les axes restent alignes
// ordre : sousCat en premier car connaissance lit les vecteurs video2vecter qu'il produit
const entrainerTout = async () => {
  if (entrainementEnCours) throw new Error("un entrainement est deja en cours");
  entrainementEnCours = true;

  try {

    // 1. get the number of video
    const nbVideo = (await videoModel.selectAll(["id"])).length;
    if (nbVideo === 0) throw new Error("aucune video pour l'entrainement");

    // 2. training sousCategorie (word2vecter et tfidf)
    await entrainerSousCat();

    // 3. training connaissance (Neurone)
    await entrainerConnaissance(nbVideo);

    // 4. training engagement (KNN)
    await entrainerEngagement();

    // 5. training regression lineaire (sur le score fige des 3 axes)
    await entrainerRegression(nbVideo);

    // 6. tout a reussi : la prediction utilise les nouveaux poids
    await videoModel.pushWeightPrediction();

  } finally {
    entrainementEnCours = false;
  }
};

// ---------- sous-fonctions du pull et de la synchronisation avec api_ulys ----------

const ULYS_API_URL = process.env.ULYS_API_URL ?? "http://localhost:3001/api/videos";
const TIMEOUT_ULYS = 10000; // ms

// GET sur api_ulys, la reponse doit etre une liste
const fetchListe = async (chemin) => {
  const reponse = await fetch(`${ULYS_API_URL}${chemin}`, {
    signal: AbortSignal.timeout(TIMEOUT_ULYS),
  });

  if (!reponse.ok) throw new Error(`api_ulys a repondu ${reponse.status}`);

  const liste = await reponse.json();
  if (!Array.isArray(liste)) throw new Error("api_ulys doit renvoyer une liste");

  return liste;
};

const fetchNewVideo = (date) => fetchListe(`/newvideo/${encodeURIComponent(date.toISOString())}`);

// cache les videos supprimees ou privees, remontre celles qui sont de nouveau publiques
const faireSync = async () => {
  const idsVisibles = await fetchListe("/visibles");
  if (!idsVisibles.every(Number.isInteger)) throw new Error("api_ulys doit renvoyer une liste d'id");

  await videoModel.syncVisibility(idsVisibles);
};

// une synchronisation a la fois : une vieille liste ne doit pas s'ecrire par-dessus une plus recente
let derniereSync = Promise.resolve();

export const syncVisibilite = () => {
  derniereSync = derniereSync.catch(() => {}).then(faireSync);
  return derniereSync;
};

// commentaires de api_ulys -> format de pushCommentaires
const comsUlys = (comments) => (comments ?? []).map(com => ({
  idcom: com.id_comment,
  iduser: com.id_user,
  commentaire: com.content,
}));

// compteurs, resultats des quizz et commentaires a jour de toutes les videos
const faireMeta = async () => {
  const metas = await fetchListe("/meta");

  await videoModel.pushMeta(metas.map(m => ({
    id: m.id_video,
    view: Number(m.view_count ?? 0),
    like: Number(m.like_count ?? 0),
    com: Number(m.comment_count ?? 0),
    partage: Number(m.share_count ?? 0),
    tauxReussite: m.taux_reussite ?? null,
    questions: (m.questions ?? []).map(q => ({
      idquestion: q.id_question,
      montrer: q.montrer,
      repondu: q.repondu,
    })),
  })));

  for (const m of metas) {
    await videoModel.pushCommentaires(m.id_video, comsUlys(m.comments));
  }
};

// video de api_ulys -> bd (meme format que GET /api/videos : compteurs + comments + quiz)
const pushVideoUlys = async (v) => {
  const questions = v.quiz?.questions ?? [];

  await videoModel.pushVideo({
    id: v.id_video,
    titre: v.title,
    description: v.caption ?? "",
    titreQuizz: v.quiz?.title ?? "",
    questionQuizz: questions.map(q => q.question_text).join(" "),
    categorie: v.id_category ?? undefined,
    like: Number(v.like_count ?? 0),
    view: Number(v.view_count ?? 0),
    com: Number(v.comment_count ?? 0),
    partage: Number(v.share_count ?? 0),
    idteacher: v.id_user,
    created_at: v.created_at,
    visibility: Boolean(v.visibility ?? true),
  });

  await videoModel.pushCommentaires(v.id_video, comsUlys(v.comments));

  if (v.quiz) {
    await videoModel.pushQuizz(v.id_video, v.quiz.id_quiz, questions.map(q => ({
      idquestion: q.id_question,
      question: {
        question: q.question_text,
        ...Object.fromEntries((q.options ?? []).map(o => [String(o.id_option), o.option_text])),
      },
      response: (q.options ?? []).find(o => o.is_correct)?.id_option ?? 0,
    })));
  }
};

const videoControlleur = {
  // precondition: chaque axes doivent avoir la meme longueur
  predictVideo: async (req, res) => {
    try {

      const idUser = res.locals.user?.id || 0;

      if (!idUser) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // 1. get the vecteur of each axes
      const vecSousCat = await videoModel.selectSousCat();
      const vecEngagement = await videoModel.selectEngagement();
      const vecConnaissance = await videoModel.selectConnaissance();

      // 2. get the weight of regression lineaire
      const weightReg = await videoModel.selectWeightreg();

      if (!weightReg) {
        return res.status(503).json({ error: "le modele n'est pas encore entraine" });
      }

      // 3. predict the nexte nbNext video
      const nbNext = Number(res.locals.video.nb) || 10;
      const videos = await videoModel.selectAll();
      const userRegression = await videoModel.selectUserRegression(idUser, res.locals.user.likes);

      // x d'une video = [sousCat, engagement, connaissance] a la meme position i
      const videosPredites = videos
        .map((video, i) => ({
          ...video,
          score: predict(
            weightReg.a,
            [valeurAxe(vecSousCat, i), valeurAxe(vecEngagement, i), valeurAxe(vecConnaissance, i)],
            weightReg.b
          ),
        }))
        .sort((v1, v2) => Math.abs(v1.score - userRegression) - Math.abs(v2.score - userRegression))
        // seulement apres le map : la position i doit rester celle des axes
        .filter(video => video.visibility !== false)
        .slice(0, nbNext);

      // 4. send the all the video predicted with the videoView
      res.json(videoView.collection(videosPredites));

      return true;

    } catch (err) {

      return res.status(500).json({ error: err.message });

    }
  },

  trainingAlgo: async (req, res) => {
    try {

      await entrainerTout();

      return res.json(true);

    } catch (err) {

      return res.status(500).json({ error: err.message });

    }
  },

  // va chercher les nouvelles videos de api_ulys puis entraine le modele
  pullNewVideo: async (req, res) => {
    let nbAjout = 0;

    try {

      // 1. get the date of the last pull (premiere fois : toutes les videos)
      // date prise avant le fetch et a la seconde pres (precision des dates MySQL) pour ne manquer aucune video
      const debut = new Date();
      debut.setMilliseconds(0);
      const dernierPull = (await videoModel.selectLastPull()) ?? new Date(0);

      // 2. fetch the new videos
      let videos;
      try {
        videos = await fetchNewVideo(dernierPull);
      } catch (err) {
        return res.status(502).json({ error: `api_ulys: ${err.message}` });
      }

      // 3. push the videos, the comments and the quizz
      for (const v of videos) {
        await pushVideoUlys(v);
        nbAjout++;
      }

      // 4. et 5. metadonnees a jour puis videos cachees (apres le push : une video a pu changer pendant le pull)
      try {
        await faireMeta();
        await syncVisibilite();
      } catch (err) {
        return res.status(502).json({ error: `api_ulys: ${err.message}`, nbVideo: nbAjout });
      }

      // 6. push the date, seulement si toutes les videos sont en bd
      await videoModel.pushLastPull(debut);

      // 7. training, seulement s'il y a du nouveau
      if (nbAjout > 0) await entrainerTout();

      return res.json({ nbVideo: nbAjout, entraine: nbAjout > 0 });

    } catch (err) {

      return res.status(500).json({ error: err.message, nbVideo: nbAjout });

    }
  },

  // appele par api_ulys quand une video est supprimee, cachee ou remontree
  syncVideo: async (req, res) => {
    try {

      await syncVisibilite();

      return res.json(true);

    } catch (err) {

      return res.status(502).json({ error: `api_ulys: ${err.message}` });

    }
  },
};

export default videoControlleur;
