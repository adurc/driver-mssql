import { AdurcDirectiveDefinition } from '@adurc/core/dist/interfaces/directive-definition';

export const entityDirective: AdurcDirectiveDefinition = {
    provider: 'mssql',
    composition: 'model',
    name: 'entity',
    args: {
        name: { type: 'string' },
        schema: { type: 'string' },
        database: { type: 'string' }
    }
};