import { Request, Response } from "express";
import Alerta from "../models/Alert";
import Comment from "../models/Comment";
import Usuario from "../models/User";
import Rol from "../models/Role";

type AlertCommentResponse = {
  id_comentario: number;
  id_alerta: number;
  id_usuario: number;
  nombre_usuario: string;
  texto_comentario: string;
  created_at?: Date;
};

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const getRequestUserId = (req: Request): number | null => {
  return parsePositiveInt((req as any).user?.id);
};

const isRequestAdmin = async (req: Request): Promise<boolean> => {
  const roleValue = (req as any).user?.rol;

  if (typeof roleValue === "string") {
    const normalizedRole = roleValue.toLowerCase().trim();
    if (normalizedRole === "admin" || normalizedRole === "administrador") {
      return true;
    }
  }

  const roleId = parsePositiveInt(roleValue);
  if (!roleId) return false;

  const role = await Rol.findByPk(roleId);
  const roleName = String((role as any)?.nombre_rol || "")
    .toLowerCase()
    .trim();
  return roleName === "admin" || roleName === "administrador";
};

const buildUserNameMap = async (userIds: number[]): Promise<Map<number, string>> => {
  if (userIds.length === 0) return new Map();

  const usuarios = (await Usuario.findAll({
    where: {
      id_usuario: userIds,
    },
    attributes: ["id_usuario", "nombre", "apellido"],
    raw: true,
  })) as Array<{ id_usuario: number; nombre: string; apellido: string }>;

  const userNameById = new Map<number, string>();
  for (const usuario of usuarios) {
    const nombre = String(usuario.nombre || "").trim();
    const apellido = String(usuario.apellido || "").trim();
    const fullName = `${nombre} ${apellido}`.trim();
    if (!fullName) continue;
    userNameById.set(usuario.id_usuario, fullName);
  }

  return userNameById;
};

const mapCommentPayload = (
  comment: Comment,
  userNameById: Map<number, string>
): AlertCommentResponse => {
  const plain = comment.toJSON();
  const idUsuario = Number(plain.id_usuario);
  return {
    id_comentario: plain.id_comentario,
    id_alerta: plain.id_alerta,
    id_usuario: idUsuario,
    nombre_usuario: userNameById.get(idUsuario) || `Usuario #${idUsuario}`,
    texto_comentario: plain.texto_comentario,
    created_at: plain.created_at,
  };
};

export const listAlertComments = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    if (!idAlerta) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const alertExists = await Alerta.findByPk(idAlerta, { attributes: ["id_alerta"] });
    if (!alertExists) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    const comments = await Comment.findAll({
      where: { id_alerta: idAlerta },
      order: [["created_at", "ASC"]],
    });

    const userIds = Array.from(
      new Set(comments.map((comment) => comment.id_usuario).filter((id) => Number.isInteger(id) && id > 0))
    );
    const userNameById = await buildUserNameMap(userIds);

    const payload = comments.map((comment) => mapCommentPayload(comment, userNameById));
    return res.json(payload);
  } catch (error) {
    console.error("Error al listar comentarios de la alerta:", error);
    return res.status(500).json({ message: "Error al obtener comentarios de la alerta" });
  }
};

export const createAlertComment = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    if (!idAlerta) {
      return res.status(400).json({ message: "ID de alerta invalido" });
    }

    const idUsuario = getRequestUserId(req);
    if (!idUsuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const textoComentario = String(req.body?.texto_comentario || "").trim();
    if (!textoComentario) {
      return res.status(400).json({ message: "El comentario no puede estar vacio" });
    }

    if (textoComentario.length > 500) {
      return res.status(400).json({ message: "El comentario no puede superar 500 caracteres" });
    }

    const alertExists = await Alerta.findByPk(idAlerta, { attributes: ["id_alerta"] });
    if (!alertExists) {
      return res.status(404).json({ message: "Alerta no encontrada" });
    }

    const comment = await Comment.create({
      id_alerta: idAlerta,
      id_usuario: idUsuario,
      texto_comentario: textoComentario,
      created_by_id: idUsuario,
    });

    const userNameById = await buildUserNameMap([idUsuario]);
    const payload = mapCommentPayload(comment, userNameById);
    return res.status(201).json(payload);
  } catch (error) {
    console.error("Error al crear comentario de la alerta:", error);
    return res.status(500).json({ message: "Error al crear comentario" });
  }
};

export const updateAlertComment = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    const idComentario = parsePositiveInt(req.params.commentId);
    if (!idAlerta || !idComentario) {
      return res.status(400).json({ message: "IDs invalidos" });
    }

    const idUsuario = getRequestUserId(req);
    if (!idUsuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const textoComentario = String(req.body?.texto_comentario || "").trim();
    if (!textoComentario) {
      return res.status(400).json({ message: "El comentario no puede estar vacio" });
    }

    if (textoComentario.length > 500) {
      return res.status(400).json({ message: "El comentario no puede superar 500 caracteres" });
    }

    const comment = await Comment.findOne({
      where: {
        id_comentario: idComentario,
        id_alerta: idAlerta,
      },
    });
    if (!comment) {
      return res.status(404).json({ message: "Comentario no encontrado" });
    }

    const isAdmin = await isRequestAdmin(req);
    if (comment.id_usuario !== idUsuario && !isAdmin) {
      return res.status(403).json({ message: "No puedes editar comentarios de otros usuarios" });
    }

    comment.texto_comentario = textoComentario;
    comment.created_by_id = comment.created_by_id ?? comment.id_usuario;
    await comment.save();

    const userNameById = await buildUserNameMap([comment.id_usuario]);
    const payload = mapCommentPayload(comment, userNameById);
    return res.json(payload);
  } catch (error) {
    console.error("Error al actualizar comentario:", error);
    return res.status(500).json({ message: "Error al actualizar comentario" });
  }
};

export const deleteAlertComment = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    const idComentario = parsePositiveInt(req.params.commentId);
    if (!idAlerta || !idComentario) {
      return res.status(400).json({ message: "IDs invalidos" });
    }

    const idUsuario = getRequestUserId(req);
    if (!idUsuario) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const comment = await Comment.findOne({
      where: {
        id_comentario: idComentario,
        id_alerta: idAlerta,
      },
    });
    if (!comment) {
      return res.status(404).json({ message: "Comentario no encontrado" });
    }

    const isAdmin = await isRequestAdmin(req);
    if (comment.id_usuario !== idUsuario && !isAdmin) {
      return res.status(403).json({ message: "No puedes eliminar comentarios de otros usuarios" });
    }

    comment.deleted_by_id = idUsuario;
    await comment.save();
    await comment.destroy();

    return res.json({ message: "Comentario eliminado" });
  } catch (error) {
    console.error("Error al eliminar comentario:", error);
    return res.status(500).json({ message: "Error al eliminar comentario" });
  }
};
