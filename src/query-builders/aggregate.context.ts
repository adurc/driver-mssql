import { Condition, IColumnQueryBuilder, IConditionQueryBuilder, IConditionSide, IOrderableQueryBuilder, IPaginationQueryBuilder, ITableAliasAccessor, IWherableQueryBuilder, TableColumnOrder } from './find.context';

export class AggregateContextQueryBuilder implements IWherableQueryBuilder, IOrderableQueryBuilder, IPaginationQueryBuilder {

    public params: Record<string, unknown>;
    public where: Condition[];
    public orderBy: TableColumnOrder[];
    public skip?: number;
    public take?: number;
    public from: ITableAliasAccessor;
    public count: boolean;
    public avg: IColumnQueryBuilder[];
    public max: IColumnQueryBuilder[];
    public min: IColumnQueryBuilder[];
    public sum: IColumnQueryBuilder[];

    constructor() {
        this.where = [];
        this.params = {};
        this.orderBy = [];
        this.avg = [];
        this.max = [];
        this.min = [];
        this.sum = [];
    }

    public toSql(): string {
        if (this.from === null) {
            throw new Error('Required from');
        }

        const chunks: string[] = [];

        chunks.push('SELECT');

        if (this.skip === undefined && this.take !== undefined) {
            chunks.push(`\tTOP ${this.take}`);
        }

        const outputColumns: string[] = [];

        if (this.count) {
            outputColumns.push('\tCOUNT(*) AS [count]');
        }

        for (const column of this.avg) {
            outputColumns.push(`\tAVG(${this.toSqlColumn(column)}) AS [${column.as}]`);
        }

        for (const column of this.max) {
            outputColumns.push(`\tMAX(${this.toSqlColumn(column)}) AS [${column.as}]`);
        }

        for (const column of this.min) {
            outputColumns.push(`\tMIN(${this.toSqlColumn(column)}) AS [${column.as}]`);
        }

        for (const column of this.sum) {
            outputColumns.push(`\tSUM(${this.toSqlColumn(column)}) AS [${column.as}]`);
        }

        chunks.push(outputColumns.join(',\n'));

        chunks.push(`FROM ${this.toSqlTableAccessor(this.from)}`);

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

        if (this.orderBy.length > 0) {
            chunks.push(`ORDER BY ${this.orderBy.map(x => `${this.toSqlColumn(x)} ${x.direction === 'ASC' ? 'ASC' : 'DESC'}`).join(',')}`);

            if (this.skip !== undefined) {
                chunks.push(`OFFSET ${this.skip} ROWS`);
                if (this.take !== undefined) {
                    chunks.push(`FETCH NEXT ${this.take} ROWS ONLY`);
                }
            }
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

    private toSqlTableAccessor(table: ITableAliasAccessor): string {
        let tempFrom = '';
        if (table.database) tempFrom += `[${table.database}].`;
        if (table.schema) tempFrom += `[${table.schema}].`;
        tempFrom += `[${table.table}]`;
        if ('as' in table) tempFrom += ` AS [${table.as}] WITH(NOLOCK)`;
        return tempFrom;
    }

    private toSqlColumn(column: IColumnQueryBuilder): string {
        let temp = '';
        if (column.source) temp += `[${column.source}].`;
        temp += `[${column.name}]`;
        return temp;
    }

}