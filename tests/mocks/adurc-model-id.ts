import { AdurcModel } from '@adurc/core';

export const AdurcModelId: AdurcModel = {
    name: 'Fake',
    directives: [],
    fields: [
        {
            name: 'id',
            type: 'int',
            collection: false,
            nonNull: true,
            directives: [{ name: 'pk', args: {} }],
        }
    ],
};