import { AdurcContext } from '@adurc/core';
import { AdurcField, AdurcModel, AdurcPrimitiveDefinition } from '@adurc/core/dist/interfaces/model';
import { ColumnDataType, SQLColumn, SQLEntity, SQLRelation } from './interfaces';

export function columnTypeFromDataType(type: string): ColumnDataType {
    switch (type as AdurcPrimitiveDefinition) {
        case 'string':
            return 'varchar';
        case 'boolean':
            return 'tinyint';
        case 'float':
            return 'decimal';
        case 'int':
            return 'int';
        case 'uuid':
            return 'uniqueidentifier';
        case 'date':
            return 'datetime';
        case 'buffer':
            return 'varbinary';
        default:
            throw new Error(`Unknown primitive type ${type}`);
    }
}

export function columnTransformFromField(field: AdurcField): SQLColumn {
    const column = field.directives.find(x => x.name === 'column');
    const pk = field.directives.find(x => x.name === 'pk');

    return {
        info: field,
        name: column && column.args.name ? column.args.name as string : field.name,
        type: column && column.args.type ? column.args.type as ColumnDataType : columnTypeFromDataType(field.type),
        isPrimary: pk !== undefined,
    };
}

export function relationFromField(context: AdurcContext, model: AdurcModel, field: AdurcField): SQLRelation {
    const relation = field.directives.find(x => x.name === 'relation');

    if (!relation) {
        throw new Error(`For relations you need specify decorator @relation, check model ${model.name}, field: ${field.name}`);
    }

    const fieldSourceName = relation.args.sourceField as string;
    const fieldDestinationName = relation.args.destField as string;

    const sourceField = model.fields.find(x => x.name === fieldSourceName);
    if (!sourceField) {
        throw new Error(`Not found field ${fieldSourceName} into model ${model.name}`);
    }

    const modelDestination = context.models.find(x => x.name === field.type);
    if (!modelDestination) {
        throw new Error(`Not found model ${field.type} specified into model ${model.name} in field: ${field.name}`);
    }

    const fieldDestination = modelDestination.fields.find(x => x.name === fieldDestinationName);

    if (!fieldDestination) {
        const fields = modelDestination.fields.map(x => x.name).join(', ');
        throw new Error(`Not found field ${fieldDestinationName} in model ${field.type}, available fields: ${fields}`);
    }

    return {
        field,
        source: {
            model,
            field: sourceField,
        },
        dest: {
            model: modelDestination,
            field: fieldDestination,
        },
        nonNull: field.nonNull,
    };
}

export function entityTranformFromModel(context: AdurcContext, model: AdurcModel): SQLEntity | null {
    const entity = model.directives.find(x => x.name === 'entity');

    const columns: SQLColumn[] = [];
    const manyToOnes: SQLRelation[] = [];
    const oneToManies: SQLRelation[] = [];

    for (const field of model.fields) {
        const modelRelation = context.models.find(x => x.name === field.type);
        if (modelRelation) {
            if (field.collection) {
                oneToManies.push(relationFromField(context, model, field));
            } else {
                manyToOnes.push(relationFromField(context, model, field));
            }
        } else {
            columns.push(columnTransformFromField(field));
        }
    }

    return {
        info: model,
        columns,
        schema: entity && entity.args.schema ? entity.args.schema as string : undefined,
        name: entity && entity.args.name ? entity.args.name as string : model.name,
        manyToOnes,
        oneToManies,
    };
}