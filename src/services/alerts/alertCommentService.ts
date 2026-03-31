import { Request } from "express";
import Alert from "../../models/alerts/Alert";
import Comment from "../../models/alerts/Comment";
import User from "../../models/users/User";
import { isAdminRoleName, resolveCanonicalRoleName } from "../../utils/roleUtils";
import { AppError } from "../../utils/appError";
import { parsePositiveInt } from "../../utils/number";

export type AlertCommentResponse = {
  id_comentario: number;
  id_alerta: number;
  id_usuario: number;
  nombre_usuario: string;
  texto_comentario: string;
  created_at?: Date;
};

const getRequestUserId = (req: Request): number | null =>
  parsePositiveInt(req.user?.id);

const isRequestAdmin = async (req: Request): Promise<boolean> => {
  const canonicalRoleName = await resolveCanonicalRoleName(
    req.user?.rol,
    req.user?.role_name
  );

  return isAdminRoleName(canonicalRoleName);
};

const buildUserNameMap = async (userIds: number[]): Promise<Map<number, string>> => {
  if (userIds.length === 0) return new Map();

  const usuarios = (await User.findAll({
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

const validateAlertId = async (alertIdParam: string) => {
  const alertId = parsePositiveInt(alertIdParam);
  if (!alertId) {
    throw new AppError(400, "ID de alerta invalido");
  }

  const alertExists = await Alert.findByPk(alertId, {
    attributes: ["id_alerta"],
  });
  if (!alertExists) {
    throw new AppError(404, "Alerta no encontrada");
  }

  return alertId;
};

const validateCommentText = (value: unknown) => {
  const commentText = String(value || "").trim();
  if (!commentText) {
    throw new AppError(400, "El comentario no puede estar vacio");
  }

  if (commentText.length > 500) {
    throw new AppError(400, "El comentario no puede superar 500 caracteres");
  }

  return commentText;
};

export const listCommentsForAlert = async (alertIdParam: string) => {
  const alertId = await validateAlertId(alertIdParam);

  const comments = await Comment.findAll({
    where: { id_alerta: alertId },
    order: [["created_at", "ASC"]],
  });

  const userIds = Array.from(
    new Set(
      comments
        .map((comment) => comment.id_usuario)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
  const userNameById = await buildUserNameMap(userIds);

  return comments.map((comment) => mapCommentPayload(comment, userNameById));
};

export const createCommentForAlert = async (
  req: Request
): Promise<AlertCommentResponse> => {
  const alertId = await validateAlertId(req.params.id);

  const userId = getRequestUserId(req);
  if (!userId) {
    throw new AppError(401, "No autenticado");
  }

  const commentText = validateCommentText(req.body?.texto_comentario);

  const comment = await Comment.create({
    id_alerta: alertId,
    id_usuario: userId,
    texto_comentario: commentText,
    created_by_id: userId,
  });

  const userNameById = await buildUserNameMap([userId]);
  return mapCommentPayload(comment, userNameById);
};

export const updateCommentForAlert = async (
  req: Request
): Promise<AlertCommentResponse> => {
  const alertId = await validateAlertId(req.params.id);
  const commentId = parsePositiveInt(req.params.commentId);
  if (!commentId) {
    throw new AppError(400, "IDs invalidos");
  }

  const userId = getRequestUserId(req);
  if (!userId) {
    throw new AppError(401, "No autenticado");
  }

  const commentText = validateCommentText(req.body?.texto_comentario);

  const comment = await Comment.findOne({
    where: {
      id_comentario: commentId,
      id_alerta: alertId,
    },
  });
  if (!comment) {
    throw new AppError(404, "Comentario no encontrado");
  }

  const isAdmin = await isRequestAdmin(req);
  if (comment.id_usuario !== userId && !isAdmin) {
    throw new AppError(403, "No puedes editar comentarios de otros usuarios");
  }

  comment.texto_comentario = commentText;
  comment.created_by_id = comment.created_by_id ?? comment.id_usuario;
  await comment.save();

  const userNameById = await buildUserNameMap([comment.id_usuario]);
  return mapCommentPayload(comment, userNameById);
};

export const deleteCommentForAlert = async (req: Request) => {
  const alertId = await validateAlertId(req.params.id);
  const commentId = parsePositiveInt(req.params.commentId);
  if (!commentId) {
    throw new AppError(400, "IDs invalidos");
  }

  const userId = getRequestUserId(req);
  if (!userId) {
    throw new AppError(401, "No autenticado");
  }

  const comment = await Comment.findOne({
    where: {
      id_comentario: commentId,
      id_alerta: alertId,
    },
  });
  if (!comment) {
    throw new AppError(404, "Comentario no encontrado");
  }

  const isAdmin = await isRequestAdmin(req);
  if (comment.id_usuario !== userId && !isAdmin) {
    throw new AppError(403, "No puedes eliminar comentarios de otros usuarios");
  }

  comment.deleted_by_id = userId;
  await comment.save();
  await comment.destroy();
};
