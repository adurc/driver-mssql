import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import mssql from 'mssql';
import { MSSQLEntity } from './interfaces/mssql-entity';

export class RecordsetConverter {

    static convertResult(entity: MSSQLEntity, args: AdurcFindManyArgs, result: mssql.IResult<Record<string, unknown>>): unknown[] {
        return this.convertEntityRecordset(entity, args, result, 0);
    }


    static convertEntityRecordset(
        entity: MSSQLEntity,
        args: AdurcFindManyArgs,
        result: mssql.IResult<Record<string, unknown>>,
        recordsetOffset: number,
        parentRecordPk?: Record<string, unknown>,
    ): unknown[] {
        const output: unknown[] = [];
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
                item[include] = this.convertEntityRecordsetRowSelect(row, value, relation.info.name + '.');
            } else if (relation.type === 'oneToMany' || relation.type === 'manyToMany') {
                const pkRecord: Record<string, unknown> = {};
                for (const pk of entity.columns.filter(x => x.primary)) {
                    pkRecord[pk.info.name] = row['__' + pk.info.name];
                }
                item[include] = this.convertEntityRecordset(relation.joinEntity, value, result, recordsetOffset + 1, pkRecord);
            }
        }

        return item;
    }

}