import { AdurcDirectiveDefinition } from '@adurc/core/dist/interfaces/directive-definition';

export const columnDirective: AdurcDirectiveDefinition = {
    provider: 'mssql',
    composition: 'field',
    name: 'column',
    args: {
        primary: { type: 'boolean' },
        identity: { type: 'boolean' },
        readOnly: { type: 'boolean' },
        name: { type: 'string' },
        type: {
            type: 'enum',
            options: [
                'bigint', 'int', 'smallint', 'tinyint', 'bit', 'decimal', 'numeric', 'money', 'smallmoney', 'float',
                'real', 'datetime', 'smalldatetime', 'char', 'varchar', 'text', 'nchar', 'nvarchar', 'ntext', 'binary',
                'varbinary', 'image', 'timestamp', 'uniqueidentifier'
            ],
        },
        precision: { type: 'int' },
        scale: { type: 'int' },
        length: { type: 'int' },
    }
};