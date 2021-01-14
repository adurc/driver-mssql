import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { FindQueryBuilder } from '../../query-builders/find.builder';
import { FindContextQueryBuilder, IColumnQueryBuilder, IConditionSide, ITableAliasAccessor, IObjectAliasAccessor, OperatorType, ITreeCondition } from '../../query-builders/find.context';
import { bagEntities } from '../mocks/bag-entities';
import { DiffNamesAdurcModel } from '../mocks/diff-names-adurc-model';

describe('query builder find tests', () => {
    it('basic select query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'Fake', as: 'root' });
        expect(context.columns).toHaveLength(2);
        expect(context.columns[0]).toEqual({ source: 'root', name: 'id', as: 'id' });
        expect(context.columns[1]).toEqual({ source: 'root', name: 'name', as: 'name' });

        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('select with different column names', () => {
        const models: AdurcModel[] = [DiffNamesAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'A_DIFF_NAME', as: 'root' });
        expect(context.columns).toHaveLength(2);
        expect(context.columns[0]).toEqual({ source: 'root', name: 'diffNameId', as: 'id' });
        expect(context.columns[1]).toEqual({ source: 'root', name: 'NAME', as: 'name' });

        expect(sql).toEqual(`
SELECT
\t[root].[diffNameId] AS [id],
\t[root].[NAME] AS [name]
FROM [A_DIFF_NAME] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('order by a column', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.orderBy).toHaveLength(1);
        expect(context.orderBy[0]).toEqual({ source: 'root', name: 'name', direction: 'ASC' });


        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
ORDER BY [root].[name] ASC
`.trim());
    });

    it('skip & take (offset fetch)', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
            },
            orderBy: {
                name: 'asc',
            },
            skip: 100,
            take: 50,
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.skip).toEqual(100);
        expect(context.take).toEqual(50);


        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id]
FROM [Fake] AS [root] WITH(NOLOCK)
ORDER BY [root].[name] ASC
OFFSET 100 ROWS
FETCH NEXT 50 ROWS ONLY
`.trim());
    });

    it('take only (use top instead of fetch offset)', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
            },
            orderBy: {
                name: 'asc',
            },
            take: 50,
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.take).toEqual(50);


        expect(sql).toEqual(`
SELECT
\tTOP 50
\t[root].[id] AS [id]
FROM [Fake] AS [root] WITH(NOLOCK)
ORDER BY [root].[name] ASC
`.trim());
    });

    it('where for a column', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                name: true,
            },
            where: {
                id: 1,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.where).toHaveLength(1);
        expect(context.where[0]).toEqual({
            left: { type: 'column', source: 'root', column: 'id' },
            operator: '=',
            right: { type: 'variable', name: 'root_id' },
        });
        expect(context.params).toEqual({ 'root_id': 1 });

        expect(sql).toEqual(`
SELECT
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
WHERE
\t[root].[id] = @root_id
`.trim());
    });

    it('where in operator for a column', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                name: true,
            },
            where: {
                id: { in: [1, 2] },
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.where).toHaveLength(1);
        expect(context.where[0]).toEqual({
            left: { type: 'column', source: 'root', column: 'id' },
            operator: 'in',
            right: [{ type: 'variable', name: 'root_id_0' }, { type: 'variable', name: 'root_id_1' }],
        });
        expect(context.params).toEqual({ 'root_id_0': 1, 'root_id_1': 2 });

        expect(sql).toEqual(`
SELECT
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
WHERE
\t[root].[id] in (@root_id_0,@root_id_1)
`.trim());
    });

    it('where with AND', () => {
        const entities = EntityConverter.fromModels('mssql', bagEntities);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                name: true,
            },
            where: {
                AND: [
                    { name: 'Adurc' },
                    { age: 13 },
                ]
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.where).toHaveLength(1);
        expect(context.where[0]).toEqual<ITreeCondition>({
            ands: [
                {
                    left: { type: 'column', source: 'root', column: 'name' },
                    operator: '=',
                    right: { type: 'variable', name: 'root_and_0_name' },
                }, {
                    left: { type: 'column', source: 'root', column: 'age' },
                    operator: '=',
                    right: { type: 'variable', name: 'root_and_1_age' },
                }
            ],
        });
        expect(context.params).toEqual({ 'root_and_0_name': 'Adurc', 'root_and_1_age': 13 });

        expect(sql).toEqual(`
SELECT
\t[root].[name] AS [name]
FROM [User] AS [root] WITH(NOLOCK)
WHERE
\t(
\t\t[root].[name] = @root_and_0_name
\t\tAND [root].[age] = @root_and_1_age
\t)
`.trim());
    });

    it('many to one query', () => {
        const entities = EntityConverter.fromModels('mssql', bagEntities);

        const context = FindQueryBuilder.build(entities, entities[0], {
            include: {
                profile: {
                    bio: true,
                }
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.columns).toHaveLength(1);
        expect(context.columns[0]).toEqual({ source: 'profile', name: 'bio', as: 'profile.bio' });
        expect(context.joins).toHaveLength(1);
        expect(context.joins[0]).toEqual({
            type: 'inner',
            from: {
                type: 'table',
                table: 'Profile',
                as: 'profile',
            },
            conditions: [
                {
                    left: {
                        type: 'column',
                        source: 'profile',
                        column: 'userId',
                    },
                    operator: '=',
                    right: {
                        type: 'column',
                        source: 'root',
                        column: 'id',
                    },
                }
            ],
        });

        expect(sql).toEqual(`
