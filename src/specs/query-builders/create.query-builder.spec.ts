import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { CreateQueryBuilder } from '../../query-builders/create.builder';
import { CreateContextQueryBuilder } from '../../query-builders/create.context';

describe('query builder create tests', () => {
    it('create query without returning', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = CreateQueryBuilder.build(entities, entities[0], {
            data: [
                { name: 'Loremp ipsum' }
            ],
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(CreateContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.returning).toBeNull();
        expect(context.tempTable).toBeNull();
        expect(context.rows).toHaveLength(1);
        expect(context.rows[0]).toEqual({ name: 'Loremp ipsum' });

        expect(sql).toEqual(`
INSERT INTO [Fake] WITH(ROWLOCK) ([name])
VALUES ('Loremp ipsum')
`.trim());
    });
});
