/*
    ici on va creer les focntions dapple a la bd. je ne suis pas encore connecter a la bd donc on  fait juste la definition des fontions

    chaque * ... * separe les fonctions entre elle

    *
        selectWeightneurone (type: "training" ou "prediction")
    *

    *
        selectWeightreg (type: "training" ou "prediction")  
    *

    *
        selectTF (aucun parametre)  
    *

    *
        selectIDF (aucun parametre)    
    *

    *
        selectTFIDF (aucun parametre)
    *

    *
        selectVectvideo (aucun parametre)
    *

    *
        selectCom (aucun parametre)
    *

    *
        selectComeByVdieo (id)    
    *

    *
        selectAll (colonnes: liste des champs a recuperer, vide = tous)
    *

    *
        selectByid (id)
    *
    
    *
        selectQuizz (aucun parametre)
    *

    *
        selectConnaissance (aucun parametre)
    *
    
    *
        selectEngagement (aucun parametre)
    *
    
    *
        selectSousCat (aucun parametre) 
    *    
    *
        selectUserRegression (idUser)
    *

    *
        pushAxesConnaissance (axeConnaissance)
    *

    *
        pushAxesEngagement (axeEngagement)
    *

    *
        pushAxesSousCat (axeSousCat)
    *

    *
        pushWeightNeurone (w, b)
    *

    *
        pushWeightReg (a, b)
    *

    *
        pushTF (TF)
    *
    
    *
        pushIDF (IDF)
    *

    *
        pushWord2Vect (W1)
    *
    
    *
        pushVideo (titre, description, titreQuizz, questionQuizz, like, view, comPos, comNeg, partage, nbQuizzRepondu, nbQuizzMontrer, age)
    *

    *
        pushContextVideo (contextvideo)    
    *

    *
        modifyVideo (id, parametres: liste des champs a modifier)
    *

    *
        selectDonneesConnaissance (aucun parametre)
    *

    *
        pushTFIDF (TFIDF)
    *

    *
        modifyCommentaires (commentaires)
    *

    garde le commentaire on fait juste les selects pour la premiere session api
*/

const videoModel = {
  async selectWeightneurone(type = "prediction") {

  },

  async selectWeightreg(type = "prediction") {

  },

  async selectTF() {

  },

  async selectIDF() {

  },

  async selectTFIDF() {

  },

  async selectVectvideo() {

  },

  async selectCom() {

  },

  async selectComeByVdieo(id) {

  },

  async selectAll(colonnes = []) {

  },

  async selectByid(id) {
    
  },

  async selectQuizz() {
    
  },

  async selectConnaissance() {

  },

  async selectEngagement() {

  },

  async selectSousCat() {

  },

  async selectUserRegression(idUser) {

  },

  async pushAxesConnaissance(axeConnaissance) {

  },

  async pushAxesEngagement(axeEngagement) {

  },

  async pushAxesSousCat(axeSousCat) {

  },

  async pushWeightNeurone(w, b) {

  },

  async pushWeightReg(a, b) {

  },

  async pushTF(TF) {

  },

  async pushIDF(IDF) {

  },

  async pushWord2Vect(W1) {

  },

  async pushVideo(titre, description, titreQuizz, questionQuizz, like, view, comPos, comNeg, partage, nbQuizzRepondu, nbQuizzMontrer, age) {

  },

  async pushContextVideo(contextvideo) {

  },

  async selectDonneesConnaissance() {

  },

  async pushTFIDF(TFIDF) {

  },

  async modifyCommentaires(commentaires) {

  },

  async modifyVideo(id, parametres = {}) {

  },
};

export default videoModel;
