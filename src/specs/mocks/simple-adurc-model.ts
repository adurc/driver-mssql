import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { AdurcSchemaUtils } from '@adurc/core/dist/schema.utils';

export const SimpleAdurcModel: AdurcModel = AdurcSchemaUtils.convertModelSchemaToModel({
    source: 'mssql',
    name: 'Fake',
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
        }
    ],
});