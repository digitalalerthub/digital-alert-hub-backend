import { Router } from 'express';
import Rol from '../models/Role';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const roles = await Rol.findAll({ order: [['id_rol', 'ASC']] });
        res.json(roles);
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

        await rol.destroy();

        res.json({ message: 'Rol eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar rol' });
    }
});
