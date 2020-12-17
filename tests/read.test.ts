import { AdurcContext } from '@adurc/core';
import { ProjectionInfo } from '@adurc/core/dist/interfaces/projection';
import { SQLContext } from '../src/context';
import { CriteriaBuilder } from '../src/criteria-builder';
import { entityTranformFromModel } from '../src/entity-transformer';
import { AdurcModelId } from './mocks/adurc-model-id';

describe('read tests', () => {
    it('query with order by', () => {
        const context: AdurcContext = { models: [AdurcModelId] };
        const entity = entityTranformFromModel(context, AdurcModelId);
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
});