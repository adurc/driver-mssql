import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { UpdateQueryBuilder } from '../../query-builders/update.builder';
import { UpdateContextQueryBuilder } from '../../query-builders/update.context';
import { DiffNamesAdurcModel } from '../mocks/diff-names-adurc-model';
import { bagEntities } from '../mocks/bag-entities';

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

    it('update query with multiples pks', () => {
        const entities = EntityConverter.fromModels('mssql', bagEntities);
        const userAgency = entities.find(x => x.info.name === 'UserAgency');

        const context = UpdateQueryBuilder.build(entities, userAgency, {
            where: {
                userId: 159,
            },
            set: { agencyId: 9 },
            select: {
                userId: true,
                agencyId: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(UpdateContextQueryBuilder);

        expect(context.entity).toEqual(userAgency);
        expect(context.pks).toHaveLength(2);
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');
        expect(context.set).toEqual({ agencyId: 9 });

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[userId] int,
\t[agencyId] int
)

UPDATE [usr].[UserAgency] WITH(ROWLOCK) SET
\t[agencyId] = 9
OUTPUT INSERTED.[userId],INSERTED.[agencyId] INTO @outputData
WHERE
\t[userId] = @userId

SELECT
\t[root].[userId] AS [userId],
\t[root].[agencyId] AS [agencyId]
FROM [usr].[UserAgency] AS [root] WITH(NOLOCK)
INNER JOIN @outputData AS [sourceData] ON
\t[sourceData].[userId] = [root].[userId]
\tAND [sourceData].[agencyId] = [root].[agencyId]
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

    it('update query with different columns names', () => {
        const models: AdurcModel[] = [DiffNamesAdurcModel];
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
        expect(context.set).toEqual({ NAME: 'Loremp ipsum' });

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int
)

UPDATE [A_DIFF_NAME] WITH(ROWLOCK) SET
\t[NAME] = 'Loremp ipsum'
OUTPUT INSERTED.[diffNameId] INTO @outputData
WHERE
\t[diffNameId] = @id

SELECT
\t[root].[diffNameId] AS [id],
\t[root].[NAME] AS [name]
FROM [A_DIFF_NAME] AS [root] WITH(NOLOCK)
INNER JOIN @outputData AS [sourceData] ON
\t[sourceData].[id] = [root].[diffNameId]
`.trim());
    });
});
