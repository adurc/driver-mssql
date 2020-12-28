import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { MSSQLEntity } from '../../interfaces/mssql-entity';
import sql from 'mssql';

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
        sqlType: sql.Int(),
        options: {
            primary: true,
            identity: false,
            nullable: false,
            readOnly: false,
        },
        info: SimpleAdurcModel.fields[0],
    }, {
        columnName: 'name',
        sqlType: sql.VarChar(),
        options: {
            nullable: false,
        },
        info: SimpleAdurcModel.fields[1],
    }],
    tableName: 'Fake',
};