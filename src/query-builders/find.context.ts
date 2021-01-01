import { WhereBuilder } from './where.builder';

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

export interface IObjectAccessor {
    type: 'object'
    name: string;
}

export type IObjectAliasAccessor = IObjectAccessor & IAliasAccessor;

export type OperatorType = '=' | 'in';

export type IConditionSide = { type: 'column', source?: string, column: string }
    | { type: 'variable', name: string };

export type IConditionQueryBuilder = {
    left: IConditionSide | number | string
    operator: OperatorType;
} & (
        { operator: 'in', right: IConditionSide[] }
        | { operator: '=', right: IConditionSide | number | string }
    )


export type JoinType = 'left' | 'inner';

export interface IJoinQueryBuilder {
    type: JoinType;
    from: ITableAliasAccessor | IObjectAliasAccessor;
    conditions: IConditionQueryBuilder[];
}

export interface ITreeCondition {
    ands: Condition[];
    ors: Condition[];
}

export type Condition = (IConditionQueryBuilder | ITreeCondition);

export type TableColumnAccessor = { source: string, name: string };

export type TableColumnOrder = TableColumnAccessor & { direction: 'ASC' | 'DESC' };

export interface IWherableQueryBuilder {
    where: Condition[];
    params: Record<string, unknown>;
}

export interface IOrderableQueryBuilder {
    orderBy: TableColumnOrder[];
}

export interface IPaginationQueryBuilder {
    skip?: number;
    take?: number;
}

export class FindContextQueryBuilder implements IWherableQueryBuilder, IOrderableQueryBuilder, IPaginationQueryBuilder {
    public params: Record<string, unknown>;
    public columns: IColumnQueryBuilder[];
    public temporalColumns: IColumnQueryBuilder[];
    public from: ITableAliasAccessor | IObjectAliasAccessor;
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

        chunks.push(`FROM ${this.toSqlAccessor(this.from)}`);

        for (const join of this.joins) {
            chunks.push(`${join.type.toUpperCase()} JOIN ${join.from.type === 'table' ? this.toSqlTableAccessor(join.from) : this.toSqlObjectAccessor(join.from)} ON`);
            chunks.push(WhereBuilder.conditionsToSql(join.conditions));
        }

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



    private toSqlAccessor(obj: ITableAliasAccessor | IObjectAliasAccessor): string {
        switch (obj.type) {
            case 'table':
                return this.toSqlTableAccessor(obj);
            case 'object':
                return this.toSqlObjectAccessor(obj);
        }
    }

    private toSqlTableAccessor(table: ITableAliasAccessor): string {
        let tempFrom = '';
        if (table.database) tempFrom += `[${table.database}].`;
        if (table.schema) tempFrom += `[${table.schema}].`;
        tempFrom += `[${table.table}]`;
        if ('as' in table) tempFrom += ` AS [${table.as}] WITH(NOLOCK)`;
        return tempFrom;
    }

    private toSqlObjectAccessor(table: IObjectAliasAccessor): string {
        let tempFrom = table.name;
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