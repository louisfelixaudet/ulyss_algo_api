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
*/

import videoModel from "../modele/video_model.js";
import videoView from "../view/video_view.js";
import { predict, training as trainingRegression } from "#regressionLineaire";
import { weightScoreVideo } from "#config";
import { trainingNeuron } from "#neurone";
import { resultatsNeurone } from "#connaissance";
import TF_IDF, { getValueFinal, data as dataTFIDF, resetData } from "#tfidf";
import { combineText, newDataCat, vecterTab, getVideoContext } from "#sousCategorie";
import { video2Engagement, sortCommentaire } from "#engagement";

// ---------- sous-fonctions d'entrainement (appelees seulement par trainingAlgo) ----------

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

  const newWeight = trainingNeuron(xConnaissance, oldWeight.w, oldWeight.b, donneesConnaissance.resp);
  await videoModel.pushWeightNeurone(newWeight.w, newWeight.b);

  const axeConnaissance = resultatsNeurone(newWeight.w, newWeight.b, donneesConnaissance.videos);
  await videoModel.pushAxesConnaissance(axeConnaissance);
};

// knn : note les commentaires sans type puis axe engagement
const entrainerEngagement = async () => {
  // allCom: [idVideo, commentaire, type] (type undefined = pas encore note)
  const allCom = await videoModel.selectCom();
  const definedCom = allCom.filter(com => com[2] !== undefined);

  const newCom = sortCommentaire(allCom);
  await videoModel.modifyCommentaires(newCom);

  // knn dans video2Engagement lit [commentaire, type]
  const comTraining = [...definedCom, ...newCom].map(com => [com[1], com[2]]);
  const videos = await videoModel.selectAll();

  const axeEngagement = video2Engagement(videos, comTraining);
  await videoModel.pushAxesEngagement(axeEngagement);
};

// valeur d'un axe qui manque pour une video
const AXE_NEUTRE = 0.5;

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
  const axe = (tab, i) => (Number.isFinite(tab[i]) ? tab[i] : AXE_NEUTRE);
  const x = Array.from({ length: nbVideo }, (_, i) => [axe(sousCat, i), axe(engagement, i), axe(connaissance, i)]);
  const yScoreFige = x.map(scoreFige);

  // premier entrainement : pas encore de poids en bd
  const a = Array.isArray(oldWeight?.a) && oldWeight.a.length === 3 ? oldWeight.a : [0, 0, 0];
  const b = oldWeight?.b ?? 0;

  const newWeight = trainingRegression(a, x, b, yScoreFige, lr, epoques);
  await videoModel.pushWeightReg(newWeight.a, newWeight.b);
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

      // 3. predict the nexte nbNext video
      const nbNext = Number(res.locals.video.nb) || 10;
      const videos = await videoModel.selectAll();
      const userRegression = await videoModel.selectUserRegression(idUser);

      // x d'une video = [sousCat, engagement, connaissance] a la meme position i
      const videosPredites = videos
        .map((video, i) => ({
          ...video,
          score: predict(
            weightReg.a,
            [vecSousCat[i], vecEngagement[i], vecConnaissance[i]],
            weightReg.b
          ),
        }))
        .sort((v1, v2) => Math.abs(v1.score - userRegression) - Math.abs(v2.score - userRegression))
        .slice(0, nbNext);

      // 4. send the all the video predicted with the videoView
      res.json(videoView.collection(videosPredites));

      return true;

    } catch (err) {

      return res.status(500).json({ error: err.message });

    }
  },

  // tout est entraine en meme temps sur les nouvelles donnees pour que les axes restent alignes
  // ordre : sousCat en premier car connaissance lit les vecteurs video2vecter qu'il produit
  trainingAlgo: async (req, res) => {
    try {

      // 1. get the number of video
      const nbVideo = (await videoModel.selectAll(["id"])).length;

      // 2. training sousCategorie (word2vecter et tfidf)
      await entrainerSousCat();

      // 3. training connaissance (Neurone)
      await entrainerConnaissance(nbVideo);

      // 4. training engagement (KNN)
      await entrainerEngagement();

      // 5. training regression lineaire (sur le score fige des 3 axes)
      await entrainerRegression(nbVideo);

      return res.json(true);

    } catch (err) {

      return res.status(500).json({ error: err.message });

    }
  },
};

export default videoControlleur;
