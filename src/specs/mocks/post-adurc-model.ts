import { AdurcModel } from '@adurc/core/dist/interfaces/model';

export const PostAdurcModel: AdurcModel = {
    name: 'Post',
    source: 'mssql',
    directives: [],
    fields: [
        { name: 'id', type: 'int', nonNull: true, directives: [{ name: 'column', args: { primary: true }, provider: 'mssql' }], collection: false, },
        { name: 'title', type: 'string', nonNull: true, directives: [], collection: false, },
        { name: 'content', type: 'string', nonNull: false, directives: [], collection: false, },
        { name: 'published', type: 'boolean', nonNull: true, directives: [], collection: false, },
        { name: 'authorId', type: 'int', nonNull: false, directives: [], collection: false, },
        { name: 'author', type: { model: 'User', source: 'mssql' }, nonNull: false, directives: [{ provider: 'mssql', name: 'manyToOne', args: { inverseColumn: 'id', joinColumn: 'userId' } },], collection: false, },
    ],
};
