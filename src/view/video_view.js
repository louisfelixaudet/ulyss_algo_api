/*
    creer un object js nommer videoView qui possede deux fonction cest ce qui sera envoyer entant que json

    - la premiere return un objet nommee single qui possede comme attribut: id, score, titre avec comme input(video)

    - le deuxieme return une liste dobjet video qui utilise map et la fonction single creer en premier input (listVideo)

    export default a la fin
*/

const videoView = {
    
  single(video) {
    return {
      id: video.id,
      score: video.score,
      titre: video.title,
    };
  },

  collection(listVideo) {
    return listVideo.map((video) => videoView.single(video));
  }

};

export default videoView;
