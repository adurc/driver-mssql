import { ProjectionInfoExpand } from '@adurc/core/dist/interfaces/projection';
import { SQLContext } from './context';
import { CriteriaBuilder, QueryContextBuilder } from './criteria-builder';
import { SQLColumn, SQLEntity, SQLRelation } from './interfaces';

export interface UpdateContextTempBuilder {
    tableName: string;
    pks: SQLColumn[];
}

export interface UpdateContextBuilder {
    tempTables: { [table: string]: UpdateContextTempBuilder };
    chunks: string[];
    params: Record<string, unknown>;
}

export interface UpdateContextParentInfo {
    tempTable: UpdateContextTempBuilder;
    relation: SQLRelation;
    object: Record<string, unknown>;
}

export class UpdateBuilder {

    public static build(
        context: SQLContext,
        entity: SQLEntity,
        projection: ProjectionInfoExpand,
    ): UpdateContextBuilder {
        const output: UpdateContextBuilder = {
            tempTables: {},
            chunks: [],
            params: {},
        };

        const set = projection.args._set;
        const fieldNames = Object.getOwnPropertyNames(set);
        const alias = 'root';

        const queryContext: QueryContextBuilder = {
            joins: [],
            columns: [],
            from: '',
            orderBy: '',
            params: {},
            wheres: [],
        };
        CriteriaBuilder.buildWhere(context, queryContext, alias, entity, projection.args.where);

        const pks = entity.columns.filter(x => x.isPrimary);
        output.chunks.push(`DECLARE @${entity.info.name} As table (${pks.map(x => `${x.name} ${this.printSqlType(x.type)}`).join(', ')})`);

        output.chunks.push(`UPDATE [${alias}]`);
        const setColumns = fieldNames.map(fieldName => {
            const column = entity.columns.find(x => x.info.name === fieldName);
            output.params[column.info.name] = set[fieldName];
            return `[${column.name}] = @${column.info.name}`;
        });
        output.chunks.push(`SET ${setColumns.join(', ')}`);
        output.chunks.push(`OUTPUT ${pks.map(c => `INSERTED.[${c.name}]`).join(', ')} INTO @${entity.info.name}(${pks.map(c => `[${c.name}]`).join(', ')})`);
        output.chunks.push(`FROM ${this.buildTableNameAccess(entity, alias)}`);
        queryContext.joins.forEach(x => output.chunks.push(x));
        if (queryContext.wheres.length > 0) {
            output.chunks.push(`WHERE ${queryContext.wheres.join(' AND ')}`);
        }
        output.params = { ...output.params, ...queryContext.params };
        console.log('output update', output);

        return output;
    }

    public static buildTableNameAccess(entity: SQLEntity, alias: string): string {
        return (entity.schema ? `[${entity.schema}].` : '')
            + `[${entity.name}] AS [${alias}]`
            + ' WITH(ROWLOCK)';
    }

    public static printSqlType(type: string): string {
        let length: number | null = null;
        switch (type) {
            case 'varchar':
            case 'varbinary':
                length = 6000;
                break;
        }
        return type + (length ? `(${length})` : '');
    }
}
