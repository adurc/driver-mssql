import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { FindQueryBuilder } from '../../query-builders/find.query-builder';
import { FindContextQueryBuilder, IColumnQueryBuilder, IConditionSide, ITableAccessor, OperatorType } from '../../query-builders/context.query-builder';
import { bagEntities } from '../mocks/bag-entities';

describe('query builder find tests', () => {
    it('basic select query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels(models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);

        expect(context).toEqual<FindContextQueryBuilder>(Object.assign(new FindContextQueryBuilder(), {
            from: { table: 'Fake', as: 'root' },
            columns: [
                { source: 'root', name: 'id', as: 'id' },
                { source: 'root', name: 'name', as: 'name' },
            ],
            temporalColumns: [],
            into: null,
            params: {},
            joins: [],
            children: [],
        }));

        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('where for a column', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels(models);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                name: true,
            },
            where: {
                id: 1,
            } as unknown // TODO: pending to fix in core, when model is uknown, i cant pass filter
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);

        expect(context).toEqual<FindContextQueryBuilder>(Object.assign(new FindContextQueryBuilder(), {
            from: { table: 'Fake', as: 'root' },
            columns: [
                { source: 'root', name: 'name', as: 'name' },
            ],
            temporalColumns: [],
            into: null,
            params: {
                'root_id': 1,
            },
            joins: [],
            children: [],
            where: [
                {
                    left: { type: 'column', source: 'root', column: 'id' },
                    operator: '=',
                    right: { type: 'variable', name: 'root_id' },
                }
            ],
        } as Partial<FindContextQueryBuilder>));

        expect(sql).toEqual(`
SELECT
\t[root].[name] AS [name]
FROM [Fake] AS [root] WITH(NOLOCK)
WHERE
\t[root].[id] = @root_id
`.trim());
    });

    it('many to one query', () => {
        const entities = EntityConverter.fromModels(bagEntities);

        const context = FindQueryBuilder.build(entities, entities[0], {
            select: {
                id: true,
                name: true,
            },
            include: {
                profile: {
                    bio: true,
                }
            }
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(FindContextQueryBuilder);

        expect(context).toEqual<FindContextQueryBuilder>(Object.assign(new FindContextQueryBuilder(), {
            from: { table: 'User', as: 'root' },
            columns: [
                { source: 'root', name: 'id', as: 'id' },
                { source: 'root', name: 'name', as: 'name' },
                { source: 'profile', name: 'bio', as: 'profile.bio' },
            ],
            temporalColumns: [],
            params: {},
            children: [],
            into: null,
            joins: [
                {
                    type: 'inner',
                    from: {
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
                }
            ],
        }));

        expect(sql).toEqual(`
SELECT
\t[root].[id] AS [id],
\t[root].[name] AS [name],
\t[profile].[bio] AS [profile.bio]
FROM [User] AS [root] WITH(NOLOCK)
INNER JOIN [Profile] AS [profile] WITH(NOLOCK) ON
\t[profile].[userId] = [root].[id]
        `.trim());
    });

    it('one to many query', () => {
        const entities = EntityConverter.fromModels(bagEntities);

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
        expect(context.from).toEqual<ITableAccessor>({ table: 'User', as: 'root' });
        expect(context.columns).toHaveLength(2);
        expect(context.columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: 'id' });
        expect(context.columns[1]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'name', as: 'name' });
        expect(context.params).toEqual<Record<string, unknown>>({});
        expect(context.joins).toHaveLength(0);
        expect(context.temporalColumns).toHaveLength(1);
        expect(context.temporalColumns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: '__id' });
        expect(context.children).toHaveLength(1);

        expect(context.children[0].from).toEqual<ITableAccessor>({ table: 'Post', as: 'root' });
        expect(context.children[0].columns).toHaveLength(1);
        expect(context.children[0].columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'title', as: 'title' });
        expect(context.children[0].params).toEqual<Record<string, unknown>>({});
        expect(context.children[0].temporalColumns).toHaveLength(0);
        expect(context.children[0].joins).toHaveLength(1);
        expect(context.children[0].joins[0].type).toEqual('inner');
        expect(context.children[0].joins[0].from).toEqual<ITableAccessor>({ table: '#main', as: 'parent' });
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
INNER JOIN [#main] AS [parent] WITH(NOLOCK) ON
\t[parent].[__id] = [root].[authorId]
`.trim());
    });

    it('many to many query', () => {
        const entities = EntityConverter.fromModels(bagEntities);

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
        expect(context.from).toEqual<ITableAccessor>({ table: 'User', as: 'root' });
        expect(context.columns).toHaveLength(2);
        expect(context.columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: 'id' });
        expect(context.columns[1]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'name', as: 'name' });
        expect(context.params).toEqual<Record<string, unknown>>({});
        expect(context.joins).toHaveLength(0);
        expect(context.temporalColumns).toHaveLength(1);
        expect(context.temporalColumns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'id', as: '__id' });
        expect(context.children).toHaveLength(1);

        expect(context.children[0].from).toEqual<ITableAccessor>({ table: 'UserAgency', as: 'many' });
        expect(context.children[0].columns).toHaveLength(1);
        expect(context.children[0].columns[0]).toEqual<IColumnQueryBuilder>({ source: 'root', name: 'name', as: 'name' });
        expect(context.children[0].params).toEqual<Record<string, unknown>>({});
        expect(context.children[0].temporalColumns).toHaveLength(0);
        expect(context.children[0].joins).toHaveLength(2);

        expect(context.children[0].joins[0].type).toEqual('inner');
        expect(context.children[0].joins[0].from).toEqual<ITableAccessor>({ table: '#main', as: 'parent' });
        expect(context.children[0].joins[0].conditions).toHaveLength(1);
        expect(context.children[0].joins[0].conditions[0].left).toEqual<IConditionSide>({ type: 'column', source: 'parent', column: '__id' });
        expect(context.children[0].joins[0].conditions[0].operator).toEqual<OperatorType>('=');
        expect(context.children[0].joins[0].conditions[0].right).toEqual<IConditionSide>({ type: 'column', source: 'many', column: 'userId' });

        expect(context.children[0].joins[1].type).toEqual('inner');
        expect(context.children[0].joins[1].from).toEqual<ITableAccessor>({ table: 'Agency', as: 'root' });
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
FROM [UserAgency] AS [many] WITH(NOLOCK)
INNER JOIN [#main] AS [parent] WITH(NOLOCK) ON
\t[parent].[__id] = [many].[userId]
INNER JOIN [Agency] AS [root] WITH(NOLOCK) ON
\t[root].[id] = [many].[agencyId]
        `.trim());
    });
});
