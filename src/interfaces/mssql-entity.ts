import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { MSSQLColumn } from './mssql-column';
import { MSSQLRelation } from './mssql-relation';

export interface MSSQLEntity {
    info: AdurcModel;
    tableName: string;
    schema?: string;
    database?: string;
    columns: MSSQLColumn[];
    relations: MSSQLRelation[];
}