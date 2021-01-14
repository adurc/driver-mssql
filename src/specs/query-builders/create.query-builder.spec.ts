import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { CreateQueryBuilder } from '../../query-builders/create.builder';
import { CreateContextQueryBuilder } from '../../query-builders/create.context';
import { DiffNamesAdurcModel } from '../mocks/diff-names-adurc-model';
import { bagEntities } from '../mocks/bag-entities';

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

    it('create query with multiples pks', () => {
        const entities = EntityConverter.fromModels('mssql', bagEntities);
        const userAgency = entities.find(x => x.info.name === 'UserAgency');

        const context = CreateQueryBuilder.build(entities, userAgency, {
            data: [
                { userId: 159, agencyId: 9 }
            ],
            select: {
                userId: true,
                agencyId: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(CreateContextQueryBuilder);

        expect(context.entity).toEqual(userAgency);
        expect(context.pks).toHaveLength(2);
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');
        expect(context.rows).toHaveLength(1);
        expect(context.rows[0]).toEqual({ userId: 159, agencyId: 9 });

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[userId] int,
\t[agencyId] int
)

INSERT INTO [usr].[UserAgency] WITH(ROWLOCK) ([userId],[agencyId])
OUTPUT INSERTED.[userId],INSERTED.[agencyId] INTO @outputData
VALUES (159,9)

SELECT
\t[root].[userId] AS [userId],
\t[root].[agencyId] AS [agencyId]
FROM [usr].[UserAgency] AS [root] WITH(NOLOCK)
INNER JOIN @outputData AS [sourceData] ON
\t[sourceData].[userId] = [root].[userId]
\tAND [sourceData].[agencyId] = [root].[agencyId]
`.trim());
    });

    it('create query with returning', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = CreateQueryBuilder.build(entities, entities[0], {
            data: [
                { name: 'Loremp ipsum' }
            ],
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(CreateContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');
        expect(context.rows).toHaveLength(1);
        expect(context.rows[0]).toEqual({ name: 'Loremp ipsum' });

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int
)

INSERT INTO [Fake] WITH(ROWLOCK) ([name])
OUTPUT INSERTED.[id] INTO @outputData
VALUES ('Loremp ipsum')

SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
INNER JOIN @outputData AS [sourceData] ON
\t[sourceData].[id] = [root].[id]
`.trim());
    });

    it('create query with different columns names', () => {
        const models: AdurcModel[] = [DiffNamesAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = CreateQueryBuilder.build(entities, entities[0], {
            data: [
                { name: 'Loremp ipsum' }
            ],
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(CreateContextQueryBuilder);

        expect(context.entity).toEqual(entities[0]);
        expect(context.pks).toHaveLength(1);
        expect(context.pks[0]).toEqual(entities[0].columns[0]);
        expect(context.returning).not.toBeNull();
        expect(context.tempTable).toEqual('@outputData');
        expect(context.rows).toHaveLength(1);
        expect(context.rows[0]).toEqual({ NAME: 'Loremp ipsum' });

        expect(sql).toEqual(`
DECLARE @outputData AS TABLE(
\t[id] int
)

INSERT INTO [A_DIFF_NAME] WITH(ROWLOCK) ([NAME])
OUTPUT INSERTED.[diffNameId] INTO @outputData
VALUES ('Loremp ipsum')

SELECT
\t[root].[diffNameId] AS [id],
\t[root].[NAME] AS [name]
FROM [A_DIFF_NAME] AS [root] WITH(NOLOCK)
INNER JOIN @outputData AS [sourceData] ON
\t[sourceData].[id] = [root].[diffNameId]
`.trim());
    });
});
