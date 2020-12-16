export interface IColumnQueryBuilder {
    source?: string;
    as?: string;
    name: string;
}

export interface ITableAccessor {
    database?: string;
    schema?: string;
    table: string;
    as?: string;
}

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
    from: ITableAccessor;
    conditions: IConditionQueryBuilder[];
}

export interface ITreeCondition {
    ands: Condition[];
    ors: Condition[];
}

export type Condition = (IConditionQueryBuilder | ITreeCondition);



export class FindContextQueryBuilder {
    public params: Record<string, unknown>;
    public columns: IColumnQueryBuilder[];
    public temporalColumns: IColumnQueryBuilder[];
    public from: ITableAccessor | null;
    public joins: IJoinQueryBuilder[];
    public into: string | null;
    public where: Condition[];

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
            chunks.push(`${join.type.toUpperCase()} JOIN ${this.toSqlTableAccessor(join.from)} ON`);
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

    private toSqlTableAccessor(table: ITableAccessor): string {
        let tempFrom = '';
        if (table.database) tempFrom += `[${table.database}].`;
        if (table.schema) tempFrom += `[${table.schema}].`;
        tempFrom += `[${table.table}]`;
        if (table.as) tempFrom += ` AS [${table.as}] WITH(NOLOCK)`;
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