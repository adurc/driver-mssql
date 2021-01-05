import { AdurcModel } from '@adurc/core/dist/interfaces/model';

export const DiffNamesAdurcModel: AdurcModel = {
    source: 'mssql',
    name: 'DiffName',
    directives: [{ provider: 'mssql', name: 'entity', args: { name: 'A_DIFF_NAME' } }],
    fields: [
        {
            name: 'id',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'column', args: { name: 'diffNameId', primary: true }, provider: 'mssql' }],
        },
        {
            name: 'name',
            type: 'string',
            collection: false,
            nonNull: true,
            directives: [{ name: 'column', args: { name: 'NAME' }, provider: 'mssql' }],
        }
    ],
};
