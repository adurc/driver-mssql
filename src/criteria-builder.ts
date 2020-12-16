import { ProjectionInfoExpand } from '@adurc/core/dist/interfaces/projection';
import { SQLContext } from './context';
import { IRelationProjection, SQLColumn, SQLEntity, SQLRelation } from './interfaces';

export interface QueryContextBuilder {
    params: Record<string, unknown>;
    into?: string;
    from: string;
    columns: string[];
    joins: string[];
    wheres: string[];
    orderBy: string;
    top?: number;
    offset?: number;
    fetch?: number;
}

export interface QueryParentContext {
    parentNavigationPath: string;
    parentTempTable: string;
    parentQueryContext: QueryContextBuilder;
    parentRelation: SQLRelation;
}

export class CriteriaBuilder {

    public static build(
        context: SQLContext,
        projection: ProjectionInfoExpand,
        parentContext?: QueryParentContext,
        parentVariableTable?: string,
    ): QueryContextBuilder[] {
        projection.args = projection.args ?? {};

        const queryContexts: QueryContextBuilder[] = [];

        const entity = parentContext
            ? context.entities.find(x => x.info === parentContext.parentRelation.dest.model)
            : context.entities.find(x => x.info.name === projection.name);

        const possibleInto: string = parentContext ? `${parentContext.parentTempTable}_${parentContext.parentRelation.field.name}` : 'root';
        const fromTable: string = this.buildTableNameAccess(entity, 'root');
        const sortField = this.getSortField(entity, projection);
        const columns = this.getColumnsSelected(entity, projection);
        const oneToManyRelations = this.getOneToManyRelationsSelected(entity, projection);
        const manyToOneRelations = this.getManyToOneRelationsSelected(entity, projection);
        const pks = entity.columns.filter(x => x.isPrimary);

        let parentAlias = '';
        if (parentContext) {
            const sourceEntity = context.entities.find(x => x.info.name === parentContext.parentRelation.source.model.name);
            const sourceColumn = sourceEntity.columns.find(x => x.info.name === parentContext.parentRelation.source.field.name);
            parentAlias = parentContext.parentNavigationPath.length > 0 ? `${parentContext.parentNavigationPath}` : '';
            parentContext.parentQueryContext.columns.push(`${parentAlias.length > 0 ? `[${parentAlias}]` : '[root]'}.[${sourceColumn.name}] AS [${parentAlias}__${parentContext.parentRelation.source.field.name}]`);
        }

        let destField: SQLColumn = null;
        if (parentContext) {
            destField = entity.columns.find(x => x.info.name === parentContext.parentRelation.dest.field.name);
        }

        const queryContext: QueryContextBuilder = {
            params: {},
            from: fromTable,
            columns: [
                ...columns.map(column => `[root].[${column.name}] AS [${column.info.name}]`)
            ],
            joins: parentContext
                ? [`INNER JOIN #${parentContext.parentTempTable} [parent] on [parent].[${parentAlias}__${parentContext.parentRelation.source.field.name}] = [root].[${destField.name}]`]
                : (parentVariableTable
                    ? [`INNER JOIN @${parentVariableTable} [parent] on ${pks.map(x => `[parent].[${x.name}] = [root].[${x.name}]`).join(' AND ')}`]
                    : []),
            wheres: [],
            orderBy: `[root].[${sortField.name}] ${projection.args.sortOrder === 'DESC' ? 'DESC' : 'ASC'}`
        };

        if ('limit' in projection.args && !('offset' in projection.args)) {
            queryContext.top = projection.args.limit as number;
        } else if ('limit' in projection.args && 'offset' in projection.args) {
            queryContext.offset = projection.args.offset as number;
            queryContext.fetch = projection.args.limit as number;
        }

        if (parentContext) {
            queryContext.columns.push(`[parent].[${parentAlias}__${parentContext.parentRelation.source.field.name}] AS [__parent${parentAlias.length > 0 ? `__${parentAlias}` : ''}__${parentContext.parentRelation.source.field.name}]`);
        }

        queryContexts.push(queryContext);

        const childParentContext = {
            parentQueryContext: queryContext,
            parentTempTable: possibleInto,
            parentNavigationPath: '',
        };

        this.buildWhere(context, queryContext, 'root', entity, projection.args.where);

        for (const rel of manyToOneRelations) {
            const extraContexts = this.buildManyToOneRelations(context, queryContext, 'root', rel.projection as ProjectionInfoExpand, {
                ...childParentContext,
                parentRelation: rel.relation
            });
            extraContexts.forEach(x => queryContexts.push(x));
        }

        for (const rel of oneToManyRelations) {
            const extraContexts = this.build(context, rel.projection as ProjectionInfoExpand, {
                ...childParentContext,
                parentRelation: rel.relation,
            });
            extraContexts.forEach(x => queryContexts.push(x));
        }

        if (queryContexts.length > 1) {
            queryContext.into = possibleInto;
        }

        return queryContexts;
    }

