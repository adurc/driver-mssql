import { ProjectionInfoExpand } from '@adurc/core/dist/interfaces/projection';
import { SQLContext } from './context';
import { SQLEntity, SQLRelation } from './interfaces';

interface IBuildReadOutputRes {
    result: Record<string, unknown>[];
    currentIndex: number
}

export class ObjectExpander {

    public static buildReadOutput(
        context: SQLContext,
        projection: ProjectionInfoExpand,
        recordsets: Record<string, unknown>[][],
        relation?: SQLRelation,
        parentItem?: Record<string, unknown>,
        preffix = '',
        index = 0,
    ): IBuildReadOutputRes {

        const entity = relation
            ? context.entities.find(x => x.info === relation.dest.model)
            : context.entities.find(x => x.info.name === projection.name);

        if (!entity) {
            throw new Error(`Not found registered entity with name: ${projection.name}`);
        }

        const recordset = recordsets[index];
        const output: Record<string, unknown>[] = [];
        let upsetIndex = index;

        for (const item of recordset) {
            if (parentItem) {
                const sourceKey = `${preffix}__${relation.source.field.name}`;
                const parentKey = `__parent${preffix.length > 0 ? '__' : ''}${sourceKey}`;
                const destValue = item[parentKey];
                const parentValue = parentItem[sourceKey];
                if (destValue === undefined) {
                    throw new Error(`Dest field ${parentKey} not projeted from query`);
                }
                if (parentValue === undefined) {
                    throw new Error(`Parent field ${sourceKey} not projeted from query`);
                }
                if (parentValue !== destValue) {
                    continue;
                }
            }

            const resultExpand = this.expandObject(context, entity, projection, recordsets, index, item);
            if (upsetIndex < resultExpand.currentIndex) {
                upsetIndex = resultExpand.currentIndex;
            }
            output.push(resultExpand.item);
        }

        return { result: output, currentIndex: upsetIndex };
    }

    public static expandObject(
        context: SQLContext,
        entity: SQLEntity,
        projection: ProjectionInfoExpand,
        recordsets: Record<string, unknown>[][],
        index: number,
        item: Record<string, unknown>,
        preffix?: string,
    ): { item: Record<string, unknown>, currentIndex: number } {
        const outputItem: Record<string, unknown> = {};
        const preffixDotted = `${preffix ? `${preffix}.` : ''}`;

        for (const field of projection.fields) {
            if (field.type === 'field') {
                outputItem[field.name] = item[preffixDotted + field.name];
            } else {
                const oneToManyRel = entity.oneToManies.find(x => x.field.name === field.name);
                const manyToOneRel = entity.manyToOnes.find(x => x.field.name === field.name);

                if (oneToManyRel) {
                    const outputResult = this.buildReadOutput(
                        context,
                        field as ProjectionInfoExpand,
                        recordsets,
                        oneToManyRel,
                        item,
                        preffix,
                        ++index,
                    );

                    outputItem[field.name] = outputResult.result;
                    index = outputResult.currentIndex;
                } else if (manyToOneRel) {
                    const entityRel = context.entities.find(x => x.info === manyToOneRel.dest.model);
                    const expandResult = this.expandObject(context, entityRel, field, recordsets, index, item, preffixDotted + manyToOneRel.field.name);
                    outputItem[field.name] = expandResult.item;
                    index = expandResult.currentIndex;
                } else {
                    throw new Error('Unexpected field name');
                }
            }
        }

        return { item: outputItem, currentIndex: index };
    }

    public static simpleExpandObject(obj: Record<string, unknown>): Record<string, unknown> {
        const tempObject = {};
        for (const keys in obj) {
            const value = obj[keys];
            let container = tempObject;
            keys.split('.').map((k, i, values) => {
                container = (container[k] = (i == values.length - 1 ? value : {}));
            });
        }
        return tempObject;
    }
}