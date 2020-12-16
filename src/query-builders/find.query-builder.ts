import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { AdurcModelInclude } from '@adurc/core/dist/interfaces/client/include';
import { AdurcModelSelect } from '@adurc/core/dist/interfaces/client/select';
import { AdurcModelWhere } from '@adurc/core/dist/interfaces/client/where';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { MSSQLRelationManyToMany, MSSQLRelationManyToOne, MSSQLRelationOneToMany } from '../interfaces/mssql-relation';
import { FindContextQueryBuilder, IJoinQueryBuilder, ITableAccessor } from './context.query-builder';

export class FindQueryBuilder {

    static build(_entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcFindManyArgs): FindContextQueryBuilder {
        const context = new FindContextQueryBuilder();

        context.from = this.buildTableAccessor(entity.tableName, 'root', entity.schema, entity.database);

        this.buildSelect(args.select, entity, context);
        this.buildWhere(args.where, entity, context);
        this.buildInclude(args.include, entity, context);

        return context;
    }

    public static buildTableAccessor(table: string, as: string, schema?: string, database?: string,): ITableAccessor {
        const output: ITableAccessor = {
            table,
            as,
        };

        if (database) output.database = database;
        if (schema) output.schema = schema;

        return output;
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

    public static buildWhere(where: AdurcModelWhere<unknown>, entity: MSSQLEntity, context: FindContextQueryBuilder): void {
        for (const field in where) {
            if (field === '_AND' || field === '_OR') {
                // TODO: Pending implement subtree conditions _AND and _OR
                throw new Error('Not implemented subtree conditions _AND and _OR');
            }

            const column = entity.columns.find(x => x.info.name === field);
            if (column) {
                context.params[`root_${field}`] = where[field];

                context.where.push({
                    left: { type: 'column', source: 'root', column: column.columnName },
                    operator: '=',
                    right: { type: 'variable', name: `root_${field}` }
                });
            } else {
                const relation = entity.relations.find(x => x.info.name === field);
                if (relation) {
                    // TODO: Pending implement filter over relation
                } else {
                    throw new Error(`Unknown field name ${field}`);
                }
            }
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
        relationContext.from = {
            table: relation.manyTableName,
            as: 'many',
        };

        relationContext.joins.push({
            type: 'inner',
            from: {
                table: '#main',
                as: 'parent',
            },
            conditions: [
                {
                    left: { type: 'column', source: 'parent', column: `__${relation.joinColumn}` },
                    operator: '=',
                    right: { type: 'column', source: 'many', column: relation.joinColumnReferencedColumnName }
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
                    right: { type: 'column', source: 'many', column: relation.inverseColumnReferencedColumnName },
                }
            ],
        });

        for (const relationSelectField in value.select) {
            if (value.select[relationSelectField] === false) {
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
            table: relation.joinEntity.tableName,
            as: 'root',
        };

        if (relation.joinEntity.database) relationContext.from.database = relation.joinEntity.database;
        if (relation.joinEntity.schema) relationContext.from.schema = relation.joinEntity.schema;

        relationContext.joins.push({
            type: 'inner',
            from: {
                table: '#main',
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
            if (value.select[relationSelectField] === false) {
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
        const join: IJoinQueryBuilder = {
            type: relation.info.nonNull ? 'inner' : 'left',
            from: {
                table: relation.joinEntity.tableName,
                as: relation.info.name,
            },
            conditions: [
                {
                    left: { type: 'column', source: relation.info.name, column: relation.inverseColumn },
                    operator: '=',
                    right: { type: 'column', source: 'root', column: relation.joinColumn },
                }
            ],
        };

        if (relation.joinEntity.database) join.from.database = relation.joinEntity.database;
        if (relation.joinEntity.schema) join.from.schema = relation.joinEntity.schema;

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