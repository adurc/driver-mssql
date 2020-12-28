import { MSSQLColumn } from '../interfaces/mssql-column';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { Condition, FindContextQueryBuilder, IConditionQueryBuilder, IConditionSide, IWherableQueryBuilder } from './find.context';
import { IColumnOptions, ISqlType, TYPES } from 'mssql';

export class DeleteContextQueryBuilder implements IWherableQueryBuilder {

    public params: Record<string, unknown>;
    public entity: MSSQLEntity;
    public pks: MSSQLColumn[];
    public returning: FindContextQueryBuilder | null;
    public tempTable: string | null;
    public where: Condition[];

    constructor() {
        this.pks = [];
        this.where = [];
        this.returning = null;
        this.tempTable = null;
        this.params = {};
    }

    public toSql(): string {
        const chunks: string[] = [];

        if (this.tempTable) {
            chunks.push(`DECLARE ${this.tempTable} AS TABLE(`);
            this.pks.map(x => `\t[${x.info.name}] ${this.toSqlDeclare(x.sqlType, x.options)}`).
                forEach(x => chunks.push(x));
            chunks.push(')');
            chunks.push('');
        }

        let tempFrom = '';
        if (this.entity.database) tempFrom += `[${this.entity.database}].`;
        if (this.entity.schema) tempFrom += `[${this.entity.schema}].`;
        tempFrom += `[${this.entity.tableName}] WITH(ROWLOCK)`;

        const outputColumns = this.tempTable ? this.pks.map(x => `INSERTED.[${x.columnName}]`).join(',') : null;

        chunks.push(`DELETE FROM ${tempFrom}`);
        if (this.tempTable) {
            chunks.push(`OUTPUT ${outputColumns} INTO ${this.tempTable}`);
        }
        if (this.where.length > 0) {
            chunks.push('WHERE');
            for (const condition of this.where) {
                if ('ands' in condition || 'ors' in condition) {
                    // TODO: Pending implement subtree conditions
                    throw new Error('Not implemented subtree conditions');
                } else if ('left' in condition) {
                    chunks.push(`\t${this.toSqlCondition(condition)}`);
                }
            }
        }

        if (this.returning) {
            chunks.push('', this.returning.toSql());
        }

        return chunks.join('\n');
    }

    private toSqlConditionSide(condition: IConditionSide | number | string): string {
        if (typeof condition === 'number') {
            return condition.toString();
        } else if (typeof condition === 'string') {
            return condition.replace('\'', '\'\'');
        } else if (condition.type === 'column') {
            let output = '';

            if (condition.source) {
                output = `[${condition.source}].`;
            }
            output += `[${condition.column}]`;

            return output;
        } else if (condition.type === 'variable') {
            return `@${condition.name}`;
        }
    }

    private toSqlCondition(condition: IConditionQueryBuilder): string {
        const left = this.toSqlConditionSide(condition.left);
        const right = this.toSqlConditionSide(condition.right);
        return `${left} ${condition.operator} ${right}`;
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