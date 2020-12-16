import { ProjectionInfo, ProjectionInfoExpand } from '@adurc/core/dist/interfaces/projection';
import { SQLContext } from './context';
import { CriteriaBuilder, QueryContextBuilder } from './criteria-builder';

export class AggregateBuilder {

    public static build(
        context: SQLContext,
        projection: ProjectionInfo,
        preffix?: string,
    ): QueryContextBuilder {
        const entity = context.entities.find(x => x.info.name === projection.name);

        const aggregateField = projection.fields.find(x => x.name === 'aggregate') as ProjectionInfoExpand;
        const alias = `${preffix ? `${preffix}.` : ''}${entity.info.name}`;
        const fromTable = CriteriaBuilder.buildTableNameAccess(entity, alias);

        const queryContext: QueryContextBuilder = {
            columns: [],
            joins: [],
            from: fromTable,
            orderBy: '',
            params: {},
            wheres: [],
        };
        CriteriaBuilder.buildWhere(context, queryContext, alias, entity, projection.args.where);

        for (const field of aggregateField.fields) {
            if (field.name === 'count') {
                queryContext.columns.push('COUNT(1) AS [count]');
            } else {
                const aggregatorInfo = field as ProjectionInfoExpand;
                for (const property of aggregatorInfo.fields) {
                    const column = entity.columns.find(x => x.info.name === property.name);
                    switch (aggregatorInfo.name) {
                        case 'avg':
                            queryContext.columns.push(`AVG([${alias}].[${column.name}]) AS [avg.${column.info.name}]`);
                            break;
                    }
                }
            }
        }

        return queryContext;
    }
}