import { Request, Response } from 'express';
import Alerta from '../models/Alert';

// 1: Nueva | 2: En Progreso | 3: Resuelta | 4: Falsa Alerta
const VALID_ESTADOS = [1, 2, 3, 4] as const;
type ValidEstado = (typeof VALID_ESTADOS)[number];

// Roles autorizados: 1 = Administrador, 3 = JAC
const AUTHORIZED_ROL_IDS = [1, 3];

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

/**
 * verifyToken guarda en req.user = { id, rol }
 * donde rol viene del JWT como número (id_rol) o string.
 * No necesitamos consultar la DB — el JWT ya tiene el rol.
 */
const isAuthorized = (req: Request): boolean => {
  const rol = (req as any).user?.rol;

  // Caso normal: llega como ID numérico desde el JWT
  const rolId = parsePositiveInt(rol);
  if (rolId !== null) return AUTHORIZED_ROL_IDS.includes(rolId);

  // Fallback: si llegara como nombre string
  if (typeof rol === 'string') {
    const name = rol.toLowerCase().trim();
    return name === 'administrador' || name === 'jac';
  }

  return false;
};

/**
 * PATCH /api/alertas/:id/estado
 * Body: { id_estado: 1 | 2 | 3 | 4 }
 * Requiere: verifyToken middleware
 * Roles: Administrador (1) y JAC (3)
 */
export const updateAlertaEstado = async (req: Request, res: Response) => {
  try {
    const idAlerta = parsePositiveInt(req.params.id);
    if (!idAlerta)
      return res.status(400).json({ message: 'ID de alerta invalido' });

    const idUsuario = parsePositiveInt((req as any).user?.id);
    if (!idUsuario)
      return res.status(401).json({ message: 'No autenticado' });

    if (!isAuthorized(req))
      return res.status(403).json({
        message: 'No tienes permisos para cambiar el estado de una alerta',
      });

    const nuevoEstado = parsePositiveInt(req.body?.id_estado);
    if (!nuevoEstado || !(VALID_ESTADOS as readonly number[]).includes(nuevoEstado))
      return res.status(400).json({
        message: `id_estado debe ser uno de: ${VALID_ESTADOS.join(', ')}`,
      });

    const alerta = await Alerta.findByPk(idAlerta);
    if (!alerta)
      return res.status(404).json({ message: 'Alerta no encontrada' });

    if (alerta.id_estado === nuevoEstado)
      return res.status(200).json({
        message: 'La alerta ya tiene ese estado',
        alert: alerta.toJSON(),
      });

    const estadoAnterior = alerta.id_estado;
    alerta.id_estado = nuevoEstado as ValidEstado;
    await alerta.save();

    return res.json({
      message: 'Estado actualizado con exito',
      estado_anterior: estadoAnterior,
      alert: alerta.toJSON(),
    });
  } catch (error) {
    console.error('Error al actualizar estado de alerta:', error);
    return res.status(500).json({ message: 'Error al actualizar el estado' });
  }
};