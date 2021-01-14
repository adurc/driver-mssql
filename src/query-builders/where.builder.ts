import { AdurcModelWhereUntyped } from '@adurc/core/dist/interfaces/client/where';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { IWherableQueryBuilder, IConditionSide, IConditionQueryBuilder, Condition } from './find.context';

export class WhereBuilder {

    public static buildWhere(where: AdurcModelWhereUntyped, entity: MSSQLEntity, context: IWherableQueryBuilder, source?: string): void {
        context.where = [];
        this.buildWhereNested(where, entity, context, context.where, source, '');
    }

    public static buildWhereNested(
        where: AdurcModelWhereUntyped,
        entity: MSSQLEntity,
        context: IWherableQueryBuilder,
        conditionsRef: Condition[],
        source: string,
        preffixParam: string,
    ): void {
        const preffixParamNested = preffixParam && preffixParam.length > 0 ? preffixParam + '_' : '';
        for (const field in where) {
            const value = where[field];

            if (field === 'OR') {
                if (!(value instanceof Array)) throw new Error('Expected array values on OR filter');
                const ors: Condition[] = [];
                conditionsRef.push({
                    ors,
                });
                let i = 0;
                for (const v of value) {
                    this.buildWhereNested(v, entity, context, ors, source, preffixParamNested + `or_${i++}`);
                }
                continue;
            } else if (field === 'AND') {
                if (!(value instanceof Array)) throw new Error('Expected array values on AND filter');
                const ands: Condition[] = [];
                conditionsRef.push({
                    ands,
                });
                let i = 0;
                for (const v of value) {
                    this.buildWhereNested(v, entity, context, ands, source, preffixParamNested + `and_${i++}`);
                }
                continue;
            }

            this.buildWhereField(context, entity, field, value, source, preffixParam)
                .forEach(x => conditionsRef.push(x));
        }
    }

    public static buildWhereField(
        context: IWherableQueryBuilder,
        entity: MSSQLEntity,
        field: string,
        value: unknown,
        source: string,
        preffixParam: string,
    ): Condition[] {
        const output: Condition[] = [];

        const column = entity.columns.find(x => x.info.accessorName === field);
        if (column) {
            const paramKey = (source && source.length > 0 ? source + '_' : '')
                + (preffixParam && preffixParam.length > 0 ? preffixParam + '_' : '')
                + field;

            if (typeof value !== 'object') {
                context.params[paramKey] = value;
                output.push({ left: { type: 'column', source, column: column.columnName }, operator: '=', right: { type: 'variable', name: paramKey } });
            } else {
                for (const operatorType in value) {
                    const operatorValue = value[operatorType];
                    const conditionValues: IConditionSide[] = [];
                    switch (operatorType) {
                        case 'equals':
                            context.params[paramKey] = value;
                            output.push({ left: { type: 'column', source, column: column.columnName }, operator: '=', right: { type: 'variable', name: paramKey } });
                            break;
                        case 'in':
                            if (!(operatorValue instanceof Array)) throw new Error('Expected on operator "in" an array');
                            for (let i = 0; i < operatorValue.length; i++) {
                                const indexedParamKey = paramKey + '_' + i;
                                context.params[indexedParamKey] = operatorValue[i];
                                conditionValues.push({ type: 'variable', name: indexedParamKey });
                            }
                            output.push({ left: { type: 'column', source, column: column.columnName }, operator: 'in', right: conditionValues });
                            break;
                    }
                }
            }
        } else {
            const relation = entity.relations.find(x => x.info.accessorName === field);
            if (relation) {
                // TODO: Pending implement filter over relation
            } else {
                throw new Error(`Unknown field name ${field}`);
            }
        }

        return output;
    }

    public static conditionsToSql(unionType: 'AND' | 'OR', conditions: Condition[], levels: number): string {
        const chunks: string[] = [];
        let tabs = '';
        for (let i = 0; i < levels; i++) {
            tabs += '\t';
        }

        let isFirstCondition = true;
        for (const condition of conditions) {
            const preffix = isFirstCondition ? '' : unionType + ' ';

            if ('ors' in condition) {
                chunks.push(`${tabs}${preffix}(`);
                chunks.push(this.conditionsToSql('OR', condition.ors, levels + 1));
                chunks.push(`${tabs})`);
            } else if ('ands' in condition) {
                chunks.push(`${tabs}${preffix}(`);
                chunks.push(this.conditionsToSql('AND', condition.ands, levels + 1));
                chunks.push(`${tabs})`);
            } else if ('left' in condition) {
                chunks.push(`${tabs}${preffix}${this.toSqlCondition(condition)}`);
            }

            isFirstCondition = false;
        }
        return chunks.join('\n');
    }

    public static toSqlConditionSide(condition: IConditionSide | number | string): string {
        if (typeof condition === 'number') {
            return condition.toString();
        } else if (typeof condition === 'string') {
            return condition.replace('\'', '\'\'');
        } else if (condition.type === 'column') {
            let output = '';

            if (condition.source) {
                output = `[${condition.source}].`;
            }
            output += `[${condition.column}]`;

            return output;
        } else if (condition.type === 'variable') {
            return `@${condition.name}`;
        }
    }

    public static toSqlCondition(condition: IConditionQueryBuilder): string {
        const left = this.toSqlConditionSide(condition.left);
        let right = '';
        switch (condition.operator) {
            case 'in':
                right = '(' + condition.right.map((x) => this.toSqlConditionSide(x)).join(',') + ')';
                break;
            default:
                right = this.toSqlConditionSide(condition.right);
                break;
        }
        return `${left} ${condition.operator} ${right}`;
    }
}