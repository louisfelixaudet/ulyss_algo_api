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
        selectUserRegression (idUser, idsLikes: id des videos likees)
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
        pushVideo (id, titre, description, titreQuizz, questionQuizz, categorie, like, view, com, partage, idteacher, created_at, visibility)
    *

    *
        pushCommentaires (idvideo, coms)
    *

    *
        pushQuizz (idvideo, idquizz, questions)
    *

    *
        selectVideosEngagement (aucun parametre)
    *

    *
        pushWeightPrediction (aucun parametre)
    *

    *
        syncVisibility (idsVisibles)
    *

    *
        pushMeta (metas)
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

    *
        selectLastPull (aucun parametre)
    *

    *
        pushLastPull (date: date de la requete, maintenant par defaut)
    *

    garde le commentaire on fait juste les selects pour la premiere session api
*/

import { axes, commentaire, idf, lastpull, prof, quizz, tf, tfidf, video, video2vecter, weight, word2vecter } from "../config/constants.js";
import { cosinus } from "#sousCategorie";
import { burnValue2Sigmoide } from "#engagement";
import { predict } from "#regressionLineaire";

// valeurs de commentaire.type qui veulent dire "positif" (texte du schema ou label 1 du knn)
const TYPES_COM_POSITIF = ["positif", "1"];

// nombre de videos similaires utilisees pour videoSimResalt et resp
const NB_VIDEOS_SIM = 3;

// valeur neutre pour une entree du neurone qui manque (le neurone attend un nombre entre 0 et 1)
const VALEUR_NEUTRE = 0.5;

// les NB_VIDEOS_SIM videos les plus proches de la video i (cosinus entre les vecteurs video2vecter)
const videosSimilaires = (i, vecteurs) => {
    if (!vecteurs[i]) return [];

    return vecteurs
        .map((vecteur, j) => ({ j, sim: vecteur && j !== i ? cosinus(vecteurs[i], vecteur) : -Infinity }))
        .filter(v => v.sim !== -Infinity)
        .sort((v1, v2) => v2.sim - v1.sim)
        .slice(0, NB_VIDEOS_SIM)
        .map(v => v.j);
};

// type en bd -> note du knn
const noteCom = (type) => {
    if (type === undefined || type === null) return undefined;
    return TYPES_COM_POSITIF.includes(type) ? 1 : 0;
};

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

const moyenne = (tab) => tab.reduce((s, v) => s + v, 0) / tab.length;

// valeur de l'axe a la position i, VALEUR_NEUTRE si elle manque
// l'entrainement et la prediction doivent remplacer une valeur manquante de la meme facon
export const valeurAxe = (tab, i) => (Number.isFinite(tab[i]) ? tab[i] : VALEUR_NEUTRE);

// renvoie le tableau data d'un axe ([] si l'axe n'existe pas encore)
const selectAxe = async (axe_name) => {
    const axe = await axes.findOne({ axe_name }).lean();
    return axe?.data ?? [];
};

// remplace le tableau data d'un axe (le cree s'il n'existe pas encore)
const pushAxe = async (axe_name, data) => {
    if (!Array.isArray(data) || !data.every(Number.isFinite)) {
        throw new Error(`pushAxe ${axe_name}: data doit etre un tableau de nombres`);
    }

    return axes.findOneAndUpdate(
        { axe_name },
        { data },
        { upsert: true, new: true }
    );
};

