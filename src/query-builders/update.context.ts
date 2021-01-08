import { MSSQLColumn } from '../interfaces/mssql-column';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { Condition, FindContextQueryBuilder, IWherableQueryBuilder } from './find.context';
import { IColumnOptions, ISqlType, TYPES } from 'mssql';
import { WhereBuilder } from './where.builder';

export class UpdateContextQueryBuilder implements IWherableQueryBuilder {

    public params: Record<string, unknown>;
    public entity: MSSQLEntity;
    public pks: MSSQLColumn[];
    public set: Record<string, unknown>;
    public returning: FindContextQueryBuilder | null;
    public tempTable: string | null;
    public where: Condition[];

    constructor() {
        this.pks = [];
        this.set = {};
        this.where = [];
        this.returning = null;
        this.tempTable = null;
        this.params = {};
    }

    public toSql(): string {
        const chunks: string[] = [];

        if (this.tempTable) {
            chunks.push(`DECLARE ${this.tempTable} AS TABLE(`);
            this.pks.map(x => `\t[${x.info.accessorName}] ${this.toSqlDeclare(x.sqlType, x.options)}`).
                forEach(x => chunks.push(x));
            chunks.push(')');
            chunks.push('');
        }

        let tempFrom = '';
        if (this.entity.database) tempFrom += `[${this.entity.database}].`;
        if (this.entity.schema) tempFrom += `[${this.entity.schema}].`;
        tempFrom += `[${this.entity.tableName}] WITH(ROWLOCK)`;

        const outputColumns = this.tempTable ? this.pks.map(x => `INSERTED.[${x.columnName}]`).join(',') : null;

        const columns = Object.getOwnPropertyNames(this.set);
        chunks.push(`UPDATE ${tempFrom} SET`);
        chunks.push(columns.map(x => `\t[${x}] = ${this.toSqlValue(this.set[x])}`).join(',\n'));
        if (this.tempTable) {
            chunks.push(`OUTPUT ${outputColumns} INTO ${this.tempTable}`);
        }
        if (this.where.length > 0) {
            chunks.push('WHERE');
            chunks.push(WhereBuilder.conditionsToSql(this.where));
        }

        if (this.returning) {
            chunks.push('', this.returning.toSql());
        }

        return chunks.join('\n');
    }

    private toSqlValue(value: unknown) {
        if (typeof value === 'number') {
            return value;
        } else if (typeof value === 'string') {
            return `'${value.replace(/'/gmi, '\'\'')}'`;
        } else if (value instanceof Date) {
            return `'${value.toISOString()}'`;
        }
    }

    private toSqlDeclare(sqlType: ISqlType, options: IColumnOptions) {
        const type = sqlType.type as unknown as { declaration: string };
        const opt: IColumnOptions & { precision: number, scale: number } = options as never;

        switch (sqlType.type) {
            case TYPES.VarChar:
            case TYPES.VarBinary:
                return `${type.declaration} (${opt.length > 8000 ? 'MAX' : (opt.length == null ? 'MAX' : opt.length)})`;
            case TYPES.NVarChar:
                return `${type.declaration} (${opt.length > 4000 ? 'MAX' : (opt.length == null ? 'MAX' : opt.length)})`;
            case TYPES.Char:
            case TYPES.NChar:
            case TYPES.Binary:
                return `${type.declaration} (${opt.length == null ? 1 : options.length})`;
            case TYPES.Decimal:
            case TYPES.Numeric:
                return `${type.declaration} (${opt.precision == null ? 18 : opt.precision}, ${opt.scale == null ? 0 : opt.scale})`;
            case TYPES.Time:
            case TYPES.DateTime2:
            case TYPES.DateTimeOffset:
                return `${type.declaration} (${opt.scale == null ? 7 : opt.scale})`;
            default:
                return type.declaration;
        }
    }

}