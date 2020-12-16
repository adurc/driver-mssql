import { AdurcDirectiveDefinition } from '@adurc/core/dist/interfaces/model';

export const entityDirective: AdurcDirectiveDefinition = {
    composition: 'model',
    name: 'entity',
    args: {
        schema: { value: 'string' },
        name: { value: 'string' },
    }
};

export const columnDirective: AdurcDirectiveDefinition = {
    composition: 'field',
    name: 'column',
    args: {
        name: { value: 'string' },
        type: { value: 'enum', options: ['int16', 'int32', 'int64', 'decimal', 'uuid', 'varchar', 'char', 'date', 'boolean', 'buffer'] }
    }
};

export const relationDirective: AdurcDirectiveDefinition = {
    composition: 'field',
    name: 'relation',
    args: {
        sourceColumn: { value: 'string', nonNull: true },
        destColumn: { value: 'string', nonNull: true }
    }
};