const videoModel = {
    selectWeightneurone: async (type = "prediction") =>
        weight.findOne({ algo: 'neurone', type }).lean(),

    selectWeightreg: async (type = "prediction") =>
        weight.findOne({ algo: 'regLine', type }).lean(),

    selectTF: async () => tf.find({}).sort({ videoId: 1 }),

    selectIDF: async () => idf.find({}),


    selectTFIDF: async () => tfidf.find({}),

    selectVectvideo: async () => video2vecter.find({}).sort({ idvideo: 1 }),

    // format attendu par le controlleur : [idVideo, commentaire, note, idcom]
    // note : 1 = positif, 0 = negatif, undefined = pas encore note
    selectCom: async () => {
        const coms = await commentaire.find({}).lean();
        return coms.map(com => [com.idvideo, com.commentaire, noteCom(com.type), com.idcom]);
    },

    // tous les commentaires d'une video
    // seulement les vrais commentaires (pas ceux d'entrainement)
    selectComById: async (id) => commentaire.find({ idvideo: id, test: { $ne: true } }).lean(),

    selectAll: async (colonnes = []) => video.find().select(colonnes.join(" ")).sort({ id: 1 }).lean(),

    selectByid: async (id) => video.findById(id),

    selectQuizz: async () => quizz.find({}).lean(),

    selectConnaissance: async () => selectAxe('connaissance'),

    selectEngagement: async () => selectAxe('engagement'),

    selectSousCat: async () => selectAxe('souscategorie'),

    /*
        score cible du client = moyenne du score de regression des videos qu'il a aimees
        (aimee = il l'a likee ou a laisse un vrai commentaire positif dessus)

        nouveau client (rien aime) : moyenne de toutes les videos
        pas encore de poids de regression : VALEUR_NEUTRE

        la position i = video i triee par id dans les 3 axes
    */
    selectUserRegression: async (idUser, idsLikes = []) => {
        const id = Number(idUser);
        if (!Number.isInteger(id)) {
            throw new Error(`selectUserRegression: idUser invalide (recu: ${idUser})`);
        }

        const [comsAimes, videos, sousCat, engagement, connaissance, weightReg] = await Promise.all([
            commentaire.find({ iduser: id, type: { $in: TYPES_COM_POSITIF }, test: { $ne: true } }).select("idvideo").lean(),
            video.find().sort({ id: 1 }).select("id").lean(),
            selectAxe('souscategorie'),
            selectAxe('engagement'),
            selectAxe('connaissance'),
            weight.findOne({ algo: 'regLine', type: 'prediction' }).lean(),
        ]);

        // predict attend une pente par axe
        if (!weightReg || !Array.isArray(weightReg.a)) return VALEUR_NEUTRE;

        const scoreVideo = (i) => predict(
            weightReg.a,
            [valeurAxe(sousCat, i), valeurAxe(engagement, i), valeurAxe(connaissance, i)],
            weightReg.b
        );

        // id de video -> position dans les axes
        const position = new Map(videos.map((v, i) => [v.id, i]));
        const idsAimes = new Set([...comsAimes.map(com => com.idvideo), ...idsLikes]);

        let indices = [...idsAimes].map(idVideo => position.get(idVideo)).filter(i => i !== undefined);
        if (indices.length === 0) indices = videos.map((v, i) => i);

        const scores = indices.map(scoreVideo).filter(Number.isFinite);
        return scores.length > 0 ? moyenne(scores) : VALEUR_NEUTRE;
    },

    pushAxesConnaissance: async (axeConnaissance) => pushAxe('connaissance', axeConnaissance),

    pushAxesEngagement: async (axeEngagement) => pushAxe('engagement', axeEngagement),

    pushAxesSousCat: async (axeSousCat) => pushAxe('souscategorie', axeSousCat),

    pushWeightNeurone: async (w, b) => weight.findOneAndUpdate(
        { algo: 'neurone', type: 'training' },
        { w, b },
        { upsert: true, new: true }
    ),

    pushWeightReg: async (a, b) => weight.findOneAndUpdate(
        { algo: 'regLine', type: 'training' },
        { a, b },
        { upsert: true, new: true }
    ),

    // TF = [{ mot: tf }, ...] un dictionnaire par video, dans l'ordre des videos : la position i = videoId i
    pushTF: async (TF) => tf.bulkWrite(
        TF.map((words, videoId) => ({
            updateOne: {
                filter: { videoId },
                update: { words },
                upsert: true,
            },
        }))
    ),

    // IDF = { mot: scoreIDF } : le mot sert de cle
    pushIDF: async (IDF) => idf.bulkWrite(
        Object.entries(IDF).map(([words, scoreIDF]) => ({
            updateOne: {
                filter: { words },
                update: { scoreIDF },
                upsert: true,
            },
        }))
    ),

    // W1 garde toujours le meme ordre : la position i = idword i
    // les mots deja en bd sont mis a jour, les nouveaux (ajoutes a la suite) sont crees
    pushWord2Vect: async (W1) => word2vecter.bulkWrite(
        W1.map((vecteur, idword) => ({
            updateOne: {
                filter: { idword },
                update: { vecteur },
                upsert: true,
            },
        }))
    ),

    // id = id_video de api_ulys : une video deja recue est mise a jour, pas creee en double
    pushVideo: async ({
        id,
        titre,
        description = "",
        titreQuizz = "",
        questionQuizz = "",
        categorie,
        like = 0,
        view = 0,
        com = 0,
        partage = 0,
        idteacher,
        created_at,
        visibility = true,
    } = {}) => {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error(`pushVideo: id invalide (recu: ${id})`);
        }

        if (typeof titre !== "string" || titre.trim() === "") {
            throw new Error(`pushVideo: titre est obligatoire (video ${id})`);
        }

        Object.entries({ like, view, com, partage }).forEach(([nom, valeur]) => {
            if (!Number.isFinite(valeur) || valeur < 0) {
                throw new Error(`pushVideo: ${nom} doit etre un nombre positif (video ${id}, recu: ${valeur})`);
            }
        });

        return video.findOneAndUpdate(
            { id },
            {
                title: titre.trim(),
                desc: description,
                titleQuizz: titreQuizz,
                questQuizz: questionQuizz,
                categorie,
                like,
                view,
                comment: com,
                share: partage,
                idteacher,
                created_at,
                visibility,
            },
            { upsert: true, new: true }
        );
    },

    // coms = [{ idcom, iduser, commentaire }, ...]
    // le type n'est pas touche : un commentaire deja note par le knn garde sa note
    pushCommentaires: async (idvideo, coms) => {
        if (coms.length === 0) return null;

        return commentaire.bulkWrite(
            coms.map(({ idcom, iduser, commentaire: texte }) => ({
                updateOne: {
                    filter: { idcom, idvideo },
                    update: { iduser, commentaire: texte },
                    upsert: true,
                },
            }))
        );
    },

    // questions = [{ idquestion, question: { question: texte, idOption: texteOption }, response }, ...]
    // montrer et repondu commencent a 0 et ne sont pas remis a 0 ensuite
    pushQuizz: async (idvideo, idquizz, questions) => {
        if (questions.length === 0) return null;

        return quizz.bulkWrite(
            questions.map(({ idquestion, question, response }) => ({
                updateOne: {
                    filter: { idvideo, idquizz, idquestion },
                    update: { $set: { question, response }, $setOnInsert: { montrer: 0, repondu: 0 } },
                    upsert: true,
                },
            }))
        );
    },

    /*
        met a jour les videos deja recues (aucune video n'est creee) :
        metas = [{ id, view, like, com, partage, tauxReussite (null = aucune reponse), questions: [{ idquestion, montrer, repondu }] }]
    */
    pushMeta: async (metas) => {
        const majVideos = metas.map(({ id, view, like, com, partage, tauxReussite }) => ({
            updateOne: {
                filter: { id },
                update: {
                    view,
                    like,
                    comment: com,
                    share: partage,
                    ...(tauxReussite === null ? {} : { tauxReussiteQuizz: tauxReussite }),
                },
            },
        }));

        const majQuizz = metas.flatMap(({ id, questions }) => questions.map(({ idquestion, montrer, repondu }) => ({
            updateOne: {
                filter: { idvideo: id, idquestion },
                update: { montrer, repondu },
            },
        })));

        if (majVideos.length > 0) await video.bulkWrite(majVideos);
        if (majQuizz.length > 0) await quizz.bulkWrite(majQuizz);
    },

    // visible = dans la liste, les autres sont cachees (supprimees ou privees)
    // rien n'est efface : une video cachee sert encore a l'entrainement
    syncVisibility: async (idsVisibles) => Promise.all([
        video.updateMany({ id: { $in: idsVisibles } }, { visibility: true }),
        video.updateMany({ id: { $nin: idsVisibles } }, { visibility: false }),
    ]),

    pushContextVideo: async (contextvideo) => video2vecter.bulkWrite(
        contextvideo.map((vecteur, idvideo) => ({
            updateOne: {
                filter: { idvideo },
                update: { vecteur },
                upsert: true,
            },
        }))
    ),

    /*
        relie video + teacher + quizz + video2vecter + axe connaissance dans le meme objet :
        { videos: [{ id, difTeacher, difTeacherOpinion, tauxReussiteQuizz, videoSimResalt }], resp: [...] }

        - difTeacher        : teacher.difficulter (lien video.idteacher = teacher.idteacher)
        - videoSimResalt    : moyenne du tauxReussiteQuizz des NB_VIDEOS_SIM videos les plus proches
        - resp              : moyenne du score connaissance des videos les plus proches,
                              sinon (pas assez de videos) sigmoid(log(1 + nb bonnes reponses))

        la position i = idvideo i dans video2vecter et dans l'axe connaissance (videos triees par id)
    */
    selectDonneesConnaissance: async () => {
        const [videos, profs, statsQuizz, vecteursBd, axeConnaissance] = await Promise.all([
            video.find().sort({ id: 1 }).select("id idteacher difTeacherOpinion tauxReussiteQuizz").lean(),
            prof.find().select("idteacher difficulter").lean(),
            // nombre de fois que les quizz de chaque video ont ete repondus
            quizz.aggregate([{ $group: { _id: "$idvideo", repondu: { $sum: "$repondu" } } }]),
            video2vecter.find().select("idvideo vecteur").lean(),
            selectAxe('connaissance'),
        ]);

        // tables de correspondance pour relier les schemas
        const difficulteProf = new Map(profs.map(p => [p.idteacher, p.difficulter]));
        const nbRepondu = new Map(statsQuizz.map(q => [q._id, q.repondu]));
        const vecteurs = [];
        vecteursBd.forEach(v => { vecteurs[v.idvideo] = v.vecteur; });

        const taux = videos.map(v => v.tauxReussiteQuizz ?? 0);

        const donnees = videos.map((v, i) => {
            const proches = videosSimilaires(i, vecteurs);

            return {
                id: v.id,
                difTeacher: difficulteProf.get(v.idteacher) ?? VALEUR_NEUTRE,
                difTeacherOpinion: v.difTeacherOpinion ?? VALEUR_NEUTRE,
                tauxReussiteQuizz: v.tauxReussiteQuizz ?? 0,
                videoSimResalt: proches.length > 0 ? moyenne(proches.map(j => taux[j])) : VALEUR_NEUTRE,
                proches,
            };
        });

        const resp = donnees.map(({ id, proches }, i) => {
            const scoresProches = proches.map(j => axeConnaissance[j]).filter(Number.isFinite);

            if (scoresProches.length >= NB_VIDEOS_SIM) return moyenne(scoresProches);

            // pas assez de videos similaires : nombre de bonnes reponses passe dans log puis sigmoid
            const nbBonnesReponses = taux[i] * (nbRepondu.get(id) ?? 0);
            return burnValue2Sigmoide(nbBonnesReponses);
        });

        return {
            videos: donnees.map(({ proches, ...v }) => v),
            resp,
        };
    },

    /*
        relie video + commentaire + quizz dans le format attendu par video2Engagement :
        [{ like, view, com: [texte, ...], partage, quizz: { repondu, show }, age }]
    */
    selectVideosEngagement: async () => {
        const [videos, coms, statsQuizz] = await Promise.all([
            video.find().sort({ id: 1 }).lean(),
            commentaire.find({ test: { $ne: true } }).select("idvideo commentaire").lean(),
            quizz.aggregate([
                { $match: { test: { $ne: true } } },
                { $group: { _id: "$idvideo", repondu: { $sum: "$repondu" }, montrer: { $sum: "$montrer" } } },
            ]),
        ]);

        const comsVideo = new Map();
        coms.forEach(com => {
            if (!comsVideo.has(com.idvideo)) comsVideo.set(com.idvideo, []);
            comsVideo.get(com.idvideo).push(com.commentaire);
        });
        const quizzVideo = new Map(statsQuizz.map(q => [q._id, q]));

        return videos.map(v => {
            const stats = quizzVideo.get(v.id);
            const ageJours = v.created_at ? (Date.now() - v.created_at.getTime()) / MS_PAR_JOUR : 1;

            return {
                like: v.like ?? 0,
                view: v.view ?? 0,
                com: comsVideo.get(v.id) ?? [],
                partage: v.share ?? 0,
                // minimum 1 : l'engagement divise par show et par age
                quizz: { repondu: stats?.repondu ?? 0, show: Math.max(1, stats?.montrer ?? 0) },
                age: Math.max(1, ageJours),
            };
        });
    },

    // copie les poids entraines vers ceux que la prediction utilise
    pushWeightPrediction: async () => {
        const poids = await weight.find({ type: 'training' }).lean();

        return Promise.all(poids.map(({ algo, w, a, b }) => weight.findOneAndUpdate(
            { algo, type: 'prediction' },
            { w, a, b },
            { upsert: true, new: true }
        )));
    },

    // TFIDF = { mot: [score doc0, score doc1, ...] } : le mot sert de cle
    pushTFIDF: async (TFIDF) => tfidf.bulkWrite(
        Object.entries(TFIDF).map(([word, scoreTFIDF]) => ({
            updateOne: {
                filter: { word },
                update: { scoreTFIDF },
                upsert: true,
            },
        }))
    ),

    modifyTypeCommentaires: async (idcom, idvideo, type) => commentaire.findOneAndUpdate(
        {
            idcom: idcom,
            idvideo: idvideo
        },
        {
            type
        }
    ),

    modifyVideo: async (id, parametres = {}) => video.findByIdAndUpdate(id, parametres, { new: true }),

    // date de la derniere requete (null si aucune requete n'a encore ete faite)
    selectLastPull: async () => {
        const dernier = await lastpull.findOne().lean();
        return dernier?.date ?? null;
    },

    // remplace la date de la derniere requete (filtre vide = toujours le meme document, cree la premiere fois)
    pushLastPull: async (date = new Date()) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            throw new Error(`pushLastPull: date invalide (recu: ${date})`);
        }

        return lastpull.findOneAndUpdate(
            {},
            { date },
            { upsert: true, new: true }
        );
    },

};

export default videoModel;
