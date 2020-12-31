import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { UpdateQueryBuilder } from '../../query-builders/update.builder';
import { UpdateContextQueryBuilder } from '../../query-builders/update.context';

describe('query builder update tests', () => {
    it('update query without returning', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = UpdateQueryBuilder.build(entities, entities[0], {
            where: {
                id: 1,
            },
            set: { name: 'Loremp ipsum' },
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(UpdateContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.params).toEqual({ id: 1 });
        expect(context.returning).toBeNull();
        expect(context.tempTable).toBeNull();
        expect(context.set).toEqual({ name: 'Loremp ipsum' });

        expect(sql).toEqual(`
UPDATE [Fake] WITH(ROWLOCK) SET
\t[name] = 'Loremp ipsum'
WHERE
\t[id] = @id
`.trim());
    });

    it('update query with returning', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = UpdateQueryBuilder.build(entities, entities[0], {
            where: {
                id: 1,
            },
            set: { name: 'Loremp ipsum' },
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(UpdateContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.params).toEqual({ id: 1 });
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');
        expect(context.set).toEqual({ name: 'Loremp ipsum' });

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int
)

UPDATE [Fake] WITH(ROWLOCK) SET
\t[name] = 'Loremp ipsum'
OUTPUT INSERTED.[id] INTO @outputData
WHERE
\t[id] = @id

SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
INNER JOIN @outputData AS [sourceData] ON
\t[sourceData].[id] = [root].[id]
`.trim());
    });
});
