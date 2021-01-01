import { AdurcModel } from '@adurc/core/dist/interfaces/model';

export const UserAdurcModel: AdurcModel = {
    source: 'mssql',
    name: 'User',
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
            name: 'name',
            type: 'string',
            collection: false,
            nonNull: true,
            directives: [],
        },
        {
            name: 'email',
            type: 'string',
            collection: false,
            nonNull: true,
            directives: [],
        }, {
            name: 'profile',
            type: { model: 'Profile', source: 'mssql' },
            collection: false,
            nonNull: true,
            directives: [
                { provider: 'mssql', name: 'manyToOne', args: { inverseColumn: 'userId', joinColumn: 'id' } },
            ],
        }, {
            name: 'posts',
            type: { model: 'Post', source: 'mssql' },
            collection: true,
            nonNull: true,
            directives: [
                { provider: 'mssql', name: 'oneToMany', args: { inverseColumn: 'authorId', joinColumn: 'id' } },
            ],
        }, {
            name: 'agencies',
            type: { model: 'Agency', source: 'mssql' },
            collection: true,
            nonNull: true,
            directives: [
                { provider: 'mssql', name: 'manyToMany', args: { manyEntity: 'UserAgency', joinColumn: 'id', manyJoinColumn: 'userId', manyInverseColumn: 'agencyId', inverseColumn: 'id' } },
            ],
        }
    ],
};
