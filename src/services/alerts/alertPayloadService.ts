import { col, fn } from "sequelize";
import Alerta from "../../models/Alert";
import Barrio from "../../models/Barrio";
import Categoria from "../../models/Categoria";
import Comuna from "../../models/Comuna";
import Comment from "../../models/Comment";
import Evidence from "../../models/Evidence";
import Usuario from "../../models/User";

type AlertEvidencePayload = {
  id_evidencia: number;
  url_evidencia: string;
  tipo_evidencia: string | null;
};

type UserNameRow = {
  id_usuario: number;
  nombre: string;
  apellido: string;
};

type ComunaNameRow = {
  id_comuna: number;
  nombre: string;
};

type BarrioNameRow = {
  id_barrio: number;
  nombre: string;
};

type CategoriaNameRow = {
  id_categoria: number;
  nombre_categoria: string;
};

type EvidenceRow = AlertEvidencePayload & {
  id_alerta: number;
};

type CommentAggregateRow = {
  id_alerta: number;
  total: string;
};

export const buildAlertPayloads = async (alertas: Alerta[]) => {
  if (alertas.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(
      alertas
        .map((alerta) => alerta.id_usuario)
        .filter((id): id is number => id !== null && Number.isInteger(id) && id > 0)
    )
  );

  const comunaIds = Array.from(
    new Set(
      alertas
        .map((alerta) => alerta.id_comuna)
        .filter((id): id is number => id !== undefined && id !== null && Number.isInteger(id) && id > 0)
    )
  );

  const barrioIds = Array.from(
    new Set(
      alertas
        .map((alerta) => alerta.id_barrio)
        .filter((id): id is number => id !== undefined && id !== null && Number.isInteger(id) && id > 0)
    )
  );

  const categoriaIds = Array.from(
    new Set(
      alertas
        .map((alerta) => alerta.id_categoria)
        .filter((id): id is number => Number.isInteger(id) && id > 0)
    )
  );

  const alertIds = alertas.map((alerta) => alerta.id_alerta);

  const [usuarios, comunas, barrios, categorias, evidencias, commentRowsRaw] = await Promise.all([
    userIds.length > 0
      ? Usuario.findAll({
          where: { id_usuario: userIds },
          attributes: ["id_usuario", "nombre", "apellido"],
          raw: true,
        })
      : Promise.resolve([]),
    comunaIds.length > 0
      ? Comuna.findAll({
          where: { id_comuna: comunaIds },
          attributes: ["id_comuna", "nombre"],
          raw: true,
        })
      : Promise.resolve([]),
    barrioIds.length > 0
      ? Barrio.findAll({
          where: { id_barrio: barrioIds },
          attributes: ["id_barrio", "nombre"],
          raw: true,
        })
      : Promise.resolve([]),
    categoriaIds.length > 0
      ? Categoria.findAll({
          where: { id_categoria: categoriaIds },
          attributes: ["id_categoria", "nombre_categoria"],
          raw: true,
        })
      : Promise.resolve([]),
    Evidence.findAll({
      where: { id_alerta: alertIds },
      order: [
        ["id_alerta", "ASC"],
        ["created_at", "ASC"],
      ],
      raw: true,
    }),
    Comment.findAll({
      attributes: ["id_alerta", [fn("COUNT", col("id_comentario")), "total"]],
      where: { id_alerta: alertIds },
      group: ["id_alerta"],
      raw: true,
    }),
  ]);

  const userNameById = new Map<number, string>();
  for (const usuario of usuarios as UserNameRow[]) {
    const nombre = String(usuario.nombre || "").trim();
    const apellido = String(usuario.apellido || "").trim();
    const fullName = `${nombre} ${apellido}`.trim();
    if (!fullName) continue;
    userNameById.set(usuario.id_usuario, fullName);
  }

  const comunaNombreById = new Map<number, string>();
  for (const comuna of comunas as ComunaNameRow[]) {
    comunaNombreById.set(comuna.id_comuna, comuna.nombre);
  }

  const barrioNombreById = new Map<number, string>();
  for (const barrio of barrios as BarrioNameRow[]) {
    barrioNombreById.set(barrio.id_barrio, barrio.nombre);
  }

  const categoriaNombreById = new Map<number, string>();
  for (const categoria of categorias as CategoriaNameRow[]) {
    categoriaNombreById.set(categoria.id_categoria, categoria.nombre_categoria);
  }

  const evidenceByAlert = new Map<number, AlertEvidencePayload[]>();
  for (const evidence of evidencias as EvidenceRow[]) {
    const current = evidenceByAlert.get(evidence.id_alerta) || [];
    current.push({
      id_evidencia: evidence.id_evidencia,
      url_evidencia: evidence.url_evidencia,
      tipo_evidencia: evidence.tipo_evidencia ?? null,
    });
    evidenceByAlert.set(evidence.id_alerta, current);
  }

  const commentRows = commentRowsRaw as unknown as CommentAggregateRow[];
  const commentCountByAlertId = new Map<number, number>();
  for (const row of commentRows) {
    commentCountByAlertId.set(row.id_alerta, Number(row.total) || 0);
  }

  return alertas.map((alerta) => {
    const plain = alerta.toJSON();
    const idUsuario =
      plain.id_usuario === null || plain.id_usuario === undefined
        ? null
        : Number(plain.id_usuario);
    const nombreUsuario =
      idUsuario && userNameById.has(idUsuario)
        ? userNameById.get(idUsuario)
        : "Cuenta eliminada";
    const nombreComuna = plain.id_comuna
      ? comunaNombreById.get(plain.id_comuna) ?? `Comuna ${plain.id_comuna}`
      : undefined;
    const nombreBarrio = plain.id_barrio
      ? barrioNombreById.get(plain.id_barrio) ?? `Barrio ${plain.id_barrio}`
      : undefined;
    const nombreCategoria = plain.id_categoria
      ? categoriaNombreById.get(plain.id_categoria) ??
        plain.categoria ??
        `Categoria ${plain.id_categoria}`
      : plain.categoria ?? "Sin categoria";
    const alertEvidence = evidenceByAlert.get(plain.id_alerta) || [];
    const primaryEvidence = alertEvidence[0];

    return {
      ...plain,
      categoria: nombreCategoria,
      nombre_usuario: nombreUsuario,
      nombre_comuna: nombreComuna,
      nombre_barrio: nombreBarrio,
      evidencia_url: plain.evidencia_url || primaryEvidence?.url_evidencia,
      evidencia_tipo: plain.evidencia_tipo || primaryEvidence?.tipo_evidencia || undefined,
      evidencias: alertEvidence,
      total_comentarios: commentCountByAlertId.get(plain.id_alerta) ?? 0,
    };
  });
};
