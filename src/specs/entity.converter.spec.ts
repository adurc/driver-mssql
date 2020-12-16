import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../entity.converter';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { SimpleAdurcModel, SimpleMSSQLEntity } from './mocks/simple-adurc-model';

describe('entity converter tests', () => {
    it('convert simpleAdurcModel', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels(models);
        const expectedEntities: MSSQLEntity[] = [SimpleMSSQLEntity];
        expect(entities).toHaveLength(1);
        expect(entities[0]).toStrictEqual(expectedEntities[0]);
    });
});
