import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { MSSQLEntity } from '../../interfaces/mssql-entity';

export const SimpleAdurcModel: AdurcModel = {
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
};

export const SimpleMSSQLEntity: MSSQLEntity = {
    info: SimpleAdurcModel,
    relations: [],
    columns: [{
        columnName: 'id',
        columnType: 'int',
        computed: false,
        identity: false,
        primary: true,
        info: SimpleAdurcModel.fields[0],
    }, {
        columnName: 'name',
        columnType: 'varchar',
        computed: false,
        identity: false,
        primary: false,
        info: SimpleAdurcModel.fields[1],
    }],
    tableName: 'Fake',
};