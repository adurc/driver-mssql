import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { AdurcSchemaUtils } from '@adurc/core/dist/schema.utils';

export const AgencyAdurcModel: AdurcModel = AdurcSchemaUtils.convertModelSchemaToModel({
    name: 'Agency',
    source: 'mssql',
    directives: [],
    fields: [
        { name: 'id', type: 'int', nonNull: true, directives: [{ name: 'column', args: { primary: true }, provider: 'mssql' }], collection: false, },
        { name: 'name', type: 'string', nonNull: true, directives: [], collection: false, },
    ],
});
