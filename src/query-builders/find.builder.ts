import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { AdurcModelInclude } from '@adurc/core/dist/interfaces/client/include';
import { AdurcModelSelect } from '@adurc/core/dist/interfaces/client/select';
import { AdurcModelOrderBy } from '@adurc/core/dist/interfaces/client/sort';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { MSSQLRelationManyToMany, MSSQLRelationManyToOne, MSSQLRelationOneToMany } from '../interfaces/mssql-relation';
import { FindContextQueryBuilder, IAliasAccessor, IJoinQueryBuilder, IOrderableQueryBuilder, ITableAccessor } from './find.context';
import { WhereBuilder } from './where.builder';

export class FindQueryBuilder {

    static build(_entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcFindManyArgs): FindContextQueryBuilder {
        const context = new FindContextQueryBuilder();

        context.from = this.buildTableAccessor(entity.tableName, 'root', entity.schema, entity.database);
        context.skip = args.skip;
        context.take = args.take;

        this.buildSelect(args.select, entity, context);
        args.where && WhereBuilder.buildWhere(args.where, entity, context, 'root');
        args.orderBy && this.buildOrderBy(args.orderBy, entity, context);
        args.include && this.buildInclude(args.include, entity, context);

        return context;
    }

    public static buildTableAccessor(table: string, as: string, schema?: string, database?: string,): ITableAccessor & IAliasAccessor {
        const output: ITableAccessor & IAliasAccessor = {
            type: 'table',
            table,
            as,
        };

        if (database) output.database = database;
        if (schema) output.schema = schema;

        return output;
    }

    public static buildOrderBy(orderBy: AdurcModelOrderBy<unknown>, entity: MSSQLEntity, context: IOrderableQueryBuilder): void {
        for (const field in orderBy) {
            const column = entity.columns.find(x => x.info.name === field);

            context.orderBy.push({
                source: 'root',
                name: column.columnName,
                direction: orderBy[field] === 'desc' ? 'DESC' : 'ASC',
            });
        }
    }

    public static buildSelect(select: AdurcModelSelect<unknown>, entity: MSSQLEntity, context: FindContextQueryBuilder): void {
        for (const field in select) {
            if (select[field] === false) {
                continue;
            }

            const column = entity.columns.find(x => x.info.name === field);

            context.columns.push({
                source: 'root',
                name: column.columnName,
                as: column.info.name,
            });
        }
    }

    public static buildInclude(include: AdurcModelInclude<unknown>, entity: MSSQLEntity, context: FindContextQueryBuilder): void {
        for (const field in include) {
            const value = include[field];

            if (value === false) {
                continue;
            }

            const relation = entity.relations.find(x => x.info.name === field);

            switch (relation.type) {
                case 'manyToMany':
                    this.buildManyToMany(relation, context, value);
                    break;
                case 'manyToOne':
                    this.buildManyToOne(relation, context, value);
                    break;
                case 'oneToMany':
                    this.buildOneToMany(relation, context, value);
                    break;
                default:
                    throw new Error(`Relation type ${(relation as { type: string }).type} not implemented`);
            }
        }
    }

