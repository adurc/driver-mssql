
import { AdurcUpdateArgs } from '@adurc/core/dist/interfaces/client/update.args';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { FindQueryBuilder } from './find.builder';
import { IConditionQueryBuilder } from './find.context';
import { UpdateContextQueryBuilder } from './update.context';
import { WhereBuilder } from './where.builder';

export class UpdateQueryBuilder {

    static build(entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcUpdateArgs): UpdateContextQueryBuilder {
        const context = new UpdateContextQueryBuilder();

        args.where && WhereBuilder.buildWhere(args.where, entity, context);

        context.entity = entity;
        context.pks = entity.columns.filter(x => x.options.primary);

        for (const fieldName in args.set) {
            const value = args.set[fieldName];
            const column = entity.columns.find(x => x.info.name === fieldName);
            if (column) {
                context.set[column.columnName] = value;
            } else {
                const relation = entity.relations.find(x => x.info.name === fieldName);
                if (relation) {
                    throw new Error('Pending implementation create relations');
                } else {
                    throw new Error(`Unexpected field name ${fieldName}`);
                }
            }
        }

        if ('select' in args || 'include' in args) {
            context.tempTable = '@outputData';
            context.returning = FindQueryBuilder.build(entities, entity, { select: args.select, include: args.include });
            context.returning.joins = [
                {
                    type: 'inner',
                    from: { type: 'object', name: '@outputData', as: 'sourceData' },
                    conditions: context.pks.map<IConditionQueryBuilder>(x => ({
                        left: {
                            type: 'column',
                            source: 'sourceData',
                            column: x.info.name,
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
