export interface IColumnQueryBuilder {
    source?: string;
    as?: string;
    name: string;
}

export interface IAliasAccessor {
    as: string;
}


export interface ITableAccessor {
    type: 'table'
    database?: string;
    schema?: string;
    table: string;
}

export type ITableAliasAccessor = ITableAccessor & Partial<IAliasAccessor>;

export interface ITemporalTableAccessor {
    type: 'temporal-table'
    object: string;
}

export type ITemporalTableAliasAccessor = ITemporalTableAccessor & IAliasAccessor;

export type OperatorType = '=';

export type IConditionSide = { type: 'column', source?: string, column: string }
    | { type: 'variable', name: string };

export interface IConditionQueryBuilder {
    left: IConditionSide | number | string;
    operator: OperatorType;
    right: IConditionSide | number | string;
}

export type JoinType = 'left' | 'inner';

export interface IJoinQueryBuilder {
    type: JoinType;
    from: ITableAliasAccessor | ITemporalTableAliasAccessor;
    conditions: IConditionQueryBuilder[];
}

export interface ITreeCondition {
    ands: Condition[];
    ors: Condition[];
}

export type Condition = (IConditionQueryBuilder | ITreeCondition);

export type TableColumnAccessor = { source: string, name: string };

export type TableColumnOrder = TableColumnAccessor & { direction: 'ASC' | 'DESC' };

export class FindContextQueryBuilder {
    public params: Record<string, unknown>;
    public columns: IColumnQueryBuilder[];
    public temporalColumns: IColumnQueryBuilder[];
    public from: ITableAliasAccessor;
    public joins: IJoinQueryBuilder[];
    public into: string | null;
    public where: Condition[];
    public orderBy: TableColumnOrder[];
    public skip?: number;
    public take?: number;

    public children: FindContextQueryBuilder[];

    constructor() {
        this.params = {};
        this.columns = [];
        this.temporalColumns = [];
        this.joins = [];
        this.from = null;
        this.children = [];
        this.into = null;
        this.where = [];
        this.orderBy = [];
    }

    public toSql(): string {
        if ((this.columns.length + this.temporalColumns.length) === 0) {
            throw new Error('Required at least one column projection');
        }

        if (this.from === null) {
            throw new Error('Required from');
        }

        const chunks: string[] = [];

        chunks.push('SELECT');

        if (this.skip === undefined && this.take !== undefined) {
            chunks.push(`\tTOP ${this.take}`);
        }

        const columns: string[] = [];
        for (const column of this.columns) {
            columns.push('\t' + this.toSqlColumn(column));
        }

        for (const column of this.temporalColumns) {
            columns.push('\t' + this.toSqlColumn(column));
        }

        chunks.push(columns.join(',\n'));

        if (this.into) {
            chunks.push(`INTO ${this.into}`);
        }

        chunks.push(`FROM ${this.toSqlTableAccessor(this.from)}`);

        for (const join of this.joins) {
            chunks.push(`${join.type.toUpperCase()} JOIN ${join.from.type === 'table' ? this.toSqlTableAccessor(join.from) : this.toSqlTemporalTableAccessor(join.from)} ON`);
            for (const condition of join.conditions) {
                chunks.push(`\t${this.toSqlCondition(condition)}`);
            }
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

        if (this.orderBy.length > 0) {
            chunks.push(`ORDER BY ${this.orderBy.map(x => `${this.toSqlColumn(x)} ${x.direction === 'ASC' ? 'ASC' : 'DESC'}`).join(',')}`);

            if (this.skip !== undefined) {
                chunks.push(`OFFSET ${this.skip} ROWS`);
                if (this.take !== undefined) {
                    chunks.push(`FETCH NEXT ${this.take} ROWS ONLY`);
                }
            }
        }

        if (this.into) {
            const columns: string[] = [];
            for (const column of this.columns) {
                columns.push(`\t[${column.as}]`);
            }

            chunks.push('');
            chunks.push('SELECT');
            chunks.push(columns.join(',\n'));
            chunks.push(`FROM ${this.into}`);
        }

        for (const child of this.children) {
            chunks.push('');
            chunks.push(child.toSql());
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

    private toSqlTemporalTableAccessor(table: ITemporalTableAliasAccessor): string {
        let tempFrom = table.object;
        if ('as' in table) tempFrom += ` AS [${table.as}]`;
        return tempFrom;
    }

    private toSqlColumn(column: IColumnQueryBuilder): string {
        let temp = '';
        if (column.source) temp += `[${column.source}].`;
        temp += `[${column.name}]`;
        if (column.as) temp += ` AS [${column.as}]`;
        return temp;
    }
}