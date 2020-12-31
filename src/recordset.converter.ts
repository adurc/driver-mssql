import { AdurcAggregateArgs } from '@adurc/core/dist/interfaces/client/aggregate.args';
import { AggregateResult } from '@adurc/core/dist/interfaces/client/aggregate.result';
import { BatchResult } from '@adurc/core/dist/interfaces/client/batch.result';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { AdurcModelInclude } from '@adurc/core/dist/interfaces/client/include';
import { AdurcModelUntyped } from '@adurc/core/dist/interfaces/client/model';
import { AdurcModelSelect, AdurcModelSelectUntyped } from '@adurc/core/dist/interfaces/client/select';
import mssql from 'mssql';
import { MSSQLEntity } from './interfaces/mssql-entity';

export class RecordsetConverter {
    static convertMutationMany(entity: MSSQLEntity, args: { select?: AdurcModelSelect<AdurcModelUntyped>, include?: AdurcModelInclude<AdurcModelUntyped> }, result: mssql.IResult<Record<string, unknown>>): BatchResult {
        const output: BatchResult = {
            count: result.rowsAffected.reduce((a, b) => a + b, 0),
        };

        if ('include' in args || 'select' in args) {
            output.returning = this.convertFindMany(entity, {
                include: args.include,
                select: args.select,
            }, result);
        }

        return output;
    }

    static convertAggregate(entity: MSSQLEntity, args: AdurcAggregateArgs, result: mssql.IResult<Record<string, unknown>>): AggregateResult {
        const output: AggregateResult = {};

        const record = result.recordset[0];

        if ('count' in args) {
            output.count = record.count as number;
        }

        for (const arg in args) {
            if (arg === 'count') continue;
        }

        return output;
    }

    static convertFindMany(entity: MSSQLEntity, args: AdurcFindManyArgs, result: mssql.IResult<Record<string, unknown>>): AdurcModelUntyped[] {
        return this.convertEntityRecordset(entity, args, result, 0);
    }


    static convertEntityRecordset(
        entity: MSSQLEntity,
        args: AdurcFindManyArgs,
        result: mssql.IResult<Record<string, unknown>>,
        recordsetOffset: number,
        parentRecordPk?: Record<string, unknown>,
    ): AdurcModelUntyped[] {
        const output: AdurcModelUntyped[] = [];
        const recordset = result.recordsets[recordsetOffset];

        for (const row of recordset) {
            let distinct = false;
            for (const pk in parentRecordPk) {
                if (row['__parent_' + pk] !== parentRecordPk[pk]) {
                    distinct = true;
                    break;
                }
            }
            if (distinct) {
                continue;
            }
            output.push(this.convertEntityRecordsetRow(entity, args, result, recordsetOffset, row));
        }

        return output;
    }

    static convertEntityRecordsetRowSelect(row: Record<string, unknown>, select: Record<string, boolean>, preffix?: string): Record<string, unknown> {
        const item: Record<string, unknown> = {};
        for (const field in select) {
            item[field] = row[(preffix ?? '') + field];
        }
        return item;
    }

    static convertEntityRecordsetRow(entity: MSSQLEntity, args: AdurcFindManyArgs, result: mssql.IResult<Record<string, unknown>>, recordsetOffset: number, row: Record<string, unknown>): Record<string, unknown> {
        const item: Record<string, unknown> = {
            ...this.convertEntityRecordsetRowSelect(row, args.select),
        };

        for (const include in args.include) {
            const relation = entity.relations.find(x => x.info.name === include);
            const value = args.include[include];
            if (relation.type === 'manyToOne') {
                if (typeof value === 'object') {
                    item[include] = this.convertEntityRecordsetRowSelect(row, value as AdurcModelSelectUntyped, relation.info.name + '.');
                } else {
                    throw new Error('Pending implement projection for all object when value is true');
                }
            } else if (relation.type === 'oneToMany' || relation.type === 'manyToMany') {
                const pkRecord: Record<string, unknown> = {};
                for (const pk of entity.columns.filter(x => x.options.primary)) {
                    pkRecord[pk.info.name] = row['__' + pk.info.name];
                }
                if (typeof value === 'object') {
                    item[include] = this.convertEntityRecordset(relation.joinEntity, value, result, recordsetOffset + 1, pkRecord);
                } else {
                    throw new Error('Pending implement projection for all object when value is true');
                }
            }
        }

        return item;
    }

}