    public static buildManyToMany(relation: MSSQLRelationManyToMany, context: FindContextQueryBuilder, value: AdurcFindManyArgs): void {
        context.into = '#main';

        context.temporalColumns.push({
            source: 'root',
            name: relation.joinColumn,
            as: `__${relation.joinColumn}`,
        });

        const relationContext = new FindContextQueryBuilder();
        relationContext.from = this.buildTableAccessor(relation.manyEntity.tableName, 'many', relation.manyEntity.schema, relation.manyEntity.database);

        relationContext.joins.push({
            type: 'inner',
            from: {
                type: 'table',
                table: '#main',
                as: 'parent',
            },
            conditions: [
                {
                    left: { type: 'column', source: 'parent', column: `__${relation.joinColumn}` },
                    operator: '=',
                    right: { type: 'column', source: 'many', column: relation.manyJoinColumn }
                }
            ],
        });

        relationContext.joins.push({
            type: 'inner',
            from: this.buildTableAccessor(relation.joinEntity.tableName, 'root', relation.joinEntity.schema, relation.joinEntity.database),
            conditions: [
                {
                    left: { type: 'column', source: 'root', column: relation.inverseColumn },
                    operator: '=',
                    right: { type: 'column', source: 'many', column: relation.manyInverseColumn },
                }
            ],
        });

        for (const relationSelectField in value.select) {
            if (value.select[relationSelectField] !== true) {
                continue;
            }

            const column = relation.joinEntity.columns.find(x => x.info.name === relationSelectField);

            relationContext.columns.push({
                source: 'root',
                name: column.columnName,
                as: column.info.name,
            });
        }

        context.children.push(relationContext);
    }

    public static buildOneToMany(relation: MSSQLRelationOneToMany, context: FindContextQueryBuilder, value: AdurcFindManyArgs): void {
        context.into = '#main';

        context.temporalColumns.push({
            source: 'root',
            name: relation.joinColumn,
            as: `__${relation.joinColumn}`,
        });

        const relationContext = new FindContextQueryBuilder();
        relationContext.from = {
            type: 'table',
            table: relation.joinEntity.tableName,
            as: 'root',
        };

        if (relation.joinEntity.database) relationContext.from.database = relation.joinEntity.database;
        if (relation.joinEntity.schema) relationContext.from.schema = relation.joinEntity.schema;

        relationContext.joins.push({
            type: 'inner',
            from: {
                type: 'object',
                name: '#main',
                as: 'parent',
            },
            conditions: [
                {
                    left: { type: 'column', source: 'parent', column: `__${relation.joinColumn}` },
                    operator: '=',
                    right: { type: 'column', source: 'root', column: relation.inverseColumn }
                }
            ],
        });

        if (!('select' in value)) {
            throw new Error('Expected select object');
        }

        for (const relationSelectField in value.select) {
            if (value.select[relationSelectField] !== true) {
                continue;
            }

            const column = relation.joinEntity.columns.find(x => x.info.name === relationSelectField);

            relationContext.columns.push({
                source: 'root',
                name: column.columnName,
                as: column.info.name,
            });
        }

        context.children.push(relationContext);
    }

    public static buildManyToOne(relation: MSSQLRelationManyToOne, context: FindContextQueryBuilder, value: unknown): void {
        const joinTable: ITableAccessor & IAliasAccessor = {
            type: 'table',
            table: relation.joinEntity.tableName,
            as: relation.info.name,
        };


        if (relation.joinEntity.database) joinTable.database = relation.joinEntity.database;
        if (relation.joinEntity.schema) joinTable.schema = relation.joinEntity.schema;

        const join: IJoinQueryBuilder = {
            type: relation.info.nonNull ? 'inner' : 'left',
            from: joinTable,
            conditions: [
                {
                    left: { type: 'column', source: relation.info.name, column: relation.inverseColumn },
                    operator: '=',
                    right: { type: 'column', source: 'root', column: relation.joinColumn },
                }
            ],
        };

        context.joins.push(join);

        if (value === true) {
            for (const joinColumn of relation.joinEntity.columns) {
                context.columns.push({
                    name: joinColumn.columnName,
                    source: relation.info.name,
                    as: `${relation.info.name}.${joinColumn.info.name}`,
                });
            }
        } else {
            for (const joinField in value as Record<string, boolean>) {
                if (value[joinField] === false) {
                    continue;
                }

                const joinColumn = relation.joinEntity.columns.find(x => x.info.name === joinField);
                context.columns.push({
                    name: joinColumn.columnName,
                    source: relation.info.name,
                    as: `${relation.info.name}.${joinColumn.info.name}`,
                });
            }
        }
    }
}