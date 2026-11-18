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
import { predict } from "#regressionLineaire";
import { trainingNeuron } from "#neurone";
import { resultatsNeurone } from "#connaissance";
import TF_IDF, { getValueFinal } from "#tfidf";
import { combineText, newDataCat, vecterTab, getVideoContext } from "#sousCategorie";
import { video2Engagement, sortCommentaire } from "#engagement";

const videoControlleur = {
  // precondition: chaque axes doivent avoir la meme longueur
  predictVideo: async (req, res) => {
    try {

      const idUser = req.user?.id;

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
      const nbNext = Number(req.query.nbNext) || 10;
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

  trainingAlgo: async (req, res) => {
    try {

      // 1. get the number of video
      const nbVideo = (await videoModel.selectAll(["id"])).length;

      // 2. training connaissance (Neurone)
      const oldWeight = await videoModel.selectWeightneurone("training");
      // { videos: [{ difTeacher, difTeacherOpinion, tauxReussiteQuizz, videoSimResalt }], resp: [0 | 1] }
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

      // 3. training sousCategorie (word2vecter et tfidf)
      const textes = await videoModel.selectAll(["desc", "title", "titleQuizz", "questQuizz"]);

      // TF_IDF reconstruit TF et IDF a chaque appel, la derniere matrice contient tous les documents
      let matriceTFIDF;
      textes.forEach(doc => {
        matriceTFIDF = TF_IDF(combineText(doc.desc, doc.title, doc.titleQuizz, doc.questQuizz));
      });

      // TODO: TF et IDF ne sont pas exportes par TF_IDF.js, pushTF et pushIDF a brancher
      await videoModel.pushTFIDF(matriceTFIDF);

      const dataImp = newDataCat(textes, getValueFinal(matriceTFIDF));

      const { W1, index } = vecterTab(dataImp);
      await videoModel.pushWord2Vect(W1);

      const contextVideo = getVideoContext(dataImp, W1, index);
      await videoModel.pushContextVideo(contextVideo);

      // 4. training engagement (KNN)
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

      return res.json(true);

    } catch (err) {

      return res.status(500).json({ error: err.message });

    }
  },
};

export default videoControlleur;
