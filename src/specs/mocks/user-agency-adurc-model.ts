import { AdurcModel } from '@adurc/core/dist/interfaces/model';

export const UserAgencyAdurcModel: AdurcModel = {
    source: 'mssql',
    name: 'UserAgency',
    directives: [
        { name: 'entity', args: { schema: 'usr' }, provider: 'mssql' },
    ],
    fields: [
        {
            name: 'userId',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'column', args: { primary: true }, provider: 'mssql' }],
        },
        {
            name: 'agencyId',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'column', args: { primary: true }, provider: 'mssql' }],
        },
    ],
};
