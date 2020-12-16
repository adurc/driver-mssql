import { SQLContext } from './context';
import { SQLColumn, SQLEntity, SQLRelation } from './interfaces';

export interface CreateContextTempBuilder {
    lastIndex: number;
    tableName: string;
    pks: SQLColumn[];
}

export interface CreateContextBuilder {
    tempTables: { [table: string]: CreateContextTempBuilder };
    chunks: string[];
    params: Record<string, unknown>;
}

export interface CreateContextParentInfo {
    tempTable: CreateContextTempBuilder;
    index: number;
    relation: SQLRelation;
    object: Record<string, unknown>;
}

export class CreateBuilder {

    public static build(
        context: SQLContext,
        entity: SQLEntity,
        objects: Record<string, unknown>[],
    ): CreateContextBuilder {
        const output: CreateContextBuilder = {
            tempTables: {},
            chunks: [],
            params: {},
        };

        this.buildModel(output, context, entity, objects, []);

        return output;
    }

    public static buildModel(
        createContext: CreateContextBuilder,
        context: SQLContext,
        entity: SQLEntity,
        objects: Record<string, unknown>[],
        path: string[],
        parent?: CreateContextParentInfo,
    ): void {
        const pathSlash = path.length > 0 ? path.join('_') + '_' : '';
        const resultTableName = `${pathSlash}${entity.info.name}`;

        if (!createContext.tempTables[resultTableName]) {
            const pks = entity.columns.filter(x => x.isPrimary);

            createContext.tempTables[resultTableName] = {
                lastIndex: 0,
                tableName: resultTableName,
                pks,
            };

            createContext.chunks.push(`DECLARE @${resultTableName} As table (__index int, ${pks.map(x => `${x.info.name} ${this.printSqlType(x.type)}`).join(', ')})`);
        }

        const nestedPath = [...path, entity.info.name];

        for (let i = 0; i < objects.length; i++) {
            this.buildModelObject(nestedPath, createContext, context, createContext.tempTables[resultTableName], entity, objects[i], parent);
        }
    }

    public static buildModelObject(
        path: string[],
        createContext: CreateContextBuilder,
        context: SQLContext,
        tempTable: CreateContextTempBuilder,
        entity: SQLEntity,
        object: Record<string, unknown>,
        parent?: CreateContextParentInfo,
    ): void {
        const index = tempTable.lastIndex++;
        const fields = Object.getOwnPropertyNames(object);

        const columns = fields
            .map(c => entity.columns.find(o => o.info.name === c))
            .filter(c => c !== undefined);

        columns.forEach(c => createContext.params[`item_${index}_${entity.info.name}_${c.info.name}`] = object[c.info.name]);

        const relations = fields
            .map(c => entity.manyToOnes.find(o => o.field.name === c) ?? entity.oneToManies.find(o => o.field.name === c))
            .filter(c => c !== undefined);

        if (parent) {
            const destEntity = context.entities.find(() => parent.relation.dest.model === parent.relation.dest.model);

            const destColumn = parent.relation.field.collection
                ? entity.columns.find(x => x.info.name === parent.relation.dest.field.name)
                : destEntity.columns.find(x => x.info.name === parent.relation.dest.field.name);

            createContext.chunks.push(`INSERT INTO [${entity.schema}].[${entity.name}] WITH(ROWLOCK)`);
            createContext.chunks.push(`([${destColumn.name}],${columns.map(c => `[${c.name}]`).join(', ')})`);
            createContext.chunks.push(`OUTPUT ${index}, ${tempTable.pks.map(c => `INSERTED.[${c.name}]`).join(', ')} INTO @${tempTable.tableName}(__index, ${tempTable.pks.map(c => `[${c.info.name}]`).join(', ')})`);
            createContext.chunks.push(`SELECT t.[${parent.relation.source.field.name}], ${columns.map(c => `@item_${index}_${entity.info.name}_${c.info.name}`)} FROM @${parent.tempTable.tableName} AS t WHERE __index = ${parent.index}`);
        } else {
            createContext.chunks.push(`INSERT INTO [${entity.schema}].[${entity.name}] WITH(ROWLOCK)`);
            createContext.chunks.push(`(${columns.map(c => `[${c.name}]`).join(', ')})`);
            createContext.chunks.push(`OUTPUT ${index}, ${tempTable.pks.map(c => `INSERTED.[${c.name}]`).join(', ')} INTO @${tempTable.tableName}(__index, ${tempTable.pks.map(c => `[${c.info.name}]`).join(', ')})`);
            createContext.chunks.push(`VALUES (${columns.map(c => `@item_${index}_${entity.info.name}_${c.info.name}`)})`);
        }

        for (const relation of relations) {
            const entityRel = context.entities.find(x => x.info === relation.dest.model);
            let value = object[relation.field.name];
            if (!relation.field.collection) {
                value = [value];
            }

            this.buildModel(createContext, context, entityRel, value as Record<string, unknown>[], path, {
                tempTable,
                index,
                object,
                relation,
            });
        }
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
