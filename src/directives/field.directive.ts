import { AdurcDirectiveDefinition } from '@adurc/core/dist/interfaces/directive-definition';

export const fieldDirective: AdurcDirectiveDefinition = {
    provider: 'mssql',
    composition: 'field',
    name: 'manyToOne',
    args: {
        joinColumn: { type: 'string' },
        inverseJoinColumn: { type: 'string' },
    }
};