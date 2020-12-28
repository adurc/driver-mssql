
import { AdurcDeleteArgs } from '@adurc/core/dist/interfaces/client/delete.args';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { DeleteContextQueryBuilder } from './delete.context';
import { FindQueryBuilder } from './find.builder';
import { IConditionQueryBuilder } from './find.context';

export class DeleteQueryBuilder {

    static build(entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcDeleteArgs): DeleteContextQueryBuilder {
        const context = new DeleteContextQueryBuilder();

        args.where && FindQueryBuilder.buildWhere(args.where, entity, context);

        context.entity = entity;
        context.pks = entity.columns.filter(x => x.options.primary);

        if ('select' in args || 'include' in args) {
            context.tempTable = '@outputData';
            context.returning = FindQueryBuilder.build(entities, entity, { select: args.select, include: args.include });
            context.returning.joins = [
                {
                    type: 'inner',
                    from: { type: 'temporal-table', object: '@outputData', as: 'sourceData' },
                    conditions: context.pks.map<IConditionQueryBuilder>(x => ({
                        left: {
                            type: 'column',
                            source: 'sourceData',
                            column: x.columnName,
                        },
                        operator: '=',
                        right: {
                            type: 'column',
                            source: context.returning.from.as,
                            column: x.columnName,
                        },
                    })),
                },
                ...context.returning.joins,
            ];
        }

        return context;
    }

}
