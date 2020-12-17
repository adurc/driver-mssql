import { AdurcContext } from '@adurc/core';
import { ProjectionInfo } from '@adurc/core/dist/interfaces/projection';
import { SQLContext } from '../src/context';
import { CriteriaBuilder } from '../src/criteria-builder';
import { entityTranformFromModel } from '../src/entity-transformer';
import { SimpleAdurcModel } from './mocks/simple-adurc-model';

describe('read tests', () => {
    it('query with order by', () => {
        const context: AdurcContext = { models: [SimpleAdurcModel] };
        const entity = entityTranformFromModel(context, SimpleAdurcModel);
        const sqlContext: SQLContext = {
            entities: [entity],
            dataServerContext: null,
        };

        const projection: ProjectionInfo = {
            type: 'expand',
            name: 'Fake',
            args: {
                'order_by': { id: 'asc' }
            }, fields: [
                { type: 'field', name: 'id' }
            ],
        };

        const queries = CriteriaBuilder.build(sqlContext, projection);

        expect(queries).toStrictEqual([{
            params: {},
            from: '[Fake] AS [root] WITH(NOLOCK)',
            columns: ['[root].[id] AS [id]'],
            joins: [],
            wheres: [],
            orderBy: '[root].[id] ASC',
        }]);
    });

    it('query with order by no pk field', () => {
        const context: AdurcContext = { models: [SimpleAdurcModel] };
        const entity = entityTranformFromModel(context, SimpleAdurcModel);
        const sqlContext: SQLContext = {
            entities: [entity],
            dataServerContext: null,
        };

        const projection: ProjectionInfo = {
            type: 'expand',
            name: 'Fake',
            args: {
                'order_by': { name: 'asc' }
            }, fields: [
                { type: 'field', name: 'id' }
            ],
        };

        const queries = CriteriaBuilder.build(sqlContext, projection);

        expect(queries).toStrictEqual([{
            params: {},
            from: '[Fake] AS [root] WITH(NOLOCK)',
            columns: ['[root].[id] AS [id]'],
            joins: [],
            wheres: [],
            orderBy: '[root].[name] ASC',
        }]);
    });
});