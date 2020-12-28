import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { DeleteQueryBuilder } from '../../query-builders/delete.builder';
import { DeleteContextQueryBuilder } from '../../query-builders/delete.context';

describe('query builder delete tests', () => {
    it('delete query without returning', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = DeleteQueryBuilder.build(entities, entities[0], {
            where: {
                id: 1,
            },
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(DeleteContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.params).toEqual({ id: 1 });
        expect(context.returning).toBeNull();
        expect(context.tempTable).toBeNull();

        expect(sql).toEqual(`
DELETE FROM [Fake] WITH(ROWLOCK)
WHERE
\t[id] = @id
`.trim());
    });

    it('delete query with returning', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = DeleteQueryBuilder.build(entities, entities[0], {
            where: {
                id: 1,
            },
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(DeleteContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.params).toEqual({ id: 1 });
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int
)

DELETE FROM [Fake] WITH(ROWLOCK)
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
