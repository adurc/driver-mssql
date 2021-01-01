import { AdurcFieldReference, AdurcModel } from '@adurc/core/dist/interfaces/model';
import { AdurcPrimitiveDefinition } from '@adurc/core/dist/interfaces/common';
import { MSSQLEntity } from './interfaces/mssql-entity';
import { MSSQLColumn } from './interfaces/mssql-column';
import sql, { ISqlType } from 'mssql';

export class EntityConverter {

    public static getColumnTypeFromAdurcType(adurcType: AdurcPrimitiveDefinition): ISqlType {
        switch (adurcType) {
            case 'boolean':
                return sql.Bit();
            case 'buffer':
                return sql.VarBinary();
            case 'date':
                return sql.DateTime();
            case 'float':
                return sql.Decimal(18, 2);
            case 'int':
                return sql.Int();
            case 'string':
                return sql.VarChar();
            case 'uuid':
                return sql.UniqueIdentifier();
            default:
                throw new Error(`Adurc primitive type "${adurcType}" not implemented`);
        }
    }

    public static fromModels(source: string, models: AdurcModel[]): MSSQLEntity[] {

        const entities: MSSQLEntity[] = [];

        // 1- convert models into entities
        for (const model of models) {
            if (model.source !== source) {
                continue;
            }

            const directives = model.directives.filter(x => x.provider === 'mssql');
            const entityDirective = directives.find(x => x.name === 'entity');

            const entity: MSSQLEntity = {
                info: model,
                tableName: model.name,
                columns: [],
                relations: [],
            };

            if (entityDirective) {
                entity.tableName = entityDirective.args.name as string ?? entity.tableName;
                entity.schema = entityDirective.args.schema as string ?? undefined;
                entity.database = entityDirective.args.database as string ?? undefined;
            }

            entities.push(entity);
        }

        // 2- convert fields in columns and relations
        for (const entity of entities) {
            for (const field of entity.info.fields) {
                const directives = field.directives.filter(x => x.provider === 'mssql');

                if (typeof field.type === 'string') {
                    const columnDirective = directives.find(x => x.name === 'column');

                    const column: MSSQLColumn = {
                        info: field,
                        columnName: field.name,
                        options: {
                            nullable: !field.nonNull,
                        },
                        sqlType: this.getColumnTypeFromAdurcType(field.type),
                    };

                    if (columnDirective) {
                        const { name, type, readOnly, identity, primary } = columnDirective.args;

                        column.options.primary = primary === true;
                        column.options.readOnly = readOnly === true;
                        column.options.identity = identity == true;

                        if (name) {
                            column.columnName = name as string;
                        }
                        if (type) {
                            const factory = sql.TYPES[type as string];
                            if (!factory) {
                                throw new Error(`Provided column type ${type} is not valid`);
                            }
                            column.sqlType = factory();
                        }
                    }

                    entity.columns.push(column);
                } else {
                    const type = field.type as AdurcFieldReference;
                    if (type.source !== source) {
                        continue;
                    }

                    const inverseModel = models.find(x => x.name === type.model);

                    if (!inverseModel) {
                        throw new Error(`Model ${type.model} not found`);
                    }

                    const relations = directives.filter(x => ['manyToOne', 'oneToMany', 'manyToMany'].indexOf(x.name) >= 0);

                    if (relations.length === 0) {
                        throw new Error(`Model: ${entity.info.name}, Field: ${field.name} - Required a relation directive`);
                    } else if (relations.length > 1) {
                        throw new Error(`Model: ${entity.info.name}, Field: ${field.name} - Specified more than one relation [${relations.map(x => x.name).join(',')}]`);
                    }

                    const inverseEntity = entities.find(x => x.info === inverseModel);

                    const relation = relations[0];
                    if (relation.name === 'manyToMany') {
                        const manyEntity = entities.find(x => x.info.name === relation.args.manyEntity);
                        if (!manyEntity) {
                            throw new Error(`Model ${relation.args.manyEntity} not found`);
                        }
                        entity.relations.push({
                            info: field,
                            type: 'manyToMany',
                            joinEntity: inverseEntity,
                            joinColumn: relation.args.joinColumn as string,

                            manyEntity,
                            manyJoinColumn: relation.args.manyJoinColumn as string,
                            manyInverseColumn: relation.args.manyInverseColumn as string,
                            inverseColumn: relation.args.inverseColumn as string,
                        });
                    } else {
                        entity.relations.push({
                            info: field,
                            joinEntity: inverseEntity,
                            type: relation.name as 'oneToMany' | 'manyToOne',
                            inverseColumn: relation.args.inverseColumn as string,
                            joinColumn: relation.args.joinColumn as string,
                        });
                    }
                }
            }
        }

        return entities;
    }

}