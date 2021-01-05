import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { DeleteQueryBuilder } from '../../query-builders/delete.builder';
import { DeleteContextQueryBuilder } from '../../query-builders/delete.context';
import { DiffNamesAdurcModel } from '../mocks/diff-names-adurc-model';

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
        expect(context.params).toEqual({ id: 1 });
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int,
\t[name] varchar(MAX)
)

DELETE FROM [Fake] WITH(ROWLOCK)
OUTPUT DELETED.[id],DELETED.[name] INTO @outputData
WHERE
\t[id] = @id

SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name]
FROM @outputData AS [root]
`.trim());
    });

    it('delete with different column names', () => {
        const models: AdurcModel[] = [DiffNamesAdurcModel];
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
        expect(context.params).toEqual({ id: 1 });
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int,
\t[name] varchar(MAX)
)

DELETE FROM [A_DIFF_NAME] WITH(ROWLOCK)
OUTPUT DELETED.[diffNameId],DELETED.[NAME] INTO @outputData
WHERE
\t[diffNameId] = @id

SELECT
\t[root].[diffNameId] AS [id],
\t[root].[NAME] AS [name]
FROM @outputData AS [root]
`.trim());
    });
});
