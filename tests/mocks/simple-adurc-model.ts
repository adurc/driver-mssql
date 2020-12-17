import { AdurcModel } from '@adurc/core';

export const SimpleAdurcModel: AdurcModel = {
    name: 'Fake',
    directives: [],
    fields: [
        {
            name: 'id',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'pk', args: {} }],
        },
        {
            name: 'name',
            type: 'string',
            collection: false,
            nonNull: true,
            directives: [],
        }
    ],
};