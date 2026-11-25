/*
    logs du serveur : points qui s'entrainent, videos envoyees, suivi du pull et erreurs
*/

// 4 chiffres apres la virgule pour que les tableaux restent lisibles
const arrondir = (valeur) => Number.isFinite(valeur) ? Math.round(valeur * 10000) / 10000 : valeur;

// coupe les longs textes pour que le tableau ne deborde pas
const MAX_TEXTE = 40;
export const court = (texte = "") => texte.length > MAX_TEXTE ? `${texte.slice(0, MAX_TEXTE - 3)}...` : texte;

export const logTraining = (message) => console.log(`[training] ${message}`);

export const logPull = (message) => console.log(`[pull] ${new Date().toISOString()} ${message}`);

// affiche l'erreur avec sa trace et sa cause, dans la sortie d'erreur
export const logErreur = (contexte, err) => console.error(`[erreur] ${new Date().toISOString()} ${contexte}:`, err);

// poids ou liste de nombres sur une ligne
export const logPoids = (nom, valeurs, b) =>
  logTraining(`${nom}: [${valeurs.map(arrondir).join(", ")}] b: ${arrondir(b)}`);

// lignes = [{ colonne: valeur }], un point ou une video par ligne
export const logTableau = (titre, lignes) => {
  logTraining(`${titre} (${lignes.length})`);
  if (lignes.length === 0) return;

  console.table(lignes.map(ligne => Object.fromEntries(
    Object.entries(ligne).map(([colonne, valeur]) => [colonne, arrondir(valeur)])
  )));
};