    private static buildManyToOneRelations(
        context: SQLContext,
        queryContext: QueryContextBuilder,
        mapName: string,
        projection: ProjectionInfoExpand,
        parentContext: QueryParentContext,
    ): QueryContextBuilder[] {
        const queryContexts: QueryContextBuilder[] = [];

        const alias = `${parentContext.parentNavigationPath.length > 0 ? `${parentContext.parentNavigationPath}.` : ''}${parentContext.parentRelation.field.name}`;

        const childParentContext = {
            ...parentContext,
            parentNavigationPath: alias,
        };

        const sourceEntity = context.entities.find(x => x.info === parentContext.parentRelation.source.model);
        const destEntity = context.entities.find(x => x.info === parentContext.parentRelation.dest.model);
        const fromTable = this.buildTableNameAccess(destEntity, alias);
        const columns = this.getColumnsSelected(destEntity, projection);
        const oneToManyRelations = this.getOneToManyRelationsSelected(destEntity, projection);
        const manyToOneRelations = this.getManyToOneRelationsSelected(destEntity, projection);

        const sourceColumn = sourceEntity.columns.find(x => x.info.name === parentContext.parentRelation.source.field.name);
        const destColumn = destEntity.columns.find(x => x.info.name === parentContext.parentRelation.dest.field.name);

        queryContext.joins.push(`${parentContext.parentRelation.nonNull ? 'INNER' : 'LEFT'} JOIN ${fromTable} ON [${alias}].[${destColumn.name}] = [${mapName}].[${sourceColumn.name}]`);

        columns
            .map(column => `[${alias}].[${column.name}] AS [${alias}.${column.info.name}]`)
            .forEach(x => queryContext.columns.push(x));

        for (const rel of manyToOneRelations) {
            this.buildManyToOneRelations(context, queryContext, alias, rel.projection as ProjectionInfoExpand, {
                ...childParentContext,
                parentRelation: rel.relation,
            });
        }

        for (const rel of oneToManyRelations) {
            const extraContexts = this.build(context, rel.projection as ProjectionInfoExpand, {
                ...childParentContext,
                parentRelation: rel.relation,
            });
            extraContexts.forEach(x => queryContexts.push(x));
        }

        return queryContexts;
    }

    public static buildWhere(
        context: SQLContext,
        queryContext: QueryContextBuilder,
        mapName: string,
        model: SQLEntity,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        where: any, // eslint-disable-line @typescript-eslint/no-explicit-any
        preffix?: string,
    ): void {
        if (!where) {
            return;
        }

        for (const property in where) {
            if (property === '_and') {
                for (const and of where[property]) {
                    this.buildWhere(context, queryContext, mapName, model, and, preffix);
                }
                continue;
            }
            if (property === '_or') {
                // TODO: Hay que implementar la posibilidad de definir ands y ors de forma compleja
                throw new Error('Not implemented');
            }

            const column = model.columns.find(x => x.info.name === property);
            const manyToOne = model.manyToOnes.find(x => x.field.name === property);

            if (!column && !manyToOne) {
                throw new Error('Unexpected property name: ' + property);
            }

            const filterInfo = where[property];

            if (manyToOne) {
                const entityRel = context.entities.find(x => x.info === manyToOne.dest.model);
                const alias = `${preffix ? `${preffix}.` : ''}${manyToOne.field.name}`;
                const fromTable = this.buildTableNameAccess(entityRel, alias);
                queryContext.joins.push(`${manyToOne.nonNull ? 'INNER' : 'LEFT'} JOIN ${fromTable} ON [${alias}].[${manyToOne.dest.field.name}] = [${mapName}].[${manyToOne.source.field.name}]`);
                this.buildWhere(context, queryContext, alias, entityRel, filterInfo, alias);
            } else if (column) {
                for (const filterOperator in filterInfo) {
                    const value = filterInfo[filterOperator];
                    const variableName = `${mapName.replace(/\./gmi, '_')}_${property}${filterOperator}`;

                    if (value instanceof Array) {
                        value.map((x, index) => queryContext.params[variableName + `_${index}`] = x);
                    } else {
                        queryContext.params[variableName] = value;
                    }

                    switch (filterOperator) {
                        case '_eq':
                            queryContext.wheres.push(`[${mapName}].[${column.name}] = @${variableName}`);
                            break;
                        case '_in':
                            if (!(value instanceof Array)) {
                                throw new Error('Operator _in expects an array');
                            }
                            queryContext.wheres.push(`[${mapName}].[${column.name}] in (${value.map((_x, i) => `@${variableName}_${i}`).join(',')})`);
                            break;
                        default:
                            throw new Error('Operator not implemented: ' + filterOperator);
                    }
                }
            }
        }
    }

    private static getManyToOneRelationsSelected(entity: SQLEntity, projection: ProjectionInfoExpand): IRelationProjection[] {
        return projection.fields
            .filter(x => x.type === 'expand')
            .map(x => ({ relation: entity.manyToOnes.find(c => c.field.name === x.name), projection: x }))
            .filter(x => x.relation !== undefined);
    }

    private static getOneToManyRelationsSelected(entity: SQLEntity, projection: ProjectionInfoExpand): IRelationProjection[] {
        return projection.fields
            .filter(x => x.type === 'expand')
            .map(x => ({ relation: entity.oneToManies.find(c => c.field.name === x.name), projection: x }))
            .filter(x => x.relation !== undefined);
    }

    private static getColumnsSelected(entity: SQLEntity, projection: ProjectionInfoExpand) {
        return projection.fields
            .filter(x => x.type === 'field')
            .map(x => entity.columns.find(c => c.info.name === x.name));
    }

    private static getSortField(entity: SQLEntity, projection: ProjectionInfoExpand) {
        const primaryColumn = entity.columns.find(x => x.info.directives.findIndex(c => c.name === 'pk') >= 0);

        let sortField = projection.args.sortField
            ? entity.columns.find(x => x.info.name === projection.args.sortField)
            : null;

        if (!sortField) {
            sortField = primaryColumn;
        }

        if (!sortField) {
            sortField = entity.columns[0];
        }

        return sortField;
    }

    public static buildTableNameAccess(entity: SQLEntity, alias: string): string {
        return (entity.schema ? `[${entity.schema}].` : '')
            + `[${entity.name}] AS [${alias}]`
            + ' WITH(NOLOCK)';
    }
}