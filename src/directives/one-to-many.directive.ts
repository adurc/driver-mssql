import { AdurcDirectiveDefinition } from '@adurc/core/dist/interfaces/directive-definition';

export const oneToManyDirective: AdurcDirectiveDefinition = {
    provider: 'mssql',
    composition: 'field',
    name: 'oneToMany',
    args: {
        joinColumn: { type: 'string' },
        inverseJoinColumn: { type: 'string' },
    }
};