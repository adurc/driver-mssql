import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { EntityConverter } from '../../entity.converter';
import { SimpleAdurcModel } from '../mocks/simple-adurc-model';
import { AggregateQueryBuilder } from '../../query-builders/aggregate.builder';
import { AggregateContextQueryBuilder } from '../../query-builders/aggregate.context';

describe('query builder aggregate tests', () => {
    it('count aggregate query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = AggregateQueryBuilder.build(entities, entities[0], {
            count: true,
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(AggregateContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'Fake', as: 'root' });
        expect(context.count).toBe(true);

        expect(sql).toEqual(`
SELECT
\tCOUNT(*) AS [count]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('min aggregate query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = AggregateQueryBuilder.build(entities, entities[0], {
            min: {
                id: true,
            },
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(AggregateContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'Fake', as: 'root' });
        expect(context.min).toHaveLength(1);
        expect(context.min[0]).toStrictEqual({ source: 'root', name: 'id', as: 'min.id' });

        expect(sql).toEqual(`
SELECT
\tMIN([root].[id]) AS [min.id]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('max aggregate query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = AggregateQueryBuilder.build(entities, entities[0], {
            max: {
                id: true,
            },
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(AggregateContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'Fake', as: 'root' });
        expect(context.max).toHaveLength(1);
        expect(context.max[0]).toStrictEqual({ source: 'root', name: 'id', as: 'max.id' });

        expect(sql).toEqual(`
SELECT
\tMAX([root].[id]) AS [max.id]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('sum aggregate query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = AggregateQueryBuilder.build(entities, entities[0], {
            sum: {
                id: true,
            },
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(AggregateContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'Fake', as: 'root' });
        expect(context.sum).toHaveLength(1);
        expect(context.sum[0]).toStrictEqual({ source: 'root', name: 'id', as: 'sum.id' });

        expect(sql).toEqual(`
SELECT
\tSUM([root].[id]) AS [sum.id]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

    it('avg aggregate query', () => {
        const models: AdurcModel[] = [SimpleAdurcModel];
        const entities = EntityConverter.fromModels('mssql', models);

        const context = AggregateQueryBuilder.build(entities, entities[0], {
            avg: {
                id: true,
            },
        });

        const sql = context.toSql();

        expect(context).toBeInstanceOf(AggregateContextQueryBuilder);

        expect(context.from).toEqual({ type: 'table', table: 'Fake', as: 'root' });
        expect(context.avg).toHaveLength(1);
        expect(context.avg[0]).toStrictEqual({ source: 'root', name: 'id', as: 'avg.id' });

        expect(sql).toEqual(`
SELECT
\tAVG([root].[id]) AS [avg.id]
FROM [Fake] AS [root] WITH(NOLOCK)
`.trim());
    });

});
