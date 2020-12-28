
import { AdurcCreateArgs } from '@adurc/core/dist/interfaces/client/create.args';
import { MSSQLEntity } from '../interfaces/mssql-entity';
import { CreateContextQueryBuilder } from './create.context';

export class CreateQueryBuilder {

    static build(_entities: MSSQLEntity[], entity: MSSQLEntity, args: AdurcCreateArgs): CreateContextQueryBuilder {
        const context = new CreateContextQueryBuilder();

        context.pks = entity.columns.filter(x => x.options.primary);

        for (const object of args.data) {
            const row: Record<string, unknown> = {};
            for (const fieldName in object) {
                const value = object[fieldName];
                const column = entity.columns.find(x => x.info.name === fieldName);
                if (column) {
                    row[column.columnName] = value;
                } else {
                    const relation = entity.relations.find(x => x.info.name === fieldName);
                    if (relation) {
                        switch (relation.type) {
                            case 'manyToOne':
                                break;
                        }
                        // TODO: Pending implementation
                    } else {
                        throw new Error(`Unexpected field name ${fieldName}`);
                    }
                }
            }
        }

        return context;
    }

}
