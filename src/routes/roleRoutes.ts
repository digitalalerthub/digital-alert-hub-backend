import { Router } from 'express';
import Rol from '../models/Role';
import Usuario from '../models/User';
import { ForeignKeyConstraintError } from 'sequelize';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const roles = await Rol.findAll({ order: [['id_rol', 'ASC']] });
        const usageCounts = await Promise.all(
            roles.map(async (rol) => ({
                id_rol: rol.id_rol,
                usuarios_asignados: await Usuario.count({
                    where: { id_rol: rol.id_rol },
                }),
            })),
        );

        const usageMap = new Map(
            usageCounts.map(({ id_rol, usuarios_asignados }) => [
                id_rol,
                usuarios_asignados,
            ]),
        );

        res.json(
            roles.map((rol) => ({
                id_rol: rol.id_rol,
                nombre_rol: rol.nombre_rol,
                usuarios_asignados: usageMap.get(rol.id_rol) ?? 0,
            })),
        );
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener roles' });
    }
});

export default router;

router.post('/', async (req, res) => {
    try {
        const { nombre_rol } = req.body;

        if (!nombre_rol) {
            return res.status(400).json({ message: 'Nombre requerido' });
        }

        const nuevoRol = await Rol.create({ nombre_rol });

        res.status(201).json(nuevoRol);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear rol' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_rol } = req.body;

        const rol = await Rol.findByPk(id);

        if (!rol) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        rol.nombre_rol = nombre_rol;
        await rol.save();

        res.json(rol);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar rol' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const rol = await Rol.findByPk(id);

        if (!rol) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        const usuariosAsignados = await Usuario.count({
            where: { id_rol: rol.id_rol },
        });

        if (usuariosAsignados > 0) {
            return res.status(409).json({
                message: `No se puede eliminar el rol "${rol.nombre_rol}" porque tiene ${usuariosAsignados} usuario${usuariosAsignados === 1 ? '' : 's'} asignado${usuariosAsignados === 1 ? '' : 's'}.`,
            });
        }

        await rol.destroy();

        res.json({ message: 'Rol eliminado' });
    } catch (error) {
        console.error(error);
        if (error instanceof ForeignKeyConstraintError) {
            return res.status(409).json({
                message:
                    'No se puede eliminar el rol porque todavía tiene registros asociados.',
            });
        }
        res.status(500).json({ message: 'Error al eliminar rol' });
    }
});
