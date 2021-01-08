import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../entity.converter';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { SimpleAdurcModel } from './mocks/simple-adurc-model';
import sql from 'mssql';

describe('entity converter tests', () => {
    it('convert simpleAdurcModel', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);
        const expectedEntities: MSSQLEntity[] = [{
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
        }];
        expect(entities).toHaveLength(1);
        expect(entities[0]).toStrictEqual(expectedEntities[0]);
    });
});