SELECT
\t[profile].[bio] AS [profile.bio]
FROM [User] AS [root] WITH(NOLOCK)
INNER JOIN [Profile] AS [profile] WITH(NOLOCK) ON
\t[profile].[userId] = [root].[id]
        `.trim());
    });

    it('one to many query', () => {
        const entities = EntityConverter.fromModels('mssql', bagEntities);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            },
            include: {
                posts: {
                    select: {
                        title: true,
                    },
                }
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.from).toEqual<ITableAliasAccessor>({ type: 'table', table: 'User', as: 'root' });
        expect(context.columns).toHaveLength(2);
        expect(context.columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: 'id' });
        expect(context.columns[1]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'name', as: 'name' });
        expect(context.params).toEqual<Record<string, unknown>>({});
        expect(context.joins).toHaveLength(0);
        expect(context.into).toEqual('#main');
        expect(context.temporalColumns).toHaveLength(1);
        expect(context.temporalColumns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: '__id' });
        expect(context.children).toHaveLength(1);

        expect(context.children[0].from).toEqual<ITableAliasAccessor>({ type: 'table', table: 'Post', as: 'root' });
        expect(context.children[0].columns).toHaveLength(1);
        expect(context.children[0].columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'title', as: 'title' });
        expect(context.children[0].params).toEqual<Record<string, unknown>>({});
        expect(context.children[0].temporalColumns).toHaveLength(0);
        expect(context.children[0].joins).toHaveLength(1);
        expect(context.children[0].joins[0].type).toEqual('inner');
        expect(context.children[0].joins[0].from).toEqual<IObjectAliasAccessor>({ type: 'object', name: '#main', as: 'parent' });
        expect(context.children[0].joins[0].conditions).toHaveLength(1);
        expect(context.children[0].joins[0].conditions[0].left).toEqual<IConditionSide>({ type: 'column', source: 'parent', column: '__id' });
        expect(context.children[0].joins[0].conditions[0].operator).toEqual<OperatorType>('=');
        expect(context.children[0].joins[0].conditions[0].right).toEqual<IConditionSide>({ type: 'column', source: 'root', column: 'authorId' });
        expect(context.children[0].into).toBeNull();
        expect(context.children[0].children).toHaveLength(0);

        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name],
\t[root].[id] AS [__id]
INTO #main
FROM [User] AS [root] WITH(NOLOCK)

SELECT
\t[id],
\t[name]
FROM #main

SELECT
\t[root].[title] AS [title]
FROM [Post] AS [root] WITH(NOLOCK)
INNER JOIN #main AS [parent] ON
\t[parent].[__id] = [root].[authorId]
`.trim());
    });

    it('many to many query', () => {
        const entities = EntityConverter.fromModels('mssql', bagEntities);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            },
            include: {
                agencies: {
                    select: {
                        name: true,
                    },
                }
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);
        expect(context.from).toEqual<ITableAliasAccessor>({ type: 'table', table: 'User', as: 'root' });
        expect(context.columns).toHaveLength(2);
        expect(context.columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: 'id' });
        expect(context.columns[1]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'name', as: 'name' });
        expect(context.params).toEqual<Record<string, unknown>>({});
        expect(context.joins).toHaveLength(0);
        expect(context.temporalColumns).toHaveLength(1);
        expect(context.temporalColumns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: '__id' });
        expect(context.children).toHaveLength(1);

        expect(context.children[0].from).toEqual<ITableAliasAccessor>({ type: 'table', schema: 'usr', table: 'UserAgency', as: 'many' });
        expect(context.children[0].columns).toHaveLength(1);
        expect(context.children[0].columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'name', as: 'name' });
        expect(context.children[0].params).toEqual<Record<string, unknown>>({});
        expect(context.children[0].temporalColumns).toHaveLength(0);
        expect(context.children[0].joins).toHaveLength(2);

        expect(context.children[0].joins[0].type).toEqual('inner');
        expect(context.children[0].joins[0].from).toEqual<ITableAliasAccessor>({ type: 'table', table: '#main', as: 'parent' });
        expect(context.children[0].joins[0].conditions).toHaveLength(1);
        expect(context.children[0].joins[0].conditions[0].left).toEqual<IConditionSide>({ type: 'column', source: 'parent', column: '__id' });
        expect(context.children[0].joins[0].conditions[0].operator).toEqual<OperatorType>('=');
        expect(context.children[0].joins[0].conditions[0].right).toEqual<IConditionSide>({ type: 'column', source: 'many', column: 'userId' });

        expect(context.children[0].joins[1].type).toEqual('inner');
        expect(context.children[0].joins[1].from).toEqual<ITableAliasAccessor>({ type: 'table', table: 'Agency', as: 'root' });
        expect(context.children[0].joins[1].conditions).toHaveLength(1);
        expect(context.children[0].joins[1].conditions[0].left).toEqual<IConditionSide>({ type: 'column', source: 'root', column: 'id' });
        expect(context.children[0].joins[1].conditions[0].operator).toEqual<OperatorType>('=');
        expect(context.children[0].joins[1].conditions[0].right).toEqual<IConditionSide>({ type: 'column', source: 'many', column: 'agencyId' });

        expect(context.children[0].into).toBeNull();
        expect(context.children[0].children).toHaveLength(0);

        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name],
\t[root].[id] AS [__id]
INTO #main
FROM [User] AS [root] WITH(NOLOCK)

SELECT
\t[id],
\t[name]
FROM #main

SELECT
\t[root].[name] AS [name]
FROM [usr].[UserAgency] AS [many] WITH(NOLOCK)
INNER JOIN [#main] AS [parent] WITH(NOLOCK) ON
\t[parent].[__id] = [many].[userId]
INNER JOIN [Agency] AS [root] WITH(NOLOCK) ON
\t[root].[id] = [many].[agencyId]
        `.trim());
    });
});
