import { QueryContextBuilder } from './criteria-builder';

export class QueryContextPrinter {

    public static print(context: QueryContextBuilder): string {
        const columns = [...new Set(context.columns)];
        const joins = [...new Set(context.joins)];

        return `
SELECT ${context.top ? `TOP ${context.top}` : ''}
${columns.map(x => `\t${x}`).join(',\n')}
${context.into ? `INTO #${context.into}` : ''}
FROM ${context.from}
${joins.join('\n')}
${context.wheres.length > 0 ? `WHERE ${context.wheres.join(' AND ')}` : ''}
${context.orderBy ? `ORDER BY ${context.orderBy}` : ''}
${context.orderBy && context.fetch !== undefined && context.offset !== undefined ? `OFFSET ${context.offset} ROWS FETCH NEXT ${context.fetch} ROWS ONLY` : ''}

${context.into ? `SELECT * FROM #${context.into}` : ''}
`.trim();
    }

}