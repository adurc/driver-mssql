import { AdurcDirectiveDefinition } from '@adurc/core/dist/interfaces/directive-definition';

export const manyToManyDirective: AdurcDirectiveDefinition = {
    provider: 'mssql',
    composition: 'field',
    name: 'manyToMany',
    args: {
        manyTableName: { type: 'string' },
        joinColumn: { type: 'string' },
        inverseJoinColumn: { type: 'string' },
        joinColumnReferencedColumnName: { type: 'string' },
        inverseColumnReferencedColumnName: { type: 'string' },
    }
};