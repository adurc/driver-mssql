import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { AdurcSchemaUtils } from '@adurc/core/dist/schema.utils';

export const UserAgencyAdurcModel: AdurcModel = AdurcSchemaUtils.convertModelSchemaToModel({
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
});
