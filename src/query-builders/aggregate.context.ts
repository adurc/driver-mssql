import { Condition, IColumnQueryBuilder, IOrderableQueryBuilder, IPaginationQueryBuilder, ITableAliasAccessor, IWherableQueryBuilder, TableColumnOrder } from './find.context';
import { WhereBuilder } from './where.builder';

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
            chunks.push(WhereBuilder.conditionsToSql(this.where));
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