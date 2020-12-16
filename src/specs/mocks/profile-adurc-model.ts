import { AdurcModel } from '@adurc/core/dist/interfaces/model';

export const ProfileAdurcModel: AdurcModel = {
    source: 'mssql',
    name: 'Profile',
    directives: [],
    fields: [
        {
            name: 'id',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'column', args: { primary: true }, provider: 'mssql' }],
        },
        {
            name: 'bio',
            type: 'string',
            collection: false,
            nonNull: true,
            directives: [],
        },
        {
            name: 'userId',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [],
        }, {
            name: 'user',
            type: { model: 'User', source: 'mssql' },
            collection: false,
            nonNull: false,
            directives: [
                { provider: 'mssql', name: 'manyToOne', args: { inverseColumn: 'id', joinColumn: 'userId' } },
            ],
        }
    ],
};
