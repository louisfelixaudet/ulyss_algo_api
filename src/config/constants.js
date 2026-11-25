import { engagement } from "#engagement";
import mongoose from "mongoose";

export const weightEngagement = Object.freeze({
  COEFLIKE: 10,
  COEFVIEW: 1,
  COEFCOMPOS: 20,
  COEFCOMNEG: -1,
  COEFPARTAGE: 15,
  COEFQUIZZ: 3,
  COEFAGE: 1,
});

// un mot dont la somme des scores TF-IDF est plus petite est retire du texte avant word2vecter
export const SCORE_MINI_TFIDF = 0.01;

// score fige d'une video = combinaison fixe de ses 3 axes (ce que la regression apprend a reproduire)
export const weightScoreVideo = Object.freeze({
  SOUSCAT: 1 / 3,
  ENGAGEMENT: 1 / 3,
  CONNAISSANCE: 1 / 3,
});

export const video = mongoose.model('Video', new mongoose.Schema({

  id: { type: Number, required: true},
  title: {type: String, required: true},
  desc: {type: String, required: false},
  titleQuizz: {type: String, required: false},
  questQuizz: {type: String, required: false},
  categorie: {type: String, required: false},
  view: {type: Number, required: false},
  like: {type: Number, required: false},
  comment: {type: Number, required: false},
  share: {type: Number, required: false},
  idteacher: {type: Number, required: false}, // lien vers teacher.idteacher
  // entrees du neurone : nombres entre 0 et 1
  difTeacherOpinion: {type: Number, min: 0, max: 1, required: false}, // difficulte de la video selon le prof
  tauxReussiteQuizz: {type: Number, min: 0, max: 1, required: false}, // bonnes reponses / quizz repondus
  created_at: {type: Date, required: false},
  visibility: {type: Boolean, required: false}

}));

export const quizz = mongoose.model('quizz', new mongoose.Schema({
  idvideo: {type: Number, required: true},
  idquizz: {type: Number, required: true},
  idquestion: {type: Number, required: false}, // id_question de api_ulys (un document par question)
  question: {type: Map, of: String, required: true},
  response: {type: Number, required: true}, // id bonne reponse (0 = question a reponse libre)
  montrer: {type: Number, required: true},
  repondu: {type: Number, required: true},
  test: {type: Boolean, default: false} // true = donnee seulement pour l'entrainement, pas un vrai quizz de video
}));

export const tf = mongoose.model('TF', new mongoose.Schema({
  videoId: {type: Number, required: true, unique: true},
  words: {type: Map, of: Number, required: true}
}));

export const idf = mongoose.model('IDF', new mongoose.Schema({
  words: {type: String, required: true, unique: true},
  scoreIDF: {type: Number, required: true}
}));

export const tfidf = mongoose.model('TFIDF', new mongoose.Schema({
  word: {type: String, required: true, unique: true},
  scoreTFIDF: {type: [Number], required: true}
}));

export const word2vecter = mongoose.model("word2vecter", new mongoose.Schema({
  idword: {type: Number, required: true, unique: true},
  vecteur: {type: [Number], required: true} // une ligne de W1
}));

export const video2vecter = mongoose.model("video2vecter", new mongoose.Schema({
  idvideo: {type: Number, required: true, unique: true},
  vecteur: {type: [Number], required: true} // moyenne des vecteurs W1 des mots de la video
}));

export const commentaire = mongoose.model('commentaire', new mongoose.Schema({
  idcom: {type: Number, required: true},
  idvideo: {type: Number, required: true},
  iduser: {type: Number, required: true},
  type: {type: String, required: false}, // positif negatif (vide = pas encore note par le knn)
  commentaire: {type: String, required: true},
  test: {type: Boolean, default: false}, // true = donnee seulement pour l'entrainement, pas un vrai commentaire de video
}));

export const axes = mongoose.model('axes', new mongoose.Schema({
  axe_name: {type: String, enum: ['connaissance', 'engagement', 'souscategorie'], required: true},
  data: {type: [Number], required: true}
}));

export const weight = mongoose.model('Weight', new mongoose.Schema({
  algo: {type: String, enum: ['neurone', 'regLine'], required: true},
  type: {type: String, enum: ['prediction', 'training'], required: true},
  w: {type: [Number], required: false},   // neurone : un poids par entree
  a: {type: [Number], required: false},   // regression : une pente par axe (sousCat, engagement, connaissance)
  b: {type: Number, required: true}       // biais (neurone) ou ordonnee (regression)
}).index({algo: 1, type: 1}, {unique: true}));

// date et heure de la derniere requete au serveur pour avoir les videos les plus recentes
// un seul document pour toute l'api
export const lastpull = mongoose.model('lastpull', new mongoose.Schema({
  date: {type: Date, required: true}
}));

export const prof = mongoose.model('teacher', new mongoose.Schema({
  idteacher: {type: Number, required: true, unique: true},
  name: {type: String, required: true},
  difficulter: {type: Number, required: true},
  test: {type: Boolean, default: false}, // true = prof fictif seulement pour l'entrainement
}));
