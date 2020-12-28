
import { AdurcCreateArgs } from '@adurc/core/dist/interfaces/client/create.args';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { CreateContextQueryBuilder } from './create.context';
import { FindQueryBuilder } from './find.builder';
import { IConditionQueryBuilder } from './find.context';

export class CreateQueryBuilder {

    static build(entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcCreateArgs): CreateContextQueryBuilder {
        const context = new CreateContextQueryBuilder();

        context.entity = entity;
        context.pks = entity.columns.filter(x => x.options.primary);

        for (const object of args.data) {
            const row: Record<string, unknown> = {};

            for (const fieldName in object) {
                const value = object[fieldName];
                const column = entity.columns.find(x => x.info.name === fieldName);
                if (column) {
                    row[column.columnName] = value;
                } else {
                    const relation = entity.relations.find(x => x.info.name === fieldName);
                    if (relation) {
                        // switch (relation.type) {
                        //     case 'manyToOne':
                        //         break;
                        // }
                        // TODO: Pending implementation
                        throw new Error('Pending implementation create relations');
                    } else {
                        throw new Error(`Unexpected field name ${fieldName}`);
                    }
                }
            }

            context.rows.push(row);
        }

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
