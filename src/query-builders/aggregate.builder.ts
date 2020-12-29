
import { AdurcAggregateArgs, AggregateNumber } from '@adurc/core/dist/interfaces/client/aggregate.args';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { AggregateContextQueryBuilder } from './aggregate.context';
import { FindQueryBuilder } from './find.builder';
import { IColumnQueryBuilder } from './find.context';

export class AggregateQueryBuilder {

    static build(_entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcAggregateArgs): AggregateContextQueryBuilder {
        const context = new AggregateContextQueryBuilder();

        context.from = FindQueryBuilder.buildTableAccessor(entity.tableName, 'root', entity.schema, entity.database);
        context.skip = args.skip;
        context.take = args.take;

        args.where && FindQueryBuilder.buildWhere(args.where, entity, context);
        args.orderBy && FindQueryBuilder.buildOrderBy(args.orderBy, entity, context);

        context.count = args.count === true;

        context.avg = this.buildAgrRequest('avg', 'root', entity, args.avg);
        context.max = this.buildAgrRequest('max', 'root', entity, args.max);
        context.min = this.buildAgrRequest('min', 'root', entity, args.min);
        context.sum = this.buildAgrRequest('sum', 'root', entity, args.sum);

        return context;
    }

    static buildAgrRequest(type: string, source: string, entity: MSSQLEntity, avg: AggregateNumber): IColumnQueryBuilder[] {
        const output: IColumnQueryBuilder[] = [];
        for (const field in avg) {
            const column = entity.columns.find(x => x.info.name === field);
            if (!column) {
                throw new Error(`Invalid field: ${field}, expected field as column. Relations not supported.`);
            }
            output.push({
                source,
                name: column.columnName,
                as: `${type}.${field}`,
            });
        }
        return output;
    }

}
