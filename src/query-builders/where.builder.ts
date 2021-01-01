import { AdurcModelWhere } from '@adurc/core/dist/interfaces/client/where';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { IWherableQueryBuilder, IConditionSide, IConditionQueryBuilder, Condition } from './find.context';

export class WhereBuilder {

    public static buildWhere(where: AdurcModelWhere<unknown>, entity: MSSQLEntity, context: IWherableQueryBuilder, source?: string): void {
        const sourcePreffix = source ? `${source}_` : '';

        for (const field in where) {
            const value = where[field];
            if (field === '_AND' || field === '_OR') {
                // TODO: Pending implement subtree conditions _AND and _OR
                throw new Error('Not implemented subtree conditions _AND and _OR');
            }

            const column = entity.columns.find(x => x.info.name === field);
            if (column) {
                const paramKey = sourcePreffix + field;

                if (typeof value !== 'object') {
                    context.params[paramKey] = value;
                    context.where.push({ left: { type: 'column', source, column: column.columnName }, operator: '=', right: { type: 'variable', name: paramKey } });
                } else {
                    for (const operatorType in value) {
                        const operatorValue = value[operatorType];
                        const conditionValues: IConditionSide[] = [];
                        switch (operatorType) {
                            case 'equals':
                                context.params[paramKey] = value;
                                context.where.push({ left: { type: 'column', source, column: column.columnName }, operator: '=', right: { type: 'variable', name: paramKey } });
                                break;
                            case 'in':
                                if (!(operatorValue instanceof Array)) throw new Error('Expected on operator "in" an array');
                                for (let i = 0; i < operatorValue.length; i++) {
                                    const indexedParamKey = paramKey + '_' + i;
                                    context.params[indexedParamKey] = operatorValue[i];
                                    conditionValues.push({ type: 'variable', name: indexedParamKey });
                                }
                                context.where.push({ left: { type: 'column', source, column: column.columnName }, operator: 'in', right: conditionValues });
                                break;
                        }
                    }
                }
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

    public static conditionsToSql(conditions: Condition[]): string {
        const chunks: string[] = [];
        for (const condition of conditions) {
            if ('ands' in condition || 'ors' in condition) {
                // TODO: Pending implement subtree conditions
                throw new Error('Not implemented subtree conditions');
            } else if ('left' in condition) {
                chunks.push(`\t${this.toSqlCondition(condition)}`);
            }
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