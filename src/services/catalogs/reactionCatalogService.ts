import Reaction from "../../models/Reaction";

export const listReactionsCatalog = async () =>
  Reaction.findAll({
    order: [["id_reaccion", "ASC"]],
    attributes: ["id_reaccion", "tipo", "descrip_tipo_reaccion"],
  });
