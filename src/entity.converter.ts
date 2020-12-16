import { AdurcFieldReference, AdurcModel } from '@adurc/core/dist/interfaces/model';
import { AdurcPrimitiveDefinition } from '@adurc/core/dist/interfaces/common';
import { MSSQLEntity } from './interfaces/mssql-entity';
import { MSSQLColumn } from './interfaces/mssql-column';

export class EntityConverter {

    public static getColumnTypeFromAdurcType(adurcType: AdurcPrimitiveDefinition): string {
        switch (adurcType) {
            case 'boolean':
                return 'bit';
            case 'buffer':
                return 'varbinary';
            case 'date':
                return 'datetime';
            case 'float':
                return 'decimal';
            case 'int':
                return 'int';
            case 'string':
                return 'varchar';
            case 'uuid':
                return 'uniqueidentifier';
            default:
                throw new Error(`Adurc primitive type "${adurcType}" not implemented`);
        }
    }

    public static fromModels(models: AdurcModel[]): MSSQLEntity[] {

        const entities: MSSQLEntity[] = [];

        // 1- convert models into entities
        for (const model of models) {
            if (model.source !== 'mssql') {
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
                        columnType: this.getColumnTypeFromAdurcType(field.type),
                        computed: false,
                        identity: false,
                        primary: false,
                    };

                    if (columnDirective) {
                        const { name, type, computed, identity, primary } = columnDirective.args;

                        column.primary = primary === true;
                        column.computed = computed === true;
                        column.identity = identity == true;

                        if (name) {
                            column.columnName = name as string;
                        }
                        if (type) {
                            column.columnType = type as string;
                        }
                    }

                    entity.columns.push(column);
                } else {
                    const type = field.type as AdurcFieldReference;
                    if (type.source !== 'mssql') {
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
                        entity.relations.push({
                            info: field,
                            type: 'manyToMany',
                            joinEntity: inverseEntity,
                            manyTableName: relation.args.manyTableName as string,
                            inverseColumn: relation.args.inverseColumn as string,
                            inverseColumnReferencedColumnName: relation.args.inverseColumnReferencedColumnName as string,
                            joinColumn: relation.args.joinColumn as string,
                            joinColumnReferencedColumnName: relation.args.joinColumnReferencedColumnName as string,
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