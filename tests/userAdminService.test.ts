import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockResolveRoleId = vi.fn();
const mockBuildPasswordActionLink = vi.fn();
const mockSendAccountSetupEmail = vi.fn();
const mockHash = vi.fn();
const mockRandomBytes = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../src/models/User', () => ({
    default: {
        findOne: mockFindOne,
        create: mockCreate,
    },
}));

vi.mock('../src/config/db', () => ({
    sequelize: {
        transaction: mockTransaction,
    },
}));

vi.mock('../src/services/auth/authLinkService', () => ({
    buildPasswordActionLink: mockBuildPasswordActionLink,
}));

vi.mock('../src/services/auth/authMailService', () => ({
    sendAccountSetupEmail: mockSendAccountSetupEmail,
}));

vi.mock('../src/utils/roleUtils', () => ({
    resolveRoleIdByCanonicalName: mockResolveRoleId,
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: mockHash,
    },
}));

vi.mock('crypto', () => ({
    randomBytes: mockRandomBytes,
}));

describe('createUserFromAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rechaza payload con correo invalido', async () => {
        const { createUserFromAdmin } = await import(
            '../src/services/users/userAdminService'
        );

        await expect(
            createUserFromAdmin({
                nombre: 'Andres',
                apellido: 'Monsalve',
                email: 'correo-invalido',
                telefono: '3001234567',
                id_rol: 1,
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining('correo electronico'),
        });

        expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('crea el usuario y envia correo de activacion', async () => {
        mockFindOne.mockResolvedValue(null);
        mockResolveRoleId.mockResolvedValue(2);
        mockHash.mockResolvedValue('hashed-password');
        mockRandomBytes.mockReturnValue({
            toString: () => 'temporary-password',
        });
        mockBuildPasswordActionLink.mockReturnValue(
            'http://frontend.test/activar',
        );
        mockSendAccountSetupEmail.mockResolvedValue(undefined);
        mockTransaction.mockImplementation(async (callback) =>
            callback('mock-transaction'),
        );
        mockCreate.mockResolvedValue({
            id_usuario: 10,
            nombre: 'Andres',
            apellido: 'Monsalve',
            email: 'andres@test.com',
            id_rol: 1,
            estado: false,
        });

        const { createUserFromAdmin } = await import(
            '../src/services/users/userAdminService'
        );

        const result = await createUserFromAdmin({
            nombre: '  Andres ',
            apellido: ' Monsalve ',
            email: ' ANDRES@Test.com ',
            telefono: ' 3001234567 ',
            id_rol: 1,
        });

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                nombre: 'Andres',
                apellido: 'Monsalve',
                email: 'andres@test.com',
                telefono: '3001234567',
                id_rol: 1,
                estado: false,
                email_verificado: false,
            }),
            { transaction: 'mock-transaction' },
        );
        expect(mockSendAccountSetupEmail).toHaveBeenCalledWith(
            'andres@test.com',
            'Andres',
            'http://frontend.test/activar',
        );
        expect(result.user).toMatchObject({
            id_usuario: 10,
            email: 'andres@test.com',
            estado: false,
        });
    });
